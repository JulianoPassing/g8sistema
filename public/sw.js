// ========== SERVICE WORKER G8SISTEMA ==========

const CACHE_NAME = 'g8sistema-v1.2.0';
const STATIC_CACHE = 'g8sistema-static-v4';
const DYNAMIC_CACHE = 'g8sistema-dynamic-v4';

// Arquivos para cache estático (prioridade: páginas e assets locais)
const STATIC_FILES = [
  '/',
  '/index.html',
  '/painel.html',
  '/painel-clientes.html',
  '/pantaneiro5.html',
  '/pantaneiro7.html',
  '/steitz.html',
  '/cesari.html',
  '/bkb.html',
  '/distribuicao.html',
  '/distribuicao-carrinho.html',
  '/b2b-login.html',
  '/b2b-pantaneiro5.html',
  '/b2b-pantaneiro7.html',
  '/b2b-steitz.html',
  '/b2b-cesari.html',
  '/b2b-pedidos.html',
  '/pedidos.html',
  '/clientes.json',
  '/mobile.css',
  '/modern-design.css',
  '/professional-ui.css',
  '/connection-status.css',
  '/mobile-menu.js',
  '/table-mobile-cards.js',
  '/connection-monitor.js',
  '/auth.js',
  '/cache-system.js',
  '/notification-system.js',
  '/loading-system.js',
  '/common-utils.js',
  '/offline-system.js',
  '/draft-system.js',
  '/advanced-notifications.js',
  '/animations.js',
  '/theme-system.js',
  '/visual-feedback.js',
  '/visibility-fix.js',
  '/light-theme-only.js',
  '/dashboard-metrics.js',
  '/editor-pedido.js',
  '/pedidos.js',
  '/pantaneiro-tabelas-export.js',
  '/manifest.json',
  '/sw-register.js'
];

// Recursos externos (cache separado - falhas não bloqueiam instalação)
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
  'https://i.imgur.com/WveVVY5.png',
  'https://i.imgur.com/vjq26ym.png'
];

// Instalar Service Worker - cache local primeiro, externos em paralelo (falhas não bloqueiam)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        // Cachear arquivos locais (críticos - falha em um não bloqueia outros)
        const localPromises = STATIC_FILES.map(url => cache.add(url).catch(() => {}));
        
        // Cachear recursos externos em paralelo (opcional - CORS pode falhar offline)
        const externalPromises = EXTERNAL_ASSETS.map(url => 
          cache.add(new Request(url, { mode: 'cors' })).catch(() => {})
        );
        
        return Promise.all([...localPromises, ...externalPromises]);
      })
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remover caches antigos
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Assumir controle imediatamente
      return self.clients.claim();
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Ignorar requisições não-HTTP
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Estratégia para diferentes tipos de requisição
  if (request.url.includes('/api/')) {
    // APIs: Network First (tentar rede primeiro, fallback para cache)
    event.respondWith(networkFirstStrategy(request));
  } else if (request.url.includes('clientes.json')) {
    // clientes.json: Cache First (essencial para pedidos offline)
    event.respondWith(cacheFirstStrategy(request));
  } else if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    // Páginas HTML: Cache First com fallback offline
    event.respondWith(cacheFirstStrategy(request));
  } else if (STATIC_FILES.some(file => request.url.includes(file))) {
    // Arquivos estáticos: Cache First
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // Outros recursos: Stale While Revalidate
    event.respondWith(staleWhileRevalidateStrategy(request));
  }
});

// Estratégia Cache First
async function cacheFirstStrategy(request) {
  try {
    // Primeiro, tentar buscar do cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Tentar atualizar em background se for uma página HTML
      if (request.destination === 'document') {
        updateCacheInBackground(request);
      }
      
      return cachedResponse;
    }
    
    // Se não estiver no cache, buscar da rede
    const networkResponse = await fetch(request);
    
    // Adicionar ao cache se a resposta for válida
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback para páginas HTML
    if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
      // Tentar servir página similar do cache
      const fallbackPages = [
        '/index.html',
        '/painel.html',
        '/b2b-login.html'
      ];
      
      for (const fallback of fallbackPages) {
        const fallbackResponse = await caches.match(fallback);
        if (fallbackResponse) {
          return fallbackResponse;
        }
      }
      
      // Último recurso: página offline com design G8 (mostra pendentes se houver)
      const pendingScript = `
        (function(){
          try {
            var orders = JSON.parse(localStorage.getItem('g8_pending_orders') || '[]');
            var edits = JSON.parse(localStorage.getItem('g8_pending_edits') || '[]');
            if (orders.length > 0 || edits.length > 0) {
              var box = document.getElementById('g8-offline-pending');
              if (box) {
                box.style.display = 'block';
                box.innerHTML = '<h3>📋 Pendentes de envio</h3><p><strong>' + orders.length + '</strong> pedido(s) e <strong>' + edits.length + '</strong> edição(ões) serão enviados automaticamente quando a conexão retornar.</p>';
              }
            }
          } catch(e){}
        })();
      `;
      return new Response(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="theme-color" content="#ff0000">
          <title>G8 Sistema - Offline</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px 20px; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%); }
            .offline-card { background: white; border-radius: 16px; padding: 40px; max-width: 420px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 1px solid #ffe0e0; }
            .offline-icon { font-size: 64px; margin-bottom: 20px; }
            h1 { color: #333; font-size: 1.5rem; margin-bottom: 16px; }
            .offline-message { color: #666; margin: 20px 0; line-height: 1.6; }
            #g8-offline-pending { display: none; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 10px; padding: 16px; margin: 16px 0; text-align: left; }
            #g8-offline-pending h3 { font-size: 0.95rem; color: #92400e; margin-bottom: 8px; }
            #g8-offline-pending p { font-size: 0.9rem; color: #78350f; }
            .retry-btn { background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%); color: white; padding: 14px 28px; border: none; border-radius: 12px; cursor: pointer; font-size: 16px; font-weight: 600; margin-top: 20px; }
            .retry-btn:hover { opacity: 0.9; }
          </style>
        </head>
        <body>
          <div class="offline-card">
            <div class="offline-icon">📡</div>
            <h1>Sem Conexão</h1>
            <div class="offline-message">
              <p>Você está offline. O G8 Sistema pode ser usado parcialmente:</p>
              <p style="margin-top:12px;font-size:0.9rem">• Navegar entre páginas já visitadas<br>• Visualizar dados em cache<br>• Pedidos serão enviados ao reconectar</p>
            </div>
            <div id="g8-offline-pending"></div>
            <p style="margin-top:16px;font-size:0.9rem"><strong>Dica:</strong> Visite o sistema com internet primeiro para habilitar o modo offline. Depois você poderá abrir e digitar pedidos mesmo sem conexão.</p>
            <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
              <a href="/index.html" style="color:#ff0000;font-weight:600;text-decoration:underline;">Login</a>
              <a href="/painel.html" style="color:#ff0000;font-weight:600;text-decoration:underline;">Painel</a>
              <a href="/pantaneiro7.html" style="color:#ff0000;font-weight:600;text-decoration:underline;">Pedidos</a>
            </div>
            <button class="retry-btn" onclick="location.reload()">🔄 Tentar Novamente</button>
          </div>
          <script>${pendingScript}</script>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    throw error;
  }
}

// Atualizar cache em background
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Ignorar erros de atualização em background
  }
}

// Estratégia Network First
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cachear resposta se for bem-sucedida e método permitido
    if (networkResponse.status === 200 && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Retornar resposta de erro personalizada para APIs
    return new Response(JSON.stringify({
      error: 'Sem conexão',
      message: 'Não foi possível conectar ao servidor',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Estratégia Stale While Revalidate
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Buscar versão atualizada em background
  const networkResponsePromise = fetch(request).then((networkResponse) => {
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Ignorar erros de rede silenciosamente
    return null;
  });
  
  // Retornar cache imediatamente se disponível, senão aguardar rede
  return cachedResponse || networkResponsePromise;
}

// Limpeza periódica de cache
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAN_CACHE') {
    cleanOldCache();
  }
});

async function cleanOldCache() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const keys = await cache.keys();
  
  // Manter apenas os 50 itens mais recentes
  if (keys.length > 50) {
    const keysToDelete = keys.slice(0, keys.length - 50);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

// Notificar cliente sobre atualizações
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Sincronização em background (quando voltar online) - conectado ao offline-system
self.addEventListener('sync', (event) => {
  if (event.tag === 'g8-pending-orders') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: 'G8_SYNC_PENDING', source: 'service-worker' });
  }
}
