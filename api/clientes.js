const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

module.exports = async (req, res) => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'julianopassing',
    password: process.env.DB_PASSWORD || 'Juliano@95',
    database: process.env.DB_NAME || 'sistemajuliano'
  });

  try {
    // Rota para sincronizar clientes do banco para JSON
    if (req.method === 'POST' && req.url.includes('sync=true')) {
      const [rows] = await connection.execute('SELECT * FROM clientes ORDER BY id');
      const clientesPath = path.join(__dirname, '../public/clientes.json');
      await fs.writeFile(clientesPath, JSON.stringify(rows, null, 2), 'utf8');
      res.status(200).json({ message: `Sincronização concluída! ${rows.length} clientes sincronizados.` });
      return;
    }

    if (req.method === 'POST') {
      const {
        razao, cnpj, ie, endereco, bairro, cidade, estado, cep,
        email, telefone, transporte, prazo, obs
      } = req.body;

      const [result] = await connection.execute(
        `INSERT INTO clientes (razao, cnpj, ie, endereco, bairro, cidade, estado, cep, email, telefone, transporte, prazo, obs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [razao, cnpj, ie, endereco, bairro, cidade, estado, cep, email, telefone, transporte, prazo, obs]
      );

      // Atualizar o arquivo clientes.json
      try {
        const clientesPath = path.join(__dirname, '../public/clientes.json');
        const novoCliente = {
          id: result.insertId,
          razao, cnpj, ie, endereco, bairro, cidade, estado, cep,
          email, telefone, transporte, prazo, obs
        };

        // Ler clientes existentes
        let clientes = [];
        try {
          const data = await fs.readFile(clientesPath, 'utf8');
          clientes = JSON.parse(data);
        } catch (error) {
          // Se o arquivo não existir ou estiver vazio, começar com array vazio
          clientes = [];
        }

        // Adicionar novo cliente
        clientes.push(novoCliente);

        // Salvar arquivo atualizado
        await fs.writeFile(clientesPath, JSON.stringify(clientes, null, 2), 'utf8');
      } catch (error) {
        console.error('Erro ao atualizar clientes.json:', error);
        // Não falhar se não conseguir atualizar o JSON
      }

      res.status(201).json({ id: result.insertId, message: 'Cliente cadastrado com sucesso!' });
      return;
    }

    if (req.method === 'PUT') {
      const id = req.url.split('/').pop();
      const {
        razao, cnpj, ie, endereco, bairro, cidade, estado, cep,
        email, telefone, transporte, prazo, obs
      } = req.body;

      await connection.execute(
        `UPDATE clientes SET razao=?, cnpj=?, ie=?, endereco=?, bairro=?, cidade=?, estado=?, cep=?, email=?, telefone=?, transporte=?, prazo=?, obs=? WHERE id=?`,
        [razao, cnpj, ie, endereco, bairro, cidade, estado, cep, email, telefone, transporte, prazo, obs, id]
      );

      // Atualizar o arquivo clientes.json
      try {
        const clientesPath = path.join(__dirname, '../public/clientes.json');
        let clientes = [];
        
        try {
          const data = await fs.readFile(clientesPath, 'utf8');
          clientes = JSON.parse(data);
        } catch (error) {
          clientes = [];
        }

        // Atualizar cliente no array
        const index = clientes.findIndex(c => c.id == id);
        if (index !== -1) {
          clientes[index] = {
            id: parseInt(id),
            razao, cnpj, ie, endereco, bairro, cidade, estado, cep,
            email, telefone, transporte, prazo, obs
          };
          await fs.writeFile(clientesPath, JSON.stringify(clientes, null, 2), 'utf8');
        }
      } catch (error) {
        console.error('Erro ao atualizar clientes.json:', error);
      }

      res.status(200).json({ message: 'Cliente atualizado com sucesso!' });
      return;
    }

    if (req.method === 'DELETE') {
      const id = req.url.split('/').pop();
      
      await connection.execute('DELETE FROM clientes WHERE id = ?', [id]);

      // Atualizar o arquivo clientes.json
      try {
        const clientesPath = path.join(__dirname, '../public/clientes.json');
        let clientes = [];
        
        try {
          const data = await fs.readFile(clientesPath, 'utf8');
          clientes = JSON.parse(data);
        } catch (error) {
          clientes = [];
        }

        // Remover cliente do array
        clientes = clientes.filter(c => c.id != id);
        await fs.writeFile(clientesPath, JSON.stringify(clientes, null, 2), 'utf8');
      } catch (error) {
        console.error('Erro ao atualizar clientes.json:', error);
      }

      res.status(200).json({ message: 'Cliente removido com sucesso!' });
      return;
    }

    // GET - listar todos os clientes
    const [rows] = await connection.execute('SELECT * FROM clientes');
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await connection.end();
  }
}; 