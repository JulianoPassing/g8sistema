// ========== REGISTRO DO SERVICE WORKER - G8SISTEMA ==========
// Inclua este script em todas as páginas para garantir PWA offline

(function() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        // Verificar atualizações periodicamente (a cada 60s)
        setInterval(function() {
          registration.update();
        }, 60000);

        registration.addEventListener('updatefound', function() {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Pedir ao novo SW para assumir controle imediatamente
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(function() {});

    // Quando o SW assumir controle (após SKIP_WAITING), recarregar para aplicar atualizações
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      window.location.reload();
    });
  });
})();
