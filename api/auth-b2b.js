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
  console.log('🚀 FUNÇÃO EXECUTANDO - VERSÃO ATUALIZADA');
  console.log('=== AUTH-B2B VERSÃO ATUALIZADA ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers keys:', Object.keys(req.headers));
  console.log('Body type:', typeof req.body);
  console.log('Body:', req.body);
  console.log('Timestamp:', new Date().toISOString());
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
    
    // Log detalhado para debug
    console.log('=== DADOS RECEBIDOS ===');
    console.log('Auth B2B - CNPJ recebido:', `"${cnpj}"`);
    console.log('Auth B2B - Password recebido:', `"${password}"`);
    console.log('Auth B2B - Tipo CNPJ:', typeof cnpj);
    console.log('Auth B2B - Tipo Password:', typeof password);
    console.log('Auth B2B - Length CNPJ:', cnpj ? cnpj.length : 'undefined');
    console.log('Auth B2B - Length Password:', password ? password.length : 'undefined');
    console.log('Auth B2B - User-Agent:', req.headers['user-agent']);
    console.log('Auth B2B - Content-Type:', req.headers['content-type']);
    console.log('======================');
    
    // Validação básica
    if (!cnpj || !password) {
      console.log('❌ Auth B2B - Validação falhou: CNPJ ou senha ausente');
      console.log('Auth B2B - CNPJ presente:', !!cnpj);
      console.log('Auth B2B - Password presente:', !!password);
      return res.status(400).json({ 
        success: false, 
        message: 'CNPJ e senha são obrigatórios' 
      });
    }
    
    // Validação adicional
    if (typeof cnpj !== 'string' || typeof password !== 'string') {
      console.log('❌ Auth B2B - Tipo de dados inválido');
      console.log('Auth B2B - CNPJ é string:', typeof cnpj === 'string');
      console.log('Auth B2B - Password é string:', typeof password === 'string');
      return res.status(400).json({ 
        success: false, 
        message: 'Dados de entrada inválidos' 
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
    
    console.log('=== VERIFICAÇÃO DE SENHA ===');
    console.log('Auth B2B - CNPJ normalizado:', cnpjNormalizado);
    console.log('Auth B2B - Senha esperada:', `"${senhaEsperada}"`);
    console.log('Auth B2B - Senha recebida:', `"${password}"`);
    console.log('Auth B2B - Senha personalizada configurada:', !!senhasPersonalizadas[cnpjNormalizado]);
    console.log('Auth B2B - Comparação senhas (===):', password === senhaEsperada);
    console.log('Auth B2B - Length senha esperada:', senhaEsperada.length);
    console.log('Auth B2B - Length senha recebida:', password.length);
    console.log('Auth B2B - Tipo senha esperada:', typeof senhaEsperada);
    console.log('Auth B2B - Tipo senha recebida:', typeof password);
    
    // Verificar caracteres especiais
    console.log('Auth B2B - Senha esperada (bytes):', Buffer.from(senhaEsperada).toString('hex'));
    console.log('Auth B2B - Senha recebida (bytes):', Buffer.from(password).toString('hex'));
    console.log('========================');
    
    if (password !== senhaEsperada) {
      console.log('🔒 Auth B2B - Senha inválida - não prosseguindo com busca do cliente');
      console.log('Auth B2B - Tipo da senha esperada:', typeof senhaEsperada);
      console.log('Auth B2B - Tipo da senha recebida:', typeof password);
      console.log('🚫 RETORNANDO ERRO 401 - Senha inválida');
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
      
      // Buscar cliente no banco MySQL por CNPJ normalizado
      const [rows] = await connection.execute(
        'SELECT * FROM clientes WHERE cnpj = ? OR REPLACE(REPLACE(REPLACE(REPLACE(cnpj, ".", ""), "/", ""), "-", ""), " ", "") = ?',
        [cnpj, cnpjNormalizado]
      );
      
      if (rows.length > 0) {
        cliente = rows[0];
        console.log('Auth B2B - Cliente encontrado no MySQL:', cliente.razao);
      }
      
    } catch (dbError) {
      console.log('Auth B2B - Erro MySQL, usando arquivo JSON:', dbError.message);
      
      // Fallback: carregar do arquivo JSON (mesma função do api/clientes.js)
      const carregarClientesJSON = () => {
        try {
          const jsonPath = path.join(__dirname, '../public/clientes.json');
          console.log('🔍 Auth B2B - Caminho do JSON:', jsonPath);
          const data = fs.readFileSync(jsonPath, 'utf8');
          console.log('📄 Auth B2B - Arquivo lido, tamanho:', data.length, 'bytes');
          const clientesData = JSON.parse(data);
          console.log('📊 Auth B2B - Total de clientes:', clientesData.length);
          return clientesData;
        } catch (error) {
          console.error('❌ Auth B2B - Erro ao carregar clientes.json:', error);
          return [];
        }
      };
      
      try {
        console.log('📁 Auth B2B - Carregando dados do JSON...');
        const clientes = carregarClientesJSON();
        
        // Verificar se existe o cliente G8 especificamente
        const clienteG8 = clientes.find(c => c.id === 183);
        if (clienteG8) {
          console.log('✅ Cliente G8 encontrado no JSON:', clienteG8.razao, 'CNPJ:', clienteG8.cnpj);
        } else {
          console.log('❌ Cliente G8 NÃO encontrado no JSON');
        }
        
        // Log de alguns CNPJs para debug
        console.log('Auth B2B - Primeiros 3 CNPJs do arquivo:');
        clientes.slice(0, 3).forEach((c, i) => {
          console.log(`  ${i}: ${c.cnpj} -> ${c.cnpj?.replace(/[.\-\/\s]/g, '')}`);
        });
        
        // Buscar cliente por CNPJ - múltiplas estratégias
        console.log('🔍 Auth B2B - Buscando cliente por CNPJ...');
        console.log('🔍 CNPJ original:', cnpj);
        console.log('🔍 CNPJ normalizado:', cnpjNormalizado);
        console.log('🔍 Total de clientes no array:', clientes.length);
        
        // Estratégia 1: CNPJ normalizado (sem formatação)
        cliente = clientes.find(c => {
          if (!c.cnpj) return false;
          const clienteCnpj = c.cnpj.replace(/[.\-\/\s]/g, '');
          const match = clienteCnpj === cnpjNormalizado;
          if (match) {
            console.log('✅ Auth B2B - MATCH encontrado (normalizado):', c.razao, 'CNPJ:', c.cnpj);
          }
          return match;
        });
        
        // Estratégia 2: CNPJ formatado original
        if (!cliente) {
          console.log('🔍 Auth B2B - Tentando busca por CNPJ formatado...');
          cliente = clientes.find(c => {
            const match = c.cnpj === cnpj;
            if (match) {
              console.log('✅ Auth B2B - MATCH encontrado (formatado):', c.razao, 'CNPJ:', c.cnpj);
            }
            return match;
          });
        }
        
        // Estratégia 3: Busca case-insensitive e flexível
        if (!cliente) {
          console.log('🔍 Auth B2B - Tentando busca flexível...');
          cliente = clientes.find(c => {
            if (!c.cnpj) return false;
            const clienteCnpjNorm = c.cnpj.toLowerCase().replace(/[.\-\/\s]/g, '');
            const cnpjNorm = cnpjNormalizado.toLowerCase();
            const match = clienteCnpjNorm === cnpjNorm;
            if (match) {
              console.log('✅ Auth B2B - MATCH encontrado (flexível):', c.razao, 'CNPJ:', c.cnpj);
            }
            return match;
          });
        }
        
        // Estratégia 4: Fallback por ID específico para G8
        if (!cliente && cnpjNormalizado === '30110818000128') {
          console.log('🔍 Auth B2B - Fallback G8: buscando por ID 183...');
          cliente = clientes.find(c => c.id === 183);
          if (cliente) {
            console.log('✅ Auth B2B - G8 encontrada por ID:', cliente.razao);
          }
        }
        
        console.log('🔍 Resultado final da busca:', cliente ? `ENCONTRADO: ${cliente.razao}` : 'NÃO ENCONTRADO');
        
        if (cliente) {
          console.log('✅ Auth B2B - Cliente encontrado no JSON:', cliente.razao);
          console.log('Auth B2B - Dados do cliente encontrado:');
          console.log('  - ID:', cliente.id);
          console.log('  - Razão:', cliente.razao);
          console.log('  - CNPJ:', cliente.cnpj);
          console.log('  - CNPJ normalizado:', cliente.cnpj ? cliente.cnpj.replace(/[.\-\/\s]/g, '') : 'N/A');
          console.log('  - Cidade:', cliente.cidade);
          console.log('  - Email:', cliente.email);
        } else {
          console.log('❌ Auth B2B - Cliente não encontrado no JSON');
          
          // Debug: Verificar alguns clientes próximos para comparação
          console.log('🔍 Debug: Verificando CNPJs similares...');
          const cnpjsSimilares = clientes.filter(c => {
            if (!c.cnpj) return false;
            const clienteCnpj = c.cnpj.replace(/[.\-\/\s]/g, '');
            return clienteCnpj.includes('30110818') || cnpjNormalizado.includes(clienteCnpj.substring(0, 8));
          });
          
          console.log('CNPJs similares encontrados:', cnpjsSimilares.length);
          cnpjsSimilares.slice(0, 3).forEach(c => {
            console.log(`  - ${c.cnpj} (${c.cnpj.replace(/[.\-\/\s]/g, '')}) - ${c.razao}`);
          });
          
          // FALLBACK TEMPORÁRIO - Se for G8, criar cliente hardcoded
          if (cnpjNormalizado === '30110818000128') {
            console.log('🔧 Auth B2B - Aplicando fallback G8...');
            cliente = {
              id: 183,
              razao: 'GUSTAVO THOMAZ DA SILVA REPRESENTACOES LTDA',
              cnpj: '30.110.818/0001-28',
              ie: '258703407',
              endereco: 'AVENIDA PRESIDENTE KENNEDY 55 SALA 04',
              bairro: 'CAMPINAS',
              cidade: 'SAO JOSE',
              estado: 'SC',
              cep: '88103600',
              email: 'gustavo@g8representacoes.com.br',
              telefone: '4832411470',
              transporte: 'CIF',
              prazo: '30',
              obs: 'Cliente fallback temporário'
            };
            console.log('✅ Auth B2B - Cliente G8 fallback criado');
          }
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
      console.log('✅ Auth B2B - Retornando dados do cliente:', cliente.razao);
      console.log('🎉 LOGIN BEM-SUCEDIDO - Redirecionando cliente');
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
      console.log('❌ Auth B2B - Cliente não encontrado no sistema');
      console.log('Auth B2B - CNPJ pesquisado:', cnpj);
      console.log('Auth B2B - CNPJ normalizado:', cnpjNormalizado);
      console.log('Auth B2B - Senha esperada:', senhasPersonalizadas[cnpjNormalizado] || '123456');
      console.log('Auth B2B - Senha recebida:', password);
      console.log('🚫 RETORNANDO ERRO 401 - Cliente não encontrado');
      
      // Delay pequeno para prevenir ataques de força bruta
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ 
        success: false, 
        message: 'Cliente não encontrado no sistema' 
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
