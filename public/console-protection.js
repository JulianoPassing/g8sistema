// ========== PROTEÇÃO DO CONSOLE G8 SISTEMA ==========

class ConsoleProtection {
  constructor() {
    this.isConsoleOpen = false;
    this.devtoolsOpen = false;
    this.checkInterval = null;
    this.warningCount = 0;
    this.maxWarnings = 3;
    this.protectionPassword = 'jpsistemas'; // Senha para desenvolvedores
    this.isAuthenticated = false;
    this.init();
  }

  init() {
    this.detectDevTools();
    this.overrideConsoleMethods();
    this.preventKeyboardShortcuts();
    this.preventContextMenu();
    this.detectConsoleUsage();
    this.startMonitoring();
  }

  // Detectar abertura do DevTools
  detectDevTools() {
    let devtools = {
      open: false,
      orientation: null
    };

    const threshold = 160;

    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          this.onDevToolsOpen();
        }
      } else {
        if (devtools.open) {
          devtools.open = false;
          this.onDevToolsClose();
        }
      }
    }, 500);

    // Detectar usando console.profile (método alternativo)
    let devToolsChecker = () => {
      let before = new Date();
      debugger;
      let after = new Date();
      if (after - before > 100) {
        this.onDevToolsOpen();
      }
    };

    // Executar verificação periodicamente
    setInterval(devToolsChecker, 1000);
  }

  // Sobrescrever métodos do console
  overrideConsoleMethods() {
    const originalMethods = {};
    const consoleMethods = ['log', 'warn', 'error', 'info', 'debug', 'trace', 'dir', 'dirxml', 'table', 'group', 'groupCollapsed', 'groupEnd', 'clear', 'count', 'countReset', 'time', 'timeEnd', 'timeLog', 'profile', 'profileEnd', 'assert'];

    consoleMethods.forEach(method => {
      if (console[method]) {
        originalMethods[method] = console[method];
        console[method] = (...args) => {
          if (!this.isAuthenticated) {
            this.handleConsoleUsage();
            return;
          }
          originalMethods[method].apply(console, args);
        };
      }
    });

    // Salvar métodos originais para uso após autenticação
    this.originalConsole = originalMethods;
  }

  // Prevenir atalhos do teclado
  preventKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        this.handleConsoleAttempt();
        return false;
      }

      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        this.handleConsoleAttempt();
        return false;
      }

      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        this.handleConsoleAttempt();
        return false;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        this.handleConsoleAttempt();
        return false;
      }

      // Ctrl+Shift+C (Inspect Element)
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.handleConsoleAttempt();
        return false;
      }

      // Ctrl+S (Save Page)
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
      }
    });
  }

  // Prevenir menu de contexto (botão direito)
  preventContextMenu() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showWarningMessage('Acesso negado! Esta funcionalidade está protegida.');
      return false;
    });
  }

  // Detectar uso do console
  detectConsoleUsage() {
    // Detectar tentativas de acessar propriedades do console
    Object.defineProperty(window, 'console', {
      get: () => {
        if (!this.isAuthenticated) {
          this.handleConsoleUsage();
          return {};
        }
        return this.originalConsole;
      },
      set: () => {
        this.handleConsoleUsage();
      }
    });
  }

  // Iniciar monitoramento contínuo
  startMonitoring() {
    this.checkInterval = setInterval(() => {
      this.checkForDevTools();
    }, 1000);
  }

  // Verificar DevTools
  checkForDevTools() {
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;
    
    if ((widthThreshold || heightThreshold) && !this.devtoolsOpen) {
      this.devtoolsOpen = true;
      this.onDevToolsOpen();
    } else if (!widthThreshold && !heightThreshold && this.devtoolsOpen) {
      this.devtoolsOpen = false;
      this.onDevToolsClose();
    }
  }

  // Quando DevTools é aberto
  onDevToolsOpen() {
    if (!this.isAuthenticated) {
      this.handleConsoleAttempt();
    }
  }

  // Quando DevTools é fechado
  onDevToolsClose() {
    // DevTools fechado
  }

  // Lidar com tentativa de abrir console
  handleConsoleAttempt() {
    this.warningCount++;
    
    if (this.warningCount >= this.maxWarnings) {
      this.showPasswordPrompt();
    } else {
      this.showWarningMessage(`⚠️ Acesso Restrito! Tentativa ${this.warningCount}/${this.maxWarnings}`);
    }
  }

  // Lidar com uso do console
  handleConsoleUsage() {
    if (!this.isAuthenticated) {
      this.showPasswordPrompt();
    }
  }

  // Mostrar prompt de senha
  showPasswordPrompt() {
    const password = prompt(`
🔒 ÁREA RESTRITA - G8 SISTEMA

Esta é uma área protegida do sistema.
Acesso autorizado apenas para desenvolvedores.

Digite a senha de desenvolvedor:`);

    if (password === this.protectionPassword) {
      this.isAuthenticated = true;
      this.showSuccessMessage();
      this.restoreConsoleMethods();
    } else if (password !== null) {
      this.showErrorMessage();
      // Redirecionar após senha incorreta
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }

  // Restaurar métodos originais do console
  restoreConsoleMethods() {
    Object.keys(this.originalConsole).forEach(method => {
      console[method] = this.originalConsole[method];
    });
  }

  // Mostrar mensagem de aviso
  showWarningMessage(message) {
    this.showNotification(message, 'warning');
  }

  // Mostrar mensagem de erro
  showErrorMessage() {
    this.showNotification('❌ Senha incorreta! Redirecionando...', 'error');
  }

  // Mostrar mensagem de sucesso
  showSuccessMessage() {
    this.showNotification('✅ Acesso autorizado! Console liberado.', 'success');
  }

  // Sistema de notificação
  showNotification(message, type = 'info') {
    // Remover notificação existente
    const existingNotification = document.querySelector('.console-protection-notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'console-protection-notification';
    notification.textContent = message;

    // Estilos baseados no tipo
    const styles = {
      warning: { background: '#f59e0b', color: 'white' },
      error: { background: '#ef4444', color: 'white' },
      success: { background: '#10b981', color: 'white' },
      info: { background: '#3b82f6', color: 'white' }
    };

    const style = styles[type] || styles.info;

    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      backgroundColor: style.background,
      color: style.color,
      padding: '15px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      zIndex: '999999',
      maxWidth: '300px',
      wordWrap: 'break-word',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });

    document.body.appendChild(notification);

    // Remover após 4 segundos
    setTimeout(() => {
      if (notification && notification.parentNode) {
        notification.remove();
      }
    }, 4000);
  }

  // Método para desabilitar proteção (uso interno)
  disable() {
    this.isAuthenticated = true;
    this.restoreConsoleMethods();
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}

// Inicializar proteção apenas em produção
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  window.consoleProtection = new ConsoleProtection();
  
  // Proteção adicional: limpar variáveis globais sensíveis
  setTimeout(() => {
    // Limpar referências que possam ser usadas para bypass
    delete window.ConsoleProtection;
  }, 1000);
}

// Mensagem para desenvolvedores
console.log(`
%c🛡️ SISTEMA PROTEGIDO - G8 REPRESENTAÇÕES

%cEste sistema possui proteção ativa contra acesso não autorizado ao console.

%cPara desenvolvedores autorizados:
• Use a senha correta quando solicitado
• Mantenha as credenciais seguras
• Não compartilhe informações do sistema

%c© 2025 J.P Sistemas - Todos os direitos reservados
`, 
'color: #ff0000; font-size: 16px; font-weight: bold;',
'color: #666; font-size: 12px;',
'color: #333; font-size: 11px;',
'color: #999; font-size: 10px;'
);
