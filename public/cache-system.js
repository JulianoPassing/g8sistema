// ========== SISTEMA DE CACHE INTELIGENTE ==========

class CacheSystem {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos
  }

  // Definir item no cache com TTL
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + ttl);
    
    // Limpar cache expirado automaticamente
    setTimeout(() => this.cleanup(key), ttl);
  }

  // Obter item do cache
  get(key) {
    if (!this.cache.has(key)) return null;
    
    const expiry = this.cacheExpiry.get(key);
    if (Date.now() > expiry) {
      this.cleanup(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  // Limpar item específico
  cleanup(key) {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  }

  // Limpar todo o cache
  clear() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  // Wrapper para fetch com cache automático
  async fetchWithCache(url, options = {}, ttl = this.defaultTTL) {
    const cacheKey = `fetch_${url}_${JSON.stringify(options)}`;
    
    // Verificar se existe no cache
    const cached = this.get(cacheKey);
    if (cached) {
      console.log(`Cache hit para: ${url}`);
      return cached;
    }

    try {
      console.log(`Fazendo requisição para: ${url}`);
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Armazenar no cache
      this.set(cacheKey, data, ttl);
      
      return data;
    } catch (error) {
      console.error(`Erro na requisição para ${url}:`, error);
      throw error;
    }
  }

  // Cache para dados de clientes
  async getClientes(forceRefresh = false) {
    const cacheKey = 'clientes_data';
    
    if (!forceRefresh) {
      const cached = this.get(cacheKey);
      if (cached) return cached;
    }

    try {
      const data = await this.fetchWithCache('/api/clientes', {}, 10 * 60 * 1000); // 10 minutos
      return data;
    } catch (error) {
      // Fallback para dados locais se a API falhar
      console.log('API indisponível, tentando carregar dados locais...');
      return this.loadLocalClientes();
    }
  }

  // Carregar clientes do arquivo local (fallback)
  async loadLocalClientes() {
    try {
      const response = await fetch('clientes.json');
      const data = await response.json();
      this.set('clientes_data', data, 5 * 60 * 1000); // Cache por 5 minutos
      return data;
    } catch (error) {
      console.error('Erro ao carregar clientes locais:', error);
      return [];
    }
  }

  // Invalidar cache específico
  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cleanup(key);
      }
    }
  }

  // Estatísticas do cache
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: JSON.stringify(Object.fromEntries(this.cache)).length
    };
  }
}

// Sistema de debounce para otimizar pesquisas
class DebounceSystem {
  constructor() {
    this.timeouts = new Map();
  }

  // Debounce para funções
  debounce(key, func, delay = 300) {
    // Limpar timeout anterior se existir
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }

    // Criar novo timeout
    const timeoutId = setTimeout(func, delay);
    this.timeouts.set(key, timeoutId);
  }

  // Cancelar debounce específico
  cancel(key) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
      this.timeouts.delete(key);
    }
  }
}

// Otimizações para imagens
class ImageOptimizer {
  constructor() {
    this.loadedImages = new Set();
  }

  // Lazy loading para imagens
  setupLazyLoading() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            this.loadImage(img);
            imageObserver.unobserve(img);
          }
        });
      });

      // Observar todas as imagens com data-src
      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    } else {
      // Fallback para navegadores sem IntersectionObserver
      document.querySelectorAll('img[data-src]').forEach(img => {
        this.loadImage(img);
      });
    }
  }

  // Carregar imagem com otimizações
  loadImage(img) {
    if (this.loadedImages.has(img.dataset.src)) return;

    const tempImg = new Image();
    tempImg.onload = () => {
      img.src = img.dataset.src;
      img.classList.add('loaded');
      this.loadedImages.add(img.dataset.src);
    };
    tempImg.onerror = () => {
      img.classList.add('error');
    };
    tempImg.src = img.dataset.src;
  }

  // Precarregar imagens críticas
  preloadImages(urls) {
    urls.forEach(url => {
      if (!this.loadedImages.has(url)) {
        const img = new Image();
        img.src = url;
        this.loadedImages.add(url);
      }
    });
  }
}

// Exportar para uso global
window.CacheSystem = CacheSystem;
window.DebounceSystem = DebounceSystem;
window.ImageOptimizer = ImageOptimizer;

// Instanciar sistemas globais
window.globalCache = new CacheSystem();
window.globalDebounce = new DebounceSystem();
window.globalImageOptimizer = new ImageOptimizer();
