/**
 * Pool MySQL único para todas as APIs — evita novo handshake TCP a cada request (cold start).
 * Ajustado para Vercel/serverless: poucas conexões por instância, retry seguro sem fechar pool concorrente.
 * Em produção, defina DB_PASSWORD nas variáveis de ambiente (obrigatório para segurança).
 */
const mysql = require('mysql2/promise');

const POOL_LIMIT = Math.min(Math.max(parseInt(process.env.DB_POOL_LIMIT, 10) || 2, 1), 5);
const CONNECT_TIMEOUT_MS = parseInt(process.env.DB_CONNECT_TIMEOUT_MS, 10) || 15000;
const ACQUIRE_TIMEOUT_MS = parseInt(process.env.DB_ACQUIRE_TIMEOUT_MS, 10) || 20000;

function resolveDbPassword() {
  if (process.env.DB_PASSWORD != null && process.env.DB_PASSWORD !== '') {
    return process.env.DB_PASSWORD;
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn('[mysql-pool] DB_PASSWORD não definido — conexão pode falhar.');
    return '';
  }
  return 'Juliano@95';
}

function poolConfigSummary() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'julianopassing',
    database: process.env.DB_NAME || 'sistemajuliano',
    hasPassword: !!(process.env.DB_PASSWORD && process.env.DB_PASSWORD !== '')
  };
}

function createPoolInstance() {
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port,
    user: process.env.DB_USER || 'julianopassing',
    password: resolveDbPassword(),
    database: process.env.DB_NAME || 'sistemajuliano',
    waitForConnections: true,
    connectionLimit: POOL_LIMIT,
    queueLimit: 0,
    connectTimeout: CONNECT_TIMEOUT_MS,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    maxIdle: POOL_LIMIT,
    idleTimeout: 10000,
    compress: true
  });
}

function isPoolClosed(pool) {
  if (!pool) return true;
  const inner = pool.pool || pool;
  return !!(inner._closed || inner._closing);
}

function getPool() {
  const g = global;
  if (g.__g8MysqlPoolShared && !isPoolClosed(g.__g8MysqlPoolShared)) {
    return g.__g8MysqlPoolShared;
  }
  g.__g8MysqlPoolShared = createPoolInstance();
  return g.__g8MysqlPoolShared;
}

/** Troca o pool antes de encerrar o antigo — evita "Pool is closed" em requisições concorrentes. */
async function safeResetPool() {
  const g = global;
  if (g.__g8MysqlPoolResetInFlight) {
    await g.__g8MysqlPoolResetInFlight;
    return;
  }

  g.__g8MysqlPoolResetInFlight = (async () => {
    const old = g.__g8MysqlPoolShared;
    g.__g8MysqlPoolShared = createPoolInstance();
    if (old && !isPoolClosed(old)) {
      try {
        await old.end();
      } catch (e) {
        console.warn('[mysql-pool] Erro ao encerrar pool antigo:', e && e.message);
      }
    }
  })();

  try {
    await g.__g8MysqlPoolResetInFlight;
  } finally {
    g.__g8MysqlPoolResetInFlight = null;
  }
}

function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error(`${label} excedeu ${ms}ms`);
      err.code = 'OP_TIMEOUT';
      reject(err);
    }, ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ]);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Conexão morta no serverless — vale recriar o pool. */
function shouldResetPool(err) {
  if (!err) return false;
  if (/pool is closed/i.test(String(err.message || ''))) return true;
  const resetCodes = new Set(['PROTOCOL_CONNECTION_LOST', 'ECONNRESET']);
  return resetCodes.has(err.code) || /gone away|lost connection/i.test(String(err.message || ''));
}

/** Falha de rede ao conectar — retry sem derrubar o pool (evita cascata de erros). */
function shouldRetryWithoutReset(err) {
  if (!err) return false;
  if (err.code === 'OP_TIMEOUT') return true;
  const networkCodes = new Set(['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH']);
  return networkCodes.has(err.code);
}

function shouldRetry(err) {
  return shouldResetPool(err) || shouldRetryWithoutReset(err);
}

/** Teste rápido de conectividade (usado em /api/health?db=1). */
async function pingDatabase() {
  const started = Date.now();
  let connection;
  try {
    connection = await getConnectionWithRetry({
      maxAttempts: 1,
      timeoutMs: CONNECT_TIMEOUT_MS,
      label: 'Ping do banco'
    });
    await withTimeout(connection.query('SELECT 1 AS ok'), 5000, 'SELECT 1');
    return {
      ok: true,
      latencyMs: Date.now() - started,
      config: poolConfigSummary()
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      code: err && err.code,
      error: err && err.message,
      config: poolConfigSummary()
    };
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (e) {
        console.warn('[mysql-pool] Erro ao liberar conexão do ping:', e && e.message);
      }
    }
  }
}

/** Obtém conexão com timeout e retry. */
async function getConnectionWithRetry(opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 3;
  const timeoutMs = opts.timeoutMs ?? ACQUIRE_TIMEOUT_MS;
  const label = opts.label ?? 'Obter conexão do pool';
  let lastErr;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const pool = getPool();
      return await withTimeout(pool.getConnection(), timeoutMs, label);
    } catch (err) {
      lastErr = err;
      console.warn(`[mysql-pool] ${label} falhou (tentativa ${attempt}/${maxAttempts}):`, err && err.message);

      if (attempt >= maxAttempts || !shouldRetry(err)) {
        break;
      }

      if (shouldResetPool(err)) {
        await safeResetPool();
      }
      await sleep(500 * attempt);
    }
  }
  throw lastErr;
}

module.exports = {
  getPool,
  getConnectionWithRetry,
  safeResetPool,
  withTimeout,
  pingDatabase,
  poolConfigSummary
};
