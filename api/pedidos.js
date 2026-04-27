const zlib = require('zlib');
const { promisify } = require('util');
const gunzipAsync = promisify(zlib.gunzip);
const mysql = require('mysql2/promise');
const emailNotification = require('./notifications/email');

async function maybeDecompressBodyAsync(body) {
  if (!body || typeof body !== 'object' || typeof body._v1GzipB64 !== 'string') {
    return body;
  }
  const u8 = await gunzipAsync(Buffer.from(body._v1GzipB64, 'base64'));
  return JSON.parse(u8.toString('utf8'));
}

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

function cleanupOperationCache() {
  const now = Date.now();
  for (const [key, timestamp] of operationCache.entries()) {
    if (now - timestamp > 5 * 60 * 1000) { // 5 minutos
      operationCache.delete(key);
    }
  }
}

function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error(`${label} excedeu ${ms}ms`);
      err.code = 'OP_TIMEOUT';
      reject(err);
    }, ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ]);
}

/** Evita logar req.body inteiro em PUT (pedidos grandes travam a função serverless). */
function resumoBodyPedido(body) {
  if (body == null) return '(null)';
  if (typeof body !== 'object') return String(body).slice(0, 120);
  const keys = Object.keys(body);
  let nItens = '';
  try {
    const d = body.dados;
    if (d && typeof d === 'object' && Array.isArray(d.itens)) {
      nItens = ` itens=${d.itens.length}`;
    }
  } catch (e) {
    /* ignore */
  }
  return `keys=[${keys.join(',')}]${nItens}`;
}

/** Nunca logar a linha inteira: `dados` em pedidos grandes vira centenas de MB e estoura o tempo da função (504). */
function resumoRowPedidoMySQL(row) {
  if (!row || typeof row !== 'object') return String(row);
  const d = row.dados;
  return {
    id: row.id,
    empresa: row.empresa,
    descricaoLen: row.descricao != null ? String(row.descricao).length : 0,
    dadosColChars: d != null ? String(d).length : 0,
    prevEnviadoRaw: row._prevEnv
  };
}

function normalizarEnviadoProducaoDb(val) {
  if (val == null) return undefined;
  const s = String(val).toLowerCase();
  if (s === 'null' || s === '') return undefined;
  if (val === 1 || val === true || s === '1' || s === 'true') return 1;
  if (val === 0 || val === false || s === '0' || s === 'false') return 0;
  return undefined;
}

// Pool reutilizável: cada createConnection no cold start costuma 1–5s+ e no Hobby (limite ~10s)
// a requisição vira 504 antes de concluir. O pool quente nas próximas invocações pula isso.
function getPool() {
  const g = global;
  if (!g.__g8PedidosMysqlPool) {
    g.__g8PedidosMysqlPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'julianopassing',
      password: process.env.DB_PASSWORD || 'Juliano@95',
      database: process.env.DB_NAME || 'sistemajuliano',
      waitForConnections: true,
      connectionLimit: 3,
      queueLimit: 0,
      connectTimeout: 8000,
      enableKeepAlive: true
    });
  }
  return g.__g8PedidosMysqlPool;
}

module.exports = async (req, res) => {
  let connection;
  try {
    cleanupOperationCache();

    if (req.body && typeof req.body === 'object' && typeof req.body._v1GzipB64 === 'string') {
      try {
        req.body = await maybeDecompressBodyAsync(req.body);
      } catch (e) {
        console.error('Corpo compactado inválido:', e && e.message);
        res.status(400).json({ error: 'Corpo JSON compactado inválido.' });
        return;
      }
    }

    const pool = getPool();
    connection = await withTimeout(pool.getConnection(), 5000, 'Obter conexão do pool');
    // Extrair ID da URL se presente (para /api/pedidos/123)
    const urlParts = req.url.split('/');
    const idFromUrl = urlParts[urlParts.length - 1];
    const isNumericId = /^\d+$/.test(idFromUrl);
    
    console.log('📍 Requisição:', req.method, req.url);
    console.log('📍 ID da URL:', idFromUrl, 'É numérico:', isNumericId);
    console.log('📍 Headers:', req.headers['x-operation-id'] || 'sem-id');
    console.log('📍 Body:', resumoBodyPedido(req.body));
    if (req.method === 'POST') {
      const isDuplicacaoIntentional = (req.headers['x-duplicate-pedido'] || '').toLowerCase() === 'true';
      const duplicateFromHeader = req.headers['x-duplicate-from-id'];
      const duplicateFromId =
        duplicateFromHeader !== undefined && duplicateFromHeader !== null && String(duplicateFromHeader).trim() !== ''
          ? parseInt(String(duplicateFromHeader).trim(), 10)
          : NaN;

      // Duplicação pelo botão: copia a linha no MySQL (INSERT…SELECT) — não reenvia JSON enorme
      // pelo corpo; isso evita timeout de minutos em pedidos grandes (Vercel → banco remoto).
      if (isDuplicacaoIntentional && Number.isFinite(duplicateFromId) && duplicateFromId > 0) {
        const [srcRows] = await withTimeout(
          connection.execute('SELECT id, empresa, descricao, dados FROM pedidos WHERE id = ? LIMIT 1', [
            duplicateFromId
          ]),
          20000,
          'Busca pedido origem (duplicação)'
        );
        if (!srcRows.length) {
          res.status(404).json({
            error: 'Pedido origem não encontrado para duplicação.',
            code: 'SOURCE_NOT_FOUND'
          });
          return;
        }

        const [ins] = await withTimeout(
          connection.execute(
            `INSERT INTO pedidos (empresa, descricao, dados, data_pedido)
             SELECT
               empresa,
               descricao,
               JSON_SET(
                 IFNULL(NULLIF(TRIM(IFNULL(dados, '')), ''), '{}'),
                 '$.enviado_producao',
                 0
               ),
               NOW()
             FROM pedidos WHERE id = ?`,
            [duplicateFromId]
          ),
          60000,
          'Duplicação (INSERT…SELECT + JSON_SET, MariaDB)'
        );
        const newId = ins.insertId;
        if (!newId) {
          res.status(500).json({ error: 'Falha ao obter id da duplicata.', code: 'INSERT_NO_ID' });
          return;
        }

        // E-mail: mesmo ajuste em memória (evita outro SELECT/UPDATE no banco, que ainda dava timeout)
        const dadosObjEmail = parseDadosJson(srcRows[0].dados) || {};
        dadosObjEmail.enviado_producao = 0;
        const dadosFinalDup = JSON.stringify(dadosObjEmail);

        res.status(201).json({ id: newId, message: 'Pedido duplicado com sucesso!' });

        void emailNotification
          .notifyNewOrder({
            id: newId,
            empresa: srcRows[0].empresa,
            descricao: srcRows[0].descricao,
            dados: dadosFinalDup,
            origem: 'normal'
          })
          .catch((err) => console.error('Erro ao enviar notificação por e-mail (duplicata):', err));
        return;
      }

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
            const [recentDuplicates] = await withTimeout(connection.execute(
              `SELECT id, data_pedido, dados FROM pedidos 
               WHERE DATE(data_pedido) = CURDATE() AND empresa = ?`,
              [empresa || '']
            ), 30000, 'Consulta de duplicidade');
            
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

      const [result] = await withTimeout(connection.execute(
        `INSERT INTO pedidos (empresa, descricao, dados, data_pedido) VALUES (?, ?, ?, NOW())`,
        [empresaFinal, descricaoFinal, dadosFinal]
      ), 90000, 'Inserção de pedido');

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
      
      // Evitar SELECT de `dados` inteiro (pode ser enorme) — só puxamos o campo usado no merge
      let existingCheck;
      try {
        [existingCheck] = await withTimeout(
          connection.execute(
            `SELECT id, empresa, descricao, JSON_UNQUOTE(JSON_EXTRACT(dados, '$.enviado_producao')) AS _prevEnv
             FROM pedidos WHERE id = ?`,
            [id]
          ),
          30000,
          'Busca de pedido existente (leve)'
        );
      } catch (sqlErr) {
        console.warn(
          `⚠️ [${operationId}] SELECT leve falhou, usando SELECT completo (JSON inválido no banco?)`,
          sqlErr && sqlErr.message
        );
        [existingCheck] = await withTimeout(
          connection.execute('SELECT id, empresa, descricao, dados FROM pedidos WHERE id = ?', [id]),
          30000,
          'Busca de pedido existente (fallback)'
        );
      }
      
      if (existingCheck.length === 0) {
        console.error(`❌ [${operationId}] ERRO: Tentativa de atualizar pedido inexistente:`, id);
        res.status(404).json({ error: 'Pedido não encontrado para atualização.' });
        return;
      }
      
      console.log(`✅ [${operationId}] Pedido OK (resumo, sem coluna dados):`, resumoRowPedidoMySQL(existingCheck[0]));
      
      // Validar parâmetros obrigatórios
      if (!id) {
        console.error('❌ PUT - ID do pedido é obrigatório');
        res.status(400).json({ error: 'ID do pedido é obrigatório.' });
        return;
      }
      
      const empresaFinal = empresa !== undefined ? empresa : null;
      const descricaoFinal = descricao !== undefined ? descricao : null;

      let dadosFinal;
      let emailDadosResumo;
      if (dados !== undefined) {
        let dadosObj = {};
        try {
          dadosObj = typeof dados === 'string' ? JSON.parse(dados) : { ...dados };
        } catch (e) {
          dadosObj = {};
        }
        if (dadosObj.enviado_producao === undefined) {
          const ex0 = existingCheck[0];
          const fromJsonPath = normalizarEnviadoProducaoDb(ex0._prevEnv);
          if (fromJsonPath !== undefined) {
            dadosObj.enviado_producao = fromJsonPath;
          } else if (ex0.dados != null) {
            const prevDados = parseDadosJson(ex0.dados);
            if (prevDados && prevDados.enviado_producao !== undefined) {
              dadosObj.enviado_producao = prevDados.enviado_producao;
            }
          }
        }
        // Observações: mesmo texto em cliente.obs e dados.observacoes (sistemas antigos divergiam)
        if (!dadosObj.cliente) dadosObj.cliente = {};
        const trimObs = (v) => {
          if (v == null) return null;
          const s = String(v).trim();
          return s === '' ? null : s;
        };
        const obsUnico = trimObs(dadosObj.cliente.obs) ?? trimObs(dadosObj.observacoes);
        dadosObj.cliente.obs = obsUnico;
        dadosObj.observacoes = obsUnico;
        dadosFinal = JSON.stringify(dadosObj);
        // Não reparsear o JSON enorme no notificador (evita travar a função após o 200)
        emailDadosResumo = {
          origem: dadosObj.origem || 'normal',
          clienteNome: dadosObj.clienteNome || (dadosObj.cliente && dadosObj.cliente.razao) || 'Cliente não identificado',
          observacoes: dadosObj.observacoes || 'Sem observações'
        };
      } else {
        dadosFinal = JSON.stringify({});
        emailDadosResumo = {
          origem: 'normal',
          clienteNome: 'Cliente não identificado',
          observacoes: 'Sem observações'
        };
      }

      console.log(`🔄 [${operationId}] Executando UPDATE com parâmetros:`, {
        empresa: empresaFinal,
        descricao: descricaoFinal,
        dados: dadosFinal ? dadosFinal.substring(0, 100) + '...' : 'null',
        id: id
      });

      const [result] = await withTimeout(connection.execute(
        `UPDATE pedidos SET empresa = ?, descricao = ?, dados = ?, data_pedido = NOW() WHERE id = ?`,
        [empresaFinal, descricaoFinal, dadosFinal, id]
      ), 90000, 'Atualização de pedido');
      
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
          dados: emailDadosResumo,
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
      await withTimeout(connection.execute('DELETE FROM pedidos WHERE id = ?', [id]), 30000, 'Exclusão de pedido');
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

      const [patchRows] = await withTimeout(connection.execute('SELECT id, dados FROM pedidos WHERE id = ?', [id]), 30000, 'Busca para patch');
      if (patchRows.length === 0) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      let dadosPatch = parseDadosJson(patchRows[0].dados) || {};
      dadosPatch.enviado_producao = enviadoVal;
      const [patchResult] = await withTimeout(connection.execute('UPDATE pedidos SET dados = ? WHERE id = ?', [
        JSON.stringify(dadosPatch),
        id
      ]), 30000, 'Patch de pedido');
      if (patchResult.affectedRows === 0) {
        res.status(404).json({ error: 'Pedido não encontrado.' });
        return;
      }
      res.status(200).json({ success: true, id, enviado_producao: enviadoVal });
      return;
    }

    // GET - listar todos os pedidos
    const [rows] = await withTimeout(connection.execute('SELECT * FROM pedidos ORDER BY data_pedido DESC'), 30000, 'Listagem de pedidos');
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
    if (!res.headersSent) {
      const isTimeout = err && err.code === 'OP_TIMEOUT';
      res.status(isTimeout ? 504 : 500).json({
        error: err.message || (isTimeout ? 'Tempo limite excedido em operação do banco' : 'Erro interno'),
        code: err && err.code ? err.code : (isTimeout ? 'OP_TIMEOUT' : 'INTERNAL_ERROR')
      });
    }
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (e) {
        console.error('Erro ao liberar conexão do pool:', e);
      }
    }
  }
}; 