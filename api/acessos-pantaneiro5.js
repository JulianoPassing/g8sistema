// API para gerenciar acessos à tabela Pantaneiro 5 (B2B)
// Usa APENAS arquivo JSON (public/acessos-pantaneiro5.json) - mesmo padrão lcrepresentacoes
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

function carregarDoArquivo() {
  try {
    const paths = [
      path.join(process.cwd(), 'public', 'acessos-pantaneiro5.json'),
      path.join(__dirname, '..', 'public', 'acessos-pantaneiro5.json')
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        const cnpjs = Array.isArray(data.cnpj) ? data.cnpj : [];
        return { cnpjs, usuarios: [] };
      }
    }
  } catch (e) {
    console.error('Erro ao ler acessos-pantaneiro5.json:', e.message);
  }
  return { cnpjs: [], usuarios: [] };
}

module.exports = async (req, res) => {
  addSecurityHeaders(res);

  if (req.method === 'OPTIONS') return res.status(200).end();

  const acessos = carregarDoArquivo();
  res.setHeader('X-Data-Source', 'file');

  if (req.method === 'GET') {
    return res.status(200).json(acessos);
  }

  // POST e DELETE: modo arquivo - retorna 501 para o frontend usar edição local + download
  if (req.method === 'POST' || req.method === 'DELETE') {
    return res.status(501).json({
      error: 'Sem banco de dados. Edite a lista e clique em "Publicar" para baixar o arquivo. Depois substitua public/acessos-pantaneiro5.json no repositório e faça deploy.',
      acessos,
      modoArquivo: true
    });
  }

  res.status(405).json({ error: 'Método não permitido' });
};
