// Atualiza todas as datas dos lotes para futuramente (dezembro 2026)
// para que apareçam como "Programado" no painel admin e "Aberto para lances" no site.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'js', 'lots-data.js');
let content = fs.readFileSync(file, 'utf8');

// Mapeamento: leilão -> nova data (todas futuras, espalhadas por dezembro 2026)
const AUCTION_DATES = {
  44: '01/12/2026',
  45: '02/12/2026',
  46: '03/12/2026',
  47: '04/12/2026',
  48: '05/12/2026',
};

// Timestamp base: 01/12/2026 10:00 UTC = 1796192400000
const BASE_TS = 1796192400000;
const DAY_MS = 86400000;

// 1. Substitui auctionDate: "04/11/2026" -> "02/12/2026" (baseado no auctionNum)
// Faz uma passada que pega o auctionNum e depois o auctionDate no mesmo lote
let lastNum = 0;
let stats = { count: 0, auctions: {} };

content = content.replace(
  /"auctionNum":\s*(\d+)|"auctionDate":\s*"(\d{2})\/(\d{2})\/(\d{4})"/g,
  (match, num, d, m, y) => {
    if (num) {
      lastNum = parseInt(num, 10);
      return match;
    }
    if (d) {
      const newDate = AUCTION_DATES[lastNum] || '01/12/2026';
      stats.auctions[lastNum] = (stats.auctions[lastNum] || 0) + 1;
      stats.count++;
      return `"auctionDate": "${newDate}"`;
    }
    return match;
  }
);

// 2. Substitui o label do leilão: "Leilão 45 — 04/11" -> "Leilão 45 — 02/12"
content = content.replace(
  /"auction":\s*"Leilão\s+(\d+)\s*—\s*\d{2}\/\d{2}"/g,
  (match, num) => {
    const n = parseInt(num, 10);
    const newDate = AUCTION_DATES[n] || '01/12/2026';
    const [d, m] = newDate.split('/');
    return `"auction": "Leilão ${n} — ${d}/${m}"`;
  }
);

// 3. Substitui ends: "+1d 6h" -> "+30d 6h"
content = content.replace(
  /"ends":\s*"\+1d\s*6h"/g,
  '"ends": "+30d 6h"'
);

// 4. Atualiza endsAt: baseado no auctionNum do mesmo lote
lastNum = 0;
content = content.replace(
  /"auctionNum":\s*(\d+)|"endsAt":\s*(\d{13})/g,
  (match, num, ts) => {
    if (num) {
      lastNum = parseInt(num, 10);
      return match;
    }
    if (ts) {
      const offsetDays = (lastNum - 44) || 0;
      const newEndsAt = BASE_TS + offsetDays * DAY_MS + (6 * 3600000); // +6h = 16:00
      return `"endsAt": ${newEndsAt}`;
    }
    return match;
  }
);

fs.writeFileSync(file, content, 'utf8');

console.log('Atualizados', stats.count, 'lotes');
console.log('Por leilão:', JSON.stringify(stats.auctions, null, 2));
console.log('Novas datas:', JSON.stringify(AUCTION_DATES, null, 2));
console.log('Base timestamp:', BASE_TS, '->', new Date(BASE_TS).toISOString());