#!/usr/bin/env node
/**
 * Script de build G8Sistema
 * Atualiza a versão do cache no Service Worker para forçar atualizações
 * Execute: node build.js  ou  npm run build
 */

const fs = require('fs');
const path = require('path');

// Gerar versão única baseada em timestamp (ex: 20250302143022)
const VERSION = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);

const SW_PATH = path.join(__dirname, 'public', 'sw.js');

let swContent = fs.readFileSync(SW_PATH, 'utf8');

// Atualizar constantes de cache
swContent = swContent.replace(
  /const CACHE_NAME = '[^']+';/,
  `const CACHE_NAME = 'g8sistema-v${VERSION}';`
);
swContent = swContent.replace(
  /const STATIC_CACHE = '[^']+';/,
  `const STATIC_CACHE = 'g8sistema-static-${VERSION}';`
);
swContent = swContent.replace(
  /const DYNAMIC_CACHE = '[^']+';/,
  `const DYNAMIC_CACHE = 'g8sistema-dynamic-${VERSION}';`
);

fs.writeFileSync(SW_PATH, swContent);

console.log(`✓ Build concluído - Versão: ${VERSION}`);
console.log('  O Service Worker foi atualizado. As próximas visitas receberão os arquivos novos.');
