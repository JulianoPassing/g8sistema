module.exports = async (req, res) => {
  console.log('=== TESTE CLIENTES ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('=====================');
  
  // Simular uma resposta de sucesso para qualquer método
  res.status(200).json({
    message: 'Teste de clientes funcionando!',
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    timestamp: new Date().toISOString()
  });
};
