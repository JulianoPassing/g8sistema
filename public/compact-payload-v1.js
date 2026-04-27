/**
 * Compacta corpos JSON grandes (ex.: PUT de pedidos com muitos itens) para reduzir
 * timeout no Vercel / rede. A API reconhece `_v1GzipB64` e descompacta antes do processamento.
 */
(function (global) {
  var THRESHOLD = 8000;

  function uint8ToBase64(u8) {
    var CHUNK = 0x8000;
    var s = '';
    for (var i = 0; i < u8.length; i += CHUNK) {
      s += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + CHUNK, u8.length)));
    }
    return btoa(s);
  }

  /**
   * @param {object} obj
   * @returns {Promise<object>}
   */
  function compactarPayloadGrandeV1(obj) {
    if (obj == null || typeof obj !== 'object') {
      return Promise.resolve(obj);
    }
    var json;
    try {
      json = JSON.stringify(obj);
    } catch (e) {
      return Promise.resolve(obj);
    }
    if (json.length <= THRESHOLD) {
      return Promise.resolve(obj);
    }
    if (typeof CompressionStream === 'undefined') {
      console.warn('compact-payload-v1: CompressionStream indisponível, enviando sem compactar');
      return Promise.resolve(obj);
    }
    var enc = new TextEncoder();
    var input = enc.encode(json);
    var stream = new Blob([input]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Response(stream)
      .arrayBuffer()
      .then(function (buf) {
        var comp = new Uint8Array(buf);
        return {
          _v1GzipB64: uint8ToBase64(comp),
          _v1Cmeta: { origLen: json.length, compLen: comp.length, v: 1 }
        };
      })
      .catch(function (err) {
        console.warn('compact-payload-v1: falha ao compactar:', err);
        return obj;
      });
  }

  global.compactarPayloadGrandeV1 = compactarPayloadGrandeV1;
})(typeof window !== 'undefined' ? window : globalThis);
