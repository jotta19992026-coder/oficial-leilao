#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'images', 'lotes');
const MAP_FILE = path.join(ROOT, 'js', 'lots-photos.json');
const PREVIEW_FILE = path.join(ROOT, 'js', 'lots-photos.preview.json');
const PARTIAL_FILE = path.join(ROOT, 'js', 'lots-photos.partial.json');
const BUCKET = 'lot-photos';
const STORAGE_PREFIX = 'lotes';
let SUPABASE_URL = '';
let SUPABASE_SERVICE_ROLE_KEY = '';
const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

function loadEnv() {
  const envFile = path.join(ROOT, '.env');
  if (!fs.existsSync(envFile)) return;
  const text = fs.readFileSync(envFile, 'utf8').replace(/^\uFEFF/, '');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function listImages(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listImages(full));
    } else if (entry.isFile() && MIME[path.extname(entry.name).toLowerCase()]) {
      files.push(full);
    }
  }
  return files;
}

function relativeKey(file) {
  return [STORAGE_PREFIX, ...path.relative(IMAGES_DIR, file).split(path.sep)].join('/');
}

function encodedKey(key) {
  return key.split('/').map(encodeURIComponent).join('/');
}

function publicUrl(key) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodedKey(key)}`;
}

function authHeaders(extra = {}) {
  const headers = { apikey: SUPABASE_SERVICE_ROLE_KEY, ...extra };
  if (SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  }
  return headers;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jwtRole(key) {
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
    return payload.role || null;
  } catch {
    return null;
  }
}

async function assertBucket() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(30000),
  });
  if (res.ok) return;
  const body = (await res.text()).slice(0, 300);
  if (res.status === 404) {
    throw new Error(
      `Bucket "${BUCKET}" nao encontrado. Rode supabase/schema.sql no SQL Editor do Supabase.`
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Chave recusada (${res.status}). Use a Secret key (sb_secret_...) ou a service_role legada. ${body}`
    );
  }
  throw new Error(`Falha ao verificar o bucket (${res.status}): ${body}`);
}

async function upload(file, key) {
  const body = await fs.promises.readFile(file);
  const contentType = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodedKey(key)}`;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    let res;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders({
          'Content-Type': contentType,
          'cache-control': '31536000',
          'x-upsert': 'true',
        }),
        body,
        signal: AbortSignal.timeout(120000),
      });
    } catch (err) {
      if (attempt === 4) throw new Error(`Erro de rede: ${err.message}`);
      await sleep(500 * attempt * attempt);
      continue;
    }

    if (res.ok) return;

    const text = (await res.text()).slice(0, 300);
    if (res.status === 409 || (res.status === 400 && /already exists/i.test(text))) return;

    if (res.status === 429 || res.status >= 500) {
      if (attempt === 4) throw new Error(`HTTP ${res.status}: ${text}`);
      await sleep(750 * attempt * attempt);
      continue;
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error(`HTTP ${res.status}: chave sem permissao para gravar no bucket. ${text}`);
    }
    if (res.status === 404) {
      throw new Error(`HTTP 404: bucket "${BUCKET}" inexistente. Rode o schema. ${text}`);
    }
    if (res.status === 413) {
      throw new Error(`HTTP 413: arquivo grande demais para o bucket. ${text}`);
    }
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
}

function buildMap(items) {
  const map = {};
  for (const { key } of items) {
    const relative = key.slice(STORAGE_PREFIX.length + 1);
    const lotId = relative.split('/')[0];
    if (!/^\d+$/.test(lotId)) continue;
    if (!map[lotId]) map[lotId] = [];
    map[lotId].push(publicUrl(key));
  }
  const ordered = {};
  for (const lotId of Object.keys(map).sort((a, b) => Number(a) - Number(b))) {
    ordered[lotId] = map[lotId].sort();
  }
  return ordered;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Uso: node scripts/upload-images-supabase.js [opcoes]');
    console.log('  --dry-run            Lista as fotos sem enviar.');
    console.log('  --only=<id>          Envia apenas as fotos de um lote (teste).');
    console.log('  --concurrency=<n>    Requisicoes simultaneas (1-12, padrao 5).');
    return;
  }
  const dryRun = args.includes('--dry-run');
  const onlyArg = args.find((arg) => arg.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length).trim() : '';
  const concurrencyArg = args.find((arg) => arg.startsWith('--concurrency='));
  const requestedConcurrency = Number(
    concurrencyArg ? concurrencyArg.slice('--concurrency='.length) : process.env.UPLOAD_CONCURRENCY || 5
  );
  const concurrency = Number.isFinite(requestedConcurrency)
    ? Math.max(1, Math.min(12, requestedConcurrency))
    : 5;

  if (!fs.existsSync(IMAGES_DIR)) {
    throw new Error(`Pasta nao encontrada: ${IMAGES_DIR}`);
  }
  if (only && !/^\d+$/.test(only)) {
    throw new Error('Use --only=<id do lote>, por exemplo --only=1006');
  }

  let files = listImages(IMAGES_DIR).sort((a, b) =>
    a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })
  );
  files = files.filter((file) => {
    const rel = path.relative(IMAGES_DIR, file).split(path.sep);
    return !only || rel[0] === only;
  });

  if (files.length === 0) {
    throw new Error(only ? `Nenhuma foto encontrada para o lote ${only}.` : 'Nenhuma foto encontrada em images/lotes.');
  }

  const totalBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
  const lotIds = new Set(files.map((file) => path.relative(IMAGES_DIR, file).split(path.sep)[0]));
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);

  console.log(`Fotos: ${files.length} | Lotes: ${lotIds.size} | Tamanho: ${totalMb} MB`);

  if (dryRun) {
    console.log('[dry-run] Nenhum arquivo foi enviado.');
    console.log('Exemplos:');
    for (const file of files.slice(0, 3)) console.log(`  ${relativeKey(file)}`);
    return;
  }

  loadEnv();
  const rawUrl = process.env.SUPABASE_URL || '';
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!rawUrl || !rawKey) {
    throw new Error(
      'Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no arquivo .env (use .env.example como modelo).'
    );
  }

  try {
    const parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new Error('SUPABASE_URL invalida. Exemplo: https://abcdefgh.supabase.co');
  }

  SUPABASE_URL = rawUrl.replace(/\/+$/, '');
  SUPABASE_SERVICE_ROLE_KEY = rawKey.trim();

  if (SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_publishable_')) {
    throw new Error('Essa e uma chave publica. Use a Secret key (sb_secret_...) ou a service_role legada.');
  }
  if (jwtRole(SUPABASE_SERVICE_ROLE_KEY) === 'anon') {
    throw new Error('Essa e a chave anon (publica). Use a Secret key (sb_secret_...) ou a service_role legada.');
  }

  await assertBucket();
  console.log(`Enviando para o bucket "${BUCKET}" com concorrencia ${concurrency}...`);

  let cursor = 0;
  let completed = 0;
  const uploaded = [];
  const failures = [];

  async function worker() {
    while (true) {
      const current = cursor;
      cursor += 1;
      if (current >= files.length) return;

      const file = files[current];
      const key = relativeKey(file);
      try {
        await upload(file, key);
        uploaded.push({ key });
      } catch (err) {
        failures.push({ key, message: err.message });
        console.error(`\nFalha em ${key}: ${err.message}`);
      }

      completed += 1;
      if (completed % 10 === 0 || completed === files.length) {
        const pct = Math.round((completed / files.length) * 100);
        process.stdout.write(`\r${completed}/${files.length} (${pct}%)`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, files.length) }, () => worker())
  );
  process.stdout.write('\n');

  const map = buildMap(uploaded);
  const outputFile = only ? PREVIEW_FILE : failures.length ? PARTIAL_FILE : MAP_FILE;
  fs.writeFileSync(outputFile, `${JSON.stringify(map, null, 2)}\n`);

  console.log(`Enviadas: ${uploaded.length} | Falhas: ${failures.length}`);
  console.log(`Mapa: ${path.relative(ROOT, outputFile)} (${Object.keys(map).length} lotes)`);

  if (only) {
    console.log('Modo --only: mapa completo nao foi gerado. Rode sem --only depois de validar.');
  }
  if (failures.length) {
    console.error('Algumas fotos falharam. Rode o script novamente (ele sobrescreve com x-upsert).');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`Erro: ${err.message}`);
  process.exitCode = 1;
});
