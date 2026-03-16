/**
 * Sistema de Funcionamento Offline - G8 Sistema
 * Gerencia pedidos quando não há conexão com internet
 * Reenvia automaticamente quando a conexão retorna
 */

class OfflineSystem {
  constructor() {
    // No celular, navigator.onLine é pouco confiável - assumir online até provar o contrário
    this.isOnline = true;
    this.pendingOrders = this.loadPendingOrders();
    this.pendingEdits = this.loadPendingEdits();
    this.retryInterval = null;
    this.statusIndicator = null;
    this.failuresInRow = 0;
    this.MIN_FAILURES_OFFLINE = 2; // Só marcar offline após 2 falhas seguidas
    
    this.init();
  }

  init() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    this.startConnectionCheck();
    this.createStatusIndicator();
    
    // Verificação imediata ao carregar (celular costuma reportar offline incorretamente)
    setTimeout(() => this.checkConnection(), 300);
    
    this.processPendingOrders();
    this.processPendingEdits();
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
    
    const pendingCount = this.pendingOrders.length + this.pendingEdits.length;
    
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
    this.hideOfflineBanner();
    this.updateStatusIndicator();
    
    const totalPendentes = this.pendingOrders.length + this.pendingEdits.length;
    this.showNotification(`Conexão restaurada! Enviando ${totalPendentes} item(ns) pendente(s)...`, 'success');
    
    setTimeout(() => {
      this.processPendingOrders();
      this.processPendingEdits();
    }, 1000);
  }

  handleOffline() {
    // No celular, o evento 'offline' pode ser falso - verificar com requisição real
    this.failuresInRow = Math.max(this.failuresInRow, 1); // Conta o evento como 1ª falha
    this.checkConnection().then(() => {
      if (!this.isOnline) {
        this.updateStatusIndicator();
        this.showOfflineBanner();
        this.showNotification('Sem conexão! Pedidos serão salvos e enviados automaticamente quando a conexão retornar.', 'warning');
      } else {
        this.hideOfflineBanner();
        this.updateStatusIndicator();
      }
    });
  }

  showOfflineBanner() {
    if (document.getElementById('g8-offline-banner')) return;
    
    const banner = document.createElement('div');
    banner.id = 'g8-offline-banner';
    banner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;">
        <span>📡 <strong>Modo Offline</strong> - Você pode continuar digitando pedidos.</span>
        <span style="opacity: 0.9;">Eles serão enviados automaticamente quando a conexão retornar.</span>
      </div>
    `;
    const header = document.querySelector('.header-top, header, .header');
    const headerHeight = header ? (header.offsetHeight || 55) : 0;
    
    banner.style.cssText = `
      position: fixed;
      top: ${headerHeight}px;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 10px 20px;
      font-size: 14px;
      z-index: 9998;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      text-align: center;
    `;
    
    document.body.insertBefore(banner, document.body.firstChild);
  }

  hideOfflineBanner() {
    const banner = document.getElementById('g8-offline-banner');
    if (banner) banner.remove();
  }

  startConnectionCheck() {
    setInterval(() => this.checkConnection(), 15000); // A cada 15s (mais frequente)
  }

  async checkConnection() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout (celular lento)
    
    try {
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const wasOffline = !this.isOnline;
      this.isOnline = response.ok;
      this.failuresInRow = 0;
      
      if (wasOffline && this.isOnline) {
        this.handleOnline();
      } else if (this.isOnline) {
        this.hideOfflineBanner();
        this.updateStatusIndicator();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      this.failuresInRow++;
      const wasOnline = this.isOnline;
      // Só marcar offline após 2 falhas seguidas (evita falso offline em rede lenta)
      if (this.failuresInRow >= this.MIN_FAILURES_OFFLINE) {
        this.isOnline = false;
        if (wasOnline) this.handleOffline();
      } else {
        this.updateStatusIndicator();
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

      if (response.ok || response.status === 409) {
        // 409 = duplicata - servidor já tem o pedido, remover da fila
        if (response.status === 409) {
          console.log('✅ Pedido duplicado no servidor (409), removendo da fila:', offlineOrder.id);
        } else {
          console.log('✅ Pedido enviado com sucesso:', offlineOrder.id);
        }
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
  // Usa CNPJ + valor no mesmo dia - alinhado com verificação da API
  async checkForDuplicate(offlineOrder) {
    try {
      const response = await fetch('/api/pedidos');
      if (!response.ok) return false;
      
      const existingOrders = await response.json();
      const orderData = offlineOrder.data;
      const dados = orderData?.dados || orderData;
      
      const cnpjNovo = String(dados?.cliente?.cnpj || '').replace(/\D/g, '');
      const valorNovo = parseFloat(dados?.total);
      const empresaNovo = orderData?.empresa;
      
      if (!cnpjNovo || cnpjNovo.length < 14 || isNaN(valorNovo)) return false;
      
      const hoje = new Date().toISOString().slice(0, 10);
      
      return existingOrders.some(order => {
        let dadosExistente = {};
        try {
          dadosExistente = order.dados ? (typeof order.dados === 'string' ? JSON.parse(order.dados) : order.dados) : {};
        } catch (e) { return false; }
        const dataPedido = order.data_pedido || '';
        const dataOrder = dataPedido.toString().slice(0, 10);
        if (dataOrder !== hoje) return false;
        if ((order.empresa || dadosExistente.empresa) !== empresaNovo) return false;
        
        const cnpjExistente = String(dadosExistente?.cliente?.cnpj || '').replace(/\D/g, '');
        const valorExistente = parseFloat(dadosExistente?.total);
        return cnpjExistente === cnpjNovo && 
               !isNaN(valorExistente) && 
               Math.abs(valorExistente - valorNovo) < 0.01;
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
    // Sempre tentar enviar primeiro (mobile pode reportar offline falsamente)
    const shouldTrySend = this.isOnline || navigator.onLine;
    
    if (shouldTrySend) {
      try {
        const response = await fetch('/api/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });

        if (response.ok) {
          this.isOnline = true;
          this.showNotification('Pedido enviado com sucesso!', 'success');
          return { success: true, online: true };
        }
        // 409 = pedido duplicado (já foi criado) - tratar como sucesso
        if (response.status === 409) {
          console.log('✅ Pedido já existia no servidor (409), considerando sucesso');
          this.isOnline = true;
          this.showNotification('Pedido já registrado com sucesso!', 'success');
          return { success: true, online: true };
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        console.error('Erro ao enviar pedido:', error);
        // ANTES de salvar offline: verificar se o pedido já foi criado (evitar duplicata)
        const tempOrder = { id: 'temp', timestamp: Date.now(), data: orderData, attempts: 0, maxAttempts: 5 };
        const alreadyExists = await this.checkForDuplicate(tempOrder);
        if (alreadyExists) {
          console.log('✅ Pedido já existe no servidor (verificação pós-falha), não salvando offline');
          this.isOnline = true;
          this.showNotification('Pedido já foi enviado com sucesso!', 'success');
          return { success: true, online: true };
        }
        // Só salvar offline se realmente não foi criado
        const offlineId = await this.saveOrderOffline(orderData);
        return { success: true, online: false, offlineId };
      }
    } else {
      // Sem conexão detectada - salvar offline
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

  // === EDIÇÕES OFFLINE (PUT) ===
  loadPendingEdits() {
    try {
      const saved = localStorage.getItem('g8_pending_edits');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Erro ao carregar edições pendentes:', error);
      return [];
    }
  }

  savePendingEdits() {
    try {
      localStorage.setItem('g8_pending_edits', JSON.stringify(this.pendingEdits));
    } catch (error) {
      console.error('Erro ao salvar edições pendentes:', error);
    }
  }

  async saveEditOffline(editData) {
    const offlineEdit = {
      id: `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      data: editData,
      attempts: 0,
      maxAttempts: 5
    };
    this.pendingEdits.push(offlineEdit);
    this.savePendingEdits();
    this.updateStatusIndicator();
    console.log('💾 Edição salva offline:', offlineEdit.id);
    this.showNotification('Edição salva! Será enviada quando a conexão retornar.', 'info');
    return offlineEdit.id;
  }

  async processPendingEdits() {
    if (!this.isOnline || this.pendingEdits.length === 0) return;
    console.log(`📤 Processando ${this.pendingEdits.length} edição(ões) pendente(s)`);
    const editsToProcess = [...this.pendingEdits];
    for (const edit of editsToProcess) {
      try {
        await this.sendEdit(edit);
      } catch (error) {
        console.error('Erro ao enviar edição offline:', error);
      }
    }
    this.updateStatusIndicator();
  }

  async sendEdit(offlineEdit) {
    try {
      offlineEdit.attempts++;
      const editData = offlineEdit.data;
      const id = editData.id;
      const url = `/api/pedidos/${id}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'X-Operation-ID': offlineEdit.id
        },
        body: JSON.stringify(editData)
      });
      if (response.ok) {
        this.pendingEdits = this.pendingEdits.filter(e => e.id !== offlineEdit.id);
        this.savePendingEdits();
        this.showNotification('Edição enviada com sucesso!', 'success');
        console.log('✅ Edição enviada:', offlineEdit.id);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erro ao enviar edição:', error);
      if (offlineEdit.attempts >= offlineEdit.maxAttempts) {
        this.pendingEdits = this.pendingEdits.filter(e => e.id !== offlineEdit.id);
        this.savePendingEdits();
        this.showNotification(`Edição não enviada após ${offlineEdit.maxAttempts} tentativas.`, 'error');
      }
    }
  }

  async tryToSendEdit(editData) {
    const shouldTrySend = this.isOnline || navigator.onLine;
    if (shouldTrySend) {
      try {
        const id = editData.id;
        const response = await fetch(`/api/pedidos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editData)
        });
        if (response.ok) {
          this.isOnline = true;
          this.showNotification('Edição salva com sucesso!', 'success');
          return { success: true, online: true };
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        console.error('Erro ao enviar edição:', error);
        const offlineId = await this.saveEditOffline(editData);
        return { success: true, online: false, offlineId };
      }
    } else {
      const offlineId = await this.saveEditOffline(editData);
      return { success: true, online: false, offlineId };
    }
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
      pendingCount: this.pendingOrders.length + this.pendingEdits.length,
      pendingOrders: this.pendingOrders,
      pendingEdits: this.pendingEdits
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
