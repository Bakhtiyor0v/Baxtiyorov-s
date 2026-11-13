/* DEMO rejim: server o'rniga brauzerning o'zida ishlaydi (planshet/telefonni sinab ko'rish uchun).
   Ma'lumotlar faqat shu qurilmada (localStorage) saqlanadi. Qoidalar server.py bilan bir xil. */
(function () {
  'use strict';
  const KEY = 'zm_demo_db_v2';
  const pad = n => String(n).padStart(2, '0');
  const ts = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const now = () => ts(new Date());
  const fail = (m, code) => { const e = new Error(m); e.code = code || 400; throw e; };
  const normPlate = p => String(p || '').toUpperCase().replace(/[^0-9A-ZА-ЯЁ]/g, '');
  const normPhone = p => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 9) d = '998' + d; return d; };
  const PLATE_OK = /^(\d{2}[A-Z]\d{3}[A-Z]{2}|\d{5}[A-Z]{3})$/;
  const GROUP_FILTERS = { chevrolet: ['moy', 'havo', 'salon'], xitoy: ['moy', 'salon', 'havo', 'reduktor'], damas: ['moy', 'havo'], boshqa: ['moy', 'havo', 'salon'] };
  const FILTER_KINDS = ['moy', 'havo', 'salon', 'reduktor', 'yoqilgi'];
  const normGrade = g => { const s = String(g || '').replace(/\s/g, '').toUpperCase(); const m = s.match(/^(\d{1,2})W-?(\d{1,2})$/); return m ? `${m[1]}W-${m[2]}` : s; };

  const CHEV = ['Cobalt', 'Nexia 3', 'Gentra', 'Lacetti', 'Nexia 2'], SMALL = ['Spark', 'Matiz', 'Damas', 'Labo'];
  const PRODUCTS = [
    ['Mobil Super 3000 5W-40', 'moy', 'motor', 'litr', 95000, 125000, [], '5W-40', ['moy']],
    ['Total Quartz 9000 5W-40', 'moy', 'motor', 'litr', 90000, 115000, [], '5W-40', []],
    ['GM Dexos2 5W-30', 'moy', 'motor', 'litr', 85000, 110000, [], '5W-30', ['moy']],
    ['Lukoil Genesis 5W-30', 'moy', 'motor', 'litr', 75000, 95000, [], '5W-30', []],
    ['Shell Helix HX7 10W-40', 'moy', 'motor', 'litr', 70000, 90000, [], '10W-40', ['moy']],
    ['Lukoil Lux 10W-40', 'moy', 'motor', 'litr', 50000, 65000, [], '10W-40', []],
    ['Motor moyi 0W-20 (quyma)', 'moy', 'motor', 'litr', 90000, 120000, [], '0W-20', []],
    ['Karobka moyi (1 L)', 'moy', 'karobka', 'litr', 60000, 85000, [], '', []],
    ['Moy filtri — GM original', 'filtr', 'moy', 'dona', 38000, 45000, CHEV, '', []],
    ['Moy filtri — Koreya', 'filtr', 'moy', 'dona', 24000, 30000, CHEV, '', []],
    ['Moy filtri — Xitoy (arzon)', 'filtr', 'moy', 'dona', 15000, 20000, CHEV, '', []],
    ['Moy filtri — Spark/Matiz/Damas', 'filtr', 'moy', 'dona', 22000, 28000, SMALL, '', []],
    ['Havo filtri — Cobalt/Nexia 3', 'filtr', 'havo', 'dona', 28000, 35000, ['Cobalt', 'Nexia 3'], '', []],
    ['Havo filtri — Gentra/Lacetti', 'filtr', 'havo', 'dona', 30000, 38000, ['Gentra', 'Lacetti'], '', []],
    ['Havo filtri — Damas/Labo', 'filtr', 'havo', 'dona', 20000, 25000, ['Damas', 'Labo'], '', []],
    ['Salon filtri — Cobalt/Nexia 3', 'filtr', 'salon', 'dona', 22000, 30000, ['Cobalt', 'Nexia 3'], '', []],
    ['Salon filtri — Gentra/Lacetti', 'filtr', 'salon', 'dona', 22000, 30000, ['Gentra', 'Lacetti'], '', []],
    ['Moy filtri — universal (xitoy)', 'filtr', 'moy', 'dona', 25000, 35000, [], '', []],
    ['Havo filtri — kesiladigan', 'filtr', 'havo', 'dona', 20000, 30000, [], '', []],
    ['Salon filtri — kesiladigan', 'filtr', 'salon', 'dona', 18000, 28000, [], '', []],
    ['Reduktor filtri — xitoy', 'filtr', 'reduktor', 'dona', 60000, 80000, [], '', []],
    ["Yoqilg'i filtri", 'filtr', 'yoqilgi', 'dona', 40000, 45000, [], '', []],
    ['Antifriz (1 L)', 'boshqa', '', 'litr', 18000, 25000, [], '', []],
    ['Tormoz suyuqligi', 'boshqa', '', 'dona', 25000, 35000, [], '', []],
    ['Salfetka / ochistitel', 'boshqa', '', 'dona', 5000, 10000, [], '', []],
    ['Moy almashtirish xizmati', 'xizmat', '', 'dona', 0, 0, [], '', []],
  ];
  const CAR_MODELS = [['Cobalt', 'chevrolet'], ['Nexia 3', 'chevrolet'], ['Gentra', 'chevrolet'], ['Lacetti', 'chevrolet'], ['Spark', 'chevrolet'],
    ['Matiz', 'chevrolet'], ['Nexia 2', 'chevrolet'], ['Malibu', 'chevrolet'], ['Tracker', 'chevrolet'], ['Onix', 'chevrolet'], ['Captiva', 'chevrolet'],
    ['Monza', 'chevrolet'], ['Equinox', 'chevrolet'], ['Damas', 'damas'], ['Labo', 'damas'], ['BYD Chazor', 'xitoy'], ['BYD Song Plus', 'xitoy'],
    ['Chery Tiggo', 'xitoy'], ['Chery Arrizo', 'xitoy'], ['Haval', 'xitoy'], ['Jetour', 'xitoy'], ['Changan', 'xitoy'], ['Geely', 'xitoy'],
    ['Kia K5', 'boshqa'], ['Hyundai Elantra', 'boshqa']];

  function seed() {
    const d = { v: 1, seq: {}, employees: [], sessions: {}, customers: [], cars: [], products: [], car_models: [], product_models: [], orders: [], items: [], moves: [] };
    const id = t => (d.seq[t] = (d.seq[t] || 0) + 1);
    [['Usta 1', 'usta'], ['Usta 2', 'usta'], ['Usta 3', 'usta'], ['Zamena sotuvchisi', 'sotuvchi', 'sotuvchi', '1111'],
      ['Kassir', 'kassir', 'kassir', '2222'], ['Rahbar', 'admin', 'admin', '1234']]
      .forEach(([name, role, login, password]) => d.employees.push({ id: id('e'), name, role, login: login || '', password: password || '', active: 1 }));
    PRODUCTS.forEach(([name, category, kind, unit, cost, price, models, grade, bonus]) => {
      const pid = id('p');
      d.products.push({ id: pid, name, category, kind, unit, cost, price, stock: category === 'xizmat' ? 0 : 50, barcode: '', active: 1, grade, bonus_kinds: bonus, image: '' });
      models.forEach(model => d.product_models.push({ product_id: pid, model }));
    });
    CAR_MODELS.forEach(([name, grp], i) => d.car_models.push({ id: id('m'), name, sort: i, grp }));
    // Namuna: bazada bor mashina va uning o'tgan zamenalari
    const cu = { id: id('c'), name: 'Anvar', phone: '998901112233', cashback: 7250, note: '', created_at: now() };
    d.customers.push(cu);
    const car = { id: id('car'), plate: '75400NAA', model: 'Gentra', transmission: 'AT', color: 'Oq', customer_id: cu.id, last_mileage: 56000, plate_exception: 0, created_at: now() };
    d.cars.push(car);
    [[124, 48000, 3, 4, 9], [62, 56000, 5, 4, 9]].forEach(([daysAgo, km, pid, liters, fid]) => {
      const t = ts(new Date(Date.now() - daysAgo * 864e5)), oid = id('o'), p = d.products[pid - 1], f = d.products[fid - 1];
      const sub = p.price * liters + f.price;
      d.orders.push({ id: oid, type: 'zamena', car_id: car.id, customer_id: cu.id, mileage: km, next_mileage: km + 8000, oil_in: liters, master_id: 1, seller_id: 4, cashier_id: 5,
        status: 'yopilgan', services: ['Motor moyi', 'Moy filtri'], note: '', subtotal: sub, discount: 0, cashback_used: 0, cashback_earned: 0, total: sub,
        paid_cash: sub, paid_card: 0, cost: p.cost * liters + f.cost, created_at: t, closed_at: t });
      d.items.push({ id: id('i'), order_id: oid, product_id: p.id, name: p.name, category: 'moy', qty: liters, price: p.price, cost: p.cost, is_bonus: 0 });
      d.items.push({ id: id('i'), order_id: oid, product_id: f.id, name: f.name, category: 'filtr', qty: 1, price: f.price, cost: f.cost, is_bonus: 0 });
    });
    return d;
  }

  let db = null;
  try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { db = null; }
  if (!db || !db.seq || !db.sessions) db = seed();
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { } };
  const nid = t => (db.seq[t] = (db.seq[t] || 0) + 1);
  const byId = (arr, id) => arr.find(x => x.id === +id);
  const emp = id => byId(db.employees, id);
  const pub = e => ({ id: e.id, name: e.name, role: e.role });

  const productsFull = () => db.products.map(p => {
    const { image, ...rest } = p;
    return { ...rest, models: db.product_models.filter(m => m.product_id === p.id).map(m => m.model).sort(), image_url: image || '' };
  }).sort((a, b) => (a.category + a.kind + a.name).localeCompare(b.category + b.kind + b.name));

  function getOrCreateCustomer(name, phone) {
    phone = normPhone(phone);
    if (phone) { const c = db.customers.find(x => x.phone === phone); if (c) { if (name && name !== c.name) c.name = name; return c.id; } }
    if (!name && !phone) return null;
    const c = { id: nid('c'), name: name || '', phone, cashback: 0, note: '', created_at: now() };
    db.customers.push(c); return c.id;
  }
  const orderItems = oid => db.items.filter(i => i.order_id === oid);
  function carFull(id) {
    const car = byId(db.cars, id); if (!car) return null;
    const cu = byId(db.customers, car.customer_id) || {};
    const history = db.orders.filter(o => o.car_id === car.id && o.status !== 'bekor').sort((a, b) => b.id - a.id).slice(0, 15).map(o => ({ ...o, items: orderItems(o.id) }));
    return { ...car, customer_name: cu.name, customer_phone: cu.phone, customer_cashback: cu.cashback, history };
  }
  function loadOrder(id) {
    const o = byId(db.orders, id); if (!o) fail('Zakaz topilmadi', 404);
    const car = byId(db.cars, o.car_id) || {}, cu = byId(db.customers, o.customer_id) || {};
    return { ...o, plate: car.plate, model: car.model, transmission: car.transmission, color: car.color, customer_name: cu.name, customer_phone: cu.phone,
      customer_cashback: cu.cashback, master_name: emp(o.master_id)?.name, seller_name: emp(o.seller_id)?.name, cashier_name: emp(o.cashier_id)?.name, items: orderItems(o.id) };
  }
  function moveStock(pid, qty, kind, ref) {
    const p = byId(db.products, pid); if (!p || p.category === 'xizmat') return;
    p.stock += qty; db.moves.push({ id: nid('mv'), product_id: pid, qty, kind, ref, cost: p.cost, created_at: now() });
  }
  function writeItems(oid, items) {
    orderItems(oid).forEach(it => moveStock(it.product_id, it.qty, 'qaytarish', 'zakaz #' + oid));
    db.items = db.items.filter(i => i.order_id !== oid);
    let subtotal = 0, cost = 0;
    (items || []).forEach(it => {
      const qty = +it.qty || 0; if (qty <= 0) return;
      const p = byId(db.products, it.product_id); if (!p) fail('Mahsulot topilmadi');
      const bonus = it.is_bonus ? 1 : 0;
      const price = bonus ? 0 : Math.trunc(it.price === undefined || it.price === null || it.price === '' ? p.price : +it.price);
      db.items.push({ id: nid('i'), order_id: oid, product_id: p.id, name: p.name, category: p.category, qty, price, cost: p.cost, is_bonus: bonus });
      moveStock(p.id, -qty, 'sotuv', 'zakaz #' + oid);
      subtotal += Math.round(price * qty); cost += p.cost * qty;
    });
    const o = byId(db.orders, oid); o.subtotal = subtotal; o.cost = Math.round(cost);
  }
  function carFields(b) {
    const model = String(b.model || '').trim(), tr = String(b.transmission || '').toUpperCase();
    if (!['', 'AT', 'MT'].includes(tr)) fail("Uzatmalar qutisi A/T yoki M/T bo'lishi kerak");
    if (model && !db.car_models.some(m => m.name === model)) db.car_models.push({ id: nid('m'), name: model, sort: 1000, grp: GROUP_FILTERS[b.model_grp] ? b.model_grp : '' });
    return { model, transmission: tr, color: String(b.color || '').trim() };
  }
  function requirePhone(b) { const p = normPhone(b.phone); if (!/^998\d{9}$/.test(p)) fail("Mijoz telefon raqamini to'liq kiriting (+998 XX XXX XX XX)"); return p; }
  const scrub = x => Array.isArray(x) ? x.map(scrub) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'customer_phone' && k !== 'customer_cashback').map(([k, v]) => [k, scrub(v)])) : x;

  const H = {
    login(b) {
      const login = String(b.login || '').trim().toLowerCase();
      const e = db.employees.find(x => x.login && x.login.toLowerCase() === login && x.active);
      if (!e || e.role === 'usta' || e.password !== String(b.password || '')) fail("Login yoki parol noto'g'ri", 401);
      const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
      db.sessions[token] = e.id;
      return { token, user: pub(e) };
    },
    carCreate(b) {
      const plate = normPlate(b.plate), exc = b.exception ? 1 : 0;
      if (plate.length < 3) fail('Mashina raqami juda qisqa');
      if (!exc && !PLATE_OK.test(plate)) fail("Raqam formati noto'g'ri: 01 A 123 BC yoki 01 123 ABC bo'lishi kerak. Chet el mashinasi bo'lsa «Istisno»ni bosing.");
      if (db.cars.some(c => c.plate === plate)) fail('Bu raqam bazada bor');
      const phone = requirePhone(b), f = carFields(b);
      const car = { id: nid('car'), plate, ...f, customer_id: getOrCreateCustomer(String(b.customer_name || '').trim(), phone), last_mileage: 0, plate_exception: exc, created_at: now() };
      db.cars.push(car); return carFull(car.id);
    },
    carUpdate(id, b) {
      const car = byId(db.cars, id); if (!car) fail('Topilmadi', 404);
      Object.assign(car, carFields({ ...car, ...b }));
      if ('phone' in b) {
        const phone = requirePhone(b), name = String(b.customer_name || '').trim(), same = db.customers.find(c => c.phone === phone);
        if (same) { car.customer_id = same.id; if (name) same.name = name; }
        else if (car.customer_id) Object.assign(byId(db.customers, car.customer_id), { name, phone });
        else car.customer_id = getOrCreateCustomer(name, phone);
      }
      return carFull(car.id);
    },
    orderCreate(b, user) {
      const mileage = +b.mileage || null;
      if (!b.car_id) fail('Mashina tanlanmagan');
      if (!b.master_id) fail('Ustani belgilang — bu majburiy');
      if (!mileage) fail('Probegni kiriting');
      const car = byId(db.cars, b.car_id), cu = byId(db.customers, car.customer_id);
      if (!cu || !cu.phone) fail('Avval mijozni kiriting — telefon raqami majburiy');
      if (car.last_mileage && mileage < car.last_mileage && !b.force) fail(`Probeg avvalgidan (${car.last_mileage.toLocaleString('ru-RU').replace(/\s/g, ' ')} km) kam. Tekshiring.`);
      const o = { id: nid('o'), type: 'zamena', car_id: car.id, customer_id: cu.id, mileage, next_mileage: b.next_mileage ? +b.next_mileage : mileage + 8000,
        oil_in: +b.oil_in || null, master_id: +b.master_id, seller_id: user.id, cashier_id: null, status: 'jarayonda', services: b.services || [], note: b.note || '',
        subtotal: 0, discount: 0, cashback_used: 0, cashback_earned: 0, total: 0, paid_cash: 0, paid_card: 0, cost: 0, created_at: now(), closed_at: null };
      db.orders.push(o); writeItems(o.id, b.items);
      car.last_mileage = Math.max(car.last_mileage || 0, mileage);
      return loadOrder(o.id);
    },
    orderUpdate(id, b) {
      const o = byId(db.orders, id); if (!o) fail('Topilmadi', 404);
      if (['yopilgan', 'bekor'].includes(o.status)) fail("Yopilgan zakazni o'zgartirib bo'lmaydi");
      if ('master_id' in b && !b.master_id) fail('Ustani belgilang — bu majburiy');
      ['mileage', 'next_mileage', 'master_id'].forEach(k => { if (k in b) o[k] = b[k] === null || b[k] === '' ? null : +b[k]; });
      if ('oil_in' in b) o.oil_in = b.oil_in === null || b.oil_in === '' ? null : +b.oil_in;
      if ('note' in b) o.note = b.note;
      if ('services' in b) o.services = b.services;
      if (['jarayonda', 'tayyor'].includes(b.status)) o.status = b.status;
      if ('items' in b) writeItems(o.id, b.items);
      if (o.mileage) { const car = byId(db.cars, o.car_id); car.last_mileage = Math.max(car.last_mileage || 0, o.mileage); }
      return loadOrder(o.id);
    },
    orderCancel(id) { const o = byId(db.orders, id); if (o.status === 'yopilgan') fail('Yopilgan zakaz'); writeItems(o.id, []); o.status = 'bekor'; return loadOrder(o.id); },
    today() {
      const d = now().slice(0, 10), m = d.slice(0, 7);
      const z = db.orders.filter(o => o.type === 'zamena' && o.status !== 'bekor'), td = z.filter(o => o.created_at.slice(0, 10) === d);
      const group = list => { const g = {}; list.forEach(o => { const k = o.master_id; g[k] = g[k] || { id: k, name: emp(k)?.name, n: 0, oil: 0 }; g[k].n++; g[k].oil += o.oil_in || 0; }); return Object.values(g).sort((a, b) => b.n - a.n); };
      return { date: d, count: td.length, oil: td.reduce((a, o) => a + (o.oil_in || 0), 0), by_master: group(td), by_master_month: group(z.filter(o => o.created_at.slice(0, 7) === m)),
        open: z.filter(o => ['jarayonda', 'tayyor'].includes(o.status)).sort((a, b) => b.id - a.id).map(o => loadOrder(o.id)),
        done: z.filter(o => o.status === 'yopilgan' && (o.closed_at || '').slice(0, 10) === d).sort((a, b) => b.id - a.id).map(o => loadOrder(o.id)) };
    },
    productSave(b, id) {
      const name = String(b.name || '').trim(); if (!name) fail('Nomi kerak');
      let p = id ? byId(db.products, id) : null;
      if (!p) { p = { id: nid('p'), stock: 0, image: '' }; db.products.push(p); }
      Object.assign(p, { name, category: b.category || 'boshqa', unit: b.unit || 'dona', cost: +b.cost || 0, price: Math.trunc(+b.price || 0), barcode: String(b.barcode || ''),
        active: b.active === undefined ? 1 : (b.active ? 1 : 0), kind: String(b.kind || ''), grade: normGrade(b.grade), bonus_kinds: (b.bonus_kinds || []).filter(k => FILTER_KINDS.includes(k)) });
      if (!id && +b.stock) { p.stock = 0; moveStock(p.id, +b.stock, 'prixod', "boshlang'ich"); }
      if ('models' in b) { db.product_models = db.product_models.filter(m => m.product_id !== p.id); (b.models || []).forEach(model => db.product_models.push({ product_id: p.id, model })); }
      if ('image' in b) { const img = b.image || ''; if (img && (!/^data:image\/(jpeg|png|webp);base64,/.test(img) || img.length > 2e6)) fail("Rasm JPG/PNG bo'lishi kerak"); p.image = img; }
      return productsFull().find(x => x.id === p.id);
    },
    purchase(b) {
      (b.items || []).forEach(it => {
        const p = byId(db.products, it.product_id), qty = +it.qty || 0, cost = +it.cost || 0; if (!p || qty <= 0) return;
        const old = Math.max(p.stock, 0); if (cost > 0) p.cost = Math.round((old * p.cost + qty * cost) / (old + qty) * 100) / 100;
        if (it.price) p.price = Math.trunc(+it.price);
        moveStock(p.id, qty, 'prixod', b.supplier || 'prixod');
      });
      return { ok: true };
    },
  };

  const SELLER = new Set(['bootstrap', 'version', 'me', 'logout', 'cars', 'today', 'orders']);
  window.DEMO_RESET = () => { try { localStorage.removeItem(KEY); } catch { } location.reload(); };
  window.DEMO_API = async (method, path, body, token) => {
    const [p, qs] = path.split('?'), q = new URLSearchParams(qs || '');
    const parts = p.split('/'), head = parts[0];
    const rid = /^\d+$/.test(parts[1] || '') ? +parts[1] : null, action = parts[2];
    const snap = method === 'GET' ? null : JSON.stringify(db);
    try {
      let r;
      if (head === 'login' && method === 'POST') r = H.login(body);
      else {
        const user = db.sessions[token] && emp(db.sessions[token]);
        if (!user || !user.active) fail('Avval tizimga kiring', 401);
        const seller = user.role === 'sotuvchi';
        if (seller && !SELLER.has(head) && !(head === 'products' && method === 'GET')) fail("Bu amal uchun huquq yo'q", 403);
        if (seller && head === 'orders' && ((method === 'GET' && !rid) || action === 'close')) fail("Bu amal uchun huquq yo'q", 403);
        if (head === 'version') r = { v: db.v };
        else if (head === 'me') r = pub(user);
        else if (head === 'logout') { delete db.sessions[token]; r = { ok: true }; }
        else if (head === 'bootstrap') r = { settings: { shop_name: 'Zamena', cashback_percent: '2', next_service_km: '8000' }, employees: db.employees.map(e => ({ id: e.id, name: e.name, role: e.role, active: e.active })),
          products: productsFull(), car_models: [...db.car_models].sort((a, b) => a.sort - b.sort), group_filters: GROUP_FILTERS, me: pub(user), version: db.v };
        else if (head === 'cars' && parts[1] === 'lookup') { const plate = normPlate(q.get('plate')); if (!plate) fail('Raqam kiriting'); const c = db.cars.find(x => x.plate === plate); r = { plate, valid: PLATE_OK.test(plate), car: c ? carFull(c.id) : null }; }
        else if (head === 'cars' && method === 'POST') r = H.carCreate(body);
        else if (head === 'cars' && method === 'PUT' && rid) r = H.carUpdate(rid, body);
        else if (head === 'orders' && method === 'GET' && rid) r = loadOrder(rid);
        else if (head === 'orders' && method === 'GET') r = db.orders.filter(o => q.get('status') !== 'open' || ['jarayonda', 'tayyor'].includes(o.status)).map(o => loadOrder(o.id));
        else if (head === 'orders' && method === 'POST' && !rid) r = H.orderCreate(body, user);
        else if (head === 'orders' && method === 'PUT' && rid) r = H.orderUpdate(rid, body);
        else if (head === 'orders' && method === 'POST' && action === 'cancel') r = H.orderCancel(rid);
        else if (head === 'today') r = H.today();
        else if (head === 'products' && method === 'GET') r = productsFull();
        else if (head === 'products' && method === 'POST' && !rid) r = H.productSave(body);
        else if (head === 'products' && method === 'PUT' && rid) r = H.productSave(body, rid);
        else if (head === 'purchases' && method === 'POST') r = H.purchase(body);
        else if (head === 'stock_moves') r = db.moves.slice(-300).reverse().map(m => ({ ...m, name: byId(db.products, m.product_id)?.name, unit: byId(db.products, m.product_id)?.unit }));
        else fail("Demo rejimda bu bo'lim yo'q");
        if (seller && (head === 'today' || head === 'orders')) r = scrub(r);
      }
      if (method !== 'GET') { db.v++; persist(); }
      return JSON.parse(JSON.stringify(r));
    } catch (e) {
      if (snap) db = JSON.parse(snap);
      throw e;
    }
  };
})();
