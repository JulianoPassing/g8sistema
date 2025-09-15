const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Middleware de segurança e validação
const addSecurityHeaders = (res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
};

// Validação de dados
const validateClienteData = (data) => {
  const errors = [];
  
  if (!data.razao || data.razao.trim().length < 2) {
    errors.push('Razão social é obrigatória e deve ter pelo menos 2 caracteres');
  }
  
  if (data.cnpj && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/.test(data.cnpj)) {
    errors.push('CNPJ deve estar em formato válido');
  }
  
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Email deve estar em formato válido');
  }
  
  return errors;
};

// Logger melhorado
const logRequest = (req, additionalInfo = {}) => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    ...additionalInfo
  };
  console.log('API Request:', JSON.stringify(logData, null, 2));
};

module.exports = async (req, res) => {
  // Adicionar headers de segurança
  addSecurityHeaders(res);
  
  // Log da requisição
  logRequest(req, { 
    path: req.headers['x-vercel-path'],
    bodySize: req.body ? JSON.stringify(req.body).length : 0
  });

  // Função para carregar dados do arquivo JSON como fallback
  const carregarClientesJSON = () => {
    try {
      const jsonPath = path.join(__dirname, '../public/clientes.json');
      const data = fs.readFileSync(jsonPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao carregar clientes.json:', error);
      return [];
    }
  };

  let connection = null;
  let useJSON = false;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'julianopassing',
      password: process.env.DB_PASSWORD || 'Juliano@95',
      database: process.env.DB_NAME || 'sistemajuliano'
    });
  } catch (dbError) {
    console.log('Erro ao conectar com MySQL, usando arquivo JSON:', dbError.message);
    useJSON = true;
  }

  try {
    // Extrair ID da URL de forma mais robusta
    let id = null;
    
    // No Vercel, usar o header x-vercel-path que contém o path completo
    if (req.headers['x-vercel-path']) {
      const pathParts = req.headers['x-vercel-path'].split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && !isNaN(lastPart)) {
        id = lastPart;
        console.log('ID extraído do x-vercel-path:', id);
      }
    }
    
    // Fallback para req.url se x-vercel-path não estiver disponível
    if (!id && req.url) {
      // Remover query parameters e extrair o ID do path
      const urlWithoutQuery = req.url.split('?')[0];
      const urlParts = urlWithoutQuery.split('/');
      const lastPart = urlParts[urlParts.length - 1];
      if (lastPart && !isNaN(lastPart)) {
        id = lastPart;
        console.log('ID extraído da URL (sem query):', id);
      }
    }

    console.log('ID final extraído:', id);

    if (req.method === 'POST') {
      // Validar dados de entrada
      const validationErrors = validateClienteData(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Dados inválidos', 
          details: validationErrors 
        });
      }

      const {
        razao, cnpj, ie, endereco, bairro, cidade, estado, cep,
        email, telefone, transporte, prazo, obs
      } = req.body;

      // Sanitizar dados
      const sanitizedData = {
        razao: razao?.trim(),
        cnpj: cnpj?.replace(/\D/g, ''), // Remover caracteres não numéricos
        ie: ie?.trim(),
        endereco: endereco?.trim(),
        bairro: bairro?.trim(),
        cidade: cidade?.trim(),
        estado: estado?.trim(),
        cep: cep?.replace(/\D/g, ''),
        email: email?.toLowerCase().trim(),
        telefone: telefone?.replace(/\D/g, ''),
        transporte: transporte?.trim(),
        prazo: prazo?.trim(),
        obs: obs?.trim()
      };

      const [result] = await connection.execute(
        `INSERT INTO clientes (razao, cnpj, ie, endereco, bairro, cidade, estado, cep, email, telefone, transporte, prazo, obs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        Object.values(sanitizedData)
      );

      logRequest(req, { action: 'CREATE_CLIENT', clientId: result.insertId });
      res.status(201).json({ 
        id: result.insertId, 
        message: 'Cliente cadastrado com sucesso!',
        data: { id: result.insertId, ...sanitizedData }
      });
      return;
    }

    if (req.method === 'PUT' && id) {
      const {
        razao, cnpj, ie, endereco, bairro, cidade, estado, cep,
        email, telefone, transporte, prazo, obs
      } = req.body;

      console.log('Tentando atualizar cliente ID:', id);

      const [result] = await connection.execute(
        `UPDATE clientes SET razao=?, cnpj=?, ie=?, endereco=?, bairro=?, cidade=?, estado=?, cep=?, email=?, telefone=?, transporte=?, prazo=?, obs=? WHERE id=?`,
        [razao, cnpj, ie, endereco, bairro, cidade, estado, cep, email, telefone, transporte, prazo, obs, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.status(200).json({ message: 'Cliente atualizado com sucesso!' });
      return;
    }

    if (req.method === 'DELETE' && id) {
      console.log('Tentando deletar cliente ID:', id);
      
      const [result] = await connection.execute('DELETE FROM clientes WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.status(200).json({ message: 'Cliente removido com sucesso!' });
      return;
    }

    if (req.method === 'GET' && id) {
      // GET cliente específico
      console.log('Buscando cliente ID:', id);
      const [rows] = await connection.execute('SELECT * FROM clientes WHERE id = ?', [id]);
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      res.status(200).json(rows[0]);
      return;
    }

    // GET - listar todos os clientes (quando não há ID)
    if (req.method === 'GET') {
      if (useJSON) {
        const clientes = carregarClientesJSON();
        console.log(`Retornando ${clientes.length} clientes do arquivo JSON`);
        res.status(200).json(clientes);
        return;
      } else {
        const [rows] = await connection.execute('SELECT * FROM clientes ORDER BY id');
        res.status(200).json(rows);
        return;
      }
    }

    // Se chegou aqui, método não suportado
    res.status(405).json({ error: 'Método não suportado' });
  } catch (err) {
    console.error('Erro na API de clientes:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}; 