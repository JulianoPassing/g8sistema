// API de autenticação B2B para clientes
const fs = require('fs');
const path = require('path');

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

    // Verificar senha padrão
    if (password !== '123456') {
      // Delay pequeno para prevenir ataques de força bruta
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ 
        success: false, 
        message: 'Senha inválida' 
      });
    }

    // Carregar lista de clientes
    const clientesPath = path.join(process.cwd(), 'public', 'clientes.json');
    const clientesData = fs.readFileSync(clientesPath, 'utf8');
    const clientes = JSON.parse(clientesData);
    
    // Normalizar CNPJ (remover pontos, barras e espaços)
    const cnpjNormalizado = cnpj.replace(/[.\-\/\s]/g, '');
    
    // Buscar cliente pelo CNPJ
    const cliente = clientes.find(c => {
      const clienteCnpj = c.cnpj ? c.cnpj.replace(/[.\-\/\s]/g, '') : '';
      return clienteCnpj === cnpjNormalizado;
    });
    
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
          // Controle de acesso às tabelas - por padrão todos têm acesso a todas
          // Pode ser personalizado por cliente no futuro
          acessos: {
            pantaneiro5: true,
            pantaneiro7: true,
            steitz: true
          }
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
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};
