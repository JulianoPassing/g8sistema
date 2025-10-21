# 📧 Sistema de Notificações por E-mail

## 📋 Descrição

Sistema automático de notificações que envia e-mails sempre que um novo pedido é cadastrado no sistema (tanto pedidos normais quanto B2B).

## ✨ Características

- ✅ **Gratuito**: Usa Gmail (até 500 e-mails/dia grátis)
- ✅ **Simples**: Configuração em 3 passos
- ✅ **Elegante**: E-mails com design profissional em HTML
- ✅ **Automático**: Dispara automaticamente sem intervenção
- ✅ **Não bloqueante**: Não afeta o tempo de resposta da API
- ✅ **Seguro**: Usa senha de aplicativo do Gmail

## 🚀 Configuração Rápida

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Gmail

#### 2.1. Gerar Senha de Aplicativo

1. Acesse: https://myaccount.google.com/apppasswords
2. Faça login com sua conta Gmail
3. Selecione "Outro (nome personalizado)"
4. Digite: "Sistema G8"
5. Clique em "Gerar"
6. **COPIE** a senha de 16 dígitos gerada (ex: `xxxx xxxx xxxx xxxx`)

#### 2.2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com:

```env
# E-mail que enviará as notificações
EMAIL_USER=seuemail@gmail.com

# Senha de aplicativo gerada no passo anterior
EMAIL_PASS=xxxx xxxx xxxx xxxx

# E-mail que receberá as notificações (pode ser o mesmo ou diferente)
EMAIL_TO=destinatario@gmail.com
```

**⚠️ IMPORTANTE:**
- **NÃO** use sua senha normal do Gmail
- Use APENAS a senha de aplicativo de 16 dígitos
- Nunca compartilhe ou commite o arquivo `.env`

### 3. Pronto! 🎉

Quando um novo pedido for cadastrado, você receberá automaticamente um e-mail como este:

```
┌──────────────────────────────────────┐
│   🛒 Novo Pedido Recebido!          │
│   Sistema G8                         │
└──────────────────────────────────────┘

Pedido: #123
Empresa: Pantaneiro
Tipo: B2B
Cliente: João Silva
Data/Hora: 21/10/2025 14:30:45

DESCRIÇÃO DO PEDIDO:
...detalhes completos do pedido...
```

## 📝 Como Funciona

### Fluxo Automático

1. Cliente faz um pedido no sistema
2. Pedido é salvo no banco de dados
3. **Sistema envia e-mail automaticamente** 📧
4. Você recebe notificação em tempo real

### Arquivos Modificados

```
api/
├── notifications/
│   └── email.js              ← Módulo de notificação (NOVO)
├── pedidos.js                ← Integrado com notificação
└── pedidos-b2b.js            ← Integrado com notificação
```

## 🧪 Testando

### Testar configuração manualmente

Crie um arquivo `test-email.js`:

```javascript
const emailNotification = require('./api/notifications/email');

async function test() {
  console.log('🧪 Testando notificação por e-mail...');
  
  const result = await emailNotification.notifyNewOrder({
    id: 999,
    empresa: 'Teste',
    descricao: 'Este é um pedido de teste',
    dados: { teste: true },
    origem: 'teste'
  });
  
  console.log('Resultado:', result);
}

test();
```

Execute:

```bash
node test-email.js
```

### Testar via API

Faça um POST em `/api/pedidos`:

```bash
curl -X POST http://localhost:3000/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "empresa": "Teste",
    "descricao": "Pedido de teste para verificar e-mail"
  }'
```

Você deve receber o e-mail em alguns segundos!

## 🔧 Solução de Problemas

### ❌ "E-mail não configurado"

**Causa**: Variáveis de ambiente não configuradas

**Solução**: 
1. Verifique se o arquivo `.env` existe
2. Confirme que `EMAIL_USER` e `EMAIL_PASS` estão definidos
3. Reinicie o servidor

### ❌ "Invalid login"

**Causa**: Senha de aplicativo incorreta ou não gerada

**Solução**:
1. Gere uma nova senha de aplicativo no Gmail
2. Copie EXATAMENTE como aparece (com ou sem espaços)
3. Atualize `EMAIL_PASS` no `.env`

### ❌ "Connection timeout"

**Causa**: Firewall ou antivírus bloqueando conexão

**Solução**:
1. Verifique conexão com internet
2. Libere porta 587 no firewall
3. Tente desabilitar temporariamente o antivírus

### ❌ E-mail não chega

**Causa**: Pode estar na caixa de spam

**Solução**:
1. Verifique a pasta de spam/lixo eletrônico
2. Marque como "não é spam"
3. Adicione o remetente aos contatos

## 🎨 Personalização

### Alterar template do e-mail

Edite o arquivo `api/notifications/email.js` na função `notifyNewOrder()` e modifique a variável `htmlContent`.

### Alterar título do e-mail

Modifique a variável `subject` na mesma função.

### Adicionar mais informações

Você pode adicionar mais campos no HTML editando a seção `info-box`.

## 📊 Limites do Gmail

- **500 e-mails/dia** (gratuito)
- Se precisar de mais, considere usar:
  - SendGrid (100 e-mails/dia grátis)
  - Mailgun (5.000 e-mails/mês grátis)
  - Amazon SES (muito barato)

## 🔒 Segurança

✅ **Senha de aplicativo**: Mais seguro que senha normal
✅ **Não bloqueia API**: Falha silenciosa em caso de erro
✅ **.env ignorado**: Não sobe pro Git (adicione ao .gitignore)

## 📚 Mais Informações

- [Documentação Nodemailer](https://nodemailer.com/)
- [Senhas de Aplicativo Google](https://support.google.com/accounts/answer/185833)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)

## 💡 Próximos Passos

Gostaria de adicionar:
- 📱 Notificações por WhatsApp?
- 💬 Notificações por SMS?
- 🔔 Notificações push no navegador?
- 📊 Dashboard de notificações enviadas?

Me avise e eu implemento! 🚀

