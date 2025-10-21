# 🚀 Configuração de Notificações no Vercel

## 📧 Como Configurar E-mails no Vercel

### **Passo 1: Gerar Senha de Aplicativo do Gmail**

1. Acesse: https://myaccount.google.com/apppasswords
2. Faça login com sua conta Gmail
3. Clique em "Selecionar app" → "Outro (nome personalizado)"
4. Digite: **"Sistema G8 Vercel"**
5. Clique em **"Gerar"**
6. **COPIE** a senha de 16 dígitos que aparece
   - Exemplo: `abcd efgh ijkl mnop`
   - Guarde essa senha (você vai precisar no próximo passo)

---

### **Passo 2: Configurar Variáveis de Ambiente no Vercel**

#### **Opção A: Via Dashboard do Vercel (Recomendado)**

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto **g8sistema**
3. Clique em **"Settings"** (Configurações)
4. No menu lateral, clique em **"Environment Variables"**
5. Adicione as seguintes variáveis:

| Name | Value | Environment |
|------|-------|-------------|
| `EMAIL_USER` | `seuemail@gmail.com` | Production, Preview, Development |
| `EMAIL_PASS` | `abcd efgh ijkl mnop` | Production, Preview, Development |
| `EMAIL_TO` | `destinatario@gmail.com` | Production, Preview, Development |

**💡 MÚLTIPLOS DESTINATÁRIOS:**
Para enviar notificações para **vários e-mails ao mesmo tempo**, basta separar os e-mails por vírgula:

| Name | Value | Environment |
|------|-------|-------------|
| `EMAIL_TO` | `email1@gmail.com, email2@hotmail.com, email3@outlook.com` | Production, Preview, Development |

✅ **Todos os e-mails receberão a mesma notificação**
✅ **Pode misturar Gmail, Hotmail, Outlook, etc.**
✅ **Sem limite de destinatários** (mas respeite o limite de 500 e-mails/dia do Gmail)

**Como adicionar cada variável:**
- Clique em **"Add New"**
- Em **"Key"**: digite o nome (ex: `EMAIL_USER`)
- Em **"Value"**: digite o valor (ex: seu e-mail)
- Em **"Environment"**: selecione **todas** (Production, Preview, Development)
- Clique em **"Save"**

#### **Opção B: Via CLI do Vercel**

```bash
# Instalar Vercel CLI (se ainda não tiver)
npm i -g vercel

# Fazer login
vercel login

# Adicionar variáveis de ambiente
vercel env add EMAIL_USER
# Digite seu e-mail quando solicitado
# Selecione: Production, Preview, Development

vercel env add EMAIL_PASS
# Cole a senha de aplicativo do Gmail
# Selecione: Production, Preview, Development

vercel env add EMAIL_TO
# Digite o(s) e-mail(s) que receberá(ão) as notificações
# Para múltiplos: email1@gmail.com, email2@hotmail.com
# Selecione: Production, Preview, Development
```

---

### **Passo 3: Fazer Redeploy**

Após adicionar as variáveis, é necessário fazer um novo deploy:

#### **Opção A: Trigger automático (recomendado)**
- Faça um commit e push no GitHub
- O Vercel fará o deploy automaticamente

#### **Opção B: Manual pelo Dashboard**
1. Vá em **"Deployments"**
2. Clique nos **"..."** do último deployment
3. Clique em **"Redeploy"**

#### **Opção C: Via CLI**
```bash
vercel --prod
```

---

## ✅ Verificar se Funcionou

### **1. Verificar Variáveis**
No dashboard do Vercel → Settings → Environment Variables, você deve ver:
- ✅ `EMAIL_USER` (valor oculto)
- ✅ `EMAIL_PASS` (valor oculto)
- ✅ `EMAIL_TO` (valor oculto)

### **2. Testar Criando um Pedido**
1. Acesse seu sistema no Vercel
2. Crie um novo pedido (normal ou B2B)
3. Aguarde alguns segundos
4. **Verifique seu e-mail** (pode ir para spam na primeira vez)

### **3. Verificar Logs**
Se não receber o e-mail, verifique os logs:
1. Dashboard Vercel → seu projeto
2. Clique em **"Deployments"**
3. Clique no deployment mais recente
4. Clique em **"Functions"**
5. Procure por logs de erro relacionados a e-mail

---

## 🔧 Solução de Problemas no Vercel

### ❌ "E-mail não configurado"

**Causa**: Variáveis não foram definidas ou não foram carregadas após redeploy

**Solução**:
1. Verifique se as variáveis estão no Dashboard → Settings → Environment Variables
2. Confirme que selecionou **"Production"** ao adicionar as variáveis
3. Faça um **redeploy**
4. Aguarde o deploy completar (pode levar 1-2 minutos)

### ❌ "Invalid login" nos logs

**Causa**: Senha de aplicativo incorreta

**Solução**:
1. Gere uma **nova** senha de aplicativo no Gmail
2. **Delete** a variável `EMAIL_PASS` antiga no Vercel
3. Adicione novamente com a nova senha
4. Faça **redeploy**

### ❌ E-mail não chega

**Possíveis causas**:
1. **Está no spam** - Verifique a pasta de spam/lixo eletrônico
2. **E-mail incorreto** - Verifique o valor de `EMAIL_TO`
3. **Tempo de cold start** - A primeira requisição pode demorar mais

**Solução**:
- Aguarde 30-60 segundos após criar o pedido
- Verifique todas as pastas do e-mail (spam, promoções, etc.)
- Verifique os logs do Vercel para erros

### ❌ Timeout ao enviar e-mail

**Causa**: Vercel tem limite de 10 segundos para Serverless Functions no plano gratuito

**Solução**: O código já está otimizado para não bloquear a resposta
- O e-mail é enviado de forma assíncrona
- Mesmo se der timeout, o pedido é salvo
- O e-mail é enviado em background

---

## 📋 Checklist de Configuração

- [ ] Senha de aplicativo do Gmail gerada
- [ ] Variável `EMAIL_USER` adicionada no Vercel
- [ ] Variável `EMAIL_PASS` adicionada no Vercel
- [ ] Variável `EMAIL_TO` adicionada no Vercel
- [ ] Todas as variáveis configuradas para **Production**
- [ ] Redeploy realizado
- [ ] Deploy completado com sucesso
- [ ] Teste de pedido realizado
- [ ] E-mail recebido (verificar spam)

---

## 🔒 Segurança

✅ **Variáveis de ambiente no Vercel são seguras**
- Não aparecem nos logs
- Não são expostas no cliente
- São criptografadas

✅ **Senha de aplicativo protege sua conta**
- Não use sua senha normal do Gmail
- Se vazar, basta revogar a senha de aplicativo
- Sua senha real continua segura

---

## 💡 Dicas Importantes

1. **Arquivo .env**: No Vercel, o arquivo `.env` local não é usado. As variáveis devem ser configuradas no dashboard.

2. **Ambientes**: Configure para todos os ambientes (Production, Preview, Development) para funcionar em todos os deploys.

3. **Redeploy**: Sempre faça redeploy após adicionar/alterar variáveis de ambiente.

4. **Cold Start**: A primeira requisição pode ser mais lenta (5-10 segundos). É normal no Vercel.

5. **Limites**: 
   - Gmail: 500 e-mails/dia (gratuito)
   - Vercel: 10 segundos timeout por função (plano gratuito)

---

## 📊 Monitoramento

### Ver logs em tempo real:
```bash
vercel logs --follow
```

### Ver logs de uma função específica:
Dashboard → Deployments → [seu deploy] → Functions → pedidos.js

---

## 🆘 Ainda com problemas?

Se após seguir todos os passos ainda não funcionar:

1. **Verifique os logs do Vercel** - geralmente o erro aparece lá
2. **Teste localmente** - rode `vercel dev` e teste localmente
3. **Verifique conectividade** - o Vercel pode ter restrições de rede em algumas regiões

---

## 🎯 Resumo Rápido

```bash
# 1. Gerar senha de aplicativo
# https://myaccount.google.com/apppasswords

# 2. Adicionar no Vercel Dashboard:
EMAIL_USER=seuemail@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx
EMAIL_TO=destinatario@gmail.com

# 3. Fazer redeploy (commit + push ou manual)

# 4. Testar criando um pedido

# 5. Verificar e-mail (incluindo spam)
```

---

Pronto! Agora seu sistema no Vercel vai enviar notificações por e-mail automaticamente! 🎉

