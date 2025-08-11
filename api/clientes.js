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
    // Extrair ID da URL de forma mais robusta
    let id = null;
    
    // No Vercel, usar o header x-vercel-path que contém o path completo
    if (req.headers['x-vercel-path']) {
      const pathParts = req.headers['x-vercel-path'].split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && !isNaN(lastPart)) {
        id = lastPart;
        console.log('ID extraído do x-vercel-path:', id);
      }
    }
    
    // Fallback para req.url se x-vercel-path não estiver disponível
    if (!id && req.url) {
      const urlParts = req.url.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      if (lastPart && !isNaN(lastPart)) {
        id = lastPart;
        console.log('ID extraído da URL:', id);
      }
    }

    console.log('ID final extraído:', id);

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

    if (req.method === 'PUT' && id) {
      const {
        razao, cnpj, ie, endereco, bairro, cidade, estado, cep,
        email, telefone, transporte, prazo, obs
      } = req.body;

      console.log('Tentando atualizar cliente ID:', id);

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

    if (req.method === 'DELETE' && id) {
      console.log('Tentando deletar cliente ID:', id);
      
      const [result] = await connection.execute('DELETE FROM clientes WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.status(200).json({ message: 'Cliente removido com sucesso!' });
      return;
    }

    if (req.method === 'GET' && id) {
      // GET cliente específico
      console.log('Buscando cliente ID:', id);
      const [rows] = await connection.execute('SELECT * FROM clientes WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.status(200).json(rows[0]);
      return;
    }

    // GET - listar todos os clientes (quando não há ID)
    if (req.method === 'GET') {
      const [rows] = await connection.execute('SELECT * FROM clientes ORDER BY id');
      res.status(200).json(rows);
      return;
    }

    // Se chegou aqui, método não suportado
    res.status(405).json({ error: 'Método não suportado' });
  } catch (err) {
    console.error('Erro na API de clientes:', err);
    res.status(500).json({ error: err.message });
  } finally {
    await connection.end();
  }
}; 