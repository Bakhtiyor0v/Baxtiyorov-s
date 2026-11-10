/*
 * CarOne — katalog ma'lumotlari.
 * Hozircha namunaviy ro'yxat (nomlar Bito CarOne'dagi mahsulotlar asosida, narxlar NAMUNAVIY).
 * Keyinchalik bu faylni Bito API'dan avtomatik eksport bilan almashtirish mumkin
 * (README.md ga qarang). Maydonlar:
 *   id, name, sku (artikul), oem (zavod raqami), cat, cars[], brand, price (so'm), stock, barcode
 */
window.CARONE = (function () {
  const ICONS = {
    filter: '<svg viewBox="0 0 24 24"><path d="M4 5h16l-6 7v6l-4 2v-8z"/></svg>',
    oil: '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/></svg>',
    brake: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2"/></svg>',
    engine: '<svg viewBox="0 0 24 24"><path d="M4 10h2V8h4V6h4v2h3l2 3h2v5h-2l-2 3H8l-2-3H4z"/></svg>',
    electric: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    body: '<svg viewBox="0 0 24 24"><path d="M3 15v-3l2-5h14l2 5v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="7.5" cy="16" r="2"/><circle cx="16.5" cy="16" r="2"/><path d="M5 12h14"/></svg>',
    suspension: '<svg viewBox="0 0 24 24"><path d="M12 2v3M9 5h6M9 8l6 2-6 2 6 2-6 2 6 2M9 19h6M12 19v3"/></svg>',
    hardware: '<svg viewBox="0 0 24 24"><path d="M9 3h6l3 5-3 5H9L6 8z"/><path d="M10.5 13v8M13.5 13v8"/></svg>',
    wiper: '<svg viewBox="0 0 24 24"><path d="M3 18A13 13 0 0 1 21 18"/><path d="M12 18 6 7"/></svg>',
    chem: '<svg viewBox="0 0 24 24"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/></svg>',
    box: '<svg viewBox="0 0 24 24"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/></svg>',
  };

  const categories = [
    { id: 'filter', name: 'Filtrlar', icon: 'filter' },
    { id: 'oil', name: 'Moy va suyuqlik', icon: 'oil' },
    { id: 'brake', name: 'Tormoz tizimi', icon: 'brake' },
    { id: 'engine', name: 'Dvigatel', icon: 'engine' },
    { id: 'suspension', name: 'Xodovoy', icon: 'suspension' },
    { id: 'electric', name: 'Elektrika', icon: 'electric' },
    { id: 'body', name: 'Kuzov', icon: 'body' },
    { id: 'wiper', name: 'Dvornik', icon: 'wiper' },
    { id: 'chem', name: 'Avtokimyo', icon: 'chem' },
    { id: 'hardware', name: 'Bolt, gayka', icon: 'hardware' },
  ];

  const cars = ['Nexia', 'Damas', 'Cobalt', 'Lacetti', 'Gentra', 'Spark', 'Matiz', 'Malibu', 'Kia', 'Hyundai'];

  // [name, sku, oem, cat, cars, brand, price, stock, barcode]
  const raw = [
    ['Moy filtri Nexia / Lacetti / Cobalt', '91701', '96879797', 'filter', ['Nexia', 'Lacetti', 'Cobalt', 'Gentra'], 'GM Korea', 38000, 59, '8809245321014'],
    ['Havo filtri Cobalt / Spark', '91702', '96950990', 'filter', ['Cobalt', 'Spark'], 'Shinhwa', 45000, 60, '8809245321021'],
    ['Havo filtri Nexia DOHC', '91703', '96182220', 'filter', ['Nexia'], 'Parts-Mall', 42000, 24, '8809245321038'],
    ['Salon filtri Lacetti / Gentra', '91704', '96554378', 'filter', ['Lacetti', 'Gentra'], 'Parts-Mall', 35000, 28, '8809245321045'],
    ['Salon filtri Cobalt ugolniy', '91705', '95961346', 'filter', ['Cobalt', 'Spark'], 'Shinhwa', 55000, 12, '8809245321052'],
    ['Yoqilg\'i filtri Damas / Matiz', '91706', '96335719', 'filter', ['Damas', 'Matiz'], 'Shinhwa', 28000, 11, '8809245321069'],
    ['Karobka filtri Cobalt avtomat', '91707', '24230604', 'filter', ['Cobalt', 'Gentra'], 'GM Korea', 120000, 32, '8809245321076'],
    ['Moy filtri Kia Rio / Hyundai Accent', '91708', '26300-35505', 'filter', ['Kia', 'Hyundai'], 'Hyundai Mobis', 48000, 40, '8809245321083'],
    ['Havo filtri Kia Seltos', '91709', '28113-Q5000', 'filter', ['Kia'], 'Hyundai Mobis', 95000, 9, '8809245321090'],
    ['Масло синтетическое SHELL HELIX 5W-30 4л ULTRA', '806243', 'HELIX-5W30', 'oil', ['Nexia', 'Cobalt', 'Lacetti', 'Gentra', 'Malibu'], 'Shell', 420000, 8, '5011987654321'],
    ['Tormoz suyuqligi DAEWOO GM 0.5л DOT-3 Original', '52172', 'DOT-3', 'oil', ['Nexia', 'Damas', 'Matiz', 'Lacetti'], 'GM', 32000, 10, '8809245322011'],
    ['Antifriz G12 qizil 5л', '52190', 'G12-5L', 'oil', ['Nexia', 'Cobalt', 'Lacetti', 'Gentra', 'Spark'], 'Sintec', 110000, 15, '4607971752110'],
    ['ZIC X7 5W-40 4л', '52195', 'ZIC-X7-5W40', 'oil', ['Kia', 'Hyundai', 'Malibu'], 'ZIC', 380000, 6, '8801051234567'],
    ['Tormoz kolodka old Nexia', '53110', '96273708', 'brake', ['Nexia'], 'Sangsin', 165000, 14, '8809245323018'],
    ['Tormoz kolodka old Cobalt', '53111', '13301234', 'brake', ['Cobalt', 'Spark'], 'Sangsin', 195000, 10, '8809245323025'],
    ['Главный цилиндр тормоз Донс-22 Корея', '51389', '96410122', 'brake', ['Damas', 'Matiz'], 'Korea', 280000, 1, '8809245323032'],
    ['Tormoz diski Lacetti old (2 dona)', '53120', '96549787', 'brake', ['Lacetti', 'Gentra'], 'Parts-Mall', 540000, 4, '8809245323049'],
    ['Поршен+кольца COBALT GM GAZ LPG', '51785', '25185027', 'engine', ['Cobalt'], 'GM', 1650000, 5, '8809245324015'],
    ['Крышка клапан DOHC 1.6', '61897', 'WXQP-512791', 'engine', ['Nexia', 'Lacetti'], 'WXQP', 310000, 1, '8809245324022'],
    ['Svecha Nexia / Lacetti (4 dona)', '61900', '96130723', 'engine', ['Nexia', 'Lacetti', 'Gentra', 'Cobalt'], 'NGK', 120000, 30, '4012345678901'],
    ['GRM remen komplekti Nexia SOHC', '61910', '93744741', 'engine', ['Nexia'], 'Gates', 360000, 7, '5412345678902'],
    ['Шланг вакуум Нексия', '72368', '96215685', 'engine', ['Nexia'], 'Korea', 25000, 2, '8809245324039'],
    ['Saylentblok richag Cobalt rezina', '53820', '95227871', 'suspension', ['Cobalt'], 'Shinhwa', 55000, 10, '8809245325012'],
    ['Stabilizator stoykasi Exinox Original', '91800', '96403099', 'suspension', ['Lacetti', 'Gentra', 'Nexia'], 'Exinox', 85000, 6, '8809245325029'],
    ['Amortizator old Nexia (gaz)', '53830', '96444919', 'suspension', ['Nexia'], 'Kayaba', 450000, 8, '8809245325036'],
    ['Граната внутренняя Жентра A-T / Нексия-3', '79795', 'R-1X8', 'suspension', ['Gentra', 'Nexia'], 'Caymont', 320000, 4, '8809245325043'],
    ['Резинка глушителя Ласетти (2 ta)', '56475', '96553520', 'suspension', ['Lacetti', 'Gentra'], 'Saehan', 18000, 10, '8809245325050'],
    ['Диодный мост Дамас', '79060', '31621A80D00', 'electric', ['Damas'], 'Korea', 210000, 2, '8809245326019'],
    ['Блок подъёмник NEXIA-3', '61651', 'WXQP-520777', 'electric', ['Nexia'], 'WXQP', 240000, 2, '8809245326026'],
    ['Моторчик дворника Нексия', '79829', 'CAYMONT-1X10', 'electric', ['Nexia'], 'Caymont', 380000, 1, '8809245326033'],
    ['Knopka Stop orqa Nexia', '91784', '96190521', 'electric', ['Nexia'], 'Korea', 15000, 98, '8809245326040'],
    ['Akkumulyator 60Ah', '61700', 'AKB-60', 'electric', ['Nexia', 'Cobalt', 'Lacetti', 'Gentra', 'Kia', 'Hyundai'], 'Rocket', 950000, 5, '8809245326057'],
    ['Уплотнитель багажника Дамас', '79012', '94587214', 'body', ['Damas'], 'AVTO-JON', 95000, 4, '8809245327016'],
    ['Padkrilnik old o\'ng Kia', '91785', '86812-1W000', 'body', ['Kia'], 'Korea', 140000, 5, '8809245327023'],
    ['Klipsa orqa stop plastmassa Nexia', '91804', '96190998', 'body', ['Nexia'], 'Korea', 3000, 1, '8809245327030'],
    ['Трос ручника Кобальт', '78599', 'CAYMONT-1X25', 'body', ['Cobalt'], 'Caymont', 120000, 2, '8809245327047'],
    ['Shotka Kia Seltos orqa', '91805', '98850-Q5000', 'wiper', ['Kia'], 'Hyundai Mobis', 75000, 1, '8809245328013'],
    ['Dvornik GAP 600/400 komplekt', '91801', 'GAP-600', 'wiper', ['Cobalt', 'Lacetti', 'Gentra', 'Malibu'], 'GAP', 70000, 20, '8809245328020'],
    ['Механизм дворника Нексия', '71650', 'WEISMO-NX', 'wiper', ['Nexia'], 'Weismo', 260000, 3, '8809245328037'],
    ['BlackOdor BO-43 xushbo\'y', '91806', 'BO-43', 'chem', [], 'BlackOdor', 35000, 5, '4600000091806'],
    ['STP Shumka 3', '91799', 'STP-3', 'chem', [], 'STP', 95000, 20, '4600000091799'],
    ['Bolt M8×40', '91791', 'M8x40', 'hardware', [], 'DIN', 2000, 50, '4600000091791'],
    ['Gayka M10', '91796', 'M10', 'hardware', [], 'DIN', 1000, 100, '4600000091796'],
    ['Shlang GAZ 8 mm (1 metr)', '91786', 'GAZ-8', 'hardware', ['Nexia', 'Cobalt', 'Damas'], 'Korea', 12000, 10, '4600000091786'],
  ];

  const products = raw.map((r, i) => ({
    id: 'p' + (i + 1),
    name: r[0], sku: r[1], oem: r[2], cat: r[3], cars: r[4], brand: r[5], price: r[6], stock: r[7], barcode: r[8],
  }));

  return { ICONS, categories, cars, products, shop: {
    name: 'CarOne',
    phone: '+998 00 000 00 00',       // TODO: haqiqiy raqam
    phoneHref: 'tel:+998000000000',
    telegram: 'carone_shop',          // TODO: Telegram username
    address: 'Toshkent sh.',          // TODO: manzil
  } };
})();
