// Endpoint de teste para auth-b2b
module.exports = async (req, res) => {
  // Headers CORS
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  console.log('=== TEST AUTH-B2B ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('====================');
  
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Teste auth-b2b funcionando!',
      method: req.method,
      timestamp: new Date().toISOString(),
      testData: {
        cnpj: '30.110.818/0001-28',
        password: 'gustavo'
      }
    });
  }
  
  if (req.method === 'POST') {
    const { cnpj, password } = req.body;
    
    return res.status(200).json({
      message: 'POST recebido com sucesso',
      received: {
        cnpj: cnpj,
        password: password,
        cnpjType: typeof cnpj,
        passwordType: typeof password
      },
      timestamp: new Date().toISOString()
    });
  }
  
  return res.status(405).json({ error: 'Método não permitido' });
};
