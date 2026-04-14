/**
 * Snapshots locais (IndexedDB) de clientes e pedidos para uso sem internet.
 * Catálogos (produtos) já vêm no HTML das páginas e são cacheados pelo Service Worker.
 */
(function (global) {
  'use strict';

  var DB_NAME = 'G8OfflineSnapshots';
  var DB_VERSION = 1;
  var STORE = 'snapshots';

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  function idbPut(key, data) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({ key: key, data: data, t: Date.now() });
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function idbGet(key) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var r = tx.objectStore(STORE).get(key);
        r.onsuccess = function () {
          resolve(r.result ? r.result.data : null);
        };
        r.onerror = function () {
          reject(r.error);
        };
      });
    });
  }

  function fetchClientesNet() {
    return fetch('/api/clientes').then(function (r) {
      if (!r.ok) throw new Error('api');
      return r.json();
    }).then(function (data) {
      if (!Array.isArray(data)) throw new Error('bad');
      return idbPut('clientes', data).then(function () {
        return data;
      });
    });
  }

  function fetchPedidosNet() {
    return fetch('/api/pedidos').then(function (r) {
      if (!r.ok) throw new Error('api');
      return r.json();
    }).then(function (data) {
      if (!Array.isArray(data)) throw new Error('bad');
      return idbPut('pedidos', data).then(function () {
        return data;
      });
    });
  }

  function getClientes() {
    if (global.navigator.onLine) {
      return fetchClientesNet().catch(function (e) {
        console.warn('[G8OfflineData] /api/clientes:', e);
        return idbGet('clientes').then(function (cached) {
          if (cached && Array.isArray(cached)) return cached;
          return fetch('clientes.json')
            .then(function (r) {
              return r.ok ? r.json() : [];
            })
            .then(function (j) {
              if (Array.isArray(j) && j.length) {
                return idbPut('clientes', j).then(function () {
                  return j;
                });
              }
              return [];
            })
            .catch(function () {
              return [];
            });
        });
      });
    }
    return idbGet('clientes').then(function (cached) {
      if (cached && Array.isArray(cached)) return cached;
      return fetch('clientes.json')
        .then(function (r) {
          return r.ok ? r.json() : [];
        })
        .catch(function () {
          return [];
        });
    });
  }

  function getPedidos() {
    if (global.navigator.onLine) {
      return fetchPedidosNet().catch(function (e) {
        console.warn('[G8OfflineData] /api/pedidos:', e);
        return idbGet('pedidos').then(function (cached) {
          return Array.isArray(cached) ? cached : [];
        });
      });
    }
    return idbGet('pedidos').then(function (cached) {
      return Array.isArray(cached) ? cached : [];
    });
  }

  function prefetchAll() {
    if (!global.navigator.onLine) return Promise.resolve();
    return Promise.all([
      fetchClientesNet().catch(function () {}),
      fetchPedidosNet().catch(function () {})
    ]);
  }

  /** Páginas HTML para aquecer o cache do Service Worker (catálogos + painéis). */
  var WARM_HTML_PATHS = [
    '/painel.html',
    '/pedidos.html',
    '/painel-clientes.html',
    '/pantaneiro5.html',
    '/pantaneiro7.html',
    '/steitz.html',
    '/cesari.html',
    '/bkb.html',
    '/distribuicao.html',
    '/distribuicao-carrinho.html',
    '/b2b-login.html',
    '/b2b-pedidos.html',
    '/b2b-pantaneiro5.html',
    '/b2b-pantaneiro7.html',
    '/b2b-steitz.html',
    '/b2b-cesari.html',
    '/index.html'
  ];

  function warmHtmlCache() {
    return Promise.all(
      WARM_HTML_PATHS.map(function (path) {
        return fetch(path, {
          credentials: 'same-origin',
          cache: 'no-cache'
        }).catch(function () {});
      })
    );
  }

  /**
   * Chamado após login: grava clientes + pedidos no IndexedDB e pré-carrega páginas no SW.
   * @returns {Promise<{ clientes: number, pedidos: number }|null>}
   */
  function syncAllOnLogin() {
    if (!global.navigator.onLine) {
      return Promise.resolve(null);
    }
    var cCount = 0;
    var pCount = 0;
    return Promise.all([
      fetchClientesNet()
        .then(function (d) {
          cCount = Array.isArray(d) ? d.length : 0;
        })
        .catch(function () {}),
      fetchPedidosNet()
        .then(function (d) {
          pCount = Array.isArray(d) ? d.length : 0;
        })
        .catch(function () {})
    ]).then(function () {
      return warmHtmlCache().then(function () {
        return { clientes: cCount, pedidos: pCount };
      });
    });
  }

  global.G8OfflineData = {
    getClientes: getClientes,
    getPedidos: getPedidos,
    prefetchAll: prefetchAll,
    syncAllOnLogin: syncAllOnLogin,
    warmHtmlCache: warmHtmlCache,
    _idbPut: idbPut,
    _idbGet: idbGet
  };

  global.addEventListener('online', function () {
    setTimeout(function () {
      prefetchAll();
    }, 400);
  });

  function schedulePrefetch() {
    setTimeout(function () {
      prefetchAll();
    }, 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedulePrefetch);
  } else {
    schedulePrefetch();
  }
})(typeof window !== 'undefined' ? window : global);
