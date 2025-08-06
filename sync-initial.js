const syncClientes = require('./api/sync-clientes');

console.log('Iniciando sincronização inicial dos clientes...');
syncClientes().then(() => {
  console.log('Sincronização inicial concluída!');
  process.exit(0);
}).catch(error => {
  console.error('Erro na sincronização inicial:', error);
  process.exit(1);
}); 