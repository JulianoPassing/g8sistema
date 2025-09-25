// Sistema de monitoramento de conexão G8
// Versão reutilizável para todas as páginas

class ConnectionMonitor {
  constructor() {
    this.statusElement = null;
    this.isOnline = navigator.onLine;
    this.init();
  }

  init() {
    // Aguardar DOM carregar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.statusElement = document.getElementById('connection-status');
    if (!this.statusElement) return;

    // Verificar se o offline-system já está controlando este elemento
    if (window.offlineSystem && window.offlineSystem.statusIndicator === this.statusElement) {
      // Deixar o offline-system controlar
      return;
    }

    // Listeners para eventos de conexão
    window.addEventListener('online', () => this.updateStatus(true));
    window.addEventListener('offline', () => this.updateStatus(false));

    // Monitoramento periódico mais sofisticado
    this.startPeriodicCheck();

    // Status inicial
    this.updateStatus(this.isOnline);
  }

  updateStatus(online) {
    if (!this.statusElement) return;

    this.isOnline = online;
    const statusText = this.statusElement.querySelector('span');
    
    if (online) {
      this.statusElement.className = 'status-indicator';
      statusText.textContent = 'Online';
    } else {
      this.statusElement.className = 'status-indicator offline';
      statusText.textContent = 'Offline';
    }
  }

  async checkConnection() {
    try {
      // Tentar fazer uma requisição rápida
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      // Fallback: tentar ping para um recurso conhecido
      try {
        await fetch('https://www.google.com/favicon.ico', { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        });
        return true;
      } catch (fallbackError) {
        return false;
      }
    }
  }

  startPeriodicCheck() {
    setInterval(async () => {
      if (!navigator.onLine) {
        this.updateStatus(false);
        return;
      }

      // Mostrar status "conectando" durante verificação
      if (this.statusElement) {
        const statusText = this.statusElement.querySelector('span');
        this.statusElement.className = 'status-indicator connecting';
        statusText.textContent = 'Verificando...';
      }

      const isConnected = await this.checkConnection();
      setTimeout(() => {
        this.updateStatus(isConnected);
      }, 500); // Pequeno delay para mostrar o estado "verificando"
    }, 30000); // Verificar a cada 30 segundos
  }
}

// Auto-inicializar quando o script for carregado
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('connection-status')) {
    new ConnectionMonitor();
  }
});

// Exportar para uso global se necessário
window.ConnectionMonitor = ConnectionMonitor;
