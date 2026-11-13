/* Moy almashtirish tizimi — planshet (zamena sotuvchisi) va kassa (do'kon PC) interfeysi */
'use strict';

// ------------------------------------------------------------------ yordamchilar
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(Number(n) || 0).toLocaleString('ru-RU').replace(/,/g, ' ');
const sum = n => fmt(n) + " so'm";
const qtyFmt = n => (Math.round((Number(n) || 0) * 100) / 100).toString();
const km = n => n ? fmt(n) + ' km' : '—';
const today = () => new Date().toISOString().slice(0, 10);
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const timeOf = s => s ? s.slice(11, 16) : '';
const dateOf = s => s ? s.slice(0, 10).split('-').reverse().join('.') : '';
// Raqam: 75400NAA → «75 400 NAA», 01A123BC → «01 A 123 BC»
const plateClean = p => String(p || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
const plateFmt = p => {
  const c = plateClean(p);
  if (!/^\d\d/.test(c)) return (c.match(/\d+|[A-Z]+/g) || []).join(' ');   // istisno (chet el) raqami
  return c.length <= 2 ? c : [c.slice(0, 2), ...(c.slice(2).match(/\d+|[A-Z]+/g) || [])].join(' ');
};
const plateValid = p => /^\d{2}([A-Z]\d{3}[A-Z]{2}|\d{3}[A-Z]{3})$/.test(plateClean(p));
// Telefon: 882261500 → «88 226 15 00» (+998 alohida)
const phoneFmt = p => { let d = String(p || '').replace(/\D/g, ''); if (d.length > 9 && d.startsWith('998')) d = d.slice(3); d = d.slice(0, 9); return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' '); };
const phoneShow = p => p ? '+998 ' + phoneFmt(p) : '—';
const TRANS = { AT: 'A/T', MT: 'M/T' };
const COLORS = [['Oq', '#ffffff'], ['Qora', '#111111'], ['Kumush', '#c3c7cd'], ['Mokriy asfalt', '#4b5059'], ['Kulrang', '#8b9099'], ["Ko'k", '#2f6fde'],
  ["To'q ko'k", '#1c2f66'], ['Qizil', '#d22f2f'], ['Olcha', '#7a1830'], ['Yashil', '#2e8b57'], ['Bej', '#d9c7a3'], ['Jigarrang', '#6b4a2f'], ['Sariq', '#f2c230'], ['Boshqa', 'conic-gradient(#f55,#fd5,#5d5,#5af,#a5f,#f55)']];
const colorDot = n => { if (!n) return ''; const c = COLORS.find(x => x[0] === n); return `<span class="cdot" style="background:${c ? c[1] : '#ccc'}"></span>${esc(n)}`; };
const FILTERS = [['moy', 'Moy filtri'], ['havo', 'Havo filtri'], ['salon', 'Salon filtri'], ['reduktor', 'Reduktor filtri'], ['yoqilgi', "Yoqilg'i filtri"]];
const FNAME = Object.fromEntries(FILTERS);
const GROUPS = { chevrolet: 'Chevrolet', xitoy: 'Xitoy', damas: 'Damas / Labo', boshqa: 'Boshqa' };
const KINDS = { moy: [['motor', 'Motor moyi'], ['karobka', 'Karobka moyi']], filtr: FILTERS, boshqa: [], xizmat: [] };
const carDesc = o => [esc(o.model || ''), o.transmission ? TRANS[o.transmission] : '', colorDot(o.color)].filter(Boolean).join(' ');
const CATS = { moy: 'Moy', filtr: 'Filtr', boshqa: 'Boshqa', xizmat: 'Xizmat' };
const ROLES = { usta: 'Usta', sotuvchi: 'Zamena sotuvchisi', kassir: 'Kassir', admin: 'Rahbar' };
const RANK = { sotuvchi: 1, kassir: 2, admin: 3 };
const STATUS = { jarayonda: 'Almashtirilmoqda', tayyor: 'Tayyor', yopilgan: "To'langan", bekor: 'Bekor' };
const LS = {
  get(k, d) { try { const v = localStorage.getItem('zm_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('zm_' + k, JSON.stringify(v)); } catch { } },
};

function toast(msg, err) {
  const d = document.createElement('div');
  d.textContent = msg; if (err) d.className = 'err';
  $('#toast').appendChild(d); setTimeout(() => d.remove(), err ? 5000 : 2500);
}

async function api(method, path, body) {
  const token = LS.get('token', '');
  let data;
  try {
    if (window.DEMO_API) data = await window.DEMO_API(method, path, body, token);
    else {
      let res;
      try {
        res = await fetch('/api/' + path, { method, headers: { 'Content-Type': 'application/json', 'X-Token': token }, body: body ? JSON.stringify(body) : undefined });
      } catch (e) { setNet(false); throw new Error("Server bilan aloqa yo'q"); }
      data = await res.json().catch(() => ({}));
      if (!res.ok) { const err = new Error(data.error || 'Xato ' + res.status); err.code = res.status; throw err; }
    }
  } catch (e) {
    // Sessiya tugagan bo'lsa — kirish oynasiga qaytaramiz
    if (e.code === 401 && path !== 'login' && S.boot) { LS.set('token', ''); loginView(); }
    throw e;
  }
  setNet(true);
  return data;
}
const GET = p => api('GET', p), POST = (p, b) => api('POST', p, b || {}), PUT = (p, b) => api('PUT', p, b || {});
function setNet(ok) { $('#net').classList.toggle('off', !ok); }

// Har bir tugma bosilishini xatoliklardan himoya qiladi
const focusLater = (el) => setTimeout(() => { if (el && (!document.activeElement || document.activeElement === document.body)) el.focus(); }, 50);
const safe = fn => async (...a) => { try { return await fn(...a); } catch (e) { toast(e.message, true); } };

// ------------------------------------------------------------------ holat
const S = { boot: null, mode: null, tab: null, version: 0, ctx: {}, editing: false, polling: null };
const emp = id => S.boot.employees.find(e => e.id == id);
const prod = id => S.boot.products.find(p => p.id == id);
const employees = role => S.boot.employees.filter(e => e.active && (!role || e.role === role));
async function reloadBoot() { S.boot = await GET('bootstrap'); S.version = S.boot.version; }

// ------------------------------------------------------------------ modal
function modal(title, html, { wide } = {}) {
  const root = $('#modal-root');
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}"><div class="mh"><h3>${esc(title)}</h3><button class="x">×</button></div><div class="mb">${html}</div></div>`;
  root.appendChild(bg);
  const close = () => { bg.remove(); S.editing = $$('.modal-bg').length > 0; };
  $('.x', bg).onclick = close;
  bg.addEventListener('mousedown', e => { if (e.target === bg) close(); });
  S.editing = true;
  return { el: $('.mb', bg), close };
}
function confirmBox(text) {
  return new Promise(r => {
    const m = modal('Tasdiqlang', `<p>${esc(text)}</p><div class="row end"><button class="btn" data-n>Yo'q</button><button class="btn p" data-y>Ha</button></div>`);
    $('[data-n]', m.el).onclick = () => { m.close(); r(false); };
    $('[data-y]', m.el).onclick = () => { m.close(); r(true); };
  });
}

// Mahsulot tanlash oynasi
function pickProduct(onPick, { cat } = {}) {
  const m = modal('Mahsulot tanlash', `
    <div class="row" style="margin-bottom:10px"><input id="pq" placeholder="Qidirish: nom yoki shtrix-kod" autofocus>
    </div><div class="chips" id="pc" style="margin-bottom:10px"></div><div class="picker-list" id="pl"></div>`);
  let c = cat || '';
  const chips = $('#pc', m.el);
  chips.innerHTML = [['', 'Hammasi'], ...Object.entries(CATS)].map(([k, v]) => `<span class="chip ${k === c ? 'on' : ''}" data-c="${k}">${v}</span>`).join('');
  chips.onclick = e => { const t = e.target.closest('[data-c]'); if (!t) return; c = t.dataset.c; $$('.chip', chips).forEach(x => x.classList.toggle('on', x === t)); draw(); };
  const draw = () => {
    const q = $('#pq', m.el).value.trim().toLowerCase();
    const list = S.boot.products.filter(p => p.active && (!c || p.category === c) && (!q || p.name.toLowerCase().includes(q) || (p.barcode || '') === q));
    $('#pl', m.el).innerHTML = list.map(p => `<div class="pi" data-id="${p.id}"><span class="tag ${p.category}">${CATS[p.category]}</span>
      <span class="sp">${esc(p.name)}</span><span class="muted small">${p.category === 'xizmat' ? '' : 'qoldiq ' + qtyFmt(p.stock) + ' ' + esc(p.unit)}</span>
      <b class="num">${fmt(p.price)}</b></div>`).join('') || '<div class="empty">Topilmadi</div>';
  };
  $('#pq', m.el).oninput = draw;
  $('#pq', m.el).onkeydown = e => { if (e.key === 'Enter') { const f = $('.pi', m.el); if (f) f.click(); } };
  $('#pl', m.el).onclick = e => { const t = e.target.closest('.pi'); if (!t) return; m.close(); onPick(prod(t.dataset.id)); };
  draw(); setTimeout(() => $('#pq', m.el).focus(), 50);
}

// Pozitsiyalar jadvali (planshet formasi va kassada ishlatiladi)
function itemsEditor(el, items, onChange, { showCost } = {}) {
  const draw = () => {
    let total = 0;
    el.innerHTML = `<div class="tbl-wrap"><table><thead><tr><th>Mahsulot</th><th style="width:90px">Miqdor</th><th style="width:120px">Narx</th><th class="num">Summa</th><th>Bonus</th><th></th></tr></thead><tbody>
      ${items.map((it, i) => {
        const line = it.is_bonus ? 0 : Math.round((+it.price || 0) * (+it.qty || 0)); total += line;
        const p = prod(it.product_id);
        const low = p && p.category !== 'xizmat' && p.stock < (+it.qty || 0);
        return `<tr data-i="${i}"><td><span class="tag ${it.category}">${CATS[it.category] || ''}</span> ${esc(it.name)}
          ${showCost && p ? `<div class="muted small">tannarx ${fmt(p.cost)}</div>` : ''}${low ? '<div class="small neg">omborda yetarli emas</div>' : ''}</td>
          <td><input class="inl" type="number" step="0.1" min="0" data-k="qty" value="${it.qty}"></td>
          <td><input class="inl" type="number" step="1000" min="0" data-k="price" value="${it.is_bonus ? 0 : it.price}" ${it.is_bonus ? 'disabled' : ''}></td>
          <td class="num">${it.is_bonus ? '<span class="tag bonus">bonus</span>' : fmt(line)}</td>
          <td><input type="checkbox" data-k="is_bonus" ${it.is_bonus ? 'checked' : ''} style="width:22px;min-height:22px"></td>
          <td><button class="btn sm bad" data-del>×</button></td></tr>`;
      }).join('') || '<tr><td colspan="6" class="empty">Hali mahsulot qo\'shilmagan</td></tr>'}
      </tbody><tfoot><tr><td colspan="3"><b>Jami</b></td><td class="num"><b>${fmt(total)}</b></td><td colspan="2"></td></tr></tfoot></table></div>`;
    onChange && onChange(total);
  };
  el.oninput = e => {
    const tr = e.target.closest('tr[data-i]'); if (!tr) return;
    const it = items[tr.dataset.i], k = e.target.dataset.k;
    if (k === 'qty' || k === 'price') { it[k] = e.target.value; recalc(); }
  };
  el.onchange = e => {
    const tr = e.target.closest('tr[data-i]'); if (!tr) return;
    const it = items[tr.dataset.i];
    if (e.target.dataset.k === 'is_bonus') { it.is_bonus = e.target.checked; draw(); }
  };
  el.onclick = e => { if (e.target.closest('[data-del]')) { items.splice(e.target.closest('tr').dataset.i, 1); draw(); } };
  const recalc = () => {
    let total = 0;
    $$('tr[data-i]', el).forEach(tr => {
      const it = items[tr.dataset.i]; const line = it.is_bonus ? 0 : Math.round((+it.price || 0) * (+it.qty || 0));
      total += line; tr.children[3].innerHTML = it.is_bonus ? '<span class="tag bonus">bonus</span>' : fmt(line);
    });
    const tf = $('tfoot .num b', el); if (tf) tf.textContent = fmt(total);
    onChange && onChange(total);
  };
  draw();
  return { add(p, qty = 1) { const ex = items.find(i => i.product_id === p.id && !i.is_bonus); if (ex) ex.qty = +ex.qty + qty; else items.push({ product_id: p.id, name: p.name, category: p.category, qty, price: p.price, is_bonus: false }); draw(); }, draw };
}
const itemsPayload = items => items.map(i => ({ product_id: i.product_id, qty: +i.qty, price: +i.price, is_bonus: !!i.is_bonus }));
const itemsFromOrder = o => o.items.map(i => ({ product_id: i.product_id, name: i.name, category: i.category, qty: i.qty, price: i.price, is_bonus: !!i.is_bonus }));
const orderLine = o => o.items.map(i => `${esc(i.name)} ×${qtyFmt(i.qty)}${i.is_bonus ? ' <span class="tag bonus">bonus</span>' : ''}`).join(', ');

// ------------------------------------------------------------------ ishga tushirish
async function start() {
  const path = location.pathname.replace(/\/$/, '');
  S.mode = window.DEMO_MODE || (path.endsWith('/planshet') ? 'planshet' : path.endsWith('/kassa') ? 'kassa' : null);
  setInterval(() => { $('#clock').textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }, 1000);
  if (!S.mode) return chooser();
  document.body.classList.add(S.mode === 'planshet' ? 'pl' : 'ks');
  if (!LS.get('token', '')) return loginView();
  try { await reloadBoot(); } catch (e) {
    if (e.code === 401) return loginView();
    $('#app').innerHTML = `<div class="card empty">${esc(e.message)}</div>`; return;
  }
  enter();
}

function enter() {
  document.title = S.mode === 'planshet' ? 'Zamena' : 'Zamena — kassa';
  userChip();
  buildTabs();
  const tabs = myTabs();
  if (!tabs.length) { $('#app').innerHTML = `<div class="card empty">${esc(S.boot.me.name)}, bu bo'limga kirish huquqingiz yo'q.</div>`; return; }
  go(tabs[0][0]);
  if (!S.polling) S.polling = setInterval(poll, 3000);
}

// Login va parol bilan kirish (2–3 kishi ishlashi mumkin)
function loginView() {
  S.boot = null; S.tab = null;
  $$('.modal-bg').forEach(m => m.parentNode.removeChild(m)); S.editing = false;
  $('#tabs').innerHTML = '';
  $('#brand').textContent = S.mode === 'planshet' ? 'Zamena' : 'Zamena — kassa';
  $('#app').innerHTML = `<div class="login-wrap"><form class="card login" id="lf" autocomplete="on">
    <h2>Tizimga kirish</h2>
    <label class="f"><span>Login</span><input id="lg" class="in-xl" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false"></label>
    <label class="f"><span>Parol</span><input id="pw" class="in-xl" type="password" autocomplete="current-password"></label>
    <button class="btn p xl" style="width:100%">Kirish</button>
    ${window.DEMO_API ? `<div class="sum-box small" style="margin-top:14px"><b>Demo loginlar</b><br>sotuvchi / 1111 — zamena sotuvchisi<br>admin / 1234 — rahbar (moy rasmlari, bonus filtr)</div>` : ''}
  </form></div>`;
  $('#lf').onsubmit = safe(async e => {
    e.preventDefault();
    const r = await POST('login', { login: $('#lg').value.trim(), password: $('#pw').value });
    LS.set('token', r.token);
    await reloadBoot(); enter();
  });
  focusLater($('#lg'));
}

// Chap burchakda — kim ishlayapti
function userChip() {
  const me = S.boot.me;
  $('#brand').innerHTML = `<button class="user-chip" id="uc" type="button" title="${esc(ROLES[me.role] || '')}"><span class="av">${esc(me.name.slice(0, 1).toUpperCase())}</span><span class="un">${esc(me.name)}</span></button>`;
  $('#uc').onclick = () => {
    const m = modal(me.name, `<p class="muted">${esc(ROLES[me.role] || '')}</p><div class="bigbtns"><button class="btn xl bad" id="lo" type="button">Chiqish</button></div>`);
    $('#lo', m.el).onclick = async () => { try { await POST('logout'); } catch { } LS.set('token', ''); m.close(); loginView(); };
  };
}

function chooser() {
  $('#tabs').innerHTML = '';
  $('#app').innerHTML = `<div class="chooser">
    <a class="card" href="/planshet"><div class="ico">📋</div><h2>Planshet</h2><div class="muted">Zamena sotuvchisi: mashina, probeg, usta, moy</div></a>
    <a class="card" href="/kassa"><div class="ico">🖥️</div><h2>Kassa</h2><div class="muted">Do'kon kompyuteri: to'lov, sotuv, ombor, hisobot</div></a></div>`;
}

// [kalit, nomi, kerakli eng past rol]
const TABS = {
  planshet: [['jarayon', 'Jarayonda'], ['yangi', '＋ Yangi sotuv'], ['mahsulot', 'Moylar', 'admin']],
  kassa: [['navbat', 'Navbat', 'kassir'], ['sotuv', 'Sotuv', 'kassir'], ['tarix', 'Tarix', 'kassir'], ['mahsulot', 'Ombor', 'kassir'], ['mijoz', 'Mijozlar', 'kassir'],
    ['inventar', 'Inventarizatsiya', 'kassir'], ['hisobot', 'Hisobot', 'admin'], ['oylik', 'Oylik / KPI', 'admin'], ['xodim', 'Xodimlar', 'admin'], ['sozlama', 'Sozlamalar', 'admin']],
};
const myTabs = () => TABS[S.mode].filter(t => !t[2] || (RANK[S.boot.me.role] || 0) >= RANK[t[2]]);
const PARENT = { car: 'yangi', register: 'yangi', order: 'yangi' };
function buildTabs() {
  $('#tabs').innerHTML = myTabs().map(([k, v]) => `<button data-t="${k}" type="button">${v}<span class="badge" id="b-${k}" hidden></span></button>`).join('');
  $('#tabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) go(b.dataset.t); };
}

async function go(tab, ctx) {
  S.tab = tab; S.ctx = ctx || {};
  const on = PARENT[tab] || tab;
  $$('#tabs [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === on));
  await render();
}
async function render() {
  const v = VIEWS[S.tab];
  $('#app').oninput = null;
  KEYH = null;
  window.scrollTo(0, 0);
  try { await v(); } catch (e) { $('#app').innerHTML = `<div class="card empty">${esc(e.message)}</div>`; }
}

async function poll() {
  if (!S.boot) return;
  try {
    const { v } = await GET('version');
    if (v !== S.version) {
      S.version = v;
      await reloadBoot();
      const active = document.activeElement;
      const typing = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName) && active.value;
      if (!S.editing && !typing && !S.ctx.form && LIVE.has(S.tab)) render();
      updateBadges();
    }
  } catch { }
}
const LIVE = new Set(['jarayon', 'navbat', 'tarix', 'mahsulot']);
async function updateBadges() {
  if (S.mode !== 'kassa' || !S.boot || (RANK[S.boot.me.role] || 0) < RANK.kassir) return;
  try {
    const open = await GET('orders?status=open');
    const b = $('#b-navbat'); if (b) { b.hidden = !open.length; b.textContent = open.length; }
  } catch { }
}

// ================================================================== PLANSHET
// Planshet: «Jarayonda» (asosiy ekran) va «＋ Yangi sotuv». Mijozlar ro'yxati yo'q — faqat raqam terilganda bitta mashina.
const VIEWS = {};
const PLATE_KEYS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const LITERS = [2.5, 3, 3.5, 4];
let KEYH = null; // hozirgi ekranning (fizik) klaviatura ishlovchisi
document.addEventListener('keydown', e => {
  const a = document.activeElement;
  if (KEYH && !S.editing && !(a && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName))) KEYH(e);
});
const modelGrp = name => (S.boot.car_models.find(m => m.name.toLowerCase() === String(name || '').toLowerCase())?.grp) || 'boshqa';
const groupFilters = name => (S.boot.group_filters || {})[modelGrp(name)] || ['moy', 'havo', 'salon'];
const kindOf = it => prod(it.product_id)?.kind || '';
const shortName = n => String(n || '').replace(/^(Moy|Havo|Salon|Reduktor|Yoqilg'i) filtri\s*[—-]\s*/i, '');
const oilImg = (p, cls = '') => p && p.image_url
  ? `<img class="oimg ${cls}" src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy">`
  : `<span class="oimg ph ${cls}"><b>${esc(p?.grade || 'MOY')}</b></span>`;
const motorOils = () => S.boot.products.filter(p => p.active && p.category === 'moy' && p.kind !== 'karobka');
const gradeSort = (a, b) => (parseInt(a) - parseInt(b)) || (parseInt(a.split('-')[1]) - parseInt(b.split('-')[1])) || a.localeCompare(b);

function plateBox(p, cls = '') {
  return `<div class="plate-box ${cls}"><span class="flag">UZ</span><span class="plate-disp ${p ? '' : 'ph'}">${p ? plateFmt(p) : '01 A 123 BC'}</span></div>`;
}
// Tepada: mashina nomi va raqami alohida-alohida
function carHeader(c) {
  return `<div class="card"><div class="grid g2 hdr">
    <div><div class="lbl">Mashina</div><div class="big2">${esc(c.model || '—')} ${c.transmission ? `<span class="tr">${TRANS[c.transmission]}</span>` : ''}</div>
      <div class="muted">${colorDot(c.color) || 'rangi kiritilmagan'} · ${GROUPS[modelGrp(c.model)]}</div></div>
    <div><div class="lbl">Raqami</div>${plateBox(c.plate, 'sm')}</div>
    <div><div class="lbl">Mijoz telefoni</div><div class="big2">${c.customer_phone ? phoneShow(c.customer_phone) : '<span class="neg">kiritilmagan</span>'}</div></div>
    <div><div class="lbl">Ismi</div><div class="big2">${esc(c.customer_name || '—')}</div></div>
  </div></div>`;
}

// ---------- 1. Jarayondagi mashinalar (asosiy ekran)
VIEWS.jarayon = async () => {
  const t = await GET('today');
  const card = o => `<div class="card ocard ${o.status}">
      <div class="row"><span class="plate-mini">${plateFmt(o.plate)}</span><span class="big2 sp">${carDesc(o)}</span><span class="tag ${o.status}">${STATUS[o.status]}</span></div>
      <div class="row muted" style="margin:6px 0"><span>${timeOf(o.created_at)}${o.created_at.slice(0, 10) !== t.date ? ' · ' + dateOf(o.created_at) : ''}</span>
        <span>Usta: <b>${esc(o.master_name || '—')}</b></span><span>${km(o.mileage)}</span></div>
      <div>${orderLine(o) || '—'}</div>
      <div class="bigbtns">${o.status === 'jarayonda' ? `<button class="btn ok xl" data-ready="${o.id}" type="button">✓ Tayyor</button>` : ''}<button class="btn xl" data-edit="${o.id}" type="button">✎ Tahrirlash</button></div>
    </div>`;
  $('#app').innerHTML = `<div class="pl-shell">
    <button class="btn p xl newsale" id="new" type="button">＋ Yangi sotuv</button>
    <div class="row sec-h"><h2 class="sp">Jarayonda <span class="cnt-pill">${t.open.length}</span></h2>
      <div class="chips">${t.by_master.map(m => `<span class="chip">${esc(m.name || '—')}: <b>${m.n}</b></span>`).join('')}</div></div>
    ${t.open.map(card).join('') || `<div class="card empty">Hozir jarayonda mashina yo'q. Mijoz kelsa «＋ Yangi sotuv» ni bosing.</div>`}
    ${t.done.length ? `<details class="card done-list"><summary><b>Bugun kassadan o'tdi: ${t.done.length} ta</b></summary>
      ${t.done.map(o => `<div class="irow"><span class="plate-mini sm">${plateFmt(o.plate)}</span><span class="sp small">${carDesc(o)} · ${orderLine(o)}</span><span class="muted small">${timeOf(o.closed_at)}</span></div>`).join('')}</details>` : ''}
  </div>`;
  $('#new').onclick = () => go('yangi');
  $$('[data-ready]').forEach(b => b.onclick = safe(async () => { await PUT('orders/' + b.dataset.ready, { status: 'tayyor' }); toast('Tayyor — kassaga bildirildi'); render(); }));
  $$('[data-edit]').forEach(b => b.onclick = safe(async () => {
    const o = await GET('orders/' + b.dataset.edit);
    const r = await GET('cars/lookup?plate=' + encodeURIComponent(o.plate));
    go('order', { car: r.car, order: o, form: true });
  }));
};

// ---------- 2. Yangi sotuv: avval mashina raqami
VIEWS.yangi = async () => {
  let plate = S.ctx.plate || '';
  $('#app').innerHTML = `<div class="pl-shell"><div class="card">
    <div class="lbl">Mashina raqami</div>
    <div class="plate-box" id="pbox"><span class="flag">UZ</span><span id="pd" class="plate-disp"></span><span id="pok" class="plate-ok"></span></div>
    <div id="pmsg" class="pmsg"></div>
    <div class="kbd" id="kbd">${PLATE_KEYS.map(r => `<div class="krow">${[...r].map(k => `<button class="key" data-k="${k}" type="button">${k}</button>`).join('')}</div>`).join('')}
      <div class="krow"><button class="key wide" data-k="CLR" type="button">Tozalash</button><button class="key wide" data-k="BS" type="button">⌫ O'chirish</button></div></div>
    <div class="bigbtns"><button class="btn xl" id="exc" type="button">Istisno<small>chet el raqami</small></button><button class="btn p xl" id="go" type="button" style="flex:2">Davom etish →</button></div>
  </div></div>`;
  const draw = (err) => {
    const pd = $('#pd'); pd.textContent = plate ? plateFmt(plate) : '01 A 123 BC'; pd.classList.toggle('ph', !plate);
    const ok = plateValid(plate), n = plateClean(plate).length;
    $('#pok').textContent = ok ? '✓' : '';
    $('#pbox').classList.toggle('bad', !!err);
    $('#pmsg').className = 'pmsg' + (err ? ' err' : ok ? ' ok' : '');
    $('#pmsg').innerHTML = err ? esc(err) : ok ? "✓ To'g'ri format" : n ? 'Format: <b>01 A 123 BC</b> yoki <b>01 123 ABC</b>' : '';
    $('#go').disabled = n < 3; $('#exc').disabled = n < 3;
    $('#exc').classList.toggle('warn', !!err);
    S.ctx.plate = plate;
  };
  const press = k => {
    if (k === 'CLR') plate = ''; else if (k === 'BS') plate = plate.slice(0, -1);
    else if (plateClean(plate).length < 10) plate += k;
    draw();
  };
  $('#kbd').onclick = e => { const b = e.target.closest('[data-k]'); if (b) press(b.dataset.k); };
  KEYH = e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[a-zA-Z0-9]$/.test(e.key)) press(e.key.toUpperCase());
    else if (e.key === 'Backspace') press('BS');
    else if (e.key === 'Enter') { if (!$('#go').disabled) $('#go').click(); }
    else return;
    e.preventDefault();
  };
  const open = async exception => {
    const r = await GET('cars/lookup?plate=' + encodeURIComponent(plate));
    if (r.car) go('car', { car: r.car });
    else go('register', { plate: r.plate, exception });
  };
  $('#go').onclick = safe(async () => {
    if (!plateValid(plate)) return draw("Raqam noto'g'ri. To'g'ri format: 01 A 123 BC yoki 01 123 ABC. Chet el mashinasi bo'lsa «Istisno»ni bosing.");
    await open(false);
  });
  $('#exc').onclick = safe(async () => {
    if (plateValid(plate)) return open(false);
    if (await confirmBox(`«${plateFmt(plate)}» istisno (chet el / boshqa format) sifatida qo'shilsinmi?`)) await open(true);
  });
  draw();
};

// ---------- 3. Bazada bor mashina: mijoz ma'lumoti va moy tarixi
VIEWS.car = async () => {
  const c = S.ctx.car;
  const hist = c.history.filter(h => h.type === 'zamena' && h.status === 'yopilgan');
  const open = c.history.find(h => ['jarayonda', 'tayyor'].includes(h.status));
  const missing = [!c.model && 'mashina nomi', !c.transmission && 'A/T yoki M/T', !c.color && 'rangi', !c.customer_phone && 'mijoz telefoni'].filter(Boolean);
  const oilOf = h => h.items.filter(i => i.category === 'moy');
  const filtOf = h => h.items.filter(i => i.category === 'filtr');
  $('#app').innerHTML = `<div class="pl-shell">${carHeader(c)}
    ${missing.length ? `<div class="warn-box">To'ldirilmagan: <b>${missing.join(', ')}</b>. Mijoz to'liq kiritilmasa zamena qilib bo'lmaydi.</div>` : ''}
    ${open ? `<div class="warn-box">Bu mashina hozir jarayonda — ${STATUS[open.status]}.</div>` : ''}
    <div class="bigbtns"><button class="btn xl" id="back" type="button">← Orqaga</button><button class="btn xl" id="edit" type="button">✎ O'zgartirish</button>
      ${open ? `<button class="btn p xl" id="openo" type="button">Zakazni ochish →</button>` : `<button class="btn p xl" id="start" type="button">Zamena boshlash →</button>`}</div>
    <div class="card"><div class="lbl">Moy almashtirish tarixi</div>
      ${hist.length ? `<div class="hist2">${hist.map(h => `<div class="hrow">
        <div class="hdate"><b>${dateOf(h.closed_at || h.created_at)}</b><span>${km(h.mileage)}</span></div>
        <div class="sp">${oilOf(h).map(i => `<div class="big3">${esc(i.name)} — <b>${qtyFmt(i.qty)} L</b></div>`).join('') || '<div class="muted">moy yo\'q</div>'}
          <div class="small muted">${filtOf(h).map(i => esc(i.name) + (i.qty > 1 ? ' ×' + qtyFmt(i.qty) : '') + (i.is_bonus ? ' 🎁' : '')).join(' · ')}</div></div>
        <div class="muted small">${esc(h.master_name || '')}</div></div>`).join('')}</div>` : '<div class="empty">Birinchi tashrif</div>'}</div></div>`;
  $('#back').onclick = () => go('yangi');
  $('#edit').onclick = () => go('register', { car: c });
  if (open) $('#openo').onclick = safe(async () => go('order', { car: c, order: await GET('orders/' + open.id), form: true }));
  else $('#start').onclick = () => missing.length ? go('register', { car: c }) : go('order', { car: c, form: true });
};

// ---------- Mijoz kiritish / o'zgartirish (mijoz bazasidan hech narsa ko'rsatilmaydi)
VIEWS.register = async () => {
  const c = S.ctx.car || {};
  const f = S.ctx.f || (S.ctx.f = {
    plate: c.plate || S.ctx.plate, model: c.model || '', transmission: c.transmission || '', color: c.color || '',
    phone: phoneFmt(c.customer_phone || ''), name: c.customer_name || '', grp: '',
  });
  const models = S.boot.car_models.map(m => m.name);
  $('#app').innerHTML = `<div class="pl-shell">
    <div class="card"><div class="grid g2 hdr">
      <div><div class="lbl">Mashina nomi</div><div class="big2" id="mshow"></div></div>
      <div><div class="lbl">Mashina raqami ${S.ctx.exception ? '<span class="tag bonus">istisno</span>' : ''}</div>${plateBox(f.plate, 'sm')}</div></div></div>
    <div class="card"><div class="lbl">1. Mashina nomi</div><div class="tiles" id="models">
      ${models.map(m => `<button class="tile" data-m="${esc(m)}" type="button">${esc(m)}</button>`).join('')}
      <button class="tile" data-m="" id="mother" type="button">Boshqa ✎</button></div></div>
    <div class="card"><div class="lbl">2. Uzatmalar qutisi</div><div class="tiles two" id="tr">
      <button class="tile xl" data-t="AT" type="button">A/T<small>avtomat</small></button><button class="tile xl" data-t="MT" type="button">M/T<small>mexanika</small></button></div></div>
    <div class="card"><div class="lbl">3. Rangi</div><div class="tiles" id="col">
      ${COLORS.map(([n, bg]) => `<button class="tile col" data-c="${esc(n)}" type="button"><span class="cdot lg" style="background:${bg}"></span>${esc(n)}</button>`).join('')}</div></div>
    <div class="card"><div class="lbl">4. Mijoz telefoni (majburiy)</div>
      <div class="phone-in"><span>+998</span><input id="ph" inputmode="numeric" autocomplete="off" placeholder="88 226 15 00" value="${esc(f.phone)}"></div>
      <div class="lbl" style="margin-top:16px">Mijoz ismi</div><input id="nm" class="in-xl" value="${esc(f.name)}" placeholder="Ismi (ixtiyoriy)" autocomplete="off"></div>
    <div class="bigbtns"><button class="btn xl" id="back" type="button">← Orqaga</button><button class="btn p xl" id="save" type="button">${c.id ? 'Saqlash' : 'Saqlash va zamena →'}</button></div></div>`;
  const custom = () => f.model && !models.includes(f.model);
  const mark = () => {
    $('#mshow').innerHTML = f.model ? `${esc(f.model)} ${f.transmission ? `<span class="tr">${TRANS[f.transmission]}</span>` : ''} ${colorDot(f.color)}` : '<span class="muted">tanlang ↓</span>';
    $$('#models [data-m]').forEach(b => b.classList.toggle('on', b.id === 'mother' ? custom() : b.dataset.m === f.model));
    $('#mother').textContent = custom() ? f.model + ' ✎' : 'Boshqa ✎';
    $$('#tr [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === f.transmission));
    $$('#col [data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === f.color));
  };
  $('#models').onclick = e => {
    const b = e.target.closest('[data-m]'); if (!b) return;
    if (b.id !== 'mother') { f.model = b.dataset.m; return mark(); }
    let grp = f.grp || 'xitoy';
    const m = modal('Mashina nomi', `<input id="mn" class="in-xl" placeholder="Masalan: Chery Arrizo 8, Kaiyi" value="${esc(custom() ? f.model : '')}">
      <div class="lbl" style="margin-top:14px">Qaysi turdagi mashina? (filtrlar shunga qarab chiqadi)</div>
      <div class="tiles two" id="mg">${Object.entries(GROUPS).map(([k, v]) => `<button class="tile" data-g="${k}" type="button">${v}<small>${(S.boot.group_filters[k] || []).map(x => FNAME[x].replace(' filtri', '')).join(', ')}</small></button>`).join('')}</div>
      <div class="bigbtns"><button class="btn p xl" id="ok" type="button">OK</button></div>`);
    const markG = () => $$('#mg [data-g]', m.el).forEach(x => x.classList.toggle('on', x.dataset.g === grp));
    $('#mg', m.el).onclick = e2 => { const g = e2.target.closest('[data-g]'); if (g) { grp = g.dataset.g; markG(); } };
    markG(); setTimeout(() => $('#mn', m.el).focus(), 50);
    const ok = () => {
      const v = $('#mn', m.el).value.trim(); if (!v) return toast('Mashina nomini yozing', true);
      f.model = v; f.grp = grp;
      if (!S.boot.car_models.some(x => x.name.toLowerCase() === v.toLowerCase())) S.boot.car_models.push({ name: v, grp });
      m.close(); mark();
    };
    $('#ok', m.el).onclick = ok; $('#mn', m.el).onkeydown = e2 => e2.key === 'Enter' && ok();
  };
  $('#tr').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { f.transmission = b.dataset.t; mark(); } };
  $('#col').onclick = e => { const b = e.target.closest('[data-c]'); if (b) { f.color = b.dataset.c; mark(); } };
  $('#ph').oninput = e => { e.target.value = phoneFmt(e.target.value); f.phone = e.target.value; };
  $('#nm').oninput = e => { f.name = e.target.value; };
  $('#back').onclick = () => c.id ? go('car', { car: c }) : go('yangi', { plate: f.plate });
  $('#save').onclick = safe(async () => {
    const err = !f.model ? 'Mashina nomini tanlang' : !f.transmission ? 'A/T yoki M/T ni tanlang' : !f.color ? 'Mashina rangini tanlang'
      : f.phone.replace(/\D/g, '').length !== 9 ? "Mijoz telefon raqamini to'liq kiriting" : '';
    if (err) throw new Error(err);
    const body = { model: f.model, model_grp: f.grp || undefined, transmission: f.transmission, color: f.color, phone: '998' + f.phone.replace(/\D/g, ''), customer_name: $('#nm').value.trim() };
    if (c.id) { const car = await PUT('cars/' + c.id, body); await reloadBoot(); toast('Saqlandi'); go('car', { car }); }
    else { const car = await POST('cars', { plate: f.plate, exception: !!S.ctx.exception, ...body }); await reloadBoot(); toast("Mijoz qo'shildi"); go('order', { car, form: true }); }
  });
  mark();
};

// ---------- 4. Zamena formasi
VIEWS.order = async () => {
  const { car, order } = S.ctx;
  const all = order ? itemsFromOrder(order) : [];
  const oilIdx = all.findIndex(i => i.category === 'moy' && prod(i.product_id)?.kind !== 'karobka');
  let oil = oilIdx >= 0 ? { product_id: all[oilIdx].product_id, qty: +all[oilIdx].qty, price: all[oilIdx].price } : null;
  const items = all.filter((_, i) => i !== oilIdx);
  const bonusSet = () => new Set(oil ? (prod(oil.product_id)?.bonus_kinds || []) : []);
  items.forEach(it => { it.auto = !!(it.is_bonus && it.category === 'filtr' && bonusSet().has(kindOf(it))); });
  let master = order?.master_id || null;
  const kinds = groupFilters(car.model);
  const grp = modelGrp(car.model);
  $('#app').innerHTML = `<div class="pl-shell">${carHeader(car)}
    <div class="card"><div class="lbl">1. Probeg (km) ${car.last_mileage ? `<span class="muted">— oxirgi: ${km(car.last_mileage)}</span>` : ''}</div>
      <input id="mil" class="in-xl mil" inputmode="numeric" autocomplete="off" placeholder="masalan 125 000" value="${order?.mileage ? fmt(order.mileage) : ''}"></div>
    <div class="card"><div class="lbl">2. Usta (majburiy)</div><div class="tiles" id="ms">
      ${employees('usta').map(e => `<button class="tile xl" data-id="${e.id}" type="button">${esc(e.name)}</button>`).join('') || '<div class="muted">Ustalar kiritilmagan (kassa → Xodimlar)</div>'}</div></div>
    <div class="card"><div class="lbl">3. Motor moyi</div><div id="oilbox"></div>
      <div class="lbl" style="margin-top:16px">Necha litr</div>
      <div class="lit-row"><div class="tiles lit" id="lit">${LITERS.map(l => `<button class="tile" data-l="${l}" type="button">${l} L</button>`).join('')}</div>
        <label class="lit-man"><span>Boshqa:</span><input id="lman" inputmode="decimal" placeholder="…" autocomplete="off"><span>L</span></label></div></div>
    <div class="card"><div class="lbl">4. Filtrlar — ${GROUPS[grp]} (${kinds.length} ta)</div><div class="tiles" id="flt">
      ${kinds.map(k => `<button class="tile xl ftile" data-f="${k}" type="button">${FNAME[k]}<small id="fs-${k}"></small><span class="cnt" id="fc-${k}" hidden></span></button>`).join('')}
      <button class="tile xl" id="other" type="button">+ Boshqa<small>antifriz, karobka moyi…</small></button></div></div>
    <div class="card"><div class="lbl">Ro'yxat</div><div id="list"></div></div>
    <div class="card"><input id="note" class="in-xl" placeholder="Izoh (ixtiyoriy)" value="${esc(order?.note || '')}"></div>
    <div class="bigbtns"><button class="btn xl ${order ? 'bad' : ''}" id="cancel" type="button">${order ? 'Bekor qilish' : '← Orqaga'}</button>
      <button class="btn p xl" id="submit" type="button">${order ? 'Saqlash' : 'Kassaga o\'tkazish →'}</button></div></div>`;

  // Moy tanlangan bo'lsa unga belgilangan filtrlar bonus (tekin) bo'ladi
  const applyBonus = () => {
    const allowed = bonusSet();
    items.forEach(it => { if (it.auto && !allowed.has(kindOf(it))) { it.auto = false; it.is_bonus = false; } });
    for (let i = items.length - 1; i >= 0; i--) {             // bir xil oddiy pozitsiyalarni birlashtirish
      const it = items[i], j = items.findIndex(x => x !== it && !x.is_bonus && !it.is_bonus && x.product_id === it.product_id);
      if (j >= 0 && j < i) { items[j].qty = +items[j].qty + +it.qty; items.splice(i, 1); }
    }
    allowed.forEach(k => {
      if (items.some(i => i.auto && kindOf(i) === k)) return;
      const reg = items.find(i => !i.is_bonus && i.category === 'filtr' && kindOf(i) === k); if (!reg) return;
      if (+reg.qty > 1) { reg.qty = +reg.qty - 1; items.push({ ...reg, qty: 1, is_bonus: true, auto: true }); }
      else { reg.is_bonus = true; reg.auto = true; }
    });
  };
  const drawOil = () => {
    const p = oil && prod(oil.product_id);
    $('#oilbox').innerHTML = p ? `<div class="oil-sel">${oilImg(p, 'lg')}<div class="sp"><div class="big2">${esc(p.name)}</div>
        <div class="muted">${esc(p.grade || '')} · ${fmt(p.price)} so'm / L</div>${(p.bonus_kinds || []).length ? `<div class="bonus-note">🎁 ${p.bonus_kinds.map(k => FNAME[k]).join(', ')} — bonus (tekin)</div>` : ''}</div>
        <button class="btn xl" id="chg" type="button">Almashtirish</button></div>`
      : `<button class="tile xl oil-btn" id="chg" type="button">🛢 Motor moyi<small>bosing — yopishqoqlik bo'yicha tanlang</small></button>`;
    $('#chg').onclick = pickOil;
    $$('#lit [data-l]').forEach(b => b.classList.toggle('on', !!oil && +b.dataset.l === oil.qty));
    const man = $('#lman'); if (document.activeElement !== man) man.value = oil && oil.qty && !LITERS.includes(oil.qty) ? qtyFmt(oil.qty) : '';
    drawList();
  };
  // Motor moyi: chap tomonda yopishqoqlik filtri, o'ngda rasmli moylar
  const pickOil = () => {
    const oils = motorOils();
    const grades = [...new Set(oils.map(p => p.grade).filter(Boolean))].sort(gradeSort);
    let g = LS.get('grade', '') ; if (g && !grades.includes(g)) g = '';
    const m = modal('Motor moyi', `<div class="opick"><div class="grades" id="gr"></div><div class="ogrid" id="og"></div></div>`, { wide: true });
    const draw = () => {
      $('#gr', m.el).innerHTML = [['', 'Hammasi'], ...grades.map(x => [x, x])].map(([k, v]) => `<button class="gchip ${k === g ? 'on' : ''}" data-g="${esc(k)}" type="button">${esc(v)}</button>`).join('');
      const list = oils.filter(p => !g || p.grade === g);
      $('#og', m.el).innerHTML = list.map(p => `<button class="ocard2 ${oil && oil.product_id === p.id ? 'on' : ''}" data-id="${p.id}" type="button">${oilImg(p)}
        <span class="on1">${esc(p.name)}</span><span class="on2">${esc(p.grade || '')}${p.grade ? ' · ' : ''}${fmt(p.price)} / L</span>
        ${(p.bonus_kinds || []).length ? `<span class="obonus">🎁 ${p.bonus_kinds.map(k => FNAME[k].replace(' filtri', '')).join(', ')} filtr bonus</span>` : ''}</button>`).join('') || '<div class="empty">Bu turdagi moy yo\'q</div>';
    };
    $('#gr', m.el).onclick = e => { const b = e.target.closest('[data-g]'); if (!b) return; g = b.dataset.g; LS.set('grade', g); draw(); };
    $('#og', m.el).onclick = e => {
      const b = e.target.closest('[data-id]'); if (!b) return; const p = prod(b.dataset.id);
      oil = { product_id: p.id, price: p.price, qty: oil?.qty || 0 };
      m.close(); applyBonus(); drawOil();
    };
    draw();
  };
  const drawList = () => {
    const rows = []; let total = 0;
    if (oil) { const p = prod(oil.product_id); const s = Math.round((oil.qty || 0) * oil.price); total += s; rows.push(`<div class="irow"><span class="sp"><span class="tag moy">Moy</span> ${esc(p?.name || '')} — <b>${qtyFmt(oil.qty)} L</b></span><b class="num">${fmt(s)}</b></div>`); }
    items.forEach((it, i) => {
      const s = it.is_bonus ? 0 : Math.round(it.qty * it.price); total += s;
      rows.push(`<div class="irow" data-i="${i}"><span class="sp"><span class="tag ${it.category}">${CATS[it.category]}</span> ${esc(it.name)}${it.auto ? ' <span class="tag bonus">🎁 moy bilan</span>' : ''}</span>
        <button class="qbtn" data-q="-1" type="button">−</button><span class="qty">${qtyFmt(it.qty)}</span><button class="qbtn" data-q="1" type="button" ${it.auto ? 'disabled' : ''}>+</button>
        <button class="bonus-t ${it.is_bonus ? 'on' : ''}" data-b type="button" ${it.auto ? 'disabled' : ''}>Bonus</button><b class="num" style="min-width:90px">${it.is_bonus ? 'tekin' : fmt(s)}</b></div>`);
    });
    $('#list').innerHTML = rows.join('') + (rows.length ? `<div class="irow tot"><span class="sp">Jami</span><b>${sum(total)}</b></div>` : '<div class="empty">Hali hech narsa tanlanmagan</div>');
    kinds.forEach(k => {
      const its = items.filter(i => i.category === 'filtr' && kindOf(i) === k);
      const n = its.reduce((a, i) => a + +i.qty, 0);
      const c = $('#fc-' + k); c.hidden = !n; c.textContent = n;
      $('#fs-' + k).textContent = n ? [...new Set(its.map(i => shortName(i.name)))].join(', ') : 'tanlang';
    });
  };
  const addItem = (p, qty = 1) => {
    const ex = items.find(i => i.product_id === p.id && !i.is_bonus);
    if (ex) ex.qty = +ex.qty + qty; else items.push({ product_id: p.id, name: p.name, category: p.category, qty, price: p.price, is_bonus: false });
    applyBonus(); drawList();
  };
  const countOf = pid => items.filter(i => i.product_id === pid).reduce((a, i) => a + +i.qty, 0);
  const removeOne = pid => {
    const it = items.find(i => i.product_id === pid && !i.auto) || items.find(i => i.product_id === pid); if (!it) return;
    it.qty = +it.qty - 1; if (it.qty <= 0) items.splice(items.indexOf(it), 1);
    applyBonus(); drawList();
  };
  // Filtr: Chevrolet/Damas — faqat shu modelga mos filtrlar (2–3 firma); xitoy va boshqalar — qo'lda tanlanadi
  const pickFilter = kind => {
    const pool = S.boot.products.filter(p => p.active && p.category === 'filtr' && p.kind === kind);
    const model = String(car.model || '').toLowerCase();
    const fit = pool.filter(p => (p.models || []).some(x => x.toLowerCase() === model));
    const strict = grp === 'chevrolet' || grp === 'damas';
    const list = strict ? (fit.length ? fit : pool) : [...fit, ...pool.filter(p => !fit.includes(p))];
    const note = strict ? (fit.length ? `«${esc(car.model)}» ga mos filtrlar` : `«${esc(car.model)}» uchun mos filtr belgilanmagan — hammasi ko'rsatilmoqda`) : `${GROUPS[grp]} mashina — filtrni qo'lda tanlang`;
    const m = modal(FNAME[kind] + ' — ' + (car.model || ''), `<p class="muted">${note}</p><div class="fgrid" id="fg"></div>
      <div class="bigbtns"><button class="btn p xl" id="done" type="button">Tayyor</button></div>`, { wide: true });
    const draw = () => {
      $('#fg', m.el).innerHTML = list.map(p => { const n = countOf(p.id); return `<div class="fcard ${n ? 'on' : ''}" data-id="${p.id}">
        <button class="fmain" data-add="${p.id}" type="button"><span class="on1">${esc(shortName(p.name))}</span><span class="on2">${fmt(p.price)} so'm · qoldiq ${qtyFmt(p.stock)}</span></button>
        <div class="fqty"><button class="qbtn" data-rm="${p.id}" type="button" ${n ? '' : 'disabled'}>−</button><span class="qty">${n}</span><button class="qbtn" data-add="${p.id}" type="button">+</button></div></div>`; }).join('') || '<div class="empty">Omborda bu turdagi filtr yo\'q</div>';
    };
    $('#fg', m.el).onclick = e => {
      const a = e.target.closest('[data-add]'), r = e.target.closest('[data-rm]');
      if (a) addItem(prod(a.dataset.add)); else if (r) removeOne(+r.dataset.rm); else return;
      draw();
    };
    $('#done', m.el).onclick = m.close;
    draw();
  };

  $('#mil').oninput = e => { const d = e.target.value.replace(/\D/g, '').slice(0, 7); e.target.value = d ? fmt(+d) : ''; };
  $('#ms').onclick = e => { const b = e.target.closest('[data-id]'); if (!b) return; master = +b.dataset.id; $$('#ms .tile').forEach(x => x.classList.toggle('on', x === b)); };
  $$('#ms .tile').forEach(x => x.classList.toggle('on', +x.dataset.id === master));
  $('#lit').onclick = e => { const b = e.target.closest('[data-l]'); if (!b) return; if (!oil) return toast('Avval moyni tanlang', true); oil.qty = +b.dataset.l; drawOil(); };
  $('#lman').oninput = e => { const v = parseFloat(e.target.value.replace(',', '.')); if (!oil) { e.target.value = ''; return toast('Avval moyni tanlang', true); } oil.qty = v > 0 ? Math.min(v, 50) : 0; drawOil(); };
  $('#flt').onclick = e => { const b = e.target.closest('[data-f]'); if (b) pickFilter(b.dataset.f); };
  $('#other').onclick = () => pickProduct(p => addItem(p));
  $('#list').onclick = e => {
    const r = e.target.closest('[data-i]'); if (!r) return; const it = items[r.dataset.i];
    const q = e.target.closest('[data-q]');
    if (q) { it.qty = +it.qty + +q.dataset.q; if (it.qty <= 0) items.splice(r.dataset.i, 1); applyBonus(); }
    else if (e.target.closest('[data-b]')) it.is_bonus = !it.is_bonus;
    drawList();
  };
  $('#cancel').onclick = safe(async () => {
    if (!order) return go('car', { car });
    if (await confirmBox('Zakaz bekor qilinsinmi? Mahsulotlar omborga qaytadi.')) { await POST(`orders/${order.id}/cancel`); toast('Bekor qilindi'); go('jarayon'); }
  });
  $('#submit').onclick = safe(async () => {
    const mil = +$('#mil').value.replace(/\D/g, '');
    if (!mil) { $('#mil').focus(); throw new Error('Probegni kiriting'); }
    if (!master) { $('#ms').scrollIntoView({ behavior: 'smooth', block: 'center' }); throw new Error('Ustani belgilang — majburiy'); }
    if (oil && !oil.qty) throw new Error('Necha litr quyilganini tanlang');
    if (!oil && !(await confirmBox('Motor moyi tanlanmadi. Shunday davom etilsinmi?'))) return;
    const list = (oil ? [{ ...oil, is_bonus: false }] : []).concat(items);
    const services = [...new Set(list.map(i => { const p = prod(i.product_id); return p?.category === 'filtr' ? (FNAME[p.kind] || 'Filtr') : p?.category === 'moy' ? (p.kind === 'karobka' ? 'Karobka moyi' : 'Motor moyi') : null; }).filter(Boolean))];
    const body = { type: 'zamena', car_id: car.id, mileage: mil, master_id: master, oil_in: oil ? oil.qty : null, services, note: $('#note').value, items: itemsPayload(list) };
    const save = force => order ? PUT('orders/' + order.id, body) : POST('orders', { ...body, force });
    try { await save(false); } catch (e) {
      if (/Probeg avvalgidan/.test(e.message) && await confirmBox(e.message + ' Baribir saqlansinmi?')) await save(true);
      else throw e;
    }
    toast(order ? 'Saqlandi' : "Kassaga o'tkazildi");
    go('jarayon');
  });
  drawOil();
};

// ================================================================== KASSA
VIEWS.navbat = async () => {
  const list = await GET('orders?status=open');
  const seen = new Set(LS.get('seen', []));
  $('#app').innerHTML = `<div class="row"><h2 class="sp">Navbat — to'lov kutilmoqda (${list.length})</h2><button class="btn p" id="pos">+ Oddiy sotuv</button></div>
    ${list.length ? `<div class="queue">${list.map(o => `<div class="card qcard ${o.status} ${seen.has(o.id) ? '' : 'new'}" data-id="${o.id}">
      <div class="row"><span class="plate-t sp">${plateFmt(o.plate)}</span><span class="tag ${o.status}">${STATUS[o.status]}</span></div>
      <div>${carDesc(o)}</div><div class="muted small">${esc(o.customer_name || '')} ${phoneShow(o.customer_phone)}</div>
      <div class="small" style="margin:8px 0">${orderLine(o) || '—'}</div>
      <div class="row small muted"><span>Usta: <b>${esc(o.master_name || '—')}</b></span><span>${km(o.mileage)}</span><span class="sp"></span><span>${timeOf(o.created_at)}</span></div>
      <div class="row" style="margin-top:8px"><span class="sp muted small">${o.customer_cashback ? 'Keshbek: ' + fmt(o.customer_cashback) : ''}</span><span class="big" style="font-size:22px">${sum(o.subtotal)}</span></div>
      </div>`).join('')}</div>` : '<div class="card empty">Hozircha navbat bo\'sh. Planshetdan «Almashtirilmoqda» qilinganda shu yerda paydo bo\'ladi.</div>'}`;
  LS.set('seen', [...new Set([...seen, ...list.map(o => o.id)])].slice(-300));
  if (list.some(o => !seen.has(o.id))) beep();
  $('#pos').onclick = () => go('sotuv');
  $$('.qcard').forEach(c => c.onclick = safe(async () => checkout(await GET('orders/' + c.dataset.id))));
  updateBadges();
};

function beep() {
  try { const a = new (window.AudioContext || window.webkitAudioContext)(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.value = .1; o.start(); setTimeout(() => { o.stop(); a.close(); }, 200); } catch { }
}

function payBlock(prefix = '') {
  return `<div class="grid g2">
    <label class="f"><span>Chegirma (so'm)</span><input id="${prefix}disc" type="number" min="0" step="1000" value="0"></label>
    <label class="f"><span>Keshbekdan to'lash</span><input id="${prefix}cb" type="number" min="0" step="1000" value="0"></label>
    <label class="f"><span>Naqd</span><input id="${prefix}cash" type="number" min="0" step="1000"></label>
    <label class="f"><span>Karta / Click / Payme</span><input id="${prefix}card" type="number" min="0" step="1000"></label>
    </div>
    <div class="sum-box"><div class="line"><span>Mahsulotlar</span><b id="${prefix}s-sub">0</b></div>
      <div class="line"><span>Chegirma</span><b id="${prefix}s-disc">0</b></div><div class="line"><span>Keshbekdan</span><b id="${prefix}s-cb">0</b></div>
      <div class="line tot"><span>To'lash kerak</span><span id="${prefix}s-tot">0</span></div>
      <div class="line small muted"><span>Mijozga keshbek tushadi (${S.boot.settings.cashback_percent}%)</span><span id="${prefix}s-earn">0</span></div></div>`;
}
function payCalc(el, subtotal, cbMax, hasCustomer) {
  const disc = Math.min(+$('#disc', el).value || 0, subtotal);
  const cbIn = $('#cb', el); if (+cbIn.value > cbMax) cbIn.value = cbMax;
  const cb = Math.min(+cbIn.value || 0, subtotal - disc);
  const tot = subtotal - disc - cb;
  $('#s-sub', el).textContent = fmt(subtotal); $('#s-disc', el).textContent = '−' + fmt(disc); $('#s-cb', el).textContent = '−' + fmt(cb);
  $('#s-tot', el).textContent = sum(tot);
  $('#s-earn', el).textContent = hasCustomer ? '+' + fmt(Math.floor(tot * (+S.boot.settings.cashback_percent || 0) / 100)) : 'mijoz yo\'q';
  return { disc, cb, tot };
}
function payPayload(el, tot) {
  let cash = $('#cash', el).value, card = $('#card', el).value;
  if (cash === '' && card === '') cash = tot;
  else if (cash === '') cash = tot - (+card || 0);
  else if (card === '') card = tot - (+cash || 0);
  return { discount: +$('#disc', el).value || 0, cashback_used: +$('#cb', el).value || 0, paid_cash: +cash || 0, paid_card: +card || 0 };
}

function checkout(o) {
  const items = itemsFromOrder(o);
  const m = modal(`To'lov: ${o.plate} — #${o.id}`, `
    <div class="row muted small" style="margin-bottom:8px"><span>${carDesc(o)}</span><span>Mijoz: <b>${esc(o.customer_name || '—')}</b> ${o.customer_phone ? phoneShow(o.customer_phone) : ''}</span>
      <span>Usta: <b>${esc(o.master_name || '—')}</b></span><span>Probeg: ${km(o.mileage)}</span>${o.oil_in ? `<span>Quyildi ${qtyFmt(o.oil_in)} L</span>` : ''}</div>
    ${o.services.length ? `<div class="chips small" style="margin-bottom:8px">${o.services.map(s => `<span class="tag xizmat">${esc(s)}</span>`).join('')}</div>` : ''}
    <div class="row"><h3 class="sp">Mahsulotlar</h3><button class="btn sm" id="add">+ Qo'shish</button></div><div id="it"></div>
    <div class="muted small" style="margin:6px 0 12px">Mijoz keshbeki: <b class="pos">${sum(o.customer_cashback || 0)}</b></div>
    ${payBlock()}
    <div class="row" style="margin-top:14px"><button class="btn bad" id="cnl">Bekor qilish</button><span class="sp"></span>
      <button class="btn" id="sv">Faqat saqlash</button><button class="btn ok lg" id="pay">To'landi ✓</button></div>`, { wide: true });
  let subtotal = o.subtotal;
  const recalc = () => payCalc(m.el, subtotal, o.customer_cashback || 0, !!o.customer_id);
  const ed = itemsEditor($('#it', m.el), items, t => { subtotal = t; recalc(); }, { showCost: true });
  m.el.addEventListener('input', e => { if (['disc', 'cb'].includes(e.target.id)) recalc(); });
  $('#add', m.el).onclick = () => pickProduct(p => ed.add(p));
  const saveItems = () => PUT('orders/' + o.id, { items: itemsPayload(items) });
  $('#sv', m.el).onclick = safe(async () => { await saveItems(); m.close(); toast('Saqlandi'); render(); });
  $('#cnl', m.el).onclick = safe(async () => { if (await confirmBox('Zakaz bekor qilinsinmi?')) { await POST(`orders/${o.id}/cancel`); m.close(); render(); } });
  $('#pay', m.el).onclick = safe(async () => {
    await saveItems();
    const { tot } = recalc();
    const closed = await POST(`orders/${o.id}/close`, payPayload(m.el, tot));
    m.close(); toast(`To'landi: ${sum(closed.total)}${closed.cashback_earned ? ' · keshbek +' + fmt(closed.cashback_earned) : ''}`);
    offerReceipt(closed); render();
  });
}

function offerReceipt(o) {
  const m = modal('Tayyor', `<p>Zakaz #${o.id} yopildi. Jami: <b>${sum(o.total)}</b></p><div class="row end"><button class="btn" data-c>Yopish</button><button class="btn p" data-p>Chek chiqarish</button></div>`);
  $('[data-c]', m.el).onclick = m.close;
  $('[data-p]', m.el).onclick = () => { printReceipt(o); m.close(); };
}
function printReceipt(o) {
  let r = $('#receipt'); if (!r) { r = document.createElement('div'); r.id = 'receipt'; document.body.appendChild(r); }
  r.innerHTML = `<div style="text-align:center"><b>${esc(S.boot.settings.shop_name)}</b><br>${dateOf(o.closed_at)} ${timeOf(o.closed_at)} · #${o.id}</div>
    ${o.plate ? `<div>Mashina: ${plateFmt(o.plate)} ${esc(o.model || '')} · ${km(o.mileage)}</div><div>Keyingi almashtirish: ${km(o.next_mileage)}</div>` : ''}<hr>
    ${o.items.map(i => `<div>${esc(i.name)}<br>&nbsp; ${qtyFmt(i.qty)} × ${fmt(i.price)} = ${i.is_bonus ? 'BONUS' : fmt(i.qty * i.price)}</div>`).join('')}<hr>
    ${o.discount ? `<div>Chegirma: −${fmt(o.discount)}</div>` : ''}${o.cashback_used ? `<div>Keshbekdan: −${fmt(o.cashback_used)}</div>` : ''}
    <div><b>JAMI: ${fmt(o.total)} so'm</b></div>${o.cashback_earned ? `<div>Keshbek: +${fmt(o.cashback_earned)} (balans ${fmt(o.customer_cashback)})</div>` : ''}
    <div style="text-align:center">Rahmat!</div>`;
  window.print();
}

VIEWS.sotuv = async () => {
  const items = [];
  let customer = null;
  $('#app').innerHTML = `<div class="grid g2" style="grid-template-columns:3fr 2fr">
    <div class="card"><div class="row"><h3 class="sp">Oddiy sotuv</h3><button class="btn p" id="add">+ Mahsulot</button></div>
      <input id="bc" placeholder="Shtrix-kod skaner yoki nom bilan qidirish (Enter)" style="margin-bottom:10px"><div id="it"></div></div>
    <div class="card"><h3>Mijoz (ixtiyoriy — keshbek uchun)</h3>
      <div class="row"><input id="ph" class="sp" type="tel" placeholder="Telefon yoki mashina raqami"><button class="btn" id="find">Topish</button></div>
      <div id="cinfo" class="small muted" style="margin:8px 0 12px">Mijozsiz sotuv</div>${payBlock()}
      <button class="btn ok lg" id="pay" style="width:100%;margin-top:12px">To'landi ✓</button></div></div>`;
  let subtotal = 0;
  const recalc = () => payCalc($('#app'), subtotal, customer?.cashback || 0, !!customer);
  const ed = itemsEditor($('#it'), items, t => { subtotal = t; recalc(); }, { showCost: true });
  $('#app').oninput = e => { if (['disc', 'cb'].includes(e.target.id)) recalc(); };
  $('#add').onclick = () => pickProduct(p => ed.add(p));
  $('#bc').onkeydown = e => {
    if (e.key !== 'Enter') return; const q = e.target.value.trim(); if (!q) return;
    const exact = S.boot.products.find(p => p.active && p.barcode && p.barcode === q);
    if (exact) { ed.add(exact); e.target.value = ''; return; }
    const hits = S.boot.products.filter(p => p.active && p.name.toLowerCase().includes(q.toLowerCase()));
    if (hits.length === 1) { ed.add(hits[0]); e.target.value = ''; } else pickProduct(p => { ed.add(p); e.target.value = ''; });
  };
  $('#find').onclick = safe(async () => {
    const q = $('#ph').value.trim(); if (!q) return;
    const list = await GET('customers?q=' + encodeURIComponent(q.replace(/^\+?998/, '')));
    if (!list.length) { customer = { new: true, phone: q, cashback: 0 }; $('#cinfo').innerHTML = `Yangi mijoz sifatida saqlanadi: <b>${esc(q)}</b>`; }
    else { customer = list[0]; $('#cinfo').innerHTML = `<b>${esc(customer.name || '—')}</b> ${phoneShow(customer.phone)} · ${(customer.plates || '').split(', ').map(plateFmt).join(', ')}<br>Keshbek: <b class="pos">${sum(customer.cashback)}</b>`; }
    recalc();
  });
  $('#pay').onclick = safe(async () => {
    if (!items.length) throw new Error('Mahsulot qo\'shing');
    const { tot } = recalc();
    const body = { type: 'sotuv', items: itemsPayload(items), close: payPayload($('#app'), tot) };
    if (customer?.new) body.phone = customer.phone; else if (customer) body.customer_id = customer.id;
    const o = await POST('orders', body);
    toast(`Sotildi: ${sum(o.total)}`); offerReceipt(o); render();
  });
  recalc(); $('#bc').focus();
};

function periodBar(id, def = 'month') {
  const d = new Date(), y = d.getFullYear(), mo = d.getMonth();
  const presets = {
    today: ['Bugun', today(), today()],
    h1: ['1–15', ymd(new Date(y, mo, 1)), ymd(new Date(y, mo, 15))],
    h2: ['16–oxiri', ymd(new Date(y, mo, 16)), ymd(new Date(y, mo + 1, 0))],
    month: ['Shu oy', ymd(new Date(y, mo, 1)), ymd(new Date(y, mo + 1, 0))],
    ph1: ["O'tgan oy 1–15", ymd(new Date(y, mo - 1, 1)), ymd(new Date(y, mo - 1, 15))],
    ph2: ["O'tgan oy 16–oxiri", ymd(new Date(y, mo - 1, 16)), ymd(new Date(y, mo, 0))],
    pmonth: ["O'tgan oy", ymd(new Date(y, mo - 1, 1)), ymd(new Date(y, mo, 0))],
  };
  const cur = S.ctx[id] || { from: presets[def][1], to: presets[def][2] };
  S.ctx[id] = cur;
  const html = `<div class="card row"><div class="chips">${Object.entries(presets).map(([k, [n, f, t]]) => `<span class="chip ${cur.from === f && cur.to === t ? 'on' : ''}" data-f="${f}" data-t="${t}">${n}</span>`).join('')}</div>
    <span class="sp"></span><input type="date" id="pf" value="${cur.from}" style="width:auto"><span>—</span><input type="date" id="pt" value="${cur.to}" style="width:auto"></div>`;
  const bind = () => {
    $$('[data-f]').forEach(c => c.onclick = () => { S.ctx[id] = { from: c.dataset.f, to: c.dataset.t }; render(); });
    $('#pf').onchange = $('#pt').onchange = () => { S.ctx[id] = { from: $('#pf').value, to: $('#pt').value }; render(); };
  };
  return { html, bind, q: `from=${cur.from}&to=${cur.to}`, ...cur };
}

VIEWS.tarix = async () => {
  const pb = periodBar('tarixP', 'today');
  const list = await GET('orders?status=yopilgan&' + pb.q);
  const tot = list.reduce((a, o) => a + o.total, 0);
  $('#app').innerHTML = `${pb.html}<div class="card"><h3>Yopilgan zakazlar: ${list.length} ta · ${sum(tot)}</h3>
    ${list.length ? `<div class="tbl-wrap"><table><thead><tr><th>#</th><th>Vaqt</th><th>Turi</th><th>Raqam / mijoz</th><th>Usta</th><th>Tarkib</th><th class="num">Naqd</th><th class="num">Karta</th><th class="num">Jami</th><th class="num">Foyda</th><th></th></tr></thead><tbody>
    ${list.map(o => `<tr><td>${o.id}</td><td>${dateOf(o.closed_at)} ${timeOf(o.closed_at)}</td><td>${o.type === 'zamena' ? 'Zamena' : 'Sotuv'}</td>
      <td><b>${plateFmt(o.plate || '')}</b> ${esc(o.customer_name || '')}</td><td>${esc(o.master_name || '')}</td><td class="small">${orderLine(o)}</td>
      <td class="num">${fmt(o.paid_cash)}</td><td class="num">${fmt(o.paid_card)}</td><td class="num"><b>${fmt(o.total)}</b></td>
      <td class="num ${o.total - o.cost < 0 ? 'neg' : 'pos'}">${fmt(o.total - o.cost)}</td><td><button class="btn sm" data-pr="${o.id}">Chek</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Yo\'q</div>'}</div>`;
  pb.bind();
  $$('[data-pr]').forEach(b => b.onclick = safe(async () => printReceipt(await GET('orders/' + b.dataset.pr))));
};

VIEWS.mahsulot = async () => {
  const ps = S.boot.products;
  const f = S.ctx.cat || '';
  const val = ps.filter(p => p.category !== 'xizmat').reduce((a, p) => a + Math.max(p.stock, 0) * p.cost, 0);
  $('#app').innerHTML = `<div class="row"><h2 class="sp">Ombor · qoldiq tannarxi ${sum(val)}</h2>
    <button class="btn" id="moves">Harakatlar</button><button class="btn" id="pur">+ Prixod (kirim)</button><button class="btn p" id="new">+ Yangi mahsulot</button></div>
    <div class="card"><div class="row" style="margin-bottom:10px"><div class="chips">${[['', 'Hammasi'], ...Object.entries(CATS)].map(([k, v]) => `<span class="chip ${k === f ? 'on' : ''}" data-c="${k}">${v}</span>`).join('')}</div>
      <span class="sp"></span><input id="q" placeholder="Qidirish" style="max-width:260px" value="${esc(S.ctx.q || '')}"></div>
    <div class="tbl-wrap"><table><thead><tr><th>Nomi</th><th>Kategoriya</th><th class="num">Qoldiq</th><th class="num">Tannarx</th><th class="num">Narx</th><th class="num">Ustama</th><th></th></tr></thead><tbody id="tb"></tbody></table></div></div>`;
  const draw = () => {
    const q = $('#q').value.toLowerCase();
    $('#tb').innerHTML = ps.filter(p => (!f || p.category === f) && (!q || p.name.toLowerCase().includes(q))).map(p => {
      const mg = p.price - p.cost;
      return `<tr class="click" data-id="${p.id}" style="${p.active ? '' : 'opacity:.5'}"><td><div class="row" style="flex-wrap:nowrap">${p.category === 'moy' ? oilImg(p, 'sm') : ''}<div>${esc(p.name)}${p.grade ? ` <span class="tag moy">${esc(p.grade)}</span>` : ''}${(p.bonus_kinds || []).length ? ' <span class="tag bonus">🎁 bonus filtr</span>' : ''}${p.barcode ? `<div class="muted small">${esc(p.barcode)}</div>` : ''}${p.models?.length ? `<div class="muted small">Mos: ${esc(p.models.join(', '))}</div>` : ''}</div></div></td>
      <td><span class="tag ${p.category}">${CATS[p.category]}</span></td><td class="num ${p.stock <= 0 && p.category !== 'xizmat' ? 'neg' : ''}">${p.category === 'xizmat' ? '—' : qtyFmt(p.stock) + ' ' + esc(p.unit)}</td>
      <td class="num">${fmt(p.cost)}</td><td class="num"><b>${fmt(p.price)}</b></td><td class="num ${mg < 0 ? 'neg' : 'pos'}">${fmt(mg)}</td><td class="num">›</td></tr>`;
    }).join('');
  };
  draw();
  $('#q').oninput = () => { S.ctx.q = $('#q').value; draw(); };
  $$('[data-c]').forEach(c => c.onclick = () => { S.ctx.cat = c.dataset.c; render(); });
  $('#tb').onclick = e => { const tr = e.target.closest('tr'); if (tr) productForm(prod(tr.dataset.id)); };
  $('#new').onclick = () => productForm(null);
  $('#pur').onclick = purchaseForm;
  $('#moves').onclick = safe(async () => {
    const mv = await GET('stock_moves');
    modal('Ombor harakatlari', `<div class="tbl-wrap"><table><thead><tr><th>Sana</th><th>Mahsulot</th><th>Turi</th><th class="num">Miqdor</th><th>Asos</th></tr></thead><tbody>
      ${mv.map(x => `<tr><td>${dateOf(x.created_at)} ${timeOf(x.created_at)}</td><td>${esc(x.name)}</td><td>${esc(x.kind)}</td><td class="num ${x.qty < 0 ? 'neg' : 'pos'}">${x.qty > 0 ? '+' : ''}${qtyFmt(x.qty)} ${esc(x.unit)}</td><td class="small">${esc(x.ref)}</td></tr>`).join('')}</tbody></table></div>`, { wide: true });
  });
};

// Rasmni planshet/telefon uchun kichraytiradi (JPEG, eng uzun tomoni 600px)
function readImage(file, max = 600) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Faylni o'qib bo'lmadi"));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Bu rasmni o'qib bo'lmadi (JPG yoki PNG tanlang)"));
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

function productForm(p) {
  const sel = new Set(p?.models || []);
  const bonus = new Set(p?.bonus_kinds || []);
  let image; // undefined — o'zgarmagan, '' — o'chirilgan, data: — yangi rasm
  const m = modal(p ? 'Mahsulot' : 'Yangi mahsulot', `
    <div class="pform"><div class="pimg"><div id="pv"></div>
        <label class="btn sm" style="display:inline-flex;align-items:center;margin-top:8px">📷 Rasm yuklash<input id="img" type="file" accept="image/*" hidden></label>
        <button class="btn sm bad" id="rmimg" type="button" style="margin-top:8px">O'chirish</button></div>
      <div class="sp" style="min-width:0">
        <label class="f"><span>Nomi (firma va turi bilan, masalan «Mobil Super 3000 5W-40»)</span><input id="n" value="${esc(p?.name || '')}"></label>
        <div class="grid g3"><label class="f"><span>Kategoriya</span><select id="c">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${p?.category === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        <label class="f"><span>Turi</span><select id="k"></select></label>
        <label class="f" id="gwrap"><span>Yopishqoqlik</span><input id="gr" list="grades" placeholder="5W-30" value="${esc(p?.grade || '')}"></label>
        <label class="f"><span>O'lchov</span><select id="u">${['dona', 'litr', 'komplekt'].map(u => `<option ${p?.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
        <label class="f"><span>Tannarx (kelish narxi)</span><input id="co" type="number" value="${p?.cost ?? ''}"></label>
        <label class="f"><span>Sotuv narxi${p?.unit === 'litr' ? ' (1 litr)' : ''}</span><input id="pr" type="number" value="${p?.price ?? ''}"></label>
        <label class="f"><span>Shtrix-kod</span><input id="b" value="${esc(p?.barcode || '')}"></label>
        ${p ? `<label class="f"><span>Holat</span><select id="a"><option value="1">Faol</option><option value="0" ${p.active ? '' : 'selected'}>Arxiv</option></select></label>` : `<label class="f"><span>Boshlang'ich qoldiq</span><input id="st" type="number" value="0"></label>`}</div>
      </div></div>
    <datalist id="grades">${['0W-20', '0W-30', '5W-20', '5W-30', '5W-40', '10W-30', '10W-40', '15W-40', '20W-50'].map(x => `<option>${x}</option>`).join('')}</datalist>
    <div id="bwrap" class="sum-box" style="margin-bottom:12px"><b>🎁 Shu moy bilan tekin beriladigan filtr</b>
      <div class="chips" id="bk" style="margin-top:10px"></div>
      <p class="small muted">Belgilansa, planshetda shu moy tanlanganda o'sha filtrdan 1 tasi avtomatik «bonus» (tekin) bo'ladi. Tannarxi moy foydasidan qoplanadi.</p></div>
    <div id="mwrap" class="sum-box" style="margin-bottom:12px"><div class="row"><b class="sp">Qaysi mashinalarga mos</b><input id="nmod" placeholder="+ boshqa model (Enter)" style="max-width:240px"></div>
      <div class="chips" id="mods" style="margin-top:10px"></div>
      <p class="small muted">Chevrolet va Damas uchun planshetda faqat shu belgilangan filtrlar chiqadi (2–3 firma bo'lishi mumkin). Xitoy mashinalarida sotuvchi filtrni qo'lda tanlaydi.</p></div>
    <div class="row end"><button class="btn p" id="sv" type="button">Saqlash</button></div>`, { wide: true });
  const preview = () => {
    const src = image === undefined ? p?.image_url : image;
    $('#pv', m.el).innerHTML = src ? `<img class="oimg xl" src="${esc(src)}" alt="">` : `<span class="oimg ph xl"><b>Rasm yo'q</b></span>`;
    $('#rmimg', m.el).hidden = !src;
  };
  const kindSel = () => {
    const c = $('#c', m.el).value, ks = KINDS[c] || [];
    const cur = $('#k', m.el).value || p?.kind || '';
    $('#k', m.el).innerHTML = `<option value="">—</option>` + ks.map(([k, v]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${v}</option>`).join('');
    $('#k', m.el).disabled = !ks.length;
    const motor = c === 'moy' && $('#k', m.el).value !== 'karobka';
    $('#gwrap', m.el).hidden = !motor;
    $('#bwrap', m.el).hidden = !motor;
    $('#mwrap', m.el).hidden = c !== 'filtr';
  };
  const drawChips = () => {
    const names = [...new Set([...S.boot.car_models.map(x => x.name), ...sel])];
    $('#mods', m.el).innerHTML = names.map(n => `<span class="chip ${sel.has(n) ? 'on' : ''}" data-m="${esc(n)}">${esc(n)}</span>`).join('');
    $('#bk', m.el).innerHTML = FILTERS.map(([k, v]) => `<span class="chip ${bonus.has(k) ? 'on' : ''}" data-bk="${k}">${bonus.has(k) ? '✓ ' : ''}${v}</span>`).join('');
  };
  $('#c', m.el).onchange = kindSel; $('#k', m.el).onchange = kindSel;
  $('#mods', m.el).onclick = e => { const c = e.target.closest('[data-m]'); if (!c) return; const n = c.dataset.m; sel.has(n) ? sel.delete(n) : sel.add(n); drawChips(); };
  $('#bk', m.el).onclick = e => { const c = e.target.closest('[data-bk]'); if (!c) return; const k = c.dataset.bk; bonus.has(k) ? bonus.delete(k) : bonus.add(k); drawChips(); };
  $('#nmod', m.el).onkeydown = e => { if (e.key !== 'Enter') return; const v = e.target.value.trim(); if (v) { sel.add(v); e.target.value = ''; drawChips(); } };
  $('#img', m.el).onchange = safe(async e => { const f = e.target.files[0]; if (!f) return; image = await readImage(f); preview(); });
  $('#rmimg', m.el).onclick = () => { image = ''; preview(); };
  kindSel(); drawChips(); preview();
  $('#sv', m.el).onclick = safe(async () => {
    const cat = $('#c', m.el).value, kind = $('#k', m.el).value;
    const motor = cat === 'moy' && kind !== 'karobka';
    const b = { name: $('#n', m.el).value, category: cat, kind, unit: $('#u', m.el).value, barcode: $('#b', m.el).value, cost: $('#co', m.el).value, price: $('#pr', m.el).value,
      active: p ? +$('#a', m.el).value : 1, stock: p ? undefined : $('#st', m.el).value, models: cat === 'filtr' ? [...sel] : [],
      grade: motor ? $('#gr', m.el).value : '', bonus_kinds: motor ? [...bonus] : [] };
    if (image !== undefined) b.image = image;
    if (cat === 'filtr' && !kind) throw new Error("Filtr turini tanlang (moy / havo / salon / reduktor / yoqilg'i)");
    p ? await PUT('products/' + p.id, b) : await POST('products', b);
    await reloadBoot(); m.close(); toast('Saqlandi'); render();
  });
}

function purchaseForm() {
  const lines = [];
  const m = modal('Prixod — tovar kirimi', `<label class="f"><span>Yetkazib beruvchi / izoh</span><input id="sup"></label>
    <div id="pl"></div><div class="row" style="margin-top:10px"><button class="btn" id="add">+ Mahsulot</button><span class="sp"></span><b id="pt"></b><button class="btn p" id="sv">Kirim qilish</button></div>
    <p class="small muted">Tannarx o'rtacha (o'rtacha tortilgan) usulda yangilanadi.</p>`, { wide: true });
  const draw = () => {
    $('#pl', m.el).innerHTML = `<table><thead><tr><th>Mahsulot</th><th>Miqdor</th><th>Kelish narxi (1 birlik)</th><th>Yangi sotuv narxi</th><th class="num">Summa</th><th></th></tr></thead><tbody>
      ${lines.map((l, i) => `<tr data-i="${i}"><td>${esc(l.name)}</td><td><input class="inl" type="number" step="0.1" data-k="qty" value="${l.qty}"></td>
      <td><input class="inl" type="number" data-k="cost" value="${l.cost}"></td><td><input class="inl" type="number" data-k="price" value="${l.price}"></td>
      <td class="num">${fmt(l.qty * l.cost)}</td><td><button class="btn sm bad" data-del>×</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Mahsulot qo\'shing</td></tr>'}</tbody></table>`;
    $('#pt', m.el).textContent = sum(lines.reduce((a, l) => a + l.qty * l.cost, 0));
  };
  $('#pl', m.el).onchange = e => { const tr = e.target.closest('tr[data-i]'); if (!tr) return; lines[tr.dataset.i][e.target.dataset.k] = +e.target.value; draw(); };
  $('#pl', m.el).onclick = e => { if (e.target.closest('[data-del]')) { lines.splice(e.target.closest('tr').dataset.i, 1); draw(); } };
  $('#add', m.el).onclick = () => pickProduct(p => { lines.push({ product_id: p.id, name: p.name, qty: 1, cost: p.cost, price: p.price }); draw(); });
  $('#sv', m.el).onclick = safe(async () => {
    if (!lines.length) throw new Error('Mahsulot yo\'q');
    await POST('purchases', { supplier: $('#sup', m.el).value, items: lines });
    await reloadBoot(); m.close(); toast('Kirim qilindi'); render();
  });
  draw();
}

VIEWS.mijoz = async () => {
  const list = await GET('customers?q=' + encodeURIComponent(S.ctx.q || ''));
  const totalCb = list.reduce((a, c) => a + c.cashback, 0);
  $('#app').innerHTML = `<div class="row"><h2 class="sp">Mijozlar</h2><span class="muted">Ro'yxatdagi keshbek qarzi: <b>${sum(totalCb)}</b></span></div>
    <div class="card"><form id="sf" class="row" style="margin-bottom:10px"><input id="q" class="sp" placeholder="Ism, telefon yoki mashina raqami" value="${esc(S.ctx.q || '')}"><button class="btn">Qidirish</button></form>
    <div class="tbl-wrap"><table><thead><tr><th>Ism</th><th>Telefon</th><th>Mashinalar</th><th class="num">Tashrif</th><th class="num">Xarid</th><th class="num">Keshbek</th></tr></thead><tbody>
    ${list.map(c => `<tr class="click" data-id="${c.id}"><td>${esc(c.name || '—')}</td><td>${phoneShow(c.phone)}</td><td>${(c.plates || '').split(', ').map(plateFmt).join(', ')}</td><td class="num">${c.visits}</td><td class="num">${fmt(c.spent)}</td><td class="num pos"><b>${fmt(c.cashback)}</b></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Topilmadi</td></tr>'}</tbody></table></div></div>`;
  $('#sf').onsubmit = e => { e.preventDefault(); S.ctx.q = $('#q').value; render(); };
  $$('tr[data-id]').forEach(tr => tr.onclick = safe(() => customerCard(tr.dataset.id)));
};

async function customerCard(id) {
  const c = await GET('customers/' + id);
  const m = modal(c.name || c.phone || 'Mijoz', `
    <div class="grid g3"><label class="f"><span>Ism</span><input id="n" value="${esc(c.name)}"></label><label class="f"><span>Telefon</span><input id="p" value="${esc(c.phone)}"></label>
    <div class="stat"><div class="label">Keshbek balansi</div><div class="big pos">${sum(c.cashback)}</div></div></div>
    <label class="f"><span>Izoh</span><input id="no" value="${esc(c.note || '')}"></label>
    <div class="row end"><button class="btn" id="adj">Keshbekni qo'lda o'zgartirish</button><button class="btn p" id="sv">Saqlash</button></div>
    <h3 style="margin-top:14px">Mashinalar</h3><div>${c.cars.map(x => `<span class="tag boshqa" style="font-size:14px;margin-right:6px">${plateFmt(x.plate)} · ${carDesc(x)} · ${km(x.last_mileage)}</span>`).join('') || '—'}</div>
    <h3 style="margin-top:14px">Xaridlar</h3><div class="tbl-wrap"><table><tbody>${c.orders.map(o => `<tr><td>${dateOf(o.created_at)}</td><td>${esc(o.plate || 'sotuv')}</td><td>${km(o.mileage)}</td><td><span class="tag ${o.status}">${STATUS[o.status]}</span></td><td class="num">${fmt(o.total)}</td><td class="num pos">${o.cashback_earned ? '+' + fmt(o.cashback_earned) : ''}</td></tr>`).join('') || '<tr><td class="empty">Yo\'q</td></tr>'}</tbody></table></div>
    <h3 style="margin-top:14px">Keshbek harakati</h3><table><tbody>${c.cashback_tx.map(t => `<tr><td>${dateOf(t.created_at)}</td><td>${esc(t.kind)}</td><td class="num ${t.amount < 0 ? 'neg' : 'pos'}">${t.amount > 0 ? '+' : ''}${fmt(t.amount)}</td></tr>`).join('') || '<tr><td class="empty">Yo\'q</td></tr>'}</tbody></table>`, { wide: true });
  $('#sv', m.el).onclick = safe(async () => { await PUT('customers/' + id, { name: $('#n', m.el).value, phone: $('#p', m.el).value, note: $('#no', m.el).value }); m.close(); toast('Saqlandi'); render(); });
  $('#adj', m.el).onclick = safe(async () => {
    const v = prompt("Qancha qo'shish (manfiy — ayirish), so'm:"); if (!v || isNaN(+v)) return;
    await POST(`customers/${id}/cashback`, { amount: +v }); m.close(); customerCard(id);
  });
}

VIEWS.inventar = async () => {
  if (S.ctx.inv) return inventoryView(S.ctx.inv);
  const list = await GET('inventories');
  $('#app').innerHTML = `<div class="row"><h2 class="sp">Inventarizatsiya (oyda 1 marta)</h2><button class="btn p" id="new">+ Yangi inventarizatsiya</button></div>
    <div class="card"><table><thead><tr><th>#</th><th>Boshlandi</th><th>Yopildi</th><th>Holat</th><th class="num">Pozitsiya</th></tr></thead><tbody>
    ${list.map(i => `<tr class="click" data-id="${i.id}"><td>${i.id}</td><td>${dateOf(i.created_at)} ${timeOf(i.created_at)}</td><td>${dateOf(i.closed_at)}</td><td>${i.status}</td><td class="num">${i.n}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Hali o\'tkazilmagan</td></tr>'}</tbody></table></div>`;
  $('#new').onclick = safe(async () => { const inv = await POST('inventories', {}); S.ctx.inv = inv.id; render(); });
  $$('tr[data-id]').forEach(tr => tr.onclick = () => { S.ctx.inv = +tr.dataset.id; render(); });
};

async function inventoryView(id) {
  const inv = await GET('inventories/' + id);
  const open = inv.status === 'ochiq';
  const base = it => open ? it.current_stock : it.expected;
  const draw = () => {
    let plus = 0, minus = 0, counted = 0;
    inv.items.forEach(it => {
      if (it.actual == null || it.actual === '') return; counted++;
      const d = (+it.actual - base(it)) * it.cost; if (d > 0) plus += d; else minus += d;
    });
    $('#sumv').innerHTML = `Sanaldi: <b>${counted}/${inv.items.length}</b> · Ortiqcha: <b class="pos">${sum(plus)}</b> · Kamomad: <b class="neg">${sum(minus)}</b> · Farq: <b>${sum(plus + minus)}</b>`;
  };
  $('#app').innerHTML = `<div class="row"><button class="btn" id="back">‹ Ro'yxat</button><h2 class="sp" style="margin:0">Inventarizatsiya #${id} — ${open ? 'ochiq' : 'yopilgan'}</h2>
    ${open ? '<button class="btn" id="sv">Saqlash</button><button class="btn ok" id="cl">Yakunlash va qoldiqni to\'g\'rilash</button>' : ''}</div>
    <div class="card"><div id="sumv" style="margin-bottom:10px"></div><input id="q" placeholder="Qidirish" style="margin-bottom:10px">
    <div class="tbl-wrap"><table><thead><tr><th>Mahsulot</th><th class="num">Tizimda</th><th style="width:140px">Haqiqiy (sanalgan)</th><th class="num">Farq</th><th class="num">Farq summasi</th></tr></thead><tbody>
    ${inv.items.map((it, i) => `<tr data-i="${i}" data-n="${esc(it.name.toLowerCase())}"><td><span class="tag ${it.category}">${CATS[it.category]}</span> ${esc(it.name)}</td><td class="num">${qtyFmt(base(it))} ${esc(it.unit)}</td>
      <td>${open ? `<input class="inl" type="number" step="0.1" value="${it.actual ?? ''}">` : qtyFmt(it.actual ?? '—')}</td><td class="num d"></td><td class="num ds"></td></tr>`).join('')}</tbody></table></div>
    ${open ? '<p class="small muted">«Tizimda» — hozirgi qoldiq (inventar paytidagi sotuvlar hisobga olingan). Bo\'sh qoldirilgan qatorlar o\'zgarmaydi.</p>' : ''}</div>`;
  const rowDiff = tr => {
    const it = inv.items[tr.dataset.i]; if (it.actual == null || it.actual === '') { $('.d', tr).textContent = ''; $('.ds', tr).textContent = ''; return; }
    const d = +it.actual - base(it); $('.d', tr).textContent = (d > 0 ? '+' : '') + qtyFmt(d); $('.d', tr).className = 'num d ' + (d < 0 ? 'neg' : d > 0 ? 'pos' : '');
    $('.ds', tr).textContent = fmt(d * it.cost); $('.ds', tr).className = 'num ds ' + (d < 0 ? 'neg' : d > 0 ? 'pos' : '');
  };
  $$('tr[data-i]').forEach(rowDiff); draw();
  $('#back').onclick = () => { S.ctx.inv = null; render(); };
  $('#q').oninput = e => $$('tr[data-n]').forEach(tr => tr.hidden = !tr.dataset.n.includes(e.target.value.toLowerCase()));
  if (!open) return;
  $('#app').oninput = e => { const tr = e.target.closest('tr[data-i]'); if (!tr) return; inv.items[tr.dataset.i].actual = e.target.value; rowDiff(tr); draw(); };
  const save = () => PUT('inventories/' + id, { items: inv.items.map(it => ({ product_id: it.product_id, actual: it.actual })) });
  $('#sv').onclick = safe(async () => { await save(); toast('Saqlandi'); });
  $('#cl').onclick = safe(async () => {
    if (!(await confirmBox('Inventarizatsiya yakunlansinmi? Ombor qoldiqlari sanalgan miqdorga to\'g\'rilanadi.'))) return;
    await save(); await POST(`inventories/${id}/close`); await reloadBoot(); toast('Yakunlandi'); render();
  });
}

VIEWS.hisobot = async () => {
  const pb = periodBar('hisP', 'month');
  const r = await GET('reports/profit?' + pb.q);
  const h = r.head;
  const cat = k => r.categories.find(c => c.cat === k) || { qty: 0, revenue: 0, cost: 0, profit: 0 };
  const card = (label, v, cls = '', sub = '') => `<div class="card stat"><div class="label">${label}</div><div class="big ${cls}">${fmt(v)}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>`;
  const sign = v => v < 0 ? 'neg' : 'pos';
  $('#app').innerHTML = `${pb.html}
    <div class="grid g4">${card('Tushum (naqd + karta)', h.revenue, '', `naqd ${fmt(h.cash)} · karta ${fmt(h.card)}`)}${card('Zakazlar', h.orders, '', `zamena ${h.zamena || 0} · sotuv ${h.sotuv || 0}`)}
      ${card('Yalpi foyda', r.gross_profit, sign(r.gross_profit), 'tushum − tannarx')}${card('Sof foyda', r.net_profit, sign(r.net_profit), 'KPI, oylik va xarajatlardan keyin')}</div>
    <div class="grid g2">
    <div class="card"><h3>Foyda qayerdan keldi</h3><table><tbody>
      <tr><td>Moy foydasi</td><td class="num">${qtyFmt(cat('moy').qty)} L</td><td class="num ${sign(r.oil_profit)}"><b>${fmt(r.oil_profit)}</b></td></tr>
      <tr><td>Filtrlar (foyda / zarar)</td><td class="num">${qtyFmt(cat('filtr').qty)} ta</td><td class="num ${sign(r.filter_profit)}"><b>${fmt(r.filter_profit)}</b></td></tr>
      <tr><td>Bonus (tekin berilgan) tannarxi</td><td class="num">${qtyFmt(cat('bonus').qty)}</td><td class="num neg"><b>−${fmt(r.bonus_cost)}</b></td></tr>
      <tr><td>Boshqa / xizmat</td><td></td><td class="num ${sign(r.other_profit - 0)}"><b>${fmt(r.other_profit)}</b></td></tr>
      <tr><td class="small muted" colspan="3">«Boshqa» ichida chegirma (−${fmt(h.discount)}) va keshbekdan to'lov (−${fmt(h.cashback_used)}) ham hisobga olingan.</td></tr>
      <tr><td><b>Yalpi foyda</b></td><td></td><td class="num"><b>${fmt(r.gross_profit)}</b></td></tr>
      <tr><td>Usta / sotuvchi KPI</td><td></td><td class="num neg">−${fmt(r.kpi_total)}</td></tr>
      <tr><td>Oylik (asosiy maosh ulushi)</td><td></td><td class="num neg">−${fmt(r.salary_total)}</td></tr>
      <tr><td>Boshqa xarajatlar</td><td></td><td class="num neg">−${fmt(r.expenses)}</td></tr>
      <tr><td><b>Sof foyda</b></td><td></td><td class="num ${sign(r.net_profit)}"><b>${fmt(r.net_profit)}</b></td></tr></tbody></table>
      <div class="sum-box small" style="margin-top:10px">Moy foydasi filtr zarari va bonuslarni qoplaydimi: <b class="${r.oil_profit + Math.min(r.filter_profit, 0) - r.bonus_cost >= 0 ? 'pos' : 'neg'}">${fmt(r.oil_profit + Math.min(r.filter_profit, 0) - r.bonus_cost)}</b> qoladi.<br>
      Berilgan keshbek: ${fmt(h.cashback_earned)} · Mijozlardagi jami keshbek (qarz): ${fmt(r.cashback_liability)}</div></div>
    <div class="card"><div class="row"><h3 class="sp">Xarajatlar</h3><button class="btn sm" id="addx">+ Xarajat</button></div><div id="xl" class="small"></div></div></div>
    <div class="card"><h3>Mahsulotlar bo'yicha</h3><div class="tbl-wrap"><table><thead><tr><th>Mahsulot</th><th class="num">Miqdor</th><th class="num">Bonus</th><th class="num">Tushum</th><th class="num">Tannarx</th><th class="num">Foyda</th></tr></thead><tbody>
      ${r.products.map(p => `<tr><td><span class="tag ${p.category}">${CATS[p.category]}</span> ${esc(p.name)}</td><td class="num">${qtyFmt(p.qty)}</td><td class="num">${p.bonus_lines || ''}</td><td class="num">${fmt(p.revenue)}</td><td class="num">${fmt(p.cost)}</td><td class="num ${sign(p.profit)}"><b>${fmt(p.profit)}</b></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Sotuv yo\'q</td></tr>'}</tbody></table></div></div>`;
  pb.bind();
  const xs = await GET('expenses?' + pb.q);
  $('#xl').innerHTML = xs.map(x => `<div class="row"><span>${dateOf(x.created_at)}</span><span class="sp">${esc(x.title)}</span><b>${fmt(x.amount)}</b></div>`).join('') || '<div class="muted">Ijara, svet, va h.k. shu yerga</div>';
  $('#addx').onclick = () => {
    const m = modal('Xarajat', `<label class="f"><span>Nima uchun</span><input id="t"></label><label class="f"><span>Summa</span><input id="a" type="number"></label><div class="row end"><button class="btn p" id="sv">Saqlash</button></div>`);
    $('#sv', m.el).onclick = safe(async () => { await POST('expenses', { title: $('#t', m.el).value, amount: $('#a', m.el).value }); m.close(); render(); });
  };
};

VIEWS.oylik = async () => {
  const d = new Date().getDate();
  const pb = periodBar('oyP', d <= 15 ? 'h1' : 'h2');
  const r = await GET('reports/payroll?' + pb.q);
  const s = S.boot.settings;
  $('#app').innerHTML = `${pb.html}
    <div class="card"><h3>Oylik va KPI: ${dateOf(r.from)} — ${dateOf(r.to)}</h3>
    <p class="small muted">Har oyning 15-sanasi (1–15) va oxirgi kuni (16–30/31) to'lanadi. KPI: usta — mashina boshiga ${fmt(s.master_kpi_per_car)} + foydadan ${s.master_kpi_percent}%,
      zamena sotuvchisi — mashina boshiga ${fmt(s.seller_kpi_per_car)} + ${s.seller_kpi_percent}%, kassir — foydadan ${s.cashier_kpi_percent}%. (Sozlamalarda o'zgartiriladi.)</p>
    <div class="tbl-wrap"><table><thead><tr><th>Xodim</th><th>Lavozim</th><th class="num">Mashina</th><th class="num">Moy (L)</th><th class="num">Keltirgan foyda</th><th class="num">KPI</th><th class="num">Asosiy maosh</th><th class="num">Jami</th><th class="num">To'langan</th><th class="num">Qoldi</th><th></th></tr></thead><tbody>
    ${r.rows.map(x => `<tr><td><b>${esc(x.employee.name)}</b></td><td>${ROLES[x.employee.role]}</td><td class="num">${x.cars}</td><td class="num">${qtyFmt(x.oil)}</td>
      <td class="num">${fmt(x.profit)}</td><td class="num"><b>${fmt(x.kpi)}</b></td><td class="num">${fmt(x.base)}</td><td class="num"><b>${fmt(x.total)}</b></td>
      <td class="num">${fmt(x.paid)}</td><td class="num ${x.due > 0 ? 'neg' : ''}"><b>${fmt(x.due)}</b></td>
      <td>${x.due > 0 ? `<button class="btn sm ok" data-pay="${x.employee.id}" data-a="${x.due}">To'lash</button>` : '<span class="tag tayyor">✓</span>'}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="5"><b>Jami</b></td><td class="num"><b>${fmt(r.kpi_total)}</b></td><td class="num"><b>${fmt(r.salary_total)}</b></td><td class="num"><b>${fmt(r.kpi_total + r.salary_total)}</b></td><td colspan="3"></td></tr></tfoot></table></div></div>`;
  pb.bind();
  $$('[data-pay]').forEach(b => b.onclick = safe(async () => {
    const e = emp(b.dataset.pay);
    const v = prompt(`${e.name} ga to'lanadigan summa:`, b.dataset.a); if (!v || isNaN(+v)) return;
    await POST('salary', { employee_id: e.id, period_from: r.from, period_to: r.to, amount: +v }); toast("To'lov yozildi"); render();
  }));
};

VIEWS.xodim = async () => {
  const list = await GET('employees');
  $('#app').innerHTML = `<div class="row"><h2 class="sp">Xodimlar</h2><button class="btn p" id="new" type="button">+ Xodim</button></div>
    <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Ism</th><th>Lavozim</th><th>Login</th><th>Telefon</th><th class="num">Oylik maosh (oyiga)</th><th>Holat</th></tr></thead><tbody>
    ${list.map(e => `<tr class="click" data-id="${e.id}"><td><b>${esc(e.name)}</b></td><td>${ROLES[e.role] || e.role}</td><td>${e.login ? esc(e.login) + (e.has_password ? '' : ' <span class="neg small">parol yo\'q</span>') : '<span class="muted">—</span>'}</td>
      <td>${esc(e.phone)}</td><td class="num">${fmt(e.base_salary)}</td><td>${e.active ? 'faol' : 'ishdan ketgan'}</td></tr>`).join('')}</tbody></table></div>
    <p class="small muted">Planshet va kassaga faqat login-paroli bor xodim kiradi. Zamena sotuvchisi — planshet; kassir — kassa; rahbar — hammasi (hisobot, oylik, sozlamalar).
      Ustalar tizimga kirmaydi, ularni sotuvchi planshetda belgilaydi.<br>Asosiy maosh 2 ga bo'linib 15 va oy oxirida beriladi; KPI har davr uchun alohida hisoblanadi.</p></div>`;
  const form = e => {
    const m = modal(e ? e.name : 'Yangi xodim', `<label class="f"><span>Ism</span><input id="n" value="${esc(e?.name || '')}"></label>
      <div class="grid g2"><label class="f"><span>Lavozim</span><select id="r">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${e?.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f"><span>Telefon</span><input id="p" value="${esc(e?.phone || '')}"></label>
      <label class="f lgf"><span>Login (lotin harflari)</span><input id="lg" autocapitalize="none" autocomplete="off" value="${esc(e?.login || '')}"></label>
      <label class="f lgf"><span>${e?.has_password ? 'Yangi parol (o\'zgartirish uchun)' : 'Parol'}</span><input id="pw" type="password" autocomplete="new-password"></label>
      <label class="f"><span>Asosiy oylik (oyiga, so'm)</span><input id="b" type="number" value="${e?.base_salary || 0}"></label>
      <label class="f"><span>Holat</span><select id="a"><option value="1">Faol</option><option value="0" ${e && !e.active ? 'selected' : ''}>Ishdan ketgan</option></select></label></div>
      <div class="row end"><button class="btn p" id="sv" type="button">Saqlash</button></div>`);
    const roleChg = () => $$('.lgf', m.el).forEach(x => { x.hidden = $('#r', m.el).value === 'usta'; });
    $('#r', m.el).onchange = roleChg; roleChg();
    $('#sv', m.el).onclick = safe(async () => {
      const b = { name: $('#n', m.el).value, role: $('#r', m.el).value, phone: $('#p', m.el).value, base_salary: $('#b', m.el).value, active: +$('#a', m.el).value,
        login: $('#lg', m.el).value.trim(), password: $('#pw', m.el).value };
      e ? await PUT('employees/' + e.id, b) : await POST('employees', b); await reloadBoot(); m.close(); toast('Saqlandi'); render();
    });
  };
  $('#new').onclick = () => form(null);
  $$('tr[data-id]').forEach(tr => tr.onclick = () => form(list.find(e => e.id == tr.dataset.id)));
};

VIEWS.sozlama = async () => {
  const s = await GET('settings');
  const models = await GET('car_models');
  const F = [
    ['shop_name', "Do'kon nomi", 'text'],
    ['cashback_percent', "Keshbek, to'langan summadan %", 'number'],
    ['next_service_km', 'Keyingi almashtirishgacha (km)', 'number'],
    ['master_kpi_per_car', "Usta KPI: har bir mashina uchun (so'm)", 'number'],
    ['master_kpi_percent', 'Usta KPI: zakaz foydasidan %', 'number'],
    ['seller_kpi_per_car', "Zamena sotuvchisi KPI: har mashina uchun (so'm)", 'number'],
    ['seller_kpi_percent', 'Zamena sotuvchisi KPI: zakaz foydasidan %', 'number'],
    ['cashier_kpi_percent', "Kassir KPI: o'zi yopgan savdo foydasidan %", 'number'],
  ];
  $('#app').innerHTML = `<div class="grid g2" style="align-items:start">
    <div class="card"><h2>Sozlamalar</h2>
      ${F.map(([k, l, t]) => `<label class="f"><span>${l}</span><input data-k="${k}" type="${t}" step="any" value="${esc(s[k])}"></label>`).join('')}
      <div class="row end"><button class="btn p" id="sv" type="button">Saqlash</button></div></div>
    <div class="card"><h2>Mashina turlari</h2>
      <p class="small muted">Planshetda filtrlar shunga qarab chiqadi: ${Object.entries(GROUPS).map(([k, v]) => `<b>${v}</b> — ${(S.boot.group_filters[k] || []).map(x => FNAME[x].replace(' filtri', '')).join(', ')}`).join('; ')}.</p>
      <div class="row" style="margin-bottom:10px"><input id="nm" placeholder="Yangi model nomi" class="sp"><select id="ng" style="width:auto">${Object.entries(GROUPS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><button class="btn" id="add" type="button">Qo'shish</button></div>
      <div class="tbl-wrap"><table><tbody>${models.map(x => `<tr><td>${esc(x.name)}</td><td style="width:180px"><select data-mid="${x.id}">${Object.entries(GROUPS).map(([k, v]) => `<option value="${k}" ${(x.grp || 'boshqa') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div></div></div>`;
  $('#sv').onclick = safe(async () => {
    const b = {}; $$('[data-k]').forEach(i => { b[i.dataset.k] = i.value; });
    await PUT('settings', b); await reloadBoot(); toast('Saqlandi');
  });
  $$('[data-mid]').forEach(sl => sl.onchange = safe(async () => { await PUT('car_models/' + sl.dataset.mid, { grp: sl.value }); await reloadBoot(); toast('Saqlandi'); }));
  $('#add').onclick = safe(async () => { await POST('car_models', { name: $('#nm').value, grp: $('#ng').value }); await reloadBoot(); render(); });
};

start();
