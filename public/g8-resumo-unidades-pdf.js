/**
 * Resumo de quantidades no PDF (padrão G8):
 *   1000 - 10m - 10g
 *   2900 - 10m - 10g
 *   Total peças: 40
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
    if (ix !== -1) return ix;
    var bootNum = parseInt(String(slug).split('/')[0], 10);
    if (!isNaN(bootNum) && /\//.test(slug)) return 100 + bootNum;
    return 999;
  }

  function slugTamanho(tamanhoStr) {
    var raw = String(tamanhoStr || '').split(',')[0].trim();
    var pairMatch = raw.match(/(\d+\/\d+)/);
    if (pairMatch) return pairMatch[1];

    var u = raw
      .normalize('NFD')
      .replace(/\u0300/g, '')
      .toUpperCase()
      .replace(/Ú/g, 'U');

    if (/^BOTA\s/i.test(raw)) {
      var botaPair = raw.match(/(\d+\/\d+)/);
      if (botaPair) return botaPair[1];
    }

    var tokens = ['5G', '4G', '3G', '2G', 'EXG', 'GG', 'EX', 'G', 'M', 'P', 'PP'];
    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      if (u.indexOf(tok) !== -1) return tok.toLowerCase();
    }
    if (/UNICO|ÚNICO/.test(raw)) return 'unico';
    var c = u.replace(/[^A-Z0-9]/g, '').slice(0, 10);
    return (c || 'tam').toLowerCase();
  }

  function formatParteQuantidade(qty, slug) {
    if (/\//.test(slug) || slug.length > 3) return qty + ' ' + slug;
    return qty + slug;
  }

  function formatarLinhaReferencia(ref, sizes) {
    var keys = Object.keys(sizes).sort(function (a, b) {
      var d = idxSize(a) - idxSize(b);
      return d !== 0 ? d : a.localeCompare(b);
    });
    var parts = [];
    for (var k = 0; k < keys.length; k++) {
      parts.push(formatParteQuantidade(sizes[keys[k]], keys[k]));
    }
    return ref + ' - ' + parts.join(' - ');
  }

  function montarResumoQuantidadesPorReferencia(itens) {
    if (!itens || !itens.length) {
      return { linhasTexto: [], linhasFormatadas: [], totalUnidades: 0 };
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
    var linhasFormatadas = [];
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
      linhasFormatadas.push(formatarLinhaReferencia(ref, sizes));
    }
    return { linhasTexto: linhasTexto, linhasFormatadas: linhasFormatadas, totalUnidades: totalUnidades };
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
   * Desenha resumo por referência + total de peças. Retorna nova coordenada Y (mm).
   */
  function pdfDesenharResumoQuantidades(doc, margin, pageWidth, startY, itens) {
    var resumo = montarResumoQuantidadesPorReferencia(itens);
    if (!resumo.totalUnidades) return startY;

    var y = startY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(33, 37, 41);
    doc.text('Resumo de quantidades:', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    for (var i = 0; i < resumo.linhasFormatadas.length; i++) {
      doc.text(resumo.linhasFormatadas[i], margin, y);
      y += 4.5;
    }

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Total peças: ' + resumo.totalUnidades, pageWidth - margin, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    return y + 8;
  }

  global.g8MontarResumoQuantidadesPorReferencia = montarResumoQuantidadesPorReferencia;
  global.g8TotalUnidadesPedidoItens = totalUnidadesSomente;
  global.g8PdfDesenharResumoQuantidades = pdfDesenharResumoQuantidades;
})(typeof window !== 'undefined' ? window : globalThis);
