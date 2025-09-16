// ========== SERVICE WORKER G8SISTEMA ==========

const CACHE_NAME = 'g8sistema-v1.0.0';
const STATIC_CACHE = 'g8sistema-static-v1';
const DYNAMIC_CACHE = 'g8sistema-dynamic-v1';

// Arquivos para cache estático
const STATIC_FILES = [
  '/',
  '/index.html',
  '/painel.html',
  '/mobile.css',
  '/mobile-menu.js',
  '/auth.js',
  '/cache-system.js',
  '/notification-system.js',
  '/loading-system.js',
  '/common-utils.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Cache estático criado');
        return cache.addAll(STATIC_FILES.map(url => {
          // Tratar URLs externas
          if (url.startsWith('http')) {
            return new Request(url, { mode: 'cors' });
          }
          return url;
        }));
      })
      .catch((error) => {
        console.error('Erro ao criar cache estático:', error);
      })
  );
  
  // Forçar ativação imediata
  self.skipWaiting();
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Remover caches antigos
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Removendo cache antigo:', cacheName);
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
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Adicionar ao cache se a resposta for válida
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache First falhou:', error);
    
    // Fallback para página offline se disponível
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    
    throw error;
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
    console.log('Network falhou, tentando cache:', request.url);
    
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
    console.log('Cache limpo:', keysToDelete.length, 'itens removidos');
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
  console.log('Executando sincronização em background...');
  
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
