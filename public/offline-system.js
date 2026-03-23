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
    
    // Backoff exponencial: intervalo base, máximo (ms) e multiplicador
    this.retryBaseInterval = 15000;   // 15s
    this.retryMaxInterval = 120000;    // 2 min
    this.retryMultiplier = 2;
    this.retryBackoffMs = this.retryBaseInterval;
    
    this.init();
  }

  init() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'G8_SYNC_PENDING') {
          this.processPendingOrders();
          this.processPendingEdits();
        }
      });
    }
    
    this.startConnectionCheck();
    this.createStatusIndicator();
    
    setTimeout(() => this.checkConnection(), 300);
    
    this.processPendingOrders();
    this.processPendingEdits();
  }

  createStatusIndicator() {
    const existingHeaderIndicator = document.getElementById('connection-status');
    if (existingHeaderIndicator) {
      this.statusIndicator = existingHeaderIndicator;
      this.statusIndicator.style.cursor = 'pointer';
      this.statusIndicator.title = 'Clique para ver pedidos pendentes';
      this.statusIndicator.addEventListener('click', () => this.togglePendingPanel());
      this.updateStatusIndicator();
      return;
    }

    this.statusIndicator = document.createElement('div');
    this.statusIndicator.id = 'connection-status-offline';
    this.statusIndicator.style.cursor = 'pointer';
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
      this.statusIndicator.addEventListener('click', () => this.togglePendingPanel());
    }
    this.updateStatusIndicator();
  }

  togglePendingPanel() {
    const panel = document.getElementById('g8-pending-panel');
    if (panel) {
      panel.remove();
      return;
    }
    this.createPendingPanel();
  }

  createPendingPanel() {
    const total = this.pendingOrders.length + this.pendingEdits.length;
    if (total === 0) {
      this.showNotification('Nenhum pedido ou edição pendente.', 'info');
      return;
    }

    const panel = document.createElement('div');
    panel.id = 'g8-pending-panel';
    panel.innerHTML = `
      <div class="g8-pending-panel-header">
        <strong>📋 Pendentes de envio (${total})</strong>
        <button class="g8-pending-close" type="button">×</button>
      </div>
      <div class="g8-pending-panel-body">
        ${this.pendingOrders.length > 0 ? `
          <div class="g8-pending-section">
            <div class="g8-pending-title">📦 Pedidos (${this.pendingOrders.length})</div>
            ${this.pendingOrders.map(o => {
              const d = o.data?.dados || o.data;
              const cliente = d?.cliente?.razao || d?.cliente?.nome || 'N/A';
              const total = d?.total != null ? `R$ ${parseFloat(d.total).toFixed(2)}` : '';
              return `<div class="g8-pending-item">${cliente} ${total ? '— ' + total : ''}</div>`;
            }).join('')}
          </div>
        ` : ''}
        ${this.pendingEdits.length > 0 ? `
          <div class="g8-pending-section">
            <div class="g8-pending-title">✏️ Edições (${this.pendingEdits.length})</div>
            ${this.pendingEdits.map(e => `<div class="g8-pending-item">Pedido #${e.data?.id || '?'}</div>`).join('')}
          </div>
        ` : ''}
        <button class="g8-pending-retry-btn" type="button">🔄 Enviar agora</button>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #g8-pending-panel { position: fixed; top: 60px; right: 10px; width: 320px; max-width: calc(100vw - 20px);
        background: white; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
      .g8-pending-panel-header { display: flex; justify-content: space-between; align-items: center;
        padding: 12px 16px; background: #f59e0b; color: white; font-size: 14px; }
      .g8-pending-close { background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0 4px; }
      .g8-pending-panel-body { padding: 16px; max-height: 280px; overflow-y: auto; }
      .g8-pending-section { margin-bottom: 12px; }
      .g8-pending-title { font-weight: 600; font-size: 12px; color: #64748b; margin-bottom: 6px; }
      .g8-pending-item { font-size: 13px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; color: #334155; }
      .g8-pending-retry-btn { width: 100%; padding: 10px; margin-top: 12px; border: none; border-radius: 8px;
        background: #10b981; color: white; font-weight: 600; cursor: pointer; font-size: 14px; }
      .g8-pending-retry-btn:hover { background: #059669; }
    `;
    document.head.appendChild(style);

    panel.querySelector('.g8-pending-close').onclick = () => panel.remove();
    panel.querySelector('.g8-pending-retry-btn').onclick = () => {
      this.processPendingOrders();
      this.processPendingEdits();
      this.showNotification('Enviando pendentes...', 'info');
      panel.remove();
    };

    document.body.appendChild(panel);

    document.addEventListener('click', function closer(e) {
      if (!panel.contains(e.target) && !document.getElementById('connection-status')?.contains(e.target)
          && !document.getElementById('connection-status-offline')?.contains(e.target)) {
        panel.remove();
        document.removeEventListener('click', closer);
      }
    });
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
    const doCheck = () => {
      this.checkConnection().then(() => {
        const hasPending = this.pendingOrders.length + this.pendingEdits.length > 0;
        if (hasPending && this.isOnline) {
          this.retryBackoffMs = this.retryBaseInterval;
        } else if (!this.isOnline && hasPending) {
          this.retryBackoffMs = Math.min(this.retryBackoffMs * this.retryMultiplier, this.retryMaxInterval);
        } else {
          this.retryBackoffMs = this.retryBaseInterval;
        }
        this._nextCheckTimer = setTimeout(doCheck, this.retryBackoffMs);
      }).catch(() => {
        this.retryBackoffMs = Math.min(this.retryBackoffMs * this.retryMultiplier, this.retryMaxInterval);
        this._nextCheckTimer = setTimeout(doCheck, this.retryBackoffMs);
      });
    };
    this._nextCheckTimer = setTimeout(doCheck, this.retryBaseInterval);
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
    this.registerBackgroundSync();
    this.vibrate(50);

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

  // Atualizar numeração do pedido se necessário (usa maior ID, não quantidade)
  async updateOrderNumber(offlineOrder) {
    try {
      const response = await fetch('/api/pedidos');
      if (!response.ok) return;
      
      const existingOrders = await response.json();
      const companyOrders = existingOrders.filter(order => 
        (order.data?.empresa || order.empresa) === offlineOrder.data.empresa
      );
      
      if (companyOrders.length > 0) {
        const maxId = Math.max(...companyOrders.map(o => parseInt(o.id) || 0), 0);
        const newNumber = maxId + 1;
        
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
    this.registerBackgroundSync();
    this.vibrate(50);
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
        if (response.status === 404) {
          this.showNotification('Pedido não encontrado (pode ter sido excluído).', 'warning');
          return { success: false, online: true };
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        console.error('Erro ao enviar edição:', error);
        const alreadyApplied = await this.checkEditAlreadyApplied(editData);
        if (alreadyApplied) {
          this.isOnline = true;
          this.showNotification('Edição já foi aplicada anteriormente.', 'success');
          return { success: true, online: true };
        }
        const offlineId = await this.saveEditOffline(editData);
        return { success: true, online: false, offlineId };
      }
    } else {
      const alreadyApplied = await this.checkEditAlreadyApplied(editData);
      if (alreadyApplied) {
        this.showNotification('Pedido não existe mais. Edição cancelada.', 'warning');
        return { success: false, online: false };
      }
      const offlineId = await this.saveEditOffline(editData);
      return { success: true, online: false, offlineId };
    }
  }

  async checkEditAlreadyApplied(editData) {
    try {
      const resp = await fetch('/api/pedidos');
      if (!resp.ok) return false;
      const pedidos = await resp.json();
      const existe = pedidos.some(p => p.id == editData.id);
      return !existe;
    } catch (e) {
      return false;
    }
  }

  showNotification(message, type = 'info') {
    if (window.advancedNotifications && typeof window.advancedNotifications[type] === 'function') {
      const opts = { title: type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : type === 'warning' ? 'Atenção' : 'Informação', duration: 5000 };
      window.advancedNotifications[type](message, opts);
      return;
    }
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed; top: 50px; right: 10px; padding: 12px 20px; border-radius: 8px; font-size: 14px;
      max-width: 300px; z-index: 10001; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease;
    `;
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.style.color = 'white';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.animation = 'slideOut 0.3s ease'; setTimeout(() => notification.remove(), 300); }, 5000);
  }

  vibrate(ms = 50) {
    if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {}
  }

  registerBackgroundSync() {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.sync.register('g8-pending-orders').catch(() => {});
    }).catch(() => {});
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
