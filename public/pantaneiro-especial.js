/**
 * Lógica compartilhada para tabelas Pantaneiro especiais.
 * Cada página define window.PANTANEIRO_ESPECIAL_CONFIG antes de carregar este script.
 */
(function () {
  'use strict';

  const cfg = () => window.PANTANEIRO_ESPECIAL_CONFIG;
  const regras = () => cfg().regras || {};

  let clientesCadastrados = [];
  let subtotalPedido = 0;
  let totalPedidoComDesconto = 0;

  let selectCliente;
  let inputsCliente;
  let produtosContainer;
  let pedidoContainer;
  let pedidoVazio;
  let gerarPedidoBtn;

  function extrairTokenTamanho(tamanho) {
    const raw = String(tamanho || '').split(',')[0].split('-')[0].trim().toUpperCase();
    if (raw === 'ÚNICO' || raw === 'UNICO') return 'ÚNICO';
    return raw;
  }

  function totalPecasPedido() {
    return (window.pedidoItens || []).reduce((s, i) => s + (Number(i.quantidade) || 0), 0);
  }

  function obterPrecoBaseVolume(totalPecas) {
    const r = regras();
    const faixas = r.volumePrecoFaixas;
    if (!faixas || !faixas.length) return null;
    const ordenadas = [...faixas].sort((a, b) => b.min - a.min);
    for (const faixa of ordenadas) {
      const max = faixa.max == null || faixa.max === Infinity ? 999999 : faixa.max;
      if (totalPecas >= faixa.min && totalPecas <= max) return Number(faixa.preco);
    }
    return Number(r.precoBase) || null;
  }

  function aplicarAcrescimoTamanho(precoBase, tamanho) {
    const token = extrairTokenTamanho(tamanho);
    const acres = regras().acrescimosTamanho || {};
    if (acres[token] != null) return Math.round(precoBase * (1 + Number(acres[token])) * 100) / 100;
    return precoBase;
  }

  function calcularPrecoUnitario(produto, tamanho, precoDigitado) {
    const r = regras();
    let base = precoDigitado != null ? Number(precoDigitado) : Number(produto.PRECO) || 0;
    if (r.volumePrecoFaixas) {
      const tier = obterPrecoBaseVolume(totalPecasPedido());
      if (tier != null) base = tier;
    }
    let preco = base;
    const descontoExtra = 0;
    if (descontoExtra > 0) preco *= 1 - descontoExtra / 100;
    return aplicarAcrescimoTamanho(preco, tamanho);
  }

  function recalcularPrecosVolume() {
    if (!regras().volumePrecoFaixas) return;
    const tier = obterPrecoBaseVolume(totalPecasPedido());
    if (tier == null) return;
    (window.pedidoItens || []).forEach((item) => {
      let preco = tier;
      if (item.descontoExtra > 0) preco *= 1 - item.descontoExtra / 100;
      item.preco = aplicarAcrescimoTamanho(preco, item.tamanho);
      item.precoBase = tier;
      item.subtotal = item.preco * item.quantidade;
    });
  }

  function obterPrecoBaseDigitado(produto) {
    const ref = produto.REFERENCIA || '';
    const el =
      document.getElementById('preco-base-' + ref) ||
      document.getElementById('preco-base-mobile-' + ref);
    const fallback = Number(produto.PRECO) || 0;
    if (!el) return fallback;
    const parseFn =
      typeof g8ParseNumeroEntrada === 'function'
        ? g8ParseNumeroEntrada
        : (v) => parseFloat(String(v).replace(',', '.'));
    const v = parseFn(el.value);
    if (isNaN(v) || v < 0) return fallback;
    return v;
  }

  function obterDescontoDigitado(produto) {
    const ref = produto.REFERENCIA || '';
    const el =
      document.getElementById('desconto-' + ref) ||
      document.getElementById('desconto-mobile-' + ref);
    if (!el) return 0;
    return typeof g8ParseDescontoPercent === 'function'
      ? g8ParseDescontoPercent(el.value)
      : parseFloat(String(el.value).replace(',', '.')) || 0;
  }

  async function carregarClientes() {
    try {
      if (window.G8OfflineData) {
        clientesCadastrados = await G8OfflineData.getClientes();
        return;
      }
      const response = await fetch('/api/clientes');
      if (!response.ok) throw new Error('API clientes');
      clientesCadastrados = await response.json();
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      try {
        const response = await fetch('clientes.json');
        if (response.ok) clientesCadastrados = await response.json();
      } catch (e) {
        alert('Erro ao carregar clientes.');
      }
    }
  }

  async function popularClientes(filtro = '') {
    if (clientesCadastrados.length === 0) await carregarClientes();
    selectCliente.innerHTML = '';
    const optionPadrao = document.createElement('option');
    optionPadrao.value = '';
    optionPadrao.textContent = '- Selecione um cliente -';
    selectCliente.appendChild(optionPadrao);
    const optionNovo = document.createElement('option');
    optionNovo.value = 'novo';
    optionNovo.textContent = '- Inserir manualmente -';
    selectCliente.appendChild(optionNovo);
    const filtroLower = filtro.toLowerCase();
    clientesCadastrados
      .filter((c) => {
        return (
          (c.razao && String(c.razao).toLowerCase().includes(filtroLower)) ||
          (c.cnpj && String(c.cnpj).toLowerCase().includes(filtroLower)) ||
          (c.cidade && String(c.cidade).toLowerCase().includes(filtroLower))
        );
      })
      .forEach((cliente) => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.razao;
        selectCliente.appendChild(option);
      });
  }

  function preencherFormularioCliente(clienteId) {
    if (clienteId === 'novo' || !clienteId) {
      Object.values(inputsCliente).forEach((input) => (input.value = ''));
      const pag = regras().pagamentoPadrao;
      if (pag && inputsCliente.prazo) inputsCliente.prazo.value = pag;
      return;
    }
    const cliente = clientesCadastrados.find((c) => c.id === clienteId);
    if (cliente) {
      for (const key in inputsCliente) {
        inputsCliente[key].value = cliente[key] || '';
      }
    }
  }

  function renderizarPoliticaComercial() {
    const wrap = document.getElementById('politica-comercial-wrap');
    if (!wrap || !cfg().politicaComercial) return;
    let html =
      '<section class="card politica-comercial-card"><div class="politica-comercial-header">POLÍTICA COMERCIAL</div><div class="politica-comercial-body">';
    cfg().politicaComercial.forEach((linha) => {
      if (typeof linha === 'string') {
        html += `<div class="politica-comercial-linha">${linha}</div>`;
      } else {
        html += `<div class="politica-comercial-linha${linha.destaque ? ' destaque' : ''}">${linha.text}</div>`;
      }
    });
    html += '</div></section>';
    wrap.innerHTML = html;
  }

  function montarTamanhosInputs(produto, prefix) {
    const tamanhos = Array.isArray(produto.TAMANHOS) ? produto.TAMANHOS : [produto.TAMANHOS];
    let html = '<div class="tamanho-input-container">';
    tamanhos.forEach((tamanho) => {
      const tamanhoId = String(tamanho).replace(/[^a-zA-Z0-9]/g, '');
      html += `<div><label for="quantidade-${prefix}-${produto.REFERENCIA}-${tamanhoId}">${tamanho}</label><input type="number" min="0" value="0" id="quantidade-${prefix}-${produto.REFERENCIA}-${tamanhoId}"></div>`;
    });
    html += '</div>';
    return html;
  }

  function renderizarProdutosPorCategoria(produtos) {
    produtosContainer.innerHTML = '';
    const mobileContainer = document.getElementById('produtos-mobile-container');
    if (mobileContainer) mobileContainer.innerHTML = '';

    const categoriasOrdem = cfg().categoriasOrdem || [];
    const agrupados = produtos.reduce((acc, p) => {
      acc[p.CATEGORIA] = acc[p.CATEGORIA] || [];
      acc[p.CATEGORIA].push(p);
      return acc;
    }, {});

    const isMobile = window.innerWidth <= 768;
    const ordem =
      categoriasOrdem.length > 0
        ? categoriasOrdem
        : Object.keys(agrupados);

    ordem.forEach((categoria) => {
      const lista = agrupados[categoria];
      if (!lista || !lista.length) return;

      if (isMobile && mobileContainer) {
        let mobileHTML = `<div class="categoria-header-verde">${categoria}</div>`;
        lista.forEach((produto) => {
          mobileHTML += `
            <div class="produto-card-mobile">
              <div class="produto-header-mobile">
                <div class="produto-ref-mobile">${produto.REFERENCIA}</div>
                <div class="produto-preco-mobile">R$ ${Number(produto.PRECO).toFixed(2)}</div>
              </div>
              <div class="produto-descricao-mobile"><h4>${produto.DESCRIÇÃO}</h4></div>
              <div class="produto-tamanhos-mobile">${montarTamanhosInputs(produto, 'mobile')}</div>
              <div class="produto-cor-mobile">
                <label>Cor${regras().coresSugeridas ? ' (Preto, Azul Marinho, Cinza)' : ' (Preto)'}:</label>
                <input type="text" placeholder="Opcional" id="cor-mobile-${produto.REFERENCIA}">
              </div>
              <div class="produto-actions-mobile">
                <button type="button" class="btn-adicionar-mobile btn btn-success" data-ref="${produto.REFERENCIA}">➕ Adicionar ao Pedido</button>
              </div>
            </div>`;
        });
        const mobileDiv = document.createElement('section');
        mobileDiv.className = 'card';
        mobileDiv.innerHTML = mobileHTML;
        mobileContainer.appendChild(mobileDiv);
        mobileDiv.querySelectorAll('.btn-adicionar-mobile').forEach((btn) => {
          btn.addEventListener('click', () => {
            const prod = lista.find((p) => p.REFERENCIA === btn.dataset.ref);
            if (prod) adicionarAoPedidoMobile(prod);
          });
        });
      } else {
        const categoriaDiv = document.createElement('section');
        categoriaDiv.className = 'card';
        let tabelaHTML = `<div class="categoria-header-verde">${categoria}</div>`;
        tabelaHTML +=
          '<div class="table-responsive"><table><thead><tr><th>REF.</th><th>DESCRIÇÃO</th><th>Preço un. (R$)</th><th>Tamanhos & Quantidades</th><th>Cor</th><th>Ação</th></tr></thead><tbody>';
        lista.forEach((produto) => {
          const corPlaceholder = regras().coresSugeridas ? 'Preto / Azul / Cinza' : 'Preto';
          tabelaHTML += `<tr>
            <td>${produto.REFERENCIA}</td>
            <td>${produto.DESCRIÇÃO}<br><small>${(Array.isArray(produto.TAMANHOS) ? produto.TAMANHOS : [produto.TAMANHOS]).join(' / ')}</small></td>
            <td>R$ ${Number(produto.PRECO).toFixed(2)}</td>
            <td>${montarTamanhosInputs(produto, 'desktop')}</td>
            <td><input type="text" placeholder="${corPlaceholder}" id="cor-${produto.REFERENCIA}" style="width:100px;"></td>
            <td><button type="button" class="btn btn-success btn-sm btn-add-produto" data-ref="${produto.REFERENCIA}">Adicionar</button></td>
          </tr>`;
        });
        tabelaHTML += '</tbody></table></div>';
        categoriaDiv.innerHTML = tabelaHTML;
        produtosContainer.appendChild(categoriaDiv);
        categoriaDiv.querySelectorAll('.btn-add-produto').forEach((btn) => {
          btn.addEventListener('click', () => {
            const prod = lista.find((p) => p.REFERENCIA === btn.dataset.ref);
            if (prod) adicionarAoPedido(prod);
          });
        });
      }
    });
  }

  function processarItensProduto(produto, prefix, corId, onItem) {
    const tamanhos = Array.isArray(produto.TAMANHOS) ? produto.TAMANHOS : [produto.TAMANHOS];
    const corInput = document.getElementById(corId);
    const corSelecionada = corInput ? corInput.value.trim() : '';
    const precoBaseRef = obterPrecoBaseDigitado(produto);
    let itemAdicionado = false;

    tamanhos.forEach((tamanho) => {
      const tamanhoId = String(tamanho).replace(/[^a-zA-Z0-9]/g, '');
      const qtd =
        parseInt(
          document.getElementById(`quantidade-${prefix}-${produto.REFERENCIA}-${tamanhoId}`)?.value
        ) || 0;
      if (qtd <= 0) return;
      itemAdicionado = true;
      const tamanhoNorm = extrairTokenTamanho(tamanho);
      let precoFinal = calcularPrecoUnitario(produto, tamanho, precoBaseRef);
      const itemDesc = corSelecionada ? `${tamanhoNorm}, Cor: ${corSelecionada}` : tamanhoNorm;
      onItem({ produto, tamanho: itemDesc, tamanhoToken: tamanhoNorm, quantidade: qtd, preco: precoFinal, cor: corSelecionada, precoBase: precoBaseRef });
    });
    return itemAdicionado;
  }

  function adicionarAoPedido(produto) {
    let itemAdicionado = false;
    itemAdicionado = processarItensProduto(produto, 'desktop', `cor-${produto.REFERENCIA}`, (d) => {
      const existente = window.pedidoItens.find(
        (i) => i.REFERENCIA === d.produto.REFERENCIA && i.tamanho === d.tamanho && i.cor === d.cor
      );
      if (existente) existente.quantidade += d.quantidade;
      else {
        window.pedidoItens.push({
          REFERENCIA: d.produto.REFERENCIA,
          DESCRIÇÃO: d.produto.DESCRIÇÃO,
          tamanho: d.tamanho,
          preco: d.preco,
          precoBase: d.precoBase,
          quantidade: d.quantidade,
          cor: d.cor,
          descontoExtra: 0,
        });
      }
    });
    if (itemAdicionado) {
      recalcularPrecosVolume();
      atualizarVisualizacaoPedido();
    } else {
      alert(`Informe a quantidade para pelo menos um tamanho de ${produto.DESCRIÇÃO}.`);
    }
  }

  function adicionarAoPedidoMobile(produto) {
    let itemAdicionado = false;
    itemAdicionado = processarItensProduto(produto, 'mobile', `cor-mobile-${produto.REFERENCIA}`, (d) => {
      window.pedidoItens.push({
        REFERENCIA: d.produto.REFERENCIA,
        DESCRIÇÃO: d.produto.DESCRIÇÃO,
        tamanho: d.tamanho,
        preco: d.preco,
        precoBase: d.precoBase,
        quantidade: d.quantidade,
        cor: d.cor,
        descontoExtra: 0,
        subtotal: d.preco * d.quantidade,
      });
    });
    if (itemAdicionado) {
      recalcularPrecosVolume();
      atualizarVisualizacaoPedido();
      const tamanhos = Array.isArray(produto.TAMANHOS) ? produto.TAMANHOS : [produto.TAMANHOS];
      tamanhos.forEach((t) => {
        const id = String(t).replace(/[^a-zA-Z0-9]/g, '');
        const el = document.getElementById(`quantidade-mobile-${produto.REFERENCIA}-${id}`);
        if (el) el.value = 0;
      });
      const corEl = document.getElementById(`cor-mobile-${produto.REFERENCIA}`);
      if (corEl) corEl.value = '';
    } else {
      alert('Selecione pelo menos um tamanho e quantidade.');
    }
  }

  window.adicionarAoPedido = adicionarAoPedido;
  window.adicionarAoPedidoMobile = adicionarAoPedidoMobile;

  function removerDoPedido(index) {
    window.pedidoItens.splice(index, 1);
    recalcularPrecosVolume();
    atualizarVisualizacaoPedido();
  }
  window.removerDoPedido = removerDoPedido;

  function atualizarBannerPolitica() {
    let wrap = document.getElementById('pantaneiro-especial-banner');
    const totalEl = document.querySelector('.total-container');
    if (!totalEl) return;
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'pantaneiro-especial-banner';
      totalEl.parentNode.insertBefore(wrap, totalEl.nextSibling);
    }
    if (!window.pedidoItens || window.pedidoItens.length === 0) {
      wrap.innerHTML = '';
      return;
    }
    const pecas = totalPecasPedido();
    const r = regras();
    let msgs = [];

    if (r.pedidoMinimoPecas) {
      const min = r.pedidoMinimoPecas;
      if (pecas >= min) {
        msgs.push(`<strong>Pedido mínimo atingido:</strong> ${pecas} peças (mínimo ${min}).`);
      } else {
        msgs.push(
          `<strong>Atenção:</strong> pedido mínimo de <strong>${min} unidades</strong>. Faltam <strong>${min - pecas}</strong> peça(s).`
        );
      }
    }
    if (r.volumePrecoFaixas) {
      const tier = obterPrecoBaseVolume(pecas);
      if (tier != null && pecas >= 100) {
        msgs.push(`<strong>Desconto de volume:</strong> preço unitário base R$ ${tier.toFixed(2)} (${pecas} peças).`);
      } else if (pecas > 0 && pecas < 100) {
        msgs.push('Desconto de volume a partir de <strong>100 peças</strong> (R$ 155,90) ou <strong>400 peças</strong> (R$ 149,90).');
      }
    }
    if (!msgs.length) {
      wrap.innerHTML = '';
      return;
    }
    const cls = r.pedidoMinimoPecas && pecas < r.pedidoMinimoPecas ? 'pantaneiro-especial-alerta' : 'pantaneiro-especial-info';
    wrap.innerHTML = `<div class="${cls}">${msgs.join('<br>')}</div>`;
  }

  function atualizarVisualizacaoPedido() {
    pedidoContainer.innerHTML = '';
    subtotalPedido = 0;
    if (!Array.isArray(window.pedidoItens)) window.pedidoItens = [];

    if (window.pedidoItens.length > 0) {
      pedidoVazio.style.display = 'none';
      window.pedidoItens.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'pedido-item';
        subtotalPedido +=
          typeof g8TotalLinhaItem === 'function'
            ? g8TotalLinhaItem(item)
            : item.preco * item.quantidade;
        const detalhe = (item.tamanho || '') + (item.cor ? `, Cor: ${item.cor}` : '');
        itemDiv.innerHTML = g8HtmlLinhaPedidoItem({
          index,
          item,
          titulo: `${item.DESCRIÇÃO} (Ref: ${item.REFERENCIA})`,
          detalhe: detalhe ? `Tamanho/Cor: ${detalhe}` : '',
        });
        pedidoContainer.appendChild(itemDiv);
      });
    } else {
      pedidoVazio.style.display = 'block';
    }
    aplicarDescontosGerais();
  }

  function aplicarDescontosGerais() {
    totalPedidoComDesconto = subtotalPedido;
    document.getElementById('total-pedido').textContent = totalPedidoComDesconto.toFixed(2);
    atualizarBannerPolitica();
  }

  function gerarPedidoPDF() {
    if (window.pedidoItens.length === 0) {
      alert('O pedido está vazio. Adicione itens antes de gerar o PDF.');
      return;
    }
    if (!inputsCliente.transporte.value.trim()) {
      alert('O campo Transporte é obrigatório.');
      inputsCliente.transporte.focus();
      return;
    }
    if (!inputsCliente.prazo.value.trim()) {
      alert('O campo Prazo de Pagamento é obrigatório.');
      inputsCliente.prazo.focus();
      return;
    }
    if (!inputsCliente.obs.value.trim()) {
      alert('O campo Observações é obrigatório.');
      inputsCliente.obs.focus();
      return;
    }

    const r = regras();
    if (r.pedidoMinimoPecas && totalPecasPedido() < r.pedidoMinimoPecas) {
      const ok = confirm(
        `O pedido tem ${totalPecasPedido()} peça(s), abaixo do mínimo de ${r.pedidoMinimoPecas}. Deseja continuar mesmo assim?`
      );
      if (!ok) return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    const drawHeaderAndFooter = (data) => {
      const logoImg = new Image();
      logoImg.src = 'https://i.imgur.com/vjq26ym.png';
      doc.addImage(logoImg, 'PNG', margin, 10, 90, 15);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(cfg().pdfTitulo || cfg().titulo, pageWidth - margin, 18, { align: 'right' });
      const hoje = new Date();
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Data: ${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`,
        pageWidth - margin,
        24,
        { align: 'right' }
      );
      doc.setFontSize(8);
      doc.text(`Página ${data.pageNumber} de ${doc.internal.getNumberOfPages()}`, pageWidth / 2, pageHeight - 10, {
        align: 'center',
      });
    };

    drawHeaderAndFooter({ pageNumber: 1 });

    doc.autoTable({
      startY: 30,
      theme: 'grid',
      head: [
        [
          {
            content: 'DADOS DO CLIENTE',
            colSpan: 4,
            styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 230, 230] },
          },
        ],
      ],
      body: [
        ['Cliente:', { content: inputsCliente.razao.value || '—', colSpan: 3 }],
        ['CNPJ:', inputsCliente.cnpj.value || '—', 'I.E.:', inputsCliente.ie.value || '—'],
        ['Telefone:', inputsCliente.telefone.value || '—', 'E-mail:', inputsCliente.email.value || '—'],
        [
          'Endereço:',
          { content: `${inputsCliente.endereco.value || ''}, ${inputsCliente.bairro.value || ''}`, colSpan: 3 },
        ],
        [
          'Cidade/UF:',
          `${inputsCliente.cidade.value || ''}/${inputsCliente.estado.value || ''}`,
          'CEP:',
          inputsCliente.cep.value || '—',
        ],
        ['Transporte:', inputsCliente.transporte.value || '—', 'Prazo:', inputsCliente.prazo.value || '—'],
      ],
      styles: { fontSize: 8, cellPadding: 1.5 },
      margin: { left: margin, right: margin },
    });

    let startY = doc.autoTable.previous.finalY + 7;
    const body = window.pedidoItens.map((item) => [
      item.REFERENCIA,
      item.DESCRIÇÃO,
      item.tamanho || '',
      item.quantidade,
      `R$ ${Number(item.preco).toFixed(2)}`,
      `R$ ${(Number(item.preco) * Number(item.quantidade)).toFixed(2)}`,
    ]);

    doc.autoTable({
      startY,
      head: [['Ref.', 'Descrição', 'Tam./Cor', 'Qtd.', 'Vlr. Unit.', 'Subtotal']],
      body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      margin: { left: margin, right: margin },
      didDrawPage: drawHeaderAndFooter,
    });

    let finalY = doc.autoTable.previous.finalY;
    const obsText = inputsCliente.obs.value || '—';
    doc.autoTable({
      startY: finalY + 8,
      theme: 'plain',
      body: [
        [{ content: 'Observações:', styles: { fontStyle: 'bold' } }, { content: obsText }],
        [
          { content: 'Total:', styles: { fontStyle: 'bold', fontSize: 11 } },
          { content: `R$ ${totalPedidoComDesconto.toFixed(2)}`, styles: { fontStyle: 'bold', fontSize: 11 } },
        ],
      ],
      margin: { left: margin, right: margin },
    });

    const nomeArquivo = `G8 Pedido ${cfg().titulo.replace(/[\s\/]/g, '_')} - ${inputsCliente.razao.value.replace(/[\s\/]/g, '_')} - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
    doc.save(nomeArquivo);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('modo') === 'edicao') return;

    const clienteFlat = Object.fromEntries(
      Object.entries(inputsCliente).map(([k, v]) => [k, v.value])
    );
    const orderData = {
      empresa: cfg().empresa,
      descricao: `${cfg().titulo} — ${clienteFlat.razao} — ${window.pedidoItens.length} itens — R$ ${totalPedidoComDesconto.toFixed(2)}`,
      dados: {
        cliente: clienteFlat,
        itens: window.pedidoItens,
        descontos: {},
        total: totalPedidoComDesconto,
        totalPecas: totalPecasPedido(),
        data: new Date().toISOString(),
        observacoes: clienteFlat.obs,
        origem: `G8 - ${cfg().titulo}`,
      },
    };

    window.offlineSystem
      .tryToSendOrder(orderData)
      .then((result) => {
        if (result.success) {
          if (window.G8Draft) G8Draft.clear();
          alert(result.online ? '✅ Pedido enviado com sucesso!' : '📱 Pedido salvo offline e será enviado quando houver conexão.');
        } else {
          alert('❌ Erro ao processar o pedido.');
        }
      })
      .catch(() => alert('❌ Erro ao processar o pedido.'));
  }

  function mostrarSugestoesClientes(filtro) {
    const sugestoesDiv = document.getElementById('sugestoes-clientes');
    if (!sugestoesDiv) return;
    sugestoesDiv.innerHTML = '';
    if (!filtro || filtro.length < 2) {
      sugestoesDiv.style.display = 'none';
      return;
    }
    const filtroLower = filtro.toLowerCase();
    const filtrados = clientesCadastrados.filter(
      (c) => c.razao && String(c.razao).toLowerCase().includes(filtroLower)
    );
    if (!filtrados.length) {
      sugestoesDiv.style.display = 'none';
      return;
    }
    filtrados.slice(0, 8).forEach((cliente) => {
      const div = document.createElement('div');
      div.textContent = cliente.razao;
      div.style.cssText = 'padding:8px 12px;cursor:pointer;border-bottom:1px solid #eee;';
      div.addEventListener('mousedown', () => {
        selectCliente.value = cliente.id;
        preencherFormularioCliente(cliente.id);
        document.getElementById('busca-cliente').value = cliente.razao;
        sugestoesDiv.style.display = 'none';
      });
      sugestoesDiv.appendChild(div);
    });
    sugestoesDiv.style.display = 'block';
  }

  function mostrarSugestoesProdutos(filtro) {
    const sugestoesDiv = document.getElementById('sugestoes-produtos');
    if (!sugestoesDiv || !window.produtosData) return;
    sugestoesDiv.innerHTML = '';
    if (!filtro || filtro.length < 2) {
      sugestoesDiv.style.display = 'none';
      return;
    }
    const f = filtro.toLowerCase();
    const filtrados = window.produtosData.filter(
      (p) =>
        String(p.REFERENCIA).toLowerCase().includes(f) ||
        String(p.DESCRIÇÃO).toLowerCase().includes(f)
    );
    if (!filtrados.length) {
      sugestoesDiv.style.display = 'none';
      return;
    }
    filtrados.slice(0, 8).forEach((produto) => {
      const div = document.createElement('div');
      div.textContent = `${produto.REFERENCIA} — ${produto.DESCRIÇÃO}`;
      div.style.cssText = 'padding:8px 12px;cursor:pointer;border-bottom:1px solid #eee;';
      div.addEventListener('mousedown', () => {
        renderizarProdutosPorCategoria([produto]);
        document.getElementById('busca-produto').value = produto.REFERENCIA;
        sugestoesDiv.style.display = 'none';
      });
      sugestoesDiv.appendChild(div);
    });
    sugestoesDiv.style.display = 'block';
  }

  async function initPantaneiroEspecial() {
    if (!cfg()) {
      console.error('PANTANEIRO_ESPECIAL_CONFIG não definido');
      return;
    }

    window.pedidoItens = window.pedidoItens || [];
    selectCliente = document.getElementById('cliente-selecionado');
    inputsCliente = {
      razao: document.getElementById('razao'),
      cnpj: document.getElementById('cnpj'),
      ie: document.getElementById('ie'),
      endereco: document.getElementById('endereco'),
      bairro: document.getElementById('bairro'),
      cidade: document.getElementById('cidade'),
      estado: document.getElementById('estado'),
      cep: document.getElementById('cep'),
      email: document.getElementById('email'),
      telefone: document.getElementById('telefone'),
      transporte: document.getElementById('transporte'),
      prazo: document.getElementById('prazo'),
      obs: document.getElementById('obs'),
    };
    produtosContainer = document.getElementById('produtos-container');
    pedidoContainer = document.getElementById('pedido-container');
    pedidoVazio = document.getElementById('pedido-vazio');
    gerarPedidoBtn = document.getElementById('gerar-pedido-btn');

    document.getElementById('page-title').textContent = cfg().titulo;
    document.getElementById('page-breadcrumb').textContent = cfg().breadcrumb || cfg().titulo;
    document.getElementById('page-subtitle').textContent = cfg().subtitulo || '';
    document.title = `G8 - ${cfg().titulo}`;

    if (regras().ocultarDescontosPrazoVolume) {
      const desc = document.querySelector('.descontos-container');
      if (desc) desc.classList.add('oculto');
    }

    renderizarPoliticaComercial();

    try {
      const resp = await fetch(cfg().produtosUrl);
      if (resp.ok) window.produtosData = await resp.json();
    } catch (e) {
      console.error('Erro ao carregar produtos:', e);
    }

    const modoEdicao = new URLSearchParams(window.location.search).get('modo') === 'edicao';
    const render = () => renderizarProdutosPorCategoria(window.produtosData || []);
    if (modoEdicao) setTimeout(render, 0);
    else render();

    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (loggedInUser) {
      document.getElementById('user-info').textContent = `Bem-vindo(a), ${loggedInUser}!`;
    } else {
      alert('Acesso negado. Por favor, realize o login.');
      window.location.href = 'index.html';
      return;
    }

    document.getElementById('logout-button').addEventListener('click', () => {
      sessionStorage.removeItem('loggedInUser');
      window.location.href = 'index.html';
    });

    await popularClientes();
    if (regras().pagamentoPadrao && inputsCliente.prazo && !inputsCliente.prazo.value) {
      inputsCliente.prazo.value = regras().pagamentoPadrao;
    }

    selectCliente.addEventListener('change', (e) => preencherFormularioCliente(e.target.value));
    gerarPedidoBtn.addEventListener('click', gerarPedidoPDF);

    const buscaCliente = document.getElementById('busca-cliente');
    if (buscaCliente) {
      buscaCliente.addEventListener('input', (e) => {
        popularClientes(e.target.value);
        mostrarSugestoesClientes(e.target.value);
      });
    }

    const buscaProduto = document.getElementById('busca-produto');
    if (buscaProduto) {
      buscaProduto.addEventListener('input', (e) => {
        mostrarSugestoesProdutos(e.target.value);
        if (!e.target.value) renderizarProdutosPorCategoria(window.produtosData);
      });
    }

    if (window.G8Draft && inputsCliente) {
      G8Draft.init({
        getData: () => {
          if (!window.pedidoItens?.length) return null;
          const fd = {};
          for (const k in inputsCliente) fd[k] = inputsCliente[k]?.value || '';
          return { items: JSON.parse(JSON.stringify(window.pedidoItens)), formData: fd };
        },
        setData: (d) => {
          if (d?.items?.length) {
            window.pedidoItens.length = 0;
            window.pedidoItens.push(...d.items);
          }
          if (d?.formData) {
            for (const k in d.formData) {
              if (inputsCliente[k]) inputsCliente[k].value = d.formData[k] || '';
            }
          }
          recalcularPrecosVolume();
          atualizarVisualizacaoPedido();
        },
      });
    }
  }

  document.addEventListener('DOMContentLoaded', initPantaneiroEspecial);
})();
