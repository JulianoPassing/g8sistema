// API para alteração de senha B2B
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Função para gerar hash da senha
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Função para verificar senha
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Função para carregar senhas
function loadPasswords() {
  const passwordsPath = path.join(process.cwd(), 'api', 'passwords-b2b.json');
  
  if (!fs.existsSync(passwordsPath)) {
    // Criar arquivo com senhas padrão se não existir
    const defaultPasswords = {};
    fs.writeFileSync(passwordsPath, JSON.stringify(defaultPasswords, null, 2));
    return defaultPasswords;
  }
  
  const data = fs.readFileSync(passwordsPath, 'utf8');
  return JSON.parse(data);
}

// Função para salvar senhas
function savePasswords(passwords) {
  const passwordsPath = path.join(process.cwd(), 'api', 'passwords-b2b.json');
  fs.writeFileSync(passwordsPath, JSON.stringify(passwords, null, 2));
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
    
    // Validação básica
    if (!cnpj || !senhaAtual || !novaSenha || !confirmarSenha) {
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
      senhaAtualValida = verifyPassword(senhaAtual, passwords[cnpjNormalizado]);
    } else {
      // Cliente ainda usa senha padrão
      senhaAtualValida = (senhaAtual === '123456');
    }
    
    if (!senhaAtualValida) {
      return res.status(401).json({ 
        success: false, 
        message: 'Senha atual incorreta' 
      });
    }
    
    // Salvar nova senha
    passwords[cnpjNormalizado] = hashPassword(novaSenha);
    savePasswords(passwords);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Senha alterada com sucesso!' 
    });
    
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};
