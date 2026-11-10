/*
 * Ma'lumotlar qatlami. Sahifalar faqat shu interfeys orqali ishlaydi:
 *   CO.api.init(), categories(), products(), product(id), createOrder(order)
 *
 * Hozir: 'demo' manba (namunaviy katalog, buyurtmalar faqat brauzerda saqlanadi).
 * Keyin: 'bito' manba — o'z serveringiz (proxy) orqali, faqat ruxsat bilan.
 * MUHIM: brauzer hech qachon to'g'ridan-to'g'ri Bito'ga ulanmaydi
 * (API kaliti sir saqlanishi kerak). Batafsil: integrations/bito/README.md
 */
(function () {
  const sources = {
    demo: {
      async load() {
        const c = window.CO.demoCatalog;
        return { categories: c.categories, brands: c.brands, quickCars: c.quickCars, products: c.products };
      },
      async createOrder(order) {
        // Demo: buyurtma faqat mijoz qurilmasida saqlanadi + Telegram orqali yuboriladi
        return { ...order, no: String(Date.now()).slice(-6), status: 'new', source: 'demo' };
      },
    },

    // SHABLON — ulanmagan. Yoqish uchun integrations/bito/README.md ga qarang.
    bito: {
      async load() {
        throw new Error('Bito integratsiyasi hali yoqilmagan');
        // Kelajakda:
        // const r = await fetch('/api/catalog');  // o'z serveringiz, faqat O'QISH
        // const data = await r.json();
        // return { ...data, products: data.products.map(window.CO.bitoMapping.mapProduct) };
      },
      async createOrder() {
        throw new Error('Bito integratsiyasi hali yoqilmagan');
        // Kelajakda: fetch('/api/orders', { method: 'POST', body: JSON.stringify(order) })
      },
    },
  };

  let db = null;
  const api = {
    async init() {
      const name = window.CO.config.dataSource;
      const src = sources[name] || sources.demo;
      try {
        db = await src.load();
      } catch (e) {
        console.warn('[CarOne] Manba yuklanmadi, demo katalog ishlatiladi:', e.message);
        db = await sources.demo.load();
      }
      db.byId = Object.fromEntries(db.products.map((p) => [p.id, p]));
      db.catById = Object.fromEntries(db.categories.map((c) => [c.id, c]));
      return db;
    },
    get db() { return db; },
    categories: () => db.categories,
    products: () => db.products,
    product: (id) => db.byId[id] || null,
    category: (id) => db.catById[id] || null,
    async createOrder(order) {
      const src = sources[window.CO.config.dataSource] || sources.demo;
      try { return await src.createOrder(order); }
      catch (_) { return sources.demo.createOrder(order); }
    },
  };

  window.CO = window.CO || {};
  window.CO.api = api;
})();
