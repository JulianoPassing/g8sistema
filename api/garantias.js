const { getConnectionWithRetry } = require('./mysql-pool');

function getQuery(req) {
  try {
    const raw = req.url || '';
    const qIdx = raw.indexOf('?');
    const search = qIdx >= 0 ? raw.slice(qIdx) : '';
    const u = new URL(search || '', 'http://garantias.local');
    const out = {};
    u.searchParams.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  } catch {
    return {};
  }
}

function parseDadosJson(raw) {
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function resolveEnviado(row, dadosParsed) {
  if (row.enviado !== undefined && row.enviado !== null) {
    return row.enviado === 1 || row.enviado === true ? 1 : 0;
  }
  if (dadosParsed && dadosParsed.enviado !== undefined && dadosParsed.enviado !== null) {
    const v = dadosParsed.enviado;
    return v === true || v === 1 || v === '1' ? 1 : 0;
  }
  return 0;
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
  return Promise.race([promise.finally(() => clearTimeout(timeoutId)), timeoutPromise]);
}

async function ensureTable(connection) {
  await withTimeout(
    connection.execute(`
      CREATE TABLE IF NOT EXISTS garantias (
        id INT AUTO_INCREMENT PRIMARY KEY,
        empresa VARCHAR(100) NULL,
        descricao TEXT NULL,
        dados LONGTEXT NULL,
        data_garantia DATETIME NULL,
        enviado TINYINT(1) NOT NULL DEFAULT 0,
        INDEX idx_garantias_data (data_garantia),
        INDEX idx_garantias_empresa (empresa),
        INDEX idx_garantias_enviado (enviado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `),
    30000,
    'Criação tabela garantias'
  );
}

function mapGarantiaRow(row) {
  const dadosParsed = parseDadosJson(row.dados);
  return {
    ...row,
    dados: dadosParsed,
    enviado: resolveEnviado(row, dadosParsed)
  };
}

module.exports = async (req, res) => {
  let connection;
  try {
    connection = await getConnectionWithRetry();
    await ensureTable(connection);

    const urlPath = String(req.url || '').split('?')[0];
    const urlParts = urlPath.split('/').filter(Boolean);
    const idFromUrl = urlParts[urlParts.length - 1] || '';
    const isNumericId = /^\d+$/.test(idFromUrl) && urlParts[urlParts.length - 2] === 'garantias';

    if (req.method === 'POST') {
      const { empresa, descricao, dados } = req.body || {};
      if (req.body && req.body.id) {
        res.status(400).json({
          error: 'Não envie ID no POST. Use PUT para atualizar.',
          correctMethod: 'PUT'
        });
        return;
      }

      let dadosObj = {};
      if (dados !== undefined) {
        try {
          dadosObj = typeof dados === 'string' ? JSON.parse(dados) : { ...dados };
        } catch {
          dadosObj = {};
        }
      }

      const enviadoVal =
        req.body && req.body.enviado !== undefined && req.body.enviado !== null
          ? req.body.enviado === true || req.body.enviado === 1 || req.body.enviado === '1'
            ? 1
            : 0
          : 0;
      dadosObj.enviado = enviadoVal;

      const empresaFinal = empresa != null ? String(empresa) : null;
      const descricaoFinal = descricao != null ? String(descricao) : null;
      const dadosFinal = JSON.stringify(dadosObj);

      const [result] = await withTimeout(
        connection.execute(
          `INSERT INTO garantias (empresa, descricao, dados, data_garantia, enviado) VALUES (?, ?, ?, NOW(), ?)`,
          [empresaFinal, descricaoFinal, dadosFinal, enviadoVal]
        ),
        60000,
        'Inserção de garantia'
      );

      res.status(201).json({ id: result.insertId, message: 'Garantia cadastrada com sucesso!' });
      return;
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const id = isNumericId ? parseInt(idFromUrl, 10) : body.id;
      if (!id) {
        res.status(400).json({ error: 'ID da garantia é obrigatório.' });
        return;
      }

      const [existing] = await withTimeout(
        connection.execute('SELECT 1 AS ok FROM garantias WHERE id = ? LIMIT 1', [id]),
        15000,
        'Verificação de existência da garantia'
      );
      if (!existing.length) {
        res.status(404).json({ error: 'Garantia não encontrada.' });
        return;
      }

      const empresaFinal = body.empresa !== undefined ? body.empresa : null;
      const descricaoFinal = body.descricao !== undefined ? body.descricao : null;

      let dadosObj = {};
      if (body.dados !== undefined) {
        try {
          dadosObj = typeof body.dados === 'string' ? JSON.parse(body.dados) : { ...body.dados };
        } catch {
          dadosObj = {};
        }
      }

      let enviadoVal;
      if (body.enviado !== undefined && body.enviado !== null) {
        enviadoVal =
          body.enviado === true || body.enviado === 1 || body.enviado === '1' ? 1 : 0;
      } else if (dadosObj.enviado !== undefined && dadosObj.enviado !== null) {
        enviadoVal =
          dadosObj.enviado === true || dadosObj.enviado === 1 || dadosObj.enviado === '1' ? 1 : 0;
      } else {
        enviadoVal = 0;
      }
      dadosObj.enviado = enviadoVal;

      const [result] = await withTimeout(
        connection.execute(
          `UPDATE garantias SET empresa = ?, descricao = ?, dados = ?, enviado = ?, data_garantia = NOW() WHERE id = ?`,
          [empresaFinal, descricaoFinal, JSON.stringify(dadosObj), enviadoVal, id]
        ),
        60000,
        'Atualização de garantia'
      );

      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'Garantia não encontrada.' });
        return;
      }

      res.status(200).json({ success: true, message: 'Garantia atualizada com sucesso!' });
      return;
    }

    if (req.method === 'DELETE') {
      const body = req.body || {};
      const id = isNumericId ? parseInt(idFromUrl, 10) : body.id;
      if (!id) {
        res.status(400).json({ error: 'ID da garantia é obrigatório.' });
        return;
      }
      await withTimeout(
        connection.execute('DELETE FROM garantias WHERE id = ?', [id]),
        30000,
        'Exclusão de garantia'
      );
      res.status(200).json({ message: 'Garantia removida com sucesso!' });
      return;
    }

    if (req.method === 'PATCH') {
      let body = req.body || {};
      if (typeof req.body === 'string') {
        try {
          body = JSON.parse(req.body || '{}');
        } catch {
          body = {};
        }
      }
      const id = body.id;
      if (!id) {
        res.status(400).json({ error: 'ID da garantia é obrigatório.' });
        return;
      }
      if (body.enviado === undefined || body.enviado === null) {
        res.status(400).json({ error: 'enviado é obrigatório (0 ou 1).' });
        return;
      }
      const enviadoVal =
        body.enviado === true || body.enviado === 1 || body.enviado === '1' ? 1 : 0;

      const [rows] = await withTimeout(
        connection.execute('SELECT id, dados FROM garantias WHERE id = ?', [id]),
        30000,
        'Busca para patch'
      );
      if (!rows.length) {
        res.status(404).json({ error: 'Garantia não encontrada.' });
        return;
      }

      const dadosPatch = parseDadosJson(rows[0].dados) || {};
      dadosPatch.enviado = enviadoVal;

      const [patchResult] = await withTimeout(
        connection.execute('UPDATE garantias SET dados = ?, enviado = ? WHERE id = ?', [
          JSON.stringify(dadosPatch),
          enviadoVal,
          id
        ]),
        30000,
        'Patch de garantia'
      );
      if (patchResult.affectedRows === 0) {
        res.status(404).json({ error: 'Garantia não encontrada.' });
        return;
      }
      res.status(200).json({ success: true, id, enviado: enviadoVal });
      return;
    }

    if (req.method === 'GET') {
      const q = getQuery(req);

      if (isNumericId) {
        const garantiaId = parseInt(idFromUrl, 10);
        const [rows] = await withTimeout(
          connection.execute('SELECT * FROM garantias WHERE id = ? LIMIT 1', [garantiaId]),
          20000,
          'Busca garantia por ID'
        );
        if (!rows.length) {
          res.status(404).json({ error: 'Garantia não encontrada.' });
          return;
        }
        res.status(200).json(mapGarantiaRow(rows[0]));
        return;
      }

      const limitNum = Math.min(Math.max(parseInt(q.limit, 10) || 400, 1), 2000);
      const offsetNum = Math.max(parseInt(q.offset, 10) || 0, 0);

      const [[countRows], [rows]] = await Promise.all([
        withTimeout(connection.execute('SELECT COUNT(*) AS c FROM garantias'), 20000, 'COUNT garantias'),
        withTimeout(
          connection.execute(
            'SELECT * FROM garantias ORDER BY data_garantia DESC LIMIT ? OFFSET ?',
            [limitNum, offsetNum]
          ),
          45000,
          'Listagem de garantias'
        )
      ]);

      const totalCount = countRows[0].c;
      const garantias = rows.map(mapGarantiaRow);
      res.status(200).json({
        garantias,
        total: totalCount,
        limit: limitNum,
        offset: offsetNum
      });
      return;
    }

    res.status(405).json({ error: 'Método não permitido.' });
  } catch (err) {
    console.error('Erro na API de garantias:', err);
    if (!res.headersSent) {
      const isTimeout = err && err.code === 'OP_TIMEOUT';
      res.status(isTimeout ? 504 : 500).json({
        error: err.message || (isTimeout ? 'Tempo limite excedido' : 'Erro interno'),
        code: err && err.code ? err.code : isTimeout ? 'OP_TIMEOUT' : 'INTERNAL_ERROR'
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
