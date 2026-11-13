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
function setNet(ok) { $$('#net, .netdot').forEach(d => d.classList.toggle('off', !ok)); }

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
// Bitta kirish: kim login-parol tersa — o'shanga mos bo'limga o'tadi
// (zamena sotuvchisi → planshet; kassir / rahbar → kassa paneli).
async function start() {
  const tick = () => { const t = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); $$('#clock, .clock').forEach(el => { el.textContent = t; }); };
  tick(); setInterval(tick, 1000);
  if (!LS.get('token', '')) return loginView();
  try { await reloadBoot(); } catch (e) {
    if (e.code === 401) return loginView();
    $('#app').innerHTML = `<div class="card empty">${esc(e.message)}</div>`; return;
  }
  enter();
}

function enter() {
  const role = S.boot.me.role;
  S.mode = role === 'sotuvchi' ? 'planshet' : (sessionStorage.getItem('zm_mode') === 'planshet' ? 'planshet' : 'kassa');
  document.body.classList.toggle('pl', S.mode === 'planshet');
  document.body.classList.toggle('ks', S.mode === 'kassa');
  document.title = S.mode === 'planshet' ? 'Zamena' : 'Zamena — kassa';
  if (S.mode === 'kassa') { $('#tabs').innerHTML = ''; $('#brand').textContent = ''; buildSide(); }
  else { removeSide(); userChip(); buildTabs(); }
  const tabs = myTabs();
  if (!tabs.length) { $('#app').innerHTML = `<div class="card empty">${esc(S.boot.me.name)}, bu bo'limga kirish huquqingiz yo'q.</div>`; return; }
  go(S.mode === 'kassa' ? 'bosh' : tabs[0][0]);
  if (!S.polling) S.polling = setInterval(poll, 3000);
  updateBadges();
}

// Login va parol bilan kirish (2–3 kishi ishlashi mumkin)
function loginView() {
  S.boot = null; S.tab = null; S.pos = null;
  $$('.modal-bg').forEach(m => m.parentNode.removeChild(m)); S.editing = false;
  removeSide();
  document.body.classList.remove('pl', 'ks', 'posmode');
  $('#tabs').innerHTML = '';
  $('#brand').textContent = 'Zamena';
  $('#app').innerHTML = `<div class="login-wrap"><form class="card login" id="lf" autocomplete="on">
    <h2>Tizimga kirish</h2><p class="muted" style="margin-top:-10px">Zamena planshet va kassa — bitta kirish</p>
    <label class="f"><span>Login</span><input id="lg" class="in-xl" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false"></label>
    <label class="f"><span>Parol</span><input id="pw" class="in-xl" type="password" autocomplete="current-password"></label>
    <button class="btn p xl" style="width:100%">Kirish</button>
    ${window.DEMO_API ? `<div class="sum-box small" style="margin-top:14px"><b>Demo loginlar</b><br>sotuvchi / 1111 — zamena sotuvchisi (planshet)<br>kassir / 2222 — kassa (POS, cheklar, mijozlar…)<br>admin / 1234 — rahbar (hammasi + hisobot, oylik)</div>` : ''}
  </form></div>`;
  $('#lf').onsubmit = safe(async e => {
    e.preventDefault();
    const r = await POST('login', { login: $('#lg').value.trim(), password: $('#pw').value });
    LS.set('token', r.token);
    sessionStorage.removeItem('zm_mode');
    await reloadBoot(); enter();
  });
  focusLater($('#lg'));
}

// Chap burchakda — kim ishlayapti (planshet)
function userChip() {
  const me = S.boot.me;
  $('#brand').innerHTML = `<button class="user-chip" id="uc" type="button" title="${esc(ROLES[me.role] || '')}"><span class="av">${esc(me.name.slice(0, 1).toUpperCase())}</span><span class="un">${esc(me.name)}</span></button>`;
  $('#uc').onclick = () => {
    const m = modal(me.name, `<p class="muted">${esc(ROLES[me.role] || '')}</p><div class="bigbtns"><button class="btn xl bad" id="lo" type="button">Chiqish</button></div>`);
    $('#lo', m.el).onclick = async () => { try { await POST('logout'); } catch { } LS.set('token', ''); m.close(); loginView(); };
  };
}

// [kalit, nomi, kerakli eng past rol] — kassa menyusi kassa.js da to'ldiriladi
const TABS = {
  planshet: [['jarayon', 'Jarayonda'], ['yangi', '＋ Yangi sotuv'], ['mahsulot', 'Moylar', 'admin'], ['__kassa', 'Kassa ↗', 'kassir']],
  kassa: [],
};
const myTabs = () => TABS[S.mode].filter(t => !t[2] || (RANK[S.boot.me.role] || 0) >= RANK[t[2]]);
const PARENT = { car: 'yangi', register: 'yangi', order: 'yangi' };
function buildTabs() {
  $('#tabs').innerHTML = myTabs().map(([k, v]) => `<button data-t="${k}" type="button">${v}<span class="badge" id="b-${k}" hidden></span></button>`).join('');
  $('#tabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) go(b.dataset.t); };
}

async function go(tab, ctx) {
  if (tab === '__kassa') { sessionStorage.setItem('zm_mode', 'kassa'); return enter(); }
  S.tab = tab; S.ctx = ctx || {};
  const on = PARENT[tab] || tab;
  $$('#tabs [data-t], #side [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === on));
  await render();
}
async function render() {
  const v = VIEWS[S.tab];
  $('#app').oninput = null;
  KEYH = null;
  document.body.classList.toggle('posmode', S.tab === 'pos');
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
      if (S.tab === 'pos') { posZamenaRefresh(); posShiftChip(); }
      else if (!S.editing && !typing && !S.ctx.form && LIVE.has(S.tab)) render();
      if (S.mode === 'kassa') sideShift();
      updateBadges();
    }
  } catch { }
}
const LIVE = new Set(['jarayon', 'bosh', 'cheklar', 'mahsulot']);
let lastOpen = null;
async function updateBadges() {
  if (S.mode !== 'kassa' || !S.boot || (RANK[S.boot.me.role] || 0) < RANK.kassir) return;
  try {
    const n = (await GET('orders?status=open')).filter(o => o.type === 'zamena').length;
    const pos = $('#side .sb-pos'); if (pos) { let b = $('.sbz', pos); if (!b) { b = document.createElement('b'); b.className = 'sbz'; pos.appendChild(b); } b.hidden = !n; b.textContent = n; }
    if (lastOpen !== null && n > lastOpen) beep();   // planshetdan yangi mashina keldi
    lastOpen = n;
  } catch { }
}
function beep() {
  try { const a = new (window.AudioContext || window.webkitAudioContext)(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.value = .1; o.start(); setTimeout(() => { o.stop(); a.close(); }, 200); } catch { }
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
