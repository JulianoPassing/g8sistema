const { enviarNotificacaoPedido, testarConexaoEmail } = require('./email-service');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Testar apenas a conexão
      console.log('🔧 Testando conexão com serviço de e-mail...');
      const conexaoOk = await testarConexaoEmail();
      
      if (conexaoOk) {
        res.status(200).json({
          success: true,
          message: '✅ Conexão com serviço de e-mail funcionando perfeitamente!',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          message: '❌ Erro na conexão com serviço de e-mail',
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    if (req.method === 'POST') {
      // Testar envio de e-mail completo
      console.log('📧 Testando envio de e-mail de notificação...');
      
      const dadosTeste = {
        id: 'TEST-' + Date.now(),
        empresa: 'Pantaneiro 5',
        descricao: 'Este é um pedido de teste para verificar se o sistema de notificação por e-mail está funcionando corretamente.\n\nProdutos solicitados:\n- Produto A: 100 unidades\n- Produto B: 50 unidades\n\nEntrega urgente solicitada.',
        clienteInfo: {
          razao: 'Empresa Teste Ltda',
          cnpj: '12.345.678/0001-90',
          cidade: 'São Paulo',
          estado: 'SP'
        },
        data: new Date(),
        observacoes: 'Pedido de teste - pode ser ignorado.'
      };

      const resultado = await enviarNotificacaoPedido(dadosTeste);
      
      res.status(200).json({
        success: true,
        message: '✅ E-mail de teste enviado com sucesso!',
        messageId: resultado.messageId,
        dadosEnviados: dadosTeste,
        timestamp: new Date().toISOString()
      });
      return;
    }

    res.status(405).json({ 
      success: false,
      error: 'Método não permitido. Use GET para testar conexão ou POST para testar envio completo.' 
    });

  } catch (error) {
    console.error('❌ Erro no teste de e-mail:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
