# G8 Pedidos - Sistema de Pedidos

## Descrição
Sistema de pedidos para a G8, com integração de dados de clientes centralizados.

## Funcionalidades Implementadas

### ✅ Integração de Dados de Clientes
- **Arquivo Central**: `clientes.html` contém todos os dados dos clientes
- **Páginas Integradas**: 
  - `pantaneiro5.html`
  - `pantaneiro7.html` 
  - `steitz.html`

### 🔄 Como Funciona
1. As páginas de pedidos carregam automaticamente os dados dos clientes do arquivo `clientes.html`
2. Mantém todas as listas de produtos individuais de cada página
3. Preserva todo o padrão de código e formatação CSS existente

### 📁 Estrutura dos Arquivos
```
g8pedidos-main/
├── clientes.html          # Dados centralizados dos clientes
├── pantaneiro5.html       # Página de pedidos Pantaneiro 5
├── pantaneiro7.html       # Página de pedidos Pantaneiro 7
├── steitz.html           # Página de pedidos Steitz
├── index.html            # Página de login
├── painel.html           # Painel principal
├── vercel.json           # Configuração do Vercel
└── README.md             # Este arquivo
```

### 🚀 Deploy no Vercel
O projeto está configurado para deploy no Vercel com:
- Configuração de rotas estáticas
- Headers de segurança
- Suporte a arquivos HTML

### 🔧 Tecnologias Utilizadas
- HTML5
- CSS3 (com variáveis CSS personalizadas)
- JavaScript (ES6+)
- jsPDF para geração de PDFs
- Fetch API para carregamento de dados

### 📋 Características Mantidas
- ✅ Design responsivo
- ✅ Sistema de autenticação
- ✅ Geração de PDFs
- ✅ Cálculos de desconto
- ✅ Interface moderna e intuitiva
- ✅ Listas completas de produtos individuais

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

## Como Usar
1. Faça login no sistema
2. Acesse uma das páginas de pedidos
3. Selecione um cliente da lista (carregada automaticamente)
4. Adicione produtos ao pedido
5. Gere o PDF do pedido

## Deploy
Para fazer deploy no Vercel:
1. Conecte seu repositório ao Vercel
2. O arquivo `vercel.json` já está configurado
3. Deploy automático a cada push 