const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
  console.log('API de clientes (lote) chamada:', {
    method: req.method,
    url: req.url,
    path: req.headers['x-vercel-path'],
    body: req.body
  });

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'julianopassing',
    password: process.env.DB_PASSWORD || 'Juliano@95',
    database: process.env.DB_NAME || 'sistemajuliano'
  });

  try {
    if (req.method === 'POST') {
      const {
        razao, cnpj, ie, endereco, bairro, cidade, estado, cep,
        email, telefone, transporte, prazo, obs
      } = req.body;

      const [result] = await connection.execute(
        `INSERT INTO clientes (razao, cnpj, ie, endereco, bairro, cidade, estado, cep, email, telefone, transporte, prazo, obs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [razao, cnpj, ie, endereco, bairro, cidade, estado, cep, email, telefone, transporte, prazo, obs]
      );

      res.status(201).json({ id: result.insertId, message: 'Cliente cadastrado com sucesso!' });
      return;
    }

    // GET - listar todos os clientes
    const [rows] = await connection.execute('SELECT * FROM clientes ORDER BY id');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erro na API de clientes (lote):', err);
    res.status(500).json({ error: err.message });
  } finally {
    await connection.end();
  }
}; 