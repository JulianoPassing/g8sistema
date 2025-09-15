// ========== SISTEMA DE TEMA SIMPLES (CLARO/ESCURO) ========== 

let isDarkTheme = false;

// Temas
const lightTheme = {
  background: '#ffffff',
  surface: '#f8fafc',
  text: '#1f2937',
  textMuted: '#6b7280',
  primary: '#2563eb',
  border: '#e5e7eb'
};

const darkTheme = {
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  primary: '#3b82f6',
  border: '#334155'
};

// Aplicar tema
function applyTheme(dark = false) {
  const theme = dark ? darkTheme : lightTheme;
  const root = document.documentElement;
  
  // Aplicar variáveis CSS
  root.style.setProperty('--background', theme.background);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--text-primary', theme.text);
  root.style.setProperty('--text-muted', theme.textMuted);
  root.style.setProperty('--primary-color', theme.primary);
  root.style.setProperty('--border', theme.border);
  
  // Variáveis adicionais para compatibilidade
  root.style.setProperty('--bg-color', theme.background);
  root.style.setProperty('--card-bg', theme.surface);
  root.style.setProperty('--text-color', theme.text);
  root.style.setProperty('--border-color', theme.border);
  root.style.setProperty('--secondary-color', theme.textMuted);
  
  // Aplicar no body também
  document.body.style.backgroundColor = theme.background;
  document.body.style.color = theme.text;
  
  // Adicionar classe no body
  document.body.classList.toggle('dark-theme', dark);
  document.body.classList.toggle('light-theme', !dark);
  
  isDarkTheme = dark;
}

// Criar botão de alternância
function createToggleButton() {
  // Remover botão existente
  const existing = document.getElementById('theme-toggle');
  if (existing) existing.remove();
  
  const button = document.createElement('button');
  button.id = 'theme-toggle';
  button.innerHTML = isDarkTheme ? '☀️ Claro' : '🌙 Escuro';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 8px 16px;
    color: inherit;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  `;
  
  button.addEventListener('click', toggleTheme);
  
  // Hover effect
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
  });
  
  document.body.appendChild(button);
}

// Alternar tema
function toggleTheme() {
  isDarkTheme = !isDarkTheme;
  applyTheme(isDarkTheme);
  
  // Salvar preferência
  localStorage.setItem('dark-theme', isDarkTheme.toString());
  
  // Atualizar botão
  const button = document.getElementById('theme-toggle');
  if (button) {
    button.innerHTML = isDarkTheme ? '☀️ Claro' : '🌙 Escuro';
  }
  
  console.log(`Tema alterado para: ${isDarkTheme ? 'Escuro' : 'Claro'}`);
}

// Carregar preferência salva
function loadSavedTheme() {
  const saved = localStorage.getItem('dark-theme');
  if (saved !== null) {
    isDarkTheme = saved === 'true';
  } else {
    // Usar preferência do sistema por padrão
    isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}

// Inicializar
function initTheme() {
  loadSavedTheme();
  applyTheme(isDarkTheme);
  createToggleButton();
  
  console.log('Sistema de tema inicializado:', isDarkTheme ? 'Escuro' : 'Claro');
}

// Executar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTheme);
} else {
  initTheme();
}

// Atalho de teclado (Ctrl + D para Dark/Light)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'd') {
    e.preventDefault();
    toggleTheme();
  }
});

// Escutar mudanças na preferência do sistema
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  // Só aplicar automaticamente se não houver preferência salva
  const saved = localStorage.getItem('dark-theme');
  if (saved === null) {
    isDarkTheme = e.matches;
    applyTheme(isDarkTheme);
    const button = document.getElementById('theme-toggle');
    if (button) {
      button.innerHTML = isDarkTheme ? '☀️ Claro' : '🌙 Escuro';
    }
  }
});

// Exportar para uso global
window.toggleTheme = toggleTheme;
window.isDarkTheme = () => isDarkTheme;
