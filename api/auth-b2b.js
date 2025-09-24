// API de autenticação B2B para clientes
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// CONFIGURAÇÃO DE SENHAS PERSONALIZADAS
// CNPJs com senhas específicas (sobrescreve a senha padrão 123456)
const senhasPersonalizadas = {
  '30110818000128': 'gustavo',  // G8 Representações
  // Adicione mais CNPJs com senhas personalizadas aqui
  // '12345678000100': 'minhasenha123',
  // '98765432000111': 'outrasenha456',
};

// Função para definir acessos por cliente
function getAcessosCliente(cnpj) {
  // Normalizar CNPJ para comparação
  const cnpjNormalizado = cnpj.replace(/[.\-\/\s]/g, '');
  
  // CONFIGURAÇÃO DE ACESSO AO PANTANEIRO 5
  // PANTANEIRO 7 e STEITZ: Sempre liberados para todos
  // PANTANEIRO 5: Apenas clientes listados aqui
  const clientesComPantaneiro5 = [
    '30110818000128',  // G8 Representações
    '11806675000149',  // 11.806.675/0001-49
    '02179523000172',  // 02.179.523/0001-72
    '02179523000253',  // 02.179.523/0002-53
    '27735322000135',  // 27.735.322/0001-35
    '02840209000199',  // 02.840.209/0001-99
    '16715412000229',  // 16.715.412/0002-29
    '16715412000300',  // 16.715.412/0003-00
    '16715412000148',  // 16.715.412/0001-48
    '07434744000163',  // 07.434.744/0001-63
    '06086160000181',  // 06.086.160/0001-81
    '78271327000195',  // 78.271.327/0001-95
    
    // Adicione mais CNPJs aqui (sem pontos, barras ou hífens)
    // '12345678000100',
    // '98765432000111',
  ];
  
  // Verificar se o cliente tem acesso ao Pantaneiro 5
  const temAcessoPantaneiro5 = clientesComPantaneiro5.includes(cnpjNormalizado);
  
  // Retornar acessos (Pantaneiro 7 e Steitz sempre liberados)
  return {
    pantaneiro5: temAcessoPantaneiro5,  // Só se estiver na lista
    pantaneiro7: true,                  // Sempre liberado
    steitz: true                        // Sempre liberado
  };
}

module.exports = async (req, res) => {
  // Log inicial para debug
  console.log('=== AUTH-B2B ORIGINAL ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers keys:', Object.keys(req.headers));
  console.log('Body type:', typeof req.body);
  console.log('Body:', req.body);
  console.log('=========================');
  
  // Headers de segurança e CORS
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    console.log('Respondendo OPTIONS');
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    console.log('Método não permitido:', req.method);
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { cnpj, password } = req.body;
    
    // Log para debug
    console.log('Auth B2B - CNPJ:', cnpj, 'Password:', password);
    console.log('Auth B2B - Headers:', req.headers);
    
    // Validação básica
    if (!cnpj || !password) {
      console.log('Auth B2B - Validação falhou: CNPJ ou senha ausente');
      return res.status(400).json({ 
        success: false, 
        message: 'CNPJ e senha são obrigatórios' 
      });
    }

    // Normalizar CNPJ (remover pontos, barras e espaços)
    const cnpjNormalizado = cnpj.replace(/[.\-\/\s]/g, '');
    
    console.log('Auth B2B - CNPJ original:', cnpj);
    console.log('Auth B2B - CNPJ normalizado:', cnpjNormalizado);
    console.log('Auth B2B - Tipo do CNPJ:', typeof cnpj);
    console.log('Auth B2B - Length CNPJ normalizado:', cnpjNormalizado.length);
    
    // Verificar senha (padrão ou personalizada)
    const senhaEsperada = senhasPersonalizadas[cnpjNormalizado] || '123456';
    
    console.log('Auth B2B - Senha esperada:', senhaEsperada);
    console.log('Auth B2B - Senha recebida:', password);
    
    if (password !== senhaEsperada) {
      console.log('Auth B2B - Senha inválida');
      // Delay pequeno para prevenir ataques de força bruta
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ 
        success: false, 
        message: 'Senha inválida' 
      });
    }
    
    console.log('Auth B2B - Senha válida, buscando cliente...');

    // Buscar cliente no banco MySQL ou arquivo JSON (fallback)
    let cliente = null;
    let connection = null;
    
    try {
      console.log('Auth B2B - Tentando conectar com MySQL...');
      
      // Tentar conectar com MySQL
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'julianopassing',
        password: process.env.DB_PASSWORD || 'Juliano@95',
        database: process.env.DB_NAME || 'sistemajuliano'
      });
      
      console.log('Auth B2B - Conexão MySQL estabelecida');
      
      // Buscar cliente no banco MySQL
      const [rows] = await connection.execute(
        'SELECT * FROM clientes WHERE cnpj = ?',
        [cnpjNormalizado]
      );
      
      if (rows.length > 0) {
        cliente = rows[0];
        console.log('Auth B2B - Cliente encontrado no MySQL:', cliente.razao);
      }
      
    } catch (dbError) {
      console.log('Auth B2B - Erro MySQL, usando arquivo JSON:', dbError.message);
      
      // Fallback: carregar do arquivo JSON
      try {
        console.log('Auth B2B - Carregando clientes.json...');
        
        const clientesPath = path.join(process.cwd(), 'public', 'clientes.json');
        const clientesData = fs.readFileSync(clientesPath, 'utf8');
        const clientes = JSON.parse(clientesData);
        
        console.log('Auth B2B - JSON carregado, total de clientes:', clientes.length);
        
        // Log de alguns CNPJs para debug
        console.log('Auth B2B - Primeiros 3 CNPJs do arquivo:');
        clientes.slice(0, 3).forEach((c, i) => {
          console.log(`  ${i}: ${c.cnpj} -> ${c.cnpj?.replace(/[.\-\/\s]/g, '')}`);
        });
        
        // Buscar cliente pelo CNPJ no arquivo JSON
        cliente = clientes.find(c => {
          const clienteCnpj = c.cnpj ? c.cnpj.replace(/[.\-\/\s]/g, '') : '';
          console.log('Auth B2B - Comparando:', clienteCnpj, 'com', cnpjNormalizado);
          return clienteCnpj === cnpjNormalizado;
        });
        
        // Se não encontrou, tentar busca alternativa
        if (!cliente) {
          console.log('Auth B2B - Tentando busca alternativa...');
          cliente = clientes.find(c => {
            if (!c.cnpj) return false;
            // Normalizar ambos os CNPJs para comparação
            const clienteCnpjNorm = c.cnpj.replace(/[.\-\/\s]/g, '');
            const buscaCnpjNorm = cnpj.replace(/[.\-\/\s]/g, '');
            console.log('Auth B2B - Busca alt:', clienteCnpjNorm, 'vs', buscaCnpjNorm);
            return clienteCnpjNorm === buscaCnpjNorm;
          });
        }
        
        if (cliente) {
          console.log('Auth B2B - Cliente encontrado no JSON:', cliente.razao);
        } else {
          console.log('Auth B2B - Cliente não encontrado no JSON');
        }
      } catch (jsonError) {
        console.error('Auth B2B - Erro ao carregar JSON:', jsonError.message);
      }
    } finally {
      // Fechar conexão se foi aberta
      if (connection) {
        await connection.end();
      }
    }
    
    if (cliente) {
      console.log('Auth B2B - Retornando dados do cliente:', cliente.razao);
      return res.status(200).json({ 
        success: true, 
        message: 'Login realizado com sucesso',
        cliente: {
          id: cliente.id,
          razao: cliente.razao,
          cnpj: cliente.cnpj,
          cidade: cliente.cidade,
          estado: cliente.estado,
          email: cliente.email,
          telefone: cliente.telefone,
          endereco: cliente.endereco,
          bairro: cliente.bairro,
          cep: cliente.cep,
          ie: cliente.ie,
          transporte: cliente.transporte,
          prazo: cliente.prazo,
          obs: cliente.obs,
          // Controle de acesso às tabelas
          acessos: getAcessosCliente(cliente.cnpj)
        }
      });
    } else {
      console.log('Auth B2B - Cliente não encontrado no sistema');
      // Delay pequeno para prevenir ataques de força bruta
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ 
        success: false, 
        message: 'CNPJ não encontrado no sistema' 
      });
    }
  } catch (error) {
    console.error('Erro na autenticação B2B:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
