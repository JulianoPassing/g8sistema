// API para gerenciar acessos à tabela Pantaneiro 5 (B2B)
// Usa MySQL se configurado; senão usa arquivo JSON (public/acessos-pantaneiro5.json)
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const addSecurityHeaders = (res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
};

function normalizarCnpj(cnpj) {
  return (cnpj || '').toString().replace(/[.\-\/\s]/g, '');
}

async function getConnection() {
  try {
    return await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'julianopassing',
      password: process.env.DB_PASSWORD || 'Juliano@95',
      database: process.env.DB_NAME || 'sistemajuliano'
    });
  } catch (e) {
    return null;
  }
}

function carregarDoArquivo() {
  try {
    const paths = [
      path.join(process.cwd(), 'public', 'acessos-pantaneiro5.json'),
      path.join(__dirname, '..', 'public', 'acessos-pantaneiro5.json')
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        const cnpjs = Array.isArray(data.cnpj) ? data.cnpj : [];
        return { cnpjs, usuarios: [] };
      }
    }
  } catch (e) {
    console.error('Erro ao ler acessos-pantaneiro5.json:', e.message);
  }
  return { cnpjs: [], usuarios: [] };
}

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS acessos_pantaneiro5 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('cnpj','usuario') NOT NULL,
    valor VARCHAR(255) NOT NULL,
    UNIQUE KEY uk_tipo_valor (tipo, valor)
  )
`;

async function garantirTabela(conn) {
  try {
    await conn.execute(CREATE_TABLE_SQL);
  } catch (e) {
    console.error('Erro ao criar tabela acessos_pantaneiro5:', e.message);
  }
}

async function carregarAcessos(conn) {
  try {
    const [rows] = await conn.execute(
      'SELECT tipo, valor FROM acessos_pantaneiro5'
    );
    const cnpjs = rows.filter(r => r.tipo === 'cnpj').map(r => r.valor);
    const usuarios = rows.filter(r => r.tipo === 'usuario').map(r => r.valor);
    return { cnpjs, usuarios };
  } catch (e) {
    return { cnpjs: [], usuarios: [] };
  }
}

module.exports = async (req, res) => {
  addSecurityHeaders(res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  let connection = null;
  let usaArquivo = false;

  try {
    connection = await getConnection();
    let acessos;

    if (connection) {
      await garantirTabela(connection);
      acessos = await carregarAcessos(connection);
    } else {
      usaArquivo = true;
      acessos = carregarDoArquivo();
    }

    if (req.method === 'GET') {
      if (usaArquivo) res.setHeader('X-Data-Source', 'file');
      return res.status(200).json(acessos);
    }

    if (usaArquivo) {
      return res.status(501).json({
        error: 'Sem banco de dados. Edite a lista e clique em "Publicar" para baixar o arquivo. Depois substitua public/acessos-pantaneiro5.json no repositório e faça deploy.',
        acessos,
        modoArquivo: true
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { tipo, valor } = body;
      if (!tipo || !valor) {
        return res.status(400).json({ error: 'Informe tipo (cnpj ou usuario) e valor' });
      }
      const v = (valor || '').toString().trim().toLowerCase();
      if (!v) return res.status(400).json({ error: 'Valor inválido' });

      if (tipo === 'cnpj') {
        const cnpjNorm = normalizarCnpj(valor);
        if (cnpjNorm.length < 14) return res.status(400).json({ error: 'CNPJ inválido' });
        if (!acessos.cnpjs.includes(cnpjNorm)) {
          await connection.execute(
            'INSERT IGNORE INTO acessos_pantaneiro5 (tipo, valor) VALUES (?, ?)',
            ['cnpj', cnpjNorm]
          );
          acessos = await carregarAcessos(connection);
        }
        return res.status(200).json({ message: 'CNPJ adicionado', acessos });
      }
      if (tipo === 'usuario') {
        if (!acessos.usuarios.includes(v)) {
          await connection.execute(
            'INSERT IGNORE INTO acessos_pantaneiro5 (tipo, valor) VALUES (?, ?)',
            ['usuario', v]
          );
          acessos = await carregarAcessos(connection);
        }
        return res.status(200).json({ message: 'Usuário adicionado', acessos });
      }
      return res.status(400).json({ error: 'Tipo deve ser cnpj ou usuario' });
    }

    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? (() => { try { return JSON.parse(req.body || '{}'); } catch(_) { return {}; } })() : (req.body || {});
      const tipo = (req.query?.tipo || body.tipo || '').toString().toLowerCase();
      const valor = req.query?.valor || body.valor;

      if (!tipo || !valor) {
        return res.status(400).json({ error: 'Informe tipo (cnpj ou usuario) e valor' });
      }

      const v = (valor || '').toString().trim().toLowerCase();
      if (tipo === 'cnpj') {
        const cnpjNorm = normalizarCnpj(valor);
        await connection.execute(
          'DELETE FROM acessos_pantaneiro5 WHERE tipo = ? AND valor = ?',
          ['cnpj', cnpjNorm]
        );
        acessos = await carregarAcessos(connection);
        return res.status(200).json({ message: 'CNPJ removido', acessos });
      }
      if (tipo === 'usuario') {
        await connection.execute(
          'DELETE FROM acessos_pantaneiro5 WHERE tipo = ? AND valor = ?',
          ['usuario', v]
        );
        acessos = await carregarAcessos(connection);
        return res.status(200).json({ message: 'Usuário removido', acessos });
      }
      return res.status(400).json({ error: 'Tipo deve ser cnpj ou usuario' });
    }

    res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    console.error('Erro acessos-pantaneiro5:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.end();
  }
};
