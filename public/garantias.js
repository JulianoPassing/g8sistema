let todasGarantias = [];
let alertaPendentesDismissedParaContagem = null;

function formatarData(data) {
  if (!data) return 'N/A';
  try {
    return new Date(data).toLocaleDateString('pt-BR');
  } catch {
    return 'N/A';
  }
}

function nomeEmpresa(slug) {
  const s = String(slug || '').toLowerCase();
  if (s === 'pantaneiro5') return 'PANTANEIRO 5';
  if (s === 'pantaneiro7') return 'PANTANEIRO 7';
  return (slug || 'N/A').toUpperCase();
}

function isEnviado(g) {
  const v = g.enviado;
  return v === 1 || v === true || v === '1';
}

function parseDados(g) {
  let dados = g.dados;
  if (typeof dados === 'string') {
    try {
      dados = JSON.parse(dados);
    } catch {
      dados = {};
    }
  }
  return dados || {};
}

function extrairInfo(g) {
  const dados = parseDados(g);
  const cliente =
    (dados.cliente && (dados.cliente.razao || dados.cliente.nome)) ||
    dados.clienteNome ||
    'N/A';
  const cnpj = (dados.cliente && dados.cliente.cnpj) || '';
  const itens = Array.isArray(dados.itens) ? dados.itens : [];
  const labels = itens.map((item) => {
    const ref = item.REFERENCIA || item.ref || '';
    const desc = item.DESCRICAO || item.DESCRIÇÃO || item.descricao || '';
    const qtd = item.quantidade != null ? item.quantidade : item.qtd;
    const parts = [ref, desc].filter(Boolean);
    let label = parts.join(' — ') || 'Item';
    if (qtd != null && qtd !== '') label += ` (x${qtd})`;
    return label;
  });
  return { cliente, cnpj, itens: labels, qtdItens: itens.length, obs: dados.observacoes || '' };
}

function normalizarLista(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.garantias)) return raw.garantias;
  return [];
}

async function fetchGarantiasCompleto() {
  const limit = 400;
  let offset = 0;
  let total = Infinity;
  const todos = [];
  while (offset < total) {
    const resp = await fetch(`/api/garantias?limit=${limit}&offset=${offset}`);
    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      throw new Error(errBody.error || `Falha ao carregar garantias (HTTP ${resp.status})`);
    }
    const data = await resp.json();
    const lote = normalizarLista(data);
    todos.push(...lote);
    if (typeof data.total === 'number') total = data.total;
    else if (lote.length < limit) break;
    else total = offset + lote.length + 1;
    if (!lote.length) break;
    offset += limit;
  }
  return todos;
}

function atualizarAlertaPendentes() {
  const el = document.getElementById('alerta-garantias-pendentes');
  const msgEl = document.getElementById('alerta-pendentes-msg');
  if (!el || !msgEl) return;
  const n = todasGarantias.filter((g) => !isEnviado(g)).length;
  if (n === 0) {
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
    alertaPendentesDismissedParaContagem = null;
    return;
  }
  if (alertaPendentesDismissedParaContagem === n) {
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
    return;
  }
  msgEl.textContent =
    n === 1
      ? 'Existe 1 garantia ainda não enviada.'
      : `Existem ${n} garantias ainda não enviadas.`;
  el.style.display = 'block';
  el.setAttribute('aria-hidden', 'false');
}

function atualizarContador(total) {
  const contador = document.getElementById('contador-resultados');
  if (!contador) return;
  if (total === 0) contador.textContent = 'Nenhuma garantia encontrada';
  else if (total === 1) contador.textContent = '1 garantia encontrada';
  else contador.textContent = `${total} garantias encontradas`;
}

function filtrarGarantias() {
  const busca = (document.getElementById('busca-garantias')?.value || '').trim().toLowerCase();
  const filtroEmpresa = document.getElementById('filtro-empresa')?.value || 'todas';
  const filtroEnvio = document.getElementById('filtro-envio')?.value || 'todos';

  let lista = [...todasGarantias];

  if (filtroEmpresa !== 'todas') {
    lista = lista.filter((g) => String(g.empresa || '').toLowerCase() === filtroEmpresa);
  }
  if (filtroEnvio === 'enviado') lista = lista.filter(isEnviado);
  if (filtroEnvio === 'pendente') lista = lista.filter((g) => !isEnviado(g));

  if (busca) {
    lista = lista.filter((g) => {
      const info = extrairInfo(g);
      const blob = [
        g.id,
        g.empresa,
        g.descricao,
        info.cliente,
        info.cnpj,
        info.itens.join(' '),
        info.obs
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(busca);
    });
  }

  renderizarGarantias(lista);
  atualizarAlertaPendentes();
}

function renderizarGarantias(garantias) {
  const container = document.getElementById('garantias-lista');
  if (!container) return;

  garantias.sort((a, b) => parseInt(b.id, 10) - parseInt(a.id, 10));
  atualizarContador(garantias.length);

  if (!garantias.length) {
    container.innerHTML =
      '<div class="empty-state"><p>Nenhuma garantia encontrada.</p><p style="margin-top:12px;"><a class="btn-nova" href="garantia-form.html">➕ Nova garantia</a></p></div>';
    return;
  }

  let html = '<div class="garantias-grid">';
  for (const g of garantias) {
    const info = extrairInfo(g);
    const enviado = isEnviado(g);
    const badge = enviado
      ? '<div class="enviado-badge">ENVIADO</div>'
      : '<div class="pendente-badge">NÃO ENVIADO</div>';

    html += `
      <div class="garantia-card" data-id="${g.id}">
        <div class="garantia-header">
          <div>
            <div class="id-label">Garantia</div>
            <div class="id-number">#${g.id}</div>
          </div>
          <div class="garantia-badges">
            <div class="empresa-badge">${nomeEmpresa(g.empresa)}</div>
            ${badge}
          </div>
        </div>
        <div class="garantia-body">
          <div>
            <div class="info-label">Cliente</div>
            <div class="info-value">${escapeHtml(info.cliente)}</div>
          </div>
          <div>
            <div class="info-label">Itens (${info.qtdItens})</div>
            <div class="itens-container">
              ${info.itens
                .slice(0, 6)
                .map((item) => `<span class="item-badge">${escapeHtml(item)}</span>`)
                .join('')}
              ${info.itens.length > 6 ? `<span class="item-badge">+${info.itens.length - 6} mais</span>` : ''}
            </div>
          </div>
          <div>
            <div class="info-label">Data</div>
            <div class="info-value">${formatarData(g.data_garantia)}</div>
          </div>
        </div>
        <div class="garantia-actions">
          <button type="button" class="btn-action btn-toggle-envio" onclick="alternarEnvio(${g.id})">
            ${enviado ? '↩ Desmarcar envio' : '✓ Marcar ENVIADO'}
          </button>
          <button type="button" class="btn-action btn-edit" onclick="editarGarantia(${g.id})">✏️ Editar</button>
          <button type="button" class="btn-action btn-delete" onclick="excluirGarantia(${g.id})">🗑️ Excluir</button>
        </div>
      </div>
    `;
  }
  html += '</div>';
  container.innerHTML = html;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

window.alternarEnvio = async function (id) {
  const g = todasGarantias.find((x) => String(x.id) === String(id));
  if (!g) {
    alert('Garantia não encontrada.');
    return;
  }
  const novo = isEnviado(g) ? 0 : 1;
  try {
    const resp = await fetch('/api/garantias', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enviado: novo })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      alert(data.error || 'Não foi possível atualizar o status.');
      return;
    }
    g.enviado = novo;
    if (g.dados && typeof g.dados === 'object') g.dados.enviado = novo;
    filtrarGarantias();
  } catch (e) {
    console.error(e);
    alert('Erro de rede ao atualizar o status.');
  }
};

window.editarGarantia = function (id) {
  window.location.href = `garantia-form.html?id=${encodeURIComponent(id)}`;
};

window.excluirGarantia = async function (id) {
  if (!confirm(`Excluir a garantia #${id}?`)) return;
  try {
    const resp = await fetch('/api/garantias', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      alert(data.error || 'Não foi possível excluir.');
      return;
    }
    todasGarantias = todasGarantias.filter((g) => String(g.id) !== String(id));
    filtrarGarantias();
  } catch (e) {
    console.error(e);
    alert('Erro de rede ao excluir.');
  }
};

async function carregarGarantias() {
  const lista = document.getElementById('garantias-lista');
  if (lista) lista.innerHTML = '<div class="empty-state">Carregando garantias...</div>';
  try {
    todasGarantias = await fetchGarantiasCompleto();
    filtrarGarantias();
  } catch (e) {
    console.error(e);
    if (lista) {
      lista.innerHTML = `<div class="empty-state"><p>Erro ao carregar: ${escapeHtml(e.message)}</p></div>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const loggedInUser = sessionStorage.getItem('loggedInUser');
  if (!loggedInUser) {
    window.location.href = 'index.html';
    return;
  }
  const userName = loggedInUser.charAt(0).toUpperCase() + loggedInUser.slice(1);
  const userInfo = document.getElementById('user-info');
  if (userInfo) userInfo.textContent = `Bem-vindo(a), ${userName}!`;

  document.getElementById('logout-button')?.addEventListener('click', () => {
    if (confirm('Deseja sair do sistema?')) {
      sessionStorage.removeItem('loggedInUser');
      window.location.href = 'index.html';
    }
  });

  document.getElementById('busca-garantias')?.addEventListener('input', filtrarGarantias);
  document.getElementById('filtro-empresa')?.addEventListener('change', filtrarGarantias);
  document.getElementById('filtro-envio')?.addEventListener('change', filtrarGarantias);

  document.getElementById('alerta-pendentes-ver-filtro')?.addEventListener('click', () => {
    const sel = document.getElementById('filtro-envio');
    if (sel) {
      sel.value = 'pendente';
      filtrarGarantias();
    }
  });
  document.getElementById('alerta-pendentes-fechar')?.addEventListener('click', () => {
    const n = todasGarantias.filter((g) => !isEnviado(g)).length;
    alertaPendentesDismissedParaContagem = n;
    atualizarAlertaPendentes();
  });

  carregarGarantias();
});
