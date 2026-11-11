/*
 * Mahsulotni RASMINING O'ZIDAN tanish (shtrix-kod / yozuvsiz).
 * ------------------------------------------------------------------
 * Model: MobileNet v2 (TensorFlow.js), saytning o'zida: vendor/vision/
 * Ikki usul:
 *   1) Detal TURINI aniqlash (moy filtri, tormoz diski, chiroq, prujina, bolt…)
 *      — umumiy model, hech qanday tayyorgarliksiz ishlaydi.
 *   2) ANIQ MAHSULOTNI topish — do'kondagi mahsulot rasmlari bilan solishtirish
 *      (vizual indeks). Indeks do'kon egasi sahifasida (#/admin/photos) yaratiladi
 *      yoki data/visual-index.json faylidan yuklanadi.
 * Rasm hech qayerga yuborilmaydi — hammasi telefonning o'zida hisoblanadi.
 */
(function () {
  const BASE = new URL('vendor/vision/', document.baseURI).href;
  const EMB_NODE = 'module_apply_default/MobilenetV2/Logits/AvgPool';
  const OUT_NODE = 'module_apply_default/MobilenetV2/Logits/output';
  const MODEL_ID = 'mobilenet_v2_1.0_224';
  const DIM = 1280;

  // ImageNet sinflari → do'kon kategoriyalari (model chiqishida indeks +1)
  const CLASS_TO_CAT = {
    686: ['filter', 1],            // oil filter
    535: ['brake', 1],             // disk brake
    592: ['brake', 0.35],          // hard disc (diskka o'xshaydi)
    479: ['suspension', 0.6],      // car wheel (stupitsa, disk)
    506: ['suspension', 0.9],      // coil, spring (prujina)
    731: ['suspension', 0.3],      // plunger (amortizatorga o'xshash)
    818: ['light', 1], 619: ['light', 0.5], 846: ['light', 0.5], 920: ['light', 0.6], 437: ['light', 0.4], 470: ['light', 0.3],
    475: ['body', 1], 581: ['body', 0.9],
    753: ['engine', 0.8], 545: ['engine', 0.5],
    844: ['electric', 0.8], 754: ['electric', 0.3],
    626: ['engine', 0.3], 845: ['engine', 0.25],   // svechaga o'xshash narsalar
    440: ['oil', 0.6], 737: ['oil', 0.6], 898: ['oil', 0.6], 899: ['oil', 0.9], 901: ['oil', 0.7], 907: ['oil', 0.5], 720: ['oil', 0.4],
    631: ['chem', 0.7], 585: ['chem', 0.9],
    783: ['hardware', 1], 677: ['hardware', 0.9], 488: ['hardware', 0.6], 464: ['hardware', 0.5], 600: ['hardware', 0.5], 695: ['hardware', 0.4], 512: ['hardware', 0.4], 784: ['hardware', 0.3],
  };
  const PACKAGE_CLASSES = new Set([478, 692]); // carton, packet — qutidagi mahsulot (yozuvni o'qish foydali)

  let tfLoading = null, model = null, modelLoading = null;
  let index = null; // { items: [{ id, v: Float32Array }] }

  function addScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve; s.onerror = () => { s.remove(); reject(new Error('vision-load')); };
      document.head.appendChild(s);
    });
  }

  async function load(onProgress = () => {}) {
    if (model) return model;
    if (!modelLoading) {
      modelLoading = (async () => {
        if (!window.tf) { tfLoading = tfLoading || addScript(BASE + 'tf.min.js'); await tfLoading; }
        const tf = window.tf;
        try { await tf.setBackend('webgl'); } catch (_) { await tf.setBackend('cpu'); }
        await tf.ready();
        const m = await tf.loadGraphModel(BASE + 'mobilenet_v2/model.json', { onProgress });
        // Birinchi "isitish" — keyingi tahlillar tez bo'ladi
        tf.tidy(() => m.execute(tf.zeros([1, 224, 224, 3]), OUT_NODE));
        model = m;
        return m;
      })().catch((e) => { modelLoading = null; throw e; });
    }
    return modelLoading;
  }

  // Markazdan kvadrat qirqib 224×224 ga keltirish
  function toSquare(source, crop) {
    const sw = source.videoWidth || source.naturalWidth || source.width;
    const sh = source.videoHeight || source.naturalHeight || source.height;
    const c = crop || { x: 0, y: 0, w: 1, h: 1 };
    let x = sw * c.x, y = sh * c.y, w = sw * c.w, h = sh * c.h;
    const side = Math.min(w, h);
    x += (w - side) / 2; y += (h - side) / 2;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 224;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, x, y, side, side, 0, 0, 224, 224);
    return canvas;
  }

  function normalize(v) {
    let n = 0;
    for (let i = 0; i < v.length; i++) n += v[i] * v[i];
    n = Math.sqrt(n) || 1;
    const out = new Float32Array(v.length);
    for (let i = 0; i < v.length; i++) out[i] = v[i] / n;
    return out;
  }

  async function embedAndClassify(source, crop) {
    const m = await load();
    const tf = window.tf;
    const canvas = toSquare(source, crop);
    const [emb, probs] = tf.tidy(() => {
      const x = tf.browser.fromPixels(canvas).toFloat().div(255).expandDims(0);
      const [e, o] = m.execute(x, [EMB_NODE, OUT_NODE]);
      // Model chiqishi — logitlar; ehtimolga aylantiramiz
      return [e.reshape([-1]), tf.softmax(o.reshape([-1]))];
    });
    const e = await emb.data(), p = await probs.data();
    emb.dispose(); probs.dispose();
    return { embedding: normalize(e), probs: p };
  }

  // Detal turi bo'yicha ehtimollar
  function typeScores(probs) {
    const scores = {};
    let pkg = 0;
    for (const [k, [cat, w]] of Object.entries(CLASS_TO_CAT)) {
      const p = probs[+k + 1] || 0;
      scores[cat] = (scores[cat] || 0) + p * w;
    }
    PACKAGE_CLASSES.forEach((k) => { pkg += probs[k + 1] || 0; });
    const list = Object.entries(scores).map(([cat, s]) => ({ cat, score: s })).sort((a, b) => b.score - a.score);
    return { types: list, packaged: pkg };
  }

  /* ---------- Vizual indeks (aniq mahsulotni topish) ---------- */
  function encode(v) {
    // Float32 → int8 (eng katta qiymatga nisbatan) → base64 (1280 son ≈ 1.7 KB)
    let max = 0;
    for (let i = 0; i < v.length; i++) max = Math.max(max, Math.abs(v[i]));
    max = max || 1;
    const b = new Int8Array(v.length);
    for (let i = 0; i < v.length; i++) b[i] = Math.round((v[i] / max) * 127);
    let s = '';
    const u = new Uint8Array(b.buffer);
    for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s);
  }
  function decode(str) {
    const bin = atob(str);
    const b = new Int8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = (bin.charCodeAt(i) << 24) >> 24;
    const v = new Float32Array(b.length);
    for (let i = 0; i < b.length; i++) v[i] = b[i] / 127;
    return normalize(v);
  }

  async function loadIndex() {
    if (index) return index;
    const items = [];
    // 1) Saytdagi umumiy indeks (barcha mijozlar uchun)
    try {
      const r = await fetch(new URL('data/visual-index.json', document.baseURI), { cache: 'no-cache' });
      if (r.ok) {
        const j = await r.json();
        if (j.model === MODEL_ID) j.items.forEach((it) => items.push({ id: it.id, v: decode(it.v), src: 'site' }));
      }
    } catch (_) { /* yo'q — mayli */ }
    // 2) Shu qurilmada do'kon egasi qo'shgan rasmlar
    (window.CO.store.state.visual || []).forEach((it) => items.push({ id: it.id, v: decode(it.v), src: 'local' }));
    index = { items };
    return index;
  }
  function resetIndex() { index = null; }

  function cosine(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
  }

  // Har bir mahsulot uchun eng yaxshi o'xshashlik
  function nearest(embedding, idx, k = 8) {
    const best = new Map();
    for (const it of idx.items) {
      const s = cosine(embedding, it.v);
      if (!best.has(it.id) || best.get(it.id) < s) best.set(it.id, s);
    }
    return [...best.entries()].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score).slice(0, k);
  }

  /**
   * Asosiy funksiya: rasm → { types, packaged, visual: [{id, score}], hasIndex }
   */
  async function recognize(source, { crop } = {}) {
    const { embedding, probs } = await embedAndClassify(source, crop);
    const { types, packaged } = typeScores(probs);
    const idx = await loadIndex();
    const visual = idx.items.length ? nearest(embedding, idx) : [];
    return { types, packaged, visual, hasIndex: idx.items.length > 0, embedding };
  }

  // Do'kon egasi: mahsulotga rasm qo'shish
  /*
   * Natijani baholash: faqat mutlaq ball emas, birinchi va keyingilar orasidagi farq ham.
   * Telefon suratida (stol, soya, xira) ball pasayadi, lekin to'g'ri mahsulot baribir birinchi turadi.
   * Bir xil ko'rinadigan mahsulotlar (masalan, Koreya va Xitoy nusxasi) birga ko'rsatiladi.
   */
  function pick(visual) {
    if (!visual.length) return { strong: [], maybe: [] };
    const top = visual[0].score;
    const near = visual.filter((v) => top - v.score <= 0.03);           // deyarli bir xil — hammasi
    const second = visual.find((v) => top - v.score > 0.03)?.score ?? 0;
    const clear = top >= 0.8 || (top >= 0.45 && top - second >= 0.07);
    if (clear) return { strong: near.map((v) => v.id), maybe: visual.filter((v) => !near.includes(v) && v.score >= top - 0.12).slice(0, 4).map((v) => v.id) };
    if (top >= 0.45) return { strong: [], maybe: visual.filter((v) => v.score >= top - 0.1).slice(0, 6).map((v) => v.id) };
    return { strong: [], maybe: [] };
  }

  // Do'kon rasmlaridagi yozuv/logotip qismini tashlab, faqat mahsulot qismini olish
  const refCrop = () => (window.CO.config.vision && window.CO.config.vision.refCrop) || null;

  async function addReference(productId, source) {
    const { embedding } = await embedAndClassify(source, refCrop());
    const list = [...(window.CO.store.state.visual || []), { id: productId, v: encode(embedding), t: Date.now() }];
    window.CO.store.set('visual', list);
    resetIndex();
    return list.filter((x) => x.id === productId).length;
  }

  function exportIndex() {
    const items = (window.CO.store.state.visual || []).map(({ id, v }) => ({ id, v }));
    return { model: MODEL_ID, dim: DIM, created: new Date().toISOString(), items };
  }

  window.CO = window.CO || {};
  window.CO.vision = { load, recognize, pick, refCrop, addReference, exportIndex, loadIndex, resetIndex, encode, decode, typeScores, MODEL_ID, THRESH: { strong: 0.82, maybe: 0.7 } };
})();
