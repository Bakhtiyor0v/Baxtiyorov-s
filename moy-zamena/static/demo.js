/* DEMO rejim: server o'rniga brauzerning o'zida ishlaydi — planshet va kassani serversiz sinab ko'rish uchun.
   Ma'lumotlar faqat shu qurilmada (localStorage) saqlanadi. Qoidalar server.py bilan bir xil
   (bitta test to'plami ikkalasini ham tekshiradi). */
(function () {
  'use strict';
  const KEY = 'zm_demo_db_v3';
  const pad = n => String(n).padStart(2, '0');
  const ts = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const now = () => ts(new Date());
  const dayOf = s => String(s || '').slice(0, 10);
  const fail = (m, code) => { const e = new Error(m); e.code = code || 400; throw e; };
  const fmtSum = n => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
  const money = v => { const n = Math.round(Number(v || 0)); if (Number.isNaN(n)) fail("Summa noto'g'ri"); return n; };
  const sumBy = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
  const normPlate = p => String(p || '').toUpperCase().replace(/[^0-9A-ZА-ЯЁ]/g, '');
  const normPhone = p => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 9) d = '998' + d; return d; };
  const PLATE_OK = /^(\d{2}[A-Z]\d{3}[A-Z]{2}|\d{5}[A-Z]{3})$/;
  const GROUP_FILTERS = { chevrolet: ['moy', 'havo', 'salon'], xitoy: ['moy', 'salon', 'havo', 'reduktor'], damas: ['moy', 'havo'], boshqa: ['moy', 'havo', 'salon'] };
  const FILTER_KINDS = ['moy', 'havo', 'salon', 'reduktor', 'yoqilgi'];
  const ROLES = ['usta', 'sotuvchi', 'kassir', 'admin'];
  const METHODS = { naqd: 'Naqd', terminal: 'Terminal', otkazma: "Kartadan o'tkazma", qarz: 'Qarzga' };
  const MONEY_METHODS = ['naqd', 'terminal', 'otkazma'];
  const CHIQIM_CATS = ['Ijara', 'Kommunal xizmatlar', 'Elektr', 'Gaz', 'Telefon va aloqa', 'Reklama', "Yo'lkira", 'Ofis xarajatlari', 'Ish haqi', 'Avans', 'Usta puli', 'Inkassatsiya (rahbarga)', 'Boshqa xarajat'];
  const KIRIM_CATS = ["Kassaga pul qo'yish", 'Qarz olish', 'Boshqa kirim'];
  const EXPENSE_CATS = ['Ijara', 'Kommunal xizmatlar', 'Elektr', 'Gaz', 'Telefon va aloqa', 'Reklama', "Yo'lkira", 'Ofis xarajatlari', 'Boshqa xarajat'];
  const CAT_DEBT_IN = "Mijoz qarzini to'lash", CAT_SUP_OUT = "Yetkazib beruvchiga to'lov", CAT_SUP_IN = 'Yetkazib beruvchidan pul olish', CAT_SALARY = 'Ish haqi';
  const DEFAULT_SETTINGS = { shop_name: 'Zamena', cashback_percent: '2', master_kpi_per_car: '15000', master_kpi_percent: '0', seller_kpi_per_car: '5000',
    seller_kpi_percent: '0', cashier_kpi_percent: '0', next_service_km: '8000' };
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
  const TABLES = ['employees', 'customers', 'cars', 'products', 'car_models', 'product_models', 'orders', 'items', 'moves', 'payments', 'shifts', 'cash_tx',
    'debt_tx', 'cashback_tx', 'suppliers', 'supplier_tx', 'purchases', 'purchase_items', 'inventories', 'inventory_items', 'salary_payments',
    'writeoffs', 'writeoff_items'];
  const WRITEOFF_REASONS = ['Yaroqsiz / buzilgan', "Muddati o'tgan", "Do'kon ehtiyoji uchun", "Yo'qolgan", 'Boshqa'];
  const CAT_ALIASES = { moy: 'moy', 'масло': 'moy', oil: 'moy', filtr: 'filtr', filter: 'filtr', 'фильтр': 'filtr', boshqa: 'boshqa', 'другое': 'boshqa', xizmat: 'xizmat', 'услуга': 'xizmat', service: 'xizmat' };

  function seed() {
    const d = { v: 1, seq: {}, sessions: {}, settings: { ...DEFAULT_SETTINGS } };
    TABLES.forEach(t => { d[t] = []; });
    const id = t => (d.seq[t] = (d.seq[t] || 0) + 1);
    [['Usta 1', 'usta'], ['Usta 2', 'usta'], ['Usta 3', 'usta'], ['Zamena sotuvchisi', 'sotuvchi', 'sotuvchi', '1111'],
      ['Kassir', 'kassir', 'kassir', '2222'], ['Rahbar', 'admin', 'admin', '1234']]
      .forEach(([name, role, login, password]) => d.employees.push({ id: id('employees'), name, role, phone: '', base_salary: 0, active: 1, login: login || '', password: password || '' }));
    PRODUCTS.forEach(([name, category, kind, unit, cost, price, models, grade, bonus]) => {
      const pid = id('products');
      d.products.push({ id: pid, name, category, kind, unit, cost, price, stock: category === 'xizmat' ? 0 : 50, barcode: '', active: 1, grade, bonus_kinds: bonus, image: '' });
      models.forEach(model => d.product_models.push({ product_id: pid, model }));
    });
    CAR_MODELS.forEach(([name, grp], i) => d.car_models.push({ id: id('car_models'), name, sort: i, grp }));
    d.suppliers.push({ id: id('suppliers'), name: "Moy ta'minotchisi (namuna)", phone: '998901234567', note: '', debt: 1200000, active: 1, created_at: now() });
    d.supplier_tx.push({ id: id('supplier_tx'), supplier_id: 1, purchase_id: null, amount: 1200000, note: "Boshlang'ich qoldiq", employee_id: 6, created_at: now() });
    d.suppliers.push({ id: id('suppliers'), name: 'Filtr ulgurji (namuna)', phone: '', note: '', debt: 0, active: 1, created_at: now() });
    // Namuna: bazada bor mashina va uning o'tgan zamenalari
    const cu = { id: id('customers'), name: 'Anvar', phone: '998901112233', cashback: 7250, debt: 0, note: '', created_at: now() };
    d.customers.push(cu);
    const car = { id: id('cars'), plate: '75400NAA', model: 'Gentra', transmission: 'AT', color: 'Oq', customer_id: cu.id, last_mileage: 56000, plate_exception: 0, created_at: now() };
    d.cars.push(car);
    [[124, 48000, 3, 4, 9], [62, 56000, 5, 4, 9]].forEach(([daysAgo, km, pid, liters, fid]) => {
      const t = ts(new Date(Date.now() - daysAgo * 864e5)), oid = id('orders'), p = d.products[pid - 1], f = d.products[fid - 1];
      const sub = p.price * liters + f.price;
      d.orders.push({ id: oid, type: 'zamena', parent_id: null, car_id: car.id, customer_id: cu.id, mileage: km, next_mileage: km + 8000, oil_in: liters, oil_out: null,
        master_id: 1, seller_id: 4, cashier_id: 5, status: 'yopilgan', services: ['Motor moyi', 'Moy filtri'], note: '', subtotal: sub, discount: 0, cashback_used: 0,
        cashback_earned: 0, total: sub, paid_cash: sub, paid_card: 0, paid_debt: 0, refunded: 0, change_given: 0, cost: p.cost * liters + f.cost, shift_id: null, created_at: t, closed_at: t });
      d.items.push({ id: id('items'), order_id: oid, product_id: p.id, name: p.name, category: 'moy', qty: liters, price: p.price, cost: p.cost, is_bonus: 0, src_item_id: null });
      d.items.push({ id: id('items'), order_id: oid, product_id: f.id, name: f.name, category: 'filtr', qty: 1, price: f.price, cost: f.cost, is_bonus: 0, src_item_id: null });
      d.payments.push({ id: id('payments'), order_id: oid, method: 'naqd', amount: sub, shift_id: null, created_at: t });
    });
    return d;
  }

  let db = null;
  try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { db = null; }
  if (!db || !db.seq || !db.sessions || !db.shifts) db = seed();
  TABLES.forEach(t => { if (!db[t]) db[t] = []; });     // eski demo bazasiga yangi jadvallar
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { } };
  const nid = t => (db.seq[t] = (db.seq[t] || 0) + 1);
  const ins = (t, rowObj) => { const r = { id: nid(t), ...rowObj }; db[t].push(r); return r; };
  const byId = (t, id) => db[t].find(x => x.id === +id);
  const emp = id => byId('employees', id);
  const pub = e => ({ id: e.id, name: e.name, role: e.role });
  const setting = k => Number(db.settings[k] || 0);
  const today = () => now().slice(0, 10);
  const period = q => {
    const d = new Date(); const first = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
    return [q.get('from') || first, q.get('to') || today()];
  };
  const inPeriod = (s, f, t) => { const x = dayOf(s); return x >= f && x <= t; };

  // ------------------------------------------------------------ mahsulotlar
  const productsFull = () => db.products.map(p => {
    const { image, ...rest } = p;
    return { ...rest, min_stock: p.min_stock || 0, models: db.product_models.filter(m => m.product_id === p.id).map(m => m.model).sort(), image_url: image || '' };
  }).sort((a, b) => (a.category + a.kind + a.name).localeCompare(b.category + b.kind + b.name));
  function moveStock(pid, qty, kind, ref, cost) {
    const p = byId('products', pid); if (!p || p.category === 'xizmat') return;
    p.stock += qty; ins('moves', { product_id: pid, qty, kind, ref: String(ref), cost: cost === undefined ? p.cost : cost, created_at: now() });
  }

  // ------------------------------------------------------------ mijozlar/mashinalar
  function getOrCreateCustomer(name, phone) {
    phone = normPhone(phone);
    if (phone) { const c = db.customers.find(x => x.phone === phone); if (c) { if (name && name !== c.name) c.name = name; return c.id; } }
    if (!name && !phone) return null;
    return ins('customers', { name: name || '', phone, cashback: 0, debt: 0, note: '', created_at: now() }).id;
  }
  const orderItems = oid => db.items.filter(i => i.order_id === oid);
  function carFull(id) {
    const car = byId('cars', id); if (!car) return null;
    const cu = byId('customers', car.customer_id) || {};
    const history = db.orders.filter(o => o.car_id === car.id && o.status !== 'bekor').sort((a, b) => b.id - a.id).slice(0, 15).map(o => ({ ...o, items: orderItems(o.id) }));
    return { ...car, customer_name: cu.name, customer_phone: cu.phone, customer_cashback: cu.cashback, history };
  }
  function loadOrder(id) {
    const o = byId('orders', id); if (!o) fail('Zakaz topilmadi', 404);
    const car = byId('cars', o.car_id) || {}, cu = byId('customers', o.customer_id) || {};
    return { ...o, plate: car.plate, model: car.model, transmission: car.transmission, color: car.color, customer_name: cu.name, customer_phone: cu.phone,
      customer_cashback: cu.cashback, customer_debt: cu.debt || 0, master_name: emp(o.master_id)?.name, seller_name: emp(o.seller_id)?.name,
      cashier_name: emp(o.cashier_id)?.name, items: orderItems(o.id),
      payments: db.payments.filter(p => p.order_id === o.id).map(p => ({ method: p.method, amount: p.amount })),
      refunds: db.orders.filter(r => r.parent_id === o.id).map(r => ({ id: r.id, total: r.total, closed_at: r.closed_at })) };
  }
  function writeItems(oid, items) {
    orderItems(oid).forEach(it => moveStock(it.product_id, it.qty, 'qaytarish', 'zakaz #' + oid));
    db.items = db.items.filter(i => i.order_id !== oid);
    let subtotal = 0, cost = 0;
    (items || []).forEach(it => {
      const qty = +it.qty || 0; if (qty <= 0) return;
      const p = byId('products', it.product_id); if (!p) fail('Mahsulot topilmadi');
      const bonus = it.is_bonus ? 1 : 0;
      const price = bonus ? 0 : Math.trunc(it.price === undefined || it.price === null || it.price === '' ? p.price : +it.price);
      ins('items', { order_id: oid, product_id: p.id, name: p.name, category: p.category, qty, price, cost: p.cost, is_bonus: bonus, src_item_id: null });
      moveStock(p.id, -qty, 'sotuv', 'zakaz #' + oid);
      subtotal += Math.round(price * qty); cost += p.cost * qty;
    });
    const o = byId('orders', oid); o.subtotal = subtotal; o.cost = Math.round(cost);
  }
  function carFields(b) {
    const model = String(b.model || '').trim(), tr = String(b.transmission || '').toUpperCase();
    if (!['', 'AT', 'MT'].includes(tr)) fail("Uzatmalar qutisi A/T yoki M/T bo'lishi kerak");
    if (model && !db.car_models.some(m => m.name === model)) ins('car_models', { name: model, sort: 1000, grp: GROUP_FILTERS[b.model_grp] ? b.model_grp : '' });
    return { model, transmission: tr, color: String(b.color || '').trim() };
  }
  function requirePhone(b) { const p = normPhone(b.phone); if (!/^998\d{9}$/.test(p)) fail("Mijoz telefon raqamini to'liq kiriting (+998 XX XXX XX XX)"); return p; }
  function customerFull(cid) {
    const c = byId('customers', cid); if (!c) fail('Topilmadi', 404);
    return { ...c, cars: db.cars.filter(x => x.customer_id === c.id),
      orders: db.orders.filter(o => o.customer_id === c.id && o.status !== 'bekor').sort((a, b) => b.id - a.id).slice(0, 50).map(o => ({ ...o, plate: byId('cars', o.car_id)?.plate })),
      cashback_tx: db.cashback_tx.filter(t => t.customer_id === c.id).sort((a, b) => b.id - a.id).slice(0, 50),
      debt_tx: db.debt_tx.filter(t => t.customer_id === c.id).sort((a, b) => b.id - a.id).slice(0, 100).map(t => ({ ...t, employee_name: emp(t.employee_id)?.name })) };
  }

  // ------------------------------------------------------------ smena
  const currentShift = () => { const s = [...db.shifts].reverse().find(x => !x.closed_at); return s ? { ...s, employee_name: emp(s.employee_id)?.name } : null; };
  const needShift = () => currentShift() || fail('Smena ochilmagan. Avval smenani oching.', 409);
  const shiftIdOrNull = () => currentShift()?.id || null;
  function shiftSummary(sh) {
    const pay = {}, cin = {}, cout = {};
    db.payments.filter(p => p.shift_id === sh.id).forEach(p => { pay[p.method] = (pay[p.method] || 0) + p.amount; });
    db.cash_tx.filter(t => t.shift_id === sh.id).forEach(t => { const m = t.kind === 'kirim' ? cin : cout; m[t.method] = (m[t.method] || 0) + t.amount; });
    const sales = db.orders.filter(o => o.shift_id === sh.id && o.type !== 'qaytarish' && o.status === 'yopilgan');
    const refunds = db.orders.filter(o => o.shift_id === sh.id && o.type === 'qaytarish');
    const methods = {};
    [...MONEY_METHODS, 'qarz'].forEach(m => { methods[m] = { sales: pay[m] || 0, in: cin[m] || 0, out: cout[m] || 0, balance: (pay[m] || 0) + (cin[m] || 0) - (cout[m] || 0) }; });
    return { ...sh, employee_name: emp(sh.employee_id)?.name, closed_by_name: emp(sh.closed_by)?.name, methods, sales_count: sales.length, sales_total: sumBy(sales, o => o.total),
      refund_count: refunds.length, refund_total: -sumBy(refunds, o => o.total), expected_cash: (sh.open_cash || 0) + methods.naqd.balance };
  }

  // ------------------------------------------------------------ to'lovlar
  function normalizePayments(b, total) {
    let pays = {};
    if ('payments' in b) {
      (b.payments || []).forEach(p => { if (!METHODS[p.method]) fail("To'lov usuli noto'g'ri"); const a = money(p.amount); if (a < 0) fail("Summa manfiy bo'lishi mumkin emas"); pays[p.method] = (pays[p.method] || 0) + a; });
    } else {
      let cash = money(b.paid_cash), card = money(b.paid_card);
      if (!cash && !card) { if (b.method === 'karta') card = total; else cash = total; }
      pays = { naqd: cash, terminal: card };
    }
    Object.keys(pays).forEach(k => { if (!pays[k]) delete pays[k]; });
    return pays;
  }

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
      const car = ins('cars', { plate, ...f, customer_id: getOrCreateCustomer(String(b.customer_name || '').trim(), phone), last_mileage: 0, plate_exception: exc, created_at: now() });
      return carFull(car.id);
    },
    carUpdate(id, b) {
      const car = byId('cars', id); if (!car) fail('Topilmadi', 404);
      Object.assign(car, carFields({ ...car, ...b }));
      if ('phone' in b) {
        const phone = requirePhone(b), name = String(b.customer_name || '').trim(), same = db.customers.find(c => c.phone === phone);
        if (same) { car.customer_id = same.id; if (name) same.name = name; }
        else if (car.customer_id) Object.assign(byId('customers', car.customer_id), { name, phone });
        else car.customer_id = getOrCreateCustomer(name, phone);
      }
      return carFull(car.id);
    },
    orderCreate(b, user) {
      const typ = b.type || 'zamena', mileage = +b.mileage || null;
      let customer_id = b.customer_id || null, car = null;
      if (typ === 'zamena') {
        if (!b.car_id) fail('Mashina tanlanmagan');
        if (!b.master_id) fail('Ustani belgilang — bu majburiy');
        if (!mileage) fail('Probegni kiriting');
        car = byId('cars', b.car_id); customer_id = car.customer_id;
        const cu = byId('customers', customer_id);
        if (!cu || !cu.phone) fail('Avval mijozni kiriting — telefon raqami majburiy');
        if (car.last_mileage && mileage < car.last_mileage && !b.force) fail(`Probeg avvalgidan (${fmtSum(car.last_mileage)} km) kam. Tekshiring.`);
      } else if (b.phone || b.customer_name) customer_id = getOrCreateCustomer(b.customer_name, b.phone);
      const o = ins('orders', { type: typ, parent_id: null, car_id: car ? car.id : null, customer_id, mileage, next_mileage: b.next_mileage ? +b.next_mileage : (mileage ? mileage + setting('next_service_km') : null),
        oil_in: +b.oil_in || null, oil_out: null, master_id: b.master_id ? +b.master_id : null, seller_id: user.role !== 'usta' ? user.id : null, cashier_id: null,
        status: 'jarayonda', services: b.services || [], note: b.note || '', subtotal: 0, discount: 0, cashback_used: 0, cashback_earned: 0, total: 0,
        paid_cash: 0, paid_card: 0, paid_debt: 0, refunded: 0, change_given: 0, cost: 0, shift_id: null, created_at: now(), closed_at: null });
      writeItems(o.id, b.items);
      if (car && mileage) car.last_mileage = Math.max(car.last_mileage || 0, mileage);
      if (b.close !== undefined && b.close !== null) return H.orderClose(o.id, b.close, user);
      return loadOrder(o.id);
    },
    orderUpdate(id, b) {
      const o = byId('orders', id); if (!o) fail('Topilmadi', 404);
      if (['yopilgan', 'bekor'].includes(o.status)) fail("Yopilgan zakazni o'zgartirib bo'lmaydi");
      if (o.type === 'zamena' && 'master_id' in b && !b.master_id) fail('Ustani belgilang — bu majburiy');
      ['mileage', 'next_mileage', 'master_id', 'seller_id'].forEach(k => { if (k in b) o[k] = b[k] === null || b[k] === '' ? null : +b[k]; });
      if ('oil_in' in b) o.oil_in = b.oil_in === null || b.oil_in === '' ? null : +b.oil_in;
      if ('note' in b) o.note = b.note;
      if ('services' in b) o.services = b.services;
      if (['jarayonda', 'tayyor'].includes(b.status)) o.status = b.status;
      if ('items' in b) writeItems(o.id, b.items);
      if (o.mileage && o.car_id) { const car = byId('cars', o.car_id); car.last_mileage = Math.max(car.last_mileage || 0, o.mileage); }
      return loadOrder(o.id);
    },
    orderCancel(id) { const o = byId('orders', id); if (o.status === 'yopilgan') fail('Yopilgan zakaz — avval qaytarishni qiling'); writeItems(o.id, []); o.status = 'bekor'; return loadOrder(o.id); },
    orderClose(id, b, user) {
      const o = byId('orders', id); if (!o || ['yopilgan', 'bekor'].includes(o.status)) fail('Zakaz yopiq yoki topilmadi');
      const sh = needShift();
      if (o.type === 'sotuv' && 'customer_id' in b) { const cid = b.customer_id || null; if (cid && !byId('customers', cid)) fail('Mijoz topilmadi'); o.customer_id = cid ? +cid : null; }
      const discount = Math.max(money(b.discount), 0), due = Math.max(o.subtotal - discount, 0);
      let cbUsed = Math.max(money(b.cashback_used), 0);
      const cust = o.customer_id ? byId('customers', o.customer_id) : null;
      if (cbUsed) { if (!cust) fail('Keshbek uchun mijoz kerak'); if (cbUsed > cust.cashback) fail('Keshbek balansi yetarli emas'); cbUsed = Math.min(cbUsed, due); }
      const total = due - cbUsed;
      const pays = normalizePayments(b, total);
      const paid = sumBy(Object.values(pays), x => x);
      let change = 0;
      if (paid > total) { const over = paid - total; if ((pays.naqd || 0) >= over) { pays.naqd -= over; change = over; } else fail(`To'lov ortiqcha: ${fmtSum(total)} kerak, ${fmtSum(paid)} kiritildi`); }
      const paid2 = sumBy(Object.values(pays), x => x);
      if (paid2 !== total) fail(`To'lov yetarli emas: ${fmtSum(total)} kerak, ${fmtSum(paid2)} kiritildi`);
      const debt = pays.qarz || 0;
      if (debt && !cust) fail('Qarzga sotish uchun mijozni tanlang');
      Object.entries(pays).forEach(([m, a]) => { if (a) ins('payments', { order_id: o.id, method: m, amount: a, shift_id: sh.id, created_at: now() }); });
      if (debt) { cust.debt = (cust.debt || 0) + debt; ins('debt_tx', { customer_id: cust.id, order_id: o.id, amount: debt, note: `Chek #${o.id} — qarzga`, employee_id: user.id, created_at: now() }); }
      let earned = 0;
      if (cust) {
        earned = Math.trunc((total - debt) * setting('cashback_percent') / 100);
        cust.cashback += earned - cbUsed;
        if (cbUsed) ins('cashback_tx', { customer_id: cust.id, order_id: o.id, amount: -cbUsed, kind: 'ishlatildi', created_at: now() });
        if (earned) ins('cashback_tx', { customer_id: cust.id, order_id: o.id, amount: earned, kind: "yig'ildi", created_at: now() });
      }
      Object.assign(o, { status: 'yopilgan', discount, cashback_used: cbUsed, cashback_earned: earned, total, paid_cash: pays.naqd || 0, paid_card: (pays.terminal || 0) + (pays.otkazma || 0),
        paid_debt: debt, change_given: change, cashier_id: user.id, shift_id: sh.id, closed_at: now() });
      return loadOrder(o.id);
    },
    orderRefund(id, b, user) {
      const o = loadOrder(id);
      if (o.status !== 'yopilgan' || o.type === 'qaytarish') fail("Faqat to'langan chekni qaytarish mumkin");
      const sh = needShift(), method = b.method || 'naqd';
      if (!METHODS[method]) fail("To'lov usuli noto'g'ri");
      const done = {};
      db.orders.filter(r => r.parent_id === o.id).forEach(r => orderItems(r.id).forEach(i => { done[i.src_item_id] = (done[i.src_item_id] || 0) - i.qty; }));
      const lines = [];
      (b.items || []).forEach(it => {
        const src = o.items.find(x => x.id === +it.item_id), q = +it.qty || 0;
        if (!src || q <= 0) return;
        const left = src.qty - (done[src.id] || 0);
        if (q > left + 1e-9) fail(`«${src.name}»dan ko'pi bilan ${left} qaytarish mumkin`);
        lines.push([src, q]);
      });
      if (!lines.length) fail('Qaytariladigan mahsulotni tanlang');
      const gross = sumBy(lines, ([s, q]) => Math.round(s.price * q));
      const amount = Math.round(gross * (o.subtotal ? o.total / o.subtotal : 0));
      const cust = o.customer_id ? byId('customers', o.customer_id) : null;
      if (method === 'qarz') { if (!cust) fail("Mijoz yo'q — qarzdan ayirib bo'lmaydi"); if (amount > (cust.debt || 0)) fail('Mijoz qarzi qaytariladigan summadan kam — boshqa usulni tanlang'); }
      const cost = sumBy(lines, ([s, q]) => s.cost * q);
      const r = ins('orders', { type: 'qaytarish', parent_id: o.id, car_id: o.car_id, customer_id: o.customer_id, mileage: null, next_mileage: null, oil_in: null, oil_out: null,
        master_id: null, seller_id: null, cashier_id: user.id, status: 'yopilgan', services: [], note: b.note || '', subtotal: -gross, discount: 0, cashback_used: 0, cashback_earned: 0,
        total: -amount, paid_cash: method === 'naqd' ? -amount : 0, paid_card: ['terminal', 'otkazma'].includes(method) ? -amount : 0, paid_debt: method === 'qarz' ? -amount : 0,
        refunded: 0, change_given: 0, cost: -Math.round(cost), shift_id: sh.id, created_at: now(), closed_at: now() });
      lines.forEach(([s, q]) => {
        ins('items', { order_id: r.id, product_id: s.product_id, name: s.name, category: s.category, qty: -q, price: s.price, cost: s.cost, is_bonus: s.is_bonus, src_item_id: s.id });
        if (s.product_id) moveStock(s.product_id, q, 'qaytarish', `chek #${o.id}`);
      });
      if (amount) ins('payments', { order_id: r.id, method, amount: -amount, shift_id: sh.id, created_at: now() });
      if (method === 'qarz') { cust.debt -= amount; ins('debt_tx', { customer_id: cust.id, order_id: r.id, amount: -amount, note: `Qaytarish #${r.id} (chek #${o.id})`, employee_id: user.id, created_at: now() }); }
      if (cust && o.cashback_earned && o.total) {
        const rev = Math.round(o.cashback_earned * amount / o.total);
        if (rev) { cust.cashback = Math.max(cust.cashback - rev, 0); ins('cashback_tx', { customer_id: cust.id, order_id: r.id, amount: -rev, kind: 'qaytarish', created_at: now() }); r.cashback_earned = -rev; }
      }
      byId('orders', o.id).refunded = (byId('orders', o.id).refunded || 0) + amount;
      return loadOrder(r.id);
    },
    orders(q) {
      const st = q.get('status'), f = q.get('from'), t = q.get('to'), typ = q.get('type'), cashier = q.get('cashier'), s = (q.get('q') || '').trim();
      let list = db.orders.filter(o => {
        if (st === 'open' ? !['jarayonda', 'tayyor'].includes(o.status) : st && o.status !== st) return false;
        const d = dayOf(o.closed_at || o.created_at);
        if (f && d < f) return false; if (t && d > t) return false;
        if (typ && o.type !== typ) return false;
        if (cashier && o.cashier_id !== +cashier) return false;
        if (s) {
          const car = byId('cars', o.car_id), cu = byId('customers', o.customer_id), digits = s.replace(/[^0-9]/g, '');
          const ls = s.toLowerCase(), hit = String(o.id) === s.replace(/^#/, '') || (car && normPlate(s) && car.plate.includes(normPlate(s))) || (cu && ((cu.name || '').toLowerCase().includes(ls) || (digits && cu.phone.includes(digits))));
          if (!hit) return false;
        }
        return true;
      }).sort((a, b) => b.id - a.id).slice(0, 300);
      return list.map(o => loadOrder(o.id));
    },
    today() {
      const d = today(), m = d.slice(0, 7);
      const z = db.orders.filter(o => o.type === 'zamena' && o.status !== 'bekor'), td = z.filter(o => dayOf(o.created_at) === d);
      const group = list => { const g = {}; list.forEach(o => { const k = o.master_id; g[k] = g[k] || { id: k, name: emp(k)?.name, n: 0, oil: 0 }; g[k].n++; g[k].oil += o.oil_in || 0; }); return Object.values(g).sort((a, b) => b.n - a.n); };
      return { date: d, count: td.length, oil: sumBy(td, o => o.oil_in), by_master: group(td), by_master_month: group(z.filter(o => o.created_at.slice(0, 7) === m)),
        open: z.filter(o => ['jarayonda', 'tayyor'].includes(o.status)).sort((a, b) => b.id - a.id).map(o => loadOrder(o.id)),
        done: z.filter(o => o.status === 'yopilgan' && dayOf(o.closed_at) === d).sort((a, b) => b.id - a.id).map(o => loadOrder(o.id)) };
    },
    customers(q) {
      const s = (q.get('q') || '').trim(), pl = normPlate(s), debtOnly = q.get('debt');
      return db.customers.map(c => {
        const done = db.orders.filter(o => o.customer_id === c.id && o.status === 'yopilgan');
        return { ...c, plates: db.cars.filter(x => x.customer_id === c.id).map(x => x.plate).join(', ') || null, visits: done.length, spent: sumBy(done, o => o.total) };
      }).filter(c => (!s || (c.name || '').toLowerCase().includes(s.toLowerCase()) || c.phone.includes(s) || (pl && (c.plates || '').includes(pl))) && (!debtOnly || (c.debt || 0) > 0))
        .sort((a, b) => b.id - a.id).slice(0, 300);
    },
    customerCreate(b) {
      const name = String(b.name || '').trim(), phone = normPhone(b.phone);
      if (!name && !phone) fail('Ism yoki telefon kiriting');
      if (phone && !/^998\d{9}$/.test(phone)) fail("Telefon raqami to'liq emas (+998 XX XXX XX XX)");
      if (phone && db.customers.some(c => c.phone === phone)) fail('Bu telefon raqamli mijoz bor');
      return customerFull(ins('customers', { name, phone, cashback: 0, debt: 0, note: b.note || '', created_at: now() }).id);
    },
    customerPay(cid, b, user) {
      const c = byId('customers', cid); if (!c) fail('Mijoz topilmadi', 404);
      const amount = money(b.amount), method = b.method || 'naqd';
      if (!MONEY_METHODS.includes(method)) fail("To'lov usuli noto'g'ri");
      if (amount <= 0) fail('Summani kiriting');
      if (amount > (c.debt || 0)) fail(`Mijoz qarzi ${fmtSum(c.debt || 0)} so'm — undan ko'p olib bo'lmaydi`);
      const sh = needShift();
      c.debt -= amount;
      ins('debt_tx', { customer_id: c.id, order_id: null, amount: -amount, note: b.note || `To'lov (${METHODS[method]})`, employee_id: user.id, created_at: now() });
      ins('cash_tx', { shift_id: sh.id, kind: 'kirim', category: CAT_DEBT_IN, method, amount, note: c.name || c.phone, ref_type: 'customer', ref_id: c.id, employee_id: user.id, created_at: now() });
      return customerFull(c.id);
    },
    shiftOpen(b, user) {
      if (currentShift()) fail('Smena allaqachon ochiq');
      const s = ins('shifts', { employee_id: user.id, opened_at: now(), closed_at: null, open_cash: Math.max(money(b.open_cash), 0), counted: null, expected: null, closed_by: null, note: b.note || '' });
      return shiftSummary(s);
    },
    shiftClose(b, user) {
      const sh = needShift(), sm = shiftSummary(sh), s = byId('shifts', sh.id);
      Object.assign(s, { closed_at: now(), counted: b.counted === undefined || b.counted === null || b.counted === '' ? sm.expected_cash : money(b.counted), expected: sm.expected_cash, closed_by: user.id, note: b.note || s.note || '' });
      return shiftSummary(s);
    },
    cashAdd(b, user) {
      const kind = b.kind; if (!['kirim', 'chiqim'].includes(kind)) fail('Kirim yoki chiqimni tanlang');
      const cat = String(b.category || '').trim() || (kind === 'kirim' ? 'Boshqa kirim' : 'Boshqa xarajat');
      const method = b.method || 'naqd'; if (!MONEY_METHODS.includes(method)) fail("To'lov usuli noto'g'ri");
      const amount = money(b.amount); if (amount <= 0) fail('Summani kiriting');
      const sh = needShift();
      if (kind === 'chiqim' && method === 'naqd') { const have = shiftSummary(sh).expected_cash; if (amount > have) fail(`Kassada naqd ${fmtSum(have)} so'm bor — undan ko'p chiqarib bo'lmaydi`); }
      ins('cash_tx', { shift_id: sh.id, kind, category: cat, method, amount, note: b.note || '', ref_type: null, ref_id: null, employee_id: user.id, created_at: now() });
      return { ok: true };
    },
    balances() {
      const out = {};
      MONEY_METHODS.forEach(m => { out[m] = sumBy(db.payments.filter(p => p.method === m), p => p.amount) + sumBy(db.cash_tx.filter(t => t.method === m), t => t.kind === 'kirim' ? t.amount : -t.amount); });
      const sh = currentShift(); out.naqd_kassada = sh ? shiftSummary(sh).expected_cash : null;
      return out;
    },
    cash(q) {
      const [f, t] = period(q);
      const tx = db.cash_tx.filter(x => inPeriod(x.created_at, f, t)).sort((a, b) => b.id - a.id).slice(0, 1000).map(x => ({ ...x, employee_name: emp(x.employee_id)?.name }));
      const sales = {}; db.payments.filter(p => inPeriod(p.created_at, f, t)).forEach(p => { sales[p.method] = (sales[p.method] || 0) + p.amount; });
      const cats = {}; tx.forEach(x => { const k = x.kind + '|' + x.category; cats[k] = cats[k] || { kind: x.kind, category: x.category, s: 0, n: 0 }; cats[k].s += x.amount; cats[k].n++; });
      return { from: f, to: t, tx, sales: Object.entries(sales).map(([method, s]) => ({ method, s })), by_category: Object.values(cats).sort((a, b) => b.s - a.s), balances: H.balances() };
    },
    supplierFull(sid) {
      const sp = byId('suppliers', sid); if (!sp) fail('Yetkazib beruvchi topilmadi', 404);
      return { ...sp, purchases: db.purchases.filter(p => p.supplier_id === sp.id).sort((a, b) => b.id - a.id).slice(0, 100),
        tx: db.supplier_tx.filter(t => t.supplier_id === sp.id).sort((a, b) => b.id - a.id).slice(0, 200).map(t => ({ ...t, employee_name: emp(t.employee_id)?.name })) };
    },
    supplierSave(b, sid, user) {
      const name = String(b.name || '').trim(); if (!name) fail('Nomini kiriting');
      const phone = normPhone(b.phone);
      if (sid) { Object.assign(byId('suppliers', sid), { name, phone, note: b.note || '', active: b.active === undefined ? 1 : (b.active ? 1 : 0) }); return H.supplierFull(sid); }
      const sp = ins('suppliers', { name, phone, note: b.note || '', debt: 0, active: 1, created_at: now() });
      const opening = money(b.debt);
      if (opening) { sp.debt = opening; ins('supplier_tx', { supplier_id: sp.id, purchase_id: null, amount: opening, note: "Boshlang'ich qoldiq", employee_id: user.id, created_at: now() }); }
      return H.supplierFull(sp.id);
    },
    supplierPay(sid, b, user) {
      const sp = byId('suppliers', sid); if (!sp) fail('Topilmadi', 404);
      const amount = money(b.amount), method = b.method || 'naqd';
      if (!MONEY_METHODS.includes(method)) fail("To'lov usuli noto'g'ri");
      if (amount <= 0) fail('Summani kiriting');
      const give = (b.direction || 'berish') === 'berish', delta = give ? -amount : amount;
      sp.debt += delta;
      ins('supplier_tx', { supplier_id: sp.id, purchase_id: null, amount: delta, note: b.note || (give ? `To'lov (${METHODS[method]})` : `Pul olindi (${METHODS[method]})`), employee_id: user.id, created_at: now() });
      ins('cash_tx', { shift_id: shiftIdOrNull(), kind: give ? 'chiqim' : 'kirim', category: give ? CAT_SUP_OUT : CAT_SUP_IN, method, amount, note: sp.name, ref_type: 'supplier', ref_id: sp.id, employee_id: user.id, created_at: now() });
      return H.supplierFull(sp.id);
    },
    purchase(b, user) {
      const items = (b.items || []).filter(it => +it.qty > 0);
      if (!items.length) fail("Mahsulot qo'shing");
      const sid = b.supplier_id || null, sp = sid ? byId('suppliers', sid) : null;
      if (sid && !sp) fail('Yetkazib beruvchi topilmadi');
      const gross = sumBy(items, it => Math.round(+it.qty * (+it.cost || 0)));
      const discount = Math.max(money(b.discount), 0), total = Math.max(gross - discount, 0);
      const legacy = !('payments' in b), pays = legacy ? {} : normalizePayments(b, total);
      Object.keys(pays).forEach(m => { if (!MONEY_METHODS.includes(m)) fail("Xarid uchun to'lov usuli: naqd, terminal yoki o'tkazma"); });
      const paid = legacy ? total : sumBy(Object.values(pays), x => x);
      if (paid > total) fail("To'langan summa xarid summasidan ko'p");
      if (!sp && paid < total) fail('Qarzga xarid uchun yetkazib beruvchini tanlang');
      const pu = ins('purchases', { supplier_id: sp ? sp.id : null, total, discount, paid, note: String(b.note || b.supplier || '').trim(), employee_id: user.id, created_at: now() });
      items.forEach(it => {
        const p = byId('products', it.product_id); if (!p) fail('Mahsulot topilmadi');
        const qty = +it.qty, cost = +it.cost || 0, old = Math.max(p.stock, 0);
        if (cost > 0) p.cost = Math.round((old * p.cost + qty * cost) / (old + qty) * 100) / 100;
        const price = it.price && +it.price ? Math.trunc(+it.price) : null;
        if (price) p.price = price;
        ins('purchase_items', { purchase_id: pu.id, product_id: p.id, name: p.name, qty, cost: cost || p.cost, price: price || p.price });
        moveStock(p.id, qty, 'prixod', `xarid #${pu.id}` + (sp ? ` — ${sp.name}` : ''), cost || p.cost);
      });
      if (sp) {
        sp.debt += total - paid;
        ins('supplier_tx', { supplier_id: sp.id, purchase_id: pu.id, amount: total, note: `Xarid #${pu.id}`, employee_id: user.id, created_at: now() });
        if (paid) ins('supplier_tx', { supplier_id: sp.id, purchase_id: pu.id, amount: -paid, note: `Xarid #${pu.id} uchun to'lov`, employee_id: user.id, created_at: now() });
      }
      Object.entries(pays).forEach(([m, a]) => ins('cash_tx', { shift_id: shiftIdOrNull(), kind: 'chiqim', category: CAT_SUP_OUT, method: m, amount: a, note: `Xarid #${pu.id}` + (sp ? ` — ${sp.name}` : ''), ref_type: 'purchase', ref_id: pu.id, employee_id: user.id, created_at: now() }));
      return H.purchaseGet(pu.id);
    },
    purchaseGet(pid) {
      const p = byId('purchases', pid); if (!p) fail('Xarid topilmadi', 404);
      return { ...p, supplier_name: byId('suppliers', p.supplier_id)?.name, employee_name: emp(p.employee_id)?.name, items: db.purchase_items.filter(i => i.purchase_id === p.id) };
    },
    purchases(q) {
      const [f, t] = period(q), sid = q.get('supplier_id');
      return db.purchases.filter(p => inPeriod(p.created_at, f, t) && (!sid || p.supplier_id === +sid)).sort((a, b) => b.id - a.id).slice(0, 500)
        .map(p => ({ ...p, supplier_name: byId('suppliers', p.supplier_id)?.name, employee_name: emp(p.employee_id)?.name, n: db.purchase_items.filter(i => i.purchase_id === p.id).length }));
    },
    // ---------------- hisobotlar
    closedIn(f, t) { return db.orders.filter(o => o.status === 'yopilgan' && inPeriod(o.closed_at, f, t)); },
    summary(q, user) {
      const [f, t] = period(q), os = H.closedIn(f, t), ids = new Set(os.map(o => o.id));
      const sales = os.filter(o => o.type !== 'qaytarish'), refunds = os.filter(o => o.type === 'qaytarish');
      const head = { revenue: sumBy(os, o => o.total), profit: sumBy(os, o => o.total - o.cost), receipts: sales.length, zamena: os.filter(o => o.type === 'zamena').length,
        refunds: -sumBy(refunds, o => o.total), refund_count: refunds.length, discount: sumBy(os, o => o.discount), cashback_used: sumBy(os, o => o.cashback_used), debt_given: sumBy(os, o => o.paid_debt) };
      head.avg_check = sales.length ? Math.round(sumBy(sales, o => o.total) / sales.length) : 0;
      const grp = (list, key, init, add) => { const g = {}; list.forEach(x => { const k = key(x); g[k] = g[k] || init(k); add(g[k], x); }); return Object.values(g); };
      const by_day = grp(os, o => dayOf(o.closed_at), d => ({ d, revenue: 0, profit: 0, n: 0 }), (g, o) => { g.revenue += o.total; g.profit += o.total - o.cost; if (o.type !== 'qaytarish') g.n++; }).sort((a, b) => a.d.localeCompare(b.d));
      const pays = db.payments.filter(p => ids.has(p.order_id));
      const by_method = grp(pays, p => p.method, method => ({ method, amount: 0, _o: new Set() }), (g, p) => { g.amount += p.amount; g._o.add(p.order_id); })
        .map(g => ({ method: g.method, amount: g.amount, n: g._o.size })).sort((a, b) => b.amount - a.amount);
      const by_cashier = grp(os, o => o.cashier_id, id => ({ name: emp(id)?.name || null, n: 0, revenue: 0 }), (g, o) => { g.revenue += o.total; if (o.type !== 'qaytarish') g.n++; }).sort((a, b) => b.revenue - a.revenue);
      const by_type = grp(os, o => o.type, type => ({ type, n: 0, revenue: 0 }), (g, o) => { g.n++; g.revenue += o.total; });
      const its = db.items.filter(i => ids.has(i.order_id));
      const top = grp(its, i => i.product_id, () => ({ name: '', category: '', qty: 0, revenue: 0, profit: 0 }), (g, i) => { g.name = i.name; g.category = i.category; g.qty += i.qty; g.revenue += i.price * i.qty; g.profit += i.price * i.qty - i.cost * i.qty; })
        .sort((a, b) => b.revenue - a.revenue).slice(0, 30);
      const by_category = grp(its, i => i.is_bonus ? 'bonus' : i.category, cat => ({ cat, qty: 0, revenue: 0, profit: 0 }), (g, i) => { g.qty += i.qty; g.revenue += i.price * i.qty; g.profit += i.price * i.qty - i.cost * i.qty; });
      const res = { from: f, to: t, head, by_day, by_method, by_cashier, by_type, top, by_category, can_profit: user.role === 'admin' };
      if (user.role !== 'admin') { delete head.profit; [by_day, top, by_category].forEach(l => l.forEach(r => { delete r.profit; })); }
      return res;
    },
    debts() {
      const customers = db.customers.filter(c => (c.debt || 0) !== 0).map(c => ({ id: c.id, name: c.name, phone: c.phone, debt: c.debt, plates: db.cars.filter(x => x.customer_id === c.id).map(x => x.plate).join(', ') || null,
        last_tx: db.debt_tx.filter(t => t.customer_id === c.id).map(t => t.created_at).sort().pop() || null })).sort((a, b) => b.debt - a.debt);
      const suppliers = db.suppliers.filter(s => (s.debt || 0) !== 0).map(s => ({ id: s.id, name: s.name, phone: s.phone, debt: s.debt })).sort((a, b) => b.debt - a.debt);
      return { customers, suppliers, customer_total: sumBy(customers.filter(c => c.debt > 0), c => c.debt), supplier_total: sumBy(suppliers.filter(s => s.debt > 0), s => s.debt) };
    },
    profit(q) {
      const [f, t] = period(q), os = H.closedIn(f, t), ids = new Set(os.map(o => o.id));
      const head = { orders: os.length, zamena: os.filter(o => o.type === 'zamena').length, sotuv: os.filter(o => o.type === 'sotuv').length, subtotal: sumBy(os, o => o.subtotal), discount: sumBy(os, o => o.discount),
        cashback_used: sumBy(os, o => o.cashback_used), cashback_earned: sumBy(os, o => o.cashback_earned), revenue: sumBy(os, o => o.total), cash: sumBy(os, o => o.paid_cash), card: sumBy(os, o => o.paid_card), cost: sumBy(os, o => o.cost) };
      const its = db.items.filter(i => ids.has(i.order_id));
      const cg = {}; its.forEach(i => { const k = i.is_bonus ? 'bonus' : i.category; cg[k] = cg[k] || { cat: k, qty: 0, revenue: 0, cost: 0 }; cg[k].qty += i.qty; cg[k].revenue += i.price * i.qty; cg[k].cost += i.cost * i.qty; });
      const categories = Object.values(cg); categories.forEach(c => { c.profit = Math.round(c.revenue - c.cost); });
      const pg = {}; its.forEach(i => { pg[i.product_id] = pg[i.product_id] || { name: i.name, category: i.category, bonus_lines: 0, qty: 0, revenue: 0, cost: 0, profit: 0 }; const g = pg[i.product_id]; g.bonus_lines += i.is_bonus; g.qty += i.qty; g.revenue += i.price * i.qty; g.cost += i.cost * i.qty; g.profit += i.price * i.qty - i.cost * i.qty; });
      const pay = H.payroll(q);
      const expenses = sumBy(db.cash_tx.filter(x => x.kind === 'chiqim' && inPeriod(x.created_at, f, t) && EXPENSE_CATS.includes(x.category)), x => x.amount);
      const gross = head.revenue - head.cost, by = k => (cg[k] ? Math.round(cg[k].revenue - cg[k].cost) : 0);
      const writeoff = sumBy(db.writeoffs.filter(w => inPeriod(w.created_at, f, t)), w => w.total_cost);
      const invDiff = Math.round(sumBy(db.moves.filter(m => m.kind === 'inventar' && inPeriod(m.created_at, f, t)), m => m.qty * m.cost));
      const oil = by('moy'), filt = by('filtr'), bonus = by('bonus');
      return { from: f, to: t, head, categories, products: Object.values(pg).sort((a, b) => b.profit - a.profit), gross_profit: gross, oil_profit: oil, filter_profit: filt, bonus_cost: -bonus,
        other_profit: gross - oil - filt - bonus, kpi_total: pay.kpi_total, salary_total: pay.salary_total, expenses, writeoff_loss: writeoff, inventory_diff: invDiff,
        cashback_liability: sumBy(db.customers, c => c.cashback), net_profit: gross - pay.kpi_total - pay.salary_total - expenses - writeoff + invDiff };
    },
    payroll(q) {
      const [f, t] = period(q), d1 = new Date(f), d2 = new Date(t);
      const days = Math.round((d2 - d1) / 864e5) + 1, dim = new Date(d1.getFullYear(), d1.getMonth() + 1, 0).getDate();
      const os = H.closedIn(f, t); const rowsOut = []; let kpiT = 0, salT = 0;
      [...db.employees].sort((a, b) => (a.role + a.name).localeCompare(b.role + b.name)).forEach(e => {
        const [col, perCar, pct] = e.role === 'usta' ? ['master_id', 'master_kpi_per_car', 'master_kpi_percent'] : e.role === 'sotuvchi' ? ['seller_id', 'seller_kpi_per_car', 'seller_kpi_percent'] : ['cashier_id', null, 'cashier_kpi_percent'];
        const mine = os.filter(o => o[col] === e.id), cars = mine.filter(o => o.type === 'zamena').length, profit = sumBy(mine, o => o.total - o.cost);
        let kpi = (perCar ? cars * setting(perCar) : 0) + profit * setting(pct) / 100;
        const base = e.active ? Math.round(e.base_salary * Math.min(days, dim) / dim) : 0;
        const paid = sumBy(db.salary_payments.filter(s => s.employee_id === e.id && s.period_from === f && s.period_to === t), s => s.amount);
        kpi = Math.round(kpi);
        if (!(e.active || cars || kpi || paid)) return;
        rowsOut.push({ employee: { id: e.id, name: e.name, role: e.role, phone: e.phone, base_salary: e.base_salary, active: e.active }, orders: mine.length, cars, oil: sumBy(mine, o => o.oil_in), profit, kpi, base, total: kpi + base, paid, due: kpi + base - paid });
        kpiT += kpi; salT += base;
      });
      return { from: f, to: t, rows: rowsOut, kpi_total: kpiT, salary_total: salT };
    },
    // ---------------- admin (Bito uslubida): hisobdan chiqarish, ombor/mijoz/oylik hisobotlari, import
    writeoffCreate(b, user) {
      const reason = b.reason || ''; if (!WRITEOFF_REASONS.includes(reason)) fail('Hisobdan chiqarish sababini tanlang');
      const items = (b.items || []).map(it => {
        const p = byId('products', it.product_id), qty = Math.round((+it.qty || 0) * 1000) / 1000;
        if (!p || p.category === 'xizmat' || qty <= 0) fail("Mahsulot yoki miqdor noto'g'ri");
        if (qty > (p.stock || 0) + 1e-9) fail(`${p.name}: omborda ${p.stock} ${p.unit} bor, ${qty} chiqarib bo'lmaydi`);
        return [p, qty];
      });
      if (!items.length) fail("Mahsulot qo'shing");
      const w = ins('writeoffs', { reason, note: String(b.note || '').trim().slice(0, 300), total_cost: Math.round(sumBy(items, ([p, q]) => p.cost * q)), employee_id: user.id, created_at: now() });
      items.forEach(([p, q]) => { ins('writeoff_items', { writeoff_id: w.id, product_id: p.id, name: p.name, qty: q, cost: p.cost }); moveStock(p.id, -q, 'hisobdan', `hisobdan chiqarish #${w.id}: ${reason}`, p.cost); });
      return H.writeoffGet(w.id);
    },
    writeoffGet(id) {
      const w = byId('writeoffs', id); if (!w) fail('Topilmadi', 404);
      return { ...w, employee_name: emp(w.employee_id)?.name || null, items: db.writeoff_items.filter(i => i.writeoff_id === w.id).map(i => ({ ...i, unit: byId('products', i.product_id)?.unit })) };
    },
    writeoffs(q) {
      const [f, t] = period(q), ws = db.writeoffs.filter(w => inPeriod(w.created_at, f, t));
      const rowsOut = [...ws].reverse().map(w => { const its = db.writeoff_items.filter(i => i.writeoff_id === w.id); return { ...w, employee_name: emp(w.employee_id)?.name || null, n: its.length, names: its.map(i => i.name).join(', ') }; });
      const g = {}; ws.forEach(w => { g[w.reason] = g[w.reason] || { reason: w.reason, n: 0, total: 0 }; g[w.reason].n++; g[w.reason].total += w.total_cost; });
      const by_reason = Object.values(g).sort((a, b) => b.total - a.total);
      return { from: f, to: t, rows: rowsOut, by_reason, total: sumBy(by_reason, x => x.total) };
    },
    reportStock(q) {
      const [f, t] = period(q), sold = {}, last = {};
      db.orders.filter(o => o.status === 'yopilgan').forEach(o => db.items.filter(i => i.order_id === o.id).forEach(i => {
        if (inPeriod(o.closed_at, f, t)) sold[i.product_id] = (sold[i.product_id] || 0) + i.qty;
        if (o.type !== 'qaytarish' && (!last[i.product_id] || o.closed_at > last[i.product_id])) last[i.product_id] = o.closed_at;
      }));
      const cats = {}, low = [], unsold = [], totals = { items: 0, cost_value: 0, retail_value: 0 };
      db.products.filter(p => p.active && p.category !== 'xizmat').sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name)).forEach(p0 => {
        const st = Math.max(p0.stock || 0, 0);
        const p = { id: p0.id, name: p0.name, category: p0.category, kind: p0.kind, unit: p0.unit, cost: p0.cost, price: p0.price, stock: p0.stock, min_stock: p0.min_stock || 0,
          sold: Math.round((sold[p0.id] || 0) * 100) / 100, last_sale: last[p0.id] || null, cost_value: Math.round(st * (p0.cost || 0)), retail_value: Math.round(st * (p0.price || 0)) };
        const c = cats[p.category] = cats[p.category] || { cat: p.category, items: 0, qty: 0, cost_value: 0, retail_value: 0 };
        c.items++; c.qty += st; c.cost_value += p.cost_value; c.retail_value += p.retail_value;
        totals.items++; totals.cost_value += p.cost_value; totals.retail_value += p.retail_value;
        if ((p.stock || 0) <= 0 || (p.min_stock && p.stock <= p.min_stock)) low.push(p);
        if (st > 0 && p.sold <= 0) unsold.push(p);
      });
      low.sort((a, b) => ((a.stock > 0) - (b.stock > 0)) || ((a.stock - a.min_stock) - (b.stock - b.min_stock)));
      unsold.sort((a, b) => b.cost_value - a.cost_value);
      totals.low_count = low.length; totals.unsold_value = sumBy(unsold, x => x.cost_value);
      return { from: f, to: t, totals, by_category: Object.values(cats), low, unsold };
    },
    reportCustomers(q) {
      const [f, t] = period(q), os = H.closedIn(f, t), g = {};
      os.filter(o => o.customer_id).forEach(o => {
        const c = byId('customers', o.customer_id);
        const r = g[c.id] = g[c.id] || { id: c.id, name: c.name, phone: c.phone, cashback: c.cashback, debt: c.debt || 0, n: 0, revenue: 0, profit: 0, last_visit: null,
          plates: db.cars.filter(x => x.customer_id === c.id).map(x => x.plate).join(', ') || null };
        if (o.type !== 'qaytarish') r.n++; r.revenue += o.total; r.profit += o.total - o.cost; if (!r.last_visit || o.closed_at > r.last_visit) r.last_visit = o.closed_at;
      });
      const head = { customers: new Set(os.filter(o => o.customer_id).map(o => o.customer_id)).size, anon_revenue: sumBy(os.filter(o => !o.customer_id), o => o.total), revenue: sumBy(os, o => o.total),
        new: db.customers.filter(c => inPeriod(c.created_at, f, t)).length };
      const lastZ = {};
      db.orders.filter(o => o.status === 'yopilgan' && o.type === 'zamena' && o.car_id).forEach(o => { const r = lastZ[o.car_id] = lastZ[o.car_id] || { last: '', visits: 0 }; r.visits++; if (o.closed_at > r.last) r.last = o.closed_at; });
      const due = Object.entries(lastZ).map(([cid, r]) => {
        const car = byId('cars', cid), c = car && byId('customers', car.customer_id);
        const days = Math.floor((Date.now() - new Date(r.last.replace(' ', 'T')).getTime()) / 864e5);
        return { car_id: +cid, plate: car?.plate, model: car?.model, last_mileage: car?.last_mileage, customer_id: c?.id || null, name: c?.name || null, phone: c?.phone || null, last_change: r.last, days, visits: r.visits };
      }).filter(x => x.days >= 75 && x.days <= 400).sort((a, b) => b.days - a.days).slice(0, 200);
      return { from: f, to: t, head, top: Object.values(g).sort((a, b) => b.revenue - a.revenue).slice(0, 100), due };
    },
    reportMonthly(q) {
      const year = +(q.get('year') || new Date().getFullYear()); if (!year) fail("Yil noto'g'ri");
      const d = new Date(), lastM = year === d.getFullYear() ? d.getMonth() + 1 : 12, months = [];
      for (let m = 1; m <= lastM; m++) {
        const f = `${year}-${pad(m)}-01`, t = `${year}-${pad(m)}-${pad(new Date(year, m, 0).getDate())}`;
        const r = H.profit(new URLSearchParams({ from: f, to: t }));
        months.push({ month: f.slice(0, 7), revenue: r.head.revenue, cost: r.head.cost, orders: r.head.orders, gross: r.gross_profit, kpi: r.kpi_total, salary: r.salary_total,
          expenses: r.expenses, writeoff: r.writeoff_loss, inventory: r.inventory_diff, net: r.net_profit });
      }
      const total = {}; ['revenue', 'cost', 'orders', 'gross', 'kpi', 'salary', 'expenses', 'writeoff', 'inventory', 'net'].forEach(k => { total[k] = sumBy(months, x => x[k]); });
      return { year, months, total };
    },
    productImport(b) {
      const data = b.rows; if (!Array.isArray(data) || !data.length) fail("Fayl bo'sh");
      if (data.length > 3000) fail("Bir martada 3000 tadan ko'p qator yuklab bo'lmaydi");
      const numIn = (v, what) => { const s = String(v ?? '').replace(/[\s ']/g, '').replace(',', '.'); if (s === '') return null; const n = Number(s); if (Number.isNaN(n)) fail(`${what}: «${v}» son emas`); return n; };
      let created = 0, updated = 0; const errors = [];
      data.forEach((r, i) => {
        try {
          const name = String(r.name || '').trim(); if (!name) fail("nomi yo'q");
          const bc = String(r.barcode || '').trim();
          const ex = (bc && db.products.find(p => p.barcode === bc)) || db.products.find(p => p.name.trim().toLowerCase() === name.toLowerCase());
          const catRaw = String(r.category || '').trim().toLowerCase(), cat = CAT_ALIASES[catRaw];
          if (catRaw && !cat) fail(`kategoriya «${r.category}» noma'lum (moy / filtr / boshqa / xizmat)`);
          const cost = numIn(r.cost, 'Tannarx'), price = numIn(r.price, 'Narx'), mins = numIn(r.min_stock, 'Min. qoldiq'), stock = numIn(r.stock, 'Qoldiq');
          if (ex) {
            H.productSave({ name, category: cat || ex.category, unit: String(r.unit || '').trim() || ex.unit, cost: cost ?? ex.cost, price: price ?? ex.price, barcode: bc || ex.barcode, active: ex.active,
              kind: String(r.kind || '').trim() || ex.kind, grade: String(r.grade || '').trim() || ex.grade, bonus_kinds: ex.bonus_kinds || [], min_stock: mins ?? (ex.min_stock || 0) }, ex.id);
            updated++;
          } else {
            H.productSave({ name, category: cat || 'boshqa', unit: String(r.unit || '').trim() || 'dona', cost: cost || 0, price: price || 0, barcode: bc, kind: String(r.kind || '').trim(),
              grade: String(r.grade || '').trim(), min_stock: mins || 0, stock: stock || 0 });
            created++;
          }
        } catch (e) { if (e.code && e.code !== 400) throw e; errors.push(`${i + 1}-qator: ${e.message}`); }
      });
      return { created, updated, errors: errors.slice(0, 50), error_count: errors.length };
    },
    // ---------------- ombor / xodim / sozlama
    productSave(b, id) {
      const name = String(b.name || '').trim(); if (!name) fail('Nomi kerak');
      let p = id ? byId('products', id) : null;
      if (!p) p = ins('products', { stock: 0, image: '' });
      Object.assign(p, { name, category: b.category || 'boshqa', unit: b.unit || 'dona', cost: +b.cost || 0, price: Math.trunc(+b.price || 0), barcode: String(b.barcode || ''),
        active: b.active === undefined ? 1 : (b.active ? 1 : 0), kind: String(b.kind || ''), grade: normGrade(b.grade), bonus_kinds: (b.bonus_kinds || []).filter(k => FILTER_KINDS.includes(k)) });
      if (b.min_stock !== undefined && b.min_stock !== '' && b.min_stock !== null) p.min_stock = Math.max(+b.min_stock || 0, 0); else if (p.min_stock === undefined) p.min_stock = 0;
      if (!id && +b.stock) moveStock(p.id, +b.stock, 'prixod', "boshlang'ich", +b.cost || 0);
      if ('models' in b) { db.product_models = db.product_models.filter(m => m.product_id !== p.id); (b.models || []).forEach(model => db.product_models.push({ product_id: p.id, model })); }
      if ('image' in b) { const img = b.image || ''; if (img && (!/^data:image\/(jpeg|png|webp);base64,/.test(img) || img.length > 2e6)) fail("Rasm JPG/PNG bo'lishi kerak"); p.image = img; }
      return productsFull().find(x => x.id === p.id);
    },
    employeesList() { return db.employees.map(e => ({ id: e.id, name: e.name, role: e.role, phone: e.phone, base_salary: e.base_salary, active: e.active, login: e.login || '', has_password: e.password ? 1 : 0 })); },
    employeeSave(b, id) {
      const name = String(b.name || '').trim(), role = b.role;
      if (!name || !ROLES.includes(role)) fail('Ism va lavozim kerak');
      let login = role === 'usta' ? '' : String(b.login || '').trim().toLowerCase();
      if (login) { if (!/^[a-z0-9_.]{3,20}$/.test(login)) fail('Login: 3–20 ta lotin harfi yoki raqam'); if (db.employees.some(e => e.login === login && e.id !== +id)) fail('Bu login band'); }
      let e = id ? byId('employees', id) : null;
      if (!e) e = ins('employees', { password: '' });
      Object.assign(e, { name, role, phone: b.phone || '', base_salary: Math.trunc(+b.base_salary || 0), active: b.active === undefined ? 1 : (b.active ? 1 : 0), login });
      if (b.password) { if (String(b.password).length < 4) fail("Parol kamida 4 ta belgi bo'lsin"); e.password = String(b.password); Object.keys(db.sessions).forEach(t => { if (db.sessions[t] === e.id) delete db.sessions[t]; }); }
      if (login && !e.password) fail('Login berilgan xodimga parol ham kiriting');
      return H.employeesList().find(x => x.id === e.id);
    },
    inventory(id) {
      const inv = byId('inventories', id); if (!inv) fail('Topilmadi', 404);
      return { ...inv, items: db.inventory_items.filter(i => i.inventory_id === inv.id).map(i => { const p = byId('products', i.product_id); return { ...i, name: p.name, unit: p.unit, category: p.category, current_stock: p.stock }; }) };
    },
  };

  // ------------------------------------------------------------ huquqlar (server.py check_access bilan bir xil)
  const SELLER = new Set(['bootstrap', 'version', 'me', 'logout', 'cars', 'today', 'orders']);
  const KASSA = new Set([...SELLER, 'customers', 'products', 'purchases', 'stock_moves', 'inventories', 'car_models', 'shift', 'shifts', 'cash', 'suppliers', 'reports', 'ai']);
  function access(user, method, parts) {
    const head = parts[0], rid = /^\d+$/.test(parts[1] || '') ? +parts[1] : null, action = parts[2];
    const deny = () => fail("Bu amal uchun huquq yo'q", 403);
    if (user.role === 'admin') return;
    if (user.role === 'kassir') {
      if (!KASSA.has(head) || (head === 'car_models' && method !== 'GET')) deny();
      if (head === 'reports' && !['summary', 'debts', 'stock'].includes(parts[1])) deny();
      if (head === 'products' && parts[1] === 'import') deny();
      return;
    }
    if (user.role !== 'sotuvchi' || !(SELLER.has(head) || (head === 'products' && method === 'GET'))) deny();
    if (head === 'orders') {
      if ((method === 'GET' && !rid) || action === 'close' || action === 'refund') deny();
      if (rid) { const o = byId('orders', rid); if (!o || !['jarayonda', 'tayyor'].includes(o.status)) deny(); }
    }
  }
  const scrub = x => Array.isArray(x) ? x.map(scrub) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'customer_phone' && k !== 'customer_cashback' && k !== 'customer_debt').map(([k, v]) => [k, scrub(v)])) : x;

  function route(method, parts, q, b, user, token) {
    const head = parts[0], rid = /^\d+$/.test(parts[1] || '') ? +parts[1] : null, action = parts[2], sub = parts[1] || '';
    switch (head) {
      case 'version': return { v: db.v };
      case 'me': return pub(user);
      case 'logout': delete db.sessions[token]; return { ok: true };
      case 'bootstrap': {
        const sh = currentShift();
        return { settings: { ...db.settings }, employees: db.employees.map(e => ({ id: e.id, name: e.name, role: e.role, active: e.active })), products: productsFull(),
          car_models: [...db.car_models].sort((a, c) => a.sort - c.sort || a.name.localeCompare(c.name)), group_filters: GROUP_FILTERS, methods: METHODS,
          cash_cats: { kirim: KIRIM_CATS, chiqim: CHIQIM_CATS }, writeoff_reasons: WRITEOFF_REASONS, shift: ['kassir', 'admin'].includes(user.role) && sh ? shiftSummary(sh) : null, me: pub(user), version: db.v };
      }
      case 'cars':
        if (sub === 'lookup') { const plate = normPlate(q.get('plate')); if (!plate) fail('Raqam kiriting'); const c = db.cars.find(x => x.plate === plate); return { plate, valid: PLATE_OK.test(plate), car: c ? carFull(c.id) : null }; }
        if (method === 'GET' && rid) return carFull(rid);
        if (method === 'POST') return H.carCreate(b);
        if (method === 'PUT' && rid) return H.carUpdate(rid, b);
        break;
      case 'customers':
        if (method === 'GET' && rid) return customerFull(rid);
        if (method === 'GET') return H.customers(q);
        if (method === 'PUT' && rid) { const c = byId('customers', rid); Object.assign(c, { name: b.name || '', phone: normPhone(b.phone), note: b.note || '' }); return customerFull(rid); }
        if (method === 'POST' && !rid) return H.customerCreate(b);
        if (action === 'pay') return H.customerPay(rid, b, user);
        if (action === 'debt') { const a = money(b.amount); if (!a) fail('Summani kiriting'); const c = byId('customers', rid); c.debt = (c.debt || 0) + a; ins('debt_tx', { customer_id: c.id, order_id: null, amount: a, note: b.note || "Qo'lda tuzatish", employee_id: user.id, created_at: now() }); return customerFull(rid); }
        if (action === 'cashback') { const a = money(b.amount), c = byId('customers', rid); c.cashback = Math.max(c.cashback + a, 0); ins('cashback_tx', { customer_id: c.id, order_id: null, amount: a, kind: "qo'lda", created_at: now() }); return customerFull(rid); }
        break;
      case 'car_models':
        if (method === 'PUT' && rid) { if (!GROUP_FILTERS[b.grp]) fail("Guruh noto'g'ri"); byId('car_models', rid).grp = b.grp; }
        if (method === 'POST') { const name = String(b.name || '').trim(); if (!name || !GROUP_FILTERS[b.grp]) fail('Model nomi va guruhi kerak'); if (!db.car_models.some(m => m.name === name)) ins('car_models', { name, sort: 1000, grp: b.grp }); }
        return [...db.car_models].sort((a, c) => a.sort - c.sort || a.name.localeCompare(c.name));
      case 'products':
        if (method === 'GET') return productsFull();
        if (method === 'POST' && rid && action === 'models') { const model = String(b.model || '').trim(); if (!model) fail("Model noto'g'ri"); if (!db.product_models.some(m => m.product_id === rid && m.model === model)) db.product_models.push({ product_id: rid, model }); return productsFull().find(x => x.id === rid); }
        if (method === 'POST' && parts[1] === 'import') return H.productImport(b);
        if (method === 'POST') return H.productSave(b);
        if (method === 'PUT' && rid) return H.productSave(b, rid);
        break;
      case 'purchases':
        if (method === 'POST') return H.purchase(b, user);
        return rid ? H.purchaseGet(rid) : H.purchases(q);
      case 'suppliers':
        if (method === 'GET' && rid) return H.supplierFull(rid);
        if (method === 'GET') { const s = (q.get('q') || '').trim(); return db.suppliers.filter(x => !s || x.name.toLowerCase().includes(s.toLowerCase()) || (x.phone || '').includes(s)).map(x => ({ ...x, purchases: db.purchases.filter(p => p.supplier_id === x.id).length, last_purchase: db.purchases.filter(p => p.supplier_id === x.id).map(p => p.created_at).sort().pop() || null })).sort((a, c) => a.name.localeCompare(c.name)); }
        if (method === 'POST' && rid && action === 'pay') return H.supplierPay(rid, b, user);
        if (method === 'POST') return H.supplierSave(b, null, user);
        if (method === 'PUT' && rid) return H.supplierSave(b, rid, user);
        break;
      case 'shift':
        if (method === 'POST' && sub === 'open') return H.shiftOpen(b, user);
        if (method === 'POST' && sub === 'close') return H.shiftClose(b, user);
        { const sh = currentShift(); return sh ? shiftSummary(sh) : null; }
      case 'shifts': return rid ? shiftSummary(byId('shifts', rid) || fail('Smena topilmadi', 404)) : [...db.shifts].reverse().slice(0, 60).map(shiftSummary);
      case 'cash': return method === 'POST' ? H.cashAdd(b, user) : H.cash(q);
      case 'stock_moves': return db.moves.slice(-300).reverse().map(m => ({ ...m, name: byId('products', m.product_id)?.name, unit: byId('products', m.product_id)?.unit }));
      case 'orders':
        if (method === 'GET' && rid) return loadOrder(rid);
        if (method === 'GET') return H.orders(q);
        if (method === 'POST' && !rid) return H.orderCreate(b, user);
        if (method === 'PUT' && rid) return H.orderUpdate(rid, b);
        if (action === 'close') return H.orderClose(rid, b, user);
        if (action === 'cancel') return H.orderCancel(rid);
        if (action === 'refund') return H.orderRefund(rid, b, user);
        break;
      case 'today': return H.today();
      case 'ai':   // Claude API kaliti faqat haqiqiy serverda saqlanadi — demo'da o'chiq
        if (sub === 'status') return { configured: false, demo: true, has_key: false, sdk: false, model: 'claude-opus-5-5' };
        fail("Rasmdan tanib olish do'kon serverida ishlaydi (Claude API kaliti serverda saqlanadi).", 409);
        break;
      case 'inventories':
        if (method === 'GET' && rid) return H.inventory(rid);
        if (method === 'GET') return [...db.inventories].reverse().map(i => ({ ...i, n: db.inventory_items.filter(x => x.inventory_id === i.id).length }));
        if (method === 'POST' && !rid) {
          if (db.inventories.some(i => i.status === 'ochiq')) fail('Ochiq inventarizatsiya bor — avval uni yoping');
          const inv = ins('inventories', { status: 'ochiq', note: b.note || '', created_at: now(), closed_at: null });
          db.products.filter(p => p.active && p.category !== 'xizmat').forEach(p => db.inventory_items.push({ inventory_id: inv.id, product_id: p.id, expected: p.stock, actual: null, cost: p.cost }));
          return H.inventory(inv.id);
        }
        if (method === 'PUT' && rid) { if (byId('inventories', rid).status !== 'ochiq') fail('Inventarizatsiya yopilgan'); (b.items || []).forEach(it => { const r = db.inventory_items.find(x => x.inventory_id === rid && x.product_id === +it.product_id); if (r) r.actual = it.actual === null || it.actual === '' || it.actual === undefined ? null : +it.actual; }); return H.inventory(rid); }
        if (action === 'close') { const inv = H.inventory(rid); if (inv.status !== 'ochiq') fail('Yopilgan'); inv.items.forEach(it => { if (it.actual === null) return; const diff = it.actual - it.current_stock; if (Math.abs(diff) > 1e-9) moveStock(it.product_id, diff, 'inventar', `inventar #${rid}`); }); Object.assign(byId('inventories', rid), { status: 'yopilgan', closed_at: now() }); return H.inventory(rid); }
        break;
      case 'employees':
        if (method === 'GET') return H.employeesList();
        if (method === 'POST') return H.employeeSave(b);
        if (method === 'PUT' && rid) return H.employeeSave(b, rid);
        break;
      case 'reports':
        if (sub === 'profit') return H.profit(q);
        if (sub === 'payroll') return H.payroll(q);
        if (sub === 'summary') return H.summary(q, user);
        if (sub === 'debts') return H.debts();
        if (sub === 'stock') return H.reportStock(q);
        if (sub === 'customers') return H.reportCustomers(q);
        if (sub === 'monthly') return H.reportMonthly(q);
        break;
      case 'writeoffs':
        if (method === 'POST' && !rid) return H.writeoffCreate(b, user);
        if (method === 'GET') return rid ? H.writeoffGet(rid) : H.writeoffs(q);
        break;
      case 'salary':
        if (method === 'POST') {
          const e = byId('employees', b.employee_id), a = money(b.amount), m = b.method || 'naqd';
          if (MONEY_METHODS.includes(m) && a > 0) ins('cash_tx', { shift_id: shiftIdOrNull(), kind: 'chiqim', category: CAT_SALARY, method: m, amount: a, note: `${e ? e.name : ''}: ${b.period_from} — ${b.period_to}`, ref_type: 'employee', ref_id: +b.employee_id, employee_id: user.id, created_at: now() });
          ins('salary_payments', { employee_id: +b.employee_id, period_from: b.period_from, period_to: b.period_to, amount: a, note: b.note || '', created_at: now() });
          return { ok: true };
        }
        return [...db.salary_payments].reverse().map(s => ({ ...s, name: emp(s.employee_id)?.name }));
      case 'expenses': {
        if (method === 'POST') return H.cashAdd({ kind: 'chiqim', category: b.category || 'Boshqa xarajat', method: b.method || 'naqd', amount: b.amount, note: b.title }, user);
        const [f, t] = period(q);
        return db.cash_tx.filter(x => x.kind === 'chiqim' && inPeriod(x.created_at, f, t) && EXPENSE_CATS.includes(x.category)).reverse().map(x => ({ id: x.id, title: x.note || x.category, category: x.category, amount: x.amount, created_at: x.created_at }));
      }
      case 'settings':
        if (method === 'PUT') Object.entries(b).forEach(([k, v]) => { if (k in DEFAULT_SETTINGS) db.settings[k] = String(v); });
        return { ...db.settings };
    }
    fail('Topilmadi', 404);
  }

  window.DEMO_RESET = () => { try { localStorage.removeItem(KEY); } catch { } location.reload(); };
  window.DEMO_API = async (method, path, body, token) => {
    const [p, qs] = path.split('?'), q = new URLSearchParams(qs || ''), parts = p.split('/');
    const snap = method === 'GET' ? null : JSON.stringify(db);
    try {
      let r;
      if (parts[0] === 'login' && method === 'POST') r = H.login(body || {});
      else {
        const user = db.sessions[token] && emp(db.sessions[token]);
        if (!user || !user.active) fail('Avval tizimga kiring', 401);
        access(user, method, parts);
        r = route(method, parts, q, body || {}, user, token);
        if (user.role === 'sotuvchi' && (parts[0] === 'today' || parts[0] === 'orders')) r = scrub(r);
      }
      if (method !== 'GET') { db.v++; persist(); }
      return r === undefined ? null : JSON.parse(JSON.stringify(r));
    } catch (e) {
      if (snap) db = JSON.parse(snap);
      throw e;
    }
  };
})();
