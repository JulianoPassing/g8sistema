// Banco de dados compartilhado para senhas B2B
// Este arquivo é compartilhado entre auth-b2b.js e change-password-b2b.js

// Usar uma variável estática no módulo para persistir entre requisições
let passwordsDatabase = {};

// Função para carregar senhas
function loadPasswords() {
  console.log('Carregando senhas do banco em memória (módulo)');
  console.log('Senhas atuais:', Object.keys(passwordsDatabase));
  return passwordsDatabase;
}

// Função para salvar senhas
function savePasswords(passwords) {
  console.log('Salvando senhas no banco em memória (módulo)');
  passwordsDatabase = { ...passwords };
  console.log('Senhas salvas com sucesso no módulo:', Object.keys(passwordsDatabase));
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
