# 🔐 Controle de Acesso B2B - Pantaneiro 5

## 📋 Como Funciona

Sistema **SUPER SIMPLES** para controlar acesso:
- **Pantaneiro 5**: Apenas clientes selecionados ⚡
- **Pantaneiro 7**: **SEMPRE LIBERADO** para todos (EXCETO se tiver Pantaneiro 5) ✅
- **Steitz**: **SEMPRE LIBERADO** para todos ✅

### 🔄 Regra Especial:
**Se o cliente tem acesso ao Pantaneiro 5, o Pantaneiro 7 NÃO aparece** (evita confusão)

## ⚙️ Como Configurar

### 1. Abra o arquivo `api/auth-b2b.js`

### 2. Localize a lista `clientesComPantaneiro5` (linha 13)

### 3. Adicione o CNPJ do cliente na lista

## 📝 Como Dar Acesso ao Pantaneiro 5

### **🎯 ÚNICO PASSO: Adicionar CNPJ na lista**
```javascript
const clientesComPantaneiro5 = [
  '14909309000103',  // Andre Luis (exemplo)
  '18786752000195',  // Jose Rodrigo (exemplo)
  '12345678000100',  // ⬅️ ADICIONE AQUI o novo cliente
];
```

### **✅ PRONTO! Pantaneiro 7 e Steitz sempre liberados**
- **Não precisa configurar** Pantaneiro 7
- **Não precisa configurar** Steitz  
- **Só adicione** CNPJs para Pantaneiro 5

## 🎯 Passo a Passo Detalhado

### **⚡ SUPER FÁCIL: Dar acesso ao Pantaneiro 5**

1. **Copie** o CNPJ do cliente: `14.909.309/0001-03`
2. **Remova** pontos, barras e hífens: `14909309000103`  
3. **Adicione** na lista:

```javascript
const clientesComPantaneiro5 = [
  '14909309000103',  // ⬅️ ADICIONE AQUI
  '18786752000195',  // Outros clientes...
];
```

### **🎉 PRONTO! Só isso!**
- **Pantaneiro 7**: Automaticamente liberado ✅
- **Steitz**: Automaticamente liberado ✅
- **Pantaneiro 5**: Agora liberado para este cliente ✅

## 🔄 Comportamento Automático

**TODOS os clientes** = Acesso ao **Pantaneiro 7 e Steitz**

- ✅ **Pantaneiro 7**: **SEMPRE** liberado (não precisa configurar)
- ✅ **Steitz**: **SEMPRE** liberado (não precisa configurar)
- ⚡ **Pantaneiro 5**: Só clientes da lista

### 🎯 Regra de Exclusão:
- **Cliente SEM Pantaneiro 5**: Vê Pantaneiro 7 + Steitz
- **Cliente COM Pantaneiro 5**: Vê APENAS Pantaneiro 5 + Steitz (Pantaneiro 7 fica oculto)

**Não tem complicação**: Pantaneiro 7 e Steitz são automáticos!

## 📱 Como o Cliente Vê

### **Cliente com acesso a 1 tabela:**
- Vê apenas 1 card na tela de seleção
- Clica e vai direto para a tabela

### **Cliente com acesso a 2+ tabelas:**
- Vê múltiplos cards
- Escolhe qual tabela quer usar

### **Cliente sem acesso:**
- Não vê nenhum card
- Mensagem: "Nenhuma empresa disponível"

## 🛠️ Gerenciamento Ultra Simples

### **✅ Dar acesso ao Pantaneiro 5:**
```javascript
const clientesComPantaneiro5 = [
  '14909309000103',
  '12345678000100',  // ⬅️ ADICIONE o novo CNPJ
];
```

### **❌ Remover acesso ao Pantaneiro 5:**
```javascript
const clientesComPantaneiro5 = [
  '14909309000103',
  // '12345678000100',  // ⬅️ COMENTE ou DELETE
];
```

### **🔄 Pantaneiro 7 e Steitz:**
- **Não precisa fazer nada!**
- **Sempre liberados automaticamente**

## ⚡ Exemplo Real

Para dar acesso ao **Pantaneiro 5** para alguns clientes:

```javascript
const clientesComPantaneiro5 = [
  '14909309000103',  // Andre Luis Krailink de Melo
  '33462113000168',  // Isabela Rosa
  // Adicione mais CNPJs conforme necessário
];
```

**Resultado:**
- **Andre Luis**: Pantaneiro 5 + Steitz (Pantaneiro 7 oculto) ✅
- **Isabela Rosa**: Pantaneiro 5 + Steitz (Pantaneiro 7 oculto) ✅
- **Jose Rodrigo**: Pantaneiro 7 + Steitz (sem Pantaneiro 5) ✅
- **Todos os outros**: Pantaneiro 7 + Steitz ✅

## 🔍 Como Testar

1. Configure um cliente
2. Faça login com o CNPJ dele
3. Veja quais empresas aparecem na tela
4. Teste o acesso às páginas

## 💡 Dicas

- **CNPJ sem formatação**: Sempre remova pontos, barras e hífens
- **Case sensitive**: Mantenha tudo minúsculo
- **Backup**: Faça backup antes de alterar
- **Teste sempre**: Teste após cada alteração

## 🚨 Importante

- **Reinicialização**: Não precisa reiniciar o servidor
- **Efeito imediato**: Mudanças aplicam no próximo login
- **Segurança**: Clientes não conseguem burlar as restrições
