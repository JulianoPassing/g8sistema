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
        <td>${pedido.data_pedido ? new Date(pedido.data_pedido).toLocaleString() : ''}</td>
        <td><button class="edit-btn" onclick="editarPedido(${pedido.id}, '${pedido.empresa.replace(/'/g, "&#39;")}', \`${pedido.descricao.replace(/`/g, "&#96;")}\`)">Editar</button></td>
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
    html += `<td><input type='text' id='edit-item-${idx}-REFERENCIA' value='${item.REFERENCIA || item.REF || ''}' style='width:90px;'/></td>`;
    html += `<td><input type='text' id='edit-item-${idx}-DESCRIÇÃO' value='${item.DESCRIÇÃO || item.MODELO || ''}' style='width:180px;'/></td>`;
    html += `<td><input type='text' id='edit-item-${idx}-tamanho' value='${item.tamanho || ''}' style='width:70px;'/></td>`;
    html += `<td><input type='text' id='edit-item-${idx}-cor' value='${item.cor || ''}' style='width:70px;'/></td>`;
    html += `<td><input type='number' id='edit-item-${idx}-quantidade' value='${item.quantidade || 1}' min='1' style='width:60px;'/></td>`;
    html += `<td><input type='number' id='edit-item-${idx}-preco' value='${item.preco || 0}' min='0' step='0.01' style='width:80px;'/></td>`;
    html += `<td><input type='number' id='edit-item-${idx}-descontoExtra' value='${item.descontoExtra || 0}' min='0' max='100' step='0.01' style='width:60px;'/></td>`;
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
    html += `<div class='form-group'><label style='font-weight:600;'>${campo.charAt(0).toUpperCase() + campo.slice(1)}</label><input type='number' id='edit-desconto-${campo}' value='${campos.descontos[campo] || 0}' /></div>`;
  }
  html += '</div>';
  // Total
  html += `<div class='form-group'><label style='font-weight:600;'>Total</label><input type='number' id='edit-total' value='${campos.total || 0}' style='width:180px;'/></div>`;
  // Observações
  html += `<div class='form-group'><label style='font-weight:600;'>Observações</label><input type='text' id='edit-obs' value='${(campos.cliente && campos.cliente.obs) || ''}' /></div>`;
  form.innerHTML = html;
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