// Sistema de edição de pedidos
(function() {
  'use strict';

  // Verificar se está no modo edição
  const urlParams = new URLSearchParams(window.location.search);
  const modoEdicao = urlParams.get('modo') === 'edicao';
  const pedidoId = urlParams.get('id');

  if (modoEdicao && pedidoId) {
    // Aguardar o carregamento da página
    document.addEventListener('DOMContentLoaded', function() {
      iniciarModoEdicao();
    });
  }

  function iniciarModoEdicao() {
    try {
      // Recuperar dados do pedido do localStorage
      const pedidoData = localStorage.getItem('pedidoParaEdicao');
      if (!pedidoData) {
        alert('Dados do pedido não encontrados. Redirecionando...');
        window.location.href = 'pedidos.html';
        return;
      }

      const pedido = JSON.parse(pedidoData);
      
      // Mostrar indicador de modo edição
      mostrarIndicadorEdicao(pedido);
      
      // Carregar dados do cliente
      carregarDadosCliente(pedido);
      
      // Carregar itens do pedido
      carregarItensPedido(pedido);
      
      // Modificar botão de finalizar pedido
      modificarBotaoFinalizarPedido(pedido);
      
    } catch (error) {
      console.error('Erro ao iniciar modo edição:', error);
      alert('Erro ao carregar dados do pedido. Redirecionando...');
      window.location.href = 'pedidos.html';
    }
  }

  function mostrarIndicadorEdicao(pedido) {
    // Criar banner de modo edição
    const banner = document.createElement('div');
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 12px 20px;
      text-align: center;
      font-weight: 600;
      font-size: 1rem;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-bottom: 3px solid #b45309;
    `;
    
    banner.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto;">
        <div>
          ✏️ <strong>MODO EDIÇÃO</strong> - Pedido #${pedido.id} | 
          Cliente: ${pedido.dados?.cliente?.razao || 'N/A'}
        </div>
        <div style="display: flex; gap: 15px;">
          <button onclick="cancelarEdicao()" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;">
            ❌ Cancelar
          </button>
          <button onclick="salvarEdicao()" style="background: rgba(255,255,255,0.9); border: none; color: #d97706; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.2s;">
            💾 Salvar Alterações
          </button>
        </div>
      </div>
    `;
    
    document.body.insertBefore(banner, document.body.firstChild);
    
    // Ajustar padding do body para não sobrepor o banner
    document.body.style.paddingTop = '70px';
    
    // Adicionar estilo hover aos botões
    const botoes = banner.querySelectorAll('button');
    botoes.forEach(botao => {
      botao.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-1px)';
        this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
      });
      botao.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
        this.style.boxShadow = 'none';
      });
    });
  }

  function carregarDadosCliente(pedido) {
    const dadosCliente = pedido.dados?.cliente || {};
    
    // Mapear campos do cliente
    const campos = {
      'razao': dadosCliente.razao,
      'cnpj': dadosCliente.cnpj,
      'ie': dadosCliente.ie,
      'endereco': dadosCliente.endereco,
      'bairro': dadosCliente.bairro,
      'cidade': dadosCliente.cidade,
      'estado': dadosCliente.estado,
      'cep': dadosCliente.cep,
      'email': dadosCliente.email,
      'telefone': dadosCliente.telefone,
      'transporte': pedido.dados?.transporte || dadosCliente.transporte,
      'prazo': pedido.dados?.prazo || dadosCliente.prazo,
      'obs': dadosCliente.obs
    };
    
    // Preencher campos
    Object.entries(campos).forEach(([campo, valor]) => {
      const input = document.getElementById(campo);
      if (input && valor) {
        input.value = valor;
      }
    });
    
    // Se tiver select de cliente, definir como manual
    const selectCliente = document.getElementById('cliente-selecionado');
    if (selectCliente) {
      selectCliente.value = 'novo';
    }
  }

  function carregarItensPedido(pedido) {
    const itens = pedido.dados?.itens || [];
    // Limpar itens atuais do pedido
    if (typeof window.pedidoItens !== 'undefined') {
      window.pedidoItens.length = 0;
    } else {
      window.pedidoItens = [];
    }
    // Adiciona todos os itens diretamente ao array, sem depender do DOM
    itens.forEach((item) => {
      window.pedidoItens.push({
        REFERENCIA: (item.REFERENCIA || item.REF || '').toString(),
        DESCRIÇÃO: (item.DESCRIÇÃO || item.MODELO || '').toString(),
        tamanho: item.tamanho || '',
        cor: item.cor || '',
        preco: typeof item.preco === 'number' ? item.preco : Number(item.preco) || 0,
        quantidade: item.quantidade || 1,
        descontoExtra: item.descontoExtra || 0
      });
    });
    // Atualiza a visualização do pedido
    if (typeof window.atualizarVisualizacaoPedido === 'function') {
      window.atualizarVisualizacaoPedido();
    }
    
    // Adicionar listeners para edição de quantidades
    setTimeout(() => {
      adicionarListenersQuantidade();
    }, 500);
    
    // Aplica descontos se existirem
    setTimeout(() => {
      if (pedido.dados?.descontos) {
        Object.entries(pedido.dados.descontos).forEach(([tipo, valor]) => {
          const input = document.getElementById(`desconto-${tipo}`);
          if (input) {
            input.value = valor;
            input.dispatchEvent(new Event('input'));
          }
        });
      }
    }, 1000);
  }

  function modificarBotaoFinalizarPedido(pedido) {
    // Procurar pelo botão de finalizar pedido
    const botaoFinalizar = document.getElementById('gerar-pedido-btn') || 
                           document.querySelector('button[onclick*="gerarPedido"]') ||
                           document.querySelector('button[onclick*="finalizarPedido"]');
    
    if (botaoFinalizar) {
      // Salvar função original
      const funcaoOriginal = botaoFinalizar.onclick;
      
      // Modificar texto e função
      botaoFinalizar.textContent = '💾 Salvar Alterações do Pedido';
      botaoFinalizar.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      
      // Substituir função onclick
      botaoFinalizar.onclick = function() {
        salvarEdicaoPedido(pedido);
      };
    }
  }

  // Função para salvar edição do pedido
  window.salvarEdicaoPedido = function(pedidoOriginal) {
    // Coletar dados atuais do formulário
    const dadosAtualizados = coletarDadosFormulario();
    
    // Manter ID original e empresa
    dadosAtualizados.id = pedidoOriginal.id;
    dadosAtualizados.empresa = pedidoOriginal.empresa || null;
    
    // Gerar descrição no formato padrão do sistema
    const clienteNome = dadosAtualizados.dados?.cliente?.razao || 'Cliente';
    const itensDescricao = dadosAtualizados.dados?.itens?.map(item => 
      (item.REFERENCIA || item.REF || 'Item') + ' x' + (item.quantidade || 1)
    ).join(', ') || 'Sem itens';
    const total = dadosAtualizados.dados?.total || 0;
    
    dadosAtualizados.descricao = `Cliente: ${clienteNome} Itens: ${itensDescricao} Total: R$ ${total.toFixed(2)}`;
    
    // Salvar no servidor
    fetch('/api/pedidos', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dadosAtualizados)
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        return response.json().then(errorData => {
          throw new Error(errorData.error || 'Erro desconhecido');
        });
      }
    })
    .then(result => {
      if (result.success) {
        // Limpar localStorage
        localStorage.removeItem('pedidoParaEdicao');
        
        // Redirecionar sem mostrar mensagem (evitar duplicação)
        window.location.href = 'pedidos.html';
      } else {
        alert('❌ Erro ao salvar pedido: ' + (result.message || 'Erro desconhecido'));
      }
    })
    .catch(error => {
      console.error('Erro ao salvar pedido:', error);
      alert('❌ Erro ao salvar pedido: ' + error.message);
    });
  };

  // Função para coletar dados do formulário
  function coletarDadosFormulario() {
    const dados = {
      empresa: null,
      descricao: null,
      dados: {
        cliente: {},
        itens: [],
        descontos: {},
        total: 0
      }
    };
    
    // Coletar dados do cliente
    const camposCliente = ['razao', 'cnpj', 'ie', 'endereco', 'bairro', 'cidade', 'estado', 'cep', 'email', 'telefone', 'obs'];
    camposCliente.forEach(campo => {
      const input = document.getElementById(campo);
      if (input && input.value && input.value.trim()) {
        dados.dados.cliente[campo] = input.value.trim();
      } else {
        dados.dados.cliente[campo] = null;
      }
    });
    
    // Coletar transporte e prazo
    const transporte = document.getElementById('transporte');
    const prazo = document.getElementById('prazo');
    dados.dados.transporte = (transporte && transporte.value && transporte.value.trim()) ? transporte.value.trim() : null;
    dados.dados.prazo = (prazo && prazo.value && prazo.value.trim()) ? prazo.value.trim() : null;
    
    // Coletar itens do pedido
    if (typeof window.pedidoItens !== 'undefined' && window.pedidoItens.length > 0) {
      dados.dados.itens = window.pedidoItens.map(item => {
        // Estrutura adaptável para diferentes páginas
        if (item.produto) {
          return {
            REFERENCIA: item.produto.REFERENCIA || item.produto.REF,
            DESCRIÇÃO: item.produto.DESCRIÇÃO || item.produto.MODELO,
            REF: item.produto.REF || item.produto.REFERENCIA,
            MODELO: item.produto.MODELO || item.produto.DESCRIÇÃO,
            tamanho: item.tamanho || '',
            cor: item.cor || '',
            quantidade: item.quantidade || 1,
            preco: item.preco || item.produto.preco || item.produto.PRECO || 0,
            descontoExtra: item.descontoExtra || 0
          };
        } else {
          // Para itens que não têm a estrutura produto
          return {
            REFERENCIA: item.REFERENCIA || item.REF,
            DESCRIÇÃO: item.DESCRIÇÃO || item.MODELO,
            REF: item.REF || item.REFERENCIA,
            MODELO: item.MODELO || item.DESCRIÇÃO,
            tamanho: item.tamanho || '',
            cor: item.cor || '',
            quantidade: item.quantidade || 1,
            preco: item.preco || 0,
            descontoExtra: item.descontoExtra || 0
          };
        }
      });
    }
    
    // Coletar descontos
    const inputsDesconto = document.querySelectorAll('[id^="desconto-"], [id*="desconto"]');
    inputsDesconto.forEach(input => {
      let tipo = input.id.replace('desconto-', '').replace('-desconto', '');
      if (tipo.includes('extra')) {
        tipo = 'extra';
      }
      const valor = parseFloat(input.value) || 0;
      if (valor > 0) {
        dados.dados.descontos[tipo] = valor;
      }
    });
    
    // Calcular total
    let total = 0;
    dados.dados.itens.forEach(item => {
      let valorItem = (item.quantidade || 1) * (item.preco || 0);
      if (item.descontoExtra > 0) {
        valorItem *= (1 - item.descontoExtra / 100);
      }
      total += valorItem;
    });
    
    // Aplicar descontos gerais
    Object.values(dados.dados.descontos).forEach(desconto => {
      total *= (1 - desconto / 100);
    });
    
    dados.dados.total = total;
    
    return dados;
  }

  // Função para cancelar edição
  window.cancelarEdicao = function() {
    if (confirm('❌ Tem certeza que deseja cancelar a edição? As alterações não salvas serão perdidas.')) {
      localStorage.removeItem('pedidoParaEdicao');
      window.location.href = 'pedidos.html';
    }
  };

  // Função para salvar edição (botão do banner)
  window.salvarEdicao = function() {
    const pedidoData = localStorage.getItem('pedidoParaEdicao');
    if (pedidoData) {
      const pedido = JSON.parse(pedidoData);
      salvarEdicaoPedido(pedido);
    }
  };

  // Função para adicionar listeners de quantidade
  function adicionarListenersQuantidade() {
    // Procurar por inputs de quantidade na visualização do pedido
    const inputsQuantidade = document.querySelectorAll('input[type="number"][id*="quantidade"], input[type="number"][name*="quantidade"]');
    
    inputsQuantidade.forEach(input => {
      // Remover listeners existentes para evitar duplicação
      input.removeEventListener('input', atualizarQuantidadeItem);
      input.removeEventListener('change', validarQuantidadeEditor);
      
      // Adicionar novos listeners
      input.addEventListener('input', atualizarQuantidadeItem);
      input.addEventListener('change', validarQuantidadeEditor);
      
      // Adicionar classe para identificação
      input.classList.add('quantidade-editor');
    });
  }

  // Função para atualizar quantidade do item
  function atualizarQuantidadeItem(event) {
    const input = event.target;
    const valor = parseInt(input.value);
    
    // Validar valor mínimo
    if (valor < 1) {
      input.value = 1;
    }
    
    // Atualizar array de itens se possível
    if (typeof window.pedidoItens !== 'undefined') {
      // Tentar encontrar o índice do item baseado no input
      const row = input.closest('tr');
      if (row) {
        const rowIndex = Array.from(row.parentNode.children).indexOf(row);
        if (window.pedidoItens[rowIndex]) {
          window.pedidoItens[rowIndex].quantidade = parseInt(input.value) || 1;
        }
      }
    }
    
    // Atualizar visualização se a função existir
    if (typeof window.atualizarVisualizacaoPedido === 'function') {
      window.atualizarVisualizacaoPedido();
    }
  }

  // Função para validar quantidade no editor
  function validarQuantidadeEditor(event) {
    const input = event.target;
    const valor = parseInt(input.value);
    
    if (isNaN(valor) || valor < 1) {
      input.value = 1;
      input.style.borderColor = '#dc3545';
      input.style.backgroundColor = '#ffe6e6';
      
      // Mostrar notificação de erro
      mostrarNotificacaoEditor('⚠️ Quantidade deve ser um número maior que zero!', 'erro');
      
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

  // Função para mostrar notificações no editor
  function mostrarNotificacaoEditor(mensagem, tipo = 'info') {
    // Remover notificação existente
    const notificacaoExistente = document.getElementById('notificacao-editor-temp');
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
    notificacao.id = 'notificacao-editor-temp';
    notificacao.style.cssText = `
      position: fixed;
      top: 80px;
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

})(); 