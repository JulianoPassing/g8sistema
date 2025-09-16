// ========== FORÇAR TEMA CLARO SEMPRE ========== 

// Garantir que o tema seja sempre claro
function forceLightTheme() {
  const root = document.documentElement;
  
  // Aplicar cores do tema claro
  root.style.setProperty('--background', '#ffffff');
  root.style.setProperty('--surface', '#f8fafc');
  root.style.setProperty('--text-primary', '#1f2937');
  root.style.setProperty('--text-muted', '#6b7280');
  root.style.setProperty('--primary-color', '#2563eb');
  root.style.setProperty('--border', '#e5e7eb');
  root.style.setProperty('--bg-color', '#ffffff');
  root.style.setProperty('--card-bg', '#f8fafc');
  root.style.setProperty('--text-color', '#1f2937');
  root.style.setProperty('--border-color', '#e5e7eb');
  
  // Aplicar no body se existir
  if (document.body) {
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#1f2937';
  }
  
  // Remover qualquer classe de tema escuro se o body existir
  if (document.body) {
    document.body.classList.remove('dark-theme', 'theme-dark');
    document.body.classList.add('light-theme');
  }
  
  // Limpar localStorage de temas
  localStorage.removeItem('dark-theme');
  localStorage.removeItem('g8-theme');
}

// Executar imediatamente
forceLightTheme();

// Executar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', forceLightTheme);
} else {
  forceLightTheme();
}

// Executar após carregamento completo
window.addEventListener('load', forceLightTheme);

console.log('Tema claro forçado - sistema de temas removido');
