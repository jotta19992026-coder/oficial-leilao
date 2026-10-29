#!/usr/bin/env node
'use strict';

// Reorganiza o catálogo em eventos semanais de 45 lotes (terça a sexta, 10h–12h),
// misturando veículos, motos, pesados e náuticos. Os 45 lotes que sobram formam
// o evento da terça seguinte, para nenhum lote ficar sem leilão.
//
// Uso:
//   node scripts/setup-eventos-semanais.js --dry-run   # só mostra o plano
//   node scripts/setup-eventos-semanais.js             # grava no Supabase
//
// Requer SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (secret key) no .env.
// É idempotente: os mesmos lotes são escolhidos por ordem de id em cada categoria.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY = process.argv.includes('--dry-run');

const START = '10:00';
const END = '12:00';
const TZ = '-03:00';

// 4 eventos pedidos (45 lotes cada) + 1 evento com os 45 lotes restantes.
// A soma das categorias dos 4 primeiros = 45 por evento.
const EVENTS = [
  { num: 44, date: '2026-11-03', counts: { carro: 20, moto: 17, pesado: 4, nautico: 4 } },
  { num: 45, date: '2026-11-04', counts: { carro: 20, moto: 17, pesado: 4, nautico: 4 } },
  { num: 46, date: '2026-11-05', counts: { carro: 20, moto: 17, pesado: 4, nautico: 4 } },
  { num: 47, date: '2026-11-06', counts: { carro: 21, moto: 17, pesado: 3, nautico: 4 } },
  { num: 48, date: '2026-11-10', leftover: true }
];

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
  if (!res.ok) throw new Error(`${method} ${pathAndQuery} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}

function brDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? m[3] + '/' + m[2] : iso;
}
function isoAt(iso, time) { return `${iso}T${time}:00${TZ}`; }
function countBy(list, key) {
  const out = {};
  for (const item of list) out[item[key]] = (out[item[key]] || 0) + 1;
  return out;
}
function catText(cats) {
  return Object.keys(cats).sort().map((k) => `${k} ${cats[k]}`).join(', ');
}

async function upsertAuction(ev) {
  const numero = `LO-2026/${ev.num}`;
  const row = {
    numero,
    modalidade: 'Online (exclusivamente eletrônico)',
    abertura: isoAt(ev.date, START),
    encerramento: isoAt(ev.date, END),
    leiloeiro: 'Ricardo Almeida',
    matricula: 'JUCESP/SP 12.638/2019',
    comitente: 'Leilão Oficial',
    comissao: 5,
    pagamento: 'TED/TFF ao preposto leiloeiro — quitação dos débitos do lote junto à instituição financeira responsável',
    retirada: 'Mediante comprovação de pagamento e agendamento',
  };
  const found = await rest('GET', `auctions?select=id&numero=eq.${encodeURIComponent(numero)}`);
  if (found.length) {
    await rest('PATCH', `auctions?id=eq.${found[0].id}`, row);
    return found[0].id;
  }
  const created = await rest('POST', 'auctions', [row], 'return=representation');
  return created[0].id;
}

async function main() {
  loadEnv();
  URL_BASE = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!URL_BASE || !KEY) throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  if (KEY.startsWith('sb_publishable_')) throw new Error('Use a secret key (sb_secret_...), não a publishable.');

  const lots = await rest('GET', 'lots?select=id,n,title,category&order=id.asc');
  if (!lots.length) throw new Error('Nenhum lote encontrado no Supabase.');
  console.log(`Catálogo: ${lots.length} lotes.`);

  const byCat = {};
  for (const lot of lots) (byCat[lot.category] = byCat[lot.category] || []).push(lot);
  for (const cat of Object.keys(byCat)) byCat[cat].sort((a, b) => a.id - b.id);

  const used = new Set();
  const plan = [];
  for (const ev of EVENTS) {
    const chosen = [];
    if (ev.leftover) {
      for (const cat of Object.keys(byCat)) {
        for (const lot of byCat[cat]) {
          if (used.has(lot.id)) continue;
          chosen.push(lot);
          used.add(lot.id);
        }
      }
    } else {
      for (const cat of Object.keys(ev.counts)) {
        const want = ev.counts[cat];
        let taken = 0;
        for (const lot of byCat[cat] || []) {
          if (taken >= want) break;
          if (used.has(lot.id)) continue;
          chosen.push(lot);
          used.add(lot.id);
          taken++;
        }
        if (taken < want) throw new Error(`Sem lotes suficientes de "${cat}" para o Leilão ${ev.num} (faltaram ${want - taken}).`);
      }
    }
    if (chosen.length !== 45) throw new Error(`Leilão ${ev.num}: ${chosen.length} lotes (esperado 45).`);
    plan.push({ ...ev, lots: chosen, cats: countBy(chosen, 'category') });
  }

  const total = plan.reduce((sum, ev) => sum + ev.lots.length, 0);
  if (total !== lots.length) throw new Error(`Plano usa ${total} de ${lots.length} lotes.`);

  console.log(`\nPlano — ${plan.length} eventos / ${total} lotes`);
  for (const ev of plan) {
    console.log(`  Leilão ${ev.num} — ${brDate(ev.date)} ${START}–${END}: ${ev.lots.length} lotes (${catText(ev.cats)})`);
  }
  if (DRY) {
    console.log('\n--dry-run: nada foi gravado.');
    return;
  }

  console.log('\nGravando no Supabase…');
  for (const ev of plan) {
    const auctionId = await upsertAuction(ev);
    const ids = ev.lots.map((l) => l.id).join(',');
    const patch = {
      auction_id: auctionId,
      auction_num: ev.num,
      auction_date: ev.date,
      auction_time: START,
      auction_label: `Leilão ${ev.num} — ${brDate(ev.date)}`,
      ends_at: isoAt(ev.date, END),
      ends_label: `${brDate(ev.date)} às ${END}`,
    };
    await rest('PATCH', `lots?id=in.(${ids})`, patch, 'return=minimal');
    console.log(`  Leilão ${ev.num} — ${brDate(ev.date)}: ${ev.lots.length} lotes gravados.`);
  }

  // Conferência final: relê do banco e mostra a distribuição real.
  const check = await rest('GET', 'lots?select=id,category,auction_num&order=auction_num.asc,id.asc');
  const groups = {};
  for (const lot of check) {
    const k = lot.auction_num ?? '-';
    groups[k] = groups[k] || [];
    groups[k].push(lot);
  }
  console.log('\nConferência no banco:');
  for (const num of Object.keys(groups).sort((a, b) => Number(a) - Number(b))) {
    const g = groups[num];
    console.log(`  Leilão ${num}: ${g.length} lotes (${catText(countBy(g, 'category'))})`);
  }
}

main().catch((err) => {
  console.error('\nERRO:', err.message);
  process.exit(1);
});
