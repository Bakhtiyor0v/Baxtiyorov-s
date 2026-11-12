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
const plateFmt = p => esc(p || '');
const CATS = { moy: 'Moy', filtr: 'Filtr', boshqa: 'Boshqa', xizmat: 'Xizmat' };
const ROLES = { usta: 'Usta', sotuvchi: 'Zamena sotuvchisi', kassir: 'Kassir' };
const STATUS = { jarayonda: 'Almashtirilmoqda', tayyor: 'Tayyor', yopilgan: "To'langan", bekor: 'Bekor' };
const SERVICES = ['Motor moyi', 'Moy filtri', 'Havo filtri', 'Salon filtri', "Yoqilg'i filtri", 'Karobka moyi', 'Antifriz', 'Tormoz suyuqligi', 'Gidrouchitel moyi', 'Svecha'];
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
  const headers = { 'Content-Type': 'application/json' };
  const pin = sessionStorage.getItem('zm_pin'); if (pin) headers['X-Pin'] = pin;
  let res;
  try {
    res = await fetch('/api/' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (e) { setNet(false); throw new Error("Server bilan aloqa yo'q"); }
  setNet(true);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403) sessionStorage.removeItem('zm_pin');
    throw new Error(data.error || 'Xato ' + res.status);
  }
  return data;
}
const GET = p => api('GET', p), POST = (p, b) => api('POST', p, b || {}), PUT = (p, b) => api('PUT', p, b || {});
function setNet(ok) { $('#net').classList.toggle('off', !ok); }

// Har bir tugma bosilishini xatoliklardan himoya qiladi
const focusLater = (el) => setTimeout(() => { if (el && (!document.activeElement || document.activeElement === document.body)) el.focus(); }, 50);
const safe = fn => async (...a) => { try { return await fn(...a); } catch (e) { toast(e.message, true); } };

// ------------------------------------------------------------------ holat
const S = { boot: null, mode: null, tab: null, version: 0, ctx: {}, editing: false };
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
  S.mode = path.endsWith('/planshet') ? 'planshet' : path.endsWith('/kassa') ? 'kassa' : null;
  setInterval(() => { $('#clock').textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }); }, 1000);
  try { await reloadBoot(); } catch (e) { $('#app').innerHTML = `<div class="card empty">${esc(e.message)}</div>`; return; }
  document.title = S.boot.settings.shop_name;
  $('#brand').textContent = S.boot.settings.shop_name;
  $('#brand').onclick = () => S.mode ? go(S.mode === 'planshet' ? 'home' : 'navbat') : null;
  if (!S.mode) return chooser();
  buildTabs();
  go(S.mode === 'planshet' ? 'home' : 'navbat');
  setInterval(poll, 3000);
}

function chooser() {
  $('#tabs').innerHTML = '';
  $('#app').innerHTML = `<div class="chooser">
    <a class="card" href="/planshet"><div class="ico">📋</div><h2>Planshet</h2><div class="muted">Zamena sotuvchisi: mashina, probeg, usta, moy</div></a>
    <a class="card" href="/kassa"><div class="ico">🖥️</div><h2>Kassa</h2><div class="muted">Do'kon kompyuteri: to'lov, sotuv, ombor, hisobot</div></a></div>`;
}

const TABS = {
  planshet: [['home', 'Bosh sahifa'], ['bugun', 'Bugungi ishlar']],
  kassa: [['navbat', 'Navbat'], ['sotuv', 'Sotuv'], ['tarix', 'Tarix'], ['mahsulot', 'Ombor'], ['mijoz', 'Mijozlar'],
    ['inventar', 'Inventarizatsiya'], ['hisobot', 'Hisobot', 1], ['oylik', 'Oylik / KPI', 1], ['xodim', 'Xodimlar', 1], ['sozlama', 'Sozlamalar', 1]],
};
function buildTabs() {
  $('#tabs').innerHTML = TABS[S.mode].map(([k, v]) => `<button data-t="${k}">${v}<span class="badge" id="b-${k}" hidden></span></button>`).join('');
  $('#tabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) go(b.dataset.t); };
}

async function needPin(tab) {
  const t = TABS.kassa.find(x => x[0] === tab);
  if (!t || !t[2] || !S.boot.settings.has_pin || sessionStorage.getItem('zm_pin')) return true;
  return new Promise(r => {
    const m = modal('PIN kod', `<p class="muted">Bu bo'lim faqat rahbar uchun.</p><input id="pin" type="password" inputmode="numeric" autofocus>
      <div class="row end" style="margin-top:12px"><button class="btn p" id="pok">Kirish</button></div>`);
    const ok = safe(async () => { const pin = $('#pin', m.el).value; await POST('pin', { pin }); sessionStorage.setItem('zm_pin', pin); m.close(); r(true); });
    $('#pok', m.el).onclick = ok; $('#pin', m.el).onkeydown = e => e.key === 'Enter' && ok();
    setTimeout(() => $('#pin', m.el).focus(), 50);
    $('.x', m.el.parentElement).addEventListener('click', () => r(false));
  });
}

async function go(tab, ctx) {
  if (!(await needPin(tab))) return;
  S.tab = tab; S.ctx = ctx || {};
  $$('#tabs [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  await render();
}
async function render() {
  const v = VIEWS[S.tab];
  $('#app').oninput = null;
  try { await v(); } catch (e) { $('#app').innerHTML = `<div class="card empty">${esc(e.message)}</div>`; }
}

async function poll() {
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
const LIVE = new Set(['home', 'bugun', 'navbat', 'tarix', 'mahsulot']);
async function updateBadges() {
  if (S.mode !== 'kassa') return;
  try {
    const open = await GET('orders?status=open');
    const b = $('#b-navbat'); if (b) { b.hidden = !open.length; b.textContent = open.length; }
  } catch { }
}

// ================================================================== PLANSHET
const VIEWS = {};

VIEWS.home = async () => {
  const t = await GET('today');
  const max = Math.max(1, ...t.by_master.map(x => x.n));
  const maxM = Math.max(1, ...t.by_master_month.map(x => x.n));
  const open = t.orders.filter(o => o.status === 'jarayonda');
  $('#app').innerHTML = `<div class="pl-shell">
    <div class="card"><h3>Mashina raqami</h3>
      <form id="pf" class="row"><input id="plate" class="plate sp" placeholder="01 A 123 BC" autocomplete="off" autocapitalize="characters">
      <button class="btn p lg">Qidirish</button></form></div>
    <div class="grid g3">
      <div class="card stat"><div class="label">Bugun moy almashtirildi</div><div class="big">${t.count} ta</div></div>
      <div class="card stat"><div class="label">Bugun quyilgan moy</div><div class="big">${qtyFmt(t.oil)} L</div></div>
      <div class="card stat"><div class="label">Hozir almashtirilmoqda</div><div class="big">${open.length} ta</div></div>
    </div>
    <div class="grid g2">
      <div class="card"><h3>Bugun: ustalar reytingi</h3>${t.by_master.length ? t.by_master.map((m, i) => `
        <div class="rank ${i === 0 ? 'first' : ''}"><span class="n">${i + 1}</span><div class="sp"><b>${esc(m.name || '—')}</b>
        <div class="bar"><i style="width:${m.n / max * 100}%"></i></div></div><b>${m.n} ta</b><span class="muted small">${qtyFmt(m.oil)} L</span></div>`).join('') : '<div class="empty">Hali yo\'q</div>'}</div>
      <div class="card"><h3>Shu oy: ustalar</h3>${t.by_master_month.length ? t.by_master_month.map((m, i) => `
        <div class="rank ${i === 0 ? 'first' : ''}"><span class="n">${i + 1}</span><div class="sp"><b>${esc(m.name || '—')}</b>
        <div class="bar"><i style="width:${m.n / maxM * 100}%"></i></div></div><b>${m.n} ta</b></div>`).join('') : '<div class="empty">Hali yo\'q</div>'}</div>
    </div>
    <div class="card"><h3>Almashtirilmoqda</h3>${ordersList(open)}</div></div>`;
  $('#pf').onsubmit = safe(async e => { e.preventDefault(); const p = $('#plate').value.trim(); if (p) go('car', { plate: p }); });
  bindOrdersList();
  focusLater($('#plate'));
};

function ordersList(list) {
  if (!list.length) return '<div class="empty">Yo\'q</div>';
  return `<div class="tbl-wrap"><table><thead><tr><th>Vaqt</th><th>Raqam</th><th>Usta</th><th>Nima qilindi</th><th>Probeg</th><th>Holat</th><th></th></tr></thead><tbody>
    ${list.map(o => `<tr><td>${timeOf(o.created_at)}</td><td><b>${plateFmt(o.plate)}</b><div class="muted small">${esc(o.model || '')}</div></td>
      <td>${esc(o.master_name || '—')}</td><td class="small">${orderLine(o)}</td><td class="num">${km(o.mileage)}</td>
      <td><span class="tag ${o.status}">${STATUS[o.status]}</span></td>
      <td class="num">${o.status === 'jarayonda' ? `<button class="btn sm ok" data-ready="${o.id}">Tayyor</button> ` : ''}
      ${['jarayonda', 'tayyor'].includes(o.status) ? `<button class="btn sm" data-edit="${o.id}">Tahrir</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
}
function bindOrdersList() {
  $$('[data-ready]').forEach(b => b.onclick = safe(async () => { await PUT('orders/' + b.dataset.ready, { status: 'tayyor' }); toast('Tayyor — kassaga bildirildi'); render(); }));
  $$('[data-edit]').forEach(b => b.onclick = safe(async () => { const o = await GET('orders/' + b.dataset.edit); const car = await GET('cars/' + o.car_id); go('order', { car, order: o, form: true }); }));
}

VIEWS.bugun = async () => {
  const t = await GET('today');
  $('#app').innerHTML = `<div class="card"><h3>Bugun (${dateOf(t.date)}): ${t.count} ta mashina, ${qtyFmt(t.oil)} L moy</h3>${ordersList(t.orders)}</div>`;
  bindOrdersList();
};

VIEWS.car = async () => {
  const r = await GET('cars/lookup?plate=' + encodeURIComponent(S.ctx.plate));
  if (!r.car) return newCarForm(r.plate);
  S.ctx.car = r.car;
  const c = r.car, last = c.history.find(h => h.type === 'zamena');
  const s = S.boot.settings;
  const inProgress = c.history.find(h => ['jarayonda', 'tayyor'].includes(h.status));
  $('#app').innerHTML = `<div class="pl-shell">
    <div class="card"><div class="row"><div class="sp"><div class="big">${plateFmt(c.plate)}</div>
      <div class="muted">${esc(c.model || 'Model kiritilmagan')}</div></div>
      <button class="btn" id="edcar">Tahrirlash</button></div>
      <div class="grid g3" style="margin-top:12px">
        <div><div class="muted small">Egasi</div><b>${esc(c.customer_name || '—')}</b><div>${esc(c.customer_phone || '')}</div></div>
        <div><div class="muted small">Oxirgi probeg</div><b>${km(c.last_mileage)}</b>${last?.next_mileage ? `<div class="small">Keyingisi: ${km(last.next_mileage)}</div>` : ''}</div>
        <div><div class="muted small">Keshbek balansi</div><b class="pos">${sum(c.customer_cashback || 0)}</b></div>
      </div>
      ${last ? `<div class="sum-box" style="margin-top:12px"><b>Oxirgi marta (${dateOf(last.created_at)}):</b> ${orderLine(last)}</div>` : ''}
    </div>
    ${inProgress ? `<div class="warn-box">Bu mashina hozir navbatda (#${inProgress.id}, ${STATUS[inProgress.status]}). <button class="btn sm" id="openip">Ochish</button></div>` : ''}
    <button class="btn p lg" id="neworder" style="width:100%;margin-bottom:14px">+ Moy almashtirishni boshlash</button>
    <div class="card hist"><h3>Tarix</h3>${c.history.length ? c.history.map(h => `<div class="h"><div class="row"><b>${dateOf(h.created_at)}</b>
      <span class="muted">${km(h.mileage)}</span><span class="sp"></span><span class="tag ${h.status}">${STATUS[h.status]}</span><b>${h.status === 'yopilgan' ? sum(h.total) : ''}</b></div>
      <div class="small">${orderLine(h)}</div>${h.oil_in || h.oil_out ? `<div class="small muted">Quyildi ${qtyFmt(h.oil_in)} L · To'kib olindi ${qtyFmt(h.oil_out)} L</div>` : ''}</div>`).join('') : '<div class="empty">Birinchi tashrif</div>'}</div></div>`;
  $('#neworder').onclick = () => go('order', { car: c, form: true });
  $('#edcar').onclick = () => editCar(c);
  if (inProgress) $('#openip').onclick = safe(async () => go('order', { car: c, order: await GET('orders/' + inProgress.id), form: true }));
};

function carFormHtml(c = {}) {
  return `<label class="f"><span>Mashina modeli</span><input id="cm" value="${esc(c.model || '')}" placeholder="Cobalt, Nexia 3, Gentra…" list="models"></label>
    <datalist id="models">${['Cobalt', 'Nexia 3', 'Nexia 2', 'Gentra', 'Lacetti', 'Spark', 'Damas', 'Malibu', 'Tracker', 'Captiva', 'Onix', 'Matiz', 'Kia K5', 'Hyundai Elantra'].map(m => `<option>${m}</option>`).join('')}</datalist>
    <div class="grid g2"><label class="f"><span>Mijoz ismi</span><input id="cn" value="${esc(c.customer_name || '')}"></label>
    <label class="f"><span>Telefon (keshbek uchun)</span><input id="cp" type="tel" value="${esc(c.customer_phone || '')}" placeholder="90 123 45 67"></label></div>`;
}
const carFormVal = el => ({ model: $('#cm', el).value.trim(), customer_name: $('#cn', el).value.trim(), phone: $('#cp', el).value.trim() });

function newCarForm(plate) {
  $('#app').innerHTML = `<div class="pl-shell"><div class="card"><h3>Yangi mashina — bazada yo'q</h3>
    <div class="big" style="margin-bottom:12px">${plateFmt(plate)}</div><div id="cf">${carFormHtml()}</div>
    <div class="row end"><button class="btn" id="back">Orqaga</button><button class="btn p lg" id="save">Qo'shish va davom etish</button></div></div></div>`;
  $('#back').onclick = () => go('home');
  $('#save').onclick = safe(async () => { const car = await POST('cars', { plate, ...carFormVal($('#cf')) }); toast("Mashina bazaga qo'shildi"); go('order', { car, form: true }); });
  focusLater($('#cm'));
}

function editCar(c) {
  const m = modal('Mashina: ' + c.plate, carFormHtml(c) + `<div class="row end"><button class="btn p" id="sv">Saqlash</button></div>`);
  $('#sv', m.el).onclick = safe(async () => { await PUT('cars/' + c.id, carFormVal(m.el)); m.close(); toast('Saqlandi'); render(); });
}

VIEWS.order = async () => {
  const { car, order } = S.ctx;
  const s = S.boot.settings;
  const items = order ? itemsFromOrder(order) : [];
  let services = order ? [...order.services] : [];
  let master = order?.master_id || null;
  const lastSeller = LS.get('seller', null);
  const oils = S.boot.products.filter(p => p.active && p.category === 'moy');
  const lastOil = car.history.find(h => h.type === 'zamena')?.items.find(i => i.category === 'moy');
  $('#app').innerHTML = `<div class="pl-shell">
    <div class="card"><div class="row"><div class="sp"><div class="big">${plateFmt(car.plate)}</div><div class="muted">${esc(car.model || '')} · ${esc(car.customer_name || '')}</div></div>
      ${order ? `<span class="tag ${order.status}">#${order.id} ${STATUS[order.status]}</span>` : ''}</div></div>
    <div class="card"><h3>1. Probeg (km)</h3>
      <div class="grid g2"><label class="f"><span>Hozirgi probeg ${car.last_mileage ? '(avvalgi: ' + km(car.last_mileage) + ')' : ''}</span>
        <input id="mil" type="number" inputmode="numeric" value="${order?.mileage || ''}" style="font-size:22px;font-weight:700"></label>
      <label class="f"><span>Keyingi almashtirish (km)</span><input id="nmil" type="number" inputmode="numeric" value="${order?.next_mileage || ''}" placeholder="avtomatik +${fmt(s.next_service_km)}"></label></div></div>
    <div class="card"><h3>2. Usta <span class="neg">*</span></h3><div class="masters" id="ms">${employees('usta').map(e => `<div class="chip ${master == e.id ? 'on' : ''}" data-id="${e.id}">${esc(e.name)}</div>`).join('') || '<div class="muted">Ustalar kiritilmagan (kassa → Xodimlar)</div>'}</div></div>
    <div class="card"><h3>3. Moy</h3>
      <div class="grid g3"><label class="f"><span>Qaysi moy (mijoz tanlaydi)</span><select id="oil"><option value="">— tanlang —</option>
        ${oils.map(p => `<option value="${p.id}" ${(lastOil && !order && lastOil.product_id === p.id) ? 'selected' : ''}>${esc(p.name)} — ${fmt(p.price)}</option>`).join('')}</select>
        ${lastOil && !order ? `<div class="small muted">Oxirgi safar: ${esc(lastOil.name)}</div>` : ''}</label>
      <label class="f"><span>Quyilgan moy (L)</span><input id="oin" type="number" step="0.1" inputmode="decimal" value="${order?.oil_in ?? ''}" placeholder="3.5"></label>
      <label class="f"><span>To'kib olingan eski moy (L)</span><input id="oout" type="number" step="0.1" inputmode="decimal" value="${order?.oil_out ?? ''}" placeholder="3.2"></label></div>
      <button class="btn" id="addoil">Moyni ro'yxatga qo'shish</button></div>
    <div class="card"><h3>4. Nimalar almashtirildi / xizmatlar</h3><div class="chips" id="sv">${SERVICES.map(x => `<span class="chip ${services.includes(x) ? 'on' : ''}">${esc(x)}</span>`).join('')}</div></div>
    <div class="card"><div class="row"><h3 class="sp">5. Mahsulotlar</h3><button class="btn" data-cat="filtr">+ Filtr</button><button class="btn" data-cat="">+ Boshqa</button></div>
      <div id="items"></div><div class="small muted">Tekin berilgan narsalarga «Bonus» belgisini qo'ying — tannarxi moy foydasidan qoplanadi.</div></div>
    <div class="card"><div class="grid g2"><label class="f"><span>Zamena sotuvchisi</span><select id="seller"><option value="">—</option>
      ${employees('sotuvchi').map(e => `<option value="${e.id}" ${(order?.seller_id || lastSeller) == e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>
      <label class="f"><span>Izoh</span><input id="note" value="${esc(order?.note || '')}"></label></div>
      <div class="row end"><button class="btn" id="cancel">${order ? 'Zakazni bekor qilish' : 'Orqaga'}</button>
      <button class="btn p lg" id="submit">${order ? 'Saqlash' : 'Almashtirilmoqda → kassaga'}</button></div></div></div>`;

  const ed = itemsEditor($('#items'), items, null);
  $('#ms').onclick = e => { const c = e.target.closest('[data-id]'); if (!c) return; master = +c.dataset.id; $$('#ms .chip').forEach(x => x.classList.toggle('on', x === c)); $('#ms').parentElement.classList.remove('req'); };
  $('#sv').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; c.classList.toggle('on'); services = $$('#sv .chip.on').map(x => x.textContent); };
  $$('[data-cat]').forEach(b => b.onclick = () => pickProduct(p => { ed.add(p); autoService(p); }, { cat: b.dataset.cat }));
  const autoService = p => {
    const n = p.name.toLowerCase(); const map = [['moy filtr', 'Moy filtri'], ['havo', 'Havo filtri'], ['salon', 'Salon filtri'], ["yoqilg'i", "Yoqilg'i filtri"], ['karobka', 'Karobka moyi'], ['antifriz', 'Antifriz'], ['tormoz', 'Tormoz suyuqligi'], ['motor moy', 'Motor moyi']];
    for (const [k, v] of map) if (n.includes(k) && !services.includes(v)) { services.push(v); $$('#sv .chip').find(x => x.textContent === v)?.classList.add('on'); }
  };
  $('#addoil').onclick = () => {
    const p = prod($('#oil').value); const l = +$('#oin').value;
    if (!p) return toast('Moyni tanlang', true);
    if (!l) return toast('Quyilgan litrni kiriting', true);
    const ex = items.find(i => i.product_id === p.id); if (ex) ex.qty = l; else items.unshift({ product_id: p.id, name: p.name, category: p.category, qty: l, price: p.price, is_bonus: false });
    ed.draw(); autoService(p);
  };
  $('#cancel').onclick = safe(async () => {
    if (!order) return go('car', { plate: car.plate });
    if (await confirmBox('Zakaz bekor qilinsinmi? Mahsulotlar omborga qaytadi.')) { await POST(`orders/${order.id}/cancel`); toast('Bekor qilindi'); go('home'); }
  });
  $('#submit').onclick = safe(async () => {
    if (!master) { $('#ms').scrollIntoView({ behavior: 'smooth', block: 'center' }); throw new Error('Ustani belgilang — majburiy'); }
    const mil = +$('#mil').value; if (!mil) { $('#mil').focus(); throw new Error('Probegni kiriting'); }
    // Moy tanlangan, lekin ro'yxatga qo'shilmagan bo'lsa — avtomatik qo'shamiz
    const oilP = prod($('#oil').value), oin = +$('#oin').value;
    if (oilP && oin && !items.some(i => i.category === 'moy')) items.unshift({ product_id: oilP.id, name: oilP.name, category: 'moy', qty: oin, price: oilP.price, is_bonus: false });
    const body = {
      type: 'zamena', car_id: car.id, mileage: mil, next_mileage: +$('#nmil').value || null, master_id: master,
      seller_id: +$('#seller').value || null, oil_in: $('#oin').value, oil_out: $('#oout').value,
      services, note: $('#note').value, items: itemsPayload(items),
    };
    if (body.seller_id) LS.set('seller', body.seller_id);
    if (!items.length && !(await confirmBox("Mahsulot qo'shilmagan. Shunday davom etilsinmi?"))) return;
    const save = async force => order ? PUT('orders/' + order.id, body) : POST('orders', { ...body, force });
    try { await save(false); }
    catch (e) {
      if (/Probeg avvalgidan/.test(e.message) && await confirmBox(e.message + ' Baribir saqlansinmi?')) await save(true);
      else throw e;
    }
    toast(order ? 'Saqlandi' : 'Almashtirilmoqda — kassaga yuborildi');
    go('home');
  });
};

// ================================================================== KASSA
VIEWS.navbat = async () => {
  const list = await GET('orders?status=open');
  const seen = new Set(LS.get('seen', []));
  $('#app').innerHTML = `<div class="row"><h2 class="sp">Navbat — to'lov kutilmoqda (${list.length})</h2><button class="btn p" id="pos">+ Oddiy sotuv</button></div>
    ${list.length ? `<div class="queue">${list.map(o => `<div class="card qcard ${o.status} ${seen.has(o.id) ? '' : 'new'}" data-id="${o.id}">
      <div class="row"><span class="plate-t sp">${plateFmt(o.plate)}</span><span class="tag ${o.status}">${STATUS[o.status]}</span></div>
      <div class="muted">${esc(o.model || '')} · ${esc(o.customer_name || 'mijoz noma\'lum')}</div>
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
    <label class="f"><span>Kassir</span><select id="${prefix}cashier"><option value="">—</option>${employees('kassir').concat(employees('sotuvchi')).map(e => `<option value="${e.id}" ${LS.get('cashier') == e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></label>
    <div></div></div>
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
  const cashier = +$('#cashier', el).value || null; if (cashier) LS.set('cashier', cashier);
  return { discount: +$('#disc', el).value || 0, cashback_used: +$('#cb', el).value || 0, paid_cash: +cash || 0, paid_card: +card || 0, cashier_id: cashier };
}

function checkout(o) {
  const items = itemsFromOrder(o);
  const m = modal(`To'lov: ${o.plate} — #${o.id}`, `
    <div class="row muted small" style="margin-bottom:8px"><span>${esc(o.model || '')}</span><span>Mijoz: <b>${esc(o.customer_name || '—')}</b> ${esc(o.customer_phone || '')}</span>
      <span>Usta: <b>${esc(o.master_name || '—')}</b></span><span>Probeg: ${km(o.mileage)}</span>${o.oil_in ? `<span>Quyildi ${qtyFmt(o.oil_in)} L / to'kildi ${qtyFmt(o.oil_out)} L</span>` : ''}</div>
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
    ${o.plate ? `<div>Mashina: ${esc(o.plate)} · ${km(o.mileage)}</div><div>Keyingi almashtirish: ${km(o.next_mileage)}</div>` : ''}<hr>
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
    else { customer = list[0]; $('#cinfo').innerHTML = `<b>${esc(customer.name || '—')}</b> ${esc(customer.phone)} · ${esc(customer.plates || '')}<br>Keshbek: <b class="pos">${sum(customer.cashback)}</b>`; }
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
      return `<tr class="click" data-id="${p.id}" style="${p.active ? '' : 'opacity:.5'}"><td>${esc(p.name)}${p.barcode ? `<div class="muted small">${esc(p.barcode)}</div>` : ''}</td>
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

function productForm(p) {
  const m = modal(p ? 'Mahsulot' : 'Yangi mahsulot', `
    <label class="f"><span>Nomi</span><input id="n" value="${esc(p?.name || '')}"></label>
    <div class="grid g3"><label class="f"><span>Kategoriya</span><select id="c">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${p?.category === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label class="f"><span>O'lchov</span><select id="u">${['dona', 'litr', 'komplekt'].map(u => `<option ${p?.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
    <label class="f"><span>Shtrix-kod</span><input id="b" value="${esc(p?.barcode || '')}"></label>
    <label class="f"><span>Tannarx (kelish narxi)</span><input id="co" type="number" value="${p?.cost ?? ''}"></label>
    <label class="f"><span>Sotuv narxi</span><input id="pr" type="number" value="${p?.price ?? ''}"></label>
    ${p ? `<label class="f"><span>Holat</span><select id="a"><option value="1">Faol</option><option value="0" ${p.active ? '' : 'selected'}>Arxiv</option></select></label>` : `<label class="f"><span>Boshlang'ich qoldiq</span><input id="st" type="number" value="0"></label>`}</div>
    <p class="small muted">Moy uchun narxni 1 litrga kiriting (quyma moy). Filtrni zarariga sotsangiz ham bo'ladi — hisobotda moy foydasidan qoplanishi ko'rinadi.</p>
    <div class="row end"><button class="btn p" id="sv">Saqlash</button></div>`);
  $('#sv', m.el).onclick = safe(async () => {
    const b = { name: $('#n', m.el).value, category: $('#c', m.el).value, unit: $('#u', m.el).value, barcode: $('#b', m.el).value, cost: $('#co', m.el).value, price: $('#pr', m.el).value, active: p ? +$('#a', m.el).value : 1, stock: p ? undefined : $('#st', m.el).value };
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
    ${list.map(c => `<tr class="click" data-id="${c.id}"><td>${esc(c.name || '—')}</td><td>${esc(c.phone)}</td><td>${esc(c.plates || '')}</td><td class="num">${c.visits}</td><td class="num">${fmt(c.spent)}</td><td class="num pos"><b>${fmt(c.cashback)}</b></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Topilmadi</td></tr>'}</tbody></table></div></div>`;
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
    <h3 style="margin-top:14px">Mashinalar</h3><div>${c.cars.map(x => `<span class="tag boshqa" style="font-size:14px;margin-right:6px">${esc(x.plate)} ${esc(x.model)} · ${km(x.last_mileage)}</span>`).join('') || '—'}</div>
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
  $('#app').innerHTML = `<div class="row"><h2 class="sp">Xodimlar</h2><button class="btn p" id="new">+ Xodim</button></div>
    <div class="card"><table><thead><tr><th>Ism</th><th>Lavozim</th><th>Telefon</th><th class="num">Oylik maosh (oyiga)</th><th>Holat</th></tr></thead><tbody>
    ${list.map(e => `<tr class="click" data-id="${e.id}"><td><b>${esc(e.name)}</b></td><td>${ROLES[e.role]}</td><td>${esc(e.phone)}</td><td class="num">${fmt(e.base_salary)}</td><td>${e.active ? 'faol' : 'ishdan ketgan'}</td></tr>`).join('')}</tbody></table>
    <p class="small muted">Asosiy maosh 2 ga bo'linib 15 va oy oxirida beriladi; KPI har davr uchun alohida hisoblanadi. Faqat KPI bilan ishlasa — maoshni 0 qoldiring.</p></div>`;
  const form = e => {
    const m = modal(e ? e.name : 'Yangi xodim', `<label class="f"><span>Ism</span><input id="n" value="${esc(e?.name || '')}"></label>
      <div class="grid g2"><label class="f"><span>Lavozim</span><select id="r">${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${e?.role === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f"><span>Telefon</span><input id="p" value="${esc(e?.phone || '')}"></label>
      <label class="f"><span>Asosiy oylik (oyiga, so'm)</span><input id="b" type="number" value="${e?.base_salary || 0}"></label>
      <label class="f"><span>Holat</span><select id="a"><option value="1">Faol</option><option value="0" ${e && !e.active ? 'selected' : ''}>Ishdan ketgan</option></select></label></div>
      <div class="row end"><button class="btn p" id="sv">Saqlash</button></div>`);
    $('#sv', m.el).onclick = safe(async () => {
      const b = { name: $('#n', m.el).value, role: $('#r', m.el).value, phone: $('#p', m.el).value, base_salary: $('#b', m.el).value, active: +$('#a', m.el).value };
      e ? await PUT('employees/' + e.id, b) : await POST('employees', b); await reloadBoot(); m.close(); render();
    });
  };
  $('#new').onclick = () => form(null);
  $$('tr[data-id]').forEach(tr => tr.onclick = () => form(list.find(e => e.id == tr.dataset.id)));
};

VIEWS.sozlama = async () => {
  const s = await GET('settings');
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
  $('#app').innerHTML = `<div class="card" style="max-width:720px"><h2>Sozlamalar</h2>
    ${F.map(([k, l, t]) => `<label class="f"><span>${l}</span><input data-k="${k}" type="${t}" step="any" value="${esc(s[k])}"></label>`).join('')}
    <label class="f"><span>Rahbar PIN kodi (Hisobot, Oylik, Xodimlar, Sozlamalar uchun). Bo'sh — PINsiz. ${s.has_pin ? 'Hozir o\'rnatilgan.' : ''}</span><input data-k="admin_pin" type="password" placeholder="${s.has_pin ? 'o\'zgartirish uchun yangisini yozing' : ''}"></label>
    <div class="row end"><button class="btn p" id="sv">Saqlash</button></div></div>`;
  $('#sv').onclick = safe(async () => {
    const b = {}; $$('[data-k]').forEach(i => { if (i.dataset.k !== 'admin_pin' || i.value) b[i.dataset.k] = i.value; });
    await PUT('settings', b); if (b.admin_pin) sessionStorage.setItem('zm_pin', b.admin_pin);
    await reloadBoot(); toast('Saqlandi'); $('#brand').textContent = S.boot.settings.shop_name;
  });
};

start();
