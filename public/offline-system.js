/**
 * Sistema de Funcionamento Offline - G8 Sistema
 * Gerencia pedidos quando não há conexão com internet
 * Reenvia automaticamente quando a conexão retorna
 */

class OfflineSystem {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingOrders = this.loadPendingOrders();
    this.retryInterval = null;
    this.statusIndicator = null;
    
    this.init();
  }

  init() {
    // Listeners para eventos de conexão
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Verificar conexão periodicamente
    this.startConnectionCheck();
    
    // Criar indicador visual
    this.createStatusIndicator();
    
    // Processar pedidos pendentes se estiver online
    if (this.isOnline) {
      this.processPendingOrders();
    }
  }

  createStatusIndicator() {
    // Verificar se já existe um indicador no header
    const existingHeaderIndicator = document.getElementById('connection-status');
    if (existingHeaderIndicator) {
      // Usar o indicador do header em vez de criar um novo
      this.statusIndicator = existingHeaderIndicator;
      this.updateStatusIndicator();
      return;
    }

    // Criar indicador próprio apenas se não existir um no header
    this.statusIndicator = document.createElement('div');
    this.statusIndicator.id = 'connection-status-offline';
    this.statusIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    
    if (document.body) {
      document.body.appendChild(this.statusIndicator);
    }
    this.updateStatusIndicator();
  }

  updateStatusIndicator() {
    if (!this.statusIndicator) return;
    
    const pendingCount = this.pendingOrders.length;
    
    // Verificar se é o indicador do header (tem span) ou o indicador flutuante
    const isHeaderIndicator = this.statusIndicator.id === 'connection-status';
    const statusText = isHeaderIndicator ? this.statusIndicator.querySelector('span') : null;
    
    if (this.isOnline) {
      if (pendingCount > 0) {
        if (isHeaderIndicator) {
          this.statusIndicator.className = 'status-indicator connecting';
          if (statusText) statusText.textContent = `Enviando ${pendingCount}...`;
        } else {
          this.statusIndicator.innerHTML = `🔄 Enviando ${pendingCount} pedido(s)...`;
          this.statusIndicator.style.backgroundColor = '#f59e0b';
          this.statusIndicator.style.color = 'white';
        }
      } else {
        if (isHeaderIndicator) {
          this.statusIndicator.className = 'status-indicator';
          if (statusText) statusText.textContent = 'Online';
        } else {
          this.statusIndicator.innerHTML = '🟢 Online';
          this.statusIndicator.style.backgroundColor = '#10b981';
          this.statusIndicator.style.color = 'white';
        }
      }
    } else {
      if (isHeaderIndicator) {
        this.statusIndicator.className = 'status-indicator offline';
        if (statusText) statusText.textContent = pendingCount > 0 ? `Offline (${pendingCount})` : 'Offline';
      } else {
        this.statusIndicator.innerHTML = `🔴 Offline${pendingCount > 0 ? ` (${pendingCount} pendente(s))` : ''}`;
        this.statusIndicator.style.backgroundColor = '#ef4444';
        this.statusIndicator.style.color = 'white';
      }
    }
  }

  handleOnline() {
    this.isOnline = true;
    this.updateStatusIndicator();
    
    // Mostrar notificação
    this.showNotification('Conexão restaurada! Enviando pedidos pendentes...', 'success');
    
    // Processar pedidos pendentes
    setTimeout(() => this.processPendingOrders(), 1000);
  }

  handleOffline() {
    this.isOnline = false;
    this.updateStatusIndicator();
    
    this.showNotification('Sem conexão! Pedidos serão salvos e enviados automaticamente quando a conexão retornar.', 'warning');
  }

  startConnectionCheck() {
    // Verificar conexão a cada 30 segundos
    setInterval(() => {
      this.checkConnection();
    }, 30000);
  }

  async checkConnection() {
    try {
      // Tentar fazer uma requisição simples para verificar conectividade real
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000 
      });
      
      const wasOffline = !this.isOnline;
      this.isOnline = response.ok;
      
      // Se acabou de voltar online
      if (wasOffline && this.isOnline) {
        this.handleOnline();
      }
    } catch (error) {
      const wasOnline = this.isOnline;
      this.isOnline = false;
      
      // Se acabou de ficar offline
      if (wasOnline && !this.isOnline) {
        this.handleOffline();
      }
    }
  }

  // Salvar pedido para envio posterior
  async saveOrderOffline(orderData) {
    const offlineOrder = {
      id: this.generateOfflineId(),
      timestamp: Date.now(),
      data: orderData,
      attempts: 0,
      maxAttempts: 5
    };

    this.pendingOrders.push(offlineOrder);
    this.savePendingOrders();
    this.updateStatusIndicator();

    console.log('💾 Pedido salvo offline:', offlineOrder.id);
    this.showNotification(`Pedido salvo offline! Será enviado automaticamente quando a conexão retornar.`, 'info');
    
    return offlineOrder.id;
  }

  // Processar todos os pedidos pendentes
  async processPendingOrders() {
    if (!this.isOnline || this.pendingOrders.length === 0) return;

    console.log(`📤 Processando ${this.pendingOrders.length} pedido(s) pendente(s)`);
    
    const ordersToProcess = [...this.pendingOrders];
    
    for (const order of ordersToProcess) {
      try {
        await this.sendOrder(order);
      } catch (error) {
        console.error('Erro ao enviar pedido offline:', error);
      }
    }
    
    this.updateStatusIndicator();
  }

  // Enviar um pedido específico
  async sendOrder(offlineOrder) {
    try {
      offlineOrder.attempts++;
      
      // Verificar se o pedido já foi enviado (evitar duplicatas)
      const isDuplicate = await this.checkForDuplicate(offlineOrder);
      if (isDuplicate) {
        console.log('🚫 Pedido duplicado detectado, removendo da fila:', offlineOrder.id);
        this.removePendingOrder(offlineOrder.id);
        return;
      }

      // Gerar nova numeração se necessário
      await this.updateOrderNumber(offlineOrder);

      // Tentar enviar
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offlineOrder.data)
      });

      if (response.ok) {
        console.log('✅ Pedido enviado com sucesso:', offlineOrder.id);
        this.removePendingOrder(offlineOrder.id);
        this.showNotification(`Pedido enviado com sucesso!`, 'success');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erro ao enviar pedido:', error);
      
      if (offlineOrder.attempts >= offlineOrder.maxAttempts) {
        console.log('🚫 Máximo de tentativas atingido, removendo pedido:', offlineOrder.id);
        this.removePendingOrder(offlineOrder.id);
        this.showNotification(`Erro ao enviar pedido após ${offlineOrder.maxAttempts} tentativas. Pedido removido da fila.`, 'error');
      } else {
        console.log(`🔄 Tentativa ${offlineOrder.attempts}/${offlineOrder.maxAttempts} falhou, tentando novamente...`);
      }
    }
  }

  // Verificar se pedido já foi enviado (evitar duplicatas)
  async checkForDuplicate(offlineOrder) {
    try {
      const response = await fetch('/api/pedidos');
      if (!response.ok) return false;
      
      const existingOrders = await response.json();
      const orderData = offlineOrder.data;
      
      // Verificar por pedidos similares nos últimos 10 minutos
      const timeWindow = 10 * 60 * 1000; // 10 minutos
      const recentOrders = existingOrders.filter(order => {
        const orderTime = new Date(order.data?.data || order.timestamp).getTime();
        return (Date.now() - orderTime) < timeWindow;
      });

      // Comparar dados principais
      return recentOrders.some(existing => {
        const existingData = existing.data || existing;
        return (
          existingData.empresa === orderData.empresa &&
          existingData.dados?.cliente?.razao === orderData.dados?.cliente?.razao &&
          existingData.dados?.total === orderData.dados?.total &&
          JSON.stringify(existingData.dados?.itens) === JSON.stringify(orderData.dados?.itens)
        );
      });
    } catch (error) {
      console.error('Erro ao verificar duplicatas:', error);
      return false;
    }
  }

  // Atualizar numeração do pedido se necessário
  async updateOrderNumber(offlineOrder) {
    try {
      // Buscar último número usado
      const response = await fetch('/api/pedidos');
      if (!response.ok) return;
      
      const existingOrders = await response.json();
      const companyOrders = existingOrders.filter(order => 
        (order.data?.empresa || order.empresa) === offlineOrder.data.empresa
      );
      
      if (companyOrders.length > 0) {
        // Gerar nova descrição com numeração atualizada
        const lastNumber = companyOrders.length;
        const newNumber = lastNumber + 1;
        
        // Atualizar descrição do pedido
        if (offlineOrder.data.descricao) {
          offlineOrder.data.descricao = offlineOrder.data.descricao.replace(
            /Pedido #\d+/g, 
            `Pedido #${newNumber}`
          );
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar numeração:', error);
    }
  }

  // Tentar enviar pedido (usado pelas páginas principais)
  async tryToSendOrder(orderData) {
    if (this.isOnline) {
      try {
        const response = await fetch('/api/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });

        if (response.ok) {
          this.showNotification('Pedido enviado com sucesso!', 'success');
          return { success: true, online: true };
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('Erro ao enviar pedido online:', error);
        // Se falhar, salvar offline
        const offlineId = await this.saveOrderOffline(orderData);
        return { success: true, online: false, offlineId };
      }
    } else {
      // Salvar offline diretamente
      const offlineId = await this.saveOrderOffline(orderData);
      return { success: true, online: false, offlineId };
    }
  }

  // Utilitários
  generateOfflineId() {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  loadPendingOrders() {
    try {
      const saved = localStorage.getItem('g8_pending_orders');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Erro ao carregar pedidos pendentes:', error);
      return [];
    }
  }

  savePendingOrders() {
    try {
      localStorage.setItem('g8_pending_orders', JSON.stringify(this.pendingOrders));
    } catch (error) {
      console.error('Erro ao salvar pedidos pendentes:', error);
    }
  }

  removePendingOrder(orderId) {
    this.pendingOrders = this.pendingOrders.filter(order => order.id !== orderId);
    this.savePendingOrders();
  }

  showNotification(message, type = 'info') {
    // Criar notificação simples
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50px;
      right: 10px;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      max-width: 300px;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    `;

    const colors = {
      success: { bg: '#10b981', color: 'white' },
      error: { bg: '#ef4444', color: 'white' },
      warning: { bg: '#f59e0b', color: 'white' },
      info: { bg: '#3b82f6', color: 'white' }
    };

    const color = colors[type] || colors.info;
    notification.style.backgroundColor = color.bg;
    notification.style.color = color.color;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remover após 5 segundos
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // Método público para obter status
  getStatus() {
    return {
      isOnline: this.isOnline,
      pendingCount: this.pendingOrders.length,
      pendingOrders: this.pendingOrders
    };
  }
}

// CSS para animações
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Instância global
window.offlineSystem = new OfflineSystem();

// Sistema Offline inicializado
