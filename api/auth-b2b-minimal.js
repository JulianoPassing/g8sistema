// API auth-b2b minimal para debug
module.exports = async (req, res) => {
  console.log('=== AUTH-B2B MINIMAL ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
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
    return res.status(405).json({ 
      error: 'Método não permitido',
      method: req.method 
    });
  }

  try {
    const { cnpj, password } = req.body;
    
    console.log('Dados recebidos - CNPJ:', cnpj, 'Password:', password);
    
    if (!cnpj || !password) {
      console.log('Validação falhou - campos ausentes');
      return res.status(400).json({ 
        success: false, 
        message: 'CNPJ e senha são obrigatórios',
        received: { cnpj: !!cnpj, password: !!password }
      });
    }

    // Teste simples - aceitar qualquer CNPJ com senha 123456
    if (password === '123456') {
      console.log('Login de teste bem-sucedido');
      return res.status(200).json({ 
        success: true, 
        message: 'Login de teste realizado com sucesso',
        cliente: {
          id: 999,
          razao: 'Cliente Teste',
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
          obs: 'Cliente de teste',
          acessos: {
            pantaneiro5: true,
            pantaneiro7: true,
            steitz: true
          }
        }
      });
    } else {
      console.log('Senha inválida para teste');
      return res.status(401).json({ 
        success: false, 
        message: 'Senha inválida para teste (use 123456)',
        received: { cnpj, password }
      });
    }
    
  } catch (error) {
    console.error('Erro na API minimal:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: error.message,
      stack: error.stack
    });
  }
};
