#!/usr/bin/env node
'use strict';

// Importa o catálogo de js/lots-data.js para o Supabase (tabelas auctions, lots e lot_photos),
// usando as URLs públicas de js/lots-photos.json (gerado por upload-images-supabase.js).
//
// Uso:
//   node scripts/import-lotes-supabase.js            # importa/atualiza os 225 lotes
//   node scripts/import-lotes-supabase.js --dry-run  # só mostra o que faria
//   node scripts/import-lotes-supabase.js --anchor=2026-10-26T12:00:00-03:00
//
// É idempotente: lotes são "upsert" por id (preserva current_price e bid_count, ou seja,
// lances já dados), e as fotos de cada lote importado são apagadas e regravadas.
// Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (secret key) no .env — nunca no navegador.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const LOTS_FILE = path.join(ROOT, 'js', 'lots-data.js');
const MAP_FILE = path.join(ROOT, 'js', 'lots-photos.json');
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const anchorArg = (args.find((a) => a.startsWith('--anchor=')) || '').split('=')[1];
// Âncora fixa para os prazos: o catálogo traz prazos relativos ("+1d 6h"); somados a uma data
// fixa, a reimportação não "empurra" os encerramentos para frente.
const ANCHOR = new Date(anchorArg || '2026-10-26T12:00:00-03:00');

function loadEnv() {
  const envFile = path.join(ROOT, '.env');
  if (!fs.existsSync(envFile)) return;
  const text = fs.readFileSync(envFile, 'utf8').replace(/^﻿/, '');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function loadCatalog() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(LOTS_FILE, 'utf8'), sandbox, { filename: LOTS_FILE });
  const lots = sandbox.window.NL_REAL_LOTS;
  if (!Array.isArray(lots) || !lots.length) throw new Error('Nenhum lote em js/lots-data.js');
  return lots;
}

function parseOffset(str) {
  let ms = 0;
  const d = /(\d+)\s*d/.exec(str || ''), h = /(\d+)\s*h/.exec(str || ''), m = /(\d+)\s*m/.exec(str || '');
  if (d) ms += Number(d[1]) * 86400000;
  if (h) ms += Number(h[1]) * 3600000;
  if (m) ms += Number(m[1]) * 60000;
  return ms;
}

// Mesmas regras do frontend (js/lote.js e NL_DATEINFO em js/data.js).
function incrementFor(price) { return Math.max(100, Math.round(price * 0.01 / 100) * 100); }
function auctionTime(id) { return '10:' + String((id % 6) * 10).padStart(2, '0'); }
function isoDate(ddmmyyyy) {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(ddmmyyyy || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

let URL_BASE = '';
let KEY = '';
function headers(extra = {}) {
  const h = { apikey: KEY, 'Content-Type': 'application/json', ...extra };
  if (KEY.startsWith('eyJ')) h.Authorization = `Bearer ${KEY}`;
  return h;
}
async function rest(method, pathAndQuery, body, prefer) {
  const res = await fetch(`${URL_BASE}/rest/v1/${pathAndQuery}`, {
    method,
    headers: headers(prefer ? { Prefer: prefer } : {}),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${pathAndQuery} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}
function chunks(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  loadEnv();
  URL_BASE = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!URL_BASE || !KEY) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  if (KEY.startsWith('sb_publishable_')) throw new Error('Use a secret key (sb_secret_...), não a publishable.');
  if (isNaN(ANCHOR.getTime())) throw new Error('Valor inválido em --anchor');

  const catalog = loadCatalog();
  if (!fs.existsSync(MAP_FILE)) throw new Error('js/lots-photos.json não encontrado. Rode antes: node scripts/upload-images-supabase.js');
  const photoMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
  const missing = catalog.filter((l) => !(photoMap[l.id] && photoMap[l.id].length)).map((l) => l.id);
  if (missing.length) console.warn(`Aviso: ${missing.length} lote(s) sem fotos no mapa: ${missing.slice(0, 10).join(', ')}`);

  // Leilões (um por número), vinculados aos lotes.
  const auctionsByNum = new Map();
  for (const l of catalog) {
    if (auctionsByNum.has(l.auctionNum)) continue;
    const date = isoDate(l.auctionDate);
    auctionsByNum.set(l.auctionNum, {
      numero: 'LO-2026/' + String(l.auctionNum).padStart(2, '0'),
      modalidade: 'Online (exclusivamente eletrônico)',
      abertura: date ? `${date}T10:00:00-03:00` : null,
      encerramento: date ? `${date}T14:00:00-03:00` : null,
      leiloeiro: 'Ricardo Almeida',
      matricula: 'JUCESP/SP 12.638/2019',
      comitente: 'Leilão Oficial',
      comissao: 5,
      pagamento: 'TED/TFF ao preposto leiloeiro — quitação dos débitos do lote junto à instituição financeira responsável',
      retirada: 'Mediante comprovação de pagamento e agendamento',
    });
  }

  // Destaques: os 8 primeiros em ordem cronológica (como o carrossel da home).
  const featured = new Set(
    catalog.slice()
      .sort((a, b) => (isoDate(a.auctionDate) || '').localeCompare(isoDate(b.auctionDate) || '') || a.id - b.id)
      .slice(0, 8).map((l) => l.id)
  );

  const lotRows = catalog.map((l) => ({
    id: l.id,
    n: parseInt(l.n, 10) || null,
    title: l.title,
    description: l.desc || null,
    obs: l.obs || null,
    category: l.cat,
    year: l.year || null,
    km: l.km || null,
    city: l.city || null,
    price: l.price,
    increment: incrementFor(l.price),
    media: l.media || 'c1',
    auction_num: l.auctionNum || null,
    auction_date: isoDate(l.auctionDate),
    auction_time: auctionTime(l.id),
    auction_label: l.auction || null,
    ends_at: new Date(ANCHOR.getTime() + parseOffset(l.ends)).toISOString(),
    ends_label: l.ends || null,
    status: 'published',
    featured: featured.has(l.id),
    // current_price e bid_count ficam de fora de propósito: o upsert preserva os lances existentes.
  }));

  const photoRows = [];
  for (const l of catalog) {
    (photoMap[l.id] || []).forEach((url, i) => {
      const storagePath = decodeURIComponent(url.split('/object/public/lot-photos/')[1] || '');
      photoRows.push({ lot_id: l.id, url, storage_path: storagePath || null, alt: `${l.title} — foto ${i + 1}`, position: i });
    });
  }

  console.log(`Leilões: ${auctionsByNum.size} | Lotes: ${lotRows.length} | Fotos: ${photoRows.length}`);
  console.log(`Âncora dos prazos: ${ANCHOR.toISOString()}`);
  if (DRY) {
    console.log('Exemplo de lote:', JSON.stringify(lotRows[0], null, 2));
    console.log('--dry-run: nada foi gravado.');
    return;
  }

  const savedAuctions = await rest('POST', 'auctions?on_conflict=numero', [...auctionsByNum.values()],
    'resolution=merge-duplicates,return=representation');
  const auctionIdByNumero = new Map(savedAuctions.map((a) => [a.numero, a.id]));
  for (const row of lotRows) {
    row.auction_id = auctionIdByNumero.get('LO-2026/' + String(row.auction_num).padStart(2, '0')) || null;
  }
  console.log(`Leilões gravados: ${savedAuctions.length}`);

  let done = 0;
  for (const part of chunks(lotRows, 100)) {
    await rest('POST', 'lots?on_conflict=id', part, 'resolution=merge-duplicates,return=minimal');
    done += part.length;
    console.log(`Lotes gravados: ${done}/${lotRows.length}`);
  }

  const ids = lotRows.map((r) => r.id);
  for (const part of chunks(ids, 100)) {
    await rest('DELETE', `lot_photos?lot_id=in.(${part.join(',')})`, undefined, 'return=minimal');
  }
  done = 0;
  for (const part of chunks(photoRows, 500)) {
    await rest('POST', 'lot_photos', part, 'return=minimal');
    done += part.length;
    console.log(`Fotos gravadas: ${done}/${photoRows.length}`);
  }

  // Novos lotes criados pelo painel continuam a partir de 10000 (identity "by default").
  const [{ count: lotCount } = {}] = await fetch(`${URL_BASE}/rest/v1/lots?select=count`, { headers: headers() }).then((r) => r.json());
  const [{ count: photoCount } = {}] = await fetch(`${URL_BASE}/rest/v1/lot_photos?select=count`, { headers: headers() }).then((r) => r.json());
  console.log(`Conferência no banco: ${lotCount} lotes, ${photoCount} fotos.`);
}

main().catch((err) => {
  console.error('Falha:', err.message);
  process.exit(1);
});
