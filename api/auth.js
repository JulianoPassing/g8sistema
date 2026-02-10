// API de autenticação - mais segura que expor senhas no frontend
const validUsers = {
    g8: "repres",
    juliano: "123456", 
    gustavo: "123456",
    escritorio: "123456",
};

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
    const { username, password } = req.body;
    
    // Validação básica
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Usuário e senha são obrigatórios' 
      });
    }

    // Verificar credenciais
    if (validUsers[username] && validUsers[username] === password) {
      return res.status(200).json({ 
        success: true, 
        message: 'Login realizado com sucesso',
        user: username 
      });
    } else {
      // Delay pequeno para prevenir ataques de força bruta
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ 
        success: false, 
        message: 'Usuário ou senha inválidos' 
      });
    }
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};
