const mysql = require('mysql2/promise');
const emailNotification = require('./notifications/email');

function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error(`${label} excedeu ${ms}ms`);
      err.code = 'OP_TIMEOUT';
      reject(err);
    }, ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ]);
}

module.exports = async (req, res) => {
  let connection;
  try {
    connection = await withTimeout(mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'julianopassing',
      password: process.env.DB_PASSWORD || 'Juliano@95',
      database: process.env.DB_NAME || 'sistemajuliano',
      connectTimeout: 20000
    }), 25000, 'Conexão com banco B2B');
    if (req.method === 'POST') {
      const { clienteId, empresa, descricao, dados, observacoes } = req.body;
      
      // Validação básica
      if (!clienteId || !empresa || !descricao) {
        res.status(400).json({ 
          error: 'Cliente, empresa e descrição são obrigatórios.' 
        });
        return;
      }
      
      // Adicionar informação de que é um pedido B2B
      const dadosCompletos = {
        ...dados,
        origem: 'b2b',
        clienteId: clienteId,
        observacoes: observacoes || '',
        enviado_producao: 0
      };
      
      const [result] = await withTimeout(connection.execute(
        `INSERT INTO pedidos (empresa, descricao, dados, data_pedido) VALUES (?, ?, ?, NOW())`,
        [empresa, descricao, JSON.stringify(dadosCompletos)]
      ), 30000, 'Inserção de pedido B2B');

      res.status(201).json({
        id: result.insertId,
        message: 'Pedido enviado com sucesso! Em breve entraremos em contato.'
      });

      void emailNotification
        .notifyNewOrder({
          id: result.insertId,
          empresa: empresa,
          descricao: descricao,
          dados: dadosCompletos,
          origem: 'b2b'
        })
        .catch((err) => console.error('Erro ao enviar notificação por e-mail (B2B):', err));
      return;
    }

    // GET - listar pedidos de um cliente específico
    if (req.method === 'GET') {
      const { clienteId } = req.query;
      
      if (!clienteId) {
        res.status(400).json({ error: 'ID do cliente é obrigatório.' });
        return;
      }
      
      const [rows] = await withTimeout(connection.execute(
        'SELECT * FROM pedidos WHERE JSON_EXTRACT(dados, "$.clienteId") = ? ORDER BY data_pedido DESC',
        [clienteId]
      ), 30000, 'Listagem de pedidos B2B');
      
      // Parse o campo dados para JSON
      const pedidos = rows.map(row => ({
        ...row,
        dados: row.dados ? JSON.parse(row.dados) : null
      }));
      
      res.status(200).json(pedidos);
      return;
    }

    res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    console.error('Erro na API de pedidos B2B:', err);
    if (!res.headersSent) {
      const isTimeout = err && err.code === 'OP_TIMEOUT';
      res.status(isTimeout ? 504 : 500).json({
        error: err.message || (isTimeout ? 'Tempo limite excedido em operação do banco' : 'Erro interno'),
        code: err && err.code ? err.code : (isTimeout ? 'OP_TIMEOUT' : 'INTERNAL_ERROR')
      });
    }
  } finally {
    if (connection) {
      try {
        connection.destroy();
      } catch (closeErr) {
        console.error('Erro ao destruir conexão MySQL (B2B):', closeErr);
      }
    }
  }
};
