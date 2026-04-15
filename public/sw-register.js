// ========== REGISTRO DO SERVICE WORKER - G8SISTEMA ==========
// Inclua este script em todas as páginas para garantir PWA offline

(function() {
  if (!('serviceWorker' in navigator) || window.__g8SwRegisterInitialized) return;
  window.__g8SwRegisterInitialized = true;

  const UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 min
  const RELOAD_FLAG_KEY = 'g8_sw_reloaded_once';

  function safeReloadAfterControllerChange() {
    // Evita loop de reload entre versões do SW, comum em alguns navegadores mobile.
    if (sessionStorage.getItem(RELOAD_FLAG_KEY) === '1') return;
    sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
    window.location.reload();
  }

  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
      .then(function(registration) {
        setInterval(function() {
          registration.update().catch(function() {});
        }, UPDATE_INTERVAL_MS);

        registration.addEventListener('updatefound', function() {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Solicita ativação imediata da nova versão, sem forçar múltiplos reloads.
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(function() {});

    navigator.serviceWorker.addEventListener('controllerchange', safeReloadAfterControllerChange);
  });
})();
