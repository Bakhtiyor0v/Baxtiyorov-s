/*
 * Aqlli qidiruv:
 *  - lotin / kirill (нексия = nexia), o'zbek / rus sinonimlari (масло = moy)
 *  - artikul, OEM, shtrix-kod (tire va bo'shliqsiz ham: 2630035505)
 *  - 1 harflik xatolarni kechiradi (akumulyator, kobalt)
 *  - bir nechta so'z bo'lsa — hammasiga mos kelganlar oldinda
 */
(function () {
  const CYR = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y',
    'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
    'х': 'x', 'ц': 's', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'ў': 'o', 'қ': 'q', 'ғ': 'g', 'ҳ': 'h',
  };

  const SYN = [
    [['filtr', 'filter', 'filtir', 'filtri', 'filtrlar'], 'filtr'],
    [['moy', 'maslo', 'masla', 'masl', 'yog', 'moylar', 'moyi'], 'moy'],
    [['havo', 'vozdux', 'vozdushniy', 'vozdushnyy', 'xavo', 'vozdushnyi'], 'havo'],
    [['salon', 'salonniy', 'salonnyy', 'kondisioner', 'salonnyi'], 'salon'],
    [['yoqilgi', 'yoqilg', 'toplivo', 'toplivniy', 'toplivnyy', 'benzin', 'yonilgi'], 'yoqilgi'],
    [['karobka', 'korobka', 'kpp', 'avtomat'], 'karobka'],
    [['tormoz', 'tormuz', 'tormoznoy', 'tormoznye', 'brake'], 'tormoz'],
    [['kolodka', 'kolodki', 'kolotka', 'kalodka'], 'kolodka'],
    [['disk', 'diski', 'disklari', 'disklar'], 'disk'],
    [['svecha', 'svechi', 'sveycha', 'svechka', 'svecha'], 'svecha'],
    [['amortizator', 'amortizatr', 'amort', 'amortizatori'], 'amortizator'],
    [['dvornik', 'shotka', 'shetka', 'shyotka', 'dvorniki', 'stekloochistitel'], 'dvornik'],
    [['akkumulyator', 'akkumlyator', 'akb', 'akumulyator', 'akkumulyatr'], 'akkumulyator'],
    [['antifriz', 'antifris', 'tosol'], 'antifriz'],
    [['saylentblok', 'salenblok', 'sailentblok', 'silentblok', 'saylenblok'], 'saylentblok'],
    [['remen', 'rimen', 'grm', 'remeni'], 'remen'],
    [['zanjir', 'sep', 'tsep'], 'zanjir'],
    [['richag', 'rychag'], 'richag'],
    [['lampa', 'lampochka', 'lampochki'], 'lampa'],
    [['fara', 'fary', 'faralar'], 'fara'],
    [['fonar', 'fonari', 'stop'], 'fonar'],
    [['pompa', 'pomp', 'nasos', 'vodyanoy'], 'pompa'],
    [['termostat', 'termastat'], 'termostat'],
    [['granata', 'shrus', 'grenata'], 'granata'],
    [['starter', 'startyor', 'startr'], 'starter'],
    [['generator', 'genarator', 'dinamo'], 'generator'],
    [['katushka', 'katushkasi', 'katushki'], 'katushka'],
    [['bamper', 'bampir'], 'bamper'],
    [['zerkalo', 'oyna', 'ko\'zgu'], 'zerkalo'],
    [['shlang', 'shlangi', 'shlanglar'], 'shlang'],
    [['podushka', 'podushkasi', 'opora'], 'podushka'],
    // Mashinalar
    [['nexia', 'neksiya', 'neksia', 'nexiya', 'neksya', 'neksiy'], 'nexia'],
    [['lacetti', 'lasetti', 'laceti', 'laseti'], 'lacetti'],
    [['cobalt', 'kobalt'], 'cobalt'],
    [['gentra', 'jentra', 'djentra', 'zhentra'], 'gentra'],
    [['damas', 'damaz'], 'damas'],
    [['matiz', 'matis'], 'matiz'],
    [['spark', 'sparq'], 'spark'],
    [['malibu', 'malibo'], 'malibu'],
    [['captiva', 'kaptiva'], 'captiva'],
    [['tracker', 'treker', 'trekker'], 'tracker'],
    [['kia', 'kiya', 'kio'], 'kia'],
    [['hyundai', 'xyundai', 'xundai', 'hundai', 'xendai', 'xyundey', 'hyundey', 'hendai'], 'hyundai'],
    [['accent', 'aksent', 'aktsent'], 'accent'],
    [['elantra', 'elantira'], 'elantra'],
    [['sportage', 'sportej', 'sportaj'], 'sportage'],
  ];
  const SYNMAP = new Map();
  SYN.forEach(([list, canon]) => list.forEach((w) => SYNMAP.set(w.replace(/'/g, ''), canon)));
  const PREFIXES = [...SYNMAP.entries()].filter(([k]) => k.length >= 4);

  const translit = (s) => String(s).toLowerCase().replace(/[а-яёўқғҳ]/g, (c) => CYR[c] ?? c);
  const normalize = (s) => translit(s).replace(/[ʻʼ'`’‘]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const compact = (s) => normalize(s).replace(/\s+/g, '');
  function canon(word) {
    if (SYNMAP.has(word)) return SYNMAP.get(word);
    for (const [k, v] of PREFIXES) if (word.startsWith(k)) return v;
    return word;
  }
  const tokens = (s) => normalize(s).split(' ').filter(Boolean).map(canon);

  function lev1(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, diff = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++diff > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return diff + (a.length - i) + (b.length - j) <= 1;
  }

  let index = [];
  let byId = {};
  function build(products, categories) {
    const catNames = Object.fromEntries(categories.map((c) => [c.id, Object.values(c.name).join(' ')]));
    byId = Object.fromEntries(products.map((p) => [p.id, p]));
    index = products.map((p) => ({
      p,
      words: [...new Set(tokens([p.name, p.brand, catNames[p.cat], p.cars.join(' ')].join(' ')))],
      nameWords: new Set(tokens(p.name)),
      codes: [p.sku, p.oem, p.barcode].map(compact).filter(Boolean),
    }));
  }

  function score(entry, qTokens, qCompact) {
    let s = 0;
    if (qCompact.length >= 3) {
      for (const c of entry.codes) {
        if (c === qCompact) s += 100;
        else if (qCompact.length >= 4 && c.includes(qCompact)) s += 60;
        else if (qCompact.length >= 6 && c.length >= 5 && qCompact.includes(c)) s += 50;
      }
    }
    let matched = 0;
    for (const t of qTokens) {
      let best = 0;
      for (const w of entry.words) {
        if (w === t) { best = entry.nameWords.has(w) ? 11 : 10; break; }
        if (t.length >= 2 && w.startsWith(t)) best = Math.max(best, 7);
        else if (t.length >= 4 && lev1(t, w)) best = Math.max(best, 5);
        else if (t.length >= 4 && w.includes(t)) best = Math.max(best, 4);
      }
      if (t.length >= 3) for (const c of entry.codes) if (c.includes(t)) best = Math.max(best, 8);
      if (best) matched++;
      s += best;
    }
    const full = qTokens.length > 0 && matched === qTokens.length;
    if (full) s += 15;
    else if (qTokens.length > 1 && matched < Math.ceil(qTokens.length / 2) && s < 50) s = 0;
    if (s > 0 && entry.p.stock > 0) s += 2;
    if (s > 0 && entry.p.isHit) s += 1;
    return { s, full };
  }

  function query(q, opts = {}) {
    const qTokens = tokens(q);
    const qCompact = compact(q);
    if (!qTokens.length) return [];
    let res = index.map((e) => ({ p: e.p, ...score(e, qTokens, qCompact) })).filter((r) => r.s > (opts.min ?? 4));
    if (qTokens.length > 1 && res.some((r) => r.full)) res = res.filter((r) => r.full || r.s >= 50);
    return res.sort((a, b) => b.s - a.s).map((r) => r.p);
  }

  // OCR natijasi: ko'p so'z/kodlar — eng ko'p mos kelganlar
  function queryMany(list) {
    const acc = new Map();
    list.forEach((q, i) => {
      const weight = list.length - i;
      const isCode = /\d/.test(q) && compact(q).length >= 5;
      query(q, { min: isCode ? 40 : 6 }).slice(0, 12).forEach((p, rank) => {
        acc.set(p.id, (acc.get(p.id) || 0) + weight * (12 - rank) * (isCode ? 4 : 1));
      });
    });
    return [...acc.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => byId[id]);
  }

  // Kamera natijasi uchun: kod bo'yicha kuchli moslik + so'zlar bo'yicha o'xshashlar
  function matchScan({ codes = [], words = [] }) {
    const strong = new Map();
    for (const c of codes) {
      const cc = compact(c);
      if (cc.length < 5) continue;
      byCode(c).forEach((p) => strong.set(p.id, p));
      index.forEach((e) => {
        if (e.codes.some((x) => x.length >= 5 && (x.includes(cc) && cc.length >= 6 || cc.includes(x) && x.length >= 7))) strong.set(e.p.id, e.p);
      });
    }
    const strongList = [...strong.values()];
    const similar = queryMany([...codes, ...words]).filter((p) => !strong.has(p.id));
    return { strong: strongList, similar };
  }

  function byCode(code) {
    const c = compact(code);
    if (!c) return [];
    return index.filter((e) => e.codes.includes(c)).map((e) => e.p);
  }

  function highlight(text, q, esc) {
    const qt = normalize(q).split(' ').filter((t) => t.length >= 2).map(canon);
    if (!qt.length) return esc(text);
    return text.split(/(\s+|\/)/).map((w) => {
      const n = normalize(w);
      const hit = n && qt.some((t) => n.startsWith(t) || canon(n) === t);
      return hit ? '<mark>' + esc(w) + '</mark>' : esc(w);
    }).join('');
  }

  window.CO = window.CO || {};
  window.CO.search = { build, query, queryMany, matchScan, byCode, highlight, normalize, compact, tokens };
})();
