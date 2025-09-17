# Sistema B2B G8 - Documentação

## 📋 Visão Geral

O Sistema B2B permite que clientes da G8 façam login e criem pedidos diretamente através de um portal web, facilitando o processo de vendas e melhorando a experiência do cliente.

## 🔧 Funcionalidades Implementadas

### 1. Autenticação de Clientes
- **Arquivo**: `api/auth-b2b.js`
- **Login**: CNPJ + Senha padrão (123456)
- **Validação**: Verifica se o CNPJ existe na base de clientes (`public/clientes.json`)
- **Segurança**: Headers de segurança e delay para prevenção de ataques

### 2. Portal de Login B2B
- **Arquivo**: `public/b2b-login.html`
- **Features**:
  - Interface moderna e responsiva
  - Máscara automática para CNPJ
  - Validação em tempo real
  - Feedback visual de loading e erros

### 3. Sistema de Pedidos B2B
- **Arquivo**: `public/b2b-pedidos.html`
- **Features**:
  - Criação de pedidos por empresa (Pantaneiro 5, Pantaneiro 7, Steitz)
  - Histórico de pedidos do cliente
  - Interface intuitiva e responsiva
  - Logout seguro

### 4. API de Pedidos B2B
- **Arquivo**: `api/pedidos-b2b.js`
- **Endpoints**:
  - `POST`: Criar novo pedido B2B
  - `GET`: Listar pedidos de um cliente específico
- **Identificação**: Pedidos marcados com `origem: 'b2b'`

### 5. Integração no Painel Administrativo
- **Arquivos**: `public/pedidos.js`, `public/pedidos.html`
- **Features**:
  - Identificação visual de pedidos B2B (badge 🌐 B2B)
  - Estilo diferenciado (borda azul, fundo especial)
  - Informações do cliente B2B preservadas

### 6. Acesso pelo Painel Principal
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

### Personalizar Interface:
1. Modifique os estilos em `public/b2b-login.html` e `public/b2b-pedidos.html`
2. Ajuste cores e layout conforme necessário

## ✅ Status do Projeto

- ✅ Autenticação B2B implementada
- ✅ Portal de login criado
- ✅ Sistema de pedidos funcionando
- ✅ API B2B operacional
- ✅ Integração no painel administrativo
- ✅ Interface responsiva e moderna
- ✅ Documentação completa

O sistema está pronto para uso em produção! 🎉
