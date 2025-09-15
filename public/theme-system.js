// ========== SISTEMA DE TEMAS AVANÇADO ========== 

class ThemeSystem {
  constructor() {
    this.currentTheme = 'auto';
    this.themes = {
      light: {
        name: 'Claro',
        icon: '☀️',
        colors: {
          '--primary': '#2563eb',
          '--primary-dark': '#1d4ed8',
          '--background': '#ffffff',
          '--surface': '#f8fafc',
          '--text': '#1f2937',
          '--text-muted': '#6b7280',
          '--border': '#e5e7eb'
        }
      },
      dark: {
        name: 'Escuro',
        icon: '🌙',
        colors: {
          '--primary': '#3b82f6',
          '--primary-dark': '#2563eb',
          '--background': '#0f172a',
          '--surface': '#1e293b',
          '--text': '#f8fafc',
          '--text-muted': '#94a3b8',
          '--border': '#334155'
        }
      },
      ocean: {
        name: 'Oceano',
        icon: '🌊',
        colors: {
          '--primary': '#0891b2',
          '--primary-dark': '#0e7490',
          '--background': '#0c4a6e',
          '--surface': '#075985',
          '--text': '#e0f2fe',
          '--text-muted': '#bae6fd',
          '--border': '#0369a1'
        }
      },
      sunset: {
        name: 'Pôr do Sol',
        icon: '🌅',
        colors: {
          '--primary': '#f59e0b',
          '--primary-dark': '#d97706',
          '--background': '#451a03',
          '--surface': '#78350f',
          '--text': '#fef3c7',
          '--text-muted': '#fde68a',
          '--border': '#a16207'
        }
      }
    };
    
    this.init();
  }

  // Inicializar sistema de temas
  init() {
    this.loadSavedTheme();
    this.createThemeToggler();
    this.setupAutoTheme();
    this.applyTheme();
  }

  // Carregar tema salvo
  loadSavedTheme() {
    const saved = localStorage.getItem('g8-theme');
    if (saved && this.themes[saved]) {
      this.currentTheme = saved;
    } else if (saved === 'auto') {
      this.currentTheme = 'auto';
    }
  }

  // Criar botão de alternância de tema
  createThemeToggler() {
    // Verificar se já existe
    if (document.querySelector('#theme-toggler')) return;

    const toggler = document.createElement('div');
    toggler.id = 'theme-toggler';
    toggler.className = 'theme-toggler';
    
    toggler.innerHTML = `
      <button class="theme-btn" id="theme-btn">
        <span class="theme-icon">${this.getCurrentThemeIcon()}</span>
        <span class="theme-text">${this.getCurrentThemeName()}</span>
        <i class="fas fa-chevron-down"></i>
      </button>
      <div class="theme-dropdown" id="theme-dropdown">
        <div class="theme-option" data-theme="auto">
          <span class="theme-icon">🔄</span>
          <span>Automático</span>
          <span class="theme-badge">Sistema</span>
        </div>
        ${Object.entries(this.themes).map(([key, theme]) => `
          <div class="theme-option" data-theme="${key}">
            <span class="theme-icon">${theme.icon}</span>
            <span>${theme.name}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Adicionar estilos
    const style = document.createElement('style');
    style.textContent = `
      .theme-toggler {
        position: fixed;
        top: 20px;
        right: 80px;
        z-index: 1000;
      }

      .theme-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: var(--glass-bg);
        backdrop-filter: var(--glass-backdrop);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-lg);
        color: var(--text);
        font-size: 14px;
        cursor: pointer;
        transition: all var(--transition-smooth);
        box-shadow: var(--shadow-md);
      }

      .theme-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        transform: translateY(-1px);
      }

      .theme-dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 8px;
        background: var(--glass-bg);
        backdrop-filter: var(--glass-backdrop);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        min-width: 180px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all var(--transition-smooth);
      }

      .theme-dropdown.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .theme-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        transition: all var(--transition-fast);
        border-radius: var(--radius-md);
        margin: 4px;
      }

      .theme-option:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .theme-option.active {
        background: var(--color-primary-500);
        color: white;
      }

      .theme-badge {
        margin-left: auto;
        font-size: 12px;
        padding: 2px 8px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: var(--radius-sm);
      }

      @media (max-width: 768px) {
        .theme-toggler {
          top: 10px;
          right: 60px;
        }
        
        .theme-btn {
          padding: 6px 12px;
          font-size: 12px;
        }
        
        .theme-text {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);

    // Adicionar ao DOM
    document.body.appendChild(toggler);

    // Adicionar eventos
    this.setupTogglerEvents();
  }

  // Configurar eventos do toggler
  setupTogglerEvents() {
    const btn = document.getElementById('theme-btn');
    const dropdown = document.getElementById('theme-dropdown');
    const options = dropdown.querySelectorAll('.theme-option');

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', () => {
      dropdown.classList.remove('show');
    });

    // Selecionar tema
    options.forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        this.setTheme(theme);
        dropdown.classList.remove('show');
      });
    });

    // Marcar tema ativo
    this.updateActiveOption();
  }

  // Configurar tema automático
  setupAutoTheme() {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addListener(() => {
        if (this.currentTheme === 'auto') {
          this.applyTheme();
        }
      });
    }
  }

  // Definir tema
  setTheme(themeName) {
    this.currentTheme = themeName;
    localStorage.setItem('g8-theme', themeName);
    this.applyTheme();
    this.updateToggler();
    this.updateActiveOption();

    // Notificar mudança
    if (window.notifications) {
      const name = themeName === 'auto' ? 'Automático' : this.themes[themeName]?.name;
      notifications.success(`Tema alterado para: ${name}`, {
        duration: 2000,
        title: 'Tema'
      });
    }
  }

  // Aplicar tema
  applyTheme() {
    let effectiveTheme = this.currentTheme;
    
    // Resolver tema automático
    if (effectiveTheme === 'auto') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    const theme = this.themes[effectiveTheme];
    if (!theme) return;

    // Aplicar variáveis CSS
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Adicionar classe ao body
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    document.body.classList.add(`theme-${effectiveTheme}`);

    // Atualizar meta theme-color
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.content = theme.colors['--primary'];
    }
  }

  // Atualizar botão do toggler
  updateToggler() {
    const btn = document.getElementById('theme-btn');
    if (!btn) return;

    const icon = btn.querySelector('.theme-icon');
    const text = btn.querySelector('.theme-text');
    
    if (icon) icon.textContent = this.getCurrentThemeIcon();
    if (text) text.textContent = this.getCurrentThemeName();
  }

  // Atualizar opção ativa
  updateActiveOption() {
    const options = document.querySelectorAll('.theme-option');
    options.forEach(option => {
      option.classList.toggle('active', option.dataset.theme === this.currentTheme);
    });
  }

  // Obter ícone do tema atual
  getCurrentThemeIcon() {
    if (this.currentTheme === 'auto') return '🔄';
    return this.themes[this.currentTheme]?.icon || '🎨';
  }

  // Obter nome do tema atual
  getCurrentThemeName() {
    if (this.currentTheme === 'auto') return 'Auto';
    return this.themes[this.currentTheme]?.name || 'Personalizado';
  }

  // Alternar entre temas principais
  toggleTheme() {
    const order = ['auto', 'light', 'dark'];
    const currentIndex = order.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % order.length;
    this.setTheme(order[nextIndex]);
  }

  // Obter tema atual
  getCurrentTheme() {
    return this.currentTheme;
  }

  // Verificar se está em modo escuro
  isDarkMode() {
    if (this.currentTheme === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return ['dark', 'ocean'].includes(this.currentTheme);
  }

  // Adicionar tema personalizado
  addCustomTheme(name, config) {
    this.themes[name] = config;
    
    // Recriar dropdown se existir
    const dropdown = document.getElementById('theme-dropdown');
    if (dropdown) {
      this.createThemeToggler();
    }
  }

  // Remover tema
  removeTheme(name) {
    if (this.themes[name] && name !== 'light' && name !== 'dark') {
      delete this.themes[name];
      
      // Mudar para tema padrão se o removido estava ativo
      if (this.currentTheme === name) {
        this.setTheme('auto');
      }
    }
  }
}

// Exportar para uso global
window.ThemeSystem = ThemeSystem;

// Instanciar sistema global
window.themeSystem = new ThemeSystem();

// Atalho de teclado para alternar tema (Ctrl + T)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 't') {
    e.preventDefault();
    window.themeSystem.toggleTheme();
  }
});
