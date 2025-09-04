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
      
      // Salvar dados do pedido no localStorage para edição
      localStorage.setItem('pedidoParaEdicao', JSON.stringify(pedido));
      
      // Redirecionar para a página da empresa
      let paginaEmpresa = '';
      switch(pedido.empresa) {
        case 'pantaneiro5':
          paginaEmpresa = 'pantaneiro5.html';
          break;
        case 'pantaneiro7':
          paginaEmpresa = 'pantaneiro7.html';
          break;
        case 'steitz':
          paginaEmpresa = 'steitz.html';
          break;
        default:
          alert('Empresa não reconhecida.');
          return;
      }
      
      // Redirecionar para a página da empresa
      window.location.href = paginaEmpresa + '?modo=edicao&id=' + id;
    });
};

// Função para carregar produtos via AJAX
async function carregarProdutosDaEmpresa(empresa) {
  try {
    let produtosUrl;
    if (empresa === 'pantaneiro5') {
      produtosUrl = '/prodpantaneiro5.html';
    } else if (empresa === 'pantaneiro7') {
      produtosUrl = '/prodpantaneiro7.html';
    } else if (empresa === 'steitz') {
      return produtosSteitzCompletos; // Steitz está definido diretamente
    }
    
    if (produtosUrl) {
      const response = await fetch(produtosUrl);
      const text = await response.text();
      
      // Extrair window.produtosData do arquivo
      const match = text.match(/window\.produtosData\s*=\s*(\[[\s\S]*?\]);/);
      if (match) {
        const produtosData = eval(match[1]);
        return produtosData;
      }
    }
  } catch (error) {
    console.error('Erro ao carregar produtos:', error);
  }
  
  // Fallback para produtos básicos se não conseguir carregar
  return getProdutosFallback(empresa);
}

// Produtos completos da Steitz
const produtosSteitzCompletos = [
  { REF: "1041", MODELO: "AUSTRAL-PRÓ WATER RESISTENT", TAM: "37 a 45", PRECOS: { p_30_60_90: 961.0, p_30_45_60: 921.0, a_vista: 898.0 } },
  { REF: "1042", MODELO: "AUSTRAL WATER RESISTENT", TAM: "37 a 45", PRECOS: { p_30_60_90: 839.0, p_30_45_60: 808.0, a_vista: 789.0 } },
  { REF: "1004", MODELO: "BOTA MOTOC. WATER RESISTENT", TAM: "34 a 44", PRECOS: { p_30_60_90: 514.0, p_30_45_60: 497.0, a_vista: 479.0 } },
  { REF: "1020", MODELO: "BOTA MOTOC.WATER RESISTENT", TAM: "34 a 44", PRECOS: { p_30_60_90: 514.0, p_30_45_60: 497.0, a_vista: 479.0 } },
  { REF: "1005", MODELO: "BOTA FEM.WATER RESISTENT", TAM: "34 a 39", PRECOS: { p_30_60_90: 514.0, p_30_45_60: 497.0, a_vista: 479.0 } },
  { REF: "1007", MODELO: "BOTA FEM.WATER RESISTENT", TAM: "34 a 40", PRECOS: { p_30_60_90: 514.0, p_30_45_60: 497.0, a_vista: 479.0 } },
  { REF: "1009", MODELO: "BOTA MOTOC. WATER RESISTENT", TAM: "33 a 39", PRECOS: { p_30_60_90: 514.0, p_30_45_60: 497.0, a_vista: 479.0 } },
  { REF: "1010", MODELO: "BOTINA MOTOC.WATER RESISTENT", TAM: "35 a 44", PRECOS: { p_30_60_90: 414.0, p_30_45_60: 401.0, a_vista: 388.0 } },
  { REF: "04-A", MODELO: "BOTA PRETA C/PROT.", TAM: "34 a 44", PRECOS: { p_30_60_90: 315.0, p_30_45_60: 299.0, a_vista: 284.0 } },
  { REF: "04", MODELO: "BOTA PRETA C/PROT.", TAM: "35 a 45", PRECOS: { p_30_60_90: 315.0, p_30_45_60: 299.0, a_vista: 284.0 } },
  { REF: "010", MODELO: "BOTINA MOTOC.", TAM: "35 a 44", PRECOS: { p_30_60_90: 299.0, p_30_45_60: 285.0, a_vista: 270.0 } },
  { REF: "020", MODELO: "BOTA MOTOC.", TAM: "34 a 44", PRECOS: { p_30_60_90: 351.0, p_30_45_60: 333.0, a_vista: 316.0 } },
  { REF: "4002", MODELO: "BOTA NYLON & PELO C/ BORDA", TAM: "35 a 39", PRECOS: { p_30_60_90: 196.0, p_30_45_60: 189.0, a_vista: 182.0 } }
];

// Produtos básicos como fallback
const produtosPantaneiro5Basicos = [
  { CATEGORIA: "Aventura", REFERENCIA: "201", DESCRIÇÃO: "JARDINEIRA PVC COM BOTA", TAMANHOS: ["P - EX / BOTAS 35 - 46"], PRECO: 135.39 },
  { CATEGORIA: "Aventura", REFERENCIA: "203", DESCRIÇÃO: "PERNEIRA PVC VIRILHA COM BOTA", TAMANHOS: ["ÚNICO / BOTAS 35 - 46"], PRECO: 104.78 },
  { CATEGORIA: "Aventura", REFERENCIA: "204", DESCRIÇÃO: "PERNEIRA PVC JOELHO COM BOTA", TAMANHOS: ["ÚNICO / BOTAS 35 - 46"], PRECO: 92.3 },
  { CATEGORIA: "Aventura", REFERENCIA: "209", DESCRIÇÃO: "JAQUETA PVC PESCADOR", TAMANHOS: ["PP", "P", "M", "G", "GG", "EX", "EXG", "2G", "3G", "4G", "5G"], PRECO: 42.58 },
  { CATEGORIA: "Aventura", REFERENCIA: "210", DESCRIÇÃO: "CALÇA PVC PESCADOR", TAMANHOS: ["PP", "P", "M", "G", "GG", "EX", "EXG", "2G", "3G", "4G", "5G"], PRECO: 29.17 },
  { CATEGORIA: "Aventura", REFERENCIA: "213", DESCRIÇÃO: "JAQUETA NYLON PESCADOR", TAMANHOS: ["PP", "P", "M", "G", "GG", "EX", "EXG", "2G", "3G", "4G", "5G"], PRECO: 70.46 },
  { CATEGORIA: "Aventura", REFERENCIA: "214", DESCRIÇÃO: "CALÇA NYLON PESCADOR", TAMANHOS: ["PP", "P", "M", "G", "GG", "EX", "EXG", "2G", "3G", "4G", "5G"], PRECO: 48.07 },
  { CATEGORIA: "Aventura", REFERENCIA: "234", DESCRIÇÃO: "CONJUNTO PVC PESCADOR COM CAPUZ", TAMANHOS: ["PP", "P", "M", "G", "GG", "EX", "EXG", "2G", "3G", "4G", "5G"], PRECO: 64.52 },
  { CATEGORIA: "Aventura", REFERENCIA: "238", DESCRIÇÃO: "CONJUNTO NYLON PESCADOR COM CAPUZ", TAMANHOS: ["PP", "P", "M", "G", "GG", "EX", "EXG", "2G", "3G", "4G", "5G"], PRECO: 117.69 },
  { CATEGORIA: "PRO", REFERENCIA: "222", DESCRIÇÃO: "CAPA LONGA PVC COM CAPUZ LAPA SIMPLES COM VELCRO", TAMANHOS: ["PP", "P", "M", "G", "GG", "EX", "EXG", "2G", "3G", "4G", "5G"], PRECO: 48.68 },
  { CATEGORIA: "PRO", REFERENCIA: "222.1", DESCRIÇÃO: "CAPA LONGA PVC COM CAPUZ LAPA INTERNA", TAMANHOS: ["PP", "P", "M", "G", "GG", "EX", "EXG", "2G", "3G", "4G", "5G"], PRECO: 47.04 },
  { CATEGORIA: "PRO", REFERENCIA: "225", DESCRIÇÃO: "CAPA LONGA NYLON PADRÃO ELÁSTICO NOS PUNHOS", TAMANHOS: ["PP", "P", "M", "G", "GG", "EX", "EXG", "2G", "3G", "4G", "5G"], PRECO: 100.7 }
];

const produtosPantaneiro7Basicos = [...produtosPantaneiro5Basicos]; // Mesmo catálogo

function getProdutosFallback(empresa) {
  switch(empresa) {
    case 'pantaneiro5': return produtosPantaneiro5Basicos;
    case 'pantaneiro7': return produtosPantaneiro7Basicos;
    case 'steitz': return produtosSteitzCompletos;
    default: return [...produtosPantaneiro5Basicos, ...produtosPantaneiro7Basicos, ...produtosSteitzCompletos];
  }
}

// Cache de produtos
let cachesProdutos = {};

// Variável global para tabela de preços selecionada (Steitz)
let tabelaPrecosSelecionada = 'a_vista';

async function getProdutosByEmpresa(empresa) {
  // Verificar se já está no cache
  if (cachesProdutos[empresa]) {
    return cachesProdutos[empresa];
  }
  
  // Carregar produtos da empresa
  const produtos = await carregarProdutosDaEmpresa(empresa);
  
  // Salvar no cache
  cachesProdutos[empresa] = produtos;
  
  return produtos;
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
  html += '<thead><tr style="background:#f8f9fa;"><th>Referência</th><th>Descrição</th><th>Tamanho</th><th>Cor</th><th>Qtd</th><th>Unitário</th><th>Total</th><th>Desc. Extra</th><th>Ação</th></tr></thead><tbody id="edit-itens-lista">';
  (campos.itens || []).forEach((item, idx) => {
    const totalItem = ((item.quantidade || 1) * (item.preco || 0) * (1 - (item.descontoExtra || 0) / 100)).toFixed(2);
    html += `<tr>`;
    html += `<td><input type='text' id='edit-item-${idx}-REFERENCIA' value='${item.REFERENCIA || item.REF || ''}' style='width:90px;' class='busca-produto'/></td>`;
    html += `<td><input type='text' id='edit-item-${idx}-DESCRIÇÃO' value='${item.DESCRIÇÃO || item.MODELO || ''}' style='width:180px;' readonly/></td>`;
    html += `<td><input type='text' id='edit-item-${idx}-tamanho' value='${item.tamanho || ''}' style='width:70px;'/></td>`;
    html += `<td><input type='text' id='edit-item-${idx}-cor' value='${item.cor || ''}' style='width:70px;'/></td>`;
    html += `<td><input type='number' id='edit-item-${idx}-quantidade' value='${item.quantidade || 1}' min='1' style='width:60px;' class='auto-total quantidade-input' onchange='validarQuantidade(this)'/></td>`;
    html += `<td><input type='number' id='edit-item-${idx}-preco' value='${item.preco || 0}' min='0' step='0.01' style='width:80px;' class='auto-total'/></td>`;
    html += `<td><span id='edit-item-${idx}-total' class='total-item'>R$ ${totalItem}</span></td>`;
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
      input.addEventListener('change', atualizarTotalEdicao);
    });
    
    // Adiciona listeners específicos para campos de quantidade
    document.querySelectorAll('.quantidade-input').forEach(input => {
      input.addEventListener('input', function() {
        // Validar quantidade em tempo real
        if (this.value < 1) {
          this.value = 1;
        }
        atualizarTotalEdicao();
      });
      input.addEventListener('change', function() {
        validarQuantidade(this);
        atualizarTotalEdicao();
      });
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
    
    // Atualizar total individual do item
    const totalItemElement = document.getElementById(`edit-item-${idx}-total`);
    if (totalItemElement) {
      totalItemElement.textContent = `R$ ${valorItem.toFixed(2)}`;
    }
    
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

// Função para validar quantidade
window.validarQuantidade = function(input) {
  const valor = parseInt(input.value);
  if (isNaN(valor) || valor < 1) {
    input.value = 1;
    input.style.borderColor = '#dc3545';
    input.style.backgroundColor = '#ffe6e6';
    
    // Mostrar notificação de erro
    mostrarNotificacao('⚠️ Quantidade deve ser um número maior que zero!', 'erro');
    
    // Remover estilo de erro após 2 segundos
    setTimeout(() => {
      input.style.borderColor = '';
      input.style.backgroundColor = '';
    }, 2000);
  } else {
    input.style.borderColor = '#28a745';
    input.style.backgroundColor = '#e6ffe6';
    
    // Remover estilo de sucesso após 1 segundo
    setTimeout(() => {
      input.style.borderColor = '';
      input.style.backgroundColor = '';
    }, 1000);
  }
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
  abrirModalProdutos();
};

async function abrirModalProdutos() {
  const modal = document.getElementById('modal-produtos');
  if (!modal) {
    criarModalProdutos();
  }
  
  // Mostrar modal primeiro
  document.getElementById('modal-produtos').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  
  // Mostrar loading
  const listaContainer = document.getElementById('lista-produtos-modal');
  listaContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;"><div style="font-size: 2rem; margin-bottom: 10px;">⏳</div>Carregando produtos...</div>';
  
  // Carregar produtos da empresa
  const produtos = await getProdutosByEmpresa(pedidoEditando.empresa);
  renderizarProdutosModal(produtos);
}

function criarModalProdutos() {
  // Determinar nome da empresa
  let nomeEmpresa = 'Produtos';
  let iconEmpresa = '📦';
  
  if (pedidoEditando.empresa === 'pantaneiro5') {
    nomeEmpresa = 'Pantaneiro 5mm';
    iconEmpresa = '🌊';
  } else if (pedidoEditando.empresa === 'pantaneiro7') {
    nomeEmpresa = 'Pantaneiro 7mm';
    iconEmpresa = '🌊';
  } else if (pedidoEditando.empresa === 'steitz') {
    nomeEmpresa = 'Steitz';
    iconEmpresa = '👞';
  }

  // Seletor de tabela de preços para Steitz
  let seletorTabelaPrecos = '';
  if (pedidoEditando.empresa === 'steitz') {
    seletorTabelaPrecos = `
      <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 8px; border: 1px solid #e2e8f0;">
        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #1e293b;">💰 Tabela de Preços:</label>
        <select id="tabela-precos-steitz" style="width: 100%; padding: 10px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 1rem; background: white; cursor: pointer;">
          <option value="a_vista">À Vista</option>
          <option value="p_30_45_60">30/45/60 dias</option>
          <option value="p_30_60_90">30/60/90 dias</option>
        </select>
      </div>
    `;
  }

  const modalHtml = `
    <div id="modal-produtos" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; align-items: center; justify-content: center;">
      <div style="background: white; border-radius: 12px; max-width: 900px; width: 90%; max-height: 80vh; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <div style="padding: 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 1.8rem;">${iconEmpresa}</span>
            <div>
              <h3 style="margin: 0; font-size: 1.3rem; font-weight: 700;">Selecionar Produto</h3>
              <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">${nomeEmpresa}</p>
            </div>
          </div>
          <button id="fechar-modal-produtos" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 5px; border-radius: 4px; transition: all 0.2s;">✕</button>
        </div>
        <div style="padding: 20px;">
          ${seletorTabelaPrecos}
          <div style="margin-bottom: 20px;">
            <input type="text" id="busca-modal-produtos" placeholder="🔍 Buscar produtos por referência ou descrição..." style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 1rem; transition: all 0.3s;">
          </div>
          <div id="lista-produtos-modal" style="max-height: 400px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <!-- Produtos serão inseridos aqui -->
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Event listeners
  document.getElementById('fechar-modal-produtos').addEventListener('click', fecharModalProdutos);
  document.getElementById('modal-produtos').addEventListener('click', function(e) {
    if (e.target === this) fecharModalProdutos();
  });
  
  // Listener para mudança de tabela de preços (Steitz)
  if (pedidoEditando.empresa === 'steitz') {
    document.getElementById('tabela-precos-steitz').addEventListener('change', function(e) {
      tabelaPrecosSelecionada = e.target.value;
      // Recarregar produtos com a nova tabela
      if (cachesProdutos[pedidoEditando.empresa]) {
        renderizarProdutosModal(cachesProdutos[pedidoEditando.empresa]);
      }
    });
  }
  
  // Fechar modal com ESC
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.getElementById('modal-produtos').style.display === 'flex') {
      fecharModalProdutos();
    }
  });
  
  // Busca de produtos com debounce
  let timeoutBusca;
  document.getElementById('busca-modal-produtos').addEventListener('input', function(e) {
    clearTimeout(timeoutBusca);
    timeoutBusca = setTimeout(async () => {
      const filtro = e.target.value.toLowerCase();
      const produtos = await getProdutosByEmpresa(pedidoEditando.empresa);
      const produtosFiltrados = produtos.filter(produto => {
        const ref = produto.REFERENCIA || produto.REF || '';
        const desc = produto.DESCRIÇÃO || produto.MODELO || '';
        return ref.toLowerCase().includes(filtro) || desc.toLowerCase().includes(filtro);
      });
      renderizarProdutosModal(produtosFiltrados);
    }, 300);
  });
  
  // Focar no campo de busca quando abrir
  setTimeout(() => {
    document.getElementById('busca-modal-produtos').focus();
  }, 100);
}

function renderizarProdutosModal(produtos) {
  const lista = document.getElementById('lista-produtos-modal');
  if (!produtos || produtos.length === 0) {
    lista.innerHTML = '<div style="text-align: center; padding: 40px; color: #64748b; font-size: 1.1rem;">❌ Nenhum produto encontrado</div>';
    return;
  }
  
  // Adicionar contador de produtos
  let html = `
    <div style="padding: 10px 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 0.9rem; color: #64748b; text-align: center;">
      📊 ${produtos.length} produto${produtos.length !== 1 ? 's' : ''} encontrado${produtos.length !== 1 ? 's' : ''}
    </div>
    <table style="width: 100%; border-collapse: collapse;">
  `;
  
  // Cabeçalho específico por empresa
  if (pedidoEditando.empresa === 'steitz') {
    const tabelaNome = {
      'a_vista': 'À Vista',
      'p_30_45_60': '30/45/60 dias',
      'p_30_60_90': '30/60/90 dias'
    };
    
    html += `
      <thead>
        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Ref.</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Modelo</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Preço (${tabelaNome[tabelaPrecosSelecionada]})</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Ação</th>
        </tr>
      </thead>
    `;
  } else {
    html += `
      <thead>
        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Ref.</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Descrição</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Preço</th>
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #1e293b;">Ação</th>
        </tr>
      </thead>
    `;
  }
  
  html += '<tbody>';
  
  produtos.forEach((produto, index) => {
    const ref = produto.REFERENCIA || produto.REF || '';
    const desc = produto.DESCRIÇÃO || produto.MODELO || '';
    const preco = pedidoEditando.empresa === 'steitz' ? 
      (produto.PRECOS?.[tabelaPrecosSelecionada] || produto.PRECOS?.a_vista || 0) : 
      (produto.PRECO || 0);
    
    html += `
      <tr style="border-bottom: 1px solid #e2e8f0; transition: all 0.2s;" 
          onmouseover="this.style.background='#f8fafc'; this.style.transform='translateX(2px)'" 
          onmouseout="this.style.background='transparent'; this.style.transform='translateX(0)'">
        <td style="padding: 12px; font-weight: 700; color: #2563eb; font-size: 0.95rem;">${ref}</td>
        <td style="padding: 12px; color: #334155; line-height: 1.4;">${desc}</td>
        <td style="padding: 12px; color: #059669; font-weight: 700; font-size: 1rem;">R$ ${preco.toFixed(2)}</td>
        <td style="padding: 12px;">
          <button onclick="selecionarProdutoModal(${index})" 
                  style="background: linear-gradient(135deg, #059669 0%, #047857 100%); 
                         color: white; 
                         border: none; 
                         padding: 10px 20px; 
                         border-radius: 8px; 
                         cursor: pointer; 
                         font-weight: 600; 
                         font-size: 0.9rem;
                         transition: all 0.3s;
                         box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
                         position: relative;
                         overflow: hidden;"
                  onmouseover="this.style.transform='translateY(-2px) scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(5, 150, 105, 0.4)'"
                  onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 2px 6px rgba(5, 150, 105, 0.3)'"
                  title="Clique para adicionar este produto ao pedido">
            ✓ Selecionar
          </button>
        </td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  lista.innerHTML = html;
}

let produtosModalCache = [];

window.selecionarProdutoModal = async function(index) {
  const produtos = await getProdutosByEmpresa(pedidoEditando.empresa);
  const produto = produtos[index];
  
  if (!produto) return;
  
  // Feedback visual no botão
  const botoes = document.querySelectorAll('#lista-produtos-modal button');
  const botaoClicado = botoes[index];
  if (botaoClicado) {
    botaoClicado.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    botaoClicado.innerHTML = '✅ Adicionado!';
    botaoClicado.style.transform = 'scale(1.1)';
    botaoClicado.disabled = true;
  }
  
  // Adicionar item ao pedido
  const novoItem = {
    REFERENCIA: produto.REFERENCIA || produto.REF || '',
    DESCRIÇÃO: produto.DESCRIÇÃO || produto.MODELO || '',
    REF: produto.REF || produto.REFERENCIA || '',
    MODELO: produto.MODELO || produto.DESCRIÇÃO || '',
    tamanho: '',
    cor: '',
    quantidade: 1,
    preco: pedidoEditando.empresa === 'steitz' ? 
      (produto.PRECOS?.[tabelaPrecosSelecionada] || produto.PRECOS?.a_vista || 0) : 
      (produto.PRECO || 0),
    descontoExtra: 0
  };
  
  pedidoEditando.dados.itens.push(novoItem);
  
  // Fechar modal após um breve delay para mostrar o feedback
  setTimeout(() => {
    fecharModalProdutos();
    
    // Mostrar notificação de sucesso
    mostrarNotificacao('✅ Produto adicionado ao pedido!', 'sucesso');
    
    // Atualizar formulário
  renderizarFormularioEdicao(pedidoEditando);
    
    // Atualizar total
  setTimeout(() => {
    atualizarTotalEdicao();
  }, 50);
  }, 800);
};

// Função para mostrar notificações
function mostrarNotificacao(mensagem, tipo = 'info') {
  // Remover notificação existente
  const notificacaoExistente = document.getElementById('notificacao-temp');
  if (notificacaoExistente) {
    notificacaoExistente.remove();
  }
  
  const cores = {
    sucesso: { bg: '#10b981', icon: '✅' },
    erro: { bg: '#ef4444', icon: '❌' },
    info: { bg: '#3b82f6', icon: 'ℹ️' }
  };
  
  const cor = cores[tipo] || cores.info;
  
  const notificacao = document.createElement('div');
  notificacao.id = 'notificacao-temp';
  notificacao.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${cor.bg};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 20000;
    font-weight: 600;
    font-size: 0.9rem;
    animation: slideInRight 0.3s ease-out;
    max-width: 300px;
  `;
  
  notificacao.innerHTML = `${cor.icon} ${mensagem}`;
  
  document.body.appendChild(notificacao);
  
  // Remover após 3 segundos
  setTimeout(() => {
    if (notificacao.parentNode) {
      notificacao.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        notificacao.remove();
      }, 300);
    }
  }, 3000);
}

// Adicionar keyframes CSS para animações da notificação
if (!document.getElementById('notificacao-styles')) {
  const style = document.createElement('style');
  style.id = 'notificacao-styles';
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

function fecharModalProdutos() {
  const modal = document.getElementById('modal-produtos');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
  }
}

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
  
  // Atualizar descricao no formato padrão (inline)
  const descricao = `Cliente: ${pedidoEditando.dados.cliente.razao} Itens: ${pedidoEditando.dados.itens.map(item => (item.REFERENCIA || item.REF) + ' x' + item.quantidade).join(', ')} Total: R$ ${pedidoEditando.dados.total.toFixed(2)}`;
  
  try {
    const resp = await fetch('/api/pedidos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, empresa: pedidoEditando.empresa, descricao, dados: pedidoEditando.dados })
    });
    
    if (resp.ok) {
      const result = await resp.json();
      // Mostrar notificação mais discreta
      mostrarNotificacao('✅ Pedido atualizado com sucesso!', 'sucesso');
      document.getElementById('editar-pedido-card').style.display = 'none';
      carregarPedidos();
    } else {
      const errorData = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
      console.error('Erro na resposta:', errorData);
      alert(`❌ Erro ao salvar pedido: ${errorData.error || 'Erro desconhecido'}`);
    }
  } catch (err) {
    console.error('Erro na requisição:', err);
    alert('❌ Erro ao salvar pedido: Erro de conexão');
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

async function buscarProduto(input, empresa) {
  const valor = input.value.trim();
  if (valor.length < 2) return;
  
  const produtos = await getProdutosByEmpresa(empresa);
  
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
      precoInput.value = produto.PRECOS[tabelaPrecosSelecionada] || produto.PRECOS.a_vista || 0;
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