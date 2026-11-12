/* DEMO rejim: server o'rniga brauzerning o'zida ishlaydi (planshetni sinab ko'rish uchun).
   Ma'lumotlar faqat shu qurilmada (localStorage) saqlanadi. Qoidalar server.py bilan bir xil. */
(function () {
  'use strict';
  const KEY = 'zm_demo_db_v1';
  const pad = n => String(n).padStart(2, '0');
  const ts = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const now = () => ts(new Date());
  const fail = m => { throw new Error(m); };
  const normPlate = p => String(p || '').toUpperCase().replace(/[^0-9A-ZА-ЯЁ]/g, '');
  const normPhone = p => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 9) d = '998' + d; return d; };

  const PRODUCTS = [
    ['Motor moyi 5W-30 (1 L, quyma)', 'moy', 'motor', 'litr', 70000, 95000, []],
    ['Motor moyi 5W-40 (1 L, quyma)', 'moy', 'motor', 'litr', 65000, 90000, []],
    ['Motor moyi 10W-40 (1 L, quyma)', 'moy', 'motor', 'litr', 45000, 65000, []],
    ['Karobka moyi (1 L)', 'moy', 'karobka', 'litr', 60000, 85000, []],
    ['Moy filtri (Cobalt/Nexia 3/Gentra/Lacetti)', 'filtr', 'moy', 'dona', 32000, 30000, ['Cobalt', 'Nexia 3', 'Gentra', 'Lacetti', 'Nexia 2']],
    ['Moy filtri (Spark/Matiz/Damas)', 'filtr', 'moy', 'dona', 28000, 28000, ['Spark', 'Matiz', 'Damas', 'Labo']],
    ['Havo filtri (Cobalt/Nexia 3)', 'filtr', 'havo', 'dona', 35000, 35000, ['Cobalt', 'Nexia 3']],
    ['Havo filtri (Gentra/Lacetti)', 'filtr', 'havo', 'dona', 38000, 38000, ['Gentra', 'Lacetti']],
    ['Salon filtri (Cobalt/Nexia 3)', 'filtr', 'salon', 'dona', 30000, 30000, ['Cobalt', 'Nexia 3']],
    ['Salon filtri (Gentra/Lacetti)', 'filtr', 'salon', 'dona', 30000, 30000, ['Gentra', 'Lacetti']],
    ["Yoqilg'i filtri", 'filtr', 'yoqilgi', 'dona', 40000, 45000, []],
    ['Antifriz (1 L)', 'boshqa', '', 'litr', 18000, 25000, []],
    ['Tormoz suyuqligi', 'boshqa', '', 'dona', 25000, 35000, []],
    ['Salfetka / ochistitel', 'boshqa', '', 'dona', 5000, 10000, []],
    ['Moy almashtirish xizmati', 'xizmat', '', 'dona', 0, 0, []],
  ];
  const CAR_MODELS = ['Cobalt', 'Nexia 3', 'Gentra', 'Lacetti', 'Spark', 'Damas', 'Matiz', 'Nexia 2', 'Malibu', 'Tracker', 'Onix', 'Captiva',
    'Labo', 'Monza', 'Equinox', 'Kia K5', 'Hyundai Elantra', 'BYD Chazor', 'BYD Song Plus', 'Chery Tiggo', 'Haval', 'Jetour'];

  function seed() {
    const d = { v: 1, seq: {}, employees: [], customers: [], cars: [], products: [], car_models: [], product_models: [], orders: [], items: [] };
    const id = t => (d.seq[t] = (d.seq[t] || 0) + 1);
    [['Usta 1', 'usta'], ['Usta 2', 'usta'], ['Usta 3', 'usta'], ['Zamena sotuvchisi', 'sotuvchi'], ['Kassir', 'kassir']]
      .forEach(([name, role]) => d.employees.push({ id: id('e'), name, role, phone: '', base_salary: 0, active: 1 }));
    PRODUCTS.forEach(([name, category, kind, unit, cost, price, models]) => {
      const pid = id('p');
      d.products.push({ id: pid, name, category, kind, unit, cost, price, stock: category === 'xizmat' ? 0 : 50, barcode: '', active: 1 });
      models.forEach(model => d.product_models.push({ product_id: pid, model }));
    });
    CAR_MODELS.forEach((name, i) => d.car_models.push({ id: id('m'), name, sort: i }));
    // Namuna: bazada bor mashina va uning o'tgan zamenasi
    const cu = { id: id('c'), name: 'Anvar', phone: '998901112233', cashback: 7250, note: '', created_at: now() };
    d.customers.push(cu);
    const car = { id: id('car'), plate: '75400NAA', model: 'Gentra', transmission: 'AT', color: 'Oq', customer_id: cu.id, last_mileage: 56000, created_at: now() };
    d.cars.push(car);
    const past = ts(new Date(Date.now() - 62 * 864e5));
    const oid = id('o');
    d.orders.push({ id: oid, type: 'zamena', car_id: car.id, customer_id: cu.id, mileage: 56000, next_mileage: 64000, oil_in: 4, oil_out: null,
      master_id: 1, seller_id: 4, cashier_id: 5, status: 'yopilgan', services: ['Motor moyi', 'Moy filtri'], note: '',
      subtotal: 410000, discount: 0, cashback_used: 0, cashback_earned: 7250, total: 410000, paid_cash: 410000, paid_card: 0, cost: 312000, created_at: past, closed_at: past });
    d.items.push({ id: id('i'), order_id: oid, product_id: 1, name: PRODUCTS[0][0], category: 'moy', qty: 4, price: 95000, cost: 70000, is_bonus: 0 });
    d.items.push({ id: id('i'), order_id: oid, product_id: 5, name: PRODUCTS[4][0], category: 'filtr', qty: 1, price: 30000, cost: 32000, is_bonus: 0 });
    return d;
  }

  let db = null;
  try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { db = null; }
  if (!db || !db.seq) db = seed();
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { } };
  const nid = t => (db.seq[t] = (db.seq[t] || 0) + 1);
  const byId = (arr, id) => arr.find(x => x.id === +id);

  const productsFull = () => db.products.map(p => ({ ...p, models: db.product_models.filter(m => m.product_id === p.id).map(m => m.model).sort() }));
  const emp = id => byId(db.employees, id);

  function getOrCreateCustomer(name, phone) {
    phone = normPhone(phone);
    if (phone) {
      const c = db.customers.find(x => x.phone === phone);
      if (c) { if (name && name !== c.name) c.name = name; return c.id; }
    }
    if (!name && !phone) return null;
    const c = { id: nid('c'), name: name || '', phone, cashback: 0, note: '', created_at: now() };
    db.customers.push(c);
    return c.id;
  }
  function orderItems(oid) { return db.items.filter(i => i.order_id === oid); }
  function carFull(id) {
    const car = byId(db.cars, id); if (!car) return null;
    const cu = byId(db.customers, car.customer_id) || {};
    const history = db.orders.filter(o => o.car_id === car.id && o.status !== 'bekor').sort((a, b) => b.id - a.id).slice(0, 15)
      .map(o => ({ ...o, items: orderItems(o.id) }));
    return { ...car, customer_name: cu.name, customer_phone: cu.phone, customer_cashback: cu.cashback, history };
  }
  function loadOrder(id) {
    const o = byId(db.orders, id); if (!o) fail('Zakaz topilmadi');
    const car = byId(db.cars, o.car_id) || {}, cu = byId(db.customers, o.customer_id) || {};
    return { ...o, plate: car.plate, model: car.model, transmission: car.transmission, color: car.color,
      customer_name: cu.name, customer_phone: cu.phone, customer_cashback: cu.cashback,
      master_name: emp(o.master_id)?.name, seller_name: emp(o.seller_id)?.name, cashier_name: emp(o.cashier_id)?.name, items: orderItems(o.id) };
  }
  function moveStock(pid, qty) { const p = byId(db.products, pid); if (p && p.category !== 'xizmat') p.stock += qty; }
  function writeItems(oid, items) {
    orderItems(oid).forEach(it => moveStock(it.product_id, it.qty));
    db.items = db.items.filter(i => i.order_id !== oid);
    let subtotal = 0, cost = 0;
    (items || []).forEach(it => {
      const qty = +it.qty || 0; if (qty <= 0) return;
      const p = byId(db.products, it.product_id); if (!p) fail('Mahsulot topilmadi');
      const bonus = it.is_bonus ? 1 : 0;
      const price = bonus ? 0 : Math.trunc(it.price === undefined || it.price === null || it.price === '' ? p.price : +it.price);
      db.items.push({ id: nid('i'), order_id: oid, product_id: p.id, name: p.name, category: p.category, qty, price, cost: p.cost, is_bonus: bonus });
      moveStock(p.id, -qty);
      subtotal += Math.round(price * qty); cost += p.cost * qty;
    });
    const o = byId(db.orders, oid); o.subtotal = subtotal; o.cost = Math.round(cost);
  }
  function carFields(b) {
    const model = String(b.model || '').trim(), tr = String(b.transmission || '').toUpperCase();
    if (!['', 'AT', 'MT'].includes(tr)) fail("Uzatmalar qutisi A/T yoki M/T bo'lishi kerak");
    if (model && !db.car_models.some(m => m.name === model)) db.car_models.push({ id: nid('m'), name: model, sort: 1000 });
    return { model, transmission: tr, color: String(b.color || '').trim() };
  }
  function requirePhone(b) {
    const p = normPhone(b.phone);
    if (!/^998\d{9}$/.test(p)) fail("Mijoz telefon raqamini to'liq kiriting (+998 XX XXX XX XX)");
    return p;
  }

  const H = {
    carCreate(b) {
      const plate = normPlate(b.plate);
      if (plate.length < 4) fail("Mashina raqami noto'g'ri");
      if (db.cars.some(c => c.plate === plate)) fail('Bu raqam bazada bor');
      const phone = requirePhone(b);
      const f = carFields(b);
      const car = { id: nid('car'), plate, ...f, customer_id: getOrCreateCustomer(String(b.customer_name || '').trim(), phone), last_mileage: 0, created_at: now() };
      db.cars.push(car);
      return carFull(car.id);
    },
    carUpdate(id, b) {
      const car = byId(db.cars, id); if (!car) fail('Topilmadi');
      Object.assign(car, carFields({ ...car, ...b }));
      if ('phone' in b) {
        const phone = requirePhone(b), name = String(b.customer_name || '').trim();
        const same = db.customers.find(c => c.phone === phone);
        if (same) { car.customer_id = same.id; if (name) same.name = name; }
        else if (car.customer_id) Object.assign(byId(db.customers, car.customer_id), { name, phone });
        else car.customer_id = getOrCreateCustomer(name, phone);
      }
      return carFull(car.id);
    },
    orderCreate(b) {
      const mileage = +b.mileage || null;
      if (!b.car_id) fail('Mashina tanlanmagan');
      if (!b.master_id) fail('Ustani belgilang — bu majburiy');
      if (!mileage) fail('Probegni kiriting');
      const car = byId(db.cars, b.car_id);
      const cu = byId(db.customers, car.customer_id);
      if (!cu || !cu.phone) fail('Avval mijozni kiriting — telefon raqami majburiy');
      if (car.last_mileage && mileage < car.last_mileage && !b.force)
        fail(`Probeg avvalgidan (${car.last_mileage.toLocaleString('ru-RU').replace(/\s/g, ' ')} km) kam. Tekshiring.`);
      const o = { id: nid('o'), type: 'zamena', car_id: car.id, customer_id: cu.id, mileage, next_mileage: b.next_mileage ? +b.next_mileage : mileage + 8000,
        oil_in: +b.oil_in || null, oil_out: null, master_id: +b.master_id, seller_id: b.seller_id ? +b.seller_id : null, cashier_id: null,
        status: 'jarayonda', services: b.services || [], note: b.note || '', subtotal: 0, discount: 0, cashback_used: 0, cashback_earned: 0,
        total: 0, paid_cash: 0, paid_card: 0, cost: 0, created_at: now(), closed_at: null };
      db.orders.push(o);
      writeItems(o.id, b.items);
      car.last_mileage = Math.max(car.last_mileage || 0, mileage);
      return loadOrder(o.id);
    },
    orderUpdate(id, b) {
      const o = byId(db.orders, id); if (!o) fail('Topilmadi');
      if (['yopilgan', 'bekor'].includes(o.status)) fail("Yopilgan zakazni o'zgartirib bo'lmaydi");
      if ('master_id' in b && !b.master_id) fail('Ustani belgilang — bu majburiy');
      ['mileage', 'next_mileage', 'master_id', 'seller_id'].forEach(k => { if (k in b) o[k] = b[k] === null || b[k] === '' ? null : +b[k]; });
      if ('oil_in' in b) o.oil_in = b.oil_in === null || b.oil_in === '' ? null : +b.oil_in;
      if ('note' in b) o.note = b.note;
      if ('services' in b) o.services = b.services;
      if (['jarayonda', 'tayyor'].includes(b.status)) o.status = b.status;
      if ('items' in b) writeItems(o.id, b.items);
      if (o.mileage) { const car = byId(db.cars, o.car_id); car.last_mileage = Math.max(car.last_mileage || 0, o.mileage); }
      return loadOrder(o.id);
    },
    orderCancel(id) {
      const o = byId(db.orders, id);
      if (o.status === 'yopilgan') fail('Yopilgan zakaz');
      writeItems(o.id, []); o.status = 'bekor';
      return loadOrder(o.id);
    },
    today() {
      const d = now().slice(0, 10), m = d.slice(0, 7);
      const z = db.orders.filter(o => o.type === 'zamena' && o.status !== 'bekor');
      const td = z.filter(o => o.created_at.slice(0, 10) === d);
      const group = list => {
        const g = {};
        list.forEach(o => { const k = o.master_id; g[k] = g[k] || { id: k, name: emp(k)?.name, n: 0, oil: 0 }; g[k].n++; g[k].oil += o.oil_in || 0; });
        return Object.values(g).sort((a, b) => b.n - a.n);
      };
      return { date: d, count: td.length, oil: td.reduce((a, o) => a + (o.oil_in || 0), 0), by_master: group(td),
        by_master_month: group(z.filter(o => o.created_at.slice(0, 7) === m)), orders: td.sort((a, b) => b.id - a.id).map(o => loadOrder(o.id)) };
    },
    customers(q) {
      q = String(q || '').trim(); const pl = normPlate(q);
      return db.customers.map(c => ({ ...c, plates: db.cars.filter(x => x.customer_id === c.id).map(x => x.plate).join(', ') }))
        .filter(c => !q || c.name.includes(q) || c.phone.includes(q) || (pl && c.plates.includes(pl)));
    },
  };

  window.DEMO_RESET = () => { try { localStorage.removeItem(KEY); } catch { } location.reload(); };
  window.DEMO_API = async (method, path, body) => {
    const [p, qs] = path.split('?');
    const q = new URLSearchParams(qs || '');
    const parts = p.split('/'), head = parts[0];
    const rid = /^\d+$/.test(parts[1] || '') ? +parts[1] : null, action = parts[2];
    const snap = method === 'GET' ? null : JSON.stringify(db);
    try {
      let r;
      if (head === 'version') r = { v: db.v };
      else if (head === 'bootstrap') r = { settings: { shop_name: 'CarOne Moy almashtirish', cashback_percent: '2', next_service_km: '8000', has_pin: false }, employees: db.employees, products: productsFull(), car_models: [...db.car_models].sort((a, b) => a.sort - b.sort), version: db.v };
      else if (head === 'cars' && parts[1] === 'lookup') { const plate = normPlate(q.get('plate')); if (!plate) fail('Raqam kiriting'); const c = db.cars.find(x => x.plate === plate); r = { plate, car: c ? carFull(c.id) : null }; }
      else if (head === 'cars' && method === 'GET' && rid) r = carFull(rid);
      else if (head === 'cars' && method === 'POST') r = H.carCreate(body);
      else if (head === 'cars' && method === 'PUT' && rid) r = H.carUpdate(rid, body);
      else if (head === 'customers' && method === 'GET') r = H.customers(q.get('q'));
      else if (head === 'orders' && method === 'GET' && rid) r = loadOrder(rid);
      else if (head === 'orders' && method === 'GET') r = db.orders.filter(o => q.get('status') !== 'open' || ['jarayonda', 'tayyor'].includes(o.status)).map(o => loadOrder(o.id));
      else if (head === 'orders' && method === 'POST' && !rid) r = H.orderCreate(body);
      else if (head === 'orders' && method === 'PUT' && rid) r = H.orderUpdate(rid, body);
      else if (head === 'orders' && method === 'POST' && action === 'cancel') r = H.orderCancel(rid);
      else if (head === 'today') r = H.today();
      else if (head === 'products' && method === 'POST' && action === 'models') {
        const model = String(body.model || '').trim(); if (!model) fail("Model noto'g'ri");
        if (!db.product_models.some(m => m.product_id === rid && m.model === model)) db.product_models.push({ product_id: rid, model });
        r = productsFull().find(x => x.id === rid);
      }
      else fail('Demo rejimda bu bo\'lim yo\'q');
      if (method !== 'GET') { db.v++; persist(); }
      return JSON.parse(JSON.stringify(r));
    } catch (e) {
      if (snap) db = JSON.parse(snap);
      throw e;
    }
  };
})();
