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
      const { empresa, descricao } = req.body;
      const [result] = await connection.execute(
        `INSERT INTO pedidos (empresa, descricao) VALUES (?, ?)` ,
        [empresa, descricao]
      );
      res.status(201).json({ id: result.insertId, message: 'Pedido cadastrado com sucesso!' });
      return;
    }

    if (req.method === 'PUT') {
      const { id, empresa, descricao } = req.body;
      const [result] = await connection.execute(
        `UPDATE pedidos SET empresa = ?, descricao = ? WHERE id = ?`,
        [empresa, descricao, id]
      );
      res.status(200).json({ message: 'Pedido atualizado com sucesso!' });
      return;
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) {
        res.status(400).json({ error: 'ID do pedido é obrigatório.' });
        return;
      }
      await connection.execute('DELETE FROM pedidos WHERE id = ?', [id]);
      res.status(200).json({ message: 'Pedido cancelado/removido com sucesso!' });
      return;
    }

    // GET - listar todos os pedidos
    const [rows] = await connection.execute('SELECT * FROM pedidos ORDER BY data_pedido DESC');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await connection.end();
  }
}; 