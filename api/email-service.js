const nodemailer = require('nodemailer');

// Configuração do transporter de e-mail
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'suporte.jpsistemas@gmail.com',
    pass: process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD // Senha de app do Gmail
  }
});

/**
 * Envia notificação por e-mail quando um novo pedido B2B é criado
 * @param {Object} dadosPedido - Dados do pedido criado
 */
async function enviarNotificacaoPedido(dadosPedido) {
  try {
    const { id, empresa, descricao, clienteInfo, data, observacoes } = dadosPedido;
    
    // E-mail do admin que receberá as notificações
    const adminEmail = process.env.ADMIN_EMAIL || 'g8julianojr@gmail.com';
    
    const mailOptions = {
      from: {
        name: 'G8 Sistema B2B',
        address: process.env.EMAIL_USER || 'suporte.jpsistemas@gmail.com'
      },
      to: adminEmail,
      subject: `🎫 Novo Pedido B2B - ${empresa} - ID: ${id}`,
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Novo Pedido B2B</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #ff0000;
            }
            .header h1 {
              color: #ff0000;
              margin: 0;
              font-size: 24px;
            }
            .badge {
              background: #ff0000;
              color: white;
              padding: 5px 15px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              display: inline-block;
              margin-bottom: 10px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 20px;
            }
            .info-item {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #ff0000;
            }
            .info-item strong {
              color: #ff0000;
              display: block;
              margin-bottom: 5px;
            }
            .descricao {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #ff0000;
            }
            .observacoes {
              background: #fff3cd;
              padding: 15px;
              border-radius: 8px;
              border-left: 4px solid #ffc107;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              color: #666;
            }
            .btn {
              display: inline-block;
              background: #ff0000;
              color: white;
              padding: 12px 25px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 10px 0;
            }
            .btn:hover {
              background: #cc0000;
            }
            @media (max-width: 600px) {
              .info-grid {
                grid-template-columns: 1fr;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="badge">🌐 PEDIDO B2B</div>
              <h1>Novo Pedido Recebido!</h1>
            </div>
            
            <div class="info-grid">
              <div class="info-item">
                <strong>📋 ID do Pedido</strong>
                #${id}
              </div>
              <div class="info-item">
                <strong>🏢 Empresa</strong>
                ${empresa}
              </div>
              <div class="info-item">
                <strong>👤 Cliente</strong>
                ${clienteInfo.razao}
              </div>
              <div class="info-item">
                <strong>📄 CNPJ</strong>
                ${clienteInfo.cnpj}
              </div>
              <div class="info-item">
                <strong>📍 Cidade</strong>
                ${clienteInfo.cidade} - ${clienteInfo.estado}
              </div>
              <div class="info-item">
                <strong>📅 Data/Hora</strong>
                ${new Date(data).toLocaleString('pt-BR')}
              </div>
            </div>
            
            <div class="descricao">
              <strong>📝 Descrição do Pedido:</strong><br>
              ${descricao.replace(/\n/g, '<br>')}
            </div>
            
            ${observacoes ? `
            <div class="observacoes">
              <strong>💭 Observações:</strong><br>
              ${observacoes.replace(/\n/g, '<br>')}
            </div>
            ` : ''}
            
            <div class="footer">
              <p>Este é um pedido feito através do Portal B2B da G8 Representações.</p>
              <a href="${process.env.SITE_URL || 'https://g8sistema.vercel.app'}/painel.html" class="btn">
                🔗 Acessar Painel Admin
              </a>
              <p style="font-size: 12px; margin-top: 20px;">
                Sistema G8 - Notificação automática
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      // Versão texto simples para clientes que não suportam HTML
      text: `
🎫 NOVO PEDIDO B2B RECEBIDO!

ID: #${id}
Empresa: ${empresa}
Cliente: ${clienteInfo.razao}
CNPJ: ${clienteInfo.cnpj}
Cidade: ${clienteInfo.cidade} - ${clienteInfo.estado}
Data: ${new Date(data).toLocaleString('pt-BR')}

DESCRIÇÃO:
${descricao}

${observacoes ? `OBSERVAÇÕES:\n${observacoes}\n` : ''}

Acesse o painel: ${process.env.SITE_URL || 'https://g8sistema.vercel.app'}/painel.html
      `
    };

    // Enviar o e-mail
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ E-mail de notificação enviado com sucesso:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId
    };
    
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail de notificação:', error);
    throw error;
  }
}

/**
 * Testa a conexão com o serviço de e-mail
 */
async function testarConexaoEmail() {
  try {
    await transporter.verify();
    console.log('✅ Conexão com serviço de e-mail verificada com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão com serviço de e-mail:', error);
    return false;
  }
}

module.exports = {
  enviarNotificacaoPedido,
  testarConexaoEmail
};
