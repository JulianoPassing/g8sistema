// Banco de dados compartilhado para senhas B2B
// Este arquivo é compartilhado entre auth-b2b.js e change-password-b2b.js

let passwordsDatabase = {};

// Função para carregar senhas
function loadPasswords() {
  console.log('Carregando senhas do banco em memória');
  return passwordsDatabase;
}

// Função para salvar senhas
function savePasswords(passwords) {
  console.log('Salvando senhas no banco em memória');
  passwordsDatabase = { ...passwords };
  console.log('Senhas salvas com sucesso');
}

// Função para gerar hash da senha
function hashPassword(password) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Função para verificar senha
function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

module.exports = {
  loadPasswords,
  savePasswords,
  hashPassword,
  verifyPassword
};
