// API de autenticação B2B para clientes
const fs = require('fs');
const path = require('path');
const { loadPasswords, verifyPassword } = require('./passwords-shared');

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

    // Verificar senha (padrão ou personalizada)
    const passwords = loadPasswords();
    const cnpjNormalizado = cnpj.replace(/[.\-\/\s]/g, '');
    
    console.log('Senhas carregadas:', Object.keys(passwords));
    console.log('CNPJ normalizado:', cnpjNormalizado);
    console.log('Cliente tem senha personalizada:', !!passwords[cnpjNormalizado]);
    
    let senhaValida = false;
    
    if (passwords[cnpjNormalizado]) {
      // Cliente tem senha personalizada
      console.log('Verificando senha personalizada');
      senhaValida = verifyPassword(password, passwords[cnpjNormalizado]);
    } else {
      // Cliente ainda usa senha padrão
      console.log('Verificando senha padrão');
      senhaValida = (password === '123456');
    }
    
    console.log('Senha válida:', senhaValida);
    
    if (!senhaValida) {
      // Delay pequeno para prevenir ataques de força bruta
      await new Promise(resolve => setTimeout(resolve, 1000));
      return res.status(401).json({ 
        success: false, 
        message: 'Senha inválida' 
      });
    }

    // Carregar lista de clientes
    const clientesPath = path.join(process.cwd(), 'public', 'clientes.json');
    
    if (!fs.existsSync(clientesPath)) {
      console.error('Arquivo clientes.json não encontrado:', clientesPath);
      return res.status(500).json({ 
        success: false, 
        message: 'Arquivo de clientes não encontrado' 
      });
    }
    
    let clientesData;
    let clientes;
    
    try {
      clientesData = fs.readFileSync(clientesPath, 'utf8');
      clientes = JSON.parse(clientesData);
    } catch (fileError) {
      console.error('Erro ao carregar ou fazer parse do clientes.json:', fileError);
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar arquivo de clientes' 
      });
    }
    
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
    console.error('Stack trace:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
