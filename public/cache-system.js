/**
 * Sistema de Cache Offline - G8 Sistema
 * Gerencia o Service Worker e funcionalidades offline
 */

class CacheSystem {
  constructor() {
    this.isServiceWorkerSupported = 'serviceWorker' in navigator;
    this.registration = null;
    this.init();
  }

  async init() {
    if (!this.isServiceWorkerSupported) {
      console.log('⚠️ Service Worker não suportado neste navegador');
      return;
    }

    await this.registerServiceWorker();
    this.setupUpdateHandlers();
  }

  async registerServiceWorker() {
    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ Service Worker registrado:', this.registration.scope);
      
      // Verificar se há atualizações pendentes
      if (this.registration.waiting) {
        this.showUpdateNotification();
      }

      return this.registration;
    } catch (error) {
      console.error('❌ Erro ao registrar Service Worker:', error);
    }
  }

  setupUpdateHandlers() {
    if (!this.registration) return;

    // Detectar quando uma nova versão está disponível
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration.installing;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // Nova versão disponível
            this.showUpdateNotification();
          } else {
            // Primeira instalação
            console.log('✅ Service Worker instalado pela primeira vez');
          }
        }
      });
    });

    // Detectar quando o Service Worker assume controle
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker assumiu controle');
      // Recarregar página para usar nova versão
      window.location.reload();
    });
  }

  showUpdateNotification() {
    // Criar notificação de atualização
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: slideInRight 0.3s ease;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="flex: 1;">
          <strong>🔄 Atualização Disponível</strong>
          <div style="font-size: 0.9rem; margin-top: 4px; opacity: 0.9;">
            Nova versão do sistema disponível
          </div>
        </div>
        <button id="update-btn" style="
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.85rem;
        ">Atualizar</button>
        <button id="close-update" style="
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        ">×</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Adicionar CSS para animação
    if (!document.getElementById('update-notification-style')) {
      const style = document.createElement('style');
      style.id = 'update-notification-style';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Event listeners
    document.getElementById('update-btn').addEventListener('click', () => {
      this.applyUpdate();
    });

    document.getElementById('close-update').addEventListener('click', () => {
      this.hideUpdateNotification();
    });

    // Auto-hide após 10 segundos
    setTimeout(() => {
      this.hideUpdateNotification();
    }, 10000);
  }

  hideUpdateNotification() {
    const notification = document.getElementById('update-notification');
    if (notification) {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }
  }

  async applyUpdate() {
    if (this.registration && this.registration.waiting) {
      // Instruir o Service Worker para pular a espera e assumir controle
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Mostrar loading
      const btn = document.getElementById('update-btn');
      if (btn) {
        btn.textContent = 'Atualizando...';
        btn.disabled = true;
      }
    }
  }

  // Método público para verificar status do cache
  async getCacheStatus() {
    if (!this.isServiceWorkerSupported) {
      return { supported: false };
    }

    const caches = await caches.keys();
    const cacheSize = await this.getCacheSize();

    return {
      supported: true,
      registered: !!this.registration,
      caches: caches,
      size: cacheSize,
      isOnline: navigator.onLine
    };
  }

  async getCacheSize() {
    let totalSize = 0;
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return this.formatBytes(totalSize);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Limpar cache
  async clearCache() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    console.log('🗑️ Cache limpo');
  }

  // Forçar atualização do cache
  async updateCache() {
    if (this.registration) {
      await this.registration.update();
      console.log('🔄 Cache atualizado');
    }
  }
}

// Instância global
window.cacheSystem = new CacheSystem();

// Expor métodos globalmente
window.clearCache = () => window.cacheSystem.clearCache();
window.updateCache = () => window.cacheSystem.updateCache();
window.getCacheStatus = () => window.cacheSystem.getCacheStatus();

console.log('🚀 Sistema de Cache inicializado');