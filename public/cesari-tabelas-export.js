/**
 * Exporta tabela Cesari para Excel e PDF com logo G8 (banner),
 * usando window.CESARI_PRODUTOS_DATA (mesmo arquivo que cesari.html / b2b-cesari.html).
 * Excel: preço unitário, coluna Qtd. (preenchimento manual), Total = unit. × qtd., e linha TOTAL DO PEDIDO (soma dos totais).
 * PDF: mesmas colunas com Qtd./Total em branco para preenchimento; linha para total geral.
 */
(function () {
  'use strict';

  const LOGO_BANNER = 'https://i.imgur.com/vjq26ym.png';

  /** Mesma ordem de categorias de cesari.html */
  const CATEGORIAS_ORDEM = [
    'PNEUS DE MOTO NOVOS',
    'LINHA FLASH TYRE',
    'PNEU QUADRICICULO',
    'LINHA PNEUS REMOLDADOS',
    'CAMARA DE AR',
    'ITENS PARA CONSERTO',
    'ÓLEO',
    'PATINS DE FREIO',
    'ACESSÓRIOS PARA MOTOS',
    'CAPAS DE CHUVA',
  ];

  function ordemCategorias(produtos) {
    const present = new Set();
    for (let i = 0; i < produtos.length; i++) {
      present.add(produtos[i].CATEGORIA || 'Sem categoria');
    }
    const out = [];
    for (let c = 0; c < CATEGORIAS_ORDEM.length; c++) {
      const cat = CATEGORIAS_ORDEM[c];
      if (present.has(cat)) out.push(cat);
    }
    for (let p = 0; p < produtos.length; p++) {
      const c = produtos[p].CATEGORIA || 'Sem categoria';
      if (out.indexOf(c) === -1) out.push(c);
    }
    return out;
  }

  function obterProdutosCesari() {
    const raw = window.CESARI_PRODUTOS_DATA;
    if (!raw || !raw.length) {
      throw new Error('Dados Cesari não carregados. Recarregue a página.');
    }
    return raw.map(function (p) {
      const o = Object.assign({}, p);
      if (o.PRECOS && o.PRECO === undefined) o.PRECO = o.PRECOS.p_30_60_90;
      return o;
    });
  }

  function formatarTamanhos(p) {
    if (!p || p.TAM == null) return '';
    return String(p.TAM);
  }

  function descricaoProduto(p) {
    return p.MODELO != null ? String(p.MODELO) : '';
  }

  function refProduto(p) {
    return p.REF != null ? String(p.REF) : '';
  }

  function precoNum(p) {
    return typeof p.PRECO === 'number'
      ? p.PRECO
      : parseFloat(String(p.PRECO).replace(',', '.')) || 0;
  }

  async function fetchImageBase64(url) {
    const res = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!res.ok) throw new Error('Não foi possível carregar a imagem: ' + url);
    const blob = await res.blob();
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onloadend = function () {
        const s = reader.result;
        const base64 = typeof s === 'string' && s.indexOf(',') >= 0 ? s.split(',')[1] : s;
        resolve(base64);
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

  /** Borda nova a cada célula (ExcelJS aplica melhor que objeto compartilhado). */
  function novaBordaItem() {
    const cor = { argb: 'FF94A3B8' };
    return {
      top: { style: 'thin', color: cor },
      left: { style: 'thin', color: cor },
      bottom: { style: 'thin', color: cor },
      right: { style: 'thin', color: cor },
    };
  }

  /** Preenchimento sólido compatível com Excel (fg + bg). */
  function aplicarFillSolid(cell, argb8) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: argb8 },
      bgColor: { argb: argb8 },
    };
  }

  /** Letra da coluna Excel 0-based (0=A). */
  function colLetterFromIndex(i0) {
    let n = i0 + 1;
    let s = '';
    while (n > 0) {
      n--;
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26);
    }
    return s;
  }

  /** Ref., Descrição, Tamanhos, Preço unit., Qtd., Total */
  const LARGURAS_COM_COL_CESARI = [11, 44, 16, 13, 9, 14];

  function aplicarLargurasColunas(ws, larguras) {
    const arr = larguras || LARGURAS_COLS_ATUAL;
    for (let i = 0; i < arr.length; i++) {
      ws.getColumn(i + 1).width = arr[i];
    }
  }

  /** Atualizado em gerarExcelCesari conforme quantidade de colunas. */
  let LARGURAS_COLS_ATUAL = LARGURAS_COM_COL_CESARI.slice();

  /**
   * Posição horizontal da logo (coluna decimal 0=A) centralizada em todas as colunas da tabela.
   * Largura em “px” aproximada: unidade Excel × fator (Calibri 11 ~7 px por unidade de largura).
   */
  function tlColLogoCentralizadoSobreGrade(largurasCols, larguraImagemPx, pxPorUnidade) {
    pxPorUnidade = pxPorUnidade || 7;
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
        const dentro = margemEsquerdaPx - acc;
        return i + dentro / colPx[i];
      }
      acc += colPx[i];
    }
    return 0;
  }

  /** Preenchimento zebrado (linhas de item): branco / cinza clarinho. */
  const FILL_ITEM_PAR = 'FFFFFFFF';
  const FILL_ITEM_IMPAR = 'FFE5E7EB';

  /** Mesmas cores do Excel, para PDF (RGB 0–255). */
  const PDF_FILL_ZEBRA_PAR = [255, 255, 255];
  const PDF_FILL_ZEBRA_IMPAR = [229, 231, 235];
  const PDF_BORDA = [148, 163, 184];
  const PDF_HEAD_BG = [241, 245, 249];
  /** Cabeçalho amarelo / ouro — política comercial (PDF). */
  const PDF_POLITICA_HEADER_BG = [255, 213, 0];
  const PDF_POLITICA_BORDA = [0, 0, 0];

  const POLITICA_COMERCIAL_TITULO = 'POLITICA COMERCIAL';
  const POLITICA_COMERCIAL_ITENS = [
    'PREÇOS CONFORME TABELA CESARI NO SISTEMA G8;',
    'CONDIÇÕES COMERCIAIS E PEDIDO MÍNIMO: CONSULTE O REPRESENTANTE;',
  ];

  function novaBordaPreta() {
    const cor = { argb: 'FF000000' };
    return {
      top: { style: 'thin', color: cor },
      left: { style: 'thin', color: cor },
      bottom: { style: 'thin', color: cor },
      right: { style: 'thin', color: cor },
    };
  }

  async function gerarExcelCesari(produtos, opts) {
    const ExcelJS = window.ExcelJS || window.exceljs;
    if (!ExcelJS) {
      alert('Biblioteca Excel não carregada. Recarregue a página.');
      return;
    }

    opts = opts || {};
    LARGURAS_COLS_ATUAL = LARGURAS_COM_COL_CESARI.slice();
    const lastColLetter = colLetterFromIndex(LARGURAS_COLS_ATUAL.length - 1);
    let firstItemRow = null;
    let lastItemRow = null;

    let b64Banner;
    try {
      b64Banner = await fetchImageBase64(LOGO_BANNER);
    } catch (e) {
      console.warn('Logo Excel:', e);
      b64Banner = null;
    }

    const { titulo, nomeArquivo, corTituloCategoria } = opts;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Tabela', {
      properties: { defaultRowHeight: 14.3, defaultColWidth: 9 },
      views: [{ showGridLines: true }],
    });

    aplicarLargurasColunas(ws);

    function mergeColsRow(row) {
      ws.mergeCells('A' + row + ':' + lastColLetter + row);
    }

    /* Logo: inserir ANTES de mesclar linha 1 — merge pode alterar âncora do desenho no Excel. */
    const LARGURA_BANNER_PX = 400;
    const ALTURA_BANNER_PX = 58;
    const colInicioLogo =
      b64Banner && LARGURA_BANNER_PX > 0
        ? tlColLogoCentralizadoSobreGrade(LARGURAS_COLS_ATUAL, LARGURA_BANNER_PX, 7)
        : 0;

    if (b64Banner) {
      const idBanner = wb.addImage({ base64: b64Banner, extension: 'png' });
      ws.addImage(idBanner, {
        tl: { col: colInicioLogo, row: 0.05 },
        ext: { width: LARGURA_BANNER_PX, height: ALTURA_BANNER_PX },
        editAs: 'absolute',
      });
    }

    /* Cabeçalho: linhas 1–2 — fundo branco; texto alinhado ao centro na largura total. */
    ws.mergeCells('A1:' + lastColLetter + '1');
    ws.mergeCells('A2:' + lastColLetter + '2');
    ws.getRow(1).height = 62;
    ws.getRow(2).height = 18;
    ['A1', 'A2'].forEach(function (addr) {
      const c = ws.getCell(addr);
      aplicarFillSolid(c, 'FFFFFFFF');
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    const cats = ordemCategorias(produtos);
    let r = 3;
    const ano = new Date().getFullYear();

    mergeColsRow(r);
    const cTit = ws.getCell(r, 1);
    cTit.value = titulo;
    cTit.font = { size: 16, bold: true, color: { argb: 'FFDC2626' } };
    aplicarFillSolid(cTit, FILL_ITEM_PAR);
    cTit.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(r).height = 28.05;
    r++;

    mergeColsRow(r);
    const cSub = ws.getCell(r, 1);
    cSub.value =
      'G8 Representações — Preços conforme tabela no sistema em ' +
      new Date().toLocaleDateString('pt-BR') +
      ' — Tabela ' +
      ano;
    cSub.font = { size: 10, italic: true, color: { argb: 'FF64748B' } };
    aplicarFillSolid(cSub, FILL_ITEM_PAR);
    cSub.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.getRow(r).height = 14.3;
    r++;

    mergeColsRow(r);
    aplicarFillSolid(ws.getCell(r, 1), FILL_ITEM_PAR);
    ws.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(r).height = 12.1;
    r++;

    mergeColsRow(r);
    const cInstr = ws.getCell(r, 1);
    cInstr.value =
      'Preencha a coluna Qtd. O Total por linha é calculado automaticamente (preço unitário × quantidade). No rodapé: soma de todos os itens (apenas linhas com quantidade informada).';
    cInstr.font = { size: 10, italic: true, color: { argb: 'FF334155' } };
    aplicarFillSolid(cInstr, FILL_ITEM_PAR);
    cInstr.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cInstr.border = novaBordaItem();
    ws.getRow(r).height = 32;
    r++;

    mergeColsRow(r);
    aplicarFillSolid(ws.getCell(r, 1), FILL_ITEM_PAR);
    ws.getCell(r, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(r).height = 8;
    r++;

    let indiceItemGlobal = 0;

    for (let ci = 0; ci < cats.length; ci++) {
      const cat = cats[ci];
      const itens = produtos.filter(function (p) {
        return (p.CATEGORIA || 'Sem categoria') === cat;
      });

      mergeColsRow(r);
      const headCat = ws.getCell(r, 1);
      headCat.value = String(cat).toUpperCase();
      aplicarFillSolid(headCat, corTituloCategoria || 'FFB91C1C');
      headCat.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      headCat.alignment = { horizontal: 'center', vertical: 'middle' };
      headCat.border = novaBordaItem();
      ws.getRow(r).height = 23.95;
      r++;

      const hdr = ['Ref.', 'Descrição', 'Tamanhos', 'Preço unit. (R$)', 'Qtd.', 'Total (R$)'];
      for (let h = 0; h < hdr.length; h++) {
        const cell = ws.getCell(r, h + 1);
        cell.value = hdr[h];
        cell.font = { bold: true, size: 10 };
        aplicarFillSolid(cell, 'FFF1F5F9');
        cell.border = novaBordaItem();
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
      }
      ws.getRow(r).height = 14.3;
      r++;

      for (let j = 0; j < itens.length; j++) {
        const p = itens[j];
        const preco = precoNum(p);
        const zebra = indiceItemGlobal % 2 === 1;
        const fgArgb = zebra ? FILL_ITEM_IMPAR : FILL_ITEM_PAR;
        indiceItemGlobal++;

        if (firstItemRow === null) firstItemRow = r;
        lastItemRow = r;

        const c1 = ws.getCell(r, 1);
        c1.value = refProduto(p);
        aplicarFillSolid(c1, fgArgb);
        c1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c1.border = novaBordaItem();

        const c2 = ws.getCell(r, 2);
        c2.value = descricaoProduto(p);
        aplicarFillSolid(c2, fgArgb);
        c2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c2.border = novaBordaItem();

        const c3 = ws.getCell(r, 3);
        c3.value = formatarTamanhos(p);
        aplicarFillSolid(c3, fgArgb);
        c3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c3.border = novaBordaItem();

        const cPrecoUnit = ws.getCell(r, 4);
        cPrecoUnit.value = Number(preco);
        aplicarFillSolid(cPrecoUnit, fgArgb);
        cPrecoUnit.border = novaBordaItem();
        cPrecoUnit.alignment = { horizontal: 'center', vertical: 'middle' };
        cPrecoUnit.numFmt = '#,##0.00';

        const cQtd = ws.getCell(r, 5);
        cQtd.value = null;
        aplicarFillSolid(cQtd, 'FFFEF9C7');
        cQtd.border = novaBordaItem();
        cQtd.alignment = { horizontal: 'center', vertical: 'middle' };
        cQtd.numFmt = '0';

        const cTotalLinha = ws.getCell(r, 6);
        cTotalLinha.value = { formula: 'D' + r + '*N(E' + r + ')' };
        aplicarFillSolid(cTotalLinha, fgArgb);
        cTotalLinha.border = novaBordaItem();
        cTotalLinha.alignment = { horizontal: 'center', vertical: 'middle' };
        cTotalLinha.numFmt = '#,##0.00';

        ws.getRow(r).height = 14.3;
        r++;
      }
    }

    if (firstItemRow !== null && lastItemRow !== null) {
      ws.mergeCells('A' + r + ':E' + r);
      const cTotLab = ws.getCell(r, 1);
      cTotLab.value = 'TOTAL DO PEDIDO (R$)';
      cTotLab.font = { bold: true, size: 12 };
      aplicarFillSolid(cTotLab, 'FFE2E8F0');
      cTotLab.alignment = { horizontal: 'right', vertical: 'middle' };
      cTotLab.border = novaBordaItem();

      const cTotVal = ws.getCell(r, 6);
      cTotVal.value = { formula: 'SUM(F' + firstItemRow + ':F' + lastItemRow + ')' };
      cTotVal.font = { bold: true, size: 12 };
      aplicarFillSolid(cTotVal, 'FFE2E8F0');
      cTotVal.alignment = { horizontal: 'center', vertical: 'middle' };
      cTotVal.border = novaBordaItem();
      cTotVal.numFmt = '#,##0.00';
      ws.getRow(r).height = 22;
      r++;
    }

    mergeColsRow(r);
    aplicarFillSolid(ws.getCell(r, 1), FILL_ITEM_PAR);
    ws.getRow(r).height = 10;
    r++;

    mergeColsRow(r);
    const cPolTit = ws.getCell(r, 1);
    cPolTit.value = POLITICA_COMERCIAL_TITULO;
    aplicarFillSolid(cPolTit, 'FFFFFF00');
    cPolTit.font = { bold: true, size: 11, color: { argb: 'FF000000' } };
    cPolTit.alignment = { horizontal: 'center', vertical: 'middle' };
    cPolTit.border = novaBordaPreta();
    ws.getRow(r).height = 20;
    r++;

    const alturasPolitica = [18, 18, 22];
    for (let pi = 0; pi < POLITICA_COMERCIAL_ITENS.length; pi++) {
      mergeColsRow(r);
      const cPol = ws.getCell(r, 1);
      cPol.value = POLITICA_COMERCIAL_ITENS[pi];
      aplicarFillSolid(cPol, FILL_ITEM_PAR);
      cPol.font = { bold: true, italic: true, size: 10, color: { argb: 'FF000000' } };
      cPol.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cPol.border = novaBordaPreta();
      ws.getRow(r).height = alturasPolitica[pi] || 20;
      r++;
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  async function gerarPdfCesari(produtos, opts) {
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

    const { titulo, nomeArquivo, corCategoriaRgb } = opts;
    const doc = new JSPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const m = 10;
    const anoAtual = new Date().getFullYear();

    if (dataUrlBanner) {
      const imgW = Math.min(132, pageW - 2 * m);
      const imgH = (imgW * 22) / 150;
      doc.addImage(dataUrlBanner, 'PNG', (pageW - imgW) / 2, 7, imgW, imgH);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text(titulo, pageW / 2, 33, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'G8 Representações — Preços conforme tabela no sistema em ' +
        new Date().toLocaleDateString('pt-BR') +
        ' — Tabela ' +
        anoAtual,
      pageW / 2,
      39,
      { align: 'center' }
    );

    const cats = ordemCategorias(produtos);
    const catFill = corCategoriaRgb || [185, 28, 28];
    let y = 44;
    const bottomSafe = 18;
    const tableMargins = { left: m, right: m, bottom: 14 };
    const colStyles = {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
    };

    let indiceItemGlobalPdf = 0;

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

      if (bodyRows.length === 0) continue;

      if (y > pageH - bottomSafe) {
        doc.addPage();
        y = m;
      }

      const faixaCat = 8.5;
      doc.setFillColor(catFill[0], catFill[1], catFill[2]);
      doc.rect(m, y, pageW - 2 * m, faixaCat, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(String(cat).toUpperCase(), pageW / 2, y + faixaCat / 2 + 1.4, {
        align: 'center',
        baseline: 'middle',
      });
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      y += faixaCat + 2;

      const zebraInicio = indiceItemGlobalPdf;

      doc.autoTable({
        startY: y,
        head: [['Ref.', 'Descrição', 'Tamanhos', 'Preço unit.', 'Qtd.', 'Total (R$)']],
        body: bodyRows,
        theme: 'grid',
        headStyles: {
          fillColor: PDF_HEAD_BG,
          textColor: [30, 41, 59],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
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
        columnStyles: colStyles,
        margin: tableMargins,
        didParseCell: function (data) {
          if (data.section === 'head') {
            data.cell.styles.fillColor = PDF_HEAD_BG;
            data.cell.styles.halign = 'center';
            data.cell.styles.valign = 'middle';
          }
          if (data.section === 'body') {
            const gi = zebraInicio + data.row.index;
            const zebra = gi % 2 === 1;
            data.cell.styles.fillColor = zebra ? PDF_FILL_ZEBRA_IMPAR : PDF_FILL_ZEBRA_PAR;
            data.cell.styles.halign = 'center';
            data.cell.styles.valign = 'middle';
            data.cell.styles.textColor = [15, 23, 42];
            if (data.column.index === 4) {
              data.cell.styles.fillColor = zebra ? [254, 243, 199] : [255, 251, 235];
            }
          }
        },
      });

      indiceItemGlobalPdf += bodyRows.length;
      y = doc.autoTable.previous.finalY + 8;
    }

    if (y + 16 > pageH - bottomSafe) {
      doc.addPage();
      y = m;
    } else {
      y += 2;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL DO PEDIDO (R$):', m, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No Excel o total é calculado; no PDF preencha Qtd., totais por linha e some aqui.', m, y + 4.5);
    doc.setFontSize(10);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.line(m + 58, y + 1.2, pageW - m, y + 1.2);
    y += 12;

    const alturaPoliticaEstimada = 14 + POLITICA_COMERCIAL_ITENS.length * 11;
    if (y + alturaPoliticaEstimada > pageH - bottomSafe) {
      doc.addPage();
      y = m;
    } else {
      y += 4;
    }

    doc.autoTable({
      startY: y,
      head: [[POLITICA_COMERCIAL_TITULO]],
      body: POLITICA_COMERCIAL_ITENS.map(function (linha) {
        return [linha];
      }),
      theme: 'grid',
      headStyles: {
        fillColor: PDF_POLITICA_HEADER_BG,
        textColor: [0, 0, 0],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineColor: PDF_POLITICA_BORDA,
        lineWidth: 0.2,
      },
      styles: {
        fontSize: 7.2,
        cellPadding: 1.6,
        overflow: 'linebreak',
        valign: 'middle',
        halign: 'left',
        lineColor: PDF_POLITICA_BORDA,
        lineWidth: 0.2,
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: pageW - 2 * m },
      },
      margin: { left: m, right: m, bottom: 14 },
      didParseCell: function (data) {
        if (data.section === 'body') {
          data.cell.styles.fontStyle = 'bolditalic';
          data.cell.styles.fillColor = [255, 255, 255];
        }
      },
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(
        'G8 Representações — g8representacoes.vercel.app',
        pageW / 2,
        pageH - 6,
        { align: 'center' }
      );
    }

    doc.save(nomeArquivo);
  }

  async function exportarTabelaCesari(formato) {
    const isPdf = formato === 'pdf';
    const loading = window.loadingSystem;
    if (loading && typeof loading.showOverlay === 'function') {
      loading.showOverlay(isPdf ? 'Gerando PDF…' : 'Gerando Excel…');
    }

    try {
      const produtos = obterProdutosCesari();
      const ano = new Date().getFullYear();
      const baseNome = 'Tabela Cesari - ' + ano;
      const titulo = 'Tabela Cesari — ' + ano;
      const corTituloCategoria = 'FFB91C1C';
      const corRgb = [185, 28, 28];

      if (isPdf) {
        await gerarPdfCesari(produtos, {
          titulo: titulo,
          nomeArquivo: baseNome + '.pdf',
          corCategoriaRgb: corRgb,
        });
      } else {
        await gerarExcelCesari(produtos, {
          titulo: titulo,
          nomeArquivo: baseNome + '.xlsx',
          corTituloCategoria: corTituloCategoria,
        });
      }

      if (window.notifications && typeof window.notifications.success === 'function') {
        window.notifications.success(
          isPdf
            ? 'PDF Cesari gerado (colunas Qtd. e Total para preenchimento).'
            : 'Excel Cesari gerado com preço unitário, Qtd., total por linha e total do pedido.',
          { title: 'Download', duration: 3200 }
        );
      }
    } catch (e) {
      console.error(e);
      if (window.notifications && typeof window.notifications.error === 'function') {
        window.notifications.error(
          (e && e.message) || 'Não foi possível gerar o arquivo.',
          { title: 'Erro', duration: 5000 }
        );
      } else {
        alert('Erro ao gerar a tabela: ' + ((e && e.message) || e));
      }
    } finally {
      if (loading && typeof loading.hideOverlay === 'function') {
        loading.hideOverlay();
      }
    }
  }

  window.baixarTabelaCesariExcel = function () {
    return exportarTabelaCesari('excel');
  };

  window.baixarTabelaCesariPdf = function () {
    return exportarTabelaCesari('pdf');
  };

})();
