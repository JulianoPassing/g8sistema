const mysql = require('mysql2/promise');

module.exports = async (req, res) => {
  console.log('API de cliente individual chamada:', {
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
    // Extrair ID do nome do arquivo (Vercel automaticamente roteia para este arquivo)
    const id = req.url.split('/').pop();

    console.log('ID extraído:', id);

    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido fornecido' });
    }

    if (req.method === 'PUT') {
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
      const [result] = await connection.execute('DELETE FROM clientes WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.status(200).json({ message: 'Cliente removido com sucesso!' });
      return;
    }

    // GET - buscar cliente específico
    const [rows] = await connection.execute('SELECT * FROM clientes WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Erro na API de cliente individual:', err);
    res.status(500).json({ error: err.message });
  } finally {
    await connection.end();
  }
};
