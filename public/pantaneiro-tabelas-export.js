/**
 * Exporta tabelas Pantaneiro 5 e 7 para Excel com os mesmos preços e categorias
 * definidos em pantaneiro5.html / pantaneiro7.html (fetch do arquivo atual).
 */
(function () {
  'use strict';

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

  const bordaFina = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  async function gerarExcelPantaneiro(produtos, opts) {
    const ExcelJS = window.ExcelJS || window.exceljs;
    if (!ExcelJS) {
      alert('Biblioteca Excel não carregada. Recarregue a página.');
      return;
    }

    const { titulo, nomeArquivo, corTituloCategoria } = opts;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Tabela', {
      properties: { defaultRowHeight: 18 },
      views: [{ showGridLines: true }],
    });

    function mergeColsRow(row) {
      ws.mergeCells('A' + row + ':D' + row);
    }

    const cats = ordemCategorias(produtos);
    let r = 1;
    const ano = new Date().getFullYear();

    mergeColsRow(r);
    const cTit = ws.getCell(r, 1);
    cTit.value = titulo;
    cTit.font = { size: 16, bold: true, color: { argb: 'FFDC2626' } };
    cTit.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(r).height = 28;
    r++;

    mergeColsRow(r);
    const cSub = ws.getCell(r, 1);
    cSub.value =
      'G8 Representações — Preços conforme tabela no sistema em ' +
      new Date().toLocaleDateString('pt-BR') +
      ' — Tabela ' +
      ano;
    cSub.font = { size: 10, italic: true, color: { argb: 'FF64748B' } };
    cSub.alignment = { horizontal: 'center', vertical: 'middle' };
    r += 2;

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
        fgColor: { argb: corTituloCategoria || 'FF1E293B' },
      };
      headCat.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      headCat.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(r).height = 24;
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
        cell.border = bordaFina;
        cell.alignment = {
          vertical: 'middle',
          horizontal: h === 3 ? 'right' : 'left',
        };
      }
      r++;

      for (let j = 0; j < itens.length; j++) {
        const p = itens[j];
        const preco =
          typeof p.PRECO === 'number' ? p.PRECO : parseFloat(String(p.PRECO).replace(',', '.')) || 0;
        ws.getCell(r, 1).value = p.REFERENCIA != null ? String(p.REFERENCIA) : '';
        ws.getCell(r, 2).value = descricaoProduto(p);
        ws.getCell(r, 3).value = formatarTamanhos(p);
        ws.getCell(r, 3).alignment = { wrapText: true, vertical: 'top' };
        ws.getCell(r, 4).value = preco;
        ws.getCell(r, 4).numFmt = '#,##0.00';
        ws.getCell(r, 4).alignment = { horizontal: 'right' };
        for (let c = 1; c <= 4; c++) {
          ws.getCell(r, c).border = bordaFina;
        }
        r++;
      }

      r++;
    }

    ws.columns = [{ width: 14 }, { width: 48 }, { width: 38 }, { width: 14 }];

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

  async function carregarProdutosDaPagina(arquivoHtml) {
    const res = await fetch(arquivoHtml, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao carregar ' + arquivoHtml);
    const html = await res.text();
    const lit = extractArrayLiteral(html);
    if (!lit) throw new Error('Lista de produtos não encontrada em ' + arquivoHtml);
    return parseProdutosLiteral(lit);
  }

  window.baixarTabelaPantaneiroExcel = async function (tabela) {
    const n = Number(tabela);
    if (n !== 5 && n !== 7) return;

    const loading = window.loadingSystem;
    if (loading && typeof loading.showOverlay === 'function') {
      loading.showOverlay('Gerando Excel…');
    }

    try {
      const arquivo = n === 5 ? 'pantaneiro5.html' : 'pantaneiro7.html';
      const produtos = await carregarProdutosDaPagina(arquivo);
      const ano = new Date().getFullYear();
      const nomeArquivo = 'Tabela Pantaneiro ' + n + ' - ' + ano + '.xlsx';
      const titulo = 'Tabela Pantaneiro ' + n + ' — ' + ano;
      const corTituloCategoria = n === 5 ? 'FFB91C1C' : 'FF1D4ED8';

      await gerarExcelPantaneiro(produtos, {
        titulo: titulo,
        nomeArquivo: nomeArquivo,
        corTituloCategoria: corTituloCategoria,
      });

      if (window.notifications && typeof window.notifications.success === 'function') {
        window.notifications.success('Arquivo Excel gerado com os preços atuais.', {
          title: 'Download',
          duration: 3200,
        });
      }
    } catch (e) {
      console.error(e);
      if (window.notifications && typeof window.notifications.error === 'function') {
        window.notifications.error(
          (e && e.message) || 'Não foi possível gerar a planilha.',
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
  };
})();
