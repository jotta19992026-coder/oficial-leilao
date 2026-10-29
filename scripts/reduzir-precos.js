#!/usr/bin/env node
'use strict';

// Reduz os lances iniciais (lots.price) no Supabase. Por padrão aplica 60% de
// redução (novo preço = 40% do atual), arredondando para a centena mais próxima
// e recalculando o incremento com a mesma regra do site.
//
// Uso:
//   node scripts/reduzir-precos.js --dry-run          # só mostra o plano
//   node scripts/reduzir-precos.js                    # grava no Supabase
//   node scripts/reduzir-precos.js --percent=50       # outra redução
//
// Antes de gravar, salva um backup dos valores atuais em scripts/precos-originais.json.
// Não mexe em current_price nem em bid_count: lances já dados são preservados.
// Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (secret key) no .env.
//
// ATENÇÃO: rodar duas vezes reduz duas vezes. Use o backup para voltar se precisar.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry-run');
const BACKUP_FILE = path.join(__dirname, 'precos-originais.json');

const percentArg = process.argv.find((a) => a.startsWith('--percent='));
const PERCENT = percentArg ? Number(percentArg.split('=')[1]) : 60;
if (!(PERCENT > 0 && PERCENT < 100)) throw new Error('Use --percent= entre 1 e 99.');

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
  if (!res.ok) throw new Error(`${method} ${pathAndQuery} -> ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// Mesma regra de js/store.js.
function incrementFor(price) {
  return Math.max(100, Math.round(price * 0.01 / 100) * 100);
}

function novoPreco(price) {
  const raw = Number(price) * (1 - PERCENT / 100);
  return Math.max(100, Math.round(raw / 100) * 100);
}

function brl(v) {
  return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  loadEnv();
  URL_BASE = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!URL_BASE || !KEY) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  if (KEY.startsWith('sb_publishable_')) throw new Error('Use a secret key (sb_secret_...), não a publishable.');

  const lots = await rest('GET', 'lots?select=id,n,title,category,price,increment,current_price,bid_count&order=id.asc');
  if (!lots.length) throw new Error('Nenhum lote encontrado no Supabase.');

  const backup = lots.map((l) => ({
    id: l.id, n: l.n, title: l.title, price: l.price, increment: l.increment,
    current_price: l.current_price, bid_count: l.bid_count,
  }));

  let antes = 0;
  let depois = 0;
  const plan = lots.map((l) => {
    const price = novoPreco(l.price);
    const increment = incrementFor(price);
    antes += Number(l.price) || 0;
    depois += price;
    return { ...l, newPrice: price, newIncrement: increment };
  });

  console.log(`Catálogo: ${plan.length} lotes — redução de ${PERCENT}% no lance inicial.`);
  console.log(`Soma dos lances iniciais: ${brl(antes)} -> ${brl(depois)}`);
  console.log('\nExemplos:');
  for (const l of plan.slice(0, 6)) {
    console.log(`  #${l.id} ${l.title}: ${brl(l.price)} -> ${brl(l.newPrice)} (incremento ${l.increment} -> ${l.newIncrement})`);
  }

  if (DRY) {
    console.log('\n--dry-run: nada foi gravado.');
    return;
  }

  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2) + '\n');
  console.log(`\nBackup dos valores atuais: ${path.relative(ROOT, BACKUP_FILE)}`);

  console.log('Gravando no Supabase…');
  const BATCH = 10;
  for (let i = 0; i < plan.length; i += BATCH) {
    const batch = plan.slice(i, i + BATCH);
    await Promise.all(batch.map((l) =>
      rest('PATCH', `lots?id=eq.${l.id}`, { price: l.newPrice, increment: l.newIncrement }, 'return=minimal')
    ));
    process.stdout.write(`  ${Math.min(i + BATCH, plan.length)}/${plan.length}\r`);
  }
  console.log(`\n  ${plan.length}/${plan.length} lotes atualizados.`);

  const check = await rest('GET', 'lots?select=id,price,increment&order=id.asc');
  const min = Math.min(...check.map((l) => Number(l.price)));
  const max = Math.max(...check.map((l) => Number(l.price)));
  const soma = check.reduce((s, l) => s + (Number(l.price) || 0), 0);
  console.log(`Conferência: ${check.length} lotes, preços de ${brl(min)} a ${brl(max)}, soma ${brl(soma)}.`);
}

main().catch((err) => {
  console.error('\nERRO:', err.message);
  process.exit(1);
});
