// Banco de dados compartilhado para senhas B2B
// Este arquivo é compartilhado entre auth-b2b.js e change-password-b2b.js

// Para Vercel, usar uma abordagem diferente - armazenar no processo
if (!process.env.PASSWORDS_DB) {
  process.env.PASSWORDS_DB = JSON.stringify({});
}

// Função para carregar senhas
function loadPasswords() {
  console.log('Carregando senhas do banco em memória (process.env)');
  try {
    return JSON.parse(process.env.PASSWORDS_DB || '{}');
  } catch (error) {
    console.error('Erro ao carregar senhas:', error);
    return {};
  }
}

// Função para salvar senhas
function savePasswords(passwords) {
  console.log('Salvando senhas no banco em memória (process.env)');
  try {
    process.env.PASSWORDS_DB = JSON.stringify(passwords);
    console.log('Senhas salvas com sucesso no process.env:', Object.keys(passwords));
  } catch (error) {
    console.error('Erro ao salvar senhas:', error);
    throw error;
  }
}

// Função para gerar hash da senha
function hashPassword(password) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Função para verificar senha
function verifyPassword(password, hash) {
  const passwordHash = hashPassword(password);
  console.log('Verificando senha:');
  console.log('  Senha fornecida:', password);
  console.log('  Hash da senha fornecida:', passwordHash);
  console.log('  Hash armazenado:', hash);
  console.log('  Senhas coincidem:', passwordHash === hash);
  return passwordHash === hash;
}

module.exports = {
  loadPasswords,
  savePasswords,
  hashPassword,
  verifyPassword
};
