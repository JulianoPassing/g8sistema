const { getPool } = require('./mysql-pool');
const fs = require('fs');
const path = require('path');

// Middleware de segurança e validação
const addSecurityHeaders = (res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
};

/** CNPJ sempre no padrão brasileiro: 00.000.000/0000-00 */
const formatarCnpjBrasil = (cnpj) => {
  const d = String(cnpj || '').replace(/\D/g, '');
  if (d.length !== 14) return '';
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

/** IE numérica: grupos de 3 dígitos (ex.: 401.234.568). "ISENTO" é normalizado em maiúsculas. */
const formatarInscricaoEstadualBrasil = (ie) => {
  const raw = String(ie ?? '').trim();
  if (!raw) return '';
  const compactAlpha = raw.replace(/[\s.\-\/]/g, '');
  if (/^isento$/i.test(compactAlpha)) return 'ISENTO';
  const d = raw.replace(/\D/g, '');
  if (!d) return '';
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const isRequisicaoPadronizarDocumentos = (req) => {
  if (req.method !== 'POST') return false;
  const pathPart = (req.headers['x-vercel-path'] || req.url || '').split('?')[0];
  const last = pathPart.split('/').filter(Boolean).pop() || '';
  if (last === 'padronizar-documentos') return true;
  return extrairQueryParam(req, 'padronizar_documentos') === '1';
};

/** Só aplica máscara de CNPJ se houver 14 dígitos; caso contrário mantém o valor original. */
const padronizarCnpjMantendoInvalidos = (raw) => {
  if (raw == null) return '';
  const s = String(raw).trim();
  if (!s) return '';
  const d = s.replace(/\D/g, '');
  if (d.length === 14) return formatarCnpjBrasil(raw);
  return s;
};

/** Formata IE com dígitos ou ISENTO; texto sem dígitos (inválido) permanece inalterado. */
const padronizarIeMantendoInvalidos = (raw) => {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return '';
  const compact = s.replace(/[\s.\-\/]/g, '');
  if (/^isento$/i.test(compact)) return 'ISENTO';
  const d = s.replace(/\D/g, '');
  if (d.length > 0) return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return s;
};

// Validação de dados
const validateClienteData = (data) => {
  const errors = [];
  
  if (!data.razao || data.razao.trim().length < 2) {
    errors.push('Razão social é obrigatória e deve ter pelo menos 2 caracteres');
  }
  
  if (data.cnpj && String(data.cnpj).replace(/\D/g, '').length !== 14) {
    errors.push('CNPJ deve conter 14 dígitos');
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

const extrairQueryParam = (req, key) => {
  try {
    const urlObj = new URL(req.url || '/', 'http://localhost');
    return urlObj.searchParams.get(key);
  } catch (error) {
    return null;
  }
};

const fetchJsonComTimeout = async (url, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const limparRazaoParaNome = (razao = '') => {
  if (!razao) return '';
  return String(razao)
    .replace(/\b(LTDA|EIRELI|MEI|ME|EPP|S\/A|SA)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+-\s+/g, ' ')
    .trim();
};

const buscarNomeFantasiaExterno = async (cnpj, razao = '') => {
  const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');
  if (cnpjLimpo.length !== 14) {
    return { nome_fantasia: '', fonte: 'cnpj-invalido' };
  }

  const brasilApi = await fetchJsonComTimeout(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
  if (brasilApi?.nome_fantasia && String(brasilApi.nome_fantasia).trim()) {
    return { nome_fantasia: String(brasilApi.nome_fantasia).trim(), fonte: 'brasilapi' };
  }

  const minhaReceita = await fetchJsonComTimeout(`https://minhareceita.org/${cnpjLimpo}`);
  if (minhaReceita?.fantasia && String(minhaReceita.fantasia).trim()) {
    return { nome_fantasia: String(minhaReceita.fantasia).trim(), fonte: 'minhareceita' };
  }

  const receitaWs = await fetchJsonComTimeout(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`);
  if (receitaWs?.fantasia && String(receitaWs.fantasia).trim()) {
    return { nome_fantasia: String(receitaWs.fantasia).trim(), fonte: 'receitaws' };
  }

  const fallback = limparRazaoParaNome(razao);
  return { nome_fantasia: fallback, fonte: fallback ? 'fallback-razao' : 'nao-encontrado' };
};

const formatarCepCadastro = (cep) => {
  const d = String(cep || '').replace(/\D/g, '');
  if (d.length === 8) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return String(cep || '').trim();
};

const formatarTelefoneCadastro = (dddTel) => {
  const d = String(dddTel || '').replace(/\D/g, '');
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  return String(dddTel || '').trim();
};

const montarLogradouroCadastro = (logradouro, numero, complemento) => {
  const base = [logradouro, numero].filter((x) => x != null && String(x).trim() !== '').join(', ');
  const comp = complemento != null ? String(complemento).trim() : '';
  if (comp) return base ? `${base} — ${comp}` : comp;
  return base;
};

/**
 * Dados de PJ para cadastro (Brasil API prioritária; ReceitaWS como fallback).
 */
const buscarDadosCadastroCnpj = async (cnpj) => {
  const cnpjLimpo = String(cnpj || '').replace(/\D/g, '');
  if (cnpjLimpo.length !== 14) {
    return { ok: false, erro: 'CNPJ deve ter 14 dígitos.' };
  }

  const brasilApi = await fetchJsonComTimeout(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
  if (brasilApi && !brasilApi.message && brasilApi.razao_social) {
    return {
      ok: true,
      fonte: 'brasilapi',
      cnpj: cnpjLimpo,
      razao: String(brasilApi.razao_social).trim(),
      nome_fantasia: String(brasilApi.nome_fantasia || '').trim(),
      endereco: montarLogradouroCadastro(brasilApi.logradouro, brasilApi.numero, brasilApi.complemento),
      bairro: String(brasilApi.bairro || '').trim(),
      cidade: String(brasilApi.municipio || '').trim(),
      estado: String(brasilApi.uf || '')
        .trim()
        .toUpperCase(),
      cep: formatarCepCadastro(brasilApi.cep),
      telefone: formatarTelefoneCadastro(brasilApi.ddd_telefone_1),
      email: brasilApi.email ? String(brasilApi.email).trim() : '',
      situacao: String(brasilApi.descricao_situacao_cadastral || '').trim(),
    };
  }

  const receitaWs = await fetchJsonComTimeout(`https://receitaws.com.br/v1/cnpj/${cnpjLimpo}`, 12000);
  if (
    receitaWs &&
    receitaWs.status !== 'ERROR' &&
    receitaWs.message == null &&
    (receitaWs.nome || receitaWs.fantasia)
  ) {
    const tel =
      receitaWs.telefone != null && String(receitaWs.telefone).replace(/\D/g, '').length >= 10
        ? formatarTelefoneCadastro(receitaWs.telefone)
        : '';
    return {
      ok: true,
      fonte: 'receitaws',
      cnpj: cnpjLimpo,
      razao: String(receitaWs.nome || receitaWs.razao_social || '').trim(),
      nome_fantasia: String(receitaWs.fantasia || receitaWs.nome_fantasia || '').trim(),
      endereco: montarLogradouroCadastro(receitaWs.logradouro, receitaWs.numero, receitaWs.complemento),
      bairro: String(receitaWs.bairro || '').trim(),
      cidade: String(receitaWs.municipio || '').trim(),
      estado: String(receitaWs.uf || '')
        .trim()
        .toUpperCase(),
      cep: formatarCepCadastro(receitaWs.cep),
      telefone: tel,
      email: receitaWs.email ? String(receitaWs.email).trim() : '',
      situacao: String(receitaWs.situacao || '').trim(),
    };
  }

  return {
    ok: false,
    erro: 'Não foi possível obter dados deste CNPJ. Confira os dígitos ou tente mais tarde.',
  };
};

const ensureNomeFantasiaColumn = async (connection) => {
  const [columns] = await connection.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'clientes'
       AND COLUMN_NAME = 'nome_fantasia'
     LIMIT 1`
  );

  if (columns.length === 0) {
    await connection.execute(
      `ALTER TABLE clientes
       ADD COLUMN nome_fantasia VARCHAR(255) NULL AFTER razao`
    );
    console.log('Coluna nome_fantasia criada na tabela clientes.');
  }
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
    const pool = getPool();
    connection = await pool.getConnection();
  } catch (dbError) {
    console.log('Erro ao conectar com MySQL, usando arquivo JSON:', dbError.message);
    useJSON = true;
  }

  if (connection) {
    try {
      await ensureNomeFantasiaColumn(connection);
    } catch (columnError) {
      console.warn('Nao foi possivel validar/criar a coluna nome_fantasia:', columnError.message);
    }
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

    // GET dedicado para buscar nome fantasia em multiplas fontes por CNPJ
    const cnpjConsulta = extrairQueryParam(req, 'cnpj_consulta');
    const razaoConsulta = extrairQueryParam(req, 'razao');
    const consultaCompleta = extrairQueryParam(req, 'consulta_completa');
    if (req.method === 'GET' && cnpjConsulta) {
      if (consultaCompleta === '1') {
        const dadosCadastro = await buscarDadosCadastroCnpj(cnpjConsulta);
        return res.status(200).json(dadosCadastro);
      }
      const resultado = await buscarNomeFantasiaExterno(cnpjConsulta, razaoConsulta || '');
      return res.status(200).json({
        cnpj: String(cnpjConsulta).replace(/\D/g, ''),
        ...resultado
      });
    }

    if (req.method === 'POST' && isRequisicaoPadronizarDocumentos(req)) {
      const jsonPathPadronizar = path.join(__dirname, '../public/clientes.json');
      try {
        if (connection) {
          const [rows] = await connection.execute(
            'SELECT id, cnpj, ie FROM clientes ORDER BY id'
          );
          let registrosAtualizados = 0;
          let cnpjCorrigidos = 0;
          let ieCorrigidas = 0;
          let cnpjInvalidosInalterados = 0;
          let ieInvalidasInalteradas = 0;

          for (const row of rows) {
            const oldC = row.cnpj == null ? '' : String(row.cnpj);
            const oldI = row.ie == null ? '' : String(row.ie);
            const dc = oldC.replace(/\D/g, '');
            const compactI = oldI.replace(/[\s.\-\/]/g, '');
            const isIsento = /^isento$/i.test(compactI);
            const di = oldI.replace(/\D/g, '');

            if (oldC && dc.length !== 14) cnpjInvalidosInalterados++;
            if (oldI && !isIsento && di.length === 0) ieInvalidasInalteradas++;

            const novoC = padronizarCnpjMantendoInvalidos(row.cnpj);
            const novoI = padronizarIeMantendoInvalidos(row.ie);

            if (novoC === oldC && novoI === oldI) continue;

            await connection.execute('UPDATE clientes SET cnpj = ?, ie = ? WHERE id = ?', [
              novoC,
              novoI,
              row.id
            ]);
            registrosAtualizados++;
            if (novoC !== oldC) cnpjCorrigidos++;
            if (novoI !== oldI) ieCorrigidas++;
          }

          logRequest(req, { action: 'PADRONIZAR_DOCUMENTOS', mysql: true, registrosAtualizados });
          return res.status(200).json({
            ok: true,
            fonte: 'mysql',
            total_analisados: rows.length,
            registros_atualizados: registrosAtualizados,
            cnpj_formatados: cnpjCorrigidos,
            ie_formatadas: ieCorrigidas,
            cnpj_invalidos_inalterados: cnpjInvalidosInalterados,
            ie_invalidas_inalteradas: ieInvalidasInalteradas
          });
        }

        if (useJSON) {
          const lista = carregarClientesJSON();
          if (!Array.isArray(lista)) {
            return res.status(500).json({ ok: false, erro: 'Formato inválido em clientes.json' });
          }
          let registrosAtualizados = 0;
          let cnpjCorrigidos = 0;
          let ieCorrigidas = 0;
          let cnpjInvalidosInalterados = 0;
          let ieInvalidasInalteradas = 0;

          for (const row of lista) {
            const oldC = row.cnpj == null ? '' : String(row.cnpj);
            const oldI = row.ie == null ? '' : String(row.ie);
            const dc = oldC.replace(/\D/g, '');
            const compactI = oldI.replace(/[\s.\-\/]/g, '');
            const isIsento = /^isento$/i.test(compactI);
            const di = oldI.replace(/\D/g, '');

            if (oldC && dc.length !== 14) cnpjInvalidosInalterados++;
            if (oldI && !isIsento && di.length === 0) ieInvalidasInalteradas++;

            const novoC = padronizarCnpjMantendoInvalidos(row.cnpj);
            const novoI = padronizarIeMantendoInvalidos(row.ie);

            if (novoC === oldC && novoI === oldI) continue;

            row.cnpj = novoC;
            row.ie = novoI;
            registrosAtualizados++;
            if (novoC !== oldC) cnpjCorrigidos++;
            if (novoI !== oldI) ieCorrigidas++;
          }

          fs.writeFileSync(jsonPathPadronizar, JSON.stringify(lista, null, 2), 'utf8');
          logRequest(req, { action: 'PADRONIZAR_DOCUMENTOS', json: true, registrosAtualizados });
          return res.status(200).json({
            ok: true,
            fonte: 'clientes.json',
            total_analisados: lista.length,
            registros_atualizados: registrosAtualizados,
            cnpj_formatados: cnpjCorrigidos,
            ie_formatadas: ieCorrigidas,
            cnpj_invalidos_inalterados: cnpjInvalidosInalterados,
            ie_invalidas_inalteradas: ieInvalidasInalteradas
          });
        }

        return res.status(503).json({
          ok: false,
          erro: 'Não foi possível acessar o banco nem o arquivo de clientes.'
        });
      } catch (padErr) {
        console.error('Padronizar documentos:', padErr);
        return res.status(500).json({ ok: false, erro: padErr.message || String(padErr) });
      }
    }

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
        razao, nome_fantasia, cnpj, ie, endereco, bairro, cidade, estado, cep,
        email, telefone, transporte, prazo, obs
      } = req.body;

      // Sanitizar dados
      const sanitizedData = {
        razao: razao?.trim(),
        nome_fantasia: nome_fantasia?.trim(),
        cnpj: cnpj ? formatarCnpjBrasil(cnpj) : '',
        ie: formatarInscricaoEstadualBrasil(ie),
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
        `INSERT INTO clientes (razao, nome_fantasia, cnpj, ie, endereco, bairro, cidade, estado, cep, email, telefone, transporte, prazo, obs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        razao, nome_fantasia, cnpj, ie, endereco, bairro, cidade, estado, cep,
        email, telefone, transporte, prazo, obs
      } = req.body;

      const validationErrors = validateClienteData(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: validationErrors
        });
      }

      console.log('Tentando atualizar cliente ID:', id);

      const cnpjFormatado = cnpj ? formatarCnpjBrasil(cnpj) : '';
      const ieFormatado = formatarInscricaoEstadualBrasil(ie);

      const [result] = await connection.execute(
        `UPDATE clientes SET razao=?, nome_fantasia=?, cnpj=?, ie=?, endereco=?, bairro=?, cidade=?, estado=?, cep=?, email=?, telefone=?, transporte=?, prazo=?, obs=? WHERE id=?`,
        [
          razao?.trim(),
          nome_fantasia?.trim(),
          cnpjFormatado,
          ieFormatado,
          endereco?.trim(),
          bairro?.trim(),
          cidade?.trim(),
          estado?.trim(),
          cep?.replace(/\D/g, ''),
          email?.toLowerCase().trim(),
          telefone?.replace(/\D/g, ''),
          transporte?.trim(),
          prazo?.trim(),
          obs?.trim(),
          id
        ]
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
      try {
        connection.release();
      } catch (e) {
        console.error('Erro ao liberar conexão clientes:', e);
      }
    }
  }
}; 