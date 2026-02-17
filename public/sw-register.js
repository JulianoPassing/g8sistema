// ========== REGISTRO DO SERVICE WORKER - G8SISTEMA ==========
// Inclua este script em todas as páginas para garantir PWA offline

(function() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        registration.addEventListener('updatefound', function() {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (typeof window.notifications !== 'undefined') {
                window.notifications.info('Nova versão disponível. Recarregue para atualizar.', {
                  title: 'Atualização',
                  duration: 10000,
                  closable: true
                });
              } else if (typeof alert !== 'undefined') {
                if (confirm('Nova versão disponível. Recarregar agora?')) {
                  window.location.reload();
                }
              }
            }
          });
        });
      })
      .catch(function() {});
  });
})();
