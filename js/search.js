/*
 * Aqlli qidiruv: lotin / kirill, rus / o'zbek so'zlari, artikul, OEM, shtrix-kod,
 * mashina modeli va kichik xatolarni (1 harf) kechiradi.
 */
window.Search = (function () {
  const { products, categories } = window.CARONE;

  const CYR = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'j', 'з': 'z', 'и': 'i', 'й': 'y',
    'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
    'х': 'x', 'ц': 's', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'i', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'ў': 'o', 'қ': 'q', 'ғ': 'g', 'ҳ': 'h',
  };

  // Sinonimlar: hammasi bitta "kanonik" so'zga keltiriladi
  const SYN = [
    [['filtr', 'filter', 'fil', 'filtir'], 'filtr'],
    [['moy', 'maslo', 'masla', 'yog'], 'moy'],
    [['havo', 'vozdux', 'vozdushniy', 'vozdushnyy', 'xavo'], 'havo'],
    [['salon', 'salonniy', 'salonnyy', 'kondisioner'], 'salon'],
    [['yoqilgi', 'yoqilg', 'toplivo', 'toplivniy', 'benzin'], 'yoqilgi'],
    [['karobka', 'korobka', 'kpp', 'avtomat'], 'karobka'],
    [['tormoz', 'tormuz', 'tormoznoy', 'brake'], 'tormoz'],
    [['kolodka', 'kolodki', 'kolotka'], 'kolodka'],
    [['svecha', 'svechi', 'sveycha'], 'svecha'],
    [['amortizator', 'amortizatr', 'amort'], 'amortizator'],
    [['dvornik', 'shotka', 'shetka', 'dvorniki', 'stekloochistitel'], 'dvornik'],
    [['akkumulyator', 'akkumlyator', 'akb', 'akumulyator'], 'akkumulyator'],
    [['nexia', 'neksiya', 'neksia', 'nexiya', 'neksya'], 'nexia'],
    [['lacetti', 'lasetti', 'laceti', 'lasetti'], 'lacetti'],
    [['cobalt', 'kobalt'], 'cobalt'],
    [['gentra', 'jentra', 'djentra', 'zhentra'], 'gentra'],
    [['damas', 'damaz'], 'damas'],
    [['matiz', 'matis'], 'matiz'],
    [['spark', 'sparq'], 'spark'],
    [['malibu', 'malibo'], 'malibu'],
    [['kia', 'kiya', 'kio'], 'kia'],
    [['hyundai', 'xyundai', 'xundai', 'hundai', 'xendai', 'xyundey', 'hyundey'], 'hyundai'],
    [['antifriz', 'antifris', 'tosol'], 'antifriz'],
    [['saylentblok', 'salenblok', 'sailentblok', 'silentblok'], 'saylentblok'],
    [['remen', 'rimen', 'grm'], 'remen'],
    [['richag', 'rychag'], 'richag'],
  ];
  const SYNMAP = new Map();
  SYN.forEach(([list, canon]) => list.forEach((w) => SYNMAP.set(w, canon)));

  function translit(s) {
    return String(s).toLowerCase().replace(/[а-яёўқғҳ]/g, (c) => CYR[c] ?? c);
  }
  function normalize(s) {
    return translit(s).replace(/[ʻʼ'`’‘]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  const compact = (s) => normalize(s).replace(/\s+/g, '');
  function canon(word) {
    if (SYNMAP.has(word)) return SYNMAP.get(word);
    // so'z boshlanishi bo'yicha: "filtrlar" -> "filtr"
    for (const [k, v] of SYNMAP) if (k.length >= 4 && word.startsWith(k)) return v;
    return word;
  }
  const tokens = (s) => normalize(s).split(' ').filter(Boolean).map(canon);

  function lev1(a, b) {
    // a va b orasidagi farq ≤ 1 harfmi?
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0, j = 0, diff = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++diff > 1) return false;
      if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
    }
    return diff + (a.length - i) + (b.length - j) <= 1;
  }

  // Indeks
  const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const index = products.map((p) => {
    const words = new Set(tokens([p.name, p.brand, catName[p.cat], p.cars.join(' ')].join(' ')));
    return {
      p, words: [...words],
      codes: [p.sku, p.oem, p.barcode].map(compact).filter(Boolean),
    };
  });

  function score(entry, qTokens, qCompact) {
    let s = 0;
    // Kod bo'yicha aniq moslik — eng yuqori
    if (qCompact.length >= 3) {
      for (const c of entry.codes) {
        if (c === qCompact) s += 100;
        else if (c.includes(qCompact) && qCompact.length >= 4) s += 60;
        else if (qCompact.length >= 6 && qCompact.includes(c) && c.length >= 5) s += 50;
      }
    }
    let matched = 0;
    for (const t of qTokens) {
      let best = 0;
      for (const w of entry.words) {
        if (w === t) { best = 10; break; }
        if (t.length >= 2 && w.startsWith(t)) best = Math.max(best, 7);
        else if (t.length >= 4 && lev1(t, w)) best = Math.max(best, 5);
        else if (t.length >= 4 && w.includes(t)) best = Math.max(best, 4);
      }
      for (const c of entry.codes) if (t.length >= 3 && c.includes(t)) best = Math.max(best, 8);
      if (best) matched++;
      s += best;
    }
    // Barcha so'zlar topilgan bo'lsa — bonus; bittasi ham topilmasa — chiqarmaymiz
    if (qTokens.length && matched === qTokens.length) s += 15;
    else if (qTokens.length > 1 && matched < Math.ceil(qTokens.length / 2) && s < 50) s = 0;
    if (s > 0 && entry.p.stock > 0) s += 1;
    return { s, full: qTokens.length > 0 && matched === qTokens.length };
  }

  function query(q, opts = {}) {
    const qTokens = tokens(q);
    const qCompact = compact(q);
    if (!qTokens.length) return [];
    let res = index
      .map((e) => ({ p: e.p, ...score(e, qTokens, qCompact) }))
      .filter((r) => r.s > (opts.min ?? 4));
    // Barcha so'zlarga mos keladiganlar bo'lsa — faqat ularni ko'rsatamiz
    if (qTokens.length > 1 && res.some((r) => r.full)) res = res.filter((r) => r.full || r.s >= 50);
    return res.sort((a, b) => b.s - a.s).map((r) => r.p);
  }

  // Bir nechta so'z/raqamlar to'plamidan (OCR natijasi) eng mos mahsulotlar
  function queryMany(list) {
    const acc = new Map();
    list.forEach((q, i) => {
      const weight = list.length - i;
      query(q, { min: 6 }).slice(0, 12).forEach((p, rank) => {
        acc.set(p.id, (acc.get(p.id) || 0) + weight * (12 - rank));
      });
    });
    return [...acc.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => products.find((p) => p.id === id));
  }

  function byCode(code) {
    const c = compact(code);
    return index.filter((e) => e.codes.includes(c)).map((e) => e.p);
  }

  function highlight(text, q) {
    const qt = normalize(q).split(' ').filter((t) => t.length >= 2);
    if (!qt.length) return escapeHtml(text);
    return text.split(/(\s+)/).map((w) => {
      const n = normalize(w);
      const hit = n && qt.some((t) => n.startsWith(t) || canon(n) === canon(t));
      return hit ? '<mark>' + escapeHtml(w) + '</mark>' : escapeHtml(w);
    }).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  return { query, queryMany, byCode, highlight, escapeHtml, normalize };
})();
