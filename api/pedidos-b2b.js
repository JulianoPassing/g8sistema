const mysql = require('mysql2/promise');
const { enviarNotificacaoPedido } = require('./email-service');

module.exports = async (req, res) => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'julianopassing',
    password: process.env.DB_PASSWORD || 'Juliano@95',
    database: process.env.DB_NAME || 'sistemajuliano'
  });

  try {
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
        observacoes: observacoes || ''
      };
      
      const [result] = await connection.execute(
        `INSERT INTO pedidos (empresa, descricao, dados, data_pedido) VALUES (?, ?, ?, NOW())`,
        [empresa, descricao, JSON.stringify(dadosCompletos)]
      );
      
      // Enviar notificação por e-mail após salvar o pedido
      if (result.insertId) {
        try {
          console.log('📧 Enviando notificação por e-mail para o pedido #' + result.insertId);
          
          await enviarNotificacaoPedido({
            id: result.insertId,
            empresa,
            descricao,
            clienteInfo: dadosCompletos.clienteInfo,
            data: new Date(),
            observacoes: dadosCompletos.observacoes
          });
          
          console.log('✅ Notificação por e-mail enviada com sucesso para o pedido #' + result.insertId);
        } catch (emailError) {
          console.error('❌ Erro ao enviar notificação por e-mail:', emailError);
          // Não falha o pedido se o e-mail falhar - apenas loga o erro
        }
      }
      
      res.status(201).json({ 
        id: result.insertId, 
        message: 'Pedido enviado com sucesso! Em breve entraremos em contato.' 
      });
      return;
    }

    // GET - listar pedidos de um cliente específico
    if (req.method === 'GET') {
      const { clienteId } = req.query;
      
      if (!clienteId) {
        res.status(400).json({ error: 'ID do cliente é obrigatório.' });
        return;
      }
      
      const [rows] = await connection.execute(
        'SELECT * FROM pedidos WHERE JSON_EXTRACT(dados, "$.clienteId") = ? ORDER BY data_pedido DESC',
        [clienteId]
      );
      
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
    res.status(500).json({ error: err.message });
  } finally {
    try {
      if (connection) {
        await connection.end();
      }
    } catch (closeErr) {
      console.error('Erro ao fechar conexão:', closeErr);
    }
  }
};
