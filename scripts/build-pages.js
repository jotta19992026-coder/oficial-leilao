#!/usr/bin/env node
/**
 * Build de publicação — Cloudflare Pages ou Hostinger (site estático, sem dependências).
 *
 * Uso (na raiz do projeto ou no build da Pages):
 *     node scripts/build-pages.js
 *
 * Gera a pasta dist/ só com o que o site precisa, deixando FORA o que era
 * excluído pelo .vercelignore da Vercel:
 *     scripts/  supabase/  *.md  .env*  vercel.json  .vercelignore
 *     js/lots-photos.json  images/lotes/  __pycache__
 *
 * Configuração no painel da Pages:
 *     Build command:        node scripts/build-pages.js
 *     Build output directory: dist
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');

// Arquivos soltos da raiz que o site serve.
const ROOT_FILES = ['favicon.png', 'favicon.svg', 'apple-touch-icon.png', '_redirects', '_headers', '.htaccess'];
// Pastas do site.
const DIRS = ['css', 'js', 'images'];
// Exceções dentro das pastas.
const SKIP_IN_DIR = {
  js: ['lots-photos.json', 'lots-photos.preview.json', 'lots-photos.partial.json'],
  images: ['lotes'] // fotos originais: já estão no Supabase Storage
};

function copyTree(rel) {
  const skip = SKIP_IN_DIR[rel] || [];
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return 0;
  let n = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.indexOf(entry.name) !== -1) continue;
    if (entry.name === '.DS_Store' || entry.name === '__pycache__') continue;
    const childRel = rel + '/' + entry.name;
    const from = path.join(src, entry.name);
    const to = path.join(OUT, childRel);
    if (entry.isDirectory()) {
      fs.mkdirSync(to, { recursive: true });
      n += copyTree(childRel);
    } else {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
      n++;
    }
  }
  return n;
}

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  let files = 0;

  // Páginas HTML da raiz.
  for (const name of fs.readdirSync(ROOT)) {
    if (/\.html$/i.test(name) && fs.statSync(path.join(ROOT, name)).isFile()) {
      fs.copyFileSync(path.join(ROOT, name), path.join(OUT, name));
      files++;
    }
  }

  // Ícones e arquivos de roteamento/cabeçalhos (Pages: _redirects/_headers; Hostinger: .htaccess).
  for (const name of ROOT_FILES) {
    const from = path.join(ROOT, name);
    if (fs.existsSync(from)) { fs.copyFileSync(from, path.join(OUT, name)); files++; }
  }

  // Pastas do site.
  for (const dir of DIRS) files += copyTree(dir);

  // Validação mínima: se a home não saiu, o build falha (evita deploy vazio).
  if (!fs.existsSync(path.join(OUT, 'index.html'))) {
    console.error('FALHA: dist/index.html não foi gerado.');
    process.exit(1);
  }
  if (!fs.existsSync(path.join(OUT, '_redirects'))) {
    console.error('FALHA: dist/_redirects não foi gerado (a rota /br quebraria).');
    process.exit(1);
  }

  let bytes = 0;
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p); else bytes += fs.statSync(p).size;
    }
  })(OUT);

  console.log('Build ok → dist/ com ' + files + ' arquivos, ' + (bytes / 1048576).toFixed(2) + ' MB');
  console.log('Excluído: scripts/, supabase/, *.md, .env*, vercel.json, .vercelignore, js/lots-photos.json, images/lotes/');
}

main();
