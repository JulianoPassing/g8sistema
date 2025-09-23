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
  // Adicionar headers de segurança
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
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
      
      // Buscar cliente no banco MySQL
      const [rows] = await connection.execute(
        'SELECT * FROM clientes WHERE cnpj = ?',
        [cnpjNormalizado]
      );
      
      if (rows.length > 0) {
        cliente = rows[0];
      }
      
    } catch (dbError) {
      console.log('Erro ao conectar com MySQL, usando arquivo JSON:', dbError.message);
      
      // Fallback: carregar do arquivo JSON
      try {
        const clientesPath = path.join(process.cwd(), 'public', 'clientes.json');
        const clientesData = fs.readFileSync(clientesPath, 'utf8');
        const clientes = JSON.parse(clientesData);
        
        // Buscar cliente pelo CNPJ no arquivo JSON
        cliente = clientes.find(c => {
          const clienteCnpj = c.cnpj ? c.cnpj.replace(/[.\-\/\s]/g, '') : '';
          return clienteCnpj === cnpjNormalizado;
        });
      } catch (jsonError) {
        console.error('Erro ao carregar clientes.json:', jsonError);
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
