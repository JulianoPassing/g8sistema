/**
 * Linha do pedido (interno): preço, desconto % (vírgula) e layout unificado.
 */
(function (global) {
  'use strict';

  function parseNumeroEntrada(val) {
    if (val === null || val === undefined) return NaN;
    if (typeof val === 'number') return isNaN(val) ? NaN : val;
    const s = String(val)
      .trim()
      .replace(/\s/g, '')
      .replace(/^R\$/i, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(s);
  }

  function parseDescontoPercent(val) {
    const n = parseNumeroEntrada(val);
    if (isNaN(n)) return 0;
    return Math.min(100, Math.max(0, Math.round(n * 1000) / 1000));
  }

  function inferirPrecoBaseItem(item) {
    if (item == null) return 0;
    if (item.precoBase != null && Number(item.precoBase) > 0) {
      return Number(item.precoBase);
    }
    const preco = Number(item.preco) || 0;
    const desc = parseDescontoPercent(item.descontoExtra);
    if (desc > 0 && desc < 100) {
      return Math.round((preco / (1 - desc / 100)) * 100) / 100;
    }
    return preco;
  }

  function totalLinhaItem(item) {
    return (Number(item.preco) || 0) * (Number(item.quantidade) || 0);
  }

  function formatPrecoInput(val) {
    return (Number(val) || 0).toFixed(2).replace('.', ',');
  }

  function formatDescontoInput(val) {
    const n = Number(val) || 0;
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return String(n).replace('.', ',');
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function lerPrecoBaseInput(id) {
    const el = document.getElementById(id);
    if (!el) return NaN;
    return parseNumeroEntrada(el.value);
  }

  function lerDescontoInput(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    return parseDescontoPercent(el.value);
  }

  /**
   * @param {{ index: number, item: object, titulo: string, detalhe?: string }} opts
   */
  function htmlLinhaPedidoItem(opts) {
    const idx = opts.index;
    const item = opts.item;
    const preco = formatPrecoInput(item.preco);
    const desc = formatDescontoInput(item.descontoExtra || 0);
    const total = totalLinhaItem(item).toFixed(2).replace('.', ',');
    const detalheHtml = opts.detalhe
      ? `<span class="pedido-item-detalhe">${escapeHtml(opts.detalhe)}</span>`
      : '';

    return (
      `<div class="pedido-item-info">` +
      `<strong>${opts.titulo}</strong>` +
      `<div class="pedido-item-meta">` +
      detalheHtml +
      `<label class="pedido-item-campo">Qtd:` +
      `<input type="number" min="1" class="input-qty-mini" value="${item.quantidade || 0}" onchange="g8AlterarQuantidadeItemPedido(${idx}, this.value)">` +
      `</label>` +
      `<label class="pedido-item-campo">Unit: R$` +
      `<input type="text" inputmode="decimal" class="input-price-pedido" value="${preco}" onchange="g8AlterarPrecoItemPedido(${idx}, this.value)">` +
      `</label>` +
      `<label class="pedido-item-campo">Desc %:` +
      `<input type="text" inputmode="decimal" class="input-discount-pedido" value="${desc}" onchange="g8AlterarDescontoItemPedido(${idx}, this.value)">` +
      `</label>` +
      `<span class="pedido-item-total">Total: R$ ${total}</span>` +
      `</div></div>` +
      `<button type="button" class="btn btn-danger" onclick="removerDoPedido(${idx})">Remover</button>`
    );
  }

  function atualizarTelaPedido() {
    if (typeof global.atualizarVisualizacaoPedido === 'function') {
      global.atualizarVisualizacaoPedido();
    }
  }

  global.g8ParseNumeroEntrada = parseNumeroEntrada;
  global.g8ParseDescontoPercent = parseDescontoPercent;
  global.g8InferirPrecoBaseItem = inferirPrecoBaseItem;
  global.g8TotalLinhaItem = totalLinhaItem;
  global.g8HtmlLinhaPedidoItem = htmlLinhaPedidoItem;
  global.g8LerPrecoBaseInput = lerPrecoBaseInput;
  global.g8LerDescontoInput = lerDescontoInput;

  global.g8AlterarQuantidadeItemPedido = function (index, val) {
    const q = parseInt(val, 10);
    if (isNaN(q) || q < 1) {
      alert('A quantidade deve ser pelo menos 1.');
      return;
    }
    if (global.pedidoItens && global.pedidoItens[index]) {
      global.pedidoItens[index].quantidade = q;
      atualizarTelaPedido();
    }
  };

  global.g8AlterarPrecoItemPedido = function (index, val) {
    const p = parseNumeroEntrada(val);
    if (isNaN(p) || p < 0) {
      alert('Informe um valor válido para o preço.');
      return;
    }
    const item = global.pedidoItens && global.pedidoItens[index];
    if (!item) return;
    item.preco = Math.round(p * 100) / 100;
    const desc = parseDescontoPercent(item.descontoExtra);
    if (desc > 0 && desc < 100) {
      item.precoBase = Math.round((item.preco / (1 - desc / 100)) * 100) / 100;
    } else {
      item.precoBase = item.preco;
    }
    atualizarTelaPedido();
  };

  global.g8AlterarDescontoItemPedido = function (index, val) {
    const item = global.pedidoItens && global.pedidoItens[index];
    if (!item) return;
    const desc = parseDescontoPercent(val);
    const base = inferirPrecoBaseItem(item);
    item.precoBase = base;
    item.descontoExtra = desc;
    item.preco = Math.round(base * (1 - desc / 100) * 100) / 100;
    atualizarTelaPedido();
  };

  global.alterarQuantidadeItem = global.g8AlterarQuantidadeItemPedido;
  global.alterarPrecoItem = global.g8AlterarPrecoItemPedido;
  global.alterarDescontoItemPedido = global.g8AlterarDescontoItemPedido;
})(typeof window !== 'undefined' ? window : globalThis);
