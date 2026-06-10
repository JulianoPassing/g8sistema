/**
 * Resumo de quantidades no PDF (padrão G8): apenas o total de peças.
 * Ex.: Quantidade 100 peças
 */
(function (global) {
  function totalUnidadesSomente(itens) {
    if (!itens || !itens.length) return 0;
    var t = 0;
    for (var i = 0; i < itens.length; i++) {
      t += parseInt(itens[i].quantidade, 10) || 0;
    }
    return t;
  }

  function montarResumoQuantidadesPorReferencia(itens) {
    var totalUnidades = totalUnidadesSomente(itens);
    return { linhasTexto: [], linhasFormatadas: [], totalUnidades: totalUnidades };
  }

  function textoQuantidadeTotal(total) {
    if (total === 1) return 'Quantidade 1 peça';
    return 'Quantidade ' + total + ' peças';
  }

  /**
   * Desenha só o total de peças. Retorna nova coordenada Y (mm).
   */
  function pdfDesenharResumoQuantidades(doc, margin, pageWidth, startY, itens) {
    var total = totalUnidadesSomente(itens);
    if (!total) return startY;

    var y = startY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(33, 37, 41);
    doc.text(textoQuantidadeTotal(total), margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    return y + 8;
  }

  global.g8MontarResumoQuantidadesPorReferencia = montarResumoQuantidadesPorReferencia;
  global.g8TotalUnidadesPedidoItens = totalUnidadesSomente;
  global.g8PdfDesenharResumoQuantidades = pdfDesenharResumoQuantidades;
})(typeof window !== 'undefined' ? window : globalThis);
