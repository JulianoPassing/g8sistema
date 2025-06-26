const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
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
    const [rows] = await connection.execute('SELECT * FROM clientes');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await connection.end();
  }
}; 