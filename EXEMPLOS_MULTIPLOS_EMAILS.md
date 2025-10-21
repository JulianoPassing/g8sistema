# 📮 Exemplos de Configuração com Múltiplos E-mails

## 🎯 Visão Geral

O sistema suporta **envio para múltiplos destinatários simultaneamente**. Todos os e-mails cadastrados receberão a notificação ao mesmo tempo quando um pedido novo for criado.

---

## 📝 Exemplos Práticos

### **Exemplo 1: Equipe Pequena**
```env
EMAIL_TO=gerente@empresa.com, vendedor@empresa.com
```
✅ 2 pessoas receberão as notificações

---

### **Exemplo 2: Time de Vendas Completo**
```env
EMAIL_TO=joao.vendas@empresa.com, maria.comercial@empresa.com, pedro.gerente@empresa.com, ana.diretora@empresa.com
```
✅ 4 pessoas receberão as notificações

---

### **Exemplo 3: Misturando Provedores**
```env
EMAIL_TO=gerente@gmail.com, vendedor@hotmail.com, comercial@outlook.com, diretoria@empresa.com.br
```
✅ Funciona com qualquer provedor de e-mail
✅ Gmail, Hotmail, Outlook, Yahoo, domínios próprios

---

### **Exemplo 4: Departamentos Diferentes**
```env
EMAIL_TO=vendas@empresa.com, financeiro@empresa.com, estoque@empresa.com, logistica@empresa.com
```
✅ Vários setores podem ser notificados ao mesmo tempo

---

### **Exemplo 5: Com Espaços (também funciona)**
```env
EMAIL_TO=email1@gmail.com, email2@hotmail.com, email3@outlook.com
```
ou
```env
EMAIL_TO=email1@gmail.com,email2@hotmail.com,email3@outlook.com
```
✅ Ambos os formatos funcionam (com ou sem espaços após a vírgula)

---

## 🚀 Como Configurar no Vercel

### **Passo 1: Acessar Dashboard**
1. Vá em: https://vercel.com/dashboard
2. Selecione o projeto **g8sistema**
3. Clique em **Settings** → **Environment Variables**

### **Passo 2: Configurar EMAIL_TO**
1. Clique em **"Add New"** ou edite a variável existente
2. Em **"Key"**, digite: `EMAIL_TO`
3. Em **"Value"**, cole seus e-mails separados por vírgula:
   ```
   joao@empresa.com, maria@empresa.com, pedro@empresa.com
   ```
4. Selecione: ✅ Production ✅ Preview ✅ Development
5. Clique em **"Save"**

### **Passo 3: Redeploy**
- Faça commit + push no GitHub (redeploy automático), **OU**
- Vá em **Deployments** → **Redeploy**

---

## ✅ Vantagens

| Recurso | Descrição |
|---------|-----------|
| 🚀 **Simultâneo** | Todos recebem ao mesmo tempo |
| 🎯 **Personalizado** | Cada um pode ter seu provedor de e-mail |
| 💰 **Gratuito** | Até 500 e-mails/dia (Gmail) |
| 🔒 **Seguro** | Usa senha de aplicativo do Gmail |
| 🎨 **Elegante** | Design profissional em HTML |

---

## ⚠️ Considerações Importantes

### **Limite de E-mails por Dia (Gmail Gratuito)**

O Gmail permite **500 e-mails/dia**. Se você configurar múltiplos destinatários, cada pedido consome 1 e-mail por destinatário.

**Cálculo:**
```
Limite diário = 500 e-mails ÷ número de destinatários

Exemplos:
- 1 destinatário  → até 500 pedidos/dia
- 2 destinatários → até 250 pedidos/dia
- 5 destinatários → até 100 pedidos/dia
- 10 destinatários → até 50 pedidos/dia
```

### **Se precisar de mais:**
- **SendGrid**: 100 e-mails/dia grátis (100.000/mês no plano pago)
- **Mailgun**: 5.000 e-mails/mês grátis
- **Amazon SES**: $0.10 por 1.000 e-mails

---

## 🧪 Testando

Após configurar múltiplos e-mails:

1. Crie um pedido de teste no sistema
2. Aguarde 10-30 segundos
3. **Verifique TODOS os e-mails** configurados
4. ⚠️ Lembre-se de olhar a pasta **SPAM** na primeira vez

---

## 🔧 Exemplos para Casos de Uso Específicos

### **Caso 1: Startup Pequena**
```env
# Fundador e vendedor
EMAIL_TO=fundador@startup.com, vendedor@startup.com
```

### **Caso 2: Empresa Média**
```env
# Gerente comercial, 2 vendedores, financeiro
EMAIL_TO=gerente.comercial@empresa.com, vendedor1@empresa.com, vendedor2@empresa.com, financeiro@empresa.com
```

### **Caso 3: Empresa Grande**
```env
# Vários departamentos
EMAIL_TO=vendas@empresa.com, comercial@empresa.com, backoffice@empresa.com, diretoria@empresa.com, ti@empresa.com
```

### **Caso 4: Home Office**
```env
# E-mails pessoais da equipe
EMAIL_TO=joao.silva@gmail.com, maria.santos@hotmail.com, pedro.costa@outlook.com
```

---

## 💡 Dicas Profissionais

### ✅ **Boas Práticas**
- Mantenha a lista atualizada (remova e-mails de ex-funcionários)
- Use e-mails corporativos quando possível
- Teste sempre após adicionar/remover destinatários

### ❌ **Evite**
- E-mails com erros de digitação
- Muitos destinatários sem necessidade (consome o limite do Gmail)
- E-mails pessoais para uso corporativo crítico

---

## 📊 Monitoramento

Para verificar se todos estão recebendo:

1. **Logs do Vercel**: Dashboard → Deployments → seu deploy → Functions
2. **Teste periódico**: Crie pedidos de teste mensalmente
3. **Feedback da equipe**: Peça confirmação de recebimento

---

## 🆘 Problemas Comuns

### ❌ **"Alguns e-mails não chegam"**
- Verifique se não há erros de digitação
- Confirme se todos os destinatários verificaram o SPAM
- Teste enviando para um e-mail por vez para identificar o problema

### ❌ **"Ultrapassei o limite do Gmail"**
- Reduza o número de destinatários, **OU**
- Migre para SendGrid ou Mailgun

### ❌ **"E-mails caem no spam"**
- Na primeira vez é normal
- Cada destinatário deve marcar como "Não é spam"
- Adicione o remetente aos contatos

---

## 📚 Mais Informações

- **Configuração Completa**: Leia `CONFIGURACAO_VERCEL.md`
- **Guia Rápido**: Veja `COMO_CONFIGURAR_EMAIL_VERCEL.txt`
- **Documentação Geral**: Consulte `NOTIFICACOES.md`

---

**Pronto!** Agora você sabe como configurar múltiplos destinatários para as notificações! 🎉

