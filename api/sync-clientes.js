const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

module.exports = async (req, res) => {
  // Configurar CORS para permitir requisições do frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido. Use POST.' });
    return;
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'julianopassing',
      password: process.env.DB_PASSWORD || 'Juliano@95',
      database: process.env.DB_NAME || 'sistemajuliano'
    });

    // Buscar todos os clientes do banco de dados
    const [rows] = await connection.execute('SELECT * FROM clientes ORDER BY id');
    
    // Salvar no arquivo clientes.json
    const clientesPath = path.join(__dirname, '../public/clientes.json');
    await fs.writeFile(clientesPath, JSON.stringify(rows, null, 2), 'utf8');
    
    res.status(200).json({ 
      success: true,
      message: `Sincronização concluída! ${rows.length} clientes sincronizados.`,
      count: rows.length
    });

  } catch (error) {
    console.error('Erro na sincronização:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: 'Erro ao sincronizar clientes do banco de dados para o arquivo JSON'
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}; 