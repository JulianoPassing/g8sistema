/**
 * Exporta tabelas Pantaneiro especiais (Jaqueta de Frio, Proteção UV) para Excel e PDF
 * com logo G8, produtos do JSON e política comercial de cada tabela.
 */
(function () {
  'use strict';

  const LOGO_BANNER = 'https://i.imgur.com/vjq26ym.png';
  const COR_CATEGORIA = 'FF16A34A';
  const COR_CATEGORIA_RGB = [22, 163, 74];
  const POLITICA_TITULO = 'POLÍTICA COMERCIAL';

  const TABELAS = {
    'jaqueta-frio': {
      produtosUrl: '/produtos-pantaneiro-jaqueta-frio.json',
      titulo: 'Pantaneiro - Jaqueta de Frio',
      subtitulo: 'Tabela de Preços Sul e Sudeste - 5 · Preços válidos até 31/10/2026',
      nomeArquivo: 'Tabela Pantaneiro Jaqueta de Frio',
      colPreco: 'À vista (R$)',
      instrucao:
        'Preço à vista. Acréscimo EX +12%, EXG +15%. Desconto volume: 100–300 peças R$ 155,90 / 400–1000 R$ 149,90. Preencha Qtd.; Total por linha e total do pedido calculados no Excel.',
      politica: [
        'FRETE CIF SP - Capital, Santo André, São Bernardo do Campo, São Caetano do Sul, Diadema, Mauá, Ribeirão Pires e Rio Grande da Serra, Guarulhos, Ferraz de Vasconcelos, Barueri, Embu das Artes, Embu-Guaçu, Itapecerica da Serra e Taboão da Serra',
        'FRETE FOB SUL E SUDESTE',
        'PAGAMENTO A VISTA NO FATURAMENTO',
        'PEDIDO MÍNIMO - 30 UNIDADES',
        'ACRÉSCIMO DE 12% NO VALOR PARA TAMANHOS EX',
        'ACRÉSCIMO DE 15% NO VALOR PARA TAMANHOS EXG',
        'PRAZO DE ENTREGA 20 DIAS ÚTEIS',
        'CORES DISPONÍVEIS - PRETO',
        'DESCONTO DE VOLUME POR PEDIDO: 100 A 300 PEÇAS - R$ 155,90 / 400 A 1000 - R$ 149,90',
        'PEDIDOS DESTES ITENS DEVEM VIR SEPARADOS DOS OUTROS ITENS PANTANEIRO',
        'PEDIDOS PROGRAMADOS EM CARTEIRA, SEGUIRÁ PREÇOS DE ACORDO COM TABELA VIGENTE NO FATURAMENTO',
      ],
    },
    'protecao-uv': {
      produtosUrl: '/produtos-pantaneiro-protecao-uv.json',
      titulo: 'Pantaneiro - Acessórios Proteção UV',
      subtitulo: 'Tabela de Preços Nacional - 5 · Preços válidos até 31/10/2026',
      nomeArquivo: 'Tabela Pantaneiro Proteção UV',
      colPreco: '45 dd (R$)',
      instrucao:
        'Preço único nacional (45 dd). Sem desconto de volume ou prazo. Preencha Qtd.; Total por linha e total do pedido calculados no Excel.',
      politica: [
        'FRETE FOB A PARTIR DE SP',
        'PRAZO DE ENTREGA 20 DIAS ÚTEIS',
        'CORES DISPONÍVEIS - PRETO, AZUL MARINHO E CINZA',
        'SEM DESCONTO DE VOLUME E DE PRAZO DE PAGAMENTO',
        'PREÇO ÚNICO - NACIONAL',
        'PEDIDOS DESTES ITENS DEVEM VIR SEPARADOS DOS OUTROS ITENS PANTANEIRO',
        'PEDIDOS PROGRAMADOS EM CARTEIRA, SEGUIRÁ PREÇOS DE ACORDO COM TABELA VIGENTE NO FATURAMENTO',
      ],
    },
  };

  const LARGURAS = [11, 44, 22, 13, 9, 14];
  const FILL_PAR = 'FFFFFFFF';
  const FILL_IMPAR = 'FFE5E7EB';
  const PDF_ZEBRA_PAR = [255, 255, 255];
  const PDF_ZEBRA_IMPAR = [229, 231, 235];
  const PDF_BORDA = [148, 163, 184];
  const PDF_HEAD_BG = [241, 245, 249];
  const PDF_POLITICA_HEADER = [255, 213, 0];

  function ordemCategorias(produtos) {
    const ordem = [];
    const visto = new Set();
    produtos.forEach(function (p) {
      const c = p.CATEGORIA || 'Sem categoria';
      if (!visto.has(c)) {
        visto.add(c);
        ordem.push(c);
      }
    });
    return ordem;
  }

  function refProduto(p) {
    return p.REFERENCIA != null ? String(p.REFERENCIA) : '';
  }

  function descricaoProduto(p) {
    return p['DESCRIÇÃO'] != null ? p['DESCRIÇÃO'] : p.DESCRIÇÃO || '';
  }

  function formatarTamanhos(p) {
    if (!p || p.TAMANHOS == null) return '';
    if (Array.isArray(p.TAMANHOS)) return p.TAMANHOS.join(' - ');
    return String(p.TAMANHOS);
  }

  function precoNum(p) {
    return typeof p.PRECO === 'number' ? p.PRECO : parseFloat(String(p.PRECO).replace(',', '.')) || 0;
  }

  async function fetchImageBase64(url) {
    const res = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!res.ok) throw new Error('Não foi possível carregar a imagem: ' + url);
    const blob = await res.blob();
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onloadend = function () {
        const s = reader.result;
        resolve(typeof s === 'string' && s.indexOf(',') >= 0 ? s.split(',')[1] : s);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function loadImageDataUrl(url) {
    return fetch(url, { mode: 'cors', cache: 'force-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('Logo');
        return r.blob();
      })
      .then(function (blob) {
        return new Promise(function (resolve, reject) {
          const fr = new FileReader();
          fr.onload = function () {
            resolve(fr.result);
          };
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
      });
  }

  function novaBordaItem() {
    const cor = { argb: 'FF94A3B8' };
    return {
      top: { style: 'thin', color: cor },
      left: { style: 'thin', color: cor },
      bottom: { style: 'thin', color: cor },
      right: { style: 'thin', color: cor },
    };
  }

  function novaBordaPreta() {
    const cor = { argb: 'FF000000' };
    return {
      top: { style: 'thin', color: cor },
      left: { style: 'thin', color: cor },
      bottom: { style: 'thin', color: cor },
      right: { style: 'thin', color: cor },
    };
  }

  function aplicarFillSolid(cell, argb8) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: argb8 },
      bgColor: { argb: argb8 },
    };
  }

  function tlColLogoCentralizado(largurasCols, larguraImagemPx) {
    const pxPorUnidade = 7;
    const colPx = largurasCols.map(function (w) {
      return w * pxPorUnidade;
    });
    const totalPx = colPx.reduce(function (a, b) {
      return a + b;
    }, 0);
    const margemEsquerdaPx = Math.max(0, (totalPx - larguraImagemPx) / 2);
    let acc = 0;
    for (let i = 0; i < colPx.length; i++) {
      if (margemEsquerdaPx <= acc + colPx[i]) {
        return i + (margemEsquerdaPx - acc) / colPx[i];
      }
      acc += colPx[i];
    }
    return 0;
  }

  async function carregarProdutos(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao carregar produtos: ' + url);
    return res.json();
  }

  async function gerarExcel(produtos, opts) {
    const ExcelJS = window.ExcelJS || window.exceljs;
    if (!ExcelJS) {
      alert('Biblioteca Excel não carregada. Recarregue a página.');
      return;
    }

    const lastCol = 'F';
    let b64Banner = null;
    try {
      b64Banner = await fetchImageBase64(LOGO_BANNER);
    } catch (e) {
      console.warn('Logo Excel:', e);
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Tabela', {
      properties: { defaultRowHeight: 14.3 },
      views: [{ showGridLines: true }],
    });

    for (let i = 0; i < LARGURAS.length; i++) ws.getColumn(i + 1).width = LARGURAS[i];

    function mergeRow(row) {
      ws.mergeCells('A' + row + ':' + lastCol + row);
    }

    if (b64Banner) {
      const idBanner = wb.addImage({ base64: b64Banner, extension: 'png' });
      ws.addImage(idBanner, {
        tl: { col: tlColLogoCentralizado(LARGURAS, 400), row: 0.05 },
        ext: { width: 400, height: 58 },
        editAs: 'absolute',
      });
    }

    ws.mergeCells('A1:F1');
    ws.mergeCells('A2:F2');
    ws.getRow(1).height = 62;
    ws.getRow(2).height = 18;
    ['A1', 'A2'].forEach(function (addr) {
      const c = ws.getCell(addr);
      aplicarFillSolid(c, FILL_PAR);
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let r = 3;
    const ano = new Date().getFullYear();

    mergeRow(r);
    const cTit = ws.getCell(r, 1);
    cTit.value = opts.titulo + ' — ' + ano;
    cTit.font = { size: 16, bold: true, color: { argb: 'FF16A34A' } };
    aplicarFillSolid(cTit, FILL_PAR);
    cTit.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(r).height = 28;
    r++;

    mergeRow(r);
    const cSub = ws.getCell(r, 1);
    cSub.value =
      'G8 Representações — ' +
      (opts.subtitulo || '') +
      ' · Exportado em ' +
      new Date().toLocaleDateString('pt-BR');
    cSub.font = { size: 10, italic: true, color: { argb: 'FF64748B' } };
    aplicarFillSolid(cSub, FILL_PAR);
    cSub.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.getRow(r).height = 16;
    r++;

    mergeRow(r);
    aplicarFillSolid(ws.getCell(r, 1), FILL_PAR);
    ws.getRow(r).height = 8;
    r++;

    mergeRow(r);
    const cInstr = ws.getCell(r, 1);
    cInstr.value = opts.instrucao || '';
    cInstr.font = { size: 10, italic: true, color: { argb: 'FF334155' } };
    aplicarFillSolid(cInstr, FILL_PAR);
    cInstr.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cInstr.border = novaBordaItem();
    ws.getRow(r).height = 36;
    r++;

    mergeRow(r);
    aplicarFillSolid(ws.getCell(r, 1), FILL_PAR);
    ws.getRow(r).height = 8;
    r++;

    const cats = ordemCategorias(produtos);
    let firstItemRow = null;
    let lastItemRow = null;
    let idx = 0;

    for (let ci = 0; ci < cats.length; ci++) {
      const cat = cats[ci];
      const itens = produtos.filter(function (p) {
        return (p.CATEGORIA || 'Sem categoria') === cat;
      });

      mergeRow(r);
      const headCat = ws.getCell(r, 1);
      headCat.value = String(cat).toUpperCase();
      aplicarFillSolid(headCat, COR_CATEGORIA);
      headCat.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      headCat.alignment = { horizontal: 'center', vertical: 'middle' };
      headCat.border = novaBordaItem();
      ws.getRow(r).height = 24;
      r++;

      const hdr = ['Ref.', 'Descrição', 'Tamanhos', opts.colPreco || 'Preço (R$)', 'Qtd.', 'Total (R$)'];
      hdr.forEach(function (h, hi) {
        const cell = ws.getCell(r, hi + 1);
        cell.value = h;
        cell.font = { bold: true, size: 10 };
        aplicarFillSolid(cell, 'FFF1F5F9');
        cell.border = novaBordaItem();
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      });
      ws.getRow(r).height = 14;
      r++;

      for (let j = 0; j < itens.length; j++) {
        const p = itens[j];
        const preco = precoNum(p);
        const fg = idx % 2 === 1 ? FILL_IMPAR : FILL_PAR;
        idx++;
        if (firstItemRow === null) firstItemRow = r;
        lastItemRow = r;

        const vals = [refProduto(p), descricaoProduto(p), formatarTamanhos(p), Number(preco), null, null];
        for (let c = 0; c < 4; c++) {
          const cell = ws.getCell(r, c + 1);
          cell.value = vals[c];
          aplicarFillSolid(cell, fg);
          cell.border = novaBordaItem();
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          if (c === 3) cell.numFmt = '#,##0.00';
        }
        const cQtd = ws.getCell(r, 5);
        aplicarFillSolid(cQtd, 'FFFEF9C7');
        cQtd.border = novaBordaItem();
        cQtd.alignment = { horizontal: 'center', vertical: 'middle' };
        const cTot = ws.getCell(r, 6);
        cTot.value = { formula: 'D' + r + '*N(E' + r + ')' };
        aplicarFillSolid(cTot, fg);
        cTot.border = novaBordaItem();
        cTot.alignment = { horizontal: 'center', vertical: 'middle' };
        cTot.numFmt = '#,##0.00';
        ws.getRow(r).height = 14;
        r++;
      }
    }

    if (firstItemRow !== null && lastItemRow !== null) {
      ws.mergeCells('A' + r + ':E' + r);
      const cLab = ws.getCell(r, 1);
      cLab.value = 'TOTAL DO PEDIDO (R$)';
      cLab.font = { bold: true, size: 12 };
      aplicarFillSolid(cLab, 'FFE2E8F0');
      cLab.alignment = { horizontal: 'right', vertical: 'middle' };
      cLab.border = novaBordaItem();
      const cVal = ws.getCell(r, 6);
      cVal.value = { formula: 'SUM(F' + firstItemRow + ':F' + lastItemRow + ')' };
      cVal.font = { bold: true, size: 12 };
      aplicarFillSolid(cVal, 'FFE2E8F0');
      cVal.alignment = { horizontal: 'center', vertical: 'middle' };
      cVal.border = novaBordaItem();
      cVal.numFmt = '#,##0.00';
      ws.getRow(r).height = 22;
      r++;
    }

    mergeRow(r);
    aplicarFillSolid(ws.getCell(r, 1), FILL_PAR);
    ws.getRow(r).height = 10;
    r++;

    mergeRow(r);
    const cPolTit = ws.getCell(r, 1);
    cPolTit.value = POLITICA_TITULO;
    aplicarFillSolid(cPolTit, 'FFFFA500');
    cPolTit.font = { bold: true, size: 11 };
    cPolTit.alignment = { horizontal: 'center', vertical: 'middle' };
    cPolTit.border = novaBordaPreta();
    ws.getRow(r).height = 20;
    r++;

    (opts.politica || []).forEach(function (linha) {
      mergeRow(r);
      const cPol = ws.getCell(r, 1);
      cPol.value = linha;
      aplicarFillSolid(cPol, FILL_PAR);
      cPol.font = { bold: true, size: 10 };
      cPol.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cPol.border = novaBordaPreta();
      ws.getRow(r).height = linha.length > 80 ? 36 : 20;
      r++;
    });

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = opts.nomeArquivo;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  async function gerarPdf(produtos, opts) {
    const JSPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JSPDF) {
      alert('Biblioteca PDF não carregada. Recarregue a página.');
      return;
    }

    let dataUrlBanner = null;
    try {
      dataUrlBanner = await loadImageDataUrl(LOGO_BANNER);
    } catch (e) {
      console.warn('Logo PDF:', e);
    }

    const doc = new JSPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const m = 10;
    const ano = new Date().getFullYear();

    if (dataUrlBanner) {
      const imgW = Math.min(132, pageW - 2 * m);
      const imgH = (imgW * 22) / 150;
      doc.addImage(dataUrlBanner, 'PNG', (pageW - imgW) / 2, 7, imgW, imgH);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(22, 163, 74);
    doc.text(opts.titulo + ' — ' + ano, pageW / 2, 33, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'G8 Representações — ' + (opts.subtitulo || '') + ' · ' + new Date().toLocaleDateString('pt-BR'),
      pageW / 2,
      39,
      { align: 'center' }
    );

    const cats = ordemCategorias(produtos);
    let y = 44;
    const bottomSafe = 18;
    const colPrecoLabel = opts.colPreco || 'Preço (R$)';
    let idxPdf = 0;

    for (let c = 0; c < cats.length; c++) {
      const cat = cats[c];
      const itens = produtos.filter(function (p) {
        return (p.CATEGORIA || 'Sem categoria') === cat;
      });
      const bodyRows = itens.map(function (p) {
        return [
          refProduto(p),
          descricaoProduto(p),
          formatarTamanhos(p),
          precoNum(p).toFixed(2).replace('.', ','),
          '',
          '',
        ];
      });
      if (!bodyRows.length) continue;

      if (y > pageH - bottomSafe) {
        doc.addPage();
        y = m;
      }

      const faixaCat = 8.5;
      doc.setFillColor(COR_CATEGORIA_RGB[0], COR_CATEGORIA_RGB[1], COR_CATEGORIA_RGB[2]);
      doc.rect(m, y, pageW - 2 * m, faixaCat, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(String(cat).toUpperCase(), pageW / 2, y + faixaCat / 2 + 1.4, {
        align: 'center',
        baseline: 'middle',
      });
      doc.setTextColor(0, 0, 0);
      y += faixaCat + 2;

      const zebraInicio = idxPdf;
      doc.autoTable({
        startY: y,
        head: [['Ref.', 'Descrição', 'Tamanhos', colPrecoLabel, 'Qtd.', 'Total (R$)']],
        body: bodyRows,
        theme: 'grid',
        headStyles: {
          fillColor: PDF_HEAD_BG,
          textColor: [30, 41, 59],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
          lineColor: PDF_BORDA,
          lineWidth: 0.15,
        },
        styles: {
          fontSize: 8,
          cellPadding: 1.35,
          overflow: 'linebreak',
          valign: 'middle',
          halign: 'center',
          lineColor: PDF_BORDA,
          lineWidth: 0.15,
        },
        columnStyles: {
          0: { cellWidth: 14 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 22 },
          3: { cellWidth: 18 },
          4: { cellWidth: 12 },
          5: { cellWidth: 20 },
        },
        margin: { left: m, right: m, bottom: 14 },
        didParseCell: function (data) {
          if (data.section === 'body') {
            const zebra = (zebraInicio + data.row.index) % 2 === 1;
            data.cell.styles.fillColor = zebra ? PDF_ZEBRA_IMPAR : PDF_ZEBRA_PAR;
            if (data.column.index === 4) {
              data.cell.styles.fillColor = zebra ? [254, 243, 199] : [255, 251, 235];
            }
          }
        },
      });

      idxPdf += bodyRows.length;
      y = doc.autoTable.previous.finalY + 8;
    }

    if (y + 16 > pageH - bottomSafe) {
      doc.addPage();
      y = m;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL DO PEDIDO (R$):', m, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No Excel o total é calculado; no PDF preencha Qtd., totais por linha e some aqui.', m, y + 4.5);
    doc.setDrawColor(148, 163, 184);
    doc.line(m + 58, y + 1.2, pageW - m, y + 1.2);
    y += 12;

    const politica = opts.politica || [];
    if (y + 14 + politica.length * 11 > pageH - bottomSafe) {
      doc.addPage();
      y = m;
    }

    doc.autoTable({
      startY: y,
      head: [[POLITICA_TITULO]],
      body: politica.map(function (linha) {
        return [linha];
      }),
      theme: 'grid',
      headStyles: {
        fillColor: PDF_POLITICA_HEADER,
        textColor: [0, 0, 0],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      styles: {
        fontSize: 7.2,
        cellPadding: 1.6,
        overflow: 'linebreak',
        valign: 'middle',
        halign: 'center',
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      columnStyles: { 0: { cellWidth: pageW - 2 * m } },
      margin: { left: m, right: m, bottom: 14 },
    });

    for (let p = 1; p <= doc.internal.getNumberOfPages(); p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('G8 Representações — g8representacoes.vercel.app', pageW / 2, pageH - 6, { align: 'center' });
    }

    doc.save(opts.nomeArquivo);
  }

  async function exportar(chave, formato) {
    const cfg = TABELAS[chave];
    if (!cfg) return;

    const isPdf = formato === 'pdf';
    const loading = window.loadingSystem;
    if (loading && typeof loading.showOverlay === 'function') {
      loading.showOverlay(isPdf ? 'Gerando PDF…' : 'Gerando Excel…');
    }

    try {
      const produtos = await carregarProdutos(cfg.produtosUrl);
      const ano = new Date().getFullYear();
      const opts = {
        titulo: cfg.titulo,
        subtitulo: cfg.subtitulo,
        instrucao: cfg.instrucao,
        colPreco: cfg.colPreco,
        politica: cfg.politica,
        nomeArquivo: cfg.nomeArquivo + ' - ' + ano + ' - G8 Representações.' + (isPdf ? 'pdf' : 'xlsx'),
      };

      if (isPdf) await gerarPdf(produtos, opts);
      else await gerarExcel(produtos, opts);

      if (window.notifications && typeof window.notifications.success === 'function') {
        window.notifications.success(
          isPdf
            ? 'PDF gerado (colunas Qtd. e Total para preenchimento).'
            : 'Excel gerado com Qtd., total por linha e total do pedido.',
          { title: 'Download', duration: 3200 }
        );
      }
    } catch (e) {
      console.error(e);
      if (window.notifications && typeof window.notifications.error === 'function') {
        window.notifications.error((e && e.message) || 'Não foi possível gerar o arquivo.', {
          title: 'Erro',
          duration: 5000,
        });
      } else {
        alert('Erro ao gerar a tabela: ' + ((e && e.message) || e));
      }
    } finally {
      if (loading && typeof loading.hideOverlay === 'function') loading.hideOverlay();
    }
  }

  window.baixarTabelaPantaneiroJaquetaFrioExcel = function () {
    return exportar('jaqueta-frio', 'excel');
  };
  window.baixarTabelaPantaneiroJaquetaFrioPdf = function () {
    return exportar('jaqueta-frio', 'pdf');
  };
  window.baixarTabelaPantaneiroProtecaoUvExcel = function () {
    return exportar('protecao-uv', 'excel');
  };
  window.baixarTabelaPantaneiroProtecaoUvPdf = function () {
    return exportar('protecao-uv', 'pdf');
  };
})();
