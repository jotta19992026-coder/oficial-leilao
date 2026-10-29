#!/usr/bin/env node
'use strict';

// Atualiza o catálogo local (js/lots-data.js) com os dados atuais do Supabase:
// preço inicial (price), maior lance (current_price), nº de lances, leilão/data/
// horário/encerramento. O catálogo local é só o fallback quando o Supabase não
// responde; sem isso ele mostraria preços e datas antigos.
//
// Uso:
//   node scripts/sync-catalogo-local.js --dry-run
//   node scripts/sync-catalogo-local.js
//
// Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.
// Preserva fotos, descrições e os demais campos do arquivo gerado.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'js', 'lots-data.js');
const DRY = process.argv.includes('--dry-run');

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

function brDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
}

async function main() {
  loadEnv();
  const URL_BASE = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!URL_BASE || !KEY) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');

  const headers = { apikey: KEY };
  if (KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${KEY}`;

  const res = await fetch(`${URL_BASE}/rest/v1/lots?select=id,price,current_price,bid_count,auction_num,auction_date,auction_time,auction_label,ends_at&order=id.asc`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  const rows = JSON.parse(text);
  const byId = {};
  for (const row of rows) byId[row.id] = row;

  const original = fs.readFileSync(FILE, 'utf8');
  const marker = original.indexOf('window.NL_REAL_LOTS');
  if (marker < 0) throw new Error('Formato inesperado em js/lots-data.js (sem window.NL_REAL_LOTS).');
  const header = original.slice(0, marker);
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(original, context);
  const lots = context.window.NL_REAL_LOTS || [];
  if (!lots.length) throw new Error('Catálogo local vazio.');

  let changed = 0;
  const missing = [];
  for (const lot of lots) {
    const row = byId[lot.id];
    if (!row) { missing.push(lot.id); continue; }
    const base = Number(row.price) || 0;
    const current = row.current_price != null ? Number(row.current_price) : base;
    const before = JSON.stringify([lot.price, lot.bids, lot.basePrice, lot.auctionNum, lot.auctionDate, lot.auctionTime, lot.endsAt]);
    lot.price = current;
    lot.bids = Number(row.bid_count) || 0;
    lot.basePrice = base;
    lot.auction = row.auction_label || lot.auction;
    lot.auctionNum = row.auction_num;
    lot.auctionDate = brDate(row.auction_date);
    lot.auctionTime = row.auction_time || '';
    lot.endsAt = row.ends_at ? Date.parse(row.ends_at) : null;
    const after = JSON.stringify([lot.price, lot.bids, lot.basePrice, lot.auctionNum, lot.auctionDate, lot.auctionTime, lot.endsAt]);
    if (before !== after) changed++;
  }

  console.log(`Catálogo local: ${lots.length} lotes; ${changed} com dados novos.`);
  if (missing.length) console.log(`Sem correspondência no banco (mantidos): ${missing.join(', ')}`);

  if (DRY) {
    console.log('\n--dry-run: nada foi gravado.');
    return;
  }

  const out = header + 'window.NL_REAL_LOTS = ' + JSON.stringify(lots, null, 2) + ';\n';
  fs.writeFileSync(FILE, out);
  console.log(`Gravado: ${path.relative(ROOT, FILE)} (${Buffer.byteLength(out)} bytes).`);
}

main().catch((err) => {
  console.error('\nERRO:', err.message);
  process.exit(1);
});
