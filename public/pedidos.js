// pedidos.js

// Variável global para armazenar todos os pedidos
let todosPedidos = [];

// Função global para formatar data
function formatarData(data) {
  if (!data) return 'N/A';
  try {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return 'N/A';
  }
}

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

  // Event listener para busca de pedidos
  document.getElementById('busca-pedidos').addEventListener('input', function(e) {
    filtrarPedidos(e.target.value);
  });

  // Evento de submit do formulário de edição - DESABILITADO (usando editor-pedido.js)
  document.getElementById('form-editar-pedido').addEventListener('submit', async function (e) {
    e.preventDefault();
    console.log('🚫 LISTENER DESABILITADO - usando editor-pedido.js em vez de salvarAlteracoes()');
    // await salvarAlteracoes(); // DESABILITADO
  });

  // Botão cancelar edição
  document.getElementById('cancelar-edicao').addEventListener('click', function() {
    document.getElementById('editar-pedido-card').style.display = 'none';
  });

  // Adicionar botão de exclusão no painel de edição
  document.getElementById('form-editar-pedido').insertAdjacentHTML('beforeend', `
    <button type="button" id="excluir-pedido-btn" style="margin-left:10px;background:#dc3545;color:white;">🗑️ Excluir Pedido</button>
  `);

  // Evento para o botão de exclusão no painel de edição
  document.getElementById('excluir-pedido-btn').addEventListener('click', function() {
    const pedidoId = document.getElementById('pedido-id').value;
    if (pedidoId) {
      excluirPedido(pedidoId);
    } else {
      alert('❌ Erro: ID do pedido não encontrado.');
    }
  });
});

async function carregarPedidos() {
  const lista = document.getElementById('pedidos-lista');
  lista.innerHTML = '<p>Carregando pedidos...</p>';
  try {
    const resp = await fetch('/api/pedidos');
    const pedidos = await resp.json();
    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      lista.innerHTML = '<p>Nenhum pedido encontrado.</p>';
      todosPedidos = [];
      atualizarContadorResultados(0);
      return;
    }
    
    // Armazenar todos os pedidos na variável global
    todosPedidos = pedidos;
    // Função para extrair informações do pedido
    function extrairInfoPedido(descricao, dados) {
      console.log('📋 Descrição do pedido:', descricao); // Debug
      console.log('📋 Dados do pedido:', dados); // Debug
      
      const info = {
        cliente: 'N/A',
        itens: [],
        total: 'R$ 0,00'
      };
      
      // Parse dos dados se for string JSON
      let dadosParsed = dados;
      if (typeof dados === 'string') {
        try {
          dadosParsed = JSON.parse(dados);
          console.log('📋 Dados parseados:', dadosParsed);
        } catch (e) {
          console.log('❌ Erro ao parsear dados:', e);
          dadosParsed = null;
        }
      }
      
    // Se tem dados estruturados (pedidos B2B, Distribuição, etc), usar eles primeiro
    if (dadosParsed && dadosParsed.cliente) {
      info.cliente = dadosParsed.cliente.razao || dadosParsed.cliente.nome || 'N/A';
      
      if (dadosParsed.itens && Array.isArray(dadosParsed.itens)) {
        info.itens = dadosParsed.itens.map(item => {
          const ref = item.REFERENCIA || item.ref || item.REF || '';
          const qtd = item.quantidade || 0;
          const tam = item.tamanho || '';
          const cor = item.cor || '';
          
          let itemStr = `${ref} x${qtd}`;
          if (tam) itemStr += ` - T:${tam}`;
          if (cor) itemStr += ` - C:${cor}`;
          
          return itemStr;
        });
      }
      
      // Para pedidos da distribuição, o total está em dadosParsed.total
      if (dadosParsed.total !== undefined && dadosParsed.total !== null) {
        info.total = `R$ ${parseFloat(dadosParsed.total).toFixed(2)}`;
      }
      
      console.log('✅ Informações extraídas dos dados estruturados:', info);
      return info;
    }
      
      // Fallback: extrair da descrição (pedidos antigos)
      // Extrair cliente - versões mais flexíveis da regex
      let clienteMatch = descricao.match(/Cliente:\s*([^I]+?)(?:\s+Itens?:)/i);
      if (!clienteMatch) {
        clienteMatch = descricao.match(/Cliente:\s*([^I]+?)(?:\s+Item)/i);
      }
      if (!clienteMatch) {
        clienteMatch = descricao.match(/Cliente:\s*(.+?)(?:\s+Itens)/i);
      }
      if (!clienteMatch) {
        // Tentar extrair tudo após "Cliente:" até encontrar "Itens" ou similar
        clienteMatch = descricao.match(/Cliente:\s*(.+?)(?=\s+(?:Itens?|Total))/i);
      }
      
      if (clienteMatch) {
        info.cliente = clienteMatch[1].trim();
        console.log('👤 Cliente extraído:', info.cliente); // Debug
      } else {
        console.log('❌ Não foi possível extrair o cliente'); // Debug
      }
      
      // Extrair itens - mais flexível
      let itensMatch = descricao.match(/Itens?:\s*([^T]+?)(?:\s+Total:)/i);
      if (!itensMatch) {
        itensMatch = descricao.match(/Itens?:\s*(.+?)(?:\s+Total)/i);
      }
      
      if (itensMatch) {
        const itensStr = itensMatch[1].trim();
        info.itens = itensStr.split(', ').filter(item => item.trim());
        console.log('📦 Itens extraídos:', info.itens.length); // Debug
      }
      
      // Extrair total - mais flexível
      let totalMatch = descricao.match(/Total:\s*(R\$\s*[\d.,]+)/i);
      if (!totalMatch) {
        totalMatch = descricao.match(/Total:\s*([\d.,]+)/i);
      }
      
      if (totalMatch) {
        info.total = totalMatch[1].includes('R$') ? totalMatch[1] : `R$ ${totalMatch[1]}`;
        console.log('💰 Total extraído:', info.total); // Debug
      }
      
      return info;
    }

    // Função para formatar data

    // Ordenar pedidos do ID mais alto para o mais baixo
    pedidos.sort((a, b) => parseInt(b.id) - parseInt(a.id));

    let html = '<div class="pedidos-grid">';
    for (const pedido of pedidos) {
      // Debug temporário para pedidos da distribuição
      if (pedido.empresa === 'distribuicao') {
        console.log('🔍 === PEDIDO DISTRIBUIÇÃO DEBUG ===');
        console.log('ID:', pedido.id);
        console.log('Empresa:', pedido.empresa);
        console.log('Descrição:', pedido.descricao);
        console.log('Dados (raw):', pedido.dados);
        console.log('Tipo dos dados:', typeof pedido.dados);
        console.log('Dados tem cliente?', !!pedido.dados?.cliente);
        console.log('Dados tem itens?', !!pedido.dados?.itens);
        console.log('Dados tem total?', pedido.dados?.total !== undefined);
      }
      
      let info = extrairInfoPedido(pedido.descricao, pedido.dados);
      
      // Verificar se é um pedido B2B ou Distribuição
      let isB2B = false;
      let isDistribuicao = false;
      let clienteB2BInfo = null;
      
      // Verificar se é pedido B2B pelo campo empresa
      if (pedido.empresa && pedido.empresa.startsWith('b2b-')) {
        isB2B = true;
      }
      
      // Verificar se é pedido Distribuição pelo campo empresa
      if (pedido.empresa && pedido.empresa === 'distribuicao') {
        isDistribuicao = true;
      }
      
      if (pedido.dados) {
        try {
          const dados = typeof pedido.dados === 'string' ? JSON.parse(pedido.dados) : pedido.dados;
          
          // Verificar se é pedido B2B pelos dados também
          if (dados.origem && dados.origem.includes('B2B')) {
            isB2B = true;
            clienteB2BInfo = dados.clienteInfo;
            
            // Para pedidos B2B, usar as informações do cliente B2B
            if (clienteB2BInfo && clienteB2BInfo.razao) {
              info.cliente = clienteB2BInfo.razao;
            }
          }
          
          // Verificar se é pedido Distribuição pelos dados
          if (dados.origem && dados.origem.includes('Loja Distribuição')) {
            isDistribuicao = true;
            
            // Para pedidos Distribuição, usar as informações do cliente
            if (dados.cliente && dados.cliente.razao) {
              info.cliente = dados.cliente.razao;
            }
          }
          
          // Se não conseguiu extrair o cliente da descrição, tentar dos dados estruturados
          if (info.cliente === 'N/A') {
            if (dados.cliente && dados.cliente.nome) {
              info.cliente = dados.cliente.nome;
              console.log('👤 Cliente extraído dos dados estruturados:', info.cliente);
            } else if (dados.cliente && typeof dados.cliente === 'string') {
              info.cliente = dados.cliente;
              console.log('👤 Cliente extraído dos dados (string):', info.cliente);
            }
          }
        } catch (e) {
          console.log('❌ Erro ao parsear dados do pedido:', e);
        }
      }
      
      const dataFormatada = formatarData(pedido.data_pedido);
      
      html += `
        <div class="pedido-card-modern ${isB2B ? 'pedido-b2b' : ''} ${isDistribuicao ? 'pedido-distribuicao' : ''}" data-pedido-id="${pedido.id}">
          <div class="pedido-header">
            <div class="pedido-id-badge">
              <span class="id-label">Pedido</span>
              <span class="id-number">#${pedido.id}</span>
            </div>
            <div class="pedido-badges">
              <div class="pedido-empresa-badge">
                <span class="empresa-name">${isDistribuicao ? 'DISTRIBUIÇÃO' : (isB2B ? pedido.empresa.toUpperCase() : pedido.empresa.toUpperCase())}</span>
              </div>
              ${isB2B ? '<div class="pedido-b2b-badge"><span class="b2b-label">🌐 B2B</span></div>' : ''}
              ${isDistribuicao ? '<div class="pedido-distribuicao-badge"><span class="distribuicao-label">🛒 LOJA</span></div>' : ''}
            </div>
          </div>
          
          <div class="pedido-body">
            <div class="cliente-info">
              <div class="info-label">👤 Cliente</div>
              <div class="info-value cliente-name">${info.cliente}</div>
            </div>
            
            <div class="itens-info">
              <div class="info-label">📦 Itens (${info.itens.length})</div>
              <div class="itens-container">
                ${info.itens.slice(0, 6).map(item => `<span class="item-badge">${item}</span>`).join('')}
                ${info.itens.length > 6 ? `<span class="item-badge more">+${info.itens.length - 6} mais</span>` : ''}
              </div>
            </div>
            
            <div class="valor-info">
              <div class="info-label">💰 Valor Total</div>
              <div class="info-value valor-total">${info.total}</div>
            </div>
            
            <div class="data-info">
              <div class="info-label">📅 Data do Pedido</div>
              <div class="info-value data-pedido">${dataFormatada}</div>
            </div>
          </div>
          
          <div class="pedido-actions">
            <button class="btn-action btn-view" onclick="visualizarPDFPedido(${pedido.id})">
              👁️ Visualizar
            </button>
            <button class="btn-action btn-edit" onclick="editarPedido(${pedido.id})">
              ✏️ Editar
            </button>
            <button class="btn-action btn-delete" onclick="excluirPedido(${pedido.id})">
              🗑️ Excluir
            </button>
          </div>
        </div>
      `;
    }
    html += '</div>';
    lista.innerHTML = html;
    
    // Atualizar contador de resultados
    atualizarContadorResultados(pedidos.length);
  } catch (err) {
    lista.innerHTML = '<p>Erro ao carregar pedidos.</p>';
    todosPedidos = [];
    atualizarContadorResultados(0);
  }
}

// Função para filtrar pedidos
function filtrarPedidos(termoBusca) {
  if (!termoBusca || termoBusca.trim() === '') {
    // Se não há termo de busca, mostrar todos os pedidos
    renderizarPedidos(todosPedidos);
    return;
  }
  
  const termo = termoBusca.toLowerCase().trim();
  const pedidosFiltrados = todosPedidos.filter(pedido => {
    // Buscar por ID
    if (pedido.id.toString().includes(termo)) {
      return true;
    }
    
    // Buscar por empresa
    if (pedido.empresa && pedido.empresa.toLowerCase().includes(termo)) {
      return true;
    }
    
    // Buscar por descrição
    if (pedido.descricao && pedido.descricao.toLowerCase().includes(termo)) {
      return true;
    }
    
    // Buscar nos dados estruturados
    if (pedido.dados) {
      try {
        const dados = typeof pedido.dados === 'string' ? JSON.parse(pedido.dados) : pedido.dados;
        
        // Buscar por razão social/nome do cliente
        if (dados.cliente) {
          if (dados.cliente.razao && dados.cliente.razao.toLowerCase().includes(termo)) {
            return true;
          }
          if (dados.cliente.nome && dados.cliente.nome.toLowerCase().includes(termo)) {
            return true;
          }
          if (dados.cliente.cnpj && dados.cliente.cnpj.includes(termo)) {
            return true;
          }
        }
        
        // Buscar por observações
        if (dados.observacoes && dados.observacoes.toLowerCase().includes(termo)) {
          return true;
        }
      } catch (e) {
        console.log('Erro ao parsear dados do pedido para busca:', e);
      }
    }
    
    return false;
  });
  
  renderizarPedidos(pedidosFiltrados);
}

// Função para renderizar pedidos (extraída da função carregarPedidos)
function renderizarPedidos(pedidos) {
  const lista = document.getElementById('pedidos-lista');
  
  if (!Array.isArray(pedidos) || pedidos.length === 0) {
    lista.innerHTML = '<p>Nenhum pedido encontrado.</p>';
    atualizarContadorResultados(0);
    return;
  }
  
  // Função para extrair informações do pedido
  function extrairInfoPedido(descricao, dados) {
    console.log('📋 Descrição do pedido:', descricao); // Debug
    console.log('📋 Dados do pedido:', dados); // Debug
    
    const info = {
      cliente: 'N/A',
      itens: [],
      total: 'R$ 0,00'
    };
    
    // Parse dos dados se for string JSON
    let dadosParsed = dados;
    if (typeof dados === 'string') {
      try {
        dadosParsed = JSON.parse(dados);
        console.log('📋 Dados parseados:', dadosParsed);
      } catch (e) {
        console.log('❌ Erro ao parsear dados:', e);
        dadosParsed = null;
      }
    }
    
    // Se tem dados estruturados (pedidos B2B, Distribuição, etc), usar eles primeiro
    if (dadosParsed && dadosParsed.cliente) {
      info.cliente = dadosParsed.cliente.razao || dadosParsed.cliente.nome || 'N/A';
      
      if (dadosParsed.itens && Array.isArray(dadosParsed.itens)) {
        info.itens = dadosParsed.itens.map(item => {
          const ref = item.REFERENCIA || item.ref || item.REF || '';
          const qtd = item.quantidade || 0;
          const tam = item.tamanho || '';
          const cor = item.cor || '';
          
          let itemStr = `${ref} x${qtd}`;
          if (tam) itemStr += ` - T:${tam}`;
          if (cor) itemStr += ` - C:${cor}`;
          
          return itemStr;
        });
      }
      
      // Para pedidos da distribuição, o total está em dadosParsed.total
      if (dadosParsed.total !== undefined && dadosParsed.total !== null) {
        info.total = `R$ ${parseFloat(dadosParsed.total).toFixed(2)}`;
      }
      
      console.log('✅ Informações extraídas dos dados estruturados:', info);
      return info;
    }
    
    // Fallback: extrair da descrição (pedidos antigos)
    // Extrair cliente - versões mais flexíveis da regex
    let clienteMatch = descricao.match(/Cliente:\s*([^I]+?)(?:\s+Itens?:)/i);
    if (!clienteMatch) {
      clienteMatch = descricao.match(/Cliente:\s*([^I]+?)(?:\s+Item)/i);
    }
    if (!clienteMatch) {
      clienteMatch = descricao.match(/Cliente:\s*(.+?)(?:\s+Itens)/i);
    }
    if (!clienteMatch) {
      // Tentar extrair tudo após "Cliente:" até encontrar "Itens" ou similar
      clienteMatch = descricao.match(/Cliente:\s*(.+?)(?=\s+(?:Itens?|Total))/i);
    }
    
    if (clienteMatch) {
      info.cliente = clienteMatch[1].trim();
      console.log('👤 Cliente extraído:', info.cliente); // Debug
    } else {
      console.log('❌ Não foi possível extrair o cliente'); // Debug
    }
    
    // Extrair itens - mais flexível
    let itensMatch = descricao.match(/Itens?:\s*([^T]+?)(?:\s+Total:)/i);
    if (!itensMatch) {
      itensMatch = descricao.match(/Itens?:\s*(.+?)(?:\s+Total)/i);
    }
    
    if (itensMatch) {
      const itensStr = itensMatch[1].trim();
      info.itens = itensStr.split(', ').filter(item => item.trim());
      console.log('📦 Itens extraídos:', info.itens.length); // Debug
    }
    
    // Extrair total - mais flexível
    let totalMatch = descricao.match(/Total:\s*(R\$\s*[\d.,]+)/i);
    if (!totalMatch) {
      totalMatch = descricao.match(/Total:\s*([\d.,]+)/i);
    }
    
    if (totalMatch) {
      info.total = totalMatch[1].includes('R$') ? totalMatch[1] : `R$ ${totalMatch[1]}`;
      console.log('💰 Total extraído:', info.total); // Debug
    }
    
    return info;
  }

  // Função para formatar data

  // Ordenar pedidos do ID mais alto para o mais baixo
  pedidos.sort((a, b) => parseInt(b.id) - parseInt(a.id));

  let html = '<div class="pedidos-grid">';
  for (const pedido of pedidos) {
    // Debug temporário para pedidos da distribuição
    if (pedido.empresa === 'distribuicao') {
      console.log('🔍 === PEDIDO DISTRIBUIÇÃO DEBUG (renderizarPedidos) ===');
      console.log('ID:', pedido.id);
      console.log('Empresa:', pedido.empresa);
      console.log('Descrição:', pedido.descricao);
      console.log('Dados (raw):', pedido.dados);
      console.log('Tipo dos dados:', typeof pedido.dados);
    }
    
    let info = extrairInfoPedido(pedido.descricao, pedido.dados);
    
    // Verificar se é um pedido B2B ou Distribuição
    let isB2B = false;
    let isDistribuicao = false;
    let clienteB2BInfo = null;
    
    // Verificar se é pedido B2B pelo campo empresa
    if (pedido.empresa && pedido.empresa.startsWith('b2b-')) {
      isB2B = true;
    }
    
    // Verificar se é pedido Distribuição pelo campo empresa
    if (pedido.empresa && pedido.empresa === 'distribuicao') {
      isDistribuicao = true;
    }
    
    if (pedido.dados) {
      try {
        const dados = typeof pedido.dados === 'string' ? JSON.parse(pedido.dados) : pedido.dados;
        
        // Verificar se é pedido B2B pelos dados também
        if (dados.origem && dados.origem.includes('B2B')) {
          isB2B = true;
          clienteB2BInfo = dados.clienteInfo;
          
          // Para pedidos B2B, usar as informações do cliente B2B
          if (clienteB2BInfo && clienteB2BInfo.razao) {
            info.cliente = clienteB2BInfo.razao;
          }
        }
        
        // Verificar se é pedido Distribuição pelos dados
        if (dados.origem && dados.origem.includes('Loja Distribuição')) {
          isDistribuicao = true;
          
          // Para pedidos Distribuição, usar as informações do cliente
          if (dados.cliente && dados.cliente.razao) {
            info.cliente = dados.cliente.razao;
          }
        }
        
        // Se não conseguiu extrair o cliente da descrição, tentar dos dados estruturados
        if (info.cliente === 'N/A') {
          if (dados.cliente && dados.cliente.nome) {
            info.cliente = dados.cliente.nome;
            console.log('👤 Cliente extraído dos dados estruturados:', info.cliente);
          } else if (dados.cliente && typeof dados.cliente === 'string') {
            info.cliente = dados.cliente;
            console.log('👤 Cliente extraído dos dados (string):', info.cliente);
          }
        }
      } catch (e) {
        console.log('❌ Erro ao parsear dados do pedido:', e);
      }
    }
    
    const dataFormatada = formatarData(pedido.data_pedido);
    
    html += `
      <div class="pedido-card-modern ${isB2B ? 'pedido-b2b' : ''} ${isDistribuicao ? 'pedido-distribuicao' : ''}">
        <div class="pedido-header">
          <div class="pedido-id-badge">
            <span class="id-label">Pedido</span>
            <span class="id-number">#${pedido.id}</span>
          </div>
          <div class="pedido-badges">
            <div class="pedido-empresa-badge">
              <span class="empresa-name">${isDistribuicao ? 'DISTRIBUIÇÃO' : (isB2B ? pedido.empresa.toUpperCase() : pedido.empresa.toUpperCase())}</span>
            </div>
            ${isB2B ? '<div class="pedido-b2b-badge"><span class="b2b-label">🌐 B2B</span></div>' : ''}
            ${isDistribuicao ? '<div class="pedido-distribuicao-badge"><span class="distribuicao-label">🛒 LOJA</span></div>' : ''}
          </div>
        </div>
        
        <div class="pedido-body">
          <div class="cliente-info">
            <div class="info-label">👤 Cliente</div>
            <div class="info-value cliente-name">${info.cliente}</div>
          </div>
          
          <div class="itens-info">
            <div class="info-label">📦 Itens (${info.itens.length})</div>
            <div class="itens-container">
              ${info.itens.slice(0, 6).map(item => `<span class="item-badge">${item}</span>`).join('')}
              ${info.itens.length > 6 ? `<span class="item-badge more">+${info.itens.length - 6} mais</span>` : ''}
            </div>
          </div>
          
          <div class="valor-info">
            <div class="info-label">💰 Valor Total</div>
            <div class="info-value valor-total">${info.total}</div>
          </div>
          
          <div class="data-info">
            <div class="info-label">📅 Data do Pedido</div>
            <div class="info-value data-pedido">${dataFormatada}</div>
          </div>
        </div>
        
        <div class="pedido-actions">
          <button class="btn-action btn-view" onclick="visualizarPDFPedido(${pedido.id})">
            👁️ Visualizar
          </button>
          <button class="btn-action btn-edit" onclick="editarPedido(${pedido.id})">
            ✏️ Editar
          </button>
          <button class="btn-action btn-delete" onclick="excluirPedido(${pedido.id})">
            🗑️ Excluir
          </button>
        </div>
      </div>
    `;
  }
  html += '</div>';
  lista.innerHTML = html;
  
  // Atualizar contador de resultados
  atualizarContadorResultados(pedidos.length);
}

// Função para atualizar o contador de resultados
function atualizarContadorResultados(total) {
  const contador = document.getElementById('contador-resultados');
  if (contador) {
    if (total === 0) {
      contador.innerHTML = '❌ Nenhum pedido encontrado';
    } else if (total === 1) {
      contador.innerHTML = '✅ 1 pedido encontrado';
    } else {
      contador.innerHTML = `✅ ${total} pedidos encontrados`;
    }
  }
}

let pedidoEditando = null;

// Função para excluir pedido
window.excluirPedido = async function(id) {
  // Buscar informações do pedido para confirmação
  try {
    const resp = await fetch('/api/pedidos');
    const pedidos = await resp.json();
    const pedido = pedidos.find(p => p.id == id);
    
    if (!pedido) {
      alert('Pedido não encontrado.');
      return;
    }

    // Confirmar exclusão com detalhes do pedido
    const confirmacao = confirm(
      `🚨 ATENÇÃO: Deseja realmente excluir este pedido?\n\n` +
      `ID: ${pedido.id}\n` +
      `Empresa: ${pedido.empresa}\n` +
      `Descrição: ${pedido.descricao}\n\n` +
      `⚠️ Esta ação não pode ser desfeita!`
    );

    if (!confirmacao) {
      return;
    }

    // Mostrar loading
    const botaoExcluir = document.querySelector(`button[onclick="excluirPedido(${id})"]`);
    if (botaoExcluir) {
      botaoExcluir.disabled = true;
      botaoExcluir.innerHTML = '⏳ Excluindo...';
    }

    // Fazer requisição DELETE para a API
    const deleteResp = await fetch('/api/pedidos', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: parseInt(id) })
    });

    if (deleteResp.ok) {
      // Sucesso - mostrar notificação e recarregar lista
      if (window.advancedNotifications) {
        advancedNotifications.success(
          `Pedido #${id} excluído com sucesso!`,
          {
            title: 'Pedido Excluído',
            duration: 4000
          }
        );
      } else {
        alert('✅ Pedido excluído com sucesso!');
      }
      
      // Recarregar lista de pedidos
      await carregarPedidos();
      
      // Fechar painel de edição se estiver aberto
      const painelEdicao = document.getElementById('editar-pedido-card');
      if (painelEdicao && painelEdicao.style.display !== 'none') {
        painelEdicao.style.display = 'none';
      }
    } else {
      // Erro na exclusão
      const errorData = await deleteResp.json().catch(() => ({ message: 'Erro desconhecido' }));
      
      if (window.advancedNotifications) {
        advancedNotifications.error(
          errorData.message || 'Erro ao excluir pedido',
          {
            title: 'Erro na Exclusão',
            duration: 6000
          }
        );
      } else {
        alert(`❌ Erro ao excluir pedido: ${errorData.message || 'Erro desconhecido'}`);
      }
      
      // Restaurar botão
      if (botaoExcluir) {
        botaoExcluir.disabled = false;
        botaoExcluir.innerHTML = '🗑️ Excluir';
      }
    }
  } catch (error) {
    console.error('Erro ao excluir pedido:', error);
    
    if (window.advancedNotifications) {
      advancedNotifications.error(
        'Erro de conexão ao excluir pedido',
        {
          title: 'Erro de Conexão',
          duration: 6000
        }
      );
    } else {
      alert('❌ Erro de conexão ao excluir pedido');
    }
    
    // Restaurar botão
    const botaoExcluir = document.querySelector(`button[onclick="excluirPedido(${id})"]`);
    if (botaoExcluir) {
      botaoExcluir.disabled = false;
      botaoExcluir.innerHTML = '🗑️ Excluir';
    }
  }
};

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
        case 'b2b-pantaneiro5':
          paginaEmpresa = 'pantaneiro5.html';
          break;
        case 'pantaneiro7':
        case 'b2b-pantaneiro7':
          paginaEmpresa = 'pantaneiro7.html';
          break;
        case 'steitz':
        case 'b2b-steitz':
          paginaEmpresa = 'steitz.html';
          break;
        case 'bkb':
          paginaEmpresa = 'bkb.html';
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
    if (empresa === 'pantaneiro5' || empresa === 'b2b-pantaneiro5') {
      produtosUrl = '/prodpantaneiro5.html';
    } else if (empresa === 'pantaneiro7' || empresa === 'b2b-pantaneiro7') {
      produtosUrl = '/prodpantaneiro7.html';
    } else if (empresa === 'steitz' || empresa === 'b2b-steitz') {
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
    case 'pantaneiro5':
    case 'b2b-pantaneiro5': 
      return produtosPantaneiro5Basicos;
    case 'pantaneiro7':
    case 'b2b-pantaneiro7': 
      return produtosPantaneiro7Basicos;
    case 'steitz':
    case 'b2b-steitz': 
      return produtosSteitzCompletos;
    default: 
      return [...produtosPantaneiro5Basicos, ...produtosPantaneiro7Basicos, ...produtosSteitzCompletos];
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
  console.log('🚫 FUNÇÃO salvarAlteracoes() DESABILITADA - usando editor-pedido.js');
  return;
  
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
  // Parse dos dados se for string JSON
  let dadosParsed = pedido.dados;
  if (typeof pedido.dados === 'string') {
    try {
      dadosParsed = JSON.parse(pedido.dados);
    } catch (e) {
      console.log('❌ Erro ao parsear dados do pedido:', e);
      dadosParsed = {};
    }
  }
  
  const { cliente, itens, descontos, total } = dadosParsed;
  
  // Buscar transporte e prazo dos dados do pedido ou do cliente
  const transporte = dadosParsed.transporte || dadosParsed.cliente?.transporte || 'A combinar';
  const prazo = dadosParsed.prazo || dadosParsed.cliente?.prazo || 'A combinar';
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
  } else if (pedido.empresa === 'distribuicao') {
    tituloEmpresa = 'Pedido de Venda - Distribuição';
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
  } else if (pedido.empresa === 'distribuicao') {
    nomeArquivo = `G8 Pedido Distribuição - ${cliente?.razao?.replace(/[\s\/]/g, '_') || 'Cliente'} - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
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

// Função para gerar PDF de um pedido específico
window.gerarPDFPedido = async function(pedidoId) {
  try {
    // Buscar dados do pedido
    const resp = await fetch('/api/pedidos');
    const pedidos = await resp.json();
    const pedido = pedidos.find(p => p.id == pedidoId);
    
    if (!pedido) {
      alert('❌ Pedido não encontrado.');
      return;
    }

    // Extrair informações do pedido
    function extrairInfoPedido(descricao) {
      const info = {
        cliente: 'N/A',
        itens: [],
        total: 'R$ 0,00'
      };
      
      // Extrair cliente - versões mais flexíveis da regex
      let clienteMatch = descricao.match(/Cliente:\s*([^I]+?)(?:\s+Itens?:)/i);
      if (!clienteMatch) {
        clienteMatch = descricao.match(/Cliente:\s*([^I]+?)(?:\s+Item)/i);
      }
      if (!clienteMatch) {
        clienteMatch = descricao.match(/Cliente:\s*(.+?)(?:\s+Itens)/i);
      }
      if (!clienteMatch) {
        clienteMatch = descricao.match(/Cliente:\s*(.+?)(?=\s+(?:Itens?|Total))/i);
      }
      
      if (clienteMatch) {
        info.cliente = clienteMatch[1].trim();
      }
      
      // Extrair itens - mais flexível
      let itensMatch = descricao.match(/Itens?:\s*([^T]+?)(?:\s+Total:)/i);
      if (!itensMatch) {
        itensMatch = descricao.match(/Itens?:\s*(.+?)(?:\s+Total)/i);
      }
      
      if (itensMatch) {
        const itensStr = itensMatch[1].trim();
        info.itens = itensStr.split(', ').filter(item => item.trim());
      }
      
      // Extrair total - mais flexível
      let totalMatch = descricao.match(/Total:\s*(R\$\s*[\d.,]+)/i);
      if (!totalMatch) {
        totalMatch = descricao.match(/Total:\s*([\d.,]+)/i);
      }
      
      if (totalMatch) {
        info.total = totalMatch[1].includes('R$') ? totalMatch[1] : `R$ ${totalMatch[1]}`;
      }
      
      return info;
    }

    const info = extrairInfoPedido(pedido.descricao);
    const dataFormatada = formatarData(pedido.data_pedido);

    // Criar PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let currentY = 20;

    // Função para adicionar texto com quebra de linha
    function addWrappedText(text, x, y, maxWidth, fontSize = 10) {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return y + (lines.length * (fontSize * 0.4));
    }

    // Cabeçalho
    doc.setFontSize(20);
    doc.setTextColor(255, 0, 0); // Vermelho G8
    doc.text('G8 REPRESENTAÇÕES', pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 15;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`PEDIDO #${pedido.id}`, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 20;

    // Informações do pedido
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO PEDIDO:', margin, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${dataFormatada}`, margin, currentY);
    currentY += 6;
    doc.text(`Empresa: ${pedido.empresa.toUpperCase()}`, margin, currentY);
    currentY += 10;

    // Cliente
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE:', margin, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    currentY = addWrappedText(info.cliente, margin, currentY, pageWidth - (margin * 2), 10);
    currentY += 10;

    // Itens
    doc.setFont('helvetica', 'bold');
    doc.text(`ITENS (${info.itens.length}):`, margin, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    info.itens.forEach((item, index) => {
      if (currentY > 250) { // Quebra de página se necessário
        doc.addPage();
        currentY = 20;
      }
      doc.text(`${index + 1}. ${item}`, margin + 5, currentY);
      currentY += 6;
    });

    currentY += 10;

    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 0, 0); // Vermelho G8
    doc.text(`TOTAL: ${info.total}`, margin, currentY);

    // Rodapé
    const footerY = 280;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('G8 Representações - Sistema de Gestão de Pedidos', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, footerY + 4, { align: 'center' });

    // Salvar PDF
    doc.save(`Pedido_${pedido.id}_${pedido.empresa}.pdf`);

    // Notificação de sucesso
    if (window.advancedNotifications) {
      advancedNotifications.success(
        `PDF do Pedido #${pedido.id} gerado com sucesso!`,
        {
          title: 'PDF Gerado',
          duration: 4000
        }
      );
    } else {
      alert(`✅ PDF do Pedido #${pedido.id} gerado com sucesso!`);
    }

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    
    if (window.advancedNotifications) {
      advancedNotifications.error(
        'Erro ao gerar PDF do pedido',
        {
          title: 'Erro na Geração',
          duration: 6000
        }
      );
    } else {
      alert('❌ Erro ao gerar PDF do pedido');
    }
  }
};

// Função para visualizar PDF do pedido (100% igual ao PDF gerado nas empresas)
window.visualizarPDFPedido = async function(pedidoId) {
  try {
    // Buscar dados do pedido
    const resp = await fetch('/api/pedidos');
    const pedidos = await resp.json();
    const pedido = pedidos.find(p => p.id == pedidoId);
    
    if (!pedido) {
      alert('❌ Pedido não encontrado.');
      return;
    }

    // Usar a mesma função que gera PDF nas empresas
    gerarPDFPedidoEditado(pedido);
    return;

  } catch (error) {
    console.error('Erro ao visualizar PDF:', error);
    
    if (window.advancedNotifications) {
      advancedNotifications.error(
        'Erro ao gerar PDF para visualização',
        {
          title: 'Erro na Visualização',
          duration: 6000
        }
      );
    } else {
      alert('❌ Erro ao gerar PDF para visualização');
    }
  }
};

// Modal de edição para pedidos da distribuição
let modalEdicaoDistribuicao = null;
let pedidoEditandoDistribuicao = null;
let produtosDistribuicao = [];
let ultimoCampoDescontoAlterado = null; // 'percentual' ou 'valor'

// Inicializar modal de edição da distribuição
function inicializarModalEdicaoDistribuicao() {
  if (modalEdicaoDistribuicao) return;
  
  // Criar modal
  modalEdicaoDistribuicao = document.createElement('div');
  modalEdicaoDistribuicao.id = 'modal-edicao-distribuicao';
  modalEdicaoDistribuicao.className = 'modal-edicao';
  modalEdicaoDistribuicao.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>✏️ Editar Pedido da Distribuição</h2>
        <button class="btn-fechar" onclick="fecharModalEdicaoDistribuicao()">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="edicao-secao">
          <h3>📋 Informações do Pedido</h3>
          <div class="form-row">
            <div class="form-group">
              <label>ID do Pedido:</label>
              <input type="text" id="edicao-pedido-id" readonly>
            </div>
            <div class="form-group">
              <label>Data do Pedido:</label>
              <input type="text" id="edicao-pedido-data" readonly>
            </div>
          </div>
        </div>
        
        <div class="edicao-secao">
          <h3>👤 Dados do Cliente</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Razão Social:</label>
              <input type="text" id="edicao-cliente-razao" readonly>
            </div>
            <div class="form-group">
              <label>CNPJ:</label>
              <input type="text" id="edicao-cliente-cnpj" readonly>
            </div>
          </div>
        </div>
        
        <div class="edicao-secao">
          <h3>🛒 Produtos do Pedido</h3>
          <div class="produtos-edicao-container">
            <div id="produtos-edicao-lista">
              <!-- Produtos serão carregados aqui -->
            </div>
            <button class="btn-adicionar-produto" onclick="adicionarProdutoEdicao()">
              ➕ Adicionar Produto
            </button>
          </div>
        </div>
        
        <div class="edicao-secao">
          <h3>💰 Valores e Pagamento</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Subtotal:</label>
              <input type="number" id="edicao-subtotal" step="0.01" readonly>
            </div>
            <div class="form-group">
              <label>Desconto (%):</label>
              <input type="number" id="edicao-desconto-percentual" step="0.01" min="0" max="100" onchange="marcarCampoDesconto('percentual'); calcularTotalEdicao()">
            </div>
            <div class="form-group">
              <label>Desconto (R$):</label>
              <input type="number" id="edicao-desconto-valor" step="0.01" min="0" onchange="marcarCampoDesconto('valor'); calcularTotalEdicao()">
            </div>
            <div class="form-group">
              <label>Total:</label>
              <input type="number" id="edicao-total" step="0.01" readonly>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Forma de Pagamento:</label>
              <select id="edicao-forma-pagamento">
                <option value="vista">À Vista</option>
                <option value="prazo">A Prazo</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="edicao-secao">
          <h3>📝 Observações</h3>
          <div class="form-group">
            <label>Observações do Pedido:</label>
            <textarea id="edicao-observacoes" rows="3" placeholder="Digite observações adicionais..."></textarea>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn-cancelar" onclick="fecharModalEdicaoDistribuicao()">
          ❌ Cancelar
        </button>
        <button class="btn-salvar" onclick="salvarEdicaoDistribuicao()">
          💾 Salvar Alterações
        </button>
      </div>
    </div>
  `;
  
  // Adicionar estilos CSS
  const style = document.createElement('style');
  style.textContent = `
    .modal-edicao {
      display: none;
      position: fixed;
      z-index: 2000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
    }
    
    .modal-edicao.show {
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    }
    
    .modal-content {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 90%;
      max-height: 90%;
      width: 1000px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .modal-header {
      background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
      color: white;
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-header h2 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 700;
    }
    
    .btn-fechar {
      background: none;
      border: none;
      color: white;
      font-size: 2rem;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.3s ease;
    }
    
    .btn-fechar:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
    }
    
    .edicao-secao {
      margin-bottom: 24px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 12px;
      border: 1px solid #e9ecef;
    }
    
    .edicao-secao h3 {
      margin: 0 0 16px 0;
      color: #ff0000;
      font-size: 1.1rem;
      font-weight: 700;
    }
    
    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
    }
    
    .form-group label {
      font-weight: 600;
      margin-bottom: 6px;
      color: #333;
      font-size: 0.9rem;
    }
    
    .form-group input,
    .form-group select,
    .form-group textarea {
      padding: 10px 12px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 0.9rem;
      transition: all 0.3s ease;
    }
    
    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #ff0000;
      box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.1);
    }
    
    .form-group input[readonly] {
      background: #f8f9fa;
      color: #6c757d;
    }
    
    .produtos-edicao-container {
      background: white;
      border-radius: 8px;
      padding: 16px;
      border: 1px solid #e9ecef;
    }
    
    .produto-edicao-item {
      display: grid;
      grid-template-columns: 1fr 120px 100px 100px 80px 40px;
      gap: 12px;
      align-items: center;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 12px;
      border: 1px solid #e9ecef;
    }
    
    .produto-edicao-item select,
    .produto-edicao-item input {
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 0.85rem;
    }
    
    .btn-remover-produto {
      background: #dc3545;
      color: white;
      border: none;
      padding: 6px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    
    .btn-remover-produto:hover {
      background: #c82333;
    }
    
    .btn-adicionar-produto {
      width: 100%;
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      border: none;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    
    .btn-adicionar-produto:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }
    
    .modal-footer {
      padding: 20px 24px;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    
    .btn-cancelar,
    .btn-salvar {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .btn-cancelar {
      background: #6c757d;
      color: white;
    }
    
    .btn-cancelar:hover {
      background: #5a6268;
    }
    
    .btn-salvar {
      background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
      color: white;
    }
    
    .btn-salvar:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(modalEdicaoDistribuicao);
}

// Carregar produtos da distribuição
async function carregarProdutosDistribuicao() {
  if (produtosDistribuicao.length > 0) return;
  
  // Produtos da loja de distribuição (mesmos do distribuicao-carrinho.html)
  produtosDistribuicao = [
    // Conjuntos PVC
    {
      REFERENCIA: "2900",
      DESCRIÇÃO: "CONJUNTO PVC TORNADO COM GOLA E BOLSO",
      TAMANHOS: ["P", "M", "G", "GG", "EX"],
      TAMANHOS_ESPECIAIS: ["EX", "EXG", "2G", "3G"],
      PRECO: 85.00,
      PRECO_ESPECIAL: 97.50,
      CATEGORIA: "PVC",
      IMAGEM: "https://i.imgur.com/G5xYOB9.png"
    },
    {
      REFERENCIA: "2902",
      DESCRIÇÃO: "JAQUETA PVC TORNADO COM GOLA E BOLSO",
      TAMANHOS: ["P", "M", "G", "GG", "EX"],
      TAMANHOS_ESPECIAIS: ["EXG", "2G", "3G"],
      PRECO: 49.00,
      PRECO_ESPECIAL: 57.00,
      CATEGORIA: "PVC",
      IMAGEM: "https://i.imgur.com/bJUlUXo.png"
    },
    {
      REFERENCIA: "2904",
      DESCRIÇÃO: "CALÇA PVC TORNADO",
      TAMANHOS: ["P", "M", "G", "GG", "EX"],
      TAMANHOS_ESPECIAIS: ["EXG", "2G", "3G"],
      PRECO: 38.00,
      PRECO_ESPECIAL: 44.00,
      CATEGORIA: "PVC",
      IMAGEM: "https://i.imgur.com/aX66rhK.png"
    },
    {
      REFERENCIA: "3000",
      DESCRIÇÃO: "CONJUNTO PVC FEMININO COM GOLA - PRETO",
      TAMANHOS: ["P", "M", "G", "GG", "EX"],
      TAMANHOS_ESPECIAIS: ["EXG"],
      PRECO: 87.00,
      PRECO_ESPECIAL: 100.00,
      CATEGORIA: "Feminino",
      IMAGEM: "https://i.imgur.com/9NPau3y.png"
    },
    {
      REFERENCIA: "3000PT/RP",
      DESCRIÇÃO: "CONJUNTO PVC FEMININO COM GOLA - PRETO COM CORES",
      TAMANHOS: ["P", "M", "G", "GG", "EX"],
      TAMANHOS_ESPECIAIS: ["EXG"],
      PRECO: 91.00,
      PRECO_ESPECIAL: 105.00,
      CATEGORIA: "Feminino",
      IMAGEM: "https://i.imgur.com/HBFLazW.png"
    },
    {
      REFERENCIA: "2000",
      DESCRIÇÃO: "CONJUNTO PVC PREMIUM COM GOLA, BOLSO E REFLETIVO",
      TAMANHOS: ["P", "M", "G", "GG", "EX"],
      TAMANHOS_ESPECIAIS: ["EXG", "2G", "3G"],
      PRECO: 114.00,
      PRECO_ESPECIAL: 131.00,
      CATEGORIA: "Premium",
      IMAGEM: "https://i.imgur.com/4c2SWyG.png"
    },
    
    // Conjuntos Nylon
    {
      REFERENCIA: "1000",
      DESCRIÇÃO: "CONJUNTO NYLON C/GOLA",
      TAMANHOS: ["P", "M", "G", "GG", "EX"],
      TAMANHOS_ESPECIAIS: ["EXG"],
      PRECO: 156.00,
      PRECO_ESPECIAL: 180.00,
      CATEGORIA: "Nylon",
      IMAGEM: "https://i.imgur.com/8YzBKYU.png"
    },
    {
      REFERENCIA: "1002",
      DESCRIÇÃO: "JAQUELA DE NYLON C/GOLA",
      TAMANHOS: ["P", "M", "G", "GG", "EX"],
      TAMANHOS_ESPECIAIS: ["EXG"],
      PRECO: 92.00,
      PRECO_ESPECIAL: 105.00,
      CATEGORIA: "Nylon",
      IMAGEM: "https://i.imgur.com/XQnxANM.png"
    },
    {
      REFERENCIA: "1004",
      DESCRIÇÃO: "CALÇA NYLON",
      TAMANHOS: ["P", "M", "G", "GG", "EX"],
      TAMANHOS_ESPECIAIS: ["EXG"],
      PRECO: 59.00,
      PRECO_ESPECIAL: 68.00,
      CATEGORIA: "Nylon",
      IMAGEM: "https://i.imgur.com/O1Riu3k.png"
    },
    {
      REFERENCIA: "1100",
      DESCRIÇÃO: "CONJUNTO NYLON FEMININO COM GOLA",
      TAMANHOS: ["P", "M", "G", "GG", "EX"],
      TAMANHOS_ESPECIAIS: ["EXG"],
      PRECO: 151.00,
      PRECO_ESPECIAL: 174.00,
      CATEGORIA: "Feminino",
      IMAGEM: "https://i.imgur.com/17kE5JX.png"
    },
    {
      REFERENCIA: "1100PT/RP",
      DESCRIÇÃO: "CONJUNTO NYLON FEMININO COM GOLA ROSA",
      TAMANHOS: ["P", "M", "G", "GG", "EX"],
      TAMANHOS_ESPECIAIS: ["EXG"],
      PRECO: 156.00,
      PRECO_ESPECIAL: 180.00,
      CATEGORIA: "Feminino",
      IMAGEM: "https://i.imgur.com/W8NNt0V.png"
    },
    {
      REFERENCIA: "1200",
      DESCRIÇÃO: "CONJUNTO NYLON LUXO COM FORRO E GOLA",
      TAMANHOS: ["P", "M", "G", "GG", "EX"],
      TAMANHOS_ESPECIAIS: ["EXG"],
      PRECO: 184.00,
      PRECO_ESPECIAL: 212.00,
      CATEGORIA: "Luxo",
      IMAGEM: "https://i.imgur.com/PBe0ewa.png"
    },
    
    // Botas PVC
    {
      REFERENCIA: "360",
      DESCRIÇÃO: "BOTA DE PVC IMPERMEÁVEL - PRETA",
      TAMANHOS: ["35/36", "37/38", "39/40", "41/42", "43/44"],
      TAMANHOS_ESPECIAIS: [],
      PRECO: 84.00,
      PRECO_ESPECIAL: 84.00,
      CATEGORIA: "Calçados",
      IMAGEM: "https://i.imgur.com/rCySTtx.png"
    },
    {
      REFERENCIA: "360C/RS",
      DESCRIÇÃO: "BOTA DE PVC IMPERMEÁVEL - ROSA",
      TAMANHOS: ["35/36", "37/38", "39/40", "41/42", "43/44"],
      TAMANHOS_ESPECIAIS: [],
      PRECO: 92.00,
      PRECO_ESPECIAL: 92.00,
      CATEGORIA: "Calçados",
      IMAGEM: "https://i.imgur.com/zVkgVa8.png"
    },
    {
      REFERENCIA: "360C/AMF",
      DESCRIÇÃO: "BOTA DE PVC IMPERMEÁVEL - AMARELO",
      TAMANHOS: ["35/36", "37/38", "39/40", "41/42", "43/44"],
      TAMANHOS_ESPECIAIS: [],
      PRECO: 92.00,
      PRECO_ESPECIAL: 92.00,
      CATEGORIA: "Calçados",
      IMAGEM: "https://i.imgur.com/piGfHOW.png"
    },
    {
      REFERENCIA: "370",
      DESCRIÇÃO: "BOTA DE PVC IMPERMEÁVEL CANO MÉDIO",
      TAMANHOS: ["35/36", "37/38", "39/40", "41/42", "43/44", "45/46"],
      TAMANHOS_ESPECIAIS: [],
      PRECO: 91.00,
      PRECO_ESPECIAL: 91.00,
      CATEGORIA: "Calçados",
      IMAGEM: "https://i.imgur.com/bIOCG8I.png"
    },
    
    // Capas de Moto
    {
      REFERENCIA: "2410",
      DESCRIÇÃO: "CAPA DE MOTO PVC FORRADA COM FELTRO - P - ATÉ 125CC",
      TAMANHOS: ["P"],
      TAMANHOS_ESPECIAIS: [],
      PRECO: 117.00,
      PRECO_ESPECIAL: 117.00,
      CATEGORIA: "Motos",
      IMAGEM: "https://i.imgur.com/MQicg6i.png"
    },
    {
      REFERENCIA: "2411",
      DESCRIÇÃO: "CAPA DE MOTO PVC FORRADA COM FELTRO - M -125CC - 150CC",
      TAMANHOS: ["M"],
      TAMANHOS_ESPECIAIS: [],
      PRECO: 121.00,
      PRECO_ESPECIAL: 121.00,
      CATEGORIA: "Motos",
      IMAGEM: "https://i.imgur.com/MQicg6i.png"
    },
    {
      REFERENCIA: "2412",
      DESCRIÇÃO: "CAPA DE MOTO PVC FORRADA COM FELTRO - G - 250CC - 450CC",
      TAMANHOS: ["G"],
      TAMANHOS_ESPECIAIS: [],
      PRECO: 125.00,
      PRECO_ESPECIAL: 125.00,
      CATEGORIA: "Motos",
      IMAGEM: "https://i.imgur.com/MQicg6i.png"
    },
    {
      REFERENCIA: "2413",
      DESCRIÇÃO: "CAPA DE MOTO PVC FORRADA COM FELTRO - GG - 450CC - 500CC - 750CC",
      TAMANHOS: ["GG"],
      TAMANHOS_ESPECIAIS: [],
      PRECO: 132.00,
      PRECO_ESPECIAL: 132.00,
      CATEGORIA: "Motos",
      IMAGEM: "https://i.imgur.com/MQicg6i.png"
    },
    {
      REFERENCIA: "2414",
      DESCRIÇÃO: "CAPA DE MOTO PVC FORRADA COM FELTRO - EX - 750CC - 1200CC",
      TAMANHOS: ["EX"],
      TAMANHOS_ESPECIAIS: [],
      PRECO: 140.00,
      PRECO_ESPECIAL: 140.00,
      CATEGORIA: "Motos",
      IMAGEM: "https://i.imgur.com/MQicg6i.png"
    },
    {
      REFERENCIA: "2415",
      DESCRIÇÃO: "CAPA DE MOTO PVC FORRADA COM FELTRO - EXG - ACIMA 1200CC",
      TAMANHOS: ["EXG"],
      TAMANHOS_ESPECIAIS: [],
      PRECO: 170.00,
      PRECO_ESPECIAL: 170.00,
      CATEGORIA: "Motos",
      IMAGEM: "https://i.imgur.com/MQicg6i.png"
    }
  ];
}

// Função para editar pedido (modificada para suportar distribuição)
window.editarPedido = function(id) {
  fetch('/api/pedidos')
    .then(resp => resp.json())
    .then(pedidos => {
      const pedido = pedidos.find(p => p.id == id);
      if (!pedido) {
        alert('Pedido não encontrado.');
        return;
      }
      
      // Se for pedido da distribuição, usar modal específico
      if (pedido.empresa === 'distribuicao') {
        editarPedidoDistribuicao(pedido);
        return;
      }
      
      // Salvar dados do pedido no localStorage para edição
      localStorage.setItem('pedidoParaEdicao', JSON.stringify(pedido));
      
      // Redirecionar para a página da empresa
      let paginaEmpresa = '';
      switch(pedido.empresa) {
        case 'pantaneiro5':
        case 'b2b-pantaneiro5':
          paginaEmpresa = 'pantaneiro5.html';
          break;
        case 'pantaneiro7':
        case 'b2b-pantaneiro7':
          paginaEmpresa = 'pantaneiro7.html';
          break;
        case 'steitz':
        case 'b2b-steitz':
          paginaEmpresa = 'steitz.html';
          break;
        case 'bkb':
          paginaEmpresa = 'bkb.html';
          break;
        default:
          alert('Empresa não reconhecida.');
          return;
      }
      
      // Redirecionar para a página da empresa
      window.location.href = paginaEmpresa + '?modo=edicao&id=' + id;
    });
};



// Função para editar pedido da distribuição
async function editarPedidoDistribuicao(pedido) {
  try {
    // Inicializar modal se necessário
    inicializarModalEdicaoDistribuicao();
    await carregarProdutosDistribuicao();
    
    pedidoEditandoDistribuicao = pedido;
    
    // Parse dos dados do pedido
    let dados = {};
    try {
      dados = typeof pedido.dados === 'string' ? JSON.parse(pedido.dados) : pedido.dados;
    } catch (e) {
      console.error('Erro ao parsear dados do pedido:', e);
      alert('❌ Erro ao carregar dados do pedido.');
      return;
    }
    
    // Preencher informações básicas
    document.getElementById('edicao-pedido-id').value = pedido.id;
    document.getElementById('edicao-pedido-data').value = formatarData(pedido.data);
    document.getElementById('edicao-cliente-razao').value = dados.cliente?.razao || 'N/A';
    document.getElementById('edicao-cliente-cnpj').value = dados.cliente?.cnpj || 'N/A';
    document.getElementById('edicao-forma-pagamento').value = dados.formaPagamento || 'prazo';
    document.getElementById('edicao-observacoes').value = dados.observacoes || '';
    
    // Preencher produtos
    renderizarProdutosEdicao(dados.itens || []);
    
    // Calcular totais
    calcularTotalEdicao();
    
    // Mostrar modal
    modalEdicaoDistribuicao.classList.add('show');
    
  } catch (error) {
    console.error('Erro ao editar pedido da distribuição:', error);
    alert('❌ Erro ao carregar dados do pedido.');
  }
}

// Renderizar produtos na edição
function renderizarProdutosEdicao(itens) {
  const container = document.getElementById('produtos-edicao-lista');
  container.innerHTML = '';
  
  itens.forEach((item, index) => {
    const produtoDiv = document.createElement('div');
    produtoDiv.className = 'produto-edicao-item';
    produtoDiv.innerHTML = `
      <select onchange="atualizarProdutoEdicao(${index}, this.value)" data-index="${index}">
        <option value="">Selecione um produto</option>
        ${produtosDistribuicao.map(produto => 
          `<option value="${produto.REFERENCIA}" ${item.REFERENCIA === produto.REFERENCIA ? 'selected' : ''}>
            ${produto.REFERENCIA} - ${produto.DESCRIÇÃO}
          </option>`
        ).join('')}
      </select>
      <select onchange="atualizarTamanhoEdicao(${index}, this.value)" data-index="${index}">
        <option value="">Tamanho</option>
      </select>
      <input type="number" min="1" value="${item.quantidade || 1}" onchange="atualizarQuantidadeEdicao(${index}, this.value)" placeholder="Qtd">
      <input type="number" step="0.01" value="${item.preco || 0}" onchange="atualizarPrecoEdicao(${index}, this.value)" placeholder="Preço">
      <input type="number" step="0.01" value="${(item.preco * item.quantidade).toFixed(2)}" readonly placeholder="Total">
      <button class="btn-remover-produto" onclick="removerProdutoEdicao(${index})">🗑️</button>
    `;
    
    container.appendChild(produtoDiv);
    
    // Carregar tamanhos do produto selecionado
    if (item.REFERENCIA) {
      atualizarTamanhosEdicao(index, item.REFERENCIA, item.tamanho);
    }
  });
}

// Atualizar produto na edição
function atualizarProdutoEdicao(index, referencia) {
  const produto = produtosDistribuicao.find(p => p.REFERENCIA === referencia);
  if (!produto) return;
  
  const itemDiv = document.querySelector(`[data-index="${index}"]`).closest('.produto-edicao-item');
  const tamanhoSelect = itemDiv.querySelector('select[onchange*="atualizarTamanhoEdicao"]');
  const precoInput = itemDiv.querySelector('input[onchange*="atualizarPrecoEdicao"]');
  
  // Limpar tamanhos
  tamanhoSelect.innerHTML = '<option value="">Tamanho</option>';
  
  // Adicionar tamanhos normais
  produto.TAMANHOS.forEach(tamanho => {
    const option = document.createElement('option');
    option.value = tamanho;
    option.textContent = tamanho;
    tamanhoSelect.appendChild(option);
  });
  
  // Adicionar tamanhos especiais
  produto.TAMANHOS_ESPECIAIS.forEach(tamanho => {
    const option = document.createElement('option');
    option.value = tamanho;
    option.textContent = `${tamanho} (Especial)`;
    tamanhoSelect.appendChild(option);
  });
  
  // Definir preço padrão
  precoInput.value = produto.PRECO.toFixed(2);
  
  // Atualizar total
  calcularTotalEdicao();
}

// Atualizar tamanhos na edição
function atualizarTamanhosEdicao(index, referencia, tamanhoSelecionado) {
  const produto = produtosDistribuicao.find(p => p.REFERENCIA === referencia);
  if (!produto) return;
  
  const itemDiv = document.querySelector(`[data-index="${index}"]`).closest('.produto-edicao-item');
  const tamanhoSelect = itemDiv.querySelector('select[onchange*="atualizarTamanhoEdicao"]');
  const precoInput = itemDiv.querySelector('input[onchange*="atualizarPrecoEdicao"]');
  
  // Limpar tamanhos
  tamanhoSelect.innerHTML = '<option value="">Tamanho</option>';
  
  // Adicionar tamanhos normais
  produto.TAMANHOS.forEach(tamanho => {
    const option = document.createElement('option');
    option.value = tamanho;
    option.textContent = tamanho;
    if (tamanho === tamanhoSelecionado) option.selected = true;
    tamanhoSelect.appendChild(option);
  });
  
  // Adicionar tamanhos especiais
  produto.TAMANHOS_ESPECIAIS.forEach(tamanho => {
    const option = document.createElement('option');
    option.value = tamanho;
    option.textContent = `${tamanho} (Especial)`;
    if (tamanho === tamanhoSelecionado) option.selected = true;
    tamanhoSelect.appendChild(option);
  });
  
  // Definir preço baseado no tamanho
  if (tamanhoSelecionado && produto.TAMANHOS_ESPECIAIS.includes(tamanhoSelecionado)) {
    precoInput.value = produto.PRECO_ESPECIAL.toFixed(2);
  } else {
    precoInput.value = produto.PRECO.toFixed(2);
  }
}

// Atualizar tamanho na edição
function atualizarTamanhoEdicao(index, tamanho) {
  const itemDiv = document.querySelector(`[data-index="${index}"]`).closest('.produto-edicao-item');
  const produtoSelect = itemDiv.querySelector('select[onchange*="atualizarProdutoEdicao"]');
  const precoInput = itemDiv.querySelector('input[onchange*="atualizarPrecoEdicao"]');
  
  const referencia = produtoSelect.value;
  const produto = produtosDistribuicao.find(p => p.REFERENCIA === referencia);
  if (!produto) return;
  
  // Definir preço baseado no tamanho
  if (tamanho && produto.TAMANHOS_ESPECIAIS.includes(tamanho)) {
    precoInput.value = produto.PRECO_ESPECIAL.toFixed(2);
  } else {
    precoInput.value = produto.PRECO.toFixed(2);
  }
  
  calcularTotalEdicao();
}

// Atualizar quantidade na edição
function atualizarQuantidadeEdicao(index, quantidade) {
  calcularTotalEdicao();
}

// Atualizar preço na edição
function atualizarPrecoEdicao(index, preco) {
  calcularTotalEdicao();
}

// Remover produto da edição
function removerProdutoEdicao(index) {
  const container = document.getElementById('produtos-edicao-lista');
  const itemDiv = container.children[index];
  if (itemDiv) {
    itemDiv.remove();
    calcularTotalEdicao();
  }
}

// Adicionar produto na edição
function adicionarProdutoEdicao() {
  const container = document.getElementById('produtos-edicao-lista');
  const index = container.children.length;
  
  const produtoDiv = document.createElement('div');
  produtoDiv.className = 'produto-edicao-item';
  produtoDiv.innerHTML = `
    <select onchange="atualizarProdutoEdicao(${index}, this.value)" data-index="${index}">
      <option value="">Selecione um produto</option>
      ${produtosDistribuicao.map(produto => 
        `<option value="${produto.REFERENCIA}">
          ${produto.REFERENCIA} - ${produto.DESCRIÇÃO}
        </option>`
      ).join('')}
    </select>
    <select onchange="atualizarTamanhoEdicao(${index}, this.value)" data-index="${index}">
      <option value="">Tamanho</option>
    </select>
    <input type="number" min="1" value="1" onchange="atualizarQuantidadeEdicao(${index}, this.value)" placeholder="Qtd">
    <input type="number" step="0.01" value="0" onchange="atualizarPrecoEdicao(${index}, this.value)" placeholder="Preço">
    <input type="number" step="0.01" value="0" readonly placeholder="Total">
    <button class="btn-remover-produto" onclick="removerProdutoEdicao(${index})">🗑️</button>
  `;
  
  container.appendChild(produtoDiv);
}

// Marcar qual campo de desconto foi alterado por último
function marcarCampoDesconto(tipo) {
  ultimoCampoDescontoAlterado = tipo;
}

// Calcular total na edição
function calcularTotalEdicao() {
  const container = document.getElementById('produtos-edicao-lista');
  const itens = container.querySelectorAll('.produto-edicao-item');
  
  let subtotal = 0;
  
  itens.forEach(itemDiv => {
    const quantidade = parseFloat(itemDiv.querySelector('input[onchange*="atualizarQuantidadeEdicao"]').value) || 0;
    const preco = parseFloat(itemDiv.querySelector('input[onchange*="atualizarPrecoEdicao"]').value) || 0;
    const total = quantidade * preco;
    
    // Atualizar total do item
    const totalInput = itemDiv.querySelector('input[readonly]');
    totalInput.value = total.toFixed(2);
    
    subtotal += total;
  });
  
  // Atualizar subtotal
  document.getElementById('edicao-subtotal').value = subtotal.toFixed(2);
  
  // Calcular desconto baseado no último campo alterado
  const descontoPercentual = parseFloat(document.getElementById('edicao-desconto-percentual').value) || 0;
  const descontoValor = parseFloat(document.getElementById('edicao-desconto-valor').value) || 0;
  
  let descontoFinal = 0;
  
  // Se subtotal for 0, zerar ambos os campos
  if (subtotal === 0) {
    document.getElementById('edicao-desconto-percentual').value = '';
    document.getElementById('edicao-desconto-valor').value = '';
    document.getElementById('edicao-total').value = '0.00';
    return;
  }
  
  // Usar o último campo alterado como prioridade
  if (ultimoCampoDescontoAlterado === 'percentual' && descontoPercentual > 0) {
    // Calcular valor baseado no percentual
    descontoFinal = subtotal * (descontoPercentual / 100);
    document.getElementById('edicao-desconto-valor').value = descontoFinal.toFixed(2);
  } else if (ultimoCampoDescontoAlterado === 'valor' && descontoValor > 0) {
    // Calcular percentual baseado no valor
    descontoFinal = descontoValor;
    const percentualCalculado = (descontoValor / subtotal) * 100;
    document.getElementById('edicao-desconto-percentual').value = percentualCalculado.toFixed(2);
  } else if (descontoPercentual > 0) {
    // Fallback: usar percentual se valor não foi alterado
    descontoFinal = subtotal * (descontoPercentual / 100);
    document.getElementById('edicao-desconto-valor').value = descontoFinal.toFixed(2);
  } else if (descontoValor > 0) {
    // Fallback: usar valor se percentual não foi alterado
    descontoFinal = descontoValor;
    const percentualCalculado = (descontoValor / subtotal) * 100;
    document.getElementById('edicao-desconto-percentual').value = percentualCalculado.toFixed(2);
  }
  
  // Calcular total final
  const totalFinal = subtotal - descontoFinal;
  document.getElementById('edicao-total').value = totalFinal.toFixed(2);
}

// Fechar modal de edição da distribuição
function fecharModalEdicaoDistribuicao() {
  if (modalEdicaoDistribuicao) {
    modalEdicaoDistribuicao.classList.remove('show');
  }
  pedidoEditandoDistribuicao = null;
  ultimoCampoDescontoAlterado = null;
}

// Salvar edição da distribuição
async function salvarEdicaoDistribuicao() {
  try {
    if (!pedidoEditandoDistribuicao) {
      alert('❌ Nenhum pedido selecionado para edição.');
      return;
    }
    
    // Coletar dados do formulário
    const container = document.getElementById('produtos-edicao-lista');
    const itens = container.querySelectorAll('.produto-edicao-item');
    
    const produtosAtualizados = [];
    
    itens.forEach(itemDiv => {
      const produtoSelect = itemDiv.querySelector('select[onchange*="atualizarProdutoEdicao"]');
      const tamanhoSelect = itemDiv.querySelector('select[onchange*="atualizarTamanhoEdicao"]');
      const quantidadeInput = itemDiv.querySelector('input[onchange*="atualizarQuantidadeEdicao"]');
      const precoInput = itemDiv.querySelector('input[onchange*="atualizarPrecoEdicao"]');
      
      const referencia = produtoSelect.value;
      const tamanho = tamanhoSelect.value;
      const quantidade = parseInt(quantidadeInput.value) || 0;
      const preco = parseFloat(precoInput.value) || 0;
      
      if (referencia && tamanho && quantidade > 0 && preco > 0) {
        const produto = produtosDistribuicao.find(p => p.REFERENCIA === referencia);
        if (produto) {
          produtosAtualizados.push({
            REFERENCIA: referencia,
            DESCRIÇÃO: produto.DESCRIÇÃO,
            tamanho: tamanho,
            quantidade: quantidade,
            preco: preco,
            categoria: produto.CATEGORIA,
            imagem: produto.IMAGEM
          });
        }
      }
    });
    
    if (produtosAtualizados.length === 0) {
      alert('❌ Adicione pelo menos um produto ao pedido.');
      return;
    }
    
    // Calcular totais
    const subtotal = produtosAtualizados.reduce((total, item) => total + (item.preco * item.quantidade), 0);
    const desconto = parseFloat(document.getElementById('edicao-desconto-valor').value) || 0;
    const totalFinal = subtotal - desconto;
    const formaPagamento = document.getElementById('edicao-forma-pagamento').value;
    const observacoes = document.getElementById('edicao-observacoes').value;
    
    // Parse dos dados originais
    let dadosOriginais = {};
    try {
      dadosOriginais = typeof pedidoEditandoDistribuicao.dados === 'string' 
        ? JSON.parse(pedidoEditandoDistribuicao.dados) 
        : pedidoEditandoDistribuicao.dados;
    } catch (e) {
      console.error('Erro ao parsear dados originais:', e);
    }
    
    // Atualizar dados do pedido
    const dadosAtualizados = {
      ...dadosOriginais,
      itens: produtosAtualizados,
      subtotal: subtotal,
      desconto: desconto,
      total: totalFinal,
      formaPagamento: formaPagamento,
      observacoes: observacoes,
      dataAtualizacao: new Date().toISOString()
    };
    
    console.log('Dados que serão enviados para a API:', {
      id: pedidoEditandoDistribuicao.id,
      empresa: 'distribuicao',
      descricao: `Pedido Distribuição - ${produtosAtualizados.length} itens`,
      dados: dadosAtualizados
    });
    
    // Atualizar pedido na API
    const operationId = `edit_${pedidoEditandoDistribuicao.id}_${Date.now()}`;
    const response = await fetch(`/api/pedidos/${pedidoEditandoDistribuicao.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-operation-id': operationId
      },
      body: JSON.stringify({
        id: pedidoEditandoDistribuicao.id,
        empresa: 'distribuicao',
        descricao: `Pedido Distribuição - ${produtosAtualizados.length} itens`,
        dados: dadosAtualizados,
        operationId: operationId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Erro ao atualizar pedido: ${response.status} - ${errorText}`);
    }
    
    // Fechar modal
    fecharModalEdicaoDistribuicao();
    
    // Recarregar pedidos
    await carregarPedidos();
    
    // Mostrar sucesso
    if (window.advancedNotifications) {
      window.advancedNotifications.success('Pedido atualizado com sucesso!', {
        title: 'Sucesso',
        duration: 3000
      });
    } else {
      alert('✅ Pedido atualizado com sucesso!');
    }
    
  } catch (error) {
    console.error('Erro ao salvar edição:', error);
    alert('❌ Erro ao salvar alterações. Tente novamente.');
  }
} 