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
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { cnpj, password } = req.body;
    
    // Validação básica
    if (!cnpj || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'CNPJ e senha são obrigatórios' 
      });
    }
    
    // Validação adicional
    if (typeof cnpj !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Dados de entrada inválidos' 
      });
    }

    // Normalizar CNPJ (remover pontos, barras e espaços)
    const cnpjNormalizado = cnpj.replace(/[.\-\/\s]/g, '');
    
    // Verificar senha (padrão ou personalizada)
    const senhaEsperada = senhasPersonalizadas[cnpjNormalizado] || '123456';
    
    if (password !== senhaEsperada) {
      // Delay pequeno para prevenir ataques de força bruta
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ 
        success: false, 
        message: 'Senha inválida' 
      });
    }

    // Buscar cliente no banco MySQL ou arquivo JSON (fallback)
    let cliente = null;
    let connection = null;
    
    try {
      // Tentar conectar com MySQL
      connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'julianopassing',
        password: process.env.DB_PASSWORD || 'Juliano@95',
        database: process.env.DB_NAME || 'sistemajuliano'
      });
      
      // Buscar cliente no banco MySQL por CNPJ normalizado
      const [rows] = await connection.execute(
        'SELECT * FROM clientes WHERE cnpj = ? OR REPLACE(REPLACE(REPLACE(REPLACE(cnpj, ".", ""), "/", ""), "-", ""), " ", "") = ?',
        [cnpj, cnpjNormalizado]
      );
      
      if (rows.length > 0) {
        cliente = rows[0];
      }
      
    } catch (dbError) {
      
      // Fallback: carregar do arquivo JSON
      const carregarClientesJSON = () => {
        try {
          const jsonPath = path.join(__dirname, '../public/clientes.json');
          const data = fs.readFileSync(jsonPath, 'utf8');
          const clientesData = JSON.parse(data);
          return clientesData;
        } catch (error) {
          return [];
        }
      };
      
      try {
        const clientes = carregarClientesJSON();
        
        // Estratégia 1: CNPJ normalizado (sem formatação)
        cliente = clientes.find(c => {
          if (!c.cnpj) return false;
          const clienteCnpj = c.cnpj.replace(/[.\-\/\s]/g, '');
          return clienteCnpj === cnpjNormalizado;
        });
        
        // Estratégia 2: CNPJ formatado original
        if (!cliente) {
          cliente = clientes.find(c => c.cnpj === cnpj);
        }
        
        // Estratégia 3: Busca case-insensitive e flexível
        if (!cliente) {
          cliente = clientes.find(c => {
            if (!c.cnpj) return false;
            const clienteCnpjNorm = c.cnpj.toLowerCase().replace(/[.\-\/\s]/g, '');
            const cnpjNorm = cnpjNormalizado.toLowerCase();
            return clienteCnpjNorm === cnpjNorm;
          });
        }
        
        // Estratégia 4: Fallback por ID específico para G8
        if (!cliente && cnpjNormalizado === '30110818000128') {
          cliente = clientes.find(c => c.id === 183);
        }
        
        // FALLBACK TEMPORÁRIO - Se for G8, criar cliente hardcoded
        if (!cliente && cnpjNormalizado === '30110818000128') {
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
        }
      } catch (jsonError) {
        // Erro silencioso
      }
    } finally {
      // Fechar conexão se foi aberta
      if (connection) {
        await connection.end();
      }
    }
    
    if (cliente) {
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
      // Delay pequeno para prevenir ataques de força bruta
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ 
        success: false, 
        message: 'Cliente não encontrado no sistema' 
      });
    }
  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
