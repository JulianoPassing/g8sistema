// Banco de dados compartilhado para senhas B2B
// Este arquivo é compartilhado entre auth-b2b.js e change-password-b2b.js

// Usar global para garantir que seja compartilhado entre todas as instâncias
if (!global.passwordsDatabase) {
  global.passwordsDatabase = {};
}

// Função para carregar senhas
function loadPasswords() {
  console.log('Carregando senhas do banco em memória global');
  return global.passwordsDatabase;
}

// Função para salvar senhas
function savePasswords(passwords) {
  console.log('Salvando senhas no banco em memória global');
  global.passwordsDatabase = { ...passwords };
  console.log('Senhas salvas com sucesso no global:', Object.keys(global.passwordsDatabase));
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
