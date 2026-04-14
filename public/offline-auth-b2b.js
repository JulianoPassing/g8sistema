/**
 * Credenciais offline (B2B / Distribuição): após um login com sucesso online,
 * guarda um resumo criptográfico + cópia do objeto cliente para login sem rede.
 */
(function (global) {
  'use strict';

  async function sha256Hex(str) {
    if (!global.crypto || !global.crypto.subtle) return null;
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map(function (b) {
        return b.toString(16).padStart(2, '0');
      })
      .join('');
  }

  function normCnpj(cnpj) {
    return String(cnpj || '').replace(/\D/g, '');
  }

  function mapKey(ns) {
    return 'g8_offline_' + ns + '_map';
  }

  function clienteKey(ns, cnpjDigits) {
    return 'g8_offline_' + ns + '_cliente_' + cnpjDigits;
  }

  /**
   * @param {object} opts
   * @param {'b2b'|'dist'} opts.ns
   * @param {string} opts.cnpjDigits
   * @param {string} opts.password
   * @param {object} opts.cliente
   */
  async function saveOfflineCredentials(opts) {
    var ns = opts.ns;
    var cnpjDigits = normCnpj(opts.cnpjDigits);
    if (cnpjDigits.length !== 14 || !opts.password) return;
    var digest = await sha256Hex(cnpjDigits + '|' + opts.password);
    if (!digest) return;
    var map = {};
    try {
      map = JSON.parse(global.localStorage.getItem(mapKey(ns)) || '{}');
    } catch (e) {
      map = {};
    }
    map[cnpjDigits] = { digest: digest, t: Date.now() };
    global.localStorage.setItem(mapKey(ns), JSON.stringify(map));
    global.localStorage.setItem(clienteKey(ns, cnpjDigits), JSON.stringify(opts.cliente));
  }

  /**
   * @param {object} opts
   * @param {'b2b'|'dist'} opts.ns
   * @param {string} opts.cnpjDigits
   * @param {string} opts.password
   * @returns {Promise<{ ok: boolean, cliente?: object, reason?: string }>}
   */
  async function tryOfflineLogin(opts) {
    var ns = opts.ns;
    var cnpjDigits = normCnpj(opts.cnpjDigits);
    if (cnpjDigits.length !== 14) {
      return { ok: false, reason: 'cnpj' };
    }
    var map = {};
    try {
      map = JSON.parse(global.localStorage.getItem(mapKey(ns)) || '{}');
    } catch (e) {
      return { ok: false, reason: 'no_snapshot' };
    }
    var entry = map[cnpjDigits];
    if (!entry || !entry.digest) {
      return { ok: false, reason: 'no_snapshot' };
    }
    var digest = await sha256Hex(cnpjDigits + '|' + opts.password);
    if (!digest || digest !== entry.digest) {
      return { ok: false, reason: 'bad_password' };
    }
    var raw = global.localStorage.getItem(clienteKey(ns, cnpjDigits));
    if (!raw) {
      return { ok: false, reason: 'no_cliente' };
    }
    try {
      return { ok: true, cliente: JSON.parse(raw) };
    } catch (e) {
      return { ok: false, reason: 'parse' };
    }
  }

  global.G8OfflineAuthB2B = {
    sha256Hex: sha256Hex,
    normCnpj: normCnpj,
    saveOfflineCredentials: saveOfflineCredentials,
    tryOfflineLogin: tryOfflineLogin
  };
})(typeof window !== 'undefined' ? window : global);
