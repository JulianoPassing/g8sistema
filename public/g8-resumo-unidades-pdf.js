/**
 * Quantidades no PDF: apenas total de peças (ex.: Total: 95 unidades).
 * montarResumoQuantidadesPorReferencia permanece disponível se precisar do detalhe em outro lugar.
 */
(function (global) {
  var SIZE_ORDER = [
    'pp',
    'p',
    'm',
    'g',
    'gg',
    'ex',
    'exg',
    '2g',
    '3g',
    '4g',
    '5g',
    'unico',
    'uni',
    'tam'
  ];

  function idxSize(slug) {
    var ix = SIZE_ORDER.indexOf(slug);
    return ix === -1 ? 999 : ix;
  }

  function slugTamanho(tamanhoStr) {
    var raw = String(tamanhoStr || '').split(',')[0].trim();
    var u = raw
      .normalize('NFD')
      .replace(/\u0300/g, '')
      .toUpperCase()
      .replace(/Ú/g, 'U');
    var tokens = ['5G', '4G', '3G', '2G', 'EXG', 'GG', 'EX', 'G', 'M', 'P', 'PP'];
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      if (u.indexOf(tok) !== -1) return tok.toLowerCase();
    }
    if (/UNICO|ÚNICO/.test(raw)) return 'unico';
    var c = u.replace(/[^A-Z0-9]/g, '').slice(0, 10);
    return (c || 'tam').toLowerCase();
  }

  function montarResumoQuantidadesPorReferencia(itens) {
    if (!itens || !itens.length) {
      return { linhasTexto: [], totalUnidades: 0 };
    }
    var byRef = {};
    var totalUnidades = 0;
    for (var i = 0; i < itens.length; i++) {
      var item = itens[i];
      var ref = String(
        item.REFERENCIA != null ? item.REFERENCIA : item.REF != null ? item.REF : '?'
      ).trim();
      var q = parseInt(item.quantidade, 10) || 0;
      totalUnidades += q;
      var slug = slugTamanho(item.tamanho || item.TAM || item.medida || '');
      if (!byRef[ref]) byRef[ref] = {};
      byRef[ref][slug] = (byRef[ref][slug] || 0) + q;
    }
    var refs = Object.keys(byRef).sort(function (a, b) {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    var linhasTexto = [];
    for (var r = 0; r < refs.length; r++) {
      var ref = refs[r];
      var sizes = byRef[ref];
      var keys = Object.keys(sizes).sort(function (a, b) {
        var d = idxSize(a) - idxSize(b);
        return d !== 0 ? d : a.localeCompare(b);
      });
      var parts = [];
      for (var k = 0; k < keys.length; k++) {
        parts.push(String(sizes[keys[k]]) + keys[k]);
      }
      linhasTexto.push(ref + ' ' + parts.join(' '));
    }
    return { linhasTexto: linhasTexto, totalUnidades: totalUnidades };
  }

  function totalUnidadesSomente(itens) {
    if (!itens || !itens.length) return 0;
    var t = 0;
    for (var i = 0; i < itens.length; i++) {
      t += parseInt(itens[i].quantidade, 10) || 0;
    }
    return t;
  }

  /**
   * Uma linha no PDF: Total: N unidades. Retorna nova coordenada Y inferior (mm).
   */
  function pdfDesenharResumoQuantidades(doc, margin, pageWidth, startY, itens) {
    var total = totalUnidadesSomente(itens);
    if (!total) return startY;

    var y = startY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(33, 37, 41);
    doc.text('Total: ' + total + ' unidades', pageWidth - margin, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    return y + 8;
  }

  global.g8MontarResumoQuantidadesPorReferencia = montarResumoQuantidadesPorReferencia;
  global.g8TotalUnidadesPedidoItens = totalUnidadesSomente;
  global.g8PdfDesenharResumoQuantidades = pdfDesenharResumoQuantidades;
})(typeof window !== 'undefined' ? window : globalThis);
