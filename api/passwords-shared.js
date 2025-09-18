// Banco de dados compartilhado para senhas B2B
// Este arquivo é compartilhado entre auth-b2b.js e change-password-b2b.js

const fs = require('fs');
const path = require('path');

// Usar arquivo temporário no Vercel (/tmp é persistente)
const PASSWORDS_FILE = '/tmp/passwords-b2b.json';

// Função para carregar senhas
function loadPasswords() {
  console.log('Carregando senhas do arquivo:', PASSWORDS_FILE);
  try {
    if (fs.existsSync(PASSWORDS_FILE)) {
      const data = fs.readFileSync(PASSWORDS_FILE, 'utf8');
      const passwords = JSON.parse(data);
      console.log('Senhas carregadas do arquivo:', Object.keys(passwords));
      return passwords;
    } else {
      console.log('Arquivo de senhas não existe, retornando objeto vazio');
      return {};
    }
  } catch (error) {
    console.error('Erro ao carregar senhas:', error);
    return {};
  }
}

// Função para salvar senhas
function savePasswords(passwords) {
  console.log('Salvando senhas no arquivo:', PASSWORDS_FILE);
  try {
    fs.writeFileSync(PASSWORDS_FILE, JSON.stringify(passwords, null, 2));
    console.log('Senhas salvas com sucesso no arquivo:', Object.keys(passwords));
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
