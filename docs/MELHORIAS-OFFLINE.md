# Melhorias Sistema Offline / Mobile

## ✅ Status: Implementado (Março 2026)

As melhorias abaixo foram implementadas:

---

## 🔴 Alta prioridade

### 1. Integrar notificações com `advancedNotifications`
**Problema:** O `offline-system.js` usa `showNotification()` própria (div simples), enquanto o resto do app usa `advancedNotifications`.

**Solução:** Usar `window.advancedNotifications` quando existir, mantendo fallback para o método atual.

---

### 2. Corrigir `updateOrderNumber`
**Problema:** Usa `companyOrders.length` como último número, mas o correto é o maior **ID** da empresa (ex.: último pedido 398 → próximo 399).

```javascript
// Atual (incorreto):
const lastNumber = companyOrders.length;
const newNumber = lastNumber + 1;

// Deveria ser:
const maxId = Math.max(...companyOrders.map(o => o.id || 0));
const newNumber = maxId + 1;
```

---

### 3. Painel de pedidos pendentes
**Problema:** Não há tela para o usuário ver quantos pedidos/edições estão na fila offline.

**Solução:** Exibir um indicador clicável (ex.: badge) que abre um mini-painel com:
- Quantidade de pedidos pendentes
- Resumo (cliente, valor)
- Botão "Tentar enviar agora"

---

## 🟡 Média prioridade

### 4. Background Sync API
**Problema:** O Service Worker registra o evento `sync`, mas `getPendingForms()` retorna `[]` e não usa o `offline-system`.

**Solução:** Integrar com `offline-system`:
- Ao salvar pedido offline, registrar: `navigator.serviceWorker.ready.then(reg => reg.sync.register('g8-pending-orders'))`
- No SW, no handler `sync`, chamar a lógica de envio (ou expor via mensagem para o `offline-system` processar)

---

### 5. Retry com backoff exponencial
**Problema:** Reenvio a cada 15s fixos pode sobrecarregar rede instável.

**Solução:** Aumentar intervalo após falhas: 15s → 30s → 60s → 2min (com limite máximo).

---

### 6. Feedback háptico no mobile
**Problema:** Falta feedback tátil ao salvar pedido offline.

**Solução:**
```javascript
if (navigator.vibrate) navigator.vibrate(50);
```

---

### 7. Persistir draft do formulário
**Problema:** Se o app fecha no meio de um pedido, o usuário perde tudo.

**Solução:** Salvar em `localStorage` (key por tela) a cada mudança relevante; ao abrir, perguntar: "Continuar pedido não finalizado?"

---

## 🟢 Baixa prioridade

### 8. Migrar para IndexedDB
**Problema:** `localStorage` tem limite (~5MB). Com muitos pedidos pendentes pode estourar.

**Solução:** Usar IndexedDB (ex.: via biblioteca `idb`) para armazenar pedidos e edições pendentes.

---

### 9. Verificação de duplicata nas edições offline
**Problema:** `tryToSendEdit` não verifica se a edição já foi aplicada antes de salvar offline (diferente de `tryToSendOrder`).

**Solução:** Antes de `saveEditOffline`, checar se o pedido ainda existe e se a edição ainda faz sentido.

---

### 10. Página offline mais rica
**Problema:** A página offline do SW é genérica.

**Solução:** Incluir:
- Lista de pedidos pendentes (se houver)
- Botão "Tentar reconectar"
- Instruções de uso offline

---

## 📱 Melhorias gerais do sistema

- **PWA:** Revisar `manifest.json` (ícones, cores, orientação).
- **Cache:** Considerar versão por build ou hash nos arquivos estáticos para atualização mais previsível.
- **Timeout:** `/api/health` com timeout de 10s é alto para mobile; considerar 5s.
- **Ordem de envio:** Manter ordem FIFO ao processar pedidos pendentes (já está sequencial).

---

## ✅ Recomendação inicial

Priorizar:

1. **Integrar `advancedNotifications`** – rápida e melhora UX  
2. **Corrigir `updateOrderNumber`** – evita numeração errada  
3. **Painel de pendentes** – usuário ganha transparência sobre o que está em fila

Posso implementar estas três primeiro. Quer que eu prossiga?
