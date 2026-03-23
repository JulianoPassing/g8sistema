/**
 * Sistema de Rascunho - G8 Sistema
 * Salva pedidos em digitação para recuperar após fechar/recarregar
 */
(function() {
  const STORAGE_KEY = 'g8_form_draft';
  const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas
  const SAVE_DEBOUNCE_MS = 2000;

  let saveTimeout = null;
  let currentConfig = null;

  function getPageKey() {
    return (window.location.pathname || window.location.href || 'default').replace(/^\//, '').replace(/\.html$/, '') || 'default';
  }

  window.G8Draft = {
    save(config) {
      if (!config || !config.getData) return;
      try {
        const data = config.getData();
        if (!data || (data.items && data.items.length === 0 && !data.formData)) return;
        const payload = { pageKey: getPageKey(), data, timestamp: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch (e) {
        console.warn('G8Draft save error:', e);
      }
    },

    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - (parsed.timestamp || 0) > MAX_AGE_MS) {
          localStorage.removeItem(STORAGE_KEY);
          return null;
        }
        if (parsed.pageKey !== getPageKey()) return null;
        return parsed.data;
      } catch (e) {
        return null;
      }
    },

    clear() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
    },

    init(config) {
      if (!config || !config.getData || !config.setData) return;
      currentConfig = config;
      const pageKey = getPageKey();

      const draft = this.load();
      if (draft) {
        const msg = 'Você tem um pedido não finalizado. Deseja continuar?';
        if (confirm(msg)) {
          config.setData(draft);
          this.clear();
        } else {
          this.clear();
        }
      }

      const doSave = () => this.save(config);
      const scheduleSave = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(doSave, SAVE_DEBOUNCE_MS);
      };

      if (typeof config.watch === 'function') {
        config.watch(scheduleSave);
      } else {
        window.addEventListener('beforeunload', doSave);
        setInterval(() => {
          try { if (config.getData && config.getData()) scheduleSave(); } catch (e) {}
        }, 5000);
      }
    }
  };
})();
