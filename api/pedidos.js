const mysql = require('mysql2/promise');
const emailNotification = require('./notifications/email');

function parseDadosJson(raw) {
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

/** Coluna `enviado_producao` é opcional; senão usa `dados.enviado_producao`. Padrão 1 = legado (considerado enviado). */
function resolveEnviadoProducao(row, dadosParsed) {
  if (row.enviado_producao !== undefined && row.enviado_producao !== null) {
    return row.enviado_producao === 1 || row.enviado_producao === true ? 1 : 0;
  }
  if (dadosParsed && dadosParsed.enviado_producao !== undefined && dadosParsed.enviado_producao !== null) {
    const v = dadosParsed.enviado_producao;
    return v === true || v === 1 || v === '1' ? 1 : 0;
  }
  return 1;
}

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
    database: process.env.DB_NAME || 'sistemajuliano',
    // Evita o handler preso no await createConnection (Vercel → MySQL remoto sem rota clara = TCP longo)
    connectTimeout: 20000
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
      
      // PROTEÇÃO CONTRA CRIAÇÃO DUPLICADA: Verificar CNPJ + valor no mesmo dia
      // (evita duplicatas quando mobile reporta offline mas o pedido já foi enviado)
      // Pular essa verificação quando for duplicação intencional (botão Duplicar)
      const isDuplicacaoIntentional = (req.headers['x-duplicate-pedido'] || '').toLowerCase() === 'true';
      
      if (dados && !isDuplicacaoIntentional) {
        let dadosParsed;
        try {
          dadosParsed = typeof dados === 'string' ? JSON.parse(dados) : dados;
        } catch (e) {
          dadosParsed = {};
        }
        const cnpjCliente = dadosParsed?.cliente?.cnpj;
        const valorTotal = dadosParsed?.total;
        
        if (cnpjCliente && (valorTotal !== undefined && valorTotal !== null)) {
          const cnpjNormalizado = String(cnpjCliente).replace(/\D/g, '');
          const valorNumerico = parseFloat(valorTotal);
          
          if (cnpjNormalizado.length >= 14 && !isNaN(valorNumerico)) {
            const [recentDuplicates] = await connection.execute(
              `SELECT id, data_pedido, dados FROM pedidos 
               WHERE DATE(data_pedido) = CURDATE() AND empresa = ?`,
              [empresa || '']
            );
            
            const duplicata = recentDuplicates.find(row => {
              let dadosRow = {};
              try {
                dadosRow = typeof row.dados === 'string' ? JSON.parse(row.dados) : (row.dados || {});
              } catch (e) { return false; }
              const cnpjExistente = String(dadosRow?.cliente?.cnpj || '').replace(/\D/g, '');
              const valorExistente = parseFloat(dadosRow?.total);
              return cnpjExistente === cnpjNormalizado && 
                     !isNaN(valorExistente) && 
                     Math.abs(valorExistente - valorNumerico) < 0.01;
            });
            
            if (duplicata) {
              console.error('❌ ERRO: Pedido duplicado detectado (CNPJ + valor no mesmo dia)!', {
                cnpj: cnpjNormalizado,
                valor: valorNumerico,
                pedidoExistente: duplicata.id,
                dataExistente: duplicata.data_pedido
              });
              res.status(409).json({ 
                error: 'Pedido duplicado detectado. Já existe um pedido com este cliente e valor hoje.',
                existingId: duplicata.id,
                suggestion: 'Use PUT para atualizar o pedido existente.'
              });
              return;
            }
          }
        }
      }
      
      const empresaFinal = empresa !== undefined ? empresa : null;
      const descricaoFinal = descricao !== undefined ? descricao : null;

      let dadosObj = {};
      if (dados !== undefined) {
        try {
          dadosObj = typeof dados === 'string' ? JSON.parse(dados) : { ...dados };
        } catch (e) {
          dadosObj = {};
        }
      }
      const enviadoProducao =
        req.body && req.body.enviado_producao !== undefined && req.body.enviado_producao !== null
          ? req.body.enviado_producao === true || req.body.enviado_producao === 1 || req.body.enviado_producao === '1'
            ? 1
            : 0
          : 0;
      dadosObj.enviado_producao = enviadoProducao;

      const dadosFinal = JSON.stringify(dadosObj);

      const [result] = await connection.execute(
        `INSERT INTO pedidos (empresa, descricao, dados, data_pedido) VALUES (?, ?, ?, NOW())`,
        [empresaFinal, descricaoFinal, dadosFinal]
      );

      // Responder logo após gravar no banco. Aguardar SMTP (Gmail) costuma estourar o limite de tempo
      // das funções serverless no Vercel e o cliente fica eternamente em "carregando".
      res.status(201).json({ id: result.insertId, message: 'Pedido cadastrado com sucesso!' });

      void emailNotification
        .notifyNewOrder({
          id: result.insertId,
          empresa: empresaFinal,
          descricao: descricaoFinal,
          dados: dadosFinal,
          origem: 'normal'
        })
        .catch((err) => console.error('Erro ao enviar notificação por e-mail:', err));
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
        'SELECT id, empresa, descricao, dados FROM pedidos WHERE id = ?',
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
      
      const empresaFinal = empresa !== undefined ? empresa : null;
      const descricaoFinal = descricao !== undefined ? descricao : null;

      let dadosFinal;
      if (dados !== undefined) {
        let dadosObj = {};
        try {
          dadosObj = typeof dados === 'string' ? JSON.parse(dados) : { ...dados };
        } catch (e) {
          dadosObj = {};
        }
        const prevDados = parseDadosJson(existingCheck[0].dados);
        if (prevDados && dadosObj.enviado_producao === undefined && prevDados.enviado_producao !== undefined) {
          dadosObj.enviado_producao = prevDados.enviado_producao;
        }
        dadosFinal = JSON.stringify(dadosObj);
      } else {
        dadosFinal = JSON.stringify({});
      }

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

      void emailNotification
        .notifyOrderUpdated({
          id: id,
          empresa: empresaFinal,
          descricao: descricaoFinal,
          dados: dadosFinal,
          origem: 'normal'
        })
        .catch((err) => console.error('Erro ao enviar notificação de atualização por e-mail:', err));
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

    if (req.method === 'PATCH') {
      let body = req.body || {};
      if (typeof req.body === 'string') {
        try {
          body = JSON.parse(req.body || '{}');
        } catch (e) {
          body = {};
        }
      }
      const id = body.id;
      if (!id) {
        res.status(400).json({ error: 'ID do pedido é obrigatório.' });
        return;
      }
      if (body.enviado_producao === undefined || body.enviado_producao === null) {
        res.status(400).json({ error: 'enviado_producao é obrigatório (0 ou 1).' });
        return;
      }
      const enviadoVal =
        body.enviado_producao === true || body.enviado_producao === 1 || body.enviado_producao === '1' ? 1 : 0;

      const [patchRows] = await connection.execute('SELECT id, dados FROM pedidos WHERE id = ?', [id]);
      if (patchRows.length === 0) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      let dadosPatch = parseDadosJson(patchRows[0].dados) || {};
      dadosPatch.enviado_producao = enviadoVal;
      const [patchResult] = await connection.execute('UPDATE pedidos SET dados = ? WHERE id = ?', [
        JSON.stringify(dadosPatch),
        id
      ]);
      if (patchResult.affectedRows === 0) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      res.status(200).json({ success: true, id, enviado_producao: enviadoVal });
      return;
    }

    // GET - listar todos os pedidos
    const [rows] = await connection.execute('SELECT * FROM pedidos ORDER BY data_pedido DESC');
    const pedidos = rows.map(row => {
      const dadosParsed = parseDadosJson(row.dados);
      const enviado_producao = resolveEnviadoProducao(row, dadosParsed);
      return {
        ...row,
        dados: dadosParsed,
        enviado_producao
      };
    });
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