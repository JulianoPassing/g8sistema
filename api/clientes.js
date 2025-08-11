const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
  console.log('API de clientes chamada:', {
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

    if (req.method === 'PUT') {
      // Extrair ID da URL
      let id;
      
      // No Vercel, o ID vem como parâmetro da rota
      if (req.headers['x-vercel-path']) {
        const pathParts = req.headers['x-vercel-path'].split('/');
        id = pathParts[pathParts.length - 1];
      } else if (req.url) {
        const urlParts = req.url.split('/');
        id = urlParts[urlParts.length - 1];
      }

      console.log('ID extraído para PUT:', id);

      if (!id || isNaN(id)) {
        console.error('ID inválido:', id);
        return res.status(400).json({ error: 'ID inválido fornecido' });
      }

      const {
        razao, cnpj, ie, endereco, bairro, cidade, estado, cep,
        email, telefone, transporte, prazo, obs
      } = req.body;

      const [result] = await connection.execute(
        `UPDATE clientes SET razao=?, cnpj=?, ie=?, endereco=?, bairro=?, cidade=?, estado=?, cep=?, email=?, telefone=?, transporte=?, prazo=?, obs=? WHERE id=?`,
        [razao, cnpj, ie, endereco, bairro, cidade, estado, cep, email, telefone, transporte, prazo, obs, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.status(200).json({ message: 'Cliente atualizado com sucesso!' });
      return;
    }

    if (req.method === 'DELETE') {
      // Extrair ID da URL
      let id;
      
      if (req.headers['x-vercel-path']) {
        const pathParts = req.headers['x-vercel-path'].split('/');
        id = pathParts[pathParts.length - 1];
      } else if (req.url) {
        const urlParts = req.url.split('/');
        id = urlParts[urlParts.length - 1];
      }

      console.log('ID extraído para DELETE:', id);

      if (!id || isNaN(id)) {
        console.error('ID inválido:', id);
        return res.status(400).json({ error: 'ID inválido fornecido' });
      }
      
      const [result] = await connection.execute('DELETE FROM clientes WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.status(200).json({ message: 'Cliente removido com sucesso!' });
      return;
    }

    // GET - listar todos os clientes
    const [rows] = await connection.execute('SELECT * FROM clientes ORDER BY id');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erro na API de clientes:', err);
    res.status(500).json({ error: err.message });
  } finally {
    await connection.end();
  }
}; 