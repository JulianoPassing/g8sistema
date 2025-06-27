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
    let html = '<table><thead><tr><th>ID</th><th>Empresa</th><th>Descrição</th><th>Data</th><th>Ações</th></tr></thead><tbody>';
    for (const pedido of pedidos) {
      html += `<tr>
        <td>${pedido.id}</td>
        <td>${pedido.empresa}</td>
        <td>${pedido.descricao}</td>
        <td>${pedido.data_pedido ? formatarDataBrasilia(pedido.data_pedido) : ''}</td>
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
    html += `<div class='form-group'><label style='font-weight:600;'>${campo.charAt(0).toUpperCase() + campo.slice(1)}</label><input type='text' id='edit-cliente-${campo}' value='${campos.cliente[campo] || ''}' /></div>`;
  }
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
      input.addEventListener('input', (e) => buscarProduto(e.target, pedido.empresa));
      // Sugestão ao focar também
      input.addEventListener('focus', (e) => buscarProduto(e.target, pedido.empresa));
    });
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
};

window.adicionarItemEdicao = function() {
  if (!pedidoEditando || !pedidoEditando.dados) return;
  pedidoEditando.dados.itens.push({ REFERENCIA: '', DESCRIÇÃO: '', tamanho: '', cor: '', quantidade: 1, preco: 0, descontoExtra: 0 });
  renderizarFormularioEdicao(pedidoEditando);
};

async function salvarAlteracoes() {
  const id = document.getElementById('pedido-id').value;
  if (!pedidoEditando) return;
  // Atualizar cliente
  for (const campo in (pedidoEditando.dados.cliente || {})) {
    pedidoEditando.dados.cliente[campo] = document.getElementById('edit-cliente-' + campo).value;
  }
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
  const { cliente, itens, descontos, total } = pedido.dados;
  const doc = new window.jspdf.jsPDF();
  let y = 20;
  doc.setFontSize(16);
  doc.text('Pedido #' + pedido.id, 10, y);
  y += 10;
  doc.setFontSize(12);
  doc.text('Empresa: ' + (pedido.empresa || ''), 10, y);
  y += 10;
  if (cliente) {
    for (const campo in cliente) {
      if (cliente[campo]) {
        doc.text(`${campo.charAt(0).toUpperCase() + campo.slice(1)}: ${cliente[campo]}`, 10, y);
        y += 8;
      }
    }
  }
  y += 4;
  doc.setFontSize(13);
  doc.text('Itens do Pedido:', 10, y);
  y += 8;
  if (Array.isArray(itens)) {
    itens.forEach((item, idx) => {
      doc.text(
        `${idx + 1}. ${item.DESCRIÇÃO || item.MODELO || ''} (Ref: ${item.REFERENCIA || item.REF || ''}) - Tam: ${item.tamanho || ''} - Cor: ${item.cor || ''} - Qtd: ${item.quantidade || ''} - Unit: R$ ${(item.preco || 0).toFixed(2)}${item.descontoExtra ? ' (Desc: ' + item.descontoExtra + '%)' : ''}`,
        10,
        y
      );
      y += 7;
    });
  }
  y += 4;
  if (descontos) {
    doc.text('Descontos:', 10, y);
    y += 7;
    for (const campo in descontos) {
      doc.text(`${campo.charAt(0).toUpperCase() + campo.slice(1)}: ${descontos[campo]}%`, 12, y);
      y += 6;
    }
  }
  y += 4;
  doc.setFontSize(14);
  doc.text('Total do Pedido: R$ ' + (total || 0).toFixed(2), 10, y);
  y += 10;
  doc.save(`pedido_${pedido.id}.pdf`);
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
  // Substitui espaço por 'T' para formato ISO e adiciona 'Z' para UTC
  let dataISO = data.replace(' ', 'T') + 'Z';
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