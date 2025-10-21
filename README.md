# G8 Sistema - Sistema Completo de Pedidos

## Descrição
Sistema completo de pedidos e gestão de clientes para G8 Representações, com funcionalidades avançadas e otimizações de performance.

## ✨ Funcionalidades Implementadas

### 🔐 Sistema de Autenticação Melhorado
- **API de Autenticação**: Sistema híbrido com fallback local
- **Headers de Segurança**: Proteção contra XSS, clickjacking
- **Validação Robusta**: Sanitização e validação de dados
- **Sessão Inteligente**: Verificação periódica de sessão

### 📱 PWA (Progressive Web App)
- **Service Worker**: Cache inteligente e funcionalidade offline
- **Manifesto Web**: Instalação como app nativo
- **Otimização Mobile**: Interface responsiva aprimorada
- **Safe Areas**: Suporte para dispositivos com notch

### 🔄 Como Funciona
1. As páginas de pedidos carregam automaticamente os dados dos clientes do arquivo `clientes.html`
2. Mantém todas as listas de produtos individuais de cada página
3. Preserva todo o padrão de código e formatação CSS existente
### 🚀 Sistemas Avançados
- **Cache Inteligente**: Sistema de cache com TTL e invalidação automática
- **Notificações Elegantes**: Sistema de notificações não-intrusivas
- **Loading States**: Estados de carregamento aprimorados
- **Tratamento de Erros**: Captura global e feedback inteligente
- **Auto-save**: Salvamento automático de formulários
- **Detecção Offline**: Notificação de status de conexão
- **📧 Notificações por E-mail**: Sistema automático de notificação via e-mail para novos pedidos

### 🔧 Tecnologias Utilizadas
- **Frontend**: HTML5, CSS3, JavaScript ES6+ (Vanilla)
- **Backend**: Node.js, MySQL, APIs Serverless (Vercel)
- **PWA**: Service Workers, Web App Manifest
- **Segurança**: Headers de segurança, validação de dados
- **Performance**: Cache inteligente, lazy loading, otimizações mobile

### 📋 Características Mantidas e Melhoradas
- ✅ Design responsivo com otimizações mobile
- ✅ Sistema de autenticação com API segura
- ✅ Geração de PDFs (mantido)
- ✅ Cálculos de desconto (mantido)
- ✅ Interface moderna com UX aprimorada
- ✅ Listas completas de produtos (mantidas)
- 🆕 Funcionalidade offline básica
- 🆕 Notificações elegantes
- 🆕 Estados de loading aprimorados
- 🆕 Tratamento de erros robusto

### 🔄 Processo de Carregamento
1. Página carrega
2. Script busca dados do `clientes.html`
3. Extrai array de clientes via regex
4. Popula select de clientes
5. Inicializa funcionalidades da página

### 🎯 Benefícios
- **Centralização**: Dados dos clientes em um só lugar
- **Manutenibilidade**: Atualizações em um arquivo refletem em todas as páginas
- **Consistência**: Mesmos dados em todas as páginas
- **Performance**: Carregamento assíncrono dos dados

## 📧 Notificações por E-mail

### Como Funciona
- ✅ **Automático**: Envia e-mail automaticamente quando um pedido novo é criado
- ✅ **Gratuito**: Usa Gmail (até 500 e-mails/dia)
- ✅ **Elegante**: E-mails com design profissional em HTML
- ✅ **Completo**: Inclui todos os detalhes do pedido

### Configuração Rápida no Vercel
1. Gere uma senha de aplicativo do Gmail: https://myaccount.google.com/apppasswords
2. Adicione as variáveis no Vercel Dashboard → Settings → Environment Variables:
   - `EMAIL_USER` = seu e-mail do Gmail
   - `EMAIL_PASS` = senha de aplicativo gerada
   - `EMAIL_TO` = e-mail que receberá as notificações
3. Faça redeploy
4. Pronto! Teste criando um pedido

📖 **Documentação Completa**: Leia `CONFIGURACAO_VERCEL.md` ou `COMO_CONFIGURAR_EMAIL_VERCEL.txt`

## Como Usar
1. Faça login no sistema
2. Acesse uma das páginas de pedidos
3. Selecione um cliente da lista (carregada automaticamente)
4. Adicione produtos ao pedido
5. Gere o PDF do pedido
6. **Receba notificação por e-mail automaticamente** 📧
