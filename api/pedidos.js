const mysql = require('mysql2/promise');
const emailNotification = require('./notifications/email');

// Cache para prevenir operações duplicadas
const operationCache = new Map();

// Limpar cache antigas (mais de 5 minutos)
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of operationCache.entries()) {
    if (now - timestamp > 5 * 60 * 1000) { // 5 minutos
      operationCache.delete(key);
    }
  }
}, 60 * 1000); // Verificar a cada minuto

module.exports = async (req, res) => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'julianopassing',
    password: process.env.DB_PASSWORD || 'Juliano@95',
    database: process.env.DB_NAME || 'sistemajuliano'
  });

  try {
    // Extrair ID da URL se presente (para /api/pedidos/123)
    const urlParts = req.url.split('/');
    const idFromUrl = urlParts[urlParts.length - 1];
    const isNumericId = /^\d+$/.test(idFromUrl);
    
    console.log('📍 Requisição:', req.method, req.url);
    console.log('📍 ID da URL:', idFromUrl, 'É numérico:', isNumericId);
    console.log('📍 Headers:', req.headers['x-operation-id'] || 'sem-id');
    console.log('📍 Body:', req.body);
    if (req.method === 'POST') {
      const { id, empresa, descricao, dados } = req.body;
      
      // VERIFICAÇÃO CRÍTICA: Se tem ID no POST, deveria ser PUT
      if (id) {
        console.error('❌ ERRO CRÍTICO: POST com ID detectado - deveria ser PUT!', {
          id: id,
          method: req.method,
          url: req.url
        });
        res.status(400).json({ 
          error: 'Erro: Tentativa de criar pedido com ID existente. Use PUT para atualizar.',
          receivedId: id,
          correctMethod: 'PUT'
        });
        return;
      }
      
      // PROTEÇÃO CONTRA CRIAÇÃO DUPLICADA: Verificar se já existe pedido com mesma descrição nos últimos 30 segundos
      if (descricao) {
        const [recentDuplicates] = await connection.execute(
          'SELECT id, data_pedido FROM pedidos WHERE descricao = ? AND data_pedido > DATE_SUB(NOW(), INTERVAL 30 SECOND)',
          [descricao]
        );
        
        if (recentDuplicates.length > 0) {
          console.error('❌ ERRO: Tentativa de criar pedido duplicado detectada!', {
            descricao: descricao.substring(0, 100) + '...',
            pedidoExistente: recentDuplicates[0].id,
            dataExistente: recentDuplicates[0].data_pedido
          });
          res.status(409).json({ 
            error: 'Pedido duplicado detectado. Um pedido idêntico foi criado recentemente.',
            existingId: recentDuplicates[0].id,
            suggestion: 'Use PUT para atualizar o pedido existente.'
          });
          return;
        }
      }
      
      // Garantir que não há valores undefined
      const empresaFinal = empresa !== undefined ? empresa : null;
      const descricaoFinal = descricao !== undefined ? descricao : null;
      const dadosFinal = dados !== undefined ? JSON.stringify(dados) : JSON.stringify({});
      
      const [result] = await connection.execute(
        `INSERT INTO pedidos (empresa, descricao, dados, data_pedido) VALUES (?, ?, ?, NOW())` ,
        [empresaFinal, descricaoFinal, dadosFinal]
      );
      
      // Enviar notificação por e-mail (não bloqueia a resposta)
      emailNotification.notifyNewOrder({
        id: result.insertId,
        empresa: empresaFinal,
        descricao: descricaoFinal,
        dados: dadosFinal,
        origem: 'normal'
      }).catch(err => {
        console.error('Erro ao enviar notificação por e-mail:', err);
      });
      
      res.status(201).json({ id: result.insertId, message: 'Pedido cadastrado com sucesso!' });
      return;
    }

    if (req.method === 'PUT') {
      const { id: idBody, empresa, descricao, dados, operationId: bodyOpId } = req.body;
      
      // Usar ID da URL se presente, senão usar do body
      const id = isNumericId ? parseInt(idFromUrl) : idBody;
      
      const operationId = req.headers['x-operation-id'] || bodyOpId || 'sem-id';
      console.log(`🔄 [${operationId}] PUT - ID da URL:`, idFromUrl, 'ID do Body:', idBody, 'ID final:', id);
      
      // PROTEÇÃO CONTRA OPERAÇÕES DUPLICADAS
      const cacheKey = `PUT_${id}_${operationId}`;
      if (operationCache.has(cacheKey)) {
        console.log(`🚫 [${operationId}] OPERAÇÃO DUPLICADA DETECTADA - ignorando:`, cacheKey);
        res.status(200).json({ success: true, message: 'Operação já processada (cache)', cached: true });
        return;
      }
      
      // Registrar operação no cache
      operationCache.set(cacheKey, Date.now());
      console.log(`📝 [${operationId}] Operação registrada no cache:`, cacheKey);
      
      // VERIFICAÇÃO CRÍTICA: Verificar se o pedido realmente existe antes de atualizar
      const [existingCheck] = await connection.execute(
        'SELECT id, empresa, descricao FROM pedidos WHERE id = ?',
        [id]
      );
      
      if (existingCheck.length === 0) {
        console.error(`❌ [${operationId}] ERRO: Tentativa de atualizar pedido inexistente:`, id);
        res.status(404).json({ error: 'Pedido não encontrado para atualização.' });
        return;
      }
      
      console.log(`✅ [${operationId}] Pedido existe, prosseguindo com UPDATE:`, existingCheck[0]);
      
      // Validar parâmetros obrigatórios
      if (!id) {
        console.error('❌ PUT - ID do pedido é obrigatório');
        res.status(400).json({ error: 'ID do pedido é obrigatório.' });
        return;
      }
      
      // Garantir que não há valores undefined
      const empresaFinal = empresa !== undefined ? empresa : null;
      const descricaoFinal = descricao !== undefined ? descricao : null;
      const dadosFinal = dados !== undefined ? JSON.stringify(dados) : JSON.stringify({});
      
      console.log(`🔄 [${operationId}] Executando UPDATE com parâmetros:`, {
        empresa: empresaFinal,
        descricao: descricaoFinal,
        dados: dadosFinal ? dadosFinal.substring(0, 100) + '...' : 'null',
        id: id
      });

      const [result] = await connection.execute(
        `UPDATE pedidos SET empresa = ?, descricao = ?, dados = ?, data_pedido = NOW() WHERE id = ?`,
        [empresaFinal, descricaoFinal, dadosFinal, id]
      );
      
      console.log(`✅ [${operationId}] Resultado do UPDATE:`, {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
        insertId: result.insertId
      });
      
      if (result.affectedRows === 0) {
        console.error('❌ Nenhuma linha afetada - Pedido não encontrado:', id);
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      
      console.log(`✅ [${operationId}] Pedido atualizado com sucesso:`, id);
      res.status(200).json({ success: true, message: 'Pedido atualizado com sucesso!' });
      return;
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) {
        res.status(400).json({ error: 'ID do pedido é obrigatório.' });
        return;
      }
      await connection.execute('DELETE FROM pedidos WHERE id = ?', [id]);
      res.status(200).json({ message: 'Pedido cancelado/removido com sucesso!' });
      return;
    }

    // GET - listar todos os pedidos
    const [rows] = await connection.execute('SELECT * FROM pedidos ORDER BY data_pedido DESC');
    // Parse o campo dados para JSON, se existir
    const pedidos = rows.map(row => ({
      ...row,
      dados: row.dados ? JSON.parse(row.dados) : null
    }));
    res.status(200).json(pedidos);
  } catch (err) {
    console.error('Erro na API de pedidos:', err);
    res.status(500).json({ error: err.message });
  } finally {
    try {
      if (connection) {
        await connection.end();
      }
    } catch (closeErr) {
      console.error('Erro ao fechar conexão:', closeErr);
    }
  }
}; 