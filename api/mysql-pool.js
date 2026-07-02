/**
 * Pool MySQL único para todas as APIs — evita novo handshake TCP a cada request (cold start).
 * Ajustado para Vercel/serverless: poucas conexões por instância, retry e reset em falha.
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

function createPoolInstance() {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
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

function getPool() {
  const g = global;
  if (!g.__g8MysqlPoolShared) {
    g.__g8MysqlPoolShared = createPoolInstance();
  }
  return g.__g8MysqlPoolShared;
}

async function resetPool() {
  const g = global;
  if (g.__g8MysqlPoolShared) {
    try {
      await g.__g8MysqlPoolShared.end();
    } catch (e) {
      console.warn('[mysql-pool] Erro ao encerrar pool:', e && e.message);
    }
    g.__g8MysqlPoolShared = null;
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

function isRetryableConnectionError(err) {
  if (!err) return false;
  if (err.code === 'OP_TIMEOUT') return true;
  const retryable = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'PROTOCOL_CONNECTION_LOST',
    'ER_CON_COUNT_ERROR',
    'POOL_NO_CONNECTION',
    'ENOTFOUND'
  ]);
  return retryable.has(err.code) || /gone away|lost connection|too many connections/i.test(String(err.message || ''));
}

/** Obtém conexão com timeout e retry (recria o pool se conexões estiverem mortas no serverless). */
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
      if (attempt < maxAttempts && isRetryableConnectionError(err)) {
        await resetPool();
        await sleep(400 * attempt);
        continue;
      }
      break;
    }
  }
  throw lastErr;
}

module.exports = { getPool, getConnectionWithRetry, resetPool, withTimeout };
