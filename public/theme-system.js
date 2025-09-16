/**
 * Sistema de Temas G8
 * Permite alternar entre diferentes temas visuais
 */

class G8ThemeSystem {
  constructor() {
    this.currentTheme = 'g8-default';
    this.themes = {
      'g8-default': {
        name: 'G8 Clássico',
        colors: {
          primary: '#ff0000',
          secondary: '#000000',
          background: '#ffffff',
          surface: '#fafafa',
          text: '#000000',
          textMuted: '#666666'
        },
        gradients: {
          primary: 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)',
          secondary: 'linear-gradient(135deg, #000000 0%, #333333 100%)'
        }
      },
      'g8-dark': {
        name: 'G8 Escuro',
        colors: {
          primary: '#ff3333',
          secondary: '#ffffff',
          background: '#1a1a1a',
          surface: '#2d2d2d',
          text: '#ffffff',
          textMuted: '#cccccc'
        },
        gradients: {
          primary: 'linear-gradient(135deg, #ff3333 0%, #ff0000 100%)',
          secondary: 'linear-gradient(135deg, #333333 0%, #000000 100%)'
        }
      },
      'g8-minimal': {
        name: 'G8 Minimalista',
        colors: {
          primary: '#ff0000',
          secondary: '#f5f5f5',
          background: '#ffffff',
          surface: '#ffffff',
          text: '#000000',
          textMuted: '#888888'
        },
        gradients: {
          primary: 'linear-gradient(135deg, #ff0000 0%, #e60000 100%)',
          secondary: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)'
        }
      },
      'g8-professional': {
        name: 'G8 Profissional',
        colors: {
          primary: '#cc0000',
          secondary: '#1a1a1a',
          background: '#f8f9fa',
          surface: '#ffffff',
          text: '#2c3e50',
          textMuted: '#7f8c8d'
        },
        gradients: {
          primary: 'linear-gradient(135deg, #cc0000 0%, #990000 100%)',
          secondary: 'linear-gradient(135deg, #2c3e50 0%, #1a1a1a 100%)'
        }
      }
    };
    
    this.init();
  }

  init() {
    this.loadSavedTheme();
    this.createThemeToggle();
    this.applyTheme(this.currentTheme);
  }

  loadSavedTheme() {
    const saved = localStorage.getItem('g8-theme');
    if (saved && this.themes[saved]) {
      this.currentTheme = saved;
    }
  }

  saveTheme(themeName) {
    localStorage.setItem('g8-theme', themeName);
  }

  createThemeToggle() {
    // Criar seletor de tema
    const themeToggle = document.createElement('div');
    themeToggle.className = 'g8-theme-toggle';
    themeToggle.innerHTML = `
      <button class="theme-toggle-btn" onclick="g8ThemeSystem.toggleThemeSelector()">
        <i class="fas fa-palette"></i>
        <span>Tema</span>
      </button>
      <div class="theme-selector" id="g8-theme-selector">
        <div class="theme-selector-header">
          <h3>Escolha o Tema</h3>
          <button onclick="g8ThemeSystem.toggleThemeSelector()" class="close-btn">×</button>
        </div>
        <div class="theme-options">
          ${Object.entries(this.themes).map(([key, theme]) => `
            <div class="theme-option ${key === this.currentTheme ? 'active' : ''}" 
                 onclick="g8ThemeSystem.setTheme('${key}')">
              <div class="theme-preview">
                <div class="preview-primary" style="background: ${theme.colors.primary}"></div>
                <div class="preview-secondary" style="background: ${theme.colors.secondary}"></div>
                <div class="preview-surface" style="background: ${theme.colors.surface}"></div>
              </div>
              <div class="theme-info">
                <div class="theme-name">${theme.name}</div>
                <div class="theme-description">
                  ${key === 'g8-default' ? 'Tema padrão com as cores clássicas' : 
                    key === 'g8-dark' ? 'Tema escuro para ambientes com pouca luz' :
                    key === 'g8-minimal' ? 'Design limpo e minimalista' :
                    'Visual profissional para apresentações'}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Adicionar ao header se existir, senão ao body
    const header = document.querySelector('.header-right') || document.body;
    if (header.classList && header.classList.contains('header-right')) {
      header.insertBefore(themeToggle, header.firstChild);
    } else {
      header.appendChild(themeToggle);
    }

    this.addThemeStyles();
  }

  addThemeStyles() {
    const styles = `
      .g8-theme-toggle {
        position: relative;
        display: inline-block;
      }

      .theme-toggle-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 12px;
        background: var(--gradient-light, linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%));
        border: 1px solid var(--border-color, #e0e0e0);
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--text-color, #000000);
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .theme-toggle-btn:hover {
        background: var(--gradient-primary, linear-gradient(135deg, #ff0000 0%, #cc0000 100%));
        color: white;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }

      .theme-selector {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 8px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        border: 1px solid var(--border-color, #e0e0e0);
        min-width: 320px;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(12px);
      }

      .theme-selector.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .theme-selector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color, #e0e0e0);
      }

      .theme-selector-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-color, #000000);
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--text-muted, #666666);
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .close-btn:hover {
        background: var(--primary-color, #ff0000);
        color: white;
      }

      .theme-options {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .theme-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid transparent;
      }

      .theme-option:hover {
        background: rgba(255, 0, 0, 0.05);
        transform: translateX(4px);
      }

      .theme-option.active {
        border-color: var(--primary-color, #ff0000);
        background: rgba(255, 0, 0, 0.1);
      }

      .theme-preview {
        display: flex;
        width: 60px;
        height: 40px;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .preview-primary {
        flex: 1;
      }

      .preview-secondary {
        flex: 1;
      }

      .preview-surface {
        flex: 1;
      }

      .theme-info {
        flex: 1;
      }

      .theme-name {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--text-color, #000000);
        margin-bottom: 2px;
      }

      .theme-description {
        font-size: 0.8rem;
        color: var(--text-muted, #666666);
        line-height: 1.3;
      }

      /* Responsividade */
      @media (max-width: 768px) {
        .theme-selector {
          right: -50px;
          left: -50px;
          min-width: auto;
        }

        .theme-toggle-btn span {
          display: none;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  toggleThemeSelector() {
    const selector = document.getElementById('g8-theme-selector');
    selector.classList.toggle('show');

    // Fechar ao clicar fora
    if (selector.classList.contains('show')) {
      setTimeout(() => {
        document.addEventListener('click', this.handleOutsideClick.bind(this), { once: true });
      }, 100);
    }
  }

  handleOutsideClick(event) {
    const selector = document.getElementById('g8-theme-selector');
    const toggle = document.querySelector('.g8-theme-toggle');
    
    if (!toggle.contains(event.target)) {
      selector.classList.remove('show');
    }
  }

  setTheme(themeName) {
    if (!this.themes[themeName]) return;

    this.currentTheme = themeName;
    this.saveTheme(themeName);
    this.applyTheme(themeName);
    
    // Atualizar seleção visual
    document.querySelectorAll('.theme-option').forEach(option => {
      option.classList.remove('active');
    });
    document.querySelector(`.theme-option[onclick*="${themeName}"]`)?.classList.add('active');

    // Fechar seletor
    document.getElementById('g8-theme-selector').classList.remove('show');

    // Notificação
    if (window.advancedNotifications) {
      advancedNotifications.g8Primary(`Tema "${this.themes[themeName].name}" aplicado!`, {
        title: 'Tema Alterado',
        duration: 3000
      });
    }
  }

  applyTheme(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return;

    const root = document.documentElement;
    
    // Aplicar cores principais
    Object.entries(theme.colors).forEach(([property, value]) => {
      const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--g8-${cssProperty}`, value);
      
      // Compatibilidade com variáveis existentes
      const legacyMappings = {
        'primary': '--primary-color',
        'secondary': '--secondary-color',
        'background': '--bg-color',
        'surface': '--card-bg',
        'text': '--text-color',
        'textMuted': '--text-muted'
      };
      
      if (legacyMappings[property]) {
        root.style.setProperty(legacyMappings[property], value);
      }
    });

    // Aplicar gradientes
    Object.entries(theme.gradients).forEach(([property, value]) => {
      root.style.setProperty(`--gradient-g8-${property}`, value);
      
      if (property === 'primary') {
        root.style.setProperty('--gradient-primary', value);
      }
    });

    // Aplicar classe do tema ao body
    document.body.className = document.body.className.replace(/g8-theme-\w+/g, '');
    document.body.classList.add(`g8-theme-${themeName}`);

    // Disparar evento customizado
    window.dispatchEvent(new CustomEvent('g8ThemeChanged', {
      detail: { theme: themeName, colors: theme.colors }
    }));
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  getThemeColors() {
    return this.themes[this.currentTheme]?.colors || {};
  }

  // Método para criar temas personalizados
  createCustomTheme(name, colors, gradients = {}) {
    this.themes[`g8-custom-${name}`] = {
      name: `G8 ${name}`,
      colors,
      gradients: {
        primary: gradients.primary || `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        secondary: gradients.secondary || `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)`,
        ...gradients
      }
    };
  }

  // Auto-detecção de preferência do sistema
  setupSystemThemeDetection() {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleThemeChange = (e) => {
        if (!localStorage.getItem('g8-theme')) {
          this.setTheme(e.matches ? 'g8-dark' : 'g8-default');
        }
      };

      darkModeQuery.addListener(handleThemeChange);
      handleThemeChange(darkModeQuery);
    }
  }
}

// Instância global
window.g8ThemeSystem = new G8ThemeSystem();

// Configurar detecção automática de tema do sistema
document.addEventListener('DOMContentLoaded', () => {
  g8ThemeSystem.setupSystemThemeDetection();
});

// Atalhos de teclado para temas
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case '1':
        e.preventDefault();
        g8ThemeSystem.setTheme('g8-default');
        break;
      case '2':
        e.preventDefault();
        g8ThemeSystem.setTheme('g8-dark');
        break;
      case '3':
        e.preventDefault();
        g8ThemeSystem.setTheme('g8-minimal');
        break;
      case '4':
        e.preventDefault();
        g8ThemeSystem.setTheme('g8-professional');
        break;
    }
  }
});
