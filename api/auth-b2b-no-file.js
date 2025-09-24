// API auth-b2b sem dependência de arquivos - apenas validação de senha
module.exports = async (req, res) => {
  console.log('=== AUTH-B2B NO-FILE ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.keys(req.headers));
  console.log('Body:', req.body);
  console.log('========================');
  
  // Headers básicos
  res.setHeader('Content-Type', 'application/json');
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
    
    console.log('Dados recebidos - CNPJ:', cnpj, 'Password:', password);
    
    if (!cnpj || !password) {
      console.log('Validação falhou - campos ausentes');
      return res.status(400).json({ 
        success: false, 
        message: 'CNPJ e senha são obrigatórios' 
      });
    }

    // Normalizar CNPJ
    const cnpjNormalizado = cnpj.replace(/[.\-\/\s]/g, '');
    console.log('CNPJ normalizado:', cnpjNormalizado);
    
    // Senhas personalizadas (mesma lógica da API original)
    const senhasPersonalizadas = {
      '30110818000128': 'gustavo',  // G8 Representações
    };
    
    const senhaEsperada = senhasPersonalizadas[cnpjNormalizado] || '123456';
    console.log('Senha esperada:', senhaEsperada);
    
    if (password !== senhaEsperada) {
      console.log('Senha inválida');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ 
        success: false, 
        message: 'Senha inválida' 
      });
    }
    
    console.log('Login bem-sucedido');
    
    // Retornar cliente simulado
    return res.status(200).json({ 
      success: true, 
      message: 'Login realizado com sucesso',
      cliente: {
        id: 1,
        razao: 'Cliente Teste - ' + cnpj,
        cnpj: cnpj,
        cidade: 'Teste',
        estado: 'SC',
        email: 'teste@teste.com',
        telefone: '123456789',
        endereco: 'Rua Teste',
        bairro: 'Centro',
        cep: '12345678',
        ie: '123456789',
        transporte: 'Teste',
        prazo: '30',
        obs: 'Cliente de teste sem arquivo',
        acessos: {
          pantaneiro5: cnpjNormalizado === '30110818000128', // G8 tem acesso
          pantaneiro7: true,
          steitz: true
        }
      }
    });
    
  } catch (error) {
    console.error('Erro na API no-file:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};
