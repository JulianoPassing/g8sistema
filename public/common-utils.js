// ========== UTILITÁRIOS COMUNS G8SISTEMA ==========

class G8Utils {
  constructor() {
    this.init();
  }

  // Inicialização automática
  init() {
    this.setupGlobalErrorHandler();
    this.setupOfflineDetection();
    this.setupKeyboardShortcuts();
    this.setupAutoSave();
  }

  // Tratamento global de erros
  setupGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
      console.error('Erro global capturado:', event.error);
      
      if (window.notifications) {
        notifications.error('Ocorreu um erro inesperado. Tente recarregar a página.', {
          title: 'Erro do Sistema',
          duration: 10000
        });
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Promise rejeitada:', event.reason);
      
      if (window.notifications) {
        notifications.warning('Falha na comunicação com o servidor.', {
          title: 'Erro de Conexão',
          duration: 8000
        });
      }
    });
  }

  // Detecção de conexão offline/online
  setupOfflineDetection() {
    const updateOnlineStatus = () => {
      if (navigator.onLine) {
        if (window.notifications) {
          notifications.success('Conexão restabelecida!', {
            title: 'Online',
            duration: 3000
          });
        }
      } else {
        if (window.notifications) {
          notifications.warning('Você está offline. Algumas funcionalidades podem não funcionar.', {
            title: 'Sem Conexão',
            duration: 0,
            closable: true
          });
        }
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  // Atalhos de teclado úteis
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl+S para salvar (prevenir comportamento padrão)
      if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        
        // Tentar salvar formulário atual
        const forms = document.querySelectorAll('form');
        if (forms.length > 0) {
          const submitBtn = forms[0].querySelector('button[type="submit"], input[type="submit"]');
          if (submitBtn && !submitBtn.disabled) {
            submitBtn.click();
            
            if (window.notifications) {
              notifications.info('Salvando...', { duration: 2000 });
            }
          }
        }
      }

      // Esc para fechar modais/notificações
      if (event.key === 'Escape') {
        // Fechar notificações
        if (window.notifications) {
          notifications.clear();
        }
        
        // Fechar modais
        const modals = document.querySelectorAll('.modal, .overlay, [data-modal]');
        modals.forEach(modal => {
          if (modal.style.display !== 'none') {
            modal.style.display = 'none';
          }
        });
      }
    });
  }

  // Auto-save para formulários
  setupAutoSave() {
    const autoSaveInterval = 30000; // 30 segundos
    
    setInterval(() => {
      this.autoSaveForms();
    }, autoSaveInterval);
  }

  // Função de auto-save
  autoSaveForms() {
    const forms = document.querySelectorAll('form[data-autosave]');
    
    forms.forEach(form => {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      // Salvar no localStorage com timestamp
      const saveKey = `autosave_${form.id || 'form'}_${window.location.pathname}`;
      const saveData = {
        data,
        timestamp: Date.now(),
        url: window.location.href
      };
      
      try {
        localStorage.setItem(saveKey, JSON.stringify(saveData));
        console.log('Auto-save realizado para:', saveKey);
      } catch (error) {
        console.warn('Erro no auto-save:', error);
      }
    });
  }

  // Restaurar dados auto-salvos
  restoreAutoSave(formId) {
    const saveKey = `autosave_${formId}_${window.location.pathname}`;
    
    try {
      const savedData = localStorage.getItem(saveKey);
      if (savedData) {
        const { data, timestamp } = JSON.parse(savedData);
        
        // Verificar se os dados não são muito antigos (24 horas)
        const maxAge = 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp < maxAge) {
          return data;
        } else {
          localStorage.removeItem(saveKey);
        }
      }
    } catch (error) {
      console.warn('Erro ao restaurar auto-save:', error);
    }
    
    return null;
  }

  // Formatação de dados
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date));
  }

  formatDateTime(date) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return phone;
  }

  formatCNPJ(cnpj) {
    const cleaned = cnpj.replace(/\D/g, '');
    
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return cnpj;
  }

  formatCEP(cep) {
    const cleaned = cep.replace(/\D/g, '');
    
    if (cleaned.length === 8) {
      return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    
    return cep;
  }

  // Validações
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  validateCNPJ(cnpj) {
    const cleaned = cnpj.replace(/\D/g, '');
    return cleaned.length === 14;
  }

  validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  }

  // Utilitários de DOM
  createElement(tag, className = '', innerHTML = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (innerHTML) element.innerHTML = innerHTML;
    return element;
  }

  // Scroll suave para elemento
  scrollToElement(elementId, offset = 0) {
    const element = document.getElementById(elementId);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  // Copiar texto para clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      
      if (window.notifications) {
        notifications.success('Texto copiado para a área de transferência!', {
          duration: 2000
        });
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao copiar texto:', error);
      
      if (window.notifications) {
        notifications.error('Não foi possível copiar o texto.', {
          duration: 3000
        });
      }
      
      return false;
    }
  }

  // Debounce function
  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  }

  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Gerar ID único
  generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Sanitizar HTML
  sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
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
}

// Exportar para uso global
window.G8Utils = G8Utils;
window.g8utils = new G8Utils();
