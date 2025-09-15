// ========== SISTEMA DE LOADING ELEGANTE ==========

class LoadingSystem {
  constructor() {
    this.activeLoaders = new Map();
    this.setupStyles();
  }

  // Configurar estilos CSS
  setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Loading Overlay */
      .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .loading-overlay.show {
        opacity: 1;
      }

      /* Loading Spinner */
      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top: 3px solid #ffffff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .loading-spinner.small {
        width: 20px;
        height: 20px;
        border-width: 2px;
      }

      .loading-spinner.large {
        width: 60px;
        height: 60px;
        border-width: 4px;
      }

      /* Loading Dots */
      .loading-dots {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .loading-dots span {
        width: 8px;
        height: 8px;
        background: currentColor;
        border-radius: 50%;
        animation: loading-dots 1.4s ease-in-out infinite both;
      }

      .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
      .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
      .loading-dots span:nth-child(3) { animation-delay: 0; }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

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

      /* Loading Bar */
      .loading-bar {
        width: 100%;
        height: 3px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 2px;
        overflow: hidden;
        position: relative;
      }

      .loading-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #2563eb, #3b82f6);
        border-radius: 2px;
        width: 0%;
        transition: width 0.3s ease;
      }

      .loading-bar-indeterminate .loading-bar-fill {
        width: 30%;
        animation: loading-bar-slide 2s ease-in-out infinite;
      }

      @keyframes loading-bar-slide {
        0% { transform: translateX(-100%); }
        50% { transform: translateX(300%); }
        100% { transform: translateX(-100%); }
      }

      /* Button Loading States */
      .btn-loading {
        position: relative;
        pointer-events: none;
        opacity: 0.7;
      }

      .btn-loading .btn-text {
        opacity: 0;
      }

      .btn-loading .btn-loader {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        gap: 8px;
        color: currentColor;
      }

      /* Skeleton Loading */
      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s infinite;
        border-radius: 4px;
      }

      .skeleton-text {
        height: 16px;
        margin-bottom: 8px;
      }

      .skeleton-text.large {
        height: 24px;
      }

      .skeleton-text.small {
        height: 12px;
      }

      .skeleton-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
      }

      .skeleton-card {
        height: 200px;
        margin-bottom: 16px;
      }

      @keyframes skeleton-loading {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      /* Table Loading */
      .table-loading {
        position: relative;
      }

      .table-loading::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(1px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
      }
    `;
    document.head.appendChild(style);
  }

  // Mostrar overlay de loading global
  showOverlay(message = 'Carregando...') {
    let overlay = document.querySelector('.loading-overlay');
    
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div style="text-align: center; color: white;">
          <div class="loading-spinner large"></div>
          <div style="margin-top: 16px; font-size: 16px;">${message}</div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    requestAnimationFrame(() => {
      overlay.classList.add('show');
    });

    return overlay;
  }

  // Esconder overlay de loading
  hideOverlay() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
    }
  }

  // Loading state para botões
  setButtonLoading(buttonId, loading = true, text = 'Carregando...') {
    const button = document.getElementById(buttonId);
    if (!button) return;

    if (loading) {
      // Salvar estado original
      if (!this.activeLoaders.has(buttonId)) {
        this.activeLoaders.set(buttonId, {
          originalText: button.innerHTML,
          originalDisabled: button.disabled
        });
      }

      button.disabled = true;
      button.classList.add('btn-loading');
      
      const originalContent = button.innerHTML;
      button.innerHTML = `
        <span class="btn-text">${originalContent}</span>
        <span class="btn-loader">
          <div class="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          ${text}
        </span>
      `;
    } else {
      // Restaurar estado original
      const originalState = this.activeLoaders.get(buttonId);
      if (originalState) {
        button.innerHTML = originalState.originalText;
        button.disabled = originalState.originalDisabled;
        this.activeLoaders.delete(buttonId);
      }
      
      button.classList.remove('btn-loading');
    }
  }

  // Loading para elementos específicos
  setElementLoading(elementId, loading = true) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (loading) {
      element.style.position = 'relative';
      element.style.pointerEvents = 'none';
      element.style.opacity = '0.6';
      
      // Adicionar spinner
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner';
      spinner.style.position = 'absolute';
      spinner.style.top = '50%';
      spinner.style.left = '50%';
      spinner.style.transform = 'translate(-50%, -50%)';
      spinner.style.zIndex = '100';
      spinner.dataset.loader = elementId;
      
      element.appendChild(spinner);
    } else {
      element.style.pointerEvents = '';
      element.style.opacity = '';
      
      // Remover spinner
      const spinner = element.querySelector(`[data-loader="${elementId}"]`);
      if (spinner) {
        spinner.remove();
      }
    }
  }

  // Criar skeleton para tabelas
  createTableSkeleton(tableId, rows = 5, columns = 4) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    // Limpar conteúdo existente
    tbody.innerHTML = '';

    // Criar linhas skeleton
    for (let i = 0; i < rows; i++) {
      const row = document.createElement('tr');
      
      for (let j = 0; j < columns; j++) {
        const cell = document.createElement('td');
        cell.innerHTML = '<div class="skeleton skeleton-text"></div>';
        row.appendChild(cell);
      }
      
      tbody.appendChild(row);
    }
  }

  // Criar skeleton para cards
  createCardSkeleton(containerId, count = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'skeleton skeleton-card';
      container.appendChild(card);
    }
  }

  // Progress bar
  createProgressBar(containerId, progress = 0) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let progressBar = container.querySelector('.loading-bar');
    
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'loading-bar';
      progressBar.innerHTML = '<div class="loading-bar-fill"></div>';
      container.appendChild(progressBar);
    }

    const fill = progressBar.querySelector('.loading-bar-fill');
    fill.style.width = `${Math.min(100, Math.max(0, progress))}%`;

    return {
      setProgress: (newProgress) => {
        fill.style.width = `${Math.min(100, Math.max(0, newProgress))}%`;
      },
      setIndeterminate: (indeterminate = true) => {
        if (indeterminate) {
          progressBar.classList.add('loading-bar-indeterminate');
        } else {
          progressBar.classList.remove('loading-bar-indeterminate');
        }
      },
      remove: () => {
        progressBar.remove();
      }
    };
  }

  // Limpar todos os loadings
  clearAll() {
    this.hideOverlay();
    
    // Limpar botões
    this.activeLoaders.forEach((_, buttonId) => {
      this.setButtonLoading(buttonId, false);
    });
    
    // Remover spinners de elementos
    document.querySelectorAll('[data-loader]').forEach(spinner => {
      spinner.remove();
    });
    
    // Restaurar opacidade e pointer events
    document.querySelectorAll('[style*="opacity"][style*="pointer-events"]').forEach(el => {
      el.style.opacity = '';
      el.style.pointerEvents = '';
    });
  }
}

// Exportar para uso global
window.LoadingSystem = LoadingSystem;
window.loadingSystem = new LoadingSystem();
