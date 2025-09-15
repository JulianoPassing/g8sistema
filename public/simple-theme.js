// ========== SISTEMA DE TEMAS SIMPLIFICADO ========== 

// Temas disponíveis
const themes = {
  auto: { name: 'Automático', icon: '🔄' },
  light: { 
    name: 'Claro', 
    icon: '☀️',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1f2937',
    primary: '#2563eb'
  },
  dark: { 
    name: 'Escuro', 
    icon: '🌙',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f8fafc',
    primary: '#3b82f6'
  },
  ocean: { 
    name: 'Oceano', 
    icon: '🌊',
    background: '#0c4a6e',
    surface: '#075985',
    text: '#e0f2fe',
    primary: '#0891b2'
  },
  sunset: { 
    name: 'Pôr do Sol', 
    icon: '🌅',
    background: '#451a03',
    surface: '#78350f',
    text: '#fef3c7',
    primary: '#f59e0b'
  }
};

let currentTheme = 'auto';

// Aplicar tema
function applyTheme(themeName) {
  let theme = themes[themeName];
  
  if (themeName === 'auto') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = themes[isDark ? 'dark' : 'light'];
  }
  
  if (!theme || !theme.background) return;
  
  // Aplicar diretamente no body
  document.body.style.backgroundColor = theme.background;
  document.body.style.color = theme.text;
  
  // Aplicar nas variáveis CSS
  const root = document.documentElement;
  root.style.setProperty('--background', theme.background);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--text-primary', theme.text);
  root.style.setProperty('--primary-color', theme.primary);
  root.style.setProperty('--bg-color', theme.background);
  root.style.setProperty('--card-bg', theme.surface);
  root.style.setProperty('--text-color', theme.text);
  
  console.log(`Tema aplicado: ${themeName}`, theme);
}

// Criar botão de tema
function createThemeButton() {
  // Remover botão existente
  const existing = document.getElementById('simple-theme-btn');
  if (existing) existing.remove();
  
  const button = document.createElement('button');
  button.id = 'simple-theme-btn';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 8px 12px;
    color: inherit;
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  function updateButton() {
    const theme = themes[currentTheme];
    button.innerHTML = `${theme.icon} ${theme.name}`;
  }
  
  button.addEventListener('click', () => {
    const themeKeys = Object.keys(themes);
    const currentIndex = themeKeys.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    currentTheme = themeKeys[nextIndex];
    
    localStorage.setItem('g8-theme', currentTheme);
    applyTheme(currentTheme);
    updateButton();
  });
  
  updateButton();
  document.body.appendChild(button);
}

// Carregar tema salvo
function loadSavedTheme() {
  const saved = localStorage.getItem('g8-theme');
  if (saved && themes[saved]) {
    currentTheme = saved;
  }
}

// Inicializar
function initSimpleTheme() {
  loadSavedTheme();
  applyTheme(currentTheme);
  createThemeButton();
  
  // Reaplicar após um delay
  setTimeout(() => applyTheme(currentTheme), 200);
}

// Executar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSimpleTheme);
} else {
  initSimpleTheme();
}

// Atalho de teclado
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 't') {
    e.preventDefault();
    document.getElementById('simple-theme-btn')?.click();
  }
});

console.log('Sistema de tema simplificado carregado');
