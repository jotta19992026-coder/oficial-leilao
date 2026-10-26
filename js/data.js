// Leilão Oficial — dados do catálogo e utilitários. Fonte única para listagem e detalhe.
window.NL_LOTS = (window.NL_REAL_LOTS && window.NL_REAL_LOTS.length) ? window.NL_REAL_LOTS : [
  { id: 1,  n: "01", title: "Toyota Hilux 2.8 SRX", cat: "carro",  catLabel: "Veículo", year: "2021/2021", km: "62.400 km", city: "Curitiba/PR", price: 118000, bids: 23, media: "c1", ends: "+25h33m", auction: "Leilão de Veículos — 26/10" },
  { id: 2,  n: "02", title: "BMW X1 sDrive20i",      cat: "carro",  catLabel: "Veículo", year: "2022/2022", km: "28.100 km", city: "São Paulo/SP", price: 112000, bids: 31, media: "c2", ends: "+25h34m", auction: "Leilão de Veículos — 26/10" },
  { id: 3,  n: "03", title: "Yamaha MT-07 ABS",      cat: "moto",   catLabel: "Moto",    year: "2023/2024", km: "9.800 km",  city: "Curitiba/PR", price: 18400,  bids: 12, media: "m1", ends: "+25h19m", auction: "Leilão de Motos — 26/10" },
  { id: 4,  n: "04", title: "BMW S 1000 RR",         cat: "moto",   catLabel: "Moto",    year: "2020/2021", km: "14.500 km", city: "Joinville/SC", price: 48200, bids: 18, media: "m2", ends: "+25h04m", auction: "Leilão de Motos — 26/10" },
  { id: 5,  n: "05", title: "Scania R 510 A6x2",     cat: "pesado", catLabel: "Pesado",  year: "2018/2018", km: "540.000 km", city: "Londrina/PR", price: 252500, bids: 9, media: "p1", ends: "+72h",   auction: "Leilão de Utilitários — 27/10" },
  { id: 6,  n: "06", title: "Jeep Renegade 1.8",     cat: "carro",  catLabel: "Veículo", year: "2019/2019", km: "71.200 km", city: "Maringá/PR", price: 37400,  bids: 15, media: "c3", ends: "+25h46m", auction: "Leilão de Veículos — 26/10" },
  { id: 7,  n: "07", title: "Mercedes-Benz Actros 2546", cat: "pesado", catLabel: "Pesado", year: "2020/2020", km: "410.000 km", city: "Cascavel/PR", price: 248400, bids: 7, media: "p2", ends: "+72h", auction: "Leilão de Utilitários — 27/10" },
  { id: 8,  n: "08", title: "Honda CG 160 Titan",    cat: "moto",   catLabel: "Moto",    year: "2022/2023", km: "12.300 km", city: "Curitiba/PR", price: 8100,   bids: 21, media: "m3", ends: "+25h10m", auction: "Leilão de Motos — 26/10" },
  { id: 9,  n: "09", title: "Chevrolet Tracker 1.0", cat: "carro",  catLabel: "Veículo", year: "2022/2023", km: "33.900 km", city: "Ponta Grossa/PR", price: 51000, bids: 14, media: "c2", ends: "+25h40m", auction: "Leilão de Veículos — 26/10" },
  { id: 10, n: "10", title: "Lancha Focker 240",     cat: "nautico", catLabel: "Náutico", year: "2019/2019", km: "120 h",    city: "Guaratuba/PR", price: 189000, bids: 5, media: "c1", ends: "+8d",     auction: "Leilão de Náuticos — 07/11" }
];

window.NL_CATS = {
  carro:       { label: "Veículos",     icon: "🚗" },
  moto:        { label: "Motos",        icon: "🏍️" },
  pesado:      { label: "Pesados",      icon: "🚚" },
  nautico:     { label: "Náuticos",     icon: "⛵" },
  imovel:      { label: "Imóveis",      icon: "🏠" },
  equipamento: { label: "Equipamentos", icon: "🖥️" }
};

window.NL_IMG = {
  carro: "images/car.svg",
  moto: "images/moto.svg",
  pesado: "images/truck.svg",
  nautico: "images/boat.svg",
  imovel: "images/car.svg",
  equipamento: "images/car.svg"
};
window.NL_IMG_FOR = function (lot) {
  return (lot && lot.photos && lot.photos.length ? lot.photos[0] : null) ||
    (lot && lot.photo) || (lot && window.NL_IMG[lot.cat]) || "images/car.svg";
};

window.NL_BRL = function (v) {
  return "R$ " + v.toLocaleString("pt-BR");
};

// Informações complementares do veículo, derivadas de forma estável a partir do id.
window.NL_EXTRA = function (lot) {
  var seed = lot.id || 1;
  var cores = ['Branco', 'Prata', 'Preto', 'Cinza', 'Vermelho', 'Azul'];
  return {
    combustivel: lot.cat === 'moto' ? 'Gasolina' : (lot.cat === 'pesado' ? 'Diesel' : 'Flex'),
    cambio: lot.cat === 'moto' ? 'Manual' : (seed % 2 === 0 ? 'Automático' : 'Manual'),
    cor: cores[seed % cores.length],
    portas: lot.cat === 'moto' ? '—' : (lot.cat === 'pesado' ? '2' : (seed % 3 === 0 ? '2' : '4')),
    placa: 'Final ' + (seed % 10),
    laudo: 'Veículo com laudo cadastral disponível para consulta. Possíveis avarias e observações constam no laudo; recomenda-se a vistoria antes de ofertar.'
  };
};

// Ficha resumida do edital.
window.NL_EDITAL = function (lot) {
  var num = String((lot && lot.auctionNum) || 1).padStart(2, '0');
  var di = window.NL_DATEINFO(lot || {});
  return {
    numero: 'LO-2026/' + num,
    modalidade: 'Online (exclusivamente eletrônico)',
    abertura: di.label + ' — ' + di.date,
    encerramento: di.date + ', a partir das 14h00',
    leiloeiro: 'Ricardo Almeida',
    matricula: 'JUC/PR 12.345/2026',
    comitente: 'Leilão Oficial',
    comissao: '5% sobre o valor de arrematação',
    pagamento: 'PIX, boleto ou transferência bancária',
    retirada: 'Mediante comprovação de pagamento e agendamento'
  };
};

// Data de referência para derivar o status dos leilões.
window.NL_TODAY = new Date(2026, 9, 25);

// Informações de data/hora e status a partir do campo "auction" (ex.: "... — 26/10").
window.NL_DATEINFO = function (lot) {
  var m = (lot.auction || '').match(/(\d{2})\/(\d{2})/);
  var d = m ? m[1] : '01', mo = m ? m[2] : '01';
  var time = '10:' + String((lot.id % 6) * 10).padStart(2, '0'); // 10:00 … 10:50
  var dateObj = new Date(2026, parseInt(mo, 10) - 1, parseInt(d, 10));
  var diff = Math.round((dateObj - window.NL_TODAY) / 86400000);
  var status = diff < 0 ? { k: 'closed', l: 'Encerrado' }
    : (diff <= 3 ? { k: 'open', l: 'Aberto para lances' } : { k: 'soon', l: 'Em breve' });
  var wd = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][dateObj.getDay()];
  var wdShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dateObj.getDay()];
  return {
    date: d + '/' + mo + '/2026',
    dm: d + '/' + mo,
    time: time,
    weekday: wd,
    weekdayShort: wdShort,
    label: wdShort + ', ' + d + '/' + mo + ' às ' + time,
    status: status,
    sortKey: dateObj.getTime()
  };
};
