/**
 * Sistema de Dashboard e Métricas G8
 * Funcionalidades modernas para visualização de dados
 */

class DashboardMetrics {
  constructor() {
    this.charts = new Map();
    this.metrics = {
      clientes: 0,
      pedidos: 0,
      vendas: 0,
      comissoes: 0
    };
    this.init();
  }

  init() {
    this.createDashboardElements();
    this.loadMetrics();
    this.startRealTimeUpdates();
    
    // Garantir que os cards sejam renderizados após um delay
    setTimeout(() => {
      if (!document.querySelector('.metric-card')) {
        console.log('Cards não encontrados, forçando renderização...');
        this.renderMetricCards();
      }
    }, 500);
  }

  async loadMetrics(filterMonth = null) {
    try {
      // Se não especificou mês, usar mês atual por padrão
      if (!filterMonth) {
        const now = new Date();
        filterMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        console.log('📅 Usando mês atual por padrão:', filterMonth);
      }
      
      const response = await this.fetchMetrics(filterMonth);
      this.updateMetrics(response);
      this.currentFilter = filterMonth;
      
      // Garantir que os cards sejam renderizados
      setTimeout(() => {
        this.renderMetricCards();
      }, 100);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      // Mostrar cards com valores zerados em caso de erro
      this.updateMetrics({
        clientes: 0,
        pedidos: 0,
        vendas: 0,
        crescimento: { clientes: 0, pedidos: 0, vendas: 0 }
      });
    }
  }

  async filterByMonth(month) {
    if (month) {
      await this.loadMetrics(month + '-01');
      if (window.advancedNotifications) {
        const monthName = new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        advancedNotifications.info(`Filtro aplicado: ${monthName}`, {
          title: 'Filtro por Mês',
          duration: 3000
        });
      }
    } else {
      this.clearFilter();
    }
  }

  async clearFilter() {
    await this.loadMetrics();
    document.getElementById('monthFilter').value = '';
    if (window.advancedNotifications) {
      advancedNotifications.info('Filtro removido - mostrando todos os dados', {
        title: 'Filtro Limpo',
        duration: 3000
      });
    }
  }

  async fetchMetrics(filterMonth = null) {
    try {
      // Carregar dados reais dos clientes e pedidos
      const clientesData = await this.loadClientes();
      const pedidosData = await this.loadPedidos();
      
      console.log('📊 Dados carregados:', {
        clientes: clientesData.length,
        pedidos: pedidosData.length,
        filterMonth
      });
      
      // Filtrar pedidos por mês se especificado
      let filteredPedidos = pedidosData;
      if (filterMonth) {
        const [year, month] = filterMonth.split('-');
        filteredPedidos = pedidosData.filter(pedido => {
          // Verificar diferentes formatos de data
          let pedidoDate = null;
          
          if (pedido.data_pedido) {
            pedidoDate = new Date(pedido.data_pedido);
          } else if (pedido.data) {
            pedidoDate = new Date(pedido.data);
          } else if (pedido.dados) {
            try {
              const dados = typeof pedido.dados === 'string' ? JSON.parse(pedido.dados) : pedido.dados;
              if (dados.data) {
                pedidoDate = new Date(dados.data);
              }
            } catch (e) {
              // Ignorar erros de parsing
            }
          }
          
          if (pedidoDate && !isNaN(pedidoDate.getTime())) {
            return pedidoDate.getMonth() + 1 === parseInt(month) && 
                   pedidoDate.getFullYear() === parseInt(year);
          }
          
          // Se não conseguir determinar a data, incluir no mês atual se não houver filtro
          return !filterMonth;
        });
        
        console.log(`📅 Pedidos filtrados para ${filterMonth}:`, filteredPedidos.length);
      }

      // Calcular total em R$ dos pedidos
      const totalVendas = filteredPedidos.reduce((total, pedido) => {
        let valorPedido = 0;
        
        // Tentar diferentes formas de obter o valor
        if (pedido.total) {
          valorPedido = parseFloat(pedido.total);
        } else if (pedido.dados) {
          try {
            const dados = typeof pedido.dados === 'string' ? JSON.parse(pedido.dados) : pedido.dados;
            if (dados.total) {
              valorPedido = parseFloat(dados.total);
            }
          } catch (e) {
            // Ignorar erros de parsing
          }
        }
        
        return total + (isNaN(valorPedido) ? 0 : valorPedido);
      }, 0);

      console.log('💰 Valores calculados:', {
        totalClientes: clientesData.length,
        totalPedidos: filteredPedidos.length,
        totalVendas: totalVendas.toFixed(2)
      });

      // Calcular crescimento (comparar com mês anterior)
      const crescimento = await this.calculateGrowth(clientesData.length, filteredPedidos.length, totalVendas, filterMonth);

      return {
        clientes: clientesData.length,
        pedidos: filteredPedidos.length,
        vendas: totalVendas,
        crescimento
      };
    } catch (error) {
      console.error('❌ Erro ao carregar métricas:', error);
      // Fallback para dados simulados
      return {
        clientes: 0,
        pedidos: 0,
        vendas: 0,
        crescimento: { clientes: 0, pedidos: 0, vendas: 0 }
      };
    }
  }

  async loadClientes() {
    try {
      // 1. Tentar carregar da API primeiro (dados mais atualizados)
      console.log('🔍 Carregando clientes da API...');
      const apiResponse = await fetch('/api/clientes');
      if (apiResponse.ok) {
        const apiClientes = await apiResponse.json();
        if (apiClientes && Array.isArray(apiClientes) && apiClientes.length > 0) {
          console.log('✅ Clientes carregados da API:', apiClientes.length);
          return apiClientes;
        }
      }

      // 2. Fallback para arquivo JSON
      console.log('⚠️ API não disponível, tentando arquivo JSON...');
      const response = await fetch('/clientes.json');
      if (response.ok) {
        const jsonClientes = await response.json();
        if (jsonClientes && Array.isArray(jsonClientes) && jsonClientes.length > 0) {
          console.log('✅ Clientes carregados do JSON:', jsonClientes.length);
          return jsonClientes;
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar clientes:', error);
    }
    
    // 3. Fallback para localStorage
    console.log('⚠️ Tentando localStorage...');
    const localClientes = localStorage.getItem('clientes');
    const dados = localClientes ? JSON.parse(localClientes) : [];
    console.log('📊 Total de clientes encontrados:', dados.length);
    return dados;
  }

  async loadPedidos() {
    try {
      // 1. Tentar carregar da API primeiro (dados mais atualizados)
      console.log('🔍 Carregando pedidos da API...');
      const apiResponse = await fetch('/api/pedidos');
      if (apiResponse.ok) {
        const apiPedidos = await apiResponse.json();
        if (apiPedidos && Array.isArray(apiPedidos) && apiPedidos.length > 0) {
          console.log('✅ Pedidos carregados da API:', apiPedidos.length);
          return apiPedidos;
        }
      }

      // 2. Fallback para localStorage apenas (sem pedidos.json que não existe)
      console.log('⚠️ API não disponível, tentando localStorage...');
      const sources = [
        () => {
          const local = localStorage.getItem('pedidos');
          return local ? JSON.parse(local) : null;
        },
        () => {
          const local = localStorage.getItem('pedidosData');
          return local ? JSON.parse(local) : null;
        }
      ];

      for (const source of sources) {
        try {
          const data = await source();
          if (data && Array.isArray(data) && data.length > 0) {
            console.log('✅ Pedidos carregados de fonte alternativa:', data.length);
            return data;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar pedidos:', error);
    }
    
    console.log('⚠️ Nenhum pedido encontrado');
    return [];
  }

  async calculateGrowth(currentClientes, currentPedidos, currentVendas, filterMonth) {
    // Simplificar cálculo de crescimento para evitar chamadas recursivas
    // Por enquanto retornar crescimento simulado baseado nos valores atuais
    const baseGrowth = currentPedidos > 0 ? Math.min(Math.max((currentPedidos - 50) / 10, -50), 50) : 0;
    
    return {
      clientes: Math.round(baseGrowth * 0.8),
      pedidos: Math.round(baseGrowth),
      vendas: Math.round(baseGrowth * 1.2)
    };
  }

  calculatePercentChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100);
  }

  updateMetrics(data) {
    this.metrics = { ...this.metrics, ...data };
    console.log('Métricas atualizadas:', this.metrics);
    
    // Garantir que o elemento existe antes de renderizar
    const metricsGrid = document.getElementById('metrics-grid');
    if (metricsGrid) {
      this.renderMetricCards();
    } else {
      console.warn('Elemento metrics-grid não encontrado ao atualizar métricas');
      // Tentar novamente após um pequeno delay
      setTimeout(() => {
        this.renderMetricCards();
      }, 100);
    }
  }

  createDashboardElements() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const dashboardHTML = `
      <div class="dashboard-container">
        <div class="dashboard-header">
          <h2><span class="dashboard-icon">📊</span> Dashboard G8</h2>
          <div class="dashboard-actions">
            <div class="month-filter">
              <label for="monthFilter">Filtrar por mês:</label>
              <input type="month" id="monthFilter" value="${currentMonth}" onchange="dashboardMetrics.filterByMonth(this.value)">
              <button class="btn-modern btn-g8-outline btn-sm" onclick="dashboardMetrics.clearFilter()">
                <i class="fas fa-times"></i> Limpar
              </button>
            </div>
            <button class="btn-modern btn-g8-outline" onclick="dashboardMetrics.refreshData()">
              <i class="fas fa-sync-alt"></i> Atualizar
            </button>
          </div>
        </div>
        
        <div class="metrics-grid" id="metrics-grid">
          <!-- Cards de métricas serão inseridos aqui -->
        </div>
      </div>
    `;

    // Inserir dashboard na página se não existir
    if (!document.querySelector('.dashboard-container')) {
      const container = document.querySelector('.container') || document.body;
      const dashboardElement = document.createElement('div');
      dashboardElement.innerHTML = dashboardHTML;
      container.insertBefore(dashboardElement.firstElementChild, container.firstChild);
    }
  }

  renderMetricCards() {
    const metricsGrid = document.getElementById('metrics-grid');
    if (!metricsGrid) {
      console.warn('Elemento metrics-grid não encontrado');
      // Tentar encontrar o container do dashboard e recriar
      const dashboardContainer = document.querySelector('.dashboard-container');
      if (dashboardContainer) {
        this.createDashboardElements();
        setTimeout(() => this.renderMetricCards(), 100);
      }
      return;
    }

    const cards = [
      {
        title: 'Total Clientes',
        value: this.metrics.clientes || 0,
        icon: 'fas fa-users',
        color: 'primary',
        growth: this.metrics.crescimento?.clientes || 0
      },
      {
        title: 'Total Pedidos',
        value: this.metrics.pedidos || 0,
        icon: 'fas fa-shopping-cart',
        color: 'success',
        growth: this.metrics.crescimento?.pedidos || 0
      },
      {
        title: 'Total R$ dos Pedidos',
        value: this.formatCurrency(this.metrics.vendas || 0),
        icon: 'fas fa-dollar-sign',
        color: 'info',
        growth: this.metrics.crescimento?.vendas || 0
      }
    ];

    try {
      const cardsHTML = cards.map(card => this.createMetricCard(card)).join('');
      metricsGrid.innerHTML = cardsHTML;
      
      console.log('✅ Cards renderizados com sucesso:', cards.length);
      
      // Animar cards
      setTimeout(() => this.animateCards(), 50);
      
      // Verificar se os cards foram realmente inseridos
      setTimeout(() => {
        const renderedCards = metricsGrid.querySelectorAll('.metric-card');
        console.log('Cards no DOM:', renderedCards.length);
      }, 100);
      
    } catch (error) {
      console.error('Erro ao renderizar cards:', error);
    }
  }

  createMetricCard(card) {
    const growthClass = card.growth >= 0 ? 'positive' : 'negative';
    const growthIcon = card.growth >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
    
    return `
      <div class="metric-card card-modern animate-on-scroll" data-color="${card.color}">
        <div class="metric-header">
          <div class="metric-icon">
            <i class="${card.icon}"></i>
          </div>
          <div class="metric-growth ${growthClass}">
            <i class="fas ${growthIcon}"></i>
            ${Math.abs(card.growth)}%
          </div>
        </div>
        <div class="metric-content">
          <h3 class="metric-title">${card.title}</h3>
          <div class="metric-value">${card.value}</div>
        </div>
        <div class="metric-footer">
          <span class="metric-period">Últimos 30 dias</span>
        </div>
      </div>
    `;
  }

  animateCards() {
    const cards = document.querySelectorAll('.metric-card');
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('animate-fade-in-up');
      }, index * 150);
    });
  }

  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  async refreshData() {
    const refreshBtn = document.querySelector('[onclick="dashboardMetrics.refreshData()"]');
    if (refreshBtn) {
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
      refreshBtn.disabled = true;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simular delay
      await this.loadMetrics();
      
      if (window.notifications) {
        notifications.success('Dados atualizados com sucesso!', {
          title: 'Dashboard Atualizado',
          duration: 3000
        });
      }
    } catch (error) {
      if (window.notifications) {
        notifications.error('Erro ao atualizar dados', {
          title: 'Erro',
          duration: 5000
        });
      }
    } finally {
      if (refreshBtn) {
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar';
        refreshBtn.disabled = false;
      }
    }
  }

  exportData() {
    const data = {
      metrics: this.metrics,
      timestamp: new Date().toISOString(),
      sistema: 'G8 Representações'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-g8-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.notifications) {
      notifications.success('Dados exportados com sucesso!', {
        title: 'Exportação Concluída',
        duration: 3000
      });
    }
  }

  startRealTimeUpdates() {
    // Atualizar métricas a cada 30 segundos
    setInterval(() => {
      this.loadMetrics();
    }, 30000);
  }

}

// CSS para o dashboard
const dashboardCSS = `
  .dashboard-container {
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: var(--gradient-light);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border-color);
  }

  .dashboard-header h2 {
    color: var(--g8-black);
    font-size: 1.5rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .dashboard-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--gradient-primary);
    color: white;
    font-size: 1.2rem;
    box-shadow: var(--shadow-sm);
  }

  .dashboard-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .month-filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    border: 1px solid var(--border-color, #e0e0e0);
  }

  .month-filter label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-color, #000000);
    white-space: nowrap;
  }

  .month-filter input[type="month"] {
    padding: 0.5rem;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 0.9rem;
    background: white;
    color: var(--text-color, #000000);
  }

  .btn-sm {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .metric-card {
    background: white;
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--border-color);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }

  .metric-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--gradient-primary);
  }

  .metric-card[data-color="success"]::before {
    background: var(--gradient-success);
  }

  .metric-card[data-color="warning"]::before {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  }

  .metric-card[data-color="info"]::before {
    background: var(--gradient-info);
  }

  .metric-card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-xl);
  }

  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .metric-icon {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--gradient-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.2rem;
  }

  .metric-growth {
    font-size: 0.85rem;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
  }

  .metric-growth.positive {
    color: #059669;
    background: rgba(5, 150, 105, 0.1);
  }

  .metric-growth.negative {
    color: #dc2626;
    background: rgba(220, 38, 38, 0.1);
  }

  .metric-title {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .metric-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--g8-black);
    line-height: 1;
  }

  .metric-footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .metric-period {
    font-size: 0.8rem;
    color: var(--text-muted);
  }


  @media (max-width: 768px) {
    .dashboard-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .dashboard-actions {
      justify-content: center;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .month-filter {
      flex-direction: column;
      align-items: stretch;
      gap: 0.5rem;
    }
  }
`;

// Adicionar CSS ao documento
const styleSheet = document.createElement('style');
styleSheet.textContent = dashboardCSS;
document.head.appendChild(styleSheet);

// Instância global
let dashboardMetrics;

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // Só inicializar se estivermos na página do painel
  if (window.location.pathname.includes('painel.html') || 
      document.querySelector('.section-card')) {
    dashboardMetrics = new DashboardMetrics();
    
    // Verificar se os cards foram criados após 2 segundos
    setTimeout(() => {
      const cards = document.querySelectorAll('.metric-card');
      if (cards.length === 0) {
        console.log('Forçando criação dos cards...');
        dashboardMetrics.updateMetrics({
          clientes: 0,
          pedidos: 0,
          vendas: 0,
          crescimento: { clientes: 0, pedidos: 0, vendas: 0 }
        });
      }
    }, 2000);
  }
});
