// API para alteração de senha B2B
const crypto = require('crypto');

// Função para gerar hash da senha
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Função para verificar senha
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Simulação de banco de dados em memória (para Vercel)
// Em produção, isso deveria ser um banco de dados real
let passwordsDatabase = {};

// Função para carregar senhas (simulada)
function loadPasswords() {
  console.log('Carregando senhas do banco em memória');
  return passwordsDatabase;
}

// Função para salvar senhas (simulada)
function savePasswords(passwords) {
  console.log('Salvando senhas no banco em memória');
  passwordsDatabase = { ...passwords };
  console.log('Senhas salvas com sucesso');
}

module.exports = async (req, res) => {
  // Headers de segurança
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { cnpj, senhaAtual, novaSenha, confirmarSenha } = req.body;
    console.log('Dados recebidos na API:', { cnpj, senhaAtual: senhaAtual ? '***' : 'vazio', novaSenha: novaSenha ? '***' : 'vazio', confirmarSenha: confirmarSenha ? '***' : 'vazio' });
    
    // Validação básica
    if (!cnpj || !senhaAtual || !novaSenha || !confirmarSenha) {
      console.log('Validação falhou - campos obrigatórios:', { cnpj: !!cnpj, senhaAtual: !!senhaAtual, novaSenha: !!novaSenha, confirmarSenha: !!confirmarSenha });
      return res.status(400).json({ 
        success: false, 
        message: 'Todos os campos são obrigatórios' 
      });
    }

    // Validar se as senhas coincidem
    if (novaSenha !== confirmarSenha) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nova senha e confirmação não coincidem' 
      });
    }

    // Validar tamanho da senha
    if (novaSenha.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'A nova senha deve ter pelo menos 6 caracteres' 
      });
    }

    // Normalizar CNPJ
    const cnpjNormalizado = cnpj.replace(/[.\-\/\s]/g, '');
    
    // Carregar senhas
    const passwords = loadPasswords();
    
    // Verificar senha atual
    let senhaAtualValida = false;
    
    if (passwords[cnpjNormalizado]) {
      // Cliente já tem senha personalizada
      console.log('Cliente tem senha personalizada');
      senhaAtualValida = verifyPassword(senhaAtual, passwords[cnpjNormalizado]);
    } else {
      // Cliente ainda usa senha padrão
      console.log('Cliente usa senha padrão');
      senhaAtualValida = (senhaAtual === '123456');
    }
    
    console.log('Senha atual válida:', senhaAtualValida);
    
    if (!senhaAtualValida) {
      return res.status(401).json({ 
        success: false, 
        message: 'Senha atual incorreta' 
      });
    }
    
    // Salvar nova senha
    console.log('Salvando nova senha para CNPJ:', cnpjNormalizado);
    passwords[cnpjNormalizado] = hashPassword(novaSenha);
    console.log('Hash da nova senha gerado');
    
    try {
      savePasswords(passwords);
      console.log('Senha alterada com sucesso para CNPJ:', cnpjNormalizado);
    } catch (saveError) {
      console.error('Erro ao salvar senhas:', saveError);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao salvar nova senha' 
      });
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Senha alterada com sucesso!' 
    });
    
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
