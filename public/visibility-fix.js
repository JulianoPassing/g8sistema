// ========== CORREÇÃO DE VISIBILIDADE ========== 

// Garantir que elementos com animação sejam visíveis
function ensureVisibility() {
  // Marcar todos os elementos animate-on-scroll como visíveis
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  animatedElements.forEach(element => {
    element.classList.add('visible');
  });

  // Garantir que cards e containers principais sejam visíveis
  const importantElements = document.querySelectorAll('.section-card, .option-card, .info-card, .login-container');
  importantElements.forEach(element => {
    element.style.opacity = '1';
    element.style.visibility = 'visible';
    element.style.transform = 'translateY(0)';
  });

  // Remover qualquer overlay de loading que possa estar escondendo conteúdo
  const loadingOverlays = document.querySelectorAll('.loading-overlay');
  loadingOverlays.forEach(overlay => {
    overlay.style.display = 'none';
  });
}

// Executar imediatamente
ensureVisibility();

// Executar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureVisibility);
} else {
  ensureVisibility();
}

// Executar quando janela carregar completamente
window.addEventListener('load', ensureVisibility);

// Executar após um pequeno delay para garantir
setTimeout(ensureVisibility, 500);
setTimeout(ensureVisibility, 1000);
