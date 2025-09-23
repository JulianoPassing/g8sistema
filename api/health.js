// Health check endpoint para verificar conectividade
module.exports = async (req, res) => {
  try {
    // Retornar resposta simples para indicar que o servidor está funcionando
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'Server is running'
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Server error' 
    });
  }
};
