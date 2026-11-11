/*
 * CarOne — NAMUNAVIY katalog (demo).
 * --------------------------------------------------------------
 * Nomlar Bito CarOne'dagi mahsulotlar uslubida, lekin NARX, QOLDIQ,
 * OEM va SHTRIX-KODLAR NAMUNAVIY. Haqiqiy ma'lumotlar keyinchalik
 * Bito integratsiyasi orqali keladi (integrations/bito/README.md).
 * Bu fayl Bito ma'lumotlar bazasiga hech qanday aloqasi yo'q.
 */
(function () {
  const categories = [
    { id: 'filter', name: { uz: 'Filtrlar', ru: 'Фильтры' }, icon: 'filter', color: '#3478f4' },
    { id: 'oil', name: { uz: 'Moy va suyuqliklar', ru: 'Масла и жидкости' }, icon: 'oil', color: '#f0a33a' },
    { id: 'brake', name: { uz: 'Tormoz tizimi', ru: 'Тормозная система' }, icon: 'brake', color: '#e5484d' },
    { id: 'engine', name: { uz: 'Dvigatel', ru: 'Двигатель' }, icon: 'engine', color: '#6b7bf0' },
    { id: 'suspension', name: { uz: 'Xodovoy qism', ru: 'Ходовая часть' }, icon: 'suspension', color: '#2fa36b' },
    { id: 'electric', name: { uz: 'Elektrika', ru: 'Электрика' }, icon: 'electric', color: '#e0b100' },
    { id: 'body', name: { uz: 'Kuzov', ru: 'Кузов' }, icon: 'body', color: '#3ab8c9' },
    { id: 'light', name: { uz: 'Chiroqlar', ru: 'Освещение' }, icon: 'light', color: '#f07b3a' },
    { id: 'wiper', name: { uz: 'Dvornik', ru: 'Дворники' }, icon: 'wiper', color: '#5aa0d8' },
    { id: 'chem', name: { uz: 'Avtokimyo', ru: 'Автохимия' }, icon: 'chem', color: '#a05ad8' },
    { id: 'hardware', name: { uz: 'Bolt, gayka, shlang', ru: 'Крепёж, шланги' }, icon: 'hardware', color: '#7a8a9a' },
  ];

  // Mashinalar (garaj uchun). key — mahsulotlardagi moslik kaliti
  const brands = [
    { id: 'chevrolet', name: 'Chevrolet / Daewoo', models: ['Nexia', 'Nexia 3', 'Cobalt', 'Lacetti', 'Gentra', 'Spark', 'Matiz', 'Damas', 'Labo', 'Malibu', 'Captiva', 'Tracker', 'Onix'] },
    { id: 'kia', name: 'Kia', models: ['Kia Rio', 'Kia K5', 'Kia Sportage', 'Kia Seltos', 'Kia Sorento'] },
    { id: 'hyundai', name: 'Hyundai', models: ['Hyundai Accent', 'Hyundai Elantra', 'Hyundai Sonata', 'Hyundai Tucson', 'Hyundai Creta'] },
  ];
  const quickCars = ['Nexia', 'Cobalt', 'Lacetti', 'Gentra', 'Damas', 'Spark', 'Matiz', 'Malibu', 'Kia Rio', 'Hyundai Accent'];

  // [name, sku, oem, cat, cars, brand, country, price, oldPrice, stock, barcode, flags]
  const N = ['Nexia'], N3 = ['Nexia 3'], NX = ['Nexia', 'Nexia 3'];
  const LG = ['Lacetti', 'Gentra'], CB = ['Cobalt'], SM = ['Spark', 'Matiz'], DM = ['Damas', 'Labo'];
  const B15 = ['Nexia 3', 'Cobalt', 'Spark', 'Onix'];
  const KH = ['Kia Rio', 'Hyundai Accent', 'Hyundai Creta'];
  const raw = [
    // Filtrlar
    ['Moy filtri Nexia / Lacetti / Cobalt', '91701', '96879797', 'filter', [...NX, ...LG, ...CB], 'GM Korea', 'KR', 38000, 0, 59, '8809245321015', 'hit'],
    ['Havo filtri Cobalt / Spark / Nexia 3', '91702', '96950990', 'filter', B15, 'Shinhwa', 'KR', 45000, 52000, 60, '8809245321022', 'sale'],
    ['Havo filtri Nexia DOHC', '91703', '96182220', 'filter', N, 'Parts-Mall', 'KR', 42000, 0, 24, '8809245321039', ''],
    ['Havo filtri Lacetti / Gentra', '91720', '96553450', 'filter', LG, 'Parts-Mall', 'KR', 48000, 0, 18, '8809245321107', ''],
    ['Havo filtri Damas / Matiz', '91721', '96314494', 'filter', [...DM, ...SM], 'Shinhwa', 'KR', 30000, 0, 33, '8809245321114', ''],
    ['Salon filtri Lacetti / Gentra', '91704', '96554378', 'filter', LG, 'Parts-Mall', 'KR', 35000, 0, 28, '8809245321046', ''],
    ['Salon filtri Cobalt ko\'mirli', '91705', '95961346', 'filter', B15, 'Shinhwa', 'KR', 55000, 0, 12, '8809245321053', 'new'],
    ['Salon filtri Malibu 2', '91722', '13271190', 'filter', ['Malibu'], 'GM Korea', 'KR', 85000, 0, 7, '8809245321121', ''],
    ['Yoqilg\'i filtri Damas / Matiz', '91706', '96335719', 'filter', [...DM, ...SM], 'Shinhwa', 'KR', 28000, 0, 11, '8809245321060', ''],
    ['Yoqilg\'i filtri Nexia / Lacetti', '91723', '25121074', 'filter', [...N, ...LG], 'GM Korea', 'KR', 39000, 0, 15, '8809245321138', ''],
    ['Karobka filtri Cobalt / Gentra avtomat', '91707', '24230604', 'filter', [...CB, 'Gentra', 'Onix'], 'GM Korea', 'KR', 120000, 0, 32, '8809245321077', ''],
    ['Moy filtri Kia Rio / Hyundai Accent', '91708', '26300-35505', 'filter', [...KH, 'Hyundai Elantra', 'Kia Seltos'], 'Hyundai Mobis', 'KR', 48000, 0, 40, '8809245321084', 'hit'],
    ['Havo filtri Kia Seltos / Hyundai Creta', '91709', '28113-Q5000', 'filter', ['Kia Seltos', 'Hyundai Creta'], 'Hyundai Mobis', 'KR', 95000, 0, 9, '8809245321091', ''],
    ['Salon filtri Hyundai Elantra / Kia K5', '91724', '97133-F2000', 'filter', ['Hyundai Elantra', 'Kia K5', 'Hyundai Sonata'], 'Hyundai Mobis', 'KR', 78000, 0, 0, '8809245321145', ''],
    // Moylar
    ['SHELL HELIX Ultra 5W-30 sintetik 4L', '806243', 'HELIX-5W30-4', 'oil', [...NX, ...CB, ...LG, 'Malibu'], 'Shell', 'NL', 420000, 465000, 8, '5011987654327', 'sale'],
    ['ZIC X7 5W-40 sintetik 4L', '52195', 'ZIC-X7-5W40', 'oil', [...KH, 'Malibu', 'Kia Sportage'], 'ZIC', 'KR', 380000, 0, 6, '8801051234565', 'hit'],
    ['ZIC X5 10W-40 yarim sintetik 4L', '52196', 'ZIC-X5-10W40', 'oil', [...N, ...DM, ...SM], 'ZIC', 'KR', 290000, 0, 14, '8801051234572', ''],
    ['GM Dexos2 5W-30 4L original', '52197', '93165557', 'oil', [...CB, ...LG, 'Malibu', 'Tracker'], 'GM', 'KR', 450000, 0, 4, '8809245322005', 'new'],
    ['Tormoz suyuqligi DAEWOO GM DOT-3 0.5L original', '52172', 'DOT-3-05', 'oil', [...N, ...DM, ...SM, ...LG], 'GM', 'KR', 32000, 0, 10, '8809245322012', ''],
    ['Antifriz G12 qizil 5L', '52190', 'G12-5L', 'oil', [...NX, ...CB, ...LG, 'Spark'], 'Sintec', 'RU', 110000, 0, 15, '4607971752110', ''],
    ['Karobka moyi ATF Dexron VI 1L', '52198', 'DEX6-1L', 'oil', [...CB, 'Gentra', 'Malibu'], 'GM', 'KR', 95000, 0, 22, '8809245322029', ''],
    // Tormoz
    ['Tormoz kolodka old Nexia', '53110', '96273708', 'brake', N, 'Sangsin', 'KR', 165000, 0, 14, '8809245323019', 'hit'],
    ['Tormoz kolodka old Cobalt / Nexia 3', '53111', '13301234', 'brake', B15, 'Sangsin', 'KR', 195000, 220000, 10, '8809245323026', 'sale'],
    ['Tormoz kolodka old Lacetti / Gentra', '53112', '96534653', 'brake', LG, 'Sangsin', 'KR', 210000, 0, 9, '8809245323057', ''],
    ['Tormoz kolodka orqa baraban Lacetti', '53113', '96245178', 'brake', LG, 'Hi-Q', 'KR', 180000, 0, 5, '8809245323064', ''],
    ['Tormoz kolodka old Kia Rio / Accent', '53114', '58101-1RA00', 'brake', KH, 'Hyundai Mobis', 'KR', 320000, 0, 6, '8809245323071', ''],
    ['Bosh tormoz silindri Damas Korea', '51389', '96410122', 'brake', DM, 'Korea', 'KR', 280000, 0, 1, '8809245323033', ''],
    ['Tormoz disklari Lacetti old (2 dona)', '53120', '96549787', 'brake', LG, 'Parts-Mall', 'KR', 540000, 0, 4, '8809245323040', ''],
    // Dvigatel
    ['Porshen + halqa Cobalt GM LPG', '51785', '25185027', 'engine', CB, 'GM', 'KR', 1650000, 0, 5, '8809245324016', ''],
    ['Klapan qopqog\'i DOHC 1.6', '61897', 'WXQP-512791', 'engine', [...N, ...LG], 'WXQP', 'CN', 310000, 0, 1, '8809245324023', ''],
    ['Svecha NGK Nexia / Lacetti (4 dona)', '61900', '96130723', 'engine', [...NX, ...LG, ...CB], 'NGK', 'JP', 120000, 140000, 30, '4012345678901', 'sale'],
    ['GRM remen komplekti Nexia SOHC', '61910', '93744741', 'engine', N, 'Gates', 'BE', 360000, 0, 7, '5412345678908', ''],
    ['GRM zanjir komplekti Cobalt 1.5', '61911', '24104253', 'engine', B15, 'GM', 'KR', 980000, 0, 3, '8809245324047', 'new'],
    ['Vakuum shlangi Nexia', '72368', '96215685', 'engine', N, 'Korea', 'KR', 25000, 0, 2, '8809245324030', ''],
    ['Pompa (suv nasosi) Lacetti 1.6', '61920', '96352650', 'engine', LG, 'Parts-Mall', 'KR', 340000, 0, 6, '8809245324054', ''],
    ['Termostat Nexia / Lacetti', '61921', '96143939', 'engine', [...N, ...LG], 'Wahler', 'DE', 145000, 0, 11, '4006719201222', ''],
    ['Dvigatel podushkasi Cobalt o\'ng', '61922', '95227959', 'engine', CB, 'Shinhwa', 'KR', 260000, 0, 4, '8809245324061', ''],
    // Xodovoy
    ['Saylentblok richag Cobalt', '53820', '95227871', 'suspension', CB, 'Shinhwa', 'KR', 55000, 0, 10, '8809245325013', ''],
    ['Stabilizator stoykasi Exinox original', '91800', '96403099', 'suspension', [...LG, ...N], 'Exinox', 'KR', 85000, 0, 6, '8809245325020', ''],
    ['Amortizator old Nexia (gazli)', '53830', '96444919', 'suspension', N, 'Kayaba', 'JP', 450000, 0, 8, '8809245325037', 'hit'],
    ['Amortizator old Cobalt (gazli)', '53831', '95227808', 'suspension', B15, 'Kayaba', 'JP', 520000, 0, 6, '8809245325068', ''],
    ['Ichki granata Gentra A-T / Nexia 3', '79795', 'R-1X8', 'suspension', ['Gentra', ...N3], 'Caymont', 'KR', 320000, 0, 4, '8809245325044', ''],
    ['Rul nakonechnigi Lacetti', '53840', '96415064', 'suspension', LG, 'CTR', 'KR', 95000, 0, 12, '8809245325075', ''],
    ['Shrus tashqi Matiz', '53841', '96317254', 'suspension', SM, 'Korea', 'KR', 310000, 0, 3, '8809245325082', ''],
    ['Glushitel rezinkasi Lacetti (2 ta)', '56475', '96553520', 'suspension', LG, 'Saehan', 'KR', 18000, 0, 10, '8809245325051', ''],
    // Elektrika
    ['Diod ko\'prigi Damas', '79060', '31621A80D00', 'electric', DM, 'Korea', 'KR', 210000, 0, 2, '8809245326010', ''],
    ['Oyna ko\'targich bloki Nexia 3', '61651', 'WXQP-520777', 'electric', N3, 'WXQP', 'CN', 240000, 0, 2, '8809245326027', ''],
    ['Dvornik motori Nexia', '79829', 'CAYMONT-1X10', 'electric', N, 'Caymont', 'KR', 380000, 0, 1, '8809245326034', ''],
    ['Stop tugmasi orqa Nexia', '91784', '96190521', 'electric', N, 'Korea', 'KR', 15000, 0, 98, '8809245326041', ''],
    ['Akkumulyator 60Ah', '61700', 'AKB-60', 'electric', [...NX, ...CB, ...LG, ...KH], 'Rocket', 'KR', 950000, 1050000, 5, '8809245326058', 'sale'],
    ['Starter Matiz', '61701', '96566177', 'electric', SM, 'Korea', 'KR', 820000, 0, 2, '8809245326065', ''],
    ['Generator Lacetti 1.6', '61702', '96991018', 'electric', LG, 'Korea', 'KR', 1450000, 0, 1, '8809245326072', ''],
    ['O\'t oldirish katushkasi Cobalt', '61703', '55570160', 'electric', B15, 'GM', 'KR', 420000, 0, 5, '8809245326089', 'new'],
    // Kuzov
    ['Bagaj zichlagichi Damas', '79012', '94587214', 'body', DM, 'AVTO-JON', 'UZ', 95000, 0, 4, '8809245327017', ''],
    ['Podkrylnik old o\'ng Kia Rio', '91785', '86812-1W000', 'body', ['Kia Rio'], 'Korea', 'KR', 140000, 0, 5, '8809245327024', ''],
    ['Orqa stop klipsasi Nexia', '91804', '96190998', 'body', N, 'Korea', 'KR', 3000, 0, 1, '8809245327031', ''],
    ['Qo\'l tormozi trosi Cobalt', '78599', 'CAYMONT-1X25', 'body', CB, 'Caymont', 'KR', 120000, 0, 2, '8809245327048', ''],
    ['Yon oyna (zerkalo) chap Spark', '78600', '95967532', 'body', ['Spark'], 'Korea', 'KR', 380000, 0, 3, '8809245327055', ''],
    ['Old bamper Cobalt (bo\'yalmagan)', '78601', '52021372', 'body', CB, 'GM', 'KR', 890000, 0, 2, '8809245327062', ''],
    // Chiroqlar
    ['Old fara chap Nexia 3', '78700', '95227456', 'light', N3, 'Depo', 'TW', 760000, 0, 3, '8809245328106', ''],
    ['Lampa H4 Philips Vision (2 dona)', '78701', 'H4-PHILIPS', 'light', [...N, ...DM, ...SM], 'Philips', 'DE', 85000, 0, 25, '8711500408570', 'hit'],
    ['Lampa H7 Osram Night Breaker', '78702', 'H7-OSRAM', 'light', [...LG, ...CB, 'Malibu'], 'Osram', 'DE', 145000, 165000, 18, '4052899425484', 'sale'],
    ['Orqa stop fonari o\'ng Lacetti', '78703', '96551232', 'light', ['Lacetti'], 'Depo', 'TW', 540000, 0, 1, '8809245328113', ''],
    // Dvornik
    ['Orqa shyotka Kia Seltos', '91805', '98850-Q5000', 'wiper', ['Kia Seltos'], 'Hyundai Mobis', 'KR', 75000, 0, 1, '8809245328014', ''],
    ['Dvornik GAP 600/400 komplekt', '91801', 'GAP-600', 'wiper', [...CB, ...LG, 'Malibu'], 'GAP', 'KR', 70000, 0, 20, '8809245328021', ''],
    ['Dvornik mexanizmi (trapetsiya) Nexia', '71650', 'WEISMO-NX', 'wiper', N, 'Weismo', 'KR', 260000, 0, 3, '8809245328038', ''],
    ['Dvornik Bosch Aerotwin 550/450', '71651', 'A863S', 'wiper', [...KH, 'Hyundai Elantra'], 'Bosch', 'DE', 165000, 0, 9, '3397007863002', 'new'],
    // Avtokimyo
    ['BlackOdor BO-43 xushbo\'ylagich', '91806', 'BO-43', 'chem', [], 'BlackOdor', 'UZ', 35000, 0, 5, '4600000091808', ''],
    ['STP shumka 3', '91799', 'STP-3', 'chem', [], 'STP', 'US', 95000, 0, 20, '4600000091792', ''],
    ['Oyna yuvish suyuqligi -20°C 4L', '91807', 'WASH-20', 'chem', [], 'Sintec', 'RU', 45000, 0, 40, '4607971750000', ''],
    ['WD-40 200 ml', '91808', 'WD40-200', 'chem', [], 'WD-40', 'US', 48000, 0, 30, '5032227000001', 'hit'],
    // Krepyoj
    ['Bolt M8×40', '91791', 'M8x40', 'hardware', [], 'DIN', 'CN', 2000, 0, 50, '4600000091792', ''],
    ['Bolt M5×30', '91793', 'M5x30', 'hardware', [], 'DIN', 'CN', 1000, 0, 100, '4600000091792', ''],
    ['Gayka M10', '91796', 'M10', 'hardware', [], 'DIN', 'CN', 1000, 0, 100, '4600000091792', ''],
    ['Gaz shlangi 8 mm (1 metr)', '91786', 'GAZ-8', 'hardware', [...N, ...CB, ...DM], 'Korea', 'KR', 12000, 0, 10, '4600000091785', ''],
    ['Gaz shlangi 5 mm (1 metr)', '91787', 'GAZ-5', 'hardware', [...N, ...CB, ...DM], 'Korea', 'KR', 9000, 0, 10, '4600000091785', ''],
    // ---- Do'kon egasi yuborgan rasmlar bilan (narxlar NAMUNAVIY) ----
    // [.., image, { fitUnknown }] — mosligi aniq kiritilmagan: sotuvchidan so'rash taklif qilinadi
    ['Enerzon EFB 60 Ah · CCA 550 akkumulyator', '61710', 'EFB-60AH-550', 'electric', [], 'Enerzon', 'UZ', 1150000, 0, 6, '4780000617101', 'new', null, { fitUnknown: true }],
    ['Enerzon EFB 75 Ah · CCA 700 akkumulyator', '61711', 'EFB-75AH-700', 'electric', [], 'Enerzon', 'UZ', 1390000, 0, 4, '4780000617118', 'new', null, { fitUnknown: true }],
    ['Gidravlik vyjimnoy podshipnik (stseplenie)', '61720', 'CSC-HYD-01', 'engine', [], 'Korea', 'KR', 690000, 0, 3, '4780000617200', '', 'assets/products/clutch-bearing.jpg', { fitUnknown: true }],
    ['Suv pompasi (Koreya)', '61721', 'PUMP-KR-01', 'engine', [], 'Korea', 'KR', 420000, 0, 5, '4780000617217', '', 'assets/products/water-pump-kr.jpg', { fitUnknown: true }],
    ['Suv pompasi (Xitoy)', '61722', 'PUMP-CN-01', 'engine', [], 'China', 'CN', 260000, 0, 7, '4780000617224', '', 'assets/products/water-pump-cn.jpg', { fitUnknown: true }],
    ['Vint M 4 Sariq', '91795', 'M4-SARIQ', 'hardware', [], 'Korea', 'KR', 500, 0, 100, '4600000091795', '', 'assets/products/vint-m4-sariq.jpg'],
    ['Bolt M 19*80', '91789', 'M19x80', 'hardware', [], 'Korea', 'KR', 6000, 0, 30, '4600000091789', '', 'assets/products/bolt-m19x80.jpg'],
  ];

  const products = raw.map((r, i) => ({
    id: 'p' + (i + 1),
    name: r[0], sku: r[1], oem: r[2], cat: r[3], cars: [...new Set(r[4])], brand: r[5], country: r[6],
    price: r[7], oldPrice: r[8] || 0, stock: r[9], barcode: r[10],
    isHit: r[11] === 'hit', isNew: r[11] === 'new', unit: 'dona',
    // Rasm keyinchalik Bito'dan (images[]) keladi
    image: r[12] || null,
    fitUnknown: !!(r[13] && r[13].fitUnknown),
  }));

  window.CO = window.CO || {};
  window.CO.demoCatalog = { categories, brands, quickCars, products };
})();
