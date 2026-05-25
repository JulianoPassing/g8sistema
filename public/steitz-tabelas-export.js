/**
 * Exporta tabela Steitz para Excel e PDF (mesmo padrão Pantaneiro/Cesari).
 * Excel: lista de prazo (30/60/90, 30/45/60, À Vista) altera coluna Preço; Qtd.; Total linha; total pedido.
 * PDF: três colunas de preço + Qtd. e Total em branco.
 */
(function () {
  'use strict';

  const LOGO_BANNER = 'https://i.imgur.com/vjq26ym.png';
  const MARKER = 'const produtosData = ';

  const PRAZO_LABELS = ['30/60/90 Dias', '30/45/60 Dias', 'À Vista'];
  const PRAZO_DEFAULT = '30/60/90 Dias';

  const LARGURAS_STEITZ = [10, 42, 14, 12, 8, 13, 11, 11, 11, 3.5];
  const LARGURAS_VISIVEIS = 6;
  const lastMergeLetter = 'F';
  const COL_PRECO_306090 = 7;
  const COL_PRECO_304560 = 8;
  const COL_PRECO_AVISTA = 9;
  const COL_LISTA_PRAZO = 10;

  const POLITICA_COMERCIAL_TITULO = 'POLITICA COMERCIAL';
  const POLITICA_COMERCIAL_ITENS = [
    'PREÇOS CONFORME TABELA STEITZ NO SISTEMA G8 (À VISTA / 30-45-60 / 30-60-90 DIAS);',
    'FRETE CIF: PEDIDO MÍNIMO R$ 3.000,00 — ABAIXO DISSO CONSULTAR FRETE (FOB);',
    'PREENCHER QTD. EM CADA NUMERAÇÃO (TAMANHO) DO MODELO — UMA LINHA POR NÚMERO DA GRADE.',
  ];

  const FILL_ITEM_PAR = 'FFFFFFFF';
  const FILL_ITEM_IMPAR = 'FFE5E7EB';
  const PDF_FILL_ZEBRA_PAR = [255, 255, 255];
  const PDF_FILL_ZEBRA_IMPAR = [229, 231, 235];
  const PDF_BORDA = [148, 163, 184];
  const PDF_HEAD_BG = [241, 245, 249];
  const PDF_POLITICA_HEADER_BG = [255, 213, 0];
  const PDF_POLITICA_BORDA = [0, 0, 0];

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

  function precoChave(p, key) {
    if (!p || !p.PRECOS) return 0;
    const v = p.PRECOS[key];
    return typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')) || 0;
  }

  function precoDefault(p) {
    return precoChave(p, 'p_30_60_90');
  }

  function formatarGrade(p) {
    return p.TAM != null ? String(p.TAM) : '';
  }

  /** Ex.: "37 a 45" → ["37","38",…,"45"] (igual steitz.html). */
  function parseTamanhoRange(tamStr) {
    if (tamStr == null || tamStr === '') return null;
    const match = String(tamStr)
      .trim()
      .match(/^(\d+)\s*a\s*(\d+)$/i);
    if (!match) return null;
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    if (isNaN(start) || isNaN(end) || start > end) return null;
    const range = [];
    for (let i = start; i <= end; i++) range.push(String(i));
    return range;
  }

  /** Uma linha de exportação por numeração (tamanho) de cada modelo. */
  function linhasPorNumeracao(produtos) {
    const linhas = [];
    for (let j = 0; j < produtos.length; j++) {
      const p = produtos[j];
      const nums = parseTamanhoRange(p.TAM);
      const gradeLabel = formatarGrade(p);
      if (nums && nums.length > 0) {
        for (let n = 0; n < nums.length; n++) {
          linhas.push({
            produto: p,
            produtoIdx: j,
            numeracao: nums[n],
            gradeLabel: gradeLabel,
            manual: false,
          });
        }
      } else {
        linhas.push({
          produto: p,
          produtoIdx: j,
          numeracao: 'MANUAL',
          gradeLabel: gradeLabel || '—',
          manual: true,
        });
      }
    }
    return linhas;
  }

  function refProduto(p) {
    return p.REF != null ? String(p.REF) : '';
  }

  function modeloProduto(p) {
    return p.MODELO != null ? String(p.MODELO) : '';
  }

  /** Preço unitário conforme célula de prazo (col. C) na linha selDescontoRow. */
  function formulaPrecoPrazoSteitz(dataRow, selRow) {
    const c = '$C$' + selRow;
    const g = 'G' + dataRow;
    const h = 'H' + dataRow;
    const i = 'I' + dataRow;
    return (
      'IFERROR(IF(' +
      c +
      '="À Vista",' +
      i +
      ',IF(' +
      c +
      '="30/45/60 Dias",' +
      h +
      ',' +
      g +
      ')),' +
      g +
      ')'
    );
  }

  function refListaValidacaoAbs(colLetter, rowIni, rowFim) {
    return '$' + colLetter + '$' + rowIni + ':$' + colLetter + '$' + rowFim;
  }

  function aplicarLargurasColunas(ws) {
    for (let i = 0; i < LARGURAS_STEITZ.length; i++) {
      ws.getColumn(i + 1).width = LARGURAS_STEITZ[i];
    }
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

  async function carregarProdutosSteitz() {
    const res = await fetch('steitz.html', { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao carregar steitz.html');
    const html = await res.text();
    const lit = extractArrayLiteral(html);
    if (!lit) throw new Error('Lista de produtos não encontrada em steitz.html');
    return parseProdutosLiteral(lit);
  }

  async function gerarExcelSteitz(produtos, opts) {
    const ExcelJS = window.ExcelJS || window.exceljs;
    if (!ExcelJS) {
      alert('Biblioteca Excel não carregada. Recarregue a página.');
      return;
    }

    opts = opts || {};
    let firstItemRow = null;
    let lastItemRow = null;

    let b64Banner;
    try {
      b64Banner = await fetchImageBase64(LOGO_BANNER);
    } catch (e) {
      console.warn('Logo Excel:', e);
      b64Banner = null;
    }

    const { titulo, nomeArquivo } = opts;
    const wb = new ExcelJS.Workbook();
    wb.calcProperties = { fullCalcOnLoad: true };
    const ws = wb.addWorksheet('Tabela', {
      properties: { defaultRowHeight: 14.3, defaultColWidth: 9 },
      views: [{ showGridLines: true }],
    });

    aplicarLargurasColunas(ws);

    const LIST_ROW0 = 1;
    for (let li = 0; li < PRAZO_LABELS.length; li++) {
      ws.getCell(LIST_ROW0 + li, COL_LISTA_PRAZO).value = PRAZO_LABELS[li];
    }
    const refPrazoLista = refListaValidacaoAbs(
      'J',
      LIST_ROW0,
      LIST_ROW0 + PRAZO_LABELS.length - 1
    );

    function mergeColsRow(row) {
      ws.mergeCells('A' + row + ':' + lastMergeLetter + row);
    }

    const LARGURA_BANNER_PX = 400;
    const ALTURA_BANNER_PX = 58;
    const colInicioLogo =
      b64Banner && LARGURA_BANNER_PX > 0
        ? tlColLogoCentralizadoSobreGrade(LARGURAS_STEITZ.slice(0, LARGURAS_VISIVEIS), LARGURA_BANNER_PX, 7)
        : 0;

    if (b64Banner) {
      const idBanner = wb.addImage({ base64: b64Banner, extension: 'png' });
      ws.addImage(idBanner, {
        tl: { col: colInicioLogo, row: 0.05 },
        ext: { width: LARGURA_BANNER_PX, height: ALTURA_BANNER_PX },
        editAs: 'absolute',
      });
    }

    ws.mergeCells('A1:' + lastMergeLetter + '1');
    ws.mergeCells('A2:' + lastMergeLetter + '2');
    ws.getRow(1).height = 62;
    ws.getRow(2).height = 18;
    ['A1', 'A2'].forEach(function (addr) {
      const c = ws.getCell(addr);
      aplicarFillSolid(c, 'FFFFFFFF');
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    let r = 3;
    const ano = new Date().getFullYear();

    mergeColsRow(r);
    const cTit = ws.getCell(r, 1);
    cTit.value = titulo;
    cTit.font = { size: 16, bold: true, color: { argb: 'FF000000' } };
    aplicarFillSolid(cTit, FILL_ITEM_PAR);
    cTit.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(r).height = 28;
    r++;

    mergeColsRow(r);
    const cSub = ws.getCell(r, 1);
    cSub.value =
      'G8 Representações — Steitz — Preços em ' +
      new Date().toLocaleDateString('pt-BR') +
      ' — ' +
      ano;
    cSub.font = { size: 10, italic: true, color: { argb: 'FF64748B' } };
    aplicarFillSolid(cSub, FILL_ITEM_PAR);
    cSub.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.getRow(r).height = 14.3;
    r++;

    mergeColsRow(r);
    aplicarFillSolid(ws.getCell(r, 1), FILL_ITEM_PAR);
    ws.getRow(r).height = 10;
    r++;

    mergeColsRow(r);
    const cInstr = ws.getCell(r, 1);
    cInstr.value =
      'Selecione o prazo na célula abaixo (lista). Cada modelo aparece com uma linha por numeração (tamanho) da grade — preencha a Qtd. de cada número. Preço unit. conforme prazo; Total da linha = Preço × Qtd.; rodapé = total do pedido.';
    cInstr.font = { size: 10, italic: true, color: { argb: 'FF334155' } };
    aplicarFillSolid(cInstr, FILL_ITEM_PAR);
    cInstr.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cInstr.border = novaBordaItem();
    ws.getRow(r).height = 34;
    r++;

    const selPrazoRow = r;
    ws.mergeCells('A' + r + ':B' + r);
    const cLabPrazo = ws.getCell(r, 1);
    cLabPrazo.value = 'Prazo / tabela de preços';
    cLabPrazo.font = { bold: true, size: 10 };
    aplicarFillSolid(cLabPrazo, 'FFF1F5F9');
    cLabPrazo.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cLabPrazo.border = novaBordaItem();

    const cValPrazo = ws.getCell(r, 3);
    cValPrazo.value = PRAZO_DEFAULT;
    aplicarFillSolid(cValPrazo, 'FFFEF3C7');
    cValPrazo.font = { bold: true, size: 11 };
    cValPrazo.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cValPrazo.border = novaBordaItem();
    cValPrazo.dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['=' + refPrazoLista],
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle: 'Prazo',
      error: 'Escolha: 30/60/90 Dias, 30/45/60 Dias ou À Vista.',
    };

    for (let cc = 4; cc <= LARGURAS_STEITZ.length; cc++) {
      const cx = ws.getCell(r, cc);
      aplicarFillSolid(cx, FILL_ITEM_PAR);
      cx.border = novaBordaItem();
    }
    ws.getRow(r).height = 26;
    r++;

    mergeColsRow(r);
    aplicarFillSolid(ws.getCell(r, 1), FILL_ITEM_PAR);
    ws.getRow(r).height = 8;
    r++;

    mergeColsRow(r);
    const headCat = ws.getCell(r, 1);
    headCat.value = 'PRODUTOS STEITZ';
    aplicarFillSolid(headCat, 'FF1F2937');
    headCat.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headCat.alignment = { horizontal: 'center', vertical: 'middle' };
    headCat.border = novaBordaItem();
    ws.getRow(r).height = 24;
    r++;

    const hdr = ['Ref.', 'Modelo', 'Numeração', 'Preço (R$)', 'Qtd.', 'Total (R$)'];
    for (let h = 0; h < hdr.length; h++) {
      const cell = ws.getCell(r, h + 1);
      cell.value = hdr[h];
      cell.font = { bold: true, size: 10 };
      aplicarFillSolid(cell, 'FFF1F5F9');
      cell.border = novaBordaItem();
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    }
    ws.getRow(r).height = 14.3;
    r++;

    const linhasNum = linhasPorNumeracao(produtos);
    const blocosMerge = [];
    let blocoIni = null;
    let refBlocoAtual = null;

    for (let li = 0; li < linhasNum.length; li++) {
      const ln = linhasNum[li];
      const p = ln.produto;
      const refAtual = refProduto(p);
      const novoBloco = li === 0 || refAtual !== refBlocoAtual;

      if (novoBloco) {
        if (blocoIni !== null) {
          blocosMerge.push({ start: blocoIni, end: r - 1 });
        }
        blocoIni = r;
        refBlocoAtual = refAtual;
      }

      const precoPadrao = precoDefault(p);
      const zebra = ln.produtoIdx % 2 === 1;
      const fgArgb = zebra ? FILL_ITEM_IMPAR : FILL_ITEM_PAR;

      if (firstItemRow === null) firstItemRow = r;
      lastItemRow = r;

      const c1 = ws.getCell(r, 1);
      if (novoBloco) c1.value = refAtual;
      aplicarFillSolid(c1, fgArgb);
      c1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c1.border = novaBordaItem();

      const c2 = ws.getCell(r, 2);
      if (novoBloco) {
        let textoModelo = modeloProduto(p);
        if (ln.gradeLabel) {
          textoModelo += '\n(Grade ' + ln.gradeLabel + ')';
        }
        if (ln.manual) {
          textoModelo += '\nPreencha Qtd. na linha MANUAL';
        }
        c2.value = textoModelo;
      }
      aplicarFillSolid(c2, fgArgb);
      c2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c2.border = novaBordaItem();

      const c3 = ws.getCell(r, 3);
      c3.value = ln.manual ? ln.gradeLabel || 'MANUAL' : ln.numeracao;
      aplicarFillSolid(c3, ln.manual ? 'FFFFE4E6' : fgArgb);
      c3.alignment = { horizontal: 'center', vertical: 'middle' };
      c3.border = novaBordaItem();
      if (!ln.manual) c3.font = { bold: true, size: 10 };

      const cG = ws.getCell(r, COL_PRECO_306090);
      cG.value = precoChave(p, 'p_30_60_90');
      aplicarFillSolid(cG, fgArgb);
      cG.numFmt = '#,##0.00';
      cG.border = novaBordaItem();

      const cH = ws.getCell(r, COL_PRECO_304560);
      cH.value = precoChave(p, 'p_30_45_60');
      aplicarFillSolid(cH, fgArgb);
      cH.numFmt = '#,##0.00';
      cH.border = novaBordaItem();

      const cI = ws.getCell(r, COL_PRECO_AVISTA);
      cI.value = precoChave(p, 'a_vista');
      aplicarFillSolid(cI, fgArgb);
      cI.numFmt = '#,##0.00';
      cI.border = novaBordaItem();

      const cPreco = ws.getCell(r, 4);
      cPreco.value = {
        formula: formulaPrecoPrazoSteitz(r, selPrazoRow),
        result: precoPadrao,
      };
      aplicarFillSolid(cPreco, fgArgb);
      cPreco.border = novaBordaItem();
      cPreco.alignment = { horizontal: 'center', vertical: 'middle' };
      cPreco.numFmt = '#,##0.00';

      const cQtd = ws.getCell(r, 5);
      cQtd.value = null;
      aplicarFillSolid(cQtd, 'FFFEF9C7');
      cQtd.border = novaBordaItem();
      cQtd.alignment = { horizontal: 'center', vertical: 'middle' };
      cQtd.numFmt = '0';

      const cTotal = ws.getCell(r, 6);
      cTotal.value = { formula: 'D' + r + '*N(E' + r + ')', result: 0 };
      aplicarFillSolid(cTotal, fgArgb);
      cTotal.border = novaBordaItem();
      cTotal.alignment = { horizontal: 'center', vertical: 'middle' };
      cTotal.numFmt = '#,##0.00';

      ws.getRow(r).height = ln.manual ? 16 : 14.3;
      r++;
    }

    if (blocoIni !== null) {
      blocosMerge.push({ start: blocoIni, end: r - 1 });
    }

    for (let b = 0; b < blocosMerge.length; b++) {
      const bl = blocosMerge[b];
      if (bl.end > bl.start) {
        ws.mergeCells('A' + bl.start + ':A' + bl.end);
        ws.mergeCells('B' + bl.start + ':B' + bl.end);
        const cRef = ws.getCell(bl.start, 1);
        const cMod = ws.getCell(bl.start, 2);
        cRef.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cMod.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
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
      cTotVal.value = {
        formula: 'SUM(F' + firstItemRow + ':F' + lastItemRow + ')',
        result: 0,
      };
      cTotVal.font = { bold: true, size: 12 };
      aplicarFillSolid(cTotVal, 'FFE2E8F0');
      cTotVal.alignment = { horizontal: 'center', vertical: 'middle' };
      cTotVal.border = novaBordaItem();
      cTotVal.numFmt = '#,##0.00';
      ws.getRow(r).height = 22;
      r++;
    }

    mergeColsRow(r);
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

    for (let pi = 0; pi < POLITICA_COMERCIAL_ITENS.length; pi++) {
      mergeColsRow(r);
      const cPol = ws.getCell(r, 1);
      cPol.value = POLITICA_COMERCIAL_ITENS[pi];
      aplicarFillSolid(cPol, FILL_ITEM_PAR);
      cPol.font = { bold: true, italic: true, size: 10, color: { argb: 'FF000000' } };
      cPol.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cPol.border = novaBordaPreta();
      ws.getRow(r).height = 20;
      r++;
    }

    ws.getColumn(COL_PRECO_306090).hidden = true;
    ws.getColumn(COL_PRECO_304560).hidden = true;
    ws.getColumn(COL_PRECO_AVISTA).hidden = true;
    ws.getColumn(COL_LISTA_PRAZO).hidden = true;

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

  async function gerarPdfSteitz(produtos, opts) {
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

    const { titulo, nomeArquivo } = opts;
    const doc = new JSPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const m = 8;
    const anoAtual = new Date().getFullYear();

    if (dataUrlBanner) {
      const imgW = Math.min(120, pageW - 2 * m);
      const imgH = (imgW * 22) / 150;
      doc.addImage(dataUrlBanner, 'PNG', (pageW - imgW) / 2, 5, imgW, imgH);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(titulo, pageW / 2, 22, { align: 'center' });

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'G8 Representações — Steitz — ' +
        new Date().toLocaleDateString('pt-BR') +
        ' — Uma linha por numeração; preencha Qtd. em cada tamanho (no Excel: prazo altera o preço).',
      pageW / 2,
      27,
      { align: 'center' }
    );

    const linhasPdf = linhasPorNumeracao(produtos);
    const bodyRows = linhasPdf.map(function (ln) {
      const p = ln.produto;
      return [
        refProduto(p),
        modeloProduto(p),
        ln.manual ? ln.gradeLabel || 'MANUAL' : ln.numeracao,
        precoChave(p, 'a_vista').toFixed(2).replace('.', ','),
        precoChave(p, 'p_30_45_60').toFixed(2).replace('.', ','),
        precoChave(p, 'p_30_60_90').toFixed(2).replace('.', ','),
        '',
        '',
      ];
    });

    let y = 32;
    const bottomSafe = 14;

    doc.autoTable({
      startY: y,
      head: [
        [
          'Ref.',
          'Modelo',
          'Nº',
          'À Vista',
          '30/45/60',
          '30/60/90',
          'Qtd.',
          'Total (R$)',
        ],
      ],
      body: bodyRows,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_HEAD_BG,
        textColor: [30, 41, 59],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineColor: PDF_BORDA,
        lineWidth: 0.15,
      },
      styles: {
        fontSize: 6.5,
        cellPadding: 1.1,
        overflow: 'linebreak',
        valign: 'middle',
        halign: 'center',
        lineColor: PDF_BORDA,
        lineWidth: 0.15,
      },
        columnStyles: {
        0: { cellWidth: 11 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 10 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 9 },
        7: { cellWidth: 16 },
      },
      margin: { left: m, right: m, bottom: 12 },
      didParseCell: function (data) {
        if (data.section === 'body') {
          const zebra = data.row.index % 2 === 1;
          data.cell.styles.fillColor = zebra ? PDF_FILL_ZEBRA_IMPAR : PDF_FILL_ZEBRA_PAR;
          if (data.column.index === 2) {
            data.cell.styles.fontStyle = 'bold';
          }
          if (data.column.index === 6) {
            data.cell.styles.fillColor = zebra ? [254, 243, 199] : [255, 251, 235];
          }
        }
      },
    });

    y = doc.autoTable.previous.finalY + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL DO PEDIDO (R$):', m, y);
    doc.setDrawColor(148, 163, 184);
    doc.line(m + 42, y + 1, pageW - m, y + 1);

    y += 10;
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
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
        lineColor: PDF_POLITICA_BORDA,
        lineWidth: 0.2,
      },
      styles: {
        fontSize: 7,
        cellPadding: 1.4,
        overflow: 'linebreak',
        halign: 'left',
        lineColor: PDF_POLITICA_BORDA,
        lineWidth: 0.2,
      },
      columnStyles: {
        0: { cellWidth: pageW - 2 * m },
      },
      margin: { left: m, right: m, bottom: 10 },
    });

    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('G8 Representações — g8representacoes.vercel.app', pageW / 2, pageH - 5, {
        align: 'center',
      });
    }

    doc.save(nomeArquivo);
  }

  async function exportarTabelaSteitz(formato) {
    const isPdf = formato === 'pdf';
    const loading = window.loadingSystem;
    if (loading && typeof loading.showOverlay === 'function') {
      loading.showOverlay(isPdf ? 'Gerando PDF…' : 'Gerando Excel…');
    }

    try {
      const produtos = await carregarProdutosSteitz();
      const ano = new Date().getFullYear();
      const baseNome = 'Tabela Steitz - ' + ano + ' - G8 Representações';
      const titulo = 'Tabela Steitz — ' + ano;

      if (isPdf) {
        await gerarPdfSteitz(produtos, {
          titulo: titulo,
          nomeArquivo: baseNome + '.pdf',
        });
      } else {
        await gerarExcelSteitz(produtos, {
          titulo: titulo,
          nomeArquivo: baseNome + '.xlsx',
        });
      }

      if (window.notifications && typeof window.notifications.success === 'function') {
        window.notifications.success(
          isPdf
            ? 'PDF Steitz gerado (uma linha por numeração + Qtd./Total).'
            : 'Excel Steitz gerado: prazo na lista, Qtd. por numeração/tamanho, totais automáticos.',
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
      if (loading && typeof loading.hideOverlay === 'function') {
        loading.hideOverlay();
      }
    }
  }

  window.baixarTabelaSteitzExcel = function () {
    return exportarTabelaSteitz('excel');
  };

  window.baixarTabelaSteitzPdf = function () {
    return exportarTabelaSteitz('pdf');
  };
})();
