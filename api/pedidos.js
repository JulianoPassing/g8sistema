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
      const { empresa, descricao, dados } = req.body;
      const [result] = await connection.execute(
        `INSERT INTO pedidos (empresa, descricao, dados, data_pedido) VALUES (?, ?, ?, CONVERT_TZ(NOW(), '+00:00', '-03:00'))` ,
        [empresa, descricao, JSON.stringify(dados || {})]
      );
      res.status(201).json({ id: result.insertId, message: 'Pedido cadastrado com sucesso!' });
      return;
    }

    if (req.method === 'PUT') {
      const { id, empresa, descricao, dados } = req.body;
      const [result] = await connection.execute(
        `UPDATE pedidos SET empresa = ?, descricao = ?, dados = ?, data_pedido = CONVERT_TZ(NOW(), '+00:00', '-03:00') WHERE id = ?`,
        [empresa, descricao, JSON.stringify(dados || {}), id]
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
    // Parse o campo dados para JSON, se existir
    const pedidos = rows.map(row => ({
      ...row,
      dados: row.dados ? JSON.parse(row.dados) : null
    }));
    res.status(200).json(pedidos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await connection.end();
  }
}; 