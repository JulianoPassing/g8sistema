// ========== SISTEMA DE FEEDBACK VISUAL AVANÇADO ========== 

class VisualFeedback {
  constructor() {
    this.activeEffects = new Map();
    this.init();
  }

  // Inicializar sistema
  init() {
    this.setupStyles();
    this.setupGlobalEffects();
  }

  // Configurar estilos CSS
  setupStyles() {
    const style = document.createElement('style');
    style.id = 'visual-feedback-styles';
    style.textContent = `
      /* === EFEITOS DE HOVER AVANÇADOS === */
      .hover-lift {
        transition: all var(--transition-smooth);
      }
      
      .hover-lift:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-xl);
      }

      .hover-glow {
        transition: all var(--transition-smooth);
        position: relative;
      }

      .hover-glow::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: inherit;
        padding: 2px;
        background: var(--gradient-primary);
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask-composite: exclude;
        opacity: 0;
        transition: opacity var(--transition-smooth);
      }

      .hover-glow:hover::before {
        opacity: 1;
      }

      .hover-scale {
        transition: transform var(--transition-smooth);
      }

      .hover-scale:hover {
        transform: scale(1.05);
      }

      .hover-rotate {
        transition: transform var(--transition-smooth);
      }

      .hover-rotate:hover {
        transform: rotate(5deg);
      }

      /* === EFEITOS DE CLIQUE === */
      .click-wave {
        position: relative;
        overflow: hidden;
      }

      .wave-effect {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: wave-animation 0.6s linear;
        pointer-events: none;
      }

      @keyframes wave-animation {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }

      /* === ESTADOS DE LOADING === */
      .loading-shimmer {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }

      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      .loading-dots {
        display: inline-flex;
        gap: 4px;
      }

      .loading-dots span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
        animation: loading-dots 1.4s ease-in-out infinite both;
      }

      .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
      .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
      .loading-dots span:nth-child(3) { animation-delay: 0; }

      @keyframes loading-dots {
        0%, 80%, 100% {
          transform: scale(0.8);
          opacity: 0.5;
        }
        40% {
          transform: scale(1);
          opacity: 1;
        }
      }

      /* === INDICADORES DE STATUS === */
      .status-indicator {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        position: relative;
      }

      .status-dot::before {
        content: '';
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: inherit;
        animation: pulse-ring 2s ease-out infinite;
      }

      .status-dot.online {
        background: var(--color-success-500);
      }

      .status-dot.offline {
        background: var(--color-error-500);
      }

      .status-dot.busy {
        background: var(--color-warning-500);
      }

      @keyframes pulse-ring {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(2);
          opacity: 0;
        }
      }

      /* === TOOLTIPS AVANÇADOS === */
      .tooltip-advanced {
        position: relative;
        cursor: help;
      }

      .tooltip-content {
        position: absolute;
        bottom: 125%;
        left: 50%;
        transform: translateX(-50%);
        background: var(--color-secondary-800);
        color: white;
        padding: 8px 12px;
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: all var(--transition-smooth);
        z-index: 1000;
        box-shadow: var(--shadow-lg);
      }

      .tooltip-content::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: var(--color-secondary-800) transparent transparent transparent;
      }

      .tooltip-advanced:hover .tooltip-content {
        opacity: 1;
        visibility: visible;
        transform: translateX(-50%) translateY(-5px);
      }

      /* === BADGES E NOTIFICAÇÕES === */
      .notification-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: var(--color-error-500);
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        animation: bounce-in 0.5s ease-out;
      }

      @keyframes bounce-in {
        0% {
          transform: scale(0);
        }
        50% {
          transform: scale(1.2);
        }
        100% {
          transform: scale(1);
        }
      }

      /* === PROGRESS INDICATORS === */
      .circular-progress {
        position: relative;
        width: 40px;
        height: 40px;
      }

      .circular-progress svg {
        width: 100%;
        height: 100%;
        transform: rotate(-90deg);
      }

      .circular-progress circle {
        fill: none;
        stroke-width: 3;
        stroke-linecap: round;
      }

      .circular-progress .bg-circle {
        stroke: var(--color-secondary-200);
      }

      .circular-progress .progress-circle {
        stroke: var(--color-primary-500);
        stroke-dasharray: 126;
        stroke-dashoffset: 126;
        transition: stroke-dashoffset 0.5s ease;
      }

      /* === SKELETON LOADING AVANÇADO === */
      .skeleton-advanced {
        position: relative;
        overflow: hidden;
        background: var(--color-secondary-200);
        border-radius: var(--radius-md);
      }

      .skeleton-advanced::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        transform: translateX(-100%);
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.6),
          transparent
        );
        animation: skeleton-loading 2s infinite;
      }

      @keyframes skeleton-loading {
        100% {
          transform: translateX(100%);
        }
      }

      /* === MICRO INTERAÇÕES === */
      .micro-bounce {
        animation: micro-bounce 0.3s ease-out;
      }

      @keyframes micro-bounce {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }

      .micro-shake {
        animation: micro-shake 0.5s ease-in-out;
      }

      @keyframes micro-shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
        20%, 40%, 60%, 80% { transform: translateX(2px); }
      }

      .micro-flash {
        animation: micro-flash 0.5s ease-out;
      }

      @keyframes micro-flash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      /* === FOCUS STATES AVANÇADOS === */
      .focus-ring {
        transition: all var(--transition-smooth);
      }

      .focus-ring:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
      }

      .focus-glow:focus {
        outline: none;
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
      }

      /* === RESPONSIVE === */
      @media (max-width: 768px) {
        .hover-lift:hover {
          transform: translateY(-2px);
        }
        
        .hover-scale:hover {
          transform: scale(1.02);
        }
        
        .tooltip-content {
          font-size: 12px;
          padding: 6px 10px;
        }
      }

      /* === REDUCED MOTION === */
      @media (prefers-reduced-motion: reduce) {
        .hover-lift:hover,
        .hover-scale:hover,
        .hover-rotate:hover {
          transform: none;
        }
        
        .wave-effect,
        .loading-dots span,
        .status-dot::before,
        .skeleton-advanced::after {
          animation: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Configurar efeitos globais
  setupGlobalEffects() {
    // Adicionar efeito de onda aos botões
    document.addEventListener('click', (e) => {
      if (e.target.closest('.click-wave, .btn-modern, button')) {
        this.createWaveEffect(e);
      }
    });

    // Adicionar classes de hover automaticamente
    this.autoEnhanceElements();
  }

  // Criar efeito de onda
  createWaveEffect(event) {
    const button = event.target.closest('.click-wave, .btn-modern, button');
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const wave = document.createElement('span');
    wave.className = 'wave-effect';
    wave.style.width = wave.style.height = size + 'px';
    wave.style.left = x + 'px';
    wave.style.top = y + 'px';

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(wave);

    setTimeout(() => wave.remove(), 600);
  }

  // Melhorar elementos automaticamente
  autoEnhanceElements() {
    // Adicionar hover lift aos cards
    document.querySelectorAll('.card, .option-card, .info-card').forEach(card => {
      if (!card.classList.contains('hover-lift')) {
        card.classList.add('hover-lift');
      }
    });

    // Adicionar glow aos botões primários
    document.querySelectorAll('.btn-modern, .login-btn').forEach(btn => {
      if (!btn.classList.contains('hover-glow')) {
        btn.classList.add('hover-glow');
      }
    });

    // Adicionar focus ring aos inputs
    document.querySelectorAll('input, textarea, select').forEach(input => {
      if (!input.classList.contains('focus-ring')) {
        input.classList.add('focus-ring');
      }
    });
  }

  // Mostrar feedback de sucesso
  showSuccess(element, message = 'Sucesso!') {
    this.showFeedback(element, message, 'success');
  }

  // Mostrar feedback de erro
  showError(element, message = 'Erro!') {
    this.showFeedback(element, message, 'error');
    element.classList.add('micro-shake');
    setTimeout(() => element.classList.remove('micro-shake'), 500);
  }

  // Mostrar feedback genérico
  showFeedback(element, message, type = 'info') {
    const feedback = document.createElement('div');
    feedback.className = `feedback-popup feedback-${type}`;
    feedback.textContent = message;
    
    const style = `
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-${type === 'success' ? 'success' : type === 'error' ? 'error' : 'primary'}-500);
      color: white;
      padding: 8px 12px;
      border-radius: var(--radius-md);
      font-size: 12px;
      z-index: 1000;
      animation: feedback-popup 2s ease-out forwards;
      pointer-events: none;
    `;
    
    feedback.style.cssText = style;
    
    // Adicionar keyframes se não existir
    if (!document.querySelector('#feedback-keyframes')) {
      const keyframes = document.createElement('style');
      keyframes.id = 'feedback-keyframes';
      keyframes.textContent = `
        @keyframes feedback-popup {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          20% { opacity: 1; transform: translateX(-50%) translateY(0); }
          80% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `;
      document.head.appendChild(keyframes);
    }

    element.style.position = 'relative';
    element.appendChild(feedback);
    
    setTimeout(() => feedback.remove(), 2000);
  }

  // Animar contador
  animateCounter(element, start = 0, end = 100, duration = 2000, suffix = '') {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        current = end;
        clearInterval(timer);
      }
      
      element.textContent = Math.floor(current) + suffix;
    }, 16);
  }

  // Criar progress circular
  createCircularProgress(container, percentage = 0) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('circular-progress');
    
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bgCircle.classList.add('bg-circle');
    bgCircle.setAttribute('cx', '20');
    bgCircle.setAttribute('cy', '20');
    bgCircle.setAttribute('r', '20');
    
    const progressCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    progressCircle.classList.add('progress-circle');
    progressCircle.setAttribute('cx', '20');
    progressCircle.setAttribute('cy', '20');
    progressCircle.setAttribute('r', '20');
    
    svg.appendChild(bgCircle);
    svg.appendChild(progressCircle);
    container.appendChild(svg);
    
    // Animar para a porcentagem
    setTimeout(() => {
      const offset = 126 - (126 * percentage) / 100;
      progressCircle.style.strokeDashoffset = offset;
    }, 100);
    
    return {
      setProgress: (newPercentage) => {
        const offset = 126 - (126 * newPercentage) / 100;
        progressCircle.style.strokeDashoffset = offset;
      }
    };
  }

  // Adicionar badge de notificação
  addNotificationBadge(element, count = 1) {
    // Remover badge existente
    const existing = element.querySelector('.notification-badge');
    if (existing) existing.remove();
    
    const badge = document.createElement('span');
    badge.className = 'notification-badge';
    badge.textContent = count > 99 ? '99+' : count;
    
    element.style.position = 'relative';
    element.appendChild(badge);
    
    return badge;
  }

  // Remover badge de notificação
  removeNotificationBadge(element) {
    const badge = element.querySelector('.notification-badge');
    if (badge) {
      badge.style.animation = 'bounce-out 0.3s ease-in forwards';
      setTimeout(() => badge.remove(), 300);
    }
  }

  // Criar skeleton loading
  createSkeleton(container, config = {}) {
    const { lines = 3, height = '16px', gap = '8px' } = config;
    
    container.innerHTML = '';
    
    for (let i = 0; i < lines; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton-advanced';
      skeleton.style.height = height;
      skeleton.style.marginBottom = i < lines - 1 ? gap : '0';
      
      // Variar largura da última linha
      if (i === lines - 1) {
        skeleton.style.width = '60%';
      }
      
      container.appendChild(skeleton);
    }
  }

  // Limpar efeitos
  clearEffects() {
    this.activeEffects.clear();
    document.querySelectorAll('.wave-effect, .feedback-popup').forEach(el => el.remove());
  }
}

// Exportar para uso global
window.VisualFeedback = VisualFeedback;
window.visualFeedback = new VisualFeedback();
