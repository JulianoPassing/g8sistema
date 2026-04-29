/**
 * Pool MySQL único para todas as APIs — evita novo handshake TCP a cada request (cold start).
 * Em produção, defina DB_PASSWORD nas variáveis de ambiente (obrigatório para segurança).
 */
const mysql = require('mysql2/promise');

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

function getPool() {
  const g = global;
  if (!g.__g8MysqlPoolShared) {
    g.__g8MysqlPoolShared = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'julianopassing',
      password: resolveDbPassword(),
      database: process.env.DB_NAME || 'sistemajuliano',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 8000,
      enableKeepAlive: true,
      compress: true
    });
  }
  return g.__g8MysqlPoolShared;
}

module.exports = { getPool };
