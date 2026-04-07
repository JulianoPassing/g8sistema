/**
 * Exporta tabelas Pantaneiro 5 e 7 para Excel e PDF com logos G8,
 * usando os mesmos preços e categorias de pantaneiro5.html / pantaneiro7.html.
 */
(function () {
  'use strict';

  const LOGO_BANNER = 'https://i.imgur.com/vjq26ym.png';
  const LOGO_ICONE = 'https://i.imgur.com/WveVVY5.png';

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

  const bordaFina = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  /** Preenchimento zebrado (linhas de item): branco / cinza clarinho — padrão visual tipo planilha de referência. */
  const FILL_ITEM_PAR = { argb: 'FFFFFFFF' };
  const FILL_ITEM_IMPAR = { argb: 'FFF3F4F6' };

  async function gerarExcelPantaneiro(produtos, opts) {
    const ExcelJS = window.ExcelJS || window.exceljs;
    if (!ExcelJS) {
      alert('Biblioteca Excel não carregada. Recarregue a página.');
      return;
    }

    let b64Banner;
    let b64Icon;
    try {
      b64Banner = await fetchImageBase64(LOGO_BANNER);
      b64Icon = await fetchImageBase64(LOGO_ICONE);
    } catch (e) {
      console.warn('Logos Excel:', e);
      b64Banner = null;
      b64Icon = null;
    }

    const { titulo, nomeArquivo, corTituloCategoria } = opts;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Tabela', {
      properties: { defaultRowHeight: 14.3 },
      views: [{ showGridLines: true }],
    });

    function mergeColsRow(row) {
      ws.mergeCells('A' + row + ':D' + row);
    }

    function aplicarBordaCompleta(cell) {
      cell.border = {
        top: bordaFina.top,
        left: bordaFina.left,
        bottom: bordaFina.bottom,
        right: bordaFina.right,
      };
    }

    /* Cabeçalho: mesmas proporções do modelo “Tabela Pantaneiro 5 - 2026.xlsx” (linhas 1–2). */
    ws.mergeCells('A1:D1');
    ws.mergeCells('A2:D2');
    ws.getRow(1).height = 56.05;
    ws.getRow(2).height = 18;
    ['A1', 'A2'].forEach(function (addr) {
      const c = ws.getCell(addr);
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    if (b64Banner) {
      const idBanner = wb.addImage({ base64: b64Banner, extension: 'png' });
      ws.addImage(idBanner, {
        tl: { col: 0.12, row: 0.06 },
        ext: { width: 400, height: 58 },
      });
    }
    if (b64Icon) {
      const idIcon = wb.addImage({ base64: b64Icon, extension: 'png' });
      ws.addImage(idIcon, {
        tl: { col: 3.02, row: 0.08 },
        ext: { width: 46, height: 46 },
      });
    }

    const cats = ordemCategorias(produtos);
    let r = 3;
    const ano = new Date().getFullYear();

    mergeColsRow(r);
    const cTit = ws.getCell(r, 1);
    cTit.value = titulo;
    cTit.font = { size: 16, bold: true, color: { argb: 'FFDC2626' } };
    cTit.fill = { type: 'pattern', pattern: 'solid', fgColor: FILL_ITEM_PAR };
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
    cSub.fill = { type: 'pattern', pattern: 'solid', fgColor: FILL_ITEM_PAR };
    cSub.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    ws.getRow(r).height = 14.3;
    r++;

    mergeColsRow(r);
    ws.getCell(r, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: FILL_ITEM_PAR };
    ws.getRow(r).height = 18;
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
      headCat.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: corTituloCategoria || 'FFB91C1C' },
      };
      headCat.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      headCat.alignment = { horizontal: 'center', vertical: 'middle' };
      aplicarBordaCompleta(headCat);
      ws.getRow(r).height = 23.95;
      r++;

      const hdr = ['Referência', 'Descrição', 'Tamanhos', 'Preço (R$)'];
      for (let h = 0; h < hdr.length; h++) {
        const cell = ws.getCell(r, h + 1);
        cell.value = hdr[h];
        cell.font = { bold: true, size: 10 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' },
        };
        aplicarBordaCompleta(cell);
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
        const fg = zebra ? FILL_ITEM_IMPAR : FILL_ITEM_PAR;
        indiceItemGlobal++;

        const c1 = ws.getCell(r, 1);
        c1.value = p.REFERENCIA != null ? String(p.REFERENCIA) : '';
        c1.fill = { type: 'pattern', pattern: 'solid', fgColor: fg };
        c1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        aplicarBordaCompleta(c1);

        const c2 = ws.getCell(r, 2);
        c2.value = descricaoProduto(p);
        c2.fill = { type: 'pattern', pattern: 'solid', fgColor: fg };
        c2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        aplicarBordaCompleta(c2);

        const c3 = ws.getCell(r, 3);
        c3.value = formatarTamanhos(p);
        c3.fill = { type: 'pattern', pattern: 'solid', fgColor: fg };
        c3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        aplicarBordaCompleta(c3);

        const c4 = ws.getCell(r, 4);
        c4.value = preco;
        c4.numFmt = '#,##0.00';
        c4.fill = { type: 'pattern', pattern: 'solid', fgColor: fg };
        c4.alignment = { horizontal: 'center', vertical: 'middle' };
        aplicarBordaCompleta(c4);

        ws.getRow(r).height = 14.3;
        r++;
      }
    }

    /* Larguras do modelo “Tabela Pantaneiro 5 - 2026.xlsx”. */
    ws.columns = [
      { width: 10.25 },
      { width: 78.25 },
      { width: 35.875 },
      { width: 8.75 },
    ];

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
    let dataUrlIcon = null;
    try {
      dataUrlBanner = await loadImageDataUrl(LOGO_BANNER);
      dataUrlIcon = await loadImageDataUrl(LOGO_ICONE);
    } catch (e) {
      console.warn('Logos PDF:', e);
    }

    const { titulo, nomeArquivo, corCategoriaRgb } = opts;
    const doc = new JSPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const m = 10;

    if (dataUrlBanner) {
      doc.addImage(dataUrlBanner, 'PNG', m, 8, 115, 18);
    }
    if (dataUrlIcon) {
      doc.addImage(dataUrlIcon, 'PNG', pageW - m - 20, 7, 20, 20);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(220, 38, 38);
    doc.text(titulo, pageW / 2, 32, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'G8 Representações — Preços atualizados conforme pantaneiro5/7.html — ' +
        new Date().toLocaleDateString('pt-BR'),
      pageW / 2,
      37,
      { align: 'center' }
    );

    const cats = ordemCategorias(produtos);
    const catFill = corCategoriaRgb || [185, 28, 28];
    let y = 41;
    const bottomSafe = 18;
    const tableMargins = { left: m, right: m, bottom: 14 };
    const colStyles = {
      0: { cellWidth: 22 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 52 },
      3: { cellWidth: 24, halign: 'right' },
    };

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

      doc.setFillColor(catFill[0], catFill[1], catFill[2]);
      doc.rect(m, y, pageW - 2 * m, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(String(cat).toUpperCase(), pageW / 2, y + 5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      y += 10;

      doc.autoTable({
        startY: y,
        head: [['Referência', 'Descrição', 'Tamanhos', 'Preço (R$)']],
        body: bodyRows,
        theme: 'grid',
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: 30,
          fontSize: 7,
          fontStyle: 'bold',
        },
        styles: { fontSize: 7, cellPadding: 1.2, overflow: 'linebreak', valign: 'middle' },
        columnStyles: colStyles,
        margin: tableMargins,
      });

      y = doc.autoTable.previous.finalY + 8;
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
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
          isPdf ? 'PDF gerado com logos e preços atuais.' : 'Excel gerado com logos e preços atuais.',
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
