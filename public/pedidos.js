// pedidos.js

document.addEventListener('DOMContentLoaded', () => {
  // Mensagem de boas-vindas
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  if (loggedInUser) {
    document.getElementById('user-info').textContent = `Bem-vindo(a), ${loggedInUser}!`;
  } else {
    alert('Acesso negado. Por favor, realize o login.');
    window.location.href = 'index.html';
  }
  document.getElementById('logout-button').addEventListener('click', function () {
    sessionStorage.removeItem('loggedInUser');
    alert('Você saiu da sua conta.');
    window.location.href = 'index.html';
  });

  carregarPedidos();

  // Evento de submit do formulário de edição
  document.getElementById('form-editar-pedido').addEventListener('submit', async function (e) {
    e.preventDefault();
    await salvarAlteracoes();
  });

  // Botão cancelar edição
  document.getElementById('cancelar-edicao').addEventListener('click', function() {
    document.getElementById('editar-pedido-card').style.display = 'none';
  });

  // Adicionar botão de exclusão no painel de edição
  document.getElementById('form-editar-pedido').insertAdjacentHTML('beforeend', `
    <button type="button" id="excluir-pedido-btn" style="margin-left:10px;background:#dc3545;color:white;">Excluir Pedido</button>
  `);
});

async function carregarPedidos() {
  const lista = document.getElementById('pedidos-lista');
  lista.innerHTML = '<p>Carregando pedidos...</p>';
  try {
    const resp = await fetch('/api/pedidos');
    const pedidos = await resp.json();
    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      lista.innerHTML = '<p>Nenhum pedido encontrado.</p>';
      return;
    }
    let html = '<table><thead><tr><th>ID</th><th>Empresa</th><th>Descrição</th><th>Ações</th></tr></thead><tbody>';
    for (const pedido of pedidos) {
      html += `<tr>
        <td>${pedido.id}</td>
        <td>${pedido.empresa}</td>
        <td>${pedido.descricao}</td>
        <td><button class="edit-btn" onclick="editarPedido(${pedido.id})">Editar</button></td>
      </tr>`;
    }
    html += '</tbody></table>';
    lista.innerHTML = html;
  } catch (err) {
    lista.innerHTML = '<p>Erro ao carregar pedidos.</p>';
  }
}

let pedidoEditando = null;

window.editarPedido = function(id) {
  fetch('/api/pedidos')
    .then(resp => resp.json())
    .then(pedidos => {
      const pedido = pedidos.find(p => p.id == id);
      if (!pedido) {
        alert('Pedido não encontrado.');
        return;
      }
      pedidoEditando = pedido;
      document.getElementById('pedido-id').value = pedido.id;
      renderizarFormularioEdicao(pedido);
      document.getElementById('editar-pedido-card').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
};

// Dados de produtos das diferentes páginas
const produtosPantaneiro5 = [
  { REFERENCIA: "201", DESCRIÇÃO: "JARDINEIRA PVC COM BOTA", PRECO: 140.63 },
  { REFERENCIA: "203", DESCRIÇÃO: "PERNEIRA PVC VIRILHA COM BOTA", PRECO: 108.83 },
  { REFERENCIA: "204", DESCRIÇÃO: "PERNEIRA PVC JOELHO COM BOTA", PRECO: 95.87 },
  { REFERENCIA: "209", DESCRIÇÃO: "JAQUETA PVC PESCADOR", PRECO: 44.15 },
  { REFERENCIA: "210", DESCRIÇÃO: "CALÇA PVC PESCADOR", PRECO: 30.25 },
  { REFERENCIA: "213", DESCRIÇÃO: "JAQUETA NYLON PESCADOR", PRECO: 73.58 },
  { REFERENCIA: "214", DESCRIÇÃO: "CALÇA NYLON PESCADOR", PRECO: 50.02 },
  { REFERENCIA: "234", DESCRIÇÃO: "CONJUNTO PVC PESCADOR COM CAPUZ", PRECO: 66.9 },
  { REFERENCIA: "238", DESCRIÇÃO: "CONJUNTO NYLON PESCADOR COM CAPUZ", PRECO: 122.47 },
  { REFERENCIA: "222", DESCRIÇÃO: "CAPA LONGA PVC COM CAPUZ LAPA SIMPLES COM VELCRO", PRECO: 50.46 },
  { REFERENCIA: "222.1", DESCRIÇÃO: "CAPA LONGA PVC COM CAPUZ LAPA INTERNA", PRECO: 48.76 },
  { REFERENCIA: "225", DESCRIÇÃO: "CAPA LONGA NYLON PADRÃO ELÁSTICO NOS PUNHOS", PRECO: 104.79 }
];

const produtosPantaneiro7 = [
  { REFERENCIA: "201", DESCRIÇÃO: "JARDINEIRA PVC COM BOTA", PRECO: 140.63 },
  { REFERENCIA: "203", DESCRIÇÃO: "PERNEIRA PVC VIRILHA COM BOTA", PRECO: 108.83 },
  { REFERENCIA: "204", DESCRIÇÃO: "PERNEIRA PVC JOELHO COM BOTA", PRECO: 95.87 },
  { REFERENCIA: "209", DESCRIÇÃO: "JAQUETA PVC PESCADOR", PRECO: 44.15 },
  { REFERENCIA: "210", DESCRIÇÃO: "CALÇA PVC PESCADOR", PRECO: 30.25 },
  { REFERENCIA: "213", DESCRIÇÃO: "JAQUETA NYLON PESCADOR", PRECO: 73.58 },
  { REFERENCIA: "214", DESCRIÇÃO: "CALÇA NYLON PESCADOR", PRECO: 50.02 },
  { REFERENCIA: "234", DESCRIÇÃO: "CONJUNTO PVC PESCADOR COM CAPUZ", PRECO: 66.9 },
  { REFERENCIA: "238", DESCRIÇÃO: "CONJUNTO NYLON PESCADOR COM CAPUZ", PRECO: 122.47 },
  { REFERENCIA: "222", DESCRIÇÃO: "CAPA LONGA PVC COM CAPUZ LAPA SIMPLES COM VELCRO", PRECO: 50.46 },
  { REFERENCIA: "222.1", DESCRIÇÃO: "CAPA LONGA PVC COM CAPUZ LAPA INTERNA", PRECO: 48.76 },
  { REFERENCIA: "225", DESCRIÇÃO: "CAPA LONGA NYLON PADRÃO ELÁSTICO NOS PUNHOS", PRECO: 104.79 }
];

const produtosSteitz = [
  { REF: "001", MODELO: "BOTA DE SEGURANÇA", PRECOS: { a_vista: 45.00, p_30_45_60: 48.00, p_30_60_90: 50.00 } },
  { REF: "002", MODELO: "CALÇADO DE SEGURANÇA", PRECOS: { a_vista: 55.00, p_30_45_60: 58.00, p_30_60_90: 60.00 } },
  { REF: "003", MODELO: "TÊNIS DE SEGURANÇA", PRECOS: { a_vista: 65.00, p_30_45_60: 68.00, p_30_60_90: 70.00 } },
  { REF: "004", MODELO: "SAPATO DE SEGURANÇA", PRECOS: { a_vista: 75.00, p_30_45_60: 78.00, p_30_60_90: 80.00 } },
  { REF: "005", MODELO: "BOTA IMPERMEÁVEL", PRECOS: { a_vista: 85.00, p_30_45_60: 88.00, p_30_60_90: 90.00 } }
];

function getProdutosByEmpresa(empresa) {
  switch(empresa) {
    case 'pantaneiro5': return produtosPantaneiro5;
    case 'pantaneiro7': return produtosPantaneiro7;
    case 'steitz': return produtosSteitz;
    default: return [...produtosPantaneiro5, ...produtosPantaneiro7, ...produtosSteitz];
  }
}

function renderizarFormularioEdicao(pedido) {
  const campos = pedido.dados || {};
  const form = document.getElementById('form-editar-campos');
  let html = '';
  // Cliente
  html += '<h3 style="margin-top:0;margin-bottom:10px;color:#007bff;border-bottom:1px solid #dee2e6;padding-bottom:4px;">Dados do Cliente</h3>';
  html += '<div class="form-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px 24px;margin-bottom:18px;">';
  for (const campo in (campos.cliente || {})) {
    // Evitar duplicação de transporte e prazo
    if (campo !== 'transporte' && campo !== 'prazo') {
      html += `<div class='form-group'><label style='font-weight:600;'>${campo.charAt(0).toUpperCase() + campo.slice(1)}</label><input type='text' id='edit-cliente-${campo}' value='${campos.cliente[campo] || ''}' /></div>`;
    }
  }
  html += '</div>';
  
  // Transporte e Prazo (campos importantes para o PDF)
  html += '<h3 style="margin-top:18px;margin-bottom:10px;color:#007bff;border-bottom:1px solid #dee2e6;padding-bottom:4px;">Transporte e Prazo</h3>';
  html += '<div class="form-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px 24px;margin-bottom:18px;">';
  html += `<div class='form-group'><label style='font-weight:600;'><span>🚚</span> Transporte</label><input type='text' id='edit-transporte' value='${campos.transporte || campos.cliente?.transporte || ''}' /></div>`;
  html += `<div class='form-group'><label style='font-weight:600;'><span>💰</span> Prazo Pagamento</label><input type='text' id='edit-prazo' value='${campos.prazo || campos.cliente?.prazo || ''}' /></div>`;
  html += '</div>';
  
  // Itens
  html += '<h3 style="margin-top:18px;margin-bottom:10px;color:#007bff;border-bottom:1px solid #dee2e6;padding-bottom:4px;">Itens do Pedido</h3>';
  html += '<div style="overflow-x:auto;margin-bottom:10px;">';
  html += '<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">';
  html += '<thead><tr style="background:#f8f9fa;"><th>Referência</th><th>Descrição</th><th>Tamanho</th><th>Cor</th><th>Qtd</th><th>Unitário</th><th>Desc. Extra</th><th>Ação</th></tr></thead><tbody id="edit-itens-lista">';
  (campos.itens || []).forEach((item, idx) => {
    html += `<tr>`;
    html += `<td><input type='text' id='edit-item-${idx}-REFERENCIA' value='${item.REFERENCIA || item.REF || ''}' style='width:90px;' class='busca-produto'/></td>`;
    html += `<td><input type='text' id='edit-item-${idx}-DESCRIÇÃO' value='${item.DESCRIÇÃO || item.MODELO || ''}' style='width:180px;' readonly/></td>`;
    html += `<td><input type='text' id='edit-item-${idx}-tamanho' value='${item.tamanho || ''}' style='width:70px;'/></td>`;
    html += `<td><input type='text' id='edit-item-${idx}-cor' value='${item.cor || ''}' style='width:70px;'/></td>`;
    html += `<td><input type='number' id='edit-item-${idx}-quantidade' value='${item.quantidade || 1}' min='1' style='width:60px;' class='auto-total'/></td>`;
    html += `<td><input type='number' id='edit-item-${idx}-preco' value='${item.preco || 0}' min='0' step='0.01' style='width:80px;' class='auto-total'/></td>`;
    html += `<td><input type='number' id='edit-item-${idx}-descontoExtra' value='${item.descontoExtra || 0}' min='0' max='100' step='0.01' style='width:60px;' class='auto-total'/></td>`;
    html += `<td><button type='button' onclick='removerItemEdicao(${idx})' style='background:#dc3545;color:white;padding:4px 10px;border:none;border-radius:4px;cursor:pointer;'>Remover</button></td>`;
    html += `</tr>`;
  });
  html += '</tbody></table>';
  html += '</div>';
  html += `<button type='button' onclick='adicionarItemEdicao()' style='background:#28a745;color:white;margin-bottom:10px;padding:7px 18px;border:none;border-radius:4px;font-weight:600;cursor:pointer;'>Adicionar Item</button>`;
  // Descontos
  html += '<h3 style="margin-top:18px;margin-bottom:10px;color:#007bff;border-bottom:1px solid #dee2e6;padding-bottom:4px;">Descontos</h3>';
  html += '<div class="form-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px 24px;margin-bottom:18px;">';
  for (const campo in (campos.descontos || {})) {
    html += `<div class='form-group'><label style='font-weight:600;'>${campo.charAt(0).toUpperCase() + campo.slice(1)}</label><input type='number' id='edit-desconto-${campo}' value='${campos.descontos[campo] || 0}' class='auto-total'/></div>`;
  }
  html += '</div>';
  // Total
  html += `<div class='form-group'><label style='font-weight:600;'>Total</label><input type='number' id='edit-total' value='${campos.total || 0}' style='width:180px;background:#f8f9fa;font-weight:bold;' readonly/></div>`;
  // Observações
  html += `<div class='form-group'><label style='font-weight:600;'>Observações</label><input type='text' id='edit-obs' value='${(campos.cliente && campos.cliente.obs) || ''}' /></div>`;
  form.innerHTML = html;

  // Remove dropdown de sugestões se existir
  const oldDropdown = document.getElementById('sugestoes-produtos');
  if (oldDropdown) oldDropdown.remove();

  // Adiciona listeners para atualizar o total automaticamente
  setTimeout(() => {
    document.querySelectorAll('.auto-total').forEach(input => {
      input.addEventListener('input', atualizarTotalEdicao);
    });
    // Adiciona listeners para busca de produtos
    document.querySelectorAll('.busca-produto').forEach(input => {
      input.addEventListener('input', (e) => {
        buscarProduto(e.target, pedido.empresa);
        // Pequeno delay para permitir que o produto seja preenchido antes de calcular o total
        setTimeout(() => atualizarTotalEdicao(), 100);
      });
      // Sugestão ao focar também
      input.addEventListener('focus', (e) => buscarProduto(e.target, pedido.empresa));
    });
    // Atualizar total inicial
    atualizarTotalEdicao();
  }, 10);
}

function atualizarTotalEdicao() {
  // Soma todos os itens considerando descontos
  let subtotal = 0;
  let descontos = {};
  let total = 0;
  // Itens
  const itens = [];
  let idx = 0;
  while (document.getElementById(`edit-item-${idx}-REFERENCIA`)) {
    const quantidade = parseInt(document.getElementById(`edit-item-${idx}-quantidade`).value) || 0;
    const preco = parseFloat(document.getElementById(`edit-item-${idx}-preco`).value) || 0;
    const descontoExtra = parseFloat(document.getElementById(`edit-item-${idx}-descontoExtra`).value) || 0;
    let valorItem = quantidade * preco;
    if (descontoExtra > 0) valorItem *= (1 - descontoExtra / 100);
    subtotal += valorItem;
    itens.push({ quantidade, preco, descontoExtra });
    idx++;
  }
  // Descontos gerais
  document.querySelectorAll('[id^=edit-desconto-]').forEach(input => {
    const campo = input.id.replace('edit-desconto-', '');
    descontos[campo] = parseFloat(input.value) || 0;
  });
  // Aplicar descontos gerais (prazo, volume, extra, etc)
  total = subtotal;
  if (descontos.prazo) total *= (1 - descontos.prazo / 100);
  if (descontos.volume) total *= (1 - descontos.volume / 100);
  if (descontos.extra) total *= (1 - descontos.extra / 100);
  document.getElementById('edit-total').value = total.toFixed(2);
}

window.removerItemEdicao = function(idx) {
  if (!pedidoEditando || !pedidoEditando.dados) return;
  pedidoEditando.dados.itens.splice(idx, 1);
  renderizarFormularioEdicao(pedidoEditando);
  // Atualizar total após remover item
  setTimeout(() => {
    atualizarTotalEdicao();
  }, 50);
};

window.adicionarItemEdicao = function() {
  if (!pedidoEditando || !pedidoEditando.dados) return;
  pedidoEditando.dados.itens.push({ REFERENCIA: '', DESCRIÇÃO: '', tamanho: '', cor: '', quantidade: 1, preco: 0, descontoExtra: 0 });
  renderizarFormularioEdicao(pedidoEditando);
  // Atualizar total após adicionar item
  setTimeout(() => {
    atualizarTotalEdicao();
  }, 50);
};

async function salvarAlteracoes() {
  const id = document.getElementById('pedido-id').value;
  if (!pedidoEditando) return;
  
  // Atualizar cliente (exceto transporte e prazo para evitar duplicação)
  for (const campo in (pedidoEditando.dados.cliente || {})) {
    if (campo !== 'transporte' && campo !== 'prazo') {
      pedidoEditando.dados.cliente[campo] = document.getElementById('edit-cliente-' + campo).value;
    }
  }
  
  // Atualizar transporte e prazo na estrutura principal
  pedidoEditando.dados.transporte = document.getElementById('edit-transporte').value;
  pedidoEditando.dados.prazo = document.getElementById('edit-prazo').value;
  
  // Atualizar itens
  pedidoEditando.dados.itens = pedidoEditando.dados.itens.map((item, idx) => {
    const novo = {};
    for (const key in item) {
      novo[key] = document.getElementById(`edit-item-${idx}-${key}`).value;
    }
    // Tipos
    if (novo.quantidade) novo.quantidade = parseInt(novo.quantidade);
    if (novo.preco) novo.preco = parseFloat(novo.preco);
    if (novo.descontoExtra) novo.descontoExtra = parseFloat(novo.descontoExtra);
    return novo;
  });
  
  // Atualizar descontos
  for (const campo in (pedidoEditando.dados.descontos || {})) {
    pedidoEditando.dados.descontos[campo] = parseFloat(document.getElementById('edit-desconto-' + campo).value) || 0;
  }
  
  // Total
  pedidoEditando.dados.total = parseFloat(document.getElementById('edit-total').value) || 0;
  
  // Observações
  if (pedidoEditando.dados.cliente) pedidoEditando.dados.cliente.obs = document.getElementById('edit-obs').value;
  
  // Atualizar descricao
  const descricao = `Cliente: ${pedidoEditando.dados.cliente.razao}\nItens: ${pedidoEditando.dados.itens.map(item => (item.REFERENCIA || item.REF) + ' x' + item.quantidade).join(', ')}\nTotal: R$ ${pedidoEditando.dados.total.toFixed(2)}`;
  
  try {
    const resp = await fetch('/api/pedidos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, empresa: pedidoEditando.empresa, descricao, dados: pedidoEditando.dados })
    });
    if (resp.ok) {
      alert('Pedido atualizado com sucesso!');
      document.getElementById('editar-pedido-card').style.display = 'none';
      carregarPedidos();
    } else {
      alert('Erro ao atualizar pedido.');
    }
  } catch (err) {
    alert('Erro ao atualizar pedido.');
  }
}

// Geração de PDF fiel ao original

document.getElementById('gerar-pdf-edicao').addEventListener('click', function() {
  if (!pedidoEditando || !pedidoEditando.dados) return alert('Pedido não carregado.');
  gerarPDFPedidoEditado(pedidoEditando);
});

function gerarPDFPedidoEditado(pedido) {
  const { cliente, itens, descontos, total, transporte, prazo } = pedido.dados;
  const doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let finalY = 0;

  // Determinar título específico da empresa
  let tituloEmpresa = 'Pedido de Venda';
  if (pedido.empresa === 'pantaneiro5' || pedido.empresa === 'pantaneiro7') {
    tituloEmpresa = 'Pedido de Venda - Pantaneiro';
  } else if (pedido.empresa === 'steitz') {
    tituloEmpresa = 'Pedido de Venda - Steitz';
  }

  // Cabeçalho e rodapé
  const drawHeaderAndFooter = (data) => {
    const logoImg = new Image();
    logoImg.src = 'https://i.imgur.com/vjq26ym.png';
    doc.addImage(logoImg, 'PNG', margin, 10, 90, 15);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(tituloEmpresa, pageWidth - margin, 18, { align: 'right' });
    const hoje = new Date();
    const dataAtual = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${dataAtual}`, pageWidth - margin, 24, { align: 'right' });
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };
  drawHeaderAndFooter({ pageNumber: 1 });

  // Tabela de dados do cliente (sem transporte e prazo - seguindo formato original)
  doc.autoTable({
    startY: 30,
    theme: 'grid',
    head: [[{ content: 'DADOS DO CLIENTE', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 30 } }]],
    body: [
      ['Cliente:', { content: cliente?.razao || 'N/A', colSpan: 3 }],
      ['CNPJ:', cliente?.cnpj || 'N/A', 'I.E.:', cliente?.ie || 'N/A'],
      ['Telefone:', cliente?.telefone || 'N/A', 'E-mail:', cliente?.email || 'N/A'],
      ['Endereço:', { content: `${cliente?.endereco || ''}, ${cliente?.bairro || ''}`, colSpan: 3 }],
      ['Cidade/UF:', `${cliente?.cidade || ''}/${cliente?.estado || ''}`, 'CEP:', cliente?.cep || ''],
    ],
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 22 }, 2: { fontStyle: 'bold', cellWidth: 20 } },
    margin: { left: margin, right: margin },
  });

  let startY = doc.autoTable.previous.finalY + 7;

  // Tabela de itens (ajustada para diferentes empresas)
  let head, body;
  
  if (pedido.empresa === 'steitz') {
    head = [['Ref.', 'Modelo', 'Cor', 'Tamanho', 'Qtd.', 'Vlr. Unit.', 'Desc.%', 'Subtotal']];
    body = (itens || []).map((item) => {
      // Descontos gerais
      let precoUnitario = item.preco || 0;
      let descontoGeral = 1;
      if (descontos) {
        if (descontos.prazo) descontoGeral *= (1 - (descontos.prazo / 100));
        if (descontos.volume) descontoGeral *= (1 - (descontos.volume / 100));
        if (descontos.extra) descontoGeral *= (1 - (descontos.extra / 100));
      }
      precoUnitario = precoUnitario * descontoGeral;
      return [
        item.REFERENCIA || item.REF || '',
        item.DESCRIÇÃO || item.MODELO || '',
        item.cor || '',
        item.tamanho || '',
        item.quantidade || '',
        `R$ ${precoUnitario.toFixed(2)}`,
        `${item.descontoExtra || 0}%`,
        `R$ ${(precoUnitario * (item.quantidade || 0) * (1 - (item.descontoExtra || 0) / 100)).toFixed(2)}`
      ];
    });
  } else {
    head = [['Ref.', 'Descrição', 'Tam/Cor', 'Qtd', 'Unit.', 'Desc.%', 'Total']];
    body = (itens || []).map((item) => {
      // Descontos gerais
      let precoUnitario = item.preco || 0;
      let descontoGeral = 1;
      if (descontos) {
        if (descontos.prazo) descontoGeral *= (1 - (descontos.prazo / 100));
        if (descontos.volume) descontoGeral *= (1 - (descontos.volume / 100));
      }
      precoUnitario = precoUnitario * descontoGeral;
      return [
        item.REFERENCIA || item.REF || '',
        item.DESCRIÇÃO || item.MODELO || '',
        `${item.tamanho || ''}${item.cor ? ' / ' + item.cor : ''}`,
        item.quantidade || '',
        `R$ ${precoUnitario.toFixed(2)}`,
        `${item.descontoExtra || 0}%`,
        `R$ ${(precoUnitario * (item.quantidade || 0) * (1 - (item.descontoExtra || 0) / 100)).toFixed(2)}`
      ];
    });
  }
  // Configurações de colunas específicas para cada empresa
  let columnStyles;
  if (pedido.empresa === 'steitz') {
    columnStyles = {
      0: { cellWidth: 15 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 15, halign: 'center' },
      7: { cellWidth: 22, halign: 'right' }
    };
  } else {
    columnStyles = {
      0: { cellWidth: 15 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30 },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 15, halign: 'center' },
      6: { cellWidth: 22, halign: 'right' }
    };
  }

  doc.autoTable({
    head: head,
    body: body,
    startY: startY,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    columnStyles: columnStyles,
    didDrawPage: (data) => { if (data.pageNumber > 1) drawHeaderAndFooter(data); },
    margin: { top: 30, bottom: 15 },
  });
  finalY = doc.autoTable.previous.finalY;

  // Observações e totais (seguindo formato original)
  const obsText = `Transporte: ${transporte || 'A combinar'}\nPrazo Pagamento: ${prazo || 'A combinar'}\n\nObservações:\n${cliente?.obs || 'Nenhuma.'}`;
  
  // Calcular subtotal sem desconto
  let subtotalSemDesconto = 0;
  (itens || []).forEach(item => {
    subtotalSemDesconto += (item.preco || 0) * (item.quantidade || 0);
  });
  
  const summaryData = [];
  summaryData.push(['Subtotal sem Desconto:', `R$ ${subtotalSemDesconto.toFixed(2)}`]);
  
  // Aplicar descontos conforme empresa
  if (pedido.empresa === 'steitz') {
    // Para Steitz, usa desconto "extra"
    if (descontos && descontos.extra > 0) {
      const valorDescontoExtra = subtotalSemDesconto * (descontos.extra / 100);
      summaryData.push([`Desconto Extra (${descontos.extra}%):`, `- R$ ${valorDescontoExtra.toFixed(2)}`]);
    }
  } else {
    // Para Pantaneiro, usa desconto prazo e volume
    if (descontos && descontos.prazo > 0) {
      const valorDescontoPrazo = subtotalSemDesconto * (descontos.prazo / 100);
      summaryData.push([`Desconto Prazo (${descontos.prazo}%):`, `- R$ ${valorDescontoPrazo.toFixed(2)}`]);
    }
    if (descontos && descontos.volume > 0) {
      const baseDescontoVolume = subtotalSemDesconto * (1 - (descontos.prazo || 0) / 100);
      const valorDescontoVolume = baseDescontoVolume * (descontos.volume / 100);
      summaryData.push([`Desconto Volume (${descontos.volume}%):`, `- R$ ${valorDescontoVolume.toFixed(2)}`]);
    }
  }
  
  summaryData.push(['', '']);
  summaryData.push([
    { content: 'Total do Pedido:', styles: { fontStyle: 'bold', fontSize: 10 } },
    { content: `R$ ${(total || 0).toFixed(2)}`, styles: { fontStyle: 'bold', fontSize: 10 } },
  ]);
  const finalTableBody = [];
  const leftColumn = { content: obsText, rowSpan: summaryData.length, styles: { valign: 'top', fontSize: 9 } };
  for (let i = 0; i < summaryData.length; i++) {
    const row = [];
    if (i === 0) row.push(leftColumn);
    row.push(summaryData[i][0]);
    row.push(summaryData[i][1]);
    finalTableBody.push(row);
  }
  doc.autoTable({
    startY: finalY + 8,
    theme: 'plain',
    body: finalTableBody,
    margin: { left: margin, right: margin },
    columnStyles: { 0: { cellWidth: pageWidth / 2 - margin }, 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'right' } },
  });
  // Nome do arquivo específico por empresa
  let nomeArquivo;
  if (pedido.empresa === 'pantaneiro5' || pedido.empresa === 'pantaneiro7') {
    nomeArquivo = `G8 Pedido Pantaneiro - ${cliente?.razao?.replace(/[\s\/]/g, '_') || 'Cliente'} - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  } else if (pedido.empresa === 'steitz') {
    nomeArquivo = `G8 Pedido Steitz - ${cliente?.razao?.replace(/[\s\/]/g, '_') || 'Cliente'} - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  } else {
    nomeArquivo = `Pedido_${pedido.id}_${cliente?.razao?.replace(/[\s\/]/g, '_') || 'Cliente'}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  }
  
  doc.save(nomeArquivo);
}

window.verPedidoPDF = async function(id) {
  // Busca o pedido pelo ID
  try {
    const resp = await fetch('/api/pedidos');
    const pedidos = await resp.json();
    const pedido = pedidos.find(p => p.id == id);
    if (!pedido) {
      alert('Pedido não encontrado.');
      return;
    }
    // Gera PDF simples
    const doc = new window.jspdf.jsPDF();
    doc.setFontSize(16);
    doc.text('Pedido #' + pedido.id, 10, 20);
    doc.setFontSize(12);
    doc.text('Empresa: ' + pedido.empresa, 10, 35);
    doc.text('Descrição:', 10, 45);
    doc.text(pedido.descricao, 10, 55);
    if (pedido.data_pedido) {
      doc.text('Data: ' + new Date(pedido.data_pedido).toLocaleString(), 10, 70);
    }
    doc.save(`pedido_${pedido.id}.pdf`);
  } catch (err) {
    alert('Erro ao gerar PDF do pedido.');
  }
};

window.cancelarPedido = async function(id) {
  if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;
  try {
    const resp = await fetch('/api/pedidos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (resp.ok) {
      alert('Pedido cancelado com sucesso!');
      carregarPedidos();
    } else {
      alert('Erro ao cancelar pedido.');
    }
  } catch (err) {
    alert('Erro ao cancelar pedido.');
  }
};

// Função para excluir o pedido
function excluirPedido() {
  if (!pedidoEditando || !pedidoEditando.id) return;
  if (!confirm('Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.')) return;
  fetch('/api/pedidos', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: pedidoEditando.id })
  })
    .then(resp => {
      if (resp.ok) {
        alert('Pedido excluído com sucesso!');
        document.getElementById('editar-pedido-card').style.display = 'none';
        carregarPedidos();
      } else {
        alert('Erro ao excluir pedido.');
      }
    })
    .catch(() => alert('Erro ao excluir pedido.'));
}

document.getElementById('form-editar-pedido').addEventListener('click', function(e) {
  if (e.target && e.target.id === 'excluir-pedido-btn') {
    excluirPedido();
  }
});

function buscarProduto(input, empresa) {
  const valor = input.value.trim();
  if (valor.length < 2) return;
  
  const produtos = getProdutosByEmpresa(empresa);
  
  // Buscar produto exato primeiro
  const produtoExato = produtos.find(produto => {
    const ref = produto.REFERENCIA || produto.REF;
    return ref.toLowerCase() === valor.toLowerCase();
  });
  
  // Se encontrar produto exato, preencher automaticamente
  if (produtoExato) {
    preencherProduto(input, produtoExato, empresa);
    return;
  }
  
  const sugestoes = produtos.filter(produto => {
    const ref = produto.REFERENCIA || produto.REF;
    const desc = produto.DESCRIÇÃO || produto.MODELO;
    return ref.toLowerCase().includes(valor.toLowerCase()) || 
           desc.toLowerCase().includes(valor.toLowerCase());
  }).slice(0, 5);
  
  if (sugestoes.length === 0) return;
  
  // Criar dropdown de sugestões
  let dropdown = document.getElementById('sugestoes-produtos');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'sugestoes-produtos';
    dropdown.style.cssText = 'position:absolute;background:#fff;border:1px solid #ccc;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.1);z-index:1000;max-height:200px;overflow-y:auto;';
    document.body.appendChild(dropdown);
  }
  
  dropdown.innerHTML = '';
  sugestoes.forEach(produto => {
    const item = document.createElement('div');
    item.style.cssText = 'padding:8px 12px;cursor:pointer;border-bottom:1px solid #eee;';
    item.textContent = `${produto.REFERENCIA || produto.REF} - ${produto.DESCRIÇÃO || produto.MODELO}`;
    item.addEventListener('click', () => {
      preencherProduto(input, produto, empresa);
      dropdown.remove();
    });
    dropdown.appendChild(item);
  });
  
  // Posicionar dropdown
  const rect = input.getBoundingClientRect();
  dropdown.style.left = rect.left + 'px';
  dropdown.style.top = (rect.bottom + 5) + 'px';
  dropdown.style.width = rect.width + 'px';
  
  // Remover dropdown ao clicar fora
  setTimeout(() => {
    document.addEventListener('click', function removerDropdown(e) {
      if (!dropdown.contains(e.target) && e.target !== input) {
        dropdown.remove();
        document.removeEventListener('click', removerDropdown);
      }
    });
  }, 100);
}

function preencherProduto(input, produto, empresa) {
  const row = input.closest('tr');
  const idx = Array.from(row.parentNode.children).indexOf(row);
  
  // Preencher referência
  input.value = produto.REFERENCIA || produto.REF;
  
  // Preencher descrição
  const descInput = document.getElementById(`edit-item-${idx}-DESCRIÇÃO`);
  if (descInput) descInput.value = produto.DESCRIÇÃO || produto.MODELO;
  
  // Preencher preço
  const precoInput = document.getElementById(`edit-item-${idx}-preco`);
  if (precoInput) {
    if (empresa === 'steitz') {
      precoInput.value = produto.PRECOS.a_vista || 0;
    } else {
      precoInput.value = produto.PRECO || 0;
    }
    // Trigger o evento para atualizar o total
    precoInput.dispatchEvent(new Event('input'));
  }
  
  // Atualizar total
  atualizarTotalEdicao();
}

// Função utilitária para exibir data/hora no horário de Brasília
function formatarDataBrasilia(data) {
  if (!data) return '';
  // Se já for objeto Date
  if (data instanceof Date) {
    return data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }
  // Se for string no formato 'YYYY-MM-DD HH:mm:ss'
  // Substitui espaço por 'T' para formato ISO, mas NÃO adiciona 'Z'
  let dataISO = data.replace(' ', 'T');
  let d = new Date(dataISO);
  if (isNaN(d.getTime())) {
    // fallback: tenta só new Date(data)
    d = new Date(data);
    if (isNaN(d.getTime())) return '';
  }
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

// Exemplo de uso (caso queira reativar a coluna de data):
// <td>${pedido.data_pedido ? formatarDataBrasilia(pedido.data_pedido) : ''}</td> 