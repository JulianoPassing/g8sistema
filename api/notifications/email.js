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
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .info-box {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
              border-left: 4px solid #667eea;
            }
            .info-row {
              display: flex;
              margin-bottom: 10px;
            }
            .info-label {
              font-weight: bold;
              color: #667eea;
              min-width: 120px;
            }
            .info-value {
              color: #333;
            }
            .description-box {
              background: white;
              padding: 20px;
              border-radius: 8px;
              margin-top: 20px;
              white-space: pre-wrap;
              font-family: monospace;
              font-size: 12px;
              max-height: 400px;
              overflow-y: auto;
              border: 1px solid #e5e7eb;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #6b7280;
              font-size: 12px;
            }
            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              background: #667eea;
              color: white;
              font-size: 12px;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🛒 Novo Pedido Recebido!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Sistema G8</p>
          </div>
          
          <div class="content">
            <div class="info-box">
              <div class="info-row">
                <div class="info-label">Pedido:</div>
                <div class="info-value"><strong>#${id}</strong></div>
              </div>
              
              <div class="info-row">
                <div class="info-label">Empresa:</div>
                <div class="info-value"><strong>${empresa}</strong></div>
              </div>
              
              ${isB2B ? `
              <div class="info-row">
                <div class="info-label">Tipo:</div>
                <div class="info-value"><span class="badge">B2B</span></div>
              </div>
              
              <div class="info-row">
                <div class="info-label">Cliente:</div>
                <div class="info-value">${clienteNome}</div>
              </div>
              
              <div class="info-row">
                <div class="info-label">Observações:</div>
                <div class="info-value">${observacoes}</div>
              </div>
              ` : ''}
              
              <div class="info-row">
                <div class="info-label">Data/Hora:</div>
                <div class="info-value">${new Date().toLocaleString('pt-BR')}</div>
              </div>
            </div>
            
            <h3 style="color: #667eea; margin-top: 20px;">Descrição do Pedido:</h3>
            <div class="description-box">${descricao || 'Sem descrição'}</div>
          </div>
          
          <div class="footer">
            <p>Este é um e-mail automático do Sistema G8</p>
            <p>Não responda este e-mail</p>
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

      // Enviar e-mail
      const info = await this.transporter.sendMail(mailOptions);
      
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

