const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function syncClientes() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'julianopassing',
    password: process.env.DB_PASSWORD || 'Juliano@95',
    database: process.env.DB_NAME || 'sistemajuliano'
  });

  try {
    // Buscar todos os clientes do banco de dados
    const [rows] = await connection.execute('SELECT * FROM clientes ORDER BY id');
    
    // Salvar no arquivo clientes.json
    const clientesPath = path.join(__dirname, '../public/clientes.json');
    await fs.writeFile(clientesPath, JSON.stringify(rows, null, 2), 'utf8');
    
    console.log(`Sincronização concluída! ${rows.length} clientes foram sincronizados.`);
  } catch (error) {
    console.error('Erro na sincronização:', error);
  } finally {
    await connection.end();
  }
}

// Executar sincronização se o script for chamado diretamente
if (require.main === module) {
  syncClientes();
}

module.exports = syncClientes; 