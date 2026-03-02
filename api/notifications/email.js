const nodemailer = require('nodemailer');

/**
 * Módulo de Notificação por E-mail
 * Usa Nodemailer com Gmail (gratuito até 500 e-mails/dia)
 * 
 * CONFIGURAÇÃO:
 * 1. Configure as variáveis de ambiente:
 *    - EMAIL_USER: seu e-mail do Gmail (ex: seuemail@gmail.com)
 *    - EMAIL_PASS: senha de aplicativo do Gmail (não use sua senha normal!)
 *    - EMAIL_TO: e-mail(s) que receberá(ão) as notificações
 * 
 * 2. Para gerar senha de aplicativo no Gmail:
 *    - Acesse: https://myaccount.google.com/apppasswords
 *    - Selecione "Outro" e dê um nome (ex: "Sistema G8")
 *    - Use a senha de 16 dígitos gerada
 * 
 * 3. MÚLTIPLOS DESTINATÁRIOS:
 *    Para enviar para vários e-mails, separe-os por vírgula:
 *    EMAIL_TO=email1@gmail.com, email2@gmail.com, email3@hotmail.com
 */

class EmailNotification {
  constructor() {
    this.transporter = null;
    this.configured = false;
    this.init();
  }

  // Inicializar configuração
  init() {
    try {
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;

      if (!emailUser || !emailPass) {
        console.warn('⚠️ Notificação por e-mail não configurada. Configure EMAIL_USER e EMAIL_PASS nas variáveis de ambiente.');
        return;
      }

      // Criar transporter do Nodemailer
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      });

      this.configured = true;
      console.log('✅ Sistema de notificação por e-mail configurado');
    } catch (error) {
      console.error('❌ Erro ao configurar sistema de e-mail:', error.message);
    }
  }

  // Verificar se está configurado
  isConfigured() {
    return this.configured;
  }

  // Enviar com retry (até 3 tentativas para falhas temporárias)
  async _sendWithRetry(mailOptions, maxAttempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.transporter.sendMail(mailOptions);
      } catch (err) {
        lastError = err;
        const isRetryable = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ESOCKET' || err.responseCode === 421 || err.responseCode === 450;
        if (attempt < maxAttempts && isRetryable) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.warn(`⚠️ Tentativa ${attempt}/${maxAttempts} falhou, retry em ${delay}ms:`, err.message);
          await new Promise(r => setTimeout(r, delay));
        } else {
          throw err;
        }
      }
    }
    throw lastError;
  }

  // Enviar notificação de novo pedido
  async notifyNewOrder(pedidoData) {
    if (!this.isConfigured()) {
      console.log('📧 E-mail não configurado, notificação não enviada');
      return { success: false, message: 'E-mail não configurado' };
    }

    try {
      // Suporta múltiplos e-mails separados por vírgula
      // Exemplo: email1@gmail.com, email2@gmail.com, email3@gmail.com
      const emailTo = process.env.EMAIL_TO || process.env.EMAIL_USER;
      const { id, empresa, descricao, dados, origem } = pedidoData;

      // Extrair informações do pedido
      let dadosParsed = {};
      if (typeof dados === 'string') {
        try {
          dadosParsed = JSON.parse(dados);
        } catch (e) {
          dadosParsed = { dados };
        }
      } else if (dados) {
        dadosParsed = dados;
      }

      // Montar conteúdo do e-mail
      const isB2B = origem === 'b2b' || dadosParsed.origem === 'b2b';
      const clienteNome = dadosParsed.clienteNome || 'Cliente não identificado';
      const observacoes = dadosParsed.observacoes || 'Sem observações';

      const subject = isB2B 
        ? `🛒 Novo Pedido B2B #${id} - ${empresa}`
        : `🛒 Novo Pedido #${id} - ${empresa}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            /* Reset */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
              line-height: 1.6;
              color: #000000;
              background: #f5f5f5;
              padding: 20px;
            }
            
            /* Container principal */
            .email-container {
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
            }
            
            /* Header com gradiente G8 */
            .header {
              background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
              color: #ffffff;
              padding: 40px 30px;
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            
            .header::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -50%;
              width: 200%;
              height: 200%;
              background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
              animation: pulse 4s ease-in-out infinite;
            }
            
            @keyframes pulse {
              0%, 100% { opacity: 0.5; transform: scale(1); }
              50% { opacity: 0.8; transform: scale(1.1); }
            }
            
            .header-content {
              position: relative;
              z-index: 1;
            }
            
            .logo-text {
              font-size: 28px;
              font-weight: 800;
              letter-spacing: 2px;
              margin-bottom: 8px;
              text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            }
            
            .header h1 {
              font-size: 22px;
              font-weight: 600;
              margin: 15px 0 5px 0;
            }
            
            .header p {
              font-size: 14px;
              opacity: 0.95;
              font-weight: 300;
            }
            
            /* Linha decorativa */
            .divider {
              height: 4px;
              background: linear-gradient(90deg, #ff0000 0%, #000000 100%);
            }
            
            /* Conteúdo */
            .content {
              padding: 35px 30px;
              background: #ffffff;
            }
            
            /* Alerta de novo pedido */
            .alert-box {
              background: linear-gradient(135deg, #fff0f0 0%, #ffffff 100%);
              border-left: 5px solid #ff0000;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
              box-shadow: 0 4px 12px rgba(255, 0, 0, 0.1);
            }
            
            .alert-icon {
              font-size: 32px;
              margin-bottom: 10px;
            }
            
            .alert-title {
              font-size: 18px;
              font-weight: 700;
              color: #ff0000;
              margin-bottom: 5px;
            }
            
            .alert-text {
              color: #333333;
              font-size: 14px;
            }
            
            /* Box de informações */
            .info-box {
              background: #fafafa;
              padding: 25px;
              border-radius: 10px;
              margin-bottom: 25px;
              border: 1px solid #e0e0e0;
            }
            
            .info-row {
              display: flex;
              padding: 12px 0;
              border-bottom: 1px solid #e5e5e5;
              align-items: center;
            }
            
            .info-row:last-child {
              border-bottom: none;
            }
            
            .info-label {
              font-weight: 700;
              color: #000000;
              min-width: 140px;
              font-size: 14px;
              display: flex;
              align-items: center;
            }
            
            .info-label::before {
              content: '●';
              color: #ff0000;
              margin-right: 8px;
              font-size: 18px;
            }
            
            .info-value {
              color: #333333;
              font-size: 14px;
              flex: 1;
            }
            
            .info-value strong {
              color: #000000;
              font-weight: 700;
            }
            
            /* Badge B2B */
            .badge {
              display: inline-block;
              padding: 6px 14px;
              border-radius: 20px;
              background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
              color: #ffffff;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 1px;
              text-transform: uppercase;
              box-shadow: 0 2px 8px rgba(255, 0, 0, 0.3);
            }
            
            /* Seção de descrição */
            .description-section {
              margin-top: 30px;
            }
            
            .section-title {
              font-size: 16px;
              font-weight: 700;
              color: #000000;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 3px solid #ff0000;
              display: flex;
              align-items: center;
            }
            
            .section-title::before {
              content: '📋';
              margin-right: 10px;
              font-size: 20px;
            }
            
            .description-box {
              background: #fafafa;
              padding: 20px;
              border-radius: 8px;
              border: 1px solid #e0e0e0;
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
              font-size: 13px;
              line-height: 1.6;
              color: #1a1a1a;
              max-height: 400px;
              overflow-y: auto;
            }
            
            /* Footer */
            .footer {
              background: linear-gradient(135deg, #000000 0%, #333333 100%);
              color: #ffffff;
              padding: 25px 30px;
              text-align: center;
            }
            
            .footer-logo {
              font-size: 20px;
              font-weight: 800;
              letter-spacing: 2px;
              margin-bottom: 10px;
              color: #ff0000;
            }
            
            .footer p {
              font-size: 12px;
              margin: 5px 0;
              opacity: 0.8;
            }
            
            .footer-divider {
              width: 60px;
              height: 2px;
              background: #ff0000;
              margin: 15px auto;
            }
            
            /* Responsivo */
            @media only screen and (max-width: 600px) {
              body {
                padding: 10px;
              }
              
              .header {
                padding: 30px 20px;
              }
              
              .content {
                padding: 25px 20px;
              }
              
              .info-label {
                min-width: 100px;
                font-size: 13px;
              }
              
              .info-value {
                font-size: 13px;
              }
              
              .logo-text {
                font-size: 24px;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <!-- Header -->
            <div class="header">
              <div class="header-content">
                <div class="logo-text">G8</div>
                <h1>🛒 Novo Pedido Recebido</h1>
                <p>Sistema de Pedidos</p>
              </div>
            </div>
            
            <!-- Divider -->
            <div class="divider"></div>
            
            <!-- Content -->
            <div class="content">
              <!-- Alert Box -->
              <div class="alert-box">
                <div class="alert-icon">🔔</div>
                <div class="alert-title">Atenção: Novo Pedido Cadastrado!</div>
                <div class="alert-text">Um novo pedido foi registrado no sistema e requer sua atenção.</div>
              </div>
              
              <!-- Info Box -->
              <div class="info-box">
                <div class="info-row">
                  <div class="info-label">Pedido</div>
                  <div class="info-value"><strong>#${id}</strong></div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Empresa</div>
                  <div class="info-value"><strong>${empresa}</strong></div>
                </div>
                
                ${isB2B ? `
                <div class="info-row">
                  <div class="info-label">Tipo</div>
                  <div class="info-value"><span class="badge">Portal B2B</span></div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Cliente</div>
                  <div class="info-value">${clienteNome}</div>
                </div>
                
                ${observacoes !== 'Sem observações' ? `
                <div class="info-row">
                  <div class="info-label">Observações</div>
                  <div class="info-value">${observacoes}</div>
                </div>
                ` : ''}
                ` : ''}
                
                <div class="info-row">
                  <div class="info-label">Data/Hora</div>
                  <div class="info-value">${new Date().toLocaleString('pt-BR', { 
                    dateStyle: 'long', 
                    timeStyle: 'short' 
                  })}</div>
                </div>
              </div>
              
              <!-- Description Section -->
              <div class="description-section">
                <div class="section-title">Descrição do Pedido</div>
                <div class="description-box">${descricao || 'Nenhuma descrição fornecida.'}</div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <div class="footer-logo">G8 REPRESENTAÇÕES</div>
              <div class="footer-divider"></div>
              <p>Este é um e-mail automático do Sistema G8</p>
              <p>Por favor, não responda este e-mail</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Versão texto simples
      const textContent = `
🛒 NOVO PEDIDO RECEBIDO

Pedido: #${id}
Empresa: ${empresa}
${isB2B ? `Tipo: B2B\nCliente: ${clienteNome}\n` : ''}
Data/Hora: ${new Date().toLocaleString('pt-BR')}

DESCRIÇÃO DO PEDIDO:
${descricao || 'Sem descrição'}

---
Sistema G8 - Notificação Automática
      `.trim();

      // Configurar e-mail
      const mailOptions = {
        from: `"Sistema G8" <${process.env.EMAIL_USER}>`,
        to: emailTo,
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      // Enviar e-mail (com retry em caso de falha temporária)
      const info = await this._sendWithRetry(mailOptions, 3);
      
      console.log('✅ E-mail de notificação enviado:', info.messageId);
      return { 
        success: true, 
        messageId: info.messageId,
        message: 'E-mail enviado com sucesso'
      };

    } catch (error) {
      console.error('❌ Erro ao enviar e-mail de notificação:', error.message);
      return { 
        success: false, 
        error: error.message,
        message: 'Erro ao enviar e-mail'
      };
    }
  }

  // Enviar notificação de pedido atualizado (PUT)
  async notifyOrderUpdated(pedidoData) {
    if (!this.isConfigured()) {
      console.log('📧 E-mail não configurado, notificação não enviada');
      return { success: false, message: 'E-mail não configurado' };
    }

    try {
      const emailTo = process.env.EMAIL_TO || process.env.EMAIL_USER;
      const { id, empresa, descricao, dados, origem } = pedidoData;

      let dadosParsed = {};
      if (typeof dados === 'string') {
        try {
          dadosParsed = JSON.parse(dados);
        } catch (e) {
          dadosParsed = { dados };
        }
      } else if (dados) {
        dadosParsed = dados;
      }

      const isB2B = origem === 'b2b' || dadosParsed.origem === 'b2b';
      const clienteNome = dadosParsed.clienteNome || 'Cliente não identificado';
      const observacoes = dadosParsed.observacoes || 'Sem observações';

      const subject = isB2B 
        ? `✏️ Pedido B2B Atualizado #${id} - ${empresa}`
        : `✏️ Pedido Atualizado #${id} - ${empresa}`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Inter, sans-serif; line-height: 1.6; color: #000; background: #f5f5f5; padding: 20px; }
            .email-container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.15); }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; padding: 40px 30px; text-align: center; }
            .divider { height: 4px; background: linear-gradient(90deg, #f59e0b 0%, #000 100%); }
            .content { padding: 35px 30px; }
            .alert-box { background: #fff7ed; border-left: 5px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 25px; }
            .info-box { background: #fafafa; padding: 25px; border-radius: 10px; border: 1px solid #e0e0e0; }
            .info-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e5e5e5; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: 700; min-width: 140px; }
            .info-value { flex: 1; }
            .description-box { background: #fafafa; padding: 20px; border-radius: 8px; margin-top: 15px; font-family: monospace; font-size: 13px; white-space: pre-wrap; }
            .footer { background: #333; color: #fff; padding: 25px; text-align: center; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <div style="font-size:28px;font-weight:800;">G8</div>
              <h1 style="font-size:22px;margin:15px 0 5px 0;">✏️ Pedido Atualizado</h1>
              <p style="font-size:14px;opacity:0.95;">Sistema de Pedidos</p>
            </div>
            <div class="divider"></div>
            <div class="content">
              <div class="alert-box">
                <div style="font-size:18px;font-weight:700;color:#d97706;">Atenção: Pedido Atualizado!</div>
                <div style="color:#333;margin-top:8px;">Um pedido foi atualizado no sistema.</div>
              </div>
              <div class="info-box">
                <div class="info-row"><div class="info-label">Pedido</div><div class="info-value"><strong>#${id}</strong></div></div>
                <div class="info-row"><div class="info-label">Empresa</div><div class="info-value"><strong>${empresa}</strong></div></div>
                ${isB2B ? `<div class="info-row"><div class="info-label">Cliente</div><div class="info-value">${clienteNome}</div></div>` : ''}
                <div class="info-row"><div class="info-label">Data/Hora</div><div class="info-value">${new Date().toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}</div></div>
              </div>
              <div class="description-box">${descricao || 'Sem descrição'}</div>
            </div>
            <div class="footer">G8 Representações - E-mail automático</div>
          </div>
        </body>
        </html>
      `;

      const textContent = `✏️ PEDIDO ATUALIZADO\n\nPedido: #${id}\nEmpresa: ${empresa}\nData: ${new Date().toLocaleString('pt-BR')}\n\nDESCRIÇÃO:\n${descricao || 'Sem descrição'}\n\n--- Sistema G8`;

      const mailOptions = {
        from: `"Sistema G8" <${process.env.EMAIL_USER}>`,
        to: emailTo,
        subject: subject,
        text: textContent,
        html: htmlContent
      };

      const info = await this._sendWithRetry(mailOptions, 3);
      console.log('✅ E-mail de pedido atualizado enviado:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Erro ao enviar e-mail de pedido atualizado:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Testar configuração
  async testConnection() {
    if (!this.isConfigured()) {
      return { success: false, message: 'E-mail não configurado' };
    }

    try {
      await this.transporter.verify();
      console.log('✅ Conexão com servidor de e-mail verificada');
      return { success: true, message: 'Conexão verificada com sucesso' };
    } catch (error) {
      console.error('❌ Erro ao verificar conexão:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Exportar instância única (singleton)
const emailNotification = new EmailNotification();
module.exports = emailNotification;

