// ========== SISTEMA DE NOTIFICAÇÕES ELEGANTE ==========

class NotificationSystem {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.init();
  }

  // Inicializar sistema
  init() {
    // Criar container se não existir
    if (!document.querySelector('.notification-container')) {
      this.container = document.createElement('div');
      this.container.className = 'notification-container';
      this.container.innerHTML = `
        <style>
          .notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
          }

          .notification {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            margin-bottom: 10px;
            padding: 16px 20px;
            min-width: 300px;
            max-width: 400px;
            border-left: 4px solid #2563eb;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: auto;
            position: relative;
            overflow: hidden;
          }

          .notification.show {
            transform: translateX(0);
            opacity: 1;
          }

          .notification.success {
            border-left-color: #059669;
          }

          .notification.error {
            border-left-color: #dc2626;
          }

          .notification.warning {
            border-left-color: #d97706;
          }

          .notification.info {
            border-left-color: #2563eb;
          }

          .notification-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 4px;
          }

          .notification-icon {
            width: 20px;
            height: 20px;
            margin-right: 8px;
          }

          .notification-title {
            font-weight: 600;
            font-size: 14px;
            color: #1f2937;
            display: flex;
            align-items: center;
          }

          .notification-message {
            font-size: 13px;
            color: #6b7280;
            line-height: 1.4;
          }

          .notification-close {
            background: none;
            border: none;
            color: #9ca3af;
            cursor: pointer;
            font-size: 18px;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s;
          }

          .notification-close:hover {
            background: #f3f4f6;
            color: #6b7280;
          }

          .notification-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: linear-gradient(90deg, #2563eb, #3b82f6);
            transition: width linear;
          }

          .notification.success .notification-progress {
            background: linear-gradient(90deg, #059669, #10b981);
          }

          .notification.error .notification-progress {
            background: linear-gradient(90deg, #dc2626, #ef4444);
          }

          .notification.warning .notification-progress {
            background: linear-gradient(90deg, #d97706, #f59e0b);
          }

          @media (max-width: 480px) {
            .notification-container {
              top: 10px;
              right: 10px;
              left: 10px;
            }

            .notification {
              min-width: auto;
              max-width: none;
            }
          }
        </style>
      `;
      
      // Verificar se o DOM está pronto
      if (!document.body) {
        console.warn('DOM não está pronto, aguardando...');
        document.addEventListener('DOMContentLoaded', () => {
          document.body.appendChild(this.container);
        });
      } else {
        document.body.appendChild(this.container);
      }
    }
  }

  // Mostrar notificação
  show(message, type = 'info', options = {}) {
    const {
      title = this.getDefaultTitle(type),
      duration = 5000,
      showProgress = true,
      closable = true
    } = options;

    const id = Date.now() + Math.random();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.dataset.id = id;

    const icon = this.getIcon(type);
    
    notification.innerHTML = `
      <div class="notification-header">
        <div class="notification-title">
          ${icon}
          ${title}
        </div>
        ${closable ? '<button class="notification-close" type="button">&times;</button>' : ''}
      </div>
      <div class="notification-message">${message}</div>
      ${showProgress ? '<div class="notification-progress" style="width: 100%"></div>' : ''}
    `;

    // Adicionar ao container
    this.container.appendChild(notification);

    // Configurar botão de fechar
    if (closable) {
      const closeBtn = notification.querySelector('.notification-close');
      closeBtn.addEventListener('click', () => this.hide(id));
    }

    // Mostrar com animação
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // Configurar progresso e auto-hide
    if (duration > 0) {
      const progressBar = notification.querySelector('.notification-progress');
      if (progressBar && showProgress) {
        progressBar.style.transition = `width ${duration}ms linear`;
        requestAnimationFrame(() => {
          progressBar.style.width = '0%';
        });
      }

      setTimeout(() => {
        this.hide(id);
      }, duration);
    }

    // Armazenar referência
    this.notifications.set(id, notification);

    return id;
  }

  // Esconder notificação
  hide(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 300);
  }

  // Limpar todas as notificações
  clear() {
    this.notifications.forEach((_, id) => this.hide(id));
  }

  // Obter ícone por tipo
  getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return `<span class="notification-icon">${icons[type] || icons.info}</span>`;
  }

  // Obter título padrão por tipo
  getDefaultTitle(type) {
    const titles = {
      success: 'Sucesso',
      error: 'Erro',
      warning: 'Atenção',
      info: 'Informação'
    };
    return titles[type] || titles.info;
  }

  // Métodos de conveniência
  success(message, options = {}) {
    return this.show(message, 'success', options);
  }

  error(message, options = {}) {
    return this.show(message, 'error', { duration: 8000, ...options });
  }

  warning(message, options = {}) {
    return this.show(message, 'warning', options);
  }

  info(message, options = {}) {
    return this.show(message, 'info', options);
  }

  // Notificação de loading
  loading(message, options = {}) {
    return this.show(message, 'info', { 
      duration: 0, 
      showProgress: false, 
      closable: false,
      title: 'Carregando...',
      ...options 
    });
  }
}

// Sistema de feedback melhorado para formulários
class FormFeedback {
  constructor() {
    this.setupStyles();
  }

  setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .form-field-error {
        border-color: #dc2626 !important;
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1) !important;
      }

      .form-field-success {
        border-color: #059669 !important;
        box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1) !important;
      }

      .field-message {
        font-size: 12px;
        margin-top: 4px;
        padding: 4px 8px;
        border-radius: 4px;
        display: none;
      }

      .field-message.error {
        color: #dc2626;
        background: rgba(220, 38, 38, 0.1);
        display: block;
      }

      .field-message.success {
        color: #059669;
        background: rgba(5, 150, 105, 0.1);
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  // Mostrar erro em campo específico
  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove('form-field-success');
    field.classList.add('form-field-error');

    this.showFieldMessage(fieldId, message, 'error');
  }

  // Mostrar sucesso em campo específico
  showFieldSuccess(fieldId, message = '') {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove('form-field-error');
    field.classList.add('form-field-success');

    if (message) {
      this.showFieldMessage(fieldId, message, 'success');
    }
  }

  // Limpar estado do campo
  clearField(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove('form-field-error', 'form-field-success');
    this.hideFieldMessage(fieldId);
  }

  // Mostrar mensagem do campo
  showFieldMessage(fieldId, message, type) {
    let messageEl = document.querySelector(`[data-field="${fieldId}"]`);
    
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.className = 'field-message';
      messageEl.dataset.field = fieldId;
      
      const field = document.getElementById(fieldId);
      if (field.parentNode) {
        field.parentNode.insertBefore(messageEl, field.nextSibling);
      }
    }

    messageEl.textContent = message;
    messageEl.className = `field-message ${type}`;
  }

  // Esconder mensagem do campo
  hideFieldMessage(fieldId) {
    const messageEl = document.querySelector(`[data-field="${fieldId}"]`);
    if (messageEl) {
      messageEl.style.display = 'none';
    }
  }
}

// Exportar para uso global
window.NotificationSystem = NotificationSystem;
window.FormFeedback = FormFeedback;

// Instanciar sistemas globais
window.notifications = new NotificationSystem();
window.formFeedback = new FormFeedback();
