/**
 * Sistema Avançado de Notificações G8
 * Notificações modernas com design profissional
 */

class AdvancedNotificationSystem {
  constructor() {
    this.notifications = new Map();
    this.container = null;
    this.maxNotifications = 5;
    this.defaultDuration = 5000;
    this.init();
  }

  init() {
    this.createContainer();
    this.addStyles();
    this.setupKeyboardShortcuts();
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.id = 'g8-notifications';
    this.container.className = 'g8-notifications-container';
    document.body.appendChild(this.container);
  }

  addStyles() {
    const styles = `
      .g8-notifications-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
        pointer-events: none;
      }

      .g8-notification {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transform: translateX(400px);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
        position: relative;
        overflow: hidden;
        min-height: 60px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .g8-notification::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: var(--notification-color, #ff0000);
        border-radius: 2px 0 0 2px;
      }

      .g8-notification.show {
        transform: translateX(0);
        opacity: 1;
      }

      .g8-notification.hide {
        transform: translateX(400px);
        opacity: 0;
      }

      .g8-notification-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        font-weight: bold;
        flex-shrink: 0;
        background: var(--notification-color, #ff0000);
      }

      .g8-notification-content {
        flex: 1;
        min-width: 0;
      }

      .g8-notification-title {
        font-weight: 600;
        font-size: 14px;
        color: #000000;
        margin-bottom: 4px;
        line-height: 1.3;
      }

      .g8-notification-message {
        font-size: 13px;
        color: #333333;
        line-height: 1.4;
        word-wrap: break-word;
      }

      .g8-notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        border: none;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: #666;
        transition: all 0.2s ease;
        opacity: 0.7;
      }

      .g8-notification-close:hover {
        background: rgba(0, 0, 0, 0.2);
        opacity: 1;
        transform: scale(1.1);
      }

      .g8-notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        background: var(--notification-color, #ff0000);
        border-radius: 0 0 12px 12px;
        transition: width linear;
      }

      /* Tipos de notificação */
      .g8-notification.success {
        --notification-color: #10b981;
      }

      .g8-notification.error {
        --notification-color: #ef4444;
      }

      .g8-notification.warning {
        --notification-color: #f59e0b;
      }

      .g8-notification.info {
        --notification-color: #3b82f6;
      }

      .g8-notification.g8-primary {
        --notification-color: #ff0000;
      }

      .g8-notification.g8-secondary {
        --notification-color: #000000;
      }

      /* Animações especiais */
      .g8-notification.bounce {
        animation: g8-bounce 0.6s ease-out;
      }

      .g8-notification.slide-down {
        transform: translateY(-100px);
        opacity: 0;
      }

      .g8-notification.slide-down.show {
        transform: translateY(0);
        opacity: 1;
      }

      .g8-notification.scale {
        transform: scale(0.8);
        opacity: 0;
      }

      .g8-notification.scale.show {
        transform: scale(1);
        opacity: 1;
      }

      @keyframes g8-bounce {
        0% { transform: translateX(400px) scale(0.8); }
        50% { transform: translateX(-20px) scale(1.05); }
        70% { transform: translateX(10px) scale(0.98); }
        100% { transform: translateX(0) scale(1); }
      }

      /* Responsividade */
      @media (max-width: 480px) {
        .g8-notifications-container {
          left: 10px;
          right: 10px;
          top: 10px;
          max-width: none;
        }

        .g8-notification {
          transform: translateY(-100px);
        }

        .g8-notification.show {
          transform: translateY(0);
        }

        .g8-notification.hide {
          transform: translateY(-100px);
        }
      }

      /* Tema escuro */
      @media (prefers-color-scheme: dark) {
        .g8-notification {
          background: rgba(30, 30, 30, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .g8-notification-title {
          color: #ffffff;
        }

        .g8-notification-message {
          color: #cccccc;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Esc para fechar todas as notificações
      if (e.key === 'Escape') {
        this.clearAll();
      }
    });
  }

  show(message, options = {}) {
    const config = {
      type: 'info',
      title: '',
      duration: this.defaultDuration,
      closable: true,
      animation: 'slide',
      sound: false,
      actions: [],
      ...options
    };

    // Limitar número de notificações
    if (this.notifications.size >= this.maxNotifications) {
      const firstKey = this.notifications.keys().next().value;
      this.hide(firstKey);
    }

    const id = this.generateId();
    const notification = this.createNotification(id, message, config);
    
    this.notifications.set(id, {
      element: notification,
      config,
      timeout: null
    });

    this.container.appendChild(notification);

    // Animar entrada
    requestAnimationFrame(() => {
      notification.classList.add('show');
      if (config.animation === 'bounce') {
        notification.classList.add('bounce');
      }
    });

    // Configurar auto-hide
    if (config.duration > 0) {
      this.setAutoHide(id, config.duration);
    }

    // Som de notificação
    if (config.sound) {
      this.playNotificationSound(config.type);
    }

    return id;
  }

  createNotification(id, message, config) {
    const notification = document.createElement('div');
    notification.className = `g8-notification ${config.type} ${config.animation}`;
    notification.dataset.id = id;

    const icon = this.getIcon(config.type);
    const closeButton = config.closable ? 
      '<button class="g8-notification-close" onclick="advancedNotifications.hide(\'' + id + '\')">×</button>' : '';

    const progressBar = config.duration > 0 ? 
      '<div class="g8-notification-progress" style="width: 100%;"></div>' : '';

    notification.innerHTML = `
      <div class="g8-notification-icon">${icon}</div>
      <div class="g8-notification-content">
        ${config.title ? `<div class="g8-notification-title">${config.title}</div>` : ''}
        <div class="g8-notification-message">${message}</div>
      </div>
      ${closeButton}
      ${progressBar}
    `;

    // Adicionar event listeners
    notification.addEventListener('mouseenter', () => {
      this.pauseAutoHide(id);
    });

    notification.addEventListener('mouseleave', () => {
      this.resumeAutoHide(id);
    });

    // Clique na notificação
    notification.addEventListener('click', (e) => {
      if (!e.target.classList.contains('g8-notification-close')) {
        if (config.onClick) {
          config.onClick(id);
        }
      }
    });

    return notification;
  }

  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'i',
      'g8-primary': 'G',
      'g8-secondary': '8'
    };
    return icons[type] || 'i';
  }

  setAutoHide(id, duration) {
    const notificationData = this.notifications.get(id);
    if (!notificationData) return;

    const progressBar = notificationData.element.querySelector('.g8-notification-progress');
    
    if (progressBar) {
      progressBar.style.transition = `width ${duration}ms linear`;
      progressBar.style.width = '0%';
    }

    notificationData.timeout = setTimeout(() => {
      this.hide(id);
    }, duration);
  }

  pauseAutoHide(id) {
    const notificationData = this.notifications.get(id);
    if (notificationData?.timeout) {
      clearTimeout(notificationData.timeout);
      notificationData.timeout = null;

      const progressBar = notificationData.element.querySelector('.g8-notification-progress');
      if (progressBar) {
        progressBar.style.transition = 'none';
      }
    }
  }

  resumeAutoHide(id) {
    const notificationData = this.notifications.get(id);
    if (!notificationData || notificationData.timeout) return;

    const progressBar = notificationData.element.querySelector('.g8-notification-progress');
    if (progressBar) {
      const currentWidth = parseFloat(progressBar.style.width) || 0;
      const remainingTime = (currentWidth / 100) * notificationData.config.duration;
      
      if (remainingTime > 0) {
        progressBar.style.transition = `width ${remainingTime}ms linear`;
        progressBar.style.width = '0%';
        
        notificationData.timeout = setTimeout(() => {
          this.hide(id);
        }, remainingTime);
      }
    }
  }

  hide(id) {
    const notificationData = this.notifications.get(id);
    if (!notificationData) return;

    const { element, timeout } = notificationData;

    if (timeout) {
      clearTimeout(timeout);
    }

    element.classList.add('hide');
    element.classList.remove('show');

    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.notifications.delete(id);
    }, 400);
  }

  clearAll() {
    this.notifications.forEach((_, id) => {
      this.hide(id);
    });
  }

  // Métodos de conveniência
  success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  error(message, options = {}) {
    return this.show(message, { ...options, type: 'error' });
  }

  warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }

  info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }

  g8Primary(message, options = {}) {
    return this.show(message, { ...options, type: 'g8-primary' });
  }

  g8Secondary(message, options = {}) {
    return this.show(message, { ...options, type: 'g8-secondary' });
  }

  // Som de notificação (opcional)
  playNotificationSound(type) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Frequências diferentes para tipos diferentes
      const frequencies = {
        success: 800,
        error: 400,
        warning: 600,
        info: 500,
        'g8-primary': 700,
        'g8-secondary': 550
      };

      oscillator.frequency.setValueAtTime(frequencies[type] || 500, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Som de notificação não disponível:', error);
    }
  }

  generateId() {
    return 'g8-notification-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  // Configurações globais
  setMaxNotifications(max) {
    this.maxNotifications = max;
  }

  setDefaultDuration(duration) {
    this.defaultDuration = duration;
  }

  // Status
  getActiveCount() {
    return this.notifications.size;
  }

  hasActiveNotifications() {
    return this.notifications.size > 0;
  }
}

// Instância global
window.advancedNotifications = new AdvancedNotificationSystem();

// Compatibilidade com sistema anterior
if (!window.notifications) {
  window.notifications = window.advancedNotifications;
}

// Exemplos de uso para demonstração
window.showG8Examples = () => {
  const examples = [
    { method: 'g8Primary', message: 'Sistema G8 inicializado com sucesso!', title: 'Bem-vindo' },
    { method: 'success', message: 'Dados salvos com sucesso', title: 'Operação Concluída' },
    { method: 'warning', message: 'Alguns campos precisam ser revisados', title: 'Atenção' },
    { method: 'error', message: 'Erro ao conectar com o servidor', title: 'Erro de Conexão' },
    { method: 'info', message: 'Nova atualização disponível', title: 'Informação' }
  ];

  examples.forEach((example, index) => {
    setTimeout(() => {
      advancedNotifications[example.method](example.message, {
        title: example.title,
        duration: 8000,
        animation: index % 2 === 0 ? 'slide' : 'bounce'
      });
    }, index * 1000);
  });
};
