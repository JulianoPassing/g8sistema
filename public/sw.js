// ========== SERVICE WORKER G8SISTEMA ==========

const CACHE_NAME = 'g8sistema-v1.1.0';
const STATIC_CACHE = 'g8sistema-static-v2';
const DYNAMIC_CACHE = 'g8sistema-dynamic-v2';

// Arquivos para cache estático
const STATIC_FILES = [
  '/',
  '/index.html',
  '/painel.html',
  '/painel-clientes.html',
  '/pantaneiro5.html',
  '/pantaneiro7.html',
  '/steitz.html',
  '/b2b-login.html',
  '/b2b-pantaneiro5.html',
  '/b2b-pantaneiro7.html',
  '/b2b-steitz.html',
  '/b2b-pedidos.html',
  '/pedidos.html',
  '/mobile.css',
  '/modern-design.css',
  '/mobile-menu.js',
  '/auth.js',
  '/cache-system.js',
  '/notification-system.js',
  '/loading-system.js',
  '/common-utils.js',
  '/offline-system.js',
  '/advanced-notifications.js',
  '/console-protection.js',
  '/animations.js',
  '/theme-system.js',
  '/visual-feedback.js',
  '/visibility-fix.js',
  '/light-theme-only.js',
  '/dashboard-metrics.js',
  '/editor-pedido.js',
  '/pedidos.js',
  '/clientes.json',
  '/users.json',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://i.imgur.com/WveVVY5.png',
  'https://i.imgur.com/vjq26ym.png'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_FILES.map(url => {
          // Tratar URLs externas
          if (url.startsWith('http')) {
            return new Request(url, { mode: 'cors' });
          }
          return url;
        }));
      })
      .catch((error) => {
        // Erro silencioso
      })
  );
  
  // Forçar ativação imediata
  self.skipWaiting();
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
      
      // Último recurso: página offline básica
      return new Response(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>G8 Sistema - Offline</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline-message { color: #666; margin: 20px 0; }
            .retry-btn { background: #ff0000; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>🚫 Sem Conexão</h1>
          <div class="offline-message">
            <p>Você está offline. Algumas funcionalidades podem não estar disponíveis.</p>
            <p>Tente conectar à internet e recarregar a página.</p>
          </div>
          <button class="retry-btn" onclick="location.reload()">🔄 Tentar Novamente</button>
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

// Sincronização em background (quando voltar online)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  
  // Aqui você pode implementar lógica para sincronizar dados
  // quando a conexão for restabelecida
  
  try {
    // Exemplo: reenviar formulários pendentes
    const pendingForms = await getPendingForms();
    
    for (const form of pendingForms) {
      try {
        await fetch(form.url, {
          method: form.method,
          headers: form.headers,
          body: form.body
        });
        
        // Remover da lista de pendentes se bem-sucedido
        await removePendingForm(form.id);
      } catch (error) {
        console.error('Erro na sincronização:', error);
      }
    }
  } catch (error) {
    console.error('Erro na sincronização em background:', error);
  }
}

// Funções auxiliares para sincronização
async function getPendingForms() {
  // Implementar lógica para obter formulários pendentes
  return [];
}

async function removePendingForm(id) {
  // Implementar lógica para remover formulário da lista de pendentes
}
