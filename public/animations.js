// ========== SISTEMA DE ANIMAÇÕES MODERNAS ========== 

class AnimationSystem {
  constructor() {
    this.observers = new Map();
    this.init();
  }

  // Inicializar sistema
  init() {
    this.setupScrollAnimations();
    this.setupHoverAnimations();
    this.setupLoadingAnimations();
    this.setupMicroInteractions();
  }

  // Animações ao scroll
  setupScrollAnimations() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            
            // Animar com delay para elementos em sequência
            const delay = entry.target.dataset.animationDelay || 0;
            if (delay > 0) {
              entry.target.style.animationDelay = `${delay}ms`;
            }
            
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      });

      // Observar elementos com classe de animação
      document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
      });

      this.observers.set('scroll', observer);
    }
  }

  // Animações de hover aprimoradas
  setupHoverAnimations() {
    // Cards com efeito parallax
    document.querySelectorAll('.card-modern, .glass-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
      });
    });

    // Botões com efeito ripple
    document.querySelectorAll('.btn-modern, button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.createRippleEffect(e, button);
      });
    });
  }

  // Efeito ripple nos botões
  createRippleEffect(event, element) {
    const circle = document.createElement('span');
    const diameter = Math.max(element.clientWidth, element.clientHeight);
    const radius = diameter / 2;

    const rect = element.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');

    // CSS para o ripple
    if (!document.querySelector('#ripple-styles')) {
      const style = document.createElement('style');
      style.id = 'ripple-styles';
      style.textContent = `
        .ripple {
          position: absolute;
          border-radius: 50%;
          transform: scale(0);
          animation: ripple-animation 600ms linear;
          background-color: rgba(255, 255, 255, 0.6);
          pointer-events: none;
        }
        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const ripple = element.querySelector('.ripple');
    if (ripple) {
      ripple.remove();
    }

    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(circle);

    setTimeout(() => {
      circle.remove();
    }, 600);
  }

  // Animações de loading elegantes
  setupLoadingAnimations() {
    // Skeleton loading melhorado
    const style = document.createElement('style');
    style.textContent = `
      .skeleton-modern {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s infinite;
        border-radius: 8px;
      }
      
      @keyframes skeleton-loading {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      .pulse-modern {
        animation: pulse-modern 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      @keyframes pulse-modern {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .bounce-modern {
        animation: bounce-modern 1s infinite;
      }

      @keyframes bounce-modern {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0, 0, 0);
        }
        40%, 43% {
          transform: translate3d(0, -20px, 0);
        }
        70% {
          transform: translate3d(0, -10px, 0);
        }
        90% {
          transform: translate3d(0, -4px, 0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Micro-interações
  setupMicroInteractions() {
    // Inputs com animação de foco
    document.querySelectorAll('input, textarea, select').forEach(input => {
      input.addEventListener('focus', () => {
        input.parentElement?.classList.add('focused');
      });

      input.addEventListener('blur', () => {
        input.parentElement?.classList.remove('focused');
      });
    });

    // Links com animação de underline
    const linkStyle = document.createElement('style');
    linkStyle.textContent = `
      .link-animated {
        position: relative;
        text-decoration: none;
        transition: color 0.3s ease;
      }

      .link-animated::before {
        content: '';
        position: absolute;
        width: 0;
        height: 2px;
        bottom: -2px;
        left: 0;
        background: linear-gradient(90deg, #667eea, #764ba2);
        transition: width 0.3s ease;
      }

      .link-animated:hover::before {
        width: 100%;
      }

      .link-animated:hover {
        color: #667eea;
      }
    `;
    document.head.appendChild(linkStyle);

    // Aplicar classe aos links
    document.querySelectorAll('a:not([class])').forEach(link => {
      if (!link.closest('.btn, button')) {
        link.classList.add('link-animated');
      }
    });
  }

  // Animar entrada de elementos
  animateIn(element, animationType = 'fadeInUp', delay = 0) {
    element.style.animationDelay = `${delay}ms`;
    element.classList.add('animate-on-scroll', `animate-${animationType}`);
    
    // Forçar animação se já estiver visível
    if (this.isElementVisible(element)) {
      element.classList.add('visible');
    }
  }

  // Verificar se elemento está visível
  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  // Animar contadores
  animateCounter(element, start = 0, end = 100, duration = 2000) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        current = end;
        clearInterval(timer);
      }
      
      element.textContent = Math.floor(current);
    }, 16);
  }

  // Animar progresso
  animateProgress(element, targetWidth, duration = 1000) {
    element.style.width = '0%';
    element.style.transition = `width ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    
    requestAnimationFrame(() => {
      element.style.width = `${targetWidth}%`;
    });
  }

  // Shake animation para erros
  shakeElement(element) {
    element.style.animation = 'shake 0.5s ease-in-out';
    
    const shakeKeyframes = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }
    `;
    
    if (!document.querySelector('#shake-keyframes')) {
      const style = document.createElement('style');
      style.id = 'shake-keyframes';
      style.textContent = shakeKeyframes;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      element.style.animation = '';
    }, 500);
  }

  // Typewriter effect
  typewriterEffect(element, text, speed = 50) {
    element.textContent = '';
    let i = 0;
    
    const timer = setInterval(() => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
  }

  // Destruir observers
  destroy() {
    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers.clear();
  }
}

// Utilitários de animação
class AnimationUtils {
  // Ease functions
  static easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  static easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  static easeIn(t) {
    return t * t * t;
  }

  // Smooth scroll para elemento
  static smoothScrollTo(element, duration = 1000) {
    const targetPosition = element.offsetTop - 100;
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;

    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      
      window.scrollTo(0, startPosition + distance * AnimationUtils.easeInOut(progress));
      
      if (progress < 1) {
        requestAnimationFrame(animation);
      }
    }

    requestAnimationFrame(animation);
  }

  // Parallax simples
  static setupParallax() {
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    
    function updateParallax() {
      const scrollTop = window.pageYOffset;
      
      parallaxElements.forEach(element => {
        const speed = parseFloat(element.dataset.parallax) || 0.5;
        const yPos = -(scrollTop * speed);
        element.style.transform = `translateY(${yPos}px)`;
      });
    }

    window.addEventListener('scroll', updateParallax);
    updateParallax();
  }
}

// Exportar para uso global
window.AnimationSystem = AnimationSystem;
window.AnimationUtils = AnimationUtils;

// Instanciar sistema global
window.animations = new AnimationSystem();

// Configurar parallax quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  AnimationUtils.setupParallax();
});
