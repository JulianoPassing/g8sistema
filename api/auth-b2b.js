// API de autenticação B2B para clientes
const fs = require('fs');
const path = require('path');

// Função para definir acessos por cliente
function getAcessosCliente(cnpj) {
  // Normalizar CNPJ para comparação
  const cnpjNormalizado = cnpj.replace(/[.\-\/\s]/g, '');
  
  // CONFIGURAÇÃO DE ACESSO AO PANTANEIRO 5
  // PANTANEIRO 7 e STEITZ: Sempre liberados para todos
  // PANTANEIRO 5: Apenas clientes listados aqui
  const clientesComPantaneiro5 = [
    '30110818000128',  // G8 Representações
    '18786752000195',  // Jose Rodrigo Dutra Jorge
    '33462113000168',  // Isabela Rosa
    
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
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};
