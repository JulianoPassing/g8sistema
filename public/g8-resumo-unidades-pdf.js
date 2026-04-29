/**
 * Resumo de quantidades no PDF: por referência, agregando por tamanho (ex.: 209 10g 10gg 10ex).
 * Total geral de peças no final.
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

  /**
   * Desenha bloco no PDF após a tabela de itens. Retorna nova coordenada Y inferior (mm).
   */
  function pdfDesenharResumoQuantidades(doc, margin, pageWidth, startY, itens) {
    var res = montarResumoQuantidadesPorReferencia(itens);
    if (!res.totalUnidades) return startY;

    var pageH = doc.internal.pageSize.getHeight();
    var y = startY;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(33, 37, 41);
    doc.text('Quantidades por referência / tamanho', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    for (var i = 0; i < res.linhasTexto.length; i++) {
      if (y > pageH - 28) {
        doc.addPage();
        y = 20;
      }
      var line = res.linhasTexto[i];
      var wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
      for (var w = 0; w < wrapped.length; w++) {
        doc.text(wrapped[w], margin, y);
        y += 4;
      }
      y += 0.5;
    }

    if (y > pageH - 22) {
      doc.addPage();
      y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Total: ' + res.totalUnidades + ' unidades', margin, y + 1);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    return y + 10;
  }

  global.g8MontarResumoQuantidadesPorReferencia = montarResumoQuantidadesPorReferencia;
  global.g8PdfDesenharResumoQuantidades = pdfDesenharResumoQuantidades;
})(typeof window !== 'undefined' ? window : globalThis);
