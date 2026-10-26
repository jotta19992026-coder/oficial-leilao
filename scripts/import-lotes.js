const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PROJECT = path.resolve(__dirname, '..');
const DESKTOP = path.join(os.homedir(), 'Desktop');
const SETS = [
  'fotos_lotes_parte1de4_lotes001-047',
  'fotos_lotes_parte2de4_lotes048-099',
  'fotos_lotes_parte3de4_lotes100-166',
  'fotos_lotes_parte4de4_lotes167-225'
];

const AUCTIONS = {
  5:  { date: '26/10/2026', short: '26/10', cat: 'moto',        ends: '+1d 6h'  },
  20: { date: '26/10/2026', short: '26/10', cat: 'carro',       ends: '+1d 8h'  },
  43: { date: '27/10/2026', short: '27/10', cat: 'pesado',      ends: '+2d 6h'  },
  32: { date: '27/10/2026', short: '27/10', cat: 'carro',       ends: '+2d 8h'  },
  34: { date: '07/11/2026', short: '07/11', cat: 'nautico',     ends: '+13d'    },
  39: { date: '07/11/2026', short: '07/11', cat: 'carro',       ends: '+13d 4h' },
  41: { date: '10/11/2026', short: '10/11', cat: 'equipamento', ends: '+16d'    },
  40: { date: '12/11/2026', short: '12/11', cat: 'imovel',      ends: '+18d'    }
};

const CAT_LABEL = {
  carro: 'Veículo', moto: 'Moto', pesado: 'Pesado',
  nautico: 'Náutico', imovel: 'Imóvel', equipamento: 'Equipamento'
};

const IMOVEL_CITY = {
  1085: 'São Paulo/SP',
  1087: 'Teresina/PI',
  1086: 'Pérola/PR',
  1088: 'Sumaré/SP',
  1089: 'Aparecida de Goiânia/GO'
};

function round(n, step) { return Math.round(n / step) * step; }

function findSourceRoot() {
  const dir = fs.readdirSync(DESKTOP, { withFileTypes: true })
    .filter(function (d) { return d.isDirectory() && /^Leil/.test(d.name); })
    .map(function (d) { return path.join(DESKTOP, d.name); })[0];
  if (!dir) throw new Error('Pasta "Leilão" não encontrada na Área de Trabalho.');
  return dir;
}

function parseYear(raw, cat) {
  let title = String(raw).trim();
  let y1 = null, y2 = null, m;
  if ((m = /[–—-]\s*((?:19|20)\d{2})-((?:19|20)\d{2})$/.exec(title))) {
    y1 = +m[1]; y2 = +m[2]; title = title.slice(0, m.index).trim();
  } else if ((m = /\s+((?:19|20)\d{2})\s*\/\s*((?:19|20)\d{2})$/.exec(title))) {
    y1 = +m[1]; y2 = +m[2]; title = title.slice(0, m.index).trim();
  } else if ((m = /(?:^|[\s-])(\d{2})-(\d{2})$/.exec(title))) {
    y1 = 2000 + +m[1]; y2 = 2000 + +m[2]; title = title.slice(0, m.index).trim();
  } else if ((m = /[-\s]((?:19|20)\d{2})$/.exec(title))) {
    y1 = y2 = +m[1]; title = title.slice(0, m.index).trim();
  } else if (cat !== 'imovel' && cat !== 'equipamento') {
    const years = title.match(/(?:19|20)\d{2}/g);
    if (years && years.length) {
      y1 = y2 = +years[years.length - 1];
      title = title.replace(new RegExp('\\s*' + years[years.length - 1] + '\\s*'), ' ').trim();
    }
  }
  title = title.replace(/[\s\-–—]+$/, '').replace(/\s{2,}/g, ' ').replace(/\.\s*$/, '').trim();
  return {
    title: title,
    year: y1 ? (y1 + '/' + y2) : ((cat === 'imovel' || cat === 'equipamento') ? '—' : 'Não informado'),
    y: y1 || 0
  };
}

function basePrice(cat, y, title) {
  const t = title.toUpperCase();
  let p;
  if (cat === 'moto') {
    p = y >= 2024 ? 20000 : y >= 2022 ? 17000 : y >= 2020 ? 14000 : y >= 2018 ? 11000 : y >= 2015 ? 9000 : 7500;
    if (/BMW|TRIUMPH|KAWASAKI/.test(t)) p *= 1.25;
    else if (/YAMAHA/.test(t)) p *= 1.1;
    if (/S 1000|R 1250|F 800|MT-09|MT-07|NINJA|VERSYS|TIGER|X-ADV|CB 650|CBR 500/.test(t)) p *= 1.2;
    return round(p, 100);
  }
  if (cat === 'carro') {
    p = y >= 2024 ? 80000 : y >= 2022 ? 65000 : y >= 2020 ? 50000 : y >= 2018 ? 38000 : y >= 2015 ? 30000 : y >= 2013 ? 24000 : 19000;
    if (/BMW|BYD|GWM|CAOA CHERY|JEEP COMMANDER|HYUNDAI (SANTA FE|CRETA)|TOYOTA (HILUX|COROLLA CROSS)|VOLKSWAGEN (TAOS|T-CROSS)|MITSUBISHI PAJERO|CHEVROLET (EQUINOX|S10|TRACKER)|FORD (RANGER|FUSION)|RENAULT (OROCH|CAPTUR|KARDIAN)|HONDA (HR-V|CIVIC)|NISSAN (KICKS|LEAF)|FIAT (TORO|FASTBACK|PULSE)|RENAULT OROCH|HYUNDAI HB20S/.test(t)) p *= 1.3;
    if (/BMW|BYD|GWM|CAOA/.test(t)) p *= 1.15;
    return round(p, 100);
  }
  if (cat === 'pesado') {
    p = y >= 2020 ? 230000 : y >= 2015 ? 170000 : y >= 2010 ? 125000 : 100000;
    return round(p, 1000);
  }
  if (cat === 'nautico') {
    p = y >= 2023 ? 110000 : y >= 2020 ? 85000 : y >= 2017 ? 65000 : 50000;
    if (/LANCHA/.test(t)) p *= 1.5;
    if (/SEA-DOO|YAMAHA|KAWASAKI/.test(t)) p *= 1.1;
    if (/CAN-AM|MAVERICK/.test(t)) p *= 0.8;
    return round(p, 1000);
  }
  if (cat === 'imovel') {
    const m = title.match(/([\d.]+,\d+|\d+)\s*m²/);
    const area = m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) : 0;
    return round(Math.max(150000, area * 3500), 1000);
  }
  if (cat === 'equipamento') {
    if (/AR CONDICIONADO/i.test(t)) return 1200;
    if (/SERVIDORES/.test(t)) return 8500;
    if (/MONITORES/.test(t)) return 1900;
    if (/IMPRESSORAS/.test(t)) return 2900;
    if (/BATERIAS/.test(t)) return 950;
    return 1500;
  }
  return 10000;
}

function makeDesc(lot) {
  const head = 'Leilão ' + lot.auctionNum + ' (lote ' + lot.n + ')';
  const where = 'O bem é comercializado no estado em que se encontra. Consulte o edital para as condições de pagamento, transferência, débitos e retirada. A vistoria prévia é recomendada.';
  if (lot.cat === 'moto') return 'Motocicleta ' + lot.title + ', ano/modelo ' + lot.year + ', ofertada no ' + head + '. ' + where;
  if (lot.cat === 'carro') return 'Veículo ' + lot.title + ', ano/modelo ' + lot.year + ', ofertado no ' + head + '. ' + where;
  if (lot.cat === 'pesado') return 'Caminhão/utilitário ' + lot.title + ', ano/modelo ' + lot.year + ', ofertado no ' + head + '. ' + where;
  if (lot.cat === 'nautico') return 'Embarcação ' + lot.title + ', ano/modelo ' + lot.year + ', ofertada no ' + head + '. O bem é comercializado no estado em que se encontra; motorização, acessórios e avarias devem ser conferidos na vistoria. Consulte o edital para documentação e retirada.';
  if (lot.cat === 'imovel') return 'Imóvel ' + lot.title + ', ofertado no ' + head + '. A descrição completa, a matrícula, a situação de ocupação e as condições de pagamento e regularização constam no edital do leilão. A vistoria prévia do imóvel é recomendada.';
  return 'Lote composto por ' + lot.title + ', ofertado no ' + head + '. Os itens são usados e comercializados no estado em que se encontram, sem garantia de funcionamento ou de integralidade. Confira a relação de bens e as condições de retirada no edital.';
}

function makeObs(cat) {
  if (cat === 'moto' || cat === 'carro') return 'Documentação e laudo cadastral disponíveis para consulta. Eventuais débitos, avarias e condições de transferência seguem o que estiver descrito no edital.';
  if (cat === 'pesado') return 'Documentação do veículo disponível para consulta no edital. O estado de conservação, a quilometragem e eventuais débitos devem ser confirmados na vistoria.';
  if (cat === 'nautico') return 'Embarcação vendida no estado em que se encontra. Motor, casco, acessórios e documentação devem ser verificados na vistoria e no edital.';
  if (cat === 'imovel') return 'Imóvel vendido no estado em que se encontra. Matrícula, ocupação, débitos e demais condições constam no edital do leilão.';
  return 'Itens usados, vendidos no estado em que se encontram e sem garantia. A quantidade e a composição do lote seguem a descrição e as fotos.';
}

function imageFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(function (d) { return d.isFile() && /\.(jpe?g|png|webp)$/i.test(d.name); })
    .map(function (d) {
      const num = parseInt((d.name.match(/^(\d+)/) || [0, 999])[1], 10);
      return { name: d.name, num: num };
    })
    .sort(function (a, b) { return a.num - b.num || a.name.localeCompare(b.name); });
}

function main() {
  const srcRoot = findSourceRoot();
  const destRoot = path.join(PROJECT, 'images', 'lotes');
  fs.mkdirSync(destRoot, { recursive: true });

  const found = [];
  SETS.forEach(function (setName) {
    const setDir = path.join(srcRoot, setName);
    if (!fs.existsSync(setDir)) { console.log('AVISO: conjunto ausente:', setName); return; }
    fs.readdirSync(setDir, { withFileTypes: true })
      .filter(function (d) { return d.isDirectory(); })
      .forEach(function (d) {
        const m = /^(\d{3}) - Leilao (\d+) - Lote (\d+) - (.+?) \(id (\d+)\)$/.exec(d.name);
        if (!m) { console.log('IGNORADO (nome fora do padrão):', d.name); return; }
        found.push({
          seq: +m[1], auctionNum: +m[2], lotNumber: m[3], rawTitle: m[4].trim(),
          id: +m[5], srcDir: path.join(setDir, d.name)
        });
      });
  });

  const byId = {};
  found.forEach(function (f) {
    if (!byId[f.id]) byId[f.id] = f;
    else {
      const a = imageFiles(byId[f.id].srcDir).length;
      const b = imageFiles(f.srcDir).length;
      if (b > a) byId[f.id] = f;
      console.log('DUPLICADO id', f.id, '— mantido o conjunto com mais fotos');
    }
  });

  const lots = [];
  let totalPhotos = 0, skipped = 0;

  Object.keys(byId).map(function (k) { return byId[k]; })
    .sort(function (a, b) { return a.seq - b.seq; })
    .forEach(function (f) {
      const cfg = AUCTIONS[f.auctionNum];
      if (!cfg) { console.log('IGNORADO (leilão sem configuração):', f.rawTitle); return; }
      const yp = parseYear(f.rawTitle, cfg.cat);
      const destDir = path.join(destRoot, String(f.id));
      fs.rmSync(destDir, { recursive: true, force: true });
      fs.mkdirSync(destDir, { recursive: true });

      const seenHash = {};
      const photos = [];
      imageFiles(f.srcDir).forEach(function (img) {
        const full = path.join(f.srcDir, img.name);
        const size = fs.statSync(full).size;
        if (size < 1000) { skipped++; return; }
        const buf = fs.readFileSync(full);
        const hash = crypto.createHash('md5').update(buf).digest('hex');
        if (seenHash[hash]) { skipped++; return; }
        seenHash[hash] = true;
        fs.writeFileSync(path.join(destDir, img.name), buf);
        photos.push('images/lotes/' + f.id + '/' + img.name);
      });
      if (!photos.length) { console.log('SEM FOTOS:', f.rawTitle); return; }

      const lot = {
        id: f.id,
        n: f.lotNumber,
        title: yp.title,
        cat: cfg.cat,
        catLabel: CAT_LABEL[cfg.cat],
        year: yp.year,
        km: (cfg.cat === 'imovel' || cfg.cat === 'equipamento') ? '—' : 'Não informado',
        city: IMOVEL_CITY[f.id] || 'Consultar edital',
        price: basePrice(cfg.cat, yp.y, yp.title),
        bids: 0,
        media: cfg.cat === 'moto' ? ['m1', 'm2', 'm3'][f.seq % 3]
          : cfg.cat === 'carro' ? ['c1', 'c2', 'c3'][f.seq % 3]
          : cfg.cat === 'pesado' ? ['p1', 'p2'][f.seq % 2]
          : cfg.cat === 'nautico' ? ['c1', 'c2'][f.seq % 2]
          : cfg.cat === 'imovel' ? 'c2' : 'p1',
        ends: cfg.ends,
        auction: 'Leilão ' + f.auctionNum + ' — ' + cfg.short,
        auctionNum: f.auctionNum,
        auctionDate: cfg.date,
        photos: photos,
        photo: photos[0],
        desc: makeDesc({ cat: cfg.cat, title: yp.title, year: yp.year, n: f.lotNumber, auctionNum: f.auctionNum }),
        obs: makeObs(cfg.cat)
      };
      totalPhotos += photos.length;
      lots.push(lot);
    });

  const dateKey = function (l) {
    const p = l.auctionDate.split('/');
    return p[2] + p[1] + p[0];
  };
  lots.sort(function (a, b) {
    return dateKey(a).localeCompare(dateKey(b)) || a.auctionNum - b.auctionNum || parseInt(a.n, 10) - parseInt(b.n, 10);
  });

  const out = path.join(PROJECT, 'js', 'lots-data.js');
  const js = '// Norte Leilões — catálogo de lotes importado da pasta "Leilão" (fotos e descrições).\n' +
    '// Gerado automaticamente em ' + new Date().toISOString() + '. Não editar manualmente.\n' +
    'window.NL_REAL_LOTS = ' + JSON.stringify(lots, null, 2) + ';\n';
  fs.writeFileSync(out, js, 'utf8');

  const perAuction = {};
  lots.forEach(function (l) {
    perAuction[l.auctionNum] = (perAuction[l.auctionNum] || 0) + 1;
  });
  console.log('Lotes importados:', lots.length);
  console.log('Fotos copiadas:', totalPhotos);
  console.log('Arquivos ignorados (corrompidos/duplicados):', skipped);
  Object.keys(perAuction).sort(function (a, b) { return a - b; }).forEach(function (k) {
    console.log('  Leilão ' + k + ': ' + perAuction[k] + ' lotes');
  });
  console.log('Dados gravados em:', out);
}

main();
