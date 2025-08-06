const syncClientes = require('./api/sync-clientes');

// Simular uma requisição HTTP
const mockReq = {
  method: 'POST'
};

const mockRes = {
  status: function(code) {
    console.log('Status:', code);
    return this;
  },
  json: function(data) {
    console.log('Resposta:', data);
    return this;
  }
};

console.log('Testando sincronização de clientes...');
syncClientes(mockReq, mockRes).then(() => {
  console.log('Teste concluído!');
}).catch(error => {
  console.error('Erro no teste:', error);
}); 