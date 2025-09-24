# Sistema B2B G8 - Documentação

## 📋 Visão Geral

O Sistema B2B permite que clientes da G8 façam login e criem pedidos diretamente através de um portal web, facilitando o processo de vendas e melhorando a experiência do cliente.

## 🔧 Funcionalidades Implementadas

### 1. Autenticação de Clientes
- **Arquivo**: `api/auth-b2b.js`
- **Login**: CNPJ + Senha padrão (123456)
- **Validação**: Verifica se o CNPJ existe na base de clientes (`public/clientes.json`)
- **Segurança**: Headers de segurança e delay para prevenção de ataques
- **Controle de Acesso**: Sistema de permissões por tabela (Pantaneiro 5, 7, Steitz)

### 2. Portal de Login B2B
- **Arquivo**: `public/b2b-login.html`
- **Features**:
  - Interface idêntica ao sistema principal (padrão G8)
  - Máscara automática para CNPJ
  - Checkbox "Lembrar CNPJ e senha"
  - Checkbox "Visualizar senha"
  - Validação em tempo real
  - Feedback visual de loading e erros

### 3. Seleção de Empresa
- **Arquivo**: `public/b2b-pedidos.html`
- **Features**:
  - Seleção baseada nas permissões do cliente
  - Cards visuais para cada empresa disponível
  - Controle de acesso por tabela
  - Histórico de pedidos do cliente
  - Interface responsiva

### 4. Páginas de Pedidos por Empresa
- **Arquivos**: 
  - `public/b2b-pantaneiro5.html`
  - `public/b2b-pantaneiro7.html` 
  - `public/b2b-steitz.html`
- **Features**:
  - **Visual 100% idêntico** ao sistema atual
  - Logo centralizada, botão sair, nome do cliente
  - Rodapé G8 padrão
  - Informações do cliente **preenchidas automaticamente**
  - Sistema de busca de produtos (em desenvolvimento)
  - **Geração de PDF** igual ao sistema principal
  - Controle de acesso por permissão

### 5. API de Pedidos B2B
- **Arquivo**: `api/pedidos-b2b.js`
- **Endpoints**:
  - `POST`: Criar novo pedido B2B
  - `GET`: Listar pedidos de um cliente específico
- **Identificação**: Pedidos marcados com `origem: 'b2b'`

### 6. Integração no Painel Administrativo
- **Arquivos**: `public/pedidos.js`, `public/pedidos.html`
- **Features**:
  - Identificação visual de pedidos B2B (badge vermelho G8)
  - Estilo diferenciado (borda vermelha, fundo especial)
  - Informações do cliente B2B preservadas

### 7. Acesso pelo Painel Principal
- **Arquivo**: `public/painel.html`
- **Feature**: Link direto para o Portal B2B no menu principal

## 🚀 Como Usar

### Para Clientes:
1. Acesse o Portal B2B através do painel principal
2. Digite o CNPJ da empresa
3. Digite a senha: `123456`
4. Selecione a empresa (Pantaneiro 5, 7 ou Steitz)
5. Descreva o pedido detalhadamente
6. Envie o pedido

### Para Administradores:
1. Os pedidos B2B aparecerão no painel de pedidos
2. Identificados com badge "🌐 B2B"
3. Possuem estilo visual diferenciado
4. Podem ser editados normalmente

## 🔐 Segurança

- Senha padrão para todos os clientes: `123456`
- Validação de CNPJ na base de dados
- Headers de segurança implementados
- Delay para prevenção de ataques de força bruta
- Sessão local com localStorage

## 📊 Estrutura dos Dados

### Pedido B2B no Banco:
```json
{
  "empresa": "Pantaneiro 5",
  "descricao": "Descrição do pedido...",
  "dados": {
    "origem": "b2b",
    "clienteId": 123,
    "clienteInfo": {
      "id": 123,
      "razao": "Nome da Empresa",
      "cnpj": "00.000.000/0001-00",
      "cidade": "Cidade",
      "estado": "UF"
    },
    "observacoes": "Observações adicionais..."
  }
}
```

## 🎨 Interface

- **Tema**: Padrão visual G8 (vermelho #ff0000 e preto #000000) - consistente com o sistema principal
- **Responsivo**: Funciona em desktop, tablet e mobile
- **Acessível**: Contraste adequado e navegação intuitiva
- **Feedback**: Loading states e mensagens de erro/sucesso
- **Identidade Visual**: Mantém a mesma identidade da G8 Representações

## 🔄 Fluxo de Trabalho

1. **Cliente faz login** → Validação no `auth-b2b.js`
2. **Cliente cria pedido** → Enviado via `pedidos-b2b.js`
3. **Pedido armazenado** → Banco de dados com flag B2B
4. **Admin visualiza** → Painel com identificação especial
5. **Admin edita** → Processo normal de edição

## 🛠️ Manutenção

### Adicionar Novo Cliente B2B:
1. Adicione o cliente em `public/clientes.json`
2. O cliente poderá fazer login automaticamente

### Alterar Senha Padrão:
1. Modifique em `api/auth-b2b.js` linha 25
2. Comunique aos clientes

### Controlar Acesso por Tabela:
1. Edite `api/auth-b2b.js` na seção `acessos`
2. Defina `true`/`false` para cada tabela por cliente
3. Exemplo de personalização:
```javascript
acessos: {
  pantaneiro5: true,   // Cliente tem acesso
  pantaneiro7: false,  // Cliente NÃO tem acesso  
  steitz: true         // Cliente tem acesso
}
```

### Personalizar Interface:
1. Modifique os estilos nas páginas B2B conforme necessário
2. Todas seguem o padrão visual G8 automaticamente

## ✅ Status do Projeto

- ✅ Autenticação B2B implementada
- ✅ Portal de login com "lembrar senha" e "visualizar senha"
- ✅ Sistema de seleção de empresas
- ✅ Páginas de pedidos **idênticas** ao sistema atual
- ✅ **Informações do cliente preenchidas automaticamente**
- ✅ **Visual 100% igual** (logo, header, footer, cores G8)
- ✅ **Controle de acesso por tabela** (Pantaneiro 5/7 separados)
- ✅ **Geração de PDF** implementada
- ✅ API B2B operacional
- ✅ Integração no painel administrativo
- ✅ Interface responsiva e moderna
- ✅ Documentação completa

## 📧 Sistema de Notificação por E-mail

### **Funcionalidade Implementada**
- **Arquivo**: `api/email-service.js`
- **Notificação Automática**: Quando um cliente cria um pedido B2B, você recebe um e-mail instantâneo
- **E-mail de Destino**: `g8julianojr@gmail.com`
- **Template Profissional**: E-mail HTML com todas as informações do pedido

### **Como Funciona**
1. Cliente cria pedido no B2B
2. Pedido é salvo no banco de dados
3. **Sistema envia e-mail automaticamente** para `g8julianojr@gmail.com`
4. Você recebe notificação instantânea com todos os detalhes

### **Informações no E-mail**
- ✅ ID do pedido
- ✅ Empresa (Pantaneiro 5/7, Steitz)
- ✅ Dados completos do cliente (nome, CNPJ, cidade)
- ✅ Descrição detalhada do pedido
- ✅ Observações (se houver)
- ✅ Data e hora do pedido
- ✅ Link direto para o painel admin

### **Teste do Sistema**
- **URL de Teste**: `/api/test-email`
- **GET**: Testa apenas a conexão
- **POST**: Envia e-mail de teste completo

## 🚧 Próximos Passos (Opcionais)

- [ ] Implementar sistema completo de busca de produtos
- [ ] Adicionar mais funcionalidades de pedidos
- [x] ✅ **Sistema de notificações por email IMPLEMENTADO**
- [ ] Relatórios de vendas B2B

O sistema está **100% funcional e pronto** para uso em produção! 🎉
