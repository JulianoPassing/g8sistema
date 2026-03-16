// API para gerenciar acessos à tabela Pantaneiro 5 (B2B)
// Usa APENAS arquivo JSON (public/acessos-pantaneiro5.json) - igual lcrepresentacoes
// Adicionar/remover grava direto no JSON (sem download)
const fs = require('fs');
const path = require('path');

const addSecurityHeaders = (res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
};

function normalizarCnpj(cnpj) {
  return (cnpj || '').toString().replace(/[.\-\/\s]/g, '');
}

function getJsonPath() {
  const paths = [
    path.join(process.cwd(), 'public', 'acessos-pantaneiro5.json'),
    path.join(__dirname, '..', 'public', 'acessos-pantaneiro5.json')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return path.join(process.cwd(), 'public', 'acessos-pantaneiro5.json');
}

function carregarDoArquivo() {
  try {
    const p = getJsonPath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      const cnpjs = Array.isArray(data.cnpj) ? data.cnpj : [];
      return { cnpjs, usuarios: [] };
    }
  } catch (e) {
    console.error('Erro ao ler acessos-pantaneiro5.json:', e.message);
  }
  return { cnpjs: [], usuarios: [] };
}

function salvarNoArquivo(cnpjs) {
  const p = getJsonPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ cnpj: cnpjs || [] }, null, 2), 'utf8');
}

module.exports = async (req, res) => {
  addSecurityHeaders(res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  let acessos = carregarDoArquivo();
  res.setHeader('X-Data-Source', 'file');

  if (req.method === 'GET') {
    return res.status(200).json(acessos);
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { tipo, valor } = body;
      if (!tipo || !valor) {
        return res.status(400).json({ error: 'Informe tipo (cnpj ou usuario) e valor' });
      }
      if (tipo === 'cnpj') {
        const cnpjNorm = normalizarCnpj(valor);
        if (cnpjNorm.length < 14) return res.status(400).json({ error: 'CNPJ inválido. Use 14 dígitos.' });
        if (!acessos.cnpjs.includes(cnpjNorm)) {
          acessos.cnpjs = [...(acessos.cnpjs || []), cnpjNorm];
          salvarNoArquivo(acessos.cnpjs);
        }
        return res.status(200).json({ message: 'CNPJ adicionado', acessos });
      }
      return res.status(400).json({ error: 'Tipo deve ser cnpj' });
    } catch (e) {
      if (e.code === 'EROFS' || e.code === 'EACCES') {
        return res.status(503).json({
          error: 'O ambiente não permite gravar no arquivo. Use um servidor com filesystem gravável ou configure banco de dados.',
          acessos
        });
      }
      throw e;
    }
  }

  if (req.method === 'DELETE') {
    try {
      const tipo = (req.query?.tipo || '').toString().toLowerCase();
      const valor = req.query?.valor;
      if (!tipo || !valor) {
        return res.status(400).json({ error: 'Informe tipo e valor' });
      }
      if (tipo === 'cnpj') {
        const cnpjNorm = normalizarCnpj(valor);
        acessos.cnpjs = (acessos.cnpjs || []).filter(c => c !== cnpjNorm);
        salvarNoArquivo(acessos.cnpjs);
        return res.status(200).json({ message: 'CNPJ removido', acessos });
      }
      return res.status(400).json({ error: 'Tipo deve ser cnpj' });
    } catch (e) {
      if (e.code === 'EROFS' || e.code === 'EACCES') {
        return res.status(503).json({
          error: 'O ambiente não permite gravar no arquivo. Use um servidor com filesystem gravável.',
          acessos
        });
      }
      throw e;
    }
  }

  res.status(405).json({ error: 'Método não permitido' });
};
