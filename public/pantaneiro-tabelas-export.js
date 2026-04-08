/**
 * Exporta tabelas Pantaneiro 5 e 7 para Excel e PDF com logo G8 (banner),
 * usando os mesmos preços e categorias de pantaneiro5.html / pantaneiro7.html.
 * No Excel, linha editável de % e colunas com fórmulas (preço tabela × (1 − %/100)).
 */
(function () {
  'use strict';

  const LOGO_BANNER = 'https://i.imgur.com/vjq26ym.png';

  const MARKER = 'window.produtosData = ';

  function extractArrayLiteral(html) {
    const idx = html.indexOf(MARKER);
    if (idx === -1) return null;
    let i = idx + MARKER.length;
    while (i < html.length && /\s/.test(html[i])) i++;
    if (html[i] !== '[') return null;
    let depth = 0;
    const start = i;
    let inString = false;
    let stringDelim = null;
    let escape = false;
    for (; i < html.length; i++) {
      const c = html[i];
      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (c === '\\') {
          escape = true;
          continue;
        }
        if (c === stringDelim) {
          inString = false;
          stringDelim = null;
        }
        continue;
      }
      if (c === '"' || c === "'") {
        inString = true;
        stringDelim = c;
        continue;
      }
      if (c === '[') depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) return html.slice(start, i + 1);
      }
    }
    return null;
  }

  function parseProdutosLiteral(arrayLiteral) {
    const fn = new Function('return ' + arrayLiteral);
    return fn();
  }

  function ordemCategorias(produtos) {
    const ordem = [];
    const visto = new Set();
    for (let p = 0; p < produtos.length; p++) {
      const c = produtos[p].CATEGORIA || 'Sem categoria';
      if (!visto.has(c)) {
        visto.add(c);
        ordem.push(c);
      }
    }
    return ordem;
  }

  function formatarTamanhos(p) {
    if (!p || p.TAMANHOS == null) return '';
    if (Array.isArray(p.TAMANHOS)) return p.TAMANHOS.join(', ');
    return String(p.TAMANHOS);
  }

  function descricaoProduto(p) {
    return p['DESCRIÇÃO'] != null ? p['DESCRIÇÃO'] : p.DESCRIÇÃO || '';
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

  /** Valores iniciais na linha editável do Excel (o usuário altera direto na planilha). */
  const DESCONTOS_PRAZO_PADRAO = [1.2, 2.5, 5.0];
  const DESCONTOS_VOLUME_PADRAO = [2, 4, 6, 8, 10];

  /**
   * Um desconto por coluna, sempre sobre o preço tabela (D) apenas — não compõe prazo + volume.
   * Fórmula: D × (1 − %/100) com o % da mesma coluna (linha paramRow).
   */
  function formulaPrecoComDescontoExcel(dataRow, colIndex1Based, paramRow) {
    const letter = colLetterFromIndex(colIndex1Based - 1);
    return '$D' + dataRow + '*(1-' + letter + '$' + paramRow + '/100)';
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

  /** Larguras base; índices 0–3 = ref/desc/tam/preço; demais = colunas de desconto (estreitas). */
  function montarLargurasColunas(nPrazo, nVol) {
    const base = [10.25, 78.25, 35.875, 8.75];
    const nExtra = nPrazo + nVol;
    const extra = [];
    for (let i = 0; i < nExtra; i++) extra.push(11.25);
    return base.concat(extra);
  }

  function aplicarLargurasColunas(ws, larguras) {
    const arr = larguras || LARGURAS_COLS_ATUAL;
    for (let i = 0; i < arr.length; i++) {
      ws.getColumn(i + 1).width = arr[i];
    }
  }

  /** Atualizado em gerarExcelPantaneiro conforme quantidade de colunas. */
  let LARGURAS_COLS_ATUAL = [10.25, 78.25, 35.875, 8.75];

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
    'PEDIDO MÍNIMO PARA FATURAMENTO R$ 2.000,00;',
    'PRIMEIRA COMPRA PAGAMENTO A VISTA ANTECIPADO;',
    'ACRESCIMO DE 15% NO VALOR PARA TAMANHOS EXG / 2G E 3G;',
    'ACRESCIMO DE 40% NO VALOR PARA TAMANHOS 4G E 5G;',
    'DESCONTO POR PRAZO MÉDIO: Á VISTA 5% / 30 DIAS 2,5% / 45 DIAS 1,2%',
    'DESCONTO DE VOLUME POR PEDIDO: 30 A 100 PEÇAS - 2% / 101 A 300 - 4% / 301 A 600 - 6% / 601 A 1000 - 8% / 1001 A 2000 - 9% / EM DIANTE 10%;',
    'CORTA VENTO E BOTAS DE COURO SEM DESCONTO VOLUME;',
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

  async function gerarExcelPantaneiro(produtos, opts) {
    const ExcelJS = window.ExcelJS || window.exceljs;
    if (!ExcelJS) {
      alert('Biblioteca Excel não carregada. Recarregue a página.');
      return;
    }

    opts = opts || {};
    const descontosPrazo =
      Array.isArray(opts.descontosPrazo) && opts.descontosPrazo.length
        ? opts.descontosPrazo
        : DESCONTOS_PRAZO_PADRAO.slice();
    const descontosVolume =
      Array.isArray(opts.descontosVolume) && opts.descontosVolume.length
        ? opts.descontosVolume
        : DESCONTOS_VOLUME_PADRAO.slice();
    LARGURAS_COLS_ATUAL = montarLargurasColunas(descontosPrazo.length, descontosVolume.length);
    const lastColLetter = colLetterFromIndex(LARGURAS_COLS_ATUAL.length - 1);

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
      properties: { defaultRowHeight: 14.3 },
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
    ws.getRow(r).height = 18;
    r++;

    mergeColsRow(r);
    const cInstr = ws.getCell(r, 1);
    cInstr.value =
      'Dois descontos separados — Prazo e Volume: não se somam nem se combinam na mesma célula. Cada coluna de preço usa só o % daquela coluna sobre o preço de tabela (linha amarela abaixo).';
    cInstr.font = { size: 10, italic: true, color: { argb: 'FF334155' } };
    aplicarFillSolid(cInstr, FILL_ITEM_PAR);
    cInstr.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cInstr.border = novaBordaItem();
    ws.getRow(r).height = 36;
    r++;

    const iFirstPrazoCol = 5;
    const iLastPrazoCol = 4 + descontosPrazo.length;
    const iFirstVolCol = iLastPrazoCol + 1;
    const iLastVolCol = iLastPrazoCol + descontosVolume.length;
    const Ltr = colLetterFromIndex;

    ws.mergeCells('A' + r + ':D' + r);
    const cTipo = ws.getCell(r, 1);
    cTipo.value = 'Tipos (independentes)';
    cTipo.font = { size: 10, bold: true, color: { argb: 'FF475569' } };
    aplicarFillSolid(cTipo, 'FFE8EEF4');
    cTipo.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cTipo.border = novaBordaItem();

    ws.mergeCells(Ltr(iFirstPrazoCol - 1) + r + ':' + Ltr(iLastPrazoCol - 1) + r);
    const cHdrPrazo = ws.getCell(r, iFirstPrazoCol);
    cHdrPrazo.value = 'Desconto prazo (cada faixa à parte)';
    cHdrPrazo.font = { size: 10, bold: true, color: { argb: 'FF92400E' } };
    aplicarFillSolid(cHdrPrazo, 'FFFEF3C7');
    cHdrPrazo.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cHdrPrazo.border = novaBordaItem();

    ws.mergeCells(Ltr(iFirstVolCol - 1) + r + ':' + Ltr(iLastVolCol - 1) + r);
    const cHdrVol = ws.getCell(r, iFirstVolCol);
    cHdrVol.value = 'Desconto volume (cada faixa à parte)';
    cHdrVol.font = { size: 10, bold: true, color: { argb: 'FF1E40AF' } };
    aplicarFillSolid(cHdrVol, 'FFDBEAFE');
    cHdrVol.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cHdrVol.border = novaBordaItem();

    ws.getRow(r).height = 22;
    r++;

    const paramValueRow = r;
    ws.mergeCells('A' + r + ':D' + r);
    const cPctLabel = ws.getCell(r, 1);
    cPctLabel.value = '% editáveis (prazo → volume) — cada uma vale só para a coluna acima dela nas categorias';
    cPctLabel.font = { size: 9, bold: true };
    aplicarFillSolid(cPctLabel, 'FFFFF3CD');
    cPctLabel.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cPctLabel.border = novaBordaItem();

    let colPct = 5;
    for (let di = 0; di < descontosPrazo.length; di++) {
      const cPct = ws.getCell(r, colPct);
      cPct.value = descontosPrazo[di];
      cPct.numFmt = '0.00';
      aplicarFillSolid(cPct, 'FFFEF3C7');
      cPct.font = { bold: true };
      cPct.alignment = { horizontal: 'center', vertical: 'middle' };
      cPct.border = novaBordaItem();
      colPct++;
    }
    for (let di = 0; di < descontosVolume.length; di++) {
      const cPct = ws.getCell(r, colPct);
      cPct.value = descontosVolume[di];
      cPct.numFmt = '0.00';
      aplicarFillSolid(cPct, 'FFDBEAFE');
      cPct.font = { bold: true };
      cPct.alignment = { horizontal: 'center', vertical: 'middle' };
      cPct.border = novaBordaItem();
      colPct++;
    }
    ws.getRow(r).height = 20;
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

      const hdr = ['Ref.', 'Descrição', 'Tamanhos', 'Preço tabela (R$)'];
      for (let hi = 0; hi < descontosPrazo.length; hi++) {
        hdr.push('Só prazo ' + (hi + 1));
      }
      for (let hi = 0; hi < descontosVolume.length; hi++) {
        hdr.push('Só volume ' + (hi + 1));
      }
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

        const c1 = ws.getCell(r, 1);
        c1.value = p.REFERENCIA != null ? String(p.REFERENCIA) : '';
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

        const c4 = ws.getCell(r, 4);
        c4.value = preco;
        aplicarFillSolid(c4, fgArgb);
        c4.border = novaBordaItem();
        c4.alignment = { horizontal: 'center', vertical: 'middle' };
        c4.numFmt = '#,##0.00';

        let col = 5;
        for (let di = 0; di < descontosPrazo.length; di++) {
          const cx = ws.getCell(r, col);
          cx.value = { formula: formulaPrecoComDescontoExcel(r, col, paramValueRow) };
          aplicarFillSolid(cx, fgArgb);
          cx.border = novaBordaItem();
          cx.alignment = { horizontal: 'center', vertical: 'middle' };
          cx.numFmt = '#,##0.00';
          col++;
        }
        for (let di = 0; di < descontosVolume.length; di++) {
          const cx = ws.getCell(r, col);
          cx.value = { formula: formulaPrecoComDescontoExcel(r, col, paramValueRow) };
          aplicarFillSolid(cx, fgArgb);
          cx.border = novaBordaItem();
          cx.alignment = { horizontal: 'center', vertical: 'middle' };
          cx.numFmt = '#,##0.00';
          col++;
        }

        ws.getRow(r).height = 14.3;
        r++;
      }
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

    const alturasPolitica = [18, 18, 18, 18, 22, 36, 22];
    for (let pi = 0; pi < POLITICA_COMERCIAL_ITENS.length; pi++) {
      mergeColsRow(r);
      const cPol = ws.getCell(r, 1);
      cPol.value = POLITICA_COMERCIAL_ITENS[pi];
      aplicarFillSolid(cPol, FILL_ITEM_PAR);
      cPol.font = { bold: true, italic: true, size: 10, color: { argb: 'FF000000' } };
      cPol.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
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

  async function gerarPdfPantaneiro(produtos, opts) {
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
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 'auto', halign: 'center' },
      2: { cellWidth: 38, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
    };

    let indiceItemGlobalPdf = 0;

    for (let c = 0; c < cats.length; c++) {
      const cat = cats[c];
      const itens = produtos.filter(function (p) {
        return (p.CATEGORIA || 'Sem categoria') === cat;
      });
      const bodyRows = itens.map(function (p) {
        return [
          String(p.REFERENCIA != null ? p.REFERENCIA : ''),
          descricaoProduto(p),
          formatarTamanhos(p),
          precoNum(p).toFixed(2).replace('.', ','),
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
        head: [['Ref.', 'Descrição', 'Tamanhos', 'Preço (R$)']],
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
          }
        },
      });

      indiceItemGlobalPdf += bodyRows.length;
      y = doc.autoTable.previous.finalY + 8;
    }

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

  async function carregarProdutosDaPagina(arquivoHtml) {
    const res = await fetch(arquivoHtml, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao carregar ' + arquivoHtml);
    const html = await res.text();
    const lit = extractArrayLiteral(html);
    if (!lit) throw new Error('Lista de produtos não encontrada em ' + arquivoHtml);
    return parseProdutosLiteral(lit);
  }

  async function exportarTabelaPantaneiro(tabela, formato) {
    const n = Number(tabela);
    if (n !== 5 && n !== 7) return;

    const isPdf = formato === 'pdf';
    const loading = window.loadingSystem;
    if (loading && typeof loading.showOverlay === 'function') {
      loading.showOverlay(isPdf ? 'Gerando PDF…' : 'Gerando Excel…');
    }

    try {
      const arquivo = n === 5 ? 'pantaneiro5.html' : 'pantaneiro7.html';
      const produtos = await carregarProdutosDaPagina(arquivo);
      const ano = new Date().getFullYear();
      const baseNome = 'Tabela Pantaneiro ' + n + ' - ' + ano;
      const titulo = 'Tabela Pantaneiro ' + n + ' — ' + ano;
      const corTituloCategoria = n === 5 ? 'FFB91C1C' : 'FF1D4ED8';
      const corRgb = n === 5 ? [185, 28, 28] : [29, 78, 216];

      if (isPdf) {
        await gerarPdfPantaneiro(produtos, {
          titulo: titulo,
          nomeArquivo: baseNome + '.pdf',
          corCategoriaRgb: corRgb,
        });
      } else {
        await gerarExcelPantaneiro(produtos, {
          titulo: titulo,
          nomeArquivo: baseNome + '.xlsx',
          corTituloCategoria: corTituloCategoria,
        });
      }

      if (window.notifications && typeof window.notifications.success === 'function') {
        window.notifications.success(
          isPdf
            ? 'PDF gerado com logos e preços atuais.'
            : 'Excel gerado com preço de tabela, linha editável de % e fórmulas de desconto, e logos G8.',
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

  window.baixarTabelaPantaneiroExcel = function (tabela) {
    return exportarTabelaPantaneiro(tabela, 'excel');
  };

  window.baixarTabelaPantaneiroPdf = function (tabela) {
    return exportarTabelaPantaneiro(tabela, 'pdf');
  };

})();
