/* Kassa: chap menyuli panel (Bito uslubida) + POS (Sotuv / Zamena).
   Bu fayl app.js dan keyin yuklanadi va uning yordamchilaridan foydalanadi. */
'use strict';

// ------------------------------------------------------------------ ikonkalar (24×24, chiziqli)
const ICONS = {
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h4',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  cart: 'M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6M9 20h.01M17 20h.01',
  truck: 'M2 6h11v10H2zM13 10h4l3 3v3h-7M6 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01',
  box: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  check: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
  wallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v10a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14h.01',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  medal: 'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM8.5 13.5L7 22l5-3 5 3-1.5-8.5',
  id: 'M3 5h18v14H3zM8 11h.01M5.5 16a3 3 0 0 1 5 0M14 9h4M14 13h4',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  pos: 'M3 4h18v11H3zM8 20h8M12 15v5',
  tablet: 'M6 2h12v20H6zM11 18h2',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  back: 'M15 18l-6-6 6-6',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3',
  x: 'M18 6L6 18M6 6l12 12',
  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  undo: 'M3 7v6h6M3 13a9 9 0 1 0 3-7l-3 3',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[n] || ''}"/></svg>`;
const MNAME = m => (S.boot.methods || {})[m] || m;
const PM = [['naqd', 'Naqd', 'F6'], ['terminal', 'Terminal', 'F7'], ['otkazma', "Kartadan o'tkazma", 'F8'], ['qarz', 'Qarzga', 'F10']];
const isAdmin = () => S.boot && S.boot.me.role === 'admin';
const digits = v => +String(v || '').replace(/[^\d]/g, '') || 0;
const moneyIn = (id, v = '', ph = '0') => `<input id="${id}" class="money" inputmode="numeric" autocomplete="off" placeholder="${ph}" value="${v ? fmt(v) : ''}">`;
// Pul maydonlarini yozish paytida «1 250 000» ko'rinishida formatlaydi
document.addEventListener('input', e => {
  const t = e.target;
  if (t.classList && t.classList.contains('money')) { const d = digits(t.value); t.value = d ? fmt(d) : ''; }
});
// Esc — yuqoridagi oynani yopadi
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { const all = $$('.modal-bg'); if (all.length) { $('.x', all[all.length - 1]).click(); e.preventDefault(); } }
});

// ------------------------------------------------------------------ panel menyusi (chapda)
// [kalit, nomi, ikonka, kerakli rol, guruh]
const KNAV = [
  ['bosh', 'Bosh sahifa', 'home', 'kassir', ''],
  ['cheklar', 'Cheklar', 'receipt', 'kassir', 'Savdo'],
  ['mijoz', 'Mijozlar', 'users', 'kassir', 'Savdo'],
  ['xarid', 'Xaridlar', 'cart', 'kassir', "Ta'minot"],
  ['taminot', 'Yetkazib beruvchilar', 'truck', 'kassir', "Ta'minot"],
  ['mahsulot', 'Ombor', 'box', 'kassir', "Ta'minot"],
  ['inventar', 'Inventarizatsiya', 'check', 'kassir', "Ta'minot"],
  ['kassa', 'Kassa', 'wallet', 'kassir', 'Moliya'],
  ['hisobot', 'Hisobotlar', 'chart', 'kassir', 'Moliya'],
  ['oylik', 'Oylik / KPI', 'medal', 'admin', 'Boshqaruv'],
  ['xodim', 'Xodimlar', 'id', 'admin', 'Boshqaruv'],
  ['sozlama', 'Sozlamalar', 'gear', 'admin', 'Boshqaruv'],
];
TABS.kassa = [['pos', 'POS', 'kassir'], ...KNAV.map(([k, n, , r]) => [k, n, r])];
Object.assign(PARENT, { xarid_new: 'xarid' });

function buildSide() {
  let side = $('#side');
  if (!side) { side = document.createElement('aside'); side.id = 'side'; document.body.appendChild(side); }
  const me = S.boot.me, rank = RANK[me.role] || 0;
  const items = KNAV.filter(x => rank >= RANK[x[3]]);
  let grp = null, nav = '';
  items.forEach(([k, n, icon, , g]) => {
    if (g !== grp) { grp = g; if (g) nav += `<div class="sb-grp">${g}</div>`; }
    nav += `<button class="sb-item" data-t="${k}" type="button">${ic(icon)}<span>${n}</span></button>`;
  });
  side.innerHTML = `<div class="sb-top"><div class="sb-brand">${esc(S.boot.settings.shop_name || 'Zamena')}</div>
      <button class="sb-user" id="sbu" type="button"><span class="av">${esc(me.name.slice(0, 1).toUpperCase())}</span><span class="sb-un"><b>${esc(me.name)}</b><small>${esc(ROLES[me.role] || '')}</small></span>${ic('logout', 'sm')}</button></div>
    <button class="sb-pos" data-t="pos" type="button">${ic('pos')}<span>POS — Sotuv</span></button>
    <nav class="sb-nav">${nav}</nav>
    <div class="sb-foot"><button class="sb-item" id="toPl" type="button">${ic('tablet')}<span>Zamena (planshet)</span></button>
      <div class="sb-status"><span id="sbShift"></span><span class="sp"></span><span class="clock"></span><span class="dot netdot"></span></div></div>`;
  side.onclick = e => { const b = e.target.closest('[data-t]'); if (b) go(b.dataset.t); };
  $('#sbu').onclick = () => {
    const m = modal(me.name, `<p class="muted">${esc(ROLES[me.role] || '')}</p><div class="bigbtns"><button class="btn xl bad" id="lo" type="button">Chiqish</button></div>`);
    $('#lo', m.el).onclick = async () => { try { await POST('logout'); } catch { } LS.set('token', ''); m.close(); loginView(); };
  };
  $('#toPl').onclick = () => { sessionStorage.setItem('zm_mode', 'planshet'); enter(); };
  sideShift();
}
function sideShift() {
  const el = $('#sbShift'); if (!el || !S.boot) return;
  const sh = S.boot.shift;
  el.innerHTML = sh ? `<span class="tag tayyor">Smena ochiq · ${timeOf(sh.opened_at)}</span>` : '<span class="tag bekor">Smena yopiq</span>';
}
function removeSide() { const s = $('#side'); if (s) s.parentNode.removeChild(s); }

// ------------------------------------------------------------------ smena ochish / yopish
function openShiftModal(after) {
  const m = modal('Smenani ochish', `<p class="muted">Kassadagi boshlang'ich naqd pulni kiriting (sanab ko'ring).</p>
    <label class="f"><span>Kassadagi naqd pul</span>${moneyIn('oc')}</label>
    <div class="row end"><button class="btn p lg" id="ok" type="button">Smenani ochish</button></div>`);
  setTimeout(() => $('#oc', m.el).focus(), 50);
  const ok = safe(async () => { await POST('shift/open', { open_cash: digits($('#oc', m.el).value) }); await reloadBoot(); m.close(); toast('Smena ochildi'); sideShift(); after ? after() : render(); });
  $('#ok', m.el).onclick = ok; $('#oc', m.el).onkeydown = e => e.key === 'Enter' && ok();
}
function shiftTable(sh) {
  const M = sh.methods;
  return `<div class="tbl-wrap"><table class="mt"><thead><tr><th>To'lov usuli</th><th class="num">Savdo</th><th class="num">Kirim</th><th class="num">Chiqim</th><th class="num">Qoldiq</th></tr></thead><tbody>
    ${['naqd', 'terminal', 'otkazma', 'qarz'].map(k => `<tr><td>${MNAME(k)}</td><td class="num">${fmt(M[k].sales)}</td><td class="num">${M[k].in ? '+' + fmt(M[k].in) : '—'}</td><td class="num">${M[k].out ? '−' + fmt(M[k].out) : '—'}</td><td class="num"><b>${fmt(M[k].balance)}</b></td></tr>`).join('')}
    </tbody></table></div>`;
}
function closeShiftModal(sh) {
  const m = modal('Smenani yopish (Z-hisobot)', `<div class="grid g3">
      <div class="stat"><div class="label">Cheklar</div><div class="big">${sh.sales_count}</div><div class="small muted">${sum(sh.sales_total)}</div></div>
      <div class="stat"><div class="label">Qaytarishlar</div><div class="big">${sh.refund_count}</div><div class="small muted">${sum(sh.refund_total)}</div></div>
      <div class="stat"><div class="label">Kassada bo'lishi kerak (naqd)</div><div class="big">${fmt(sh.expected_cash)}</div><div class="small muted">boshida ${fmt(sh.open_cash)}</div></div></div>
    ${shiftTable(sh)}
    <label class="f" style="margin-top:12px"><span>Sanab chiqilgan naqd pul</span>${moneyIn('cnt', sh.expected_cash)}</label>
    <div id="diff" class="sum-box"></div>
    <label class="f"><span>Izoh</span><input id="nt"></label>
    <div class="row end"><button class="btn bad lg" id="ok" type="button">Smenani yopish</button></div>`, { wide: true });
  const upd = () => { const d = digits($('#cnt', m.el).value) - sh.expected_cash; $('#diff', m.el).innerHTML = d === 0 ? '<b class="pos">✓ Kassa to\'g\'ri</b>' : d < 0 ? `<b class="neg">Kamomad: ${sum(-d)}</b>` : `<b class="pos">Ortiqcha: ${sum(d)}</b>`; };
  $('#cnt', m.el).addEventListener('input', upd); upd();
  $('#ok', m.el).onclick = safe(async () => {
    const r = await POST('shift/close', { counted: digits($('#cnt', m.el).value), note: $('#nt', m.el).value });
    await reloadBoot(); m.close(); sideShift(); toast('Smena yopildi'); printZ(r); render();
  });
}

// ------------------------------------------------------------------ chek chiqarish
function receiptHtml(o) {
  const shop = esc(S.boot.settings.shop_name || 'Zamena');
  const pays = (o.payments || []).filter(p => p.amount).map(p => `<div class="rl"><span>${MNAME(p.method)}</span><span>${fmt(Math.abs(p.amount))}</span></div>`).join('');
  return `<div style="text-align:center"><b>${shop}</b><br>${o.type === 'qaytarish' ? 'QAYTARISH ' : 'Chek '}#${o.id}${o.parent_id ? ` (chek #${o.parent_id})` : ''}<br>${dateOf(o.closed_at)} ${timeOf(o.closed_at)}</div>
    ${o.plate ? `<div>Mashina: ${plateFmt(o.plate)} ${esc(o.model || '')}</div><div>Probeg: ${km(o.mileage)} · keyingisi: ${km(o.next_mileage)}</div>` : ''}
    ${o.customer_name || o.customer_phone ? `<div>Mijoz: ${esc(o.customer_name || '')} ${o.customer_phone ? phoneShow(o.customer_phone) : ''}</div>` : ''}<hr>
    ${o.items.map(i => `<div>${esc(i.name)}</div><div class="rl"><span>&nbsp; ${qtyFmt(Math.abs(i.qty))} × ${fmt(i.price)}</span><span>${i.is_bonus ? 'BONUS' : fmt(Math.abs(i.qty * i.price))}</span></div>`).join('')}<hr>
    ${o.discount ? `<div class="rl"><span>Chegirma</span><span>−${fmt(o.discount)}</span></div>` : ''}${o.cashback_used ? `<div class="rl"><span>Keshbekdan</span><span>−${fmt(o.cashback_used)}</span></div>` : ''}
    <div class="rl"><b>JAMI</b><b>${fmt(Math.abs(o.total))} so'm</b></div>${pays}${o.change_given ? `<div class="rl"><span>Qaytim</span><span>${fmt(o.change_given)}</span></div>` : ''}
    ${o.cashback_earned > 0 ? `<div class="rl"><span>Keshbek</span><span>+${fmt(o.cashback_earned)}</span></div>` : ''}${o.paid_debt > 0 ? `<div class="rl"><span>Qarz qoldi</span><span>${fmt(o.customer_debt)}</span></div>` : ''}
    <div>Kassir: ${esc(o.cashier_name || '')}</div><div style="text-align:center">Rahmat!</div>`;
}
function printHtml(html) {
  let r = $('#receipt'); if (!r) { r = document.createElement('div'); r.id = 'receipt'; document.body.appendChild(r); }
  r.innerHTML = html; window.print();
}
function printReceipt(o) { printHtml(receiptHtml(o)); }
function printZ(sh) {
  printHtml(`<div style="text-align:center"><b>Z-HISOBOT</b><br>Smena #${sh.id}</div><div>${dateOf(sh.opened_at)} ${timeOf(sh.opened_at)} — ${timeOf(sh.closed_at)}</div><div>Kassir: ${esc(sh.employee_name || '')}</div><hr>
    <div class="rl"><span>Cheklar</span><span>${sh.sales_count} · ${fmt(sh.sales_total)}</span></div><div class="rl"><span>Qaytarish</span><span>${sh.refund_count} · ${fmt(sh.refund_total)}</span></div><hr>
    ${['naqd', 'terminal', 'otkazma', 'qarz'].map(k => `<div class="rl"><span>${MNAME(k)}</span><span>${fmt(sh.methods[k].balance)}</span></div>`).join('')}<hr>
    <div class="rl"><span>Boshida</span><span>${fmt(sh.open_cash)}</span></div><div class="rl"><span>Bo'lishi kerak</span><span>${fmt(sh.expected)}</span></div>
    <div class="rl"><b>Sanaldi</b><b>${fmt(sh.counted)}</b></div><div class="rl"><span>Farq</span><span>${fmt(sh.counted - sh.expected)}</span></div>`);
}

// ------------------------------------------------------------------ Bosh sahifa
VIEWS.bosh = async () => {
  const d = today();
  const [r, t, debts, sh] = await Promise.all([GET(`reports/summary?from=${d}&to=${d}`), GET('today'), GET('reports/debts'), GET('shift')]);
  S.boot.shift = sh; sideShift();
  const h = r.head;
  const tile = (label, v, sub = '', cls = '') => `<div class="card stat"><div class="label">${label}</div><div class="big ${cls}">${v}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>`;
  $('#app').innerHTML = `<div class="kpage">
    <div class="row khead"><h2 class="sp">Bugun, ${dateOf(d)}</h2><button class="btn p lg" id="pos" type="button">${ic('pos')} POS — sotuvga kirish</button></div>
    <div class="grid g4">${tile('Tushum', fmt(h.revenue), `${h.receipts} ta chek`)}${tile("O'rtacha chek", fmt(h.avg_check))}
      ${tile('Jarayondagi zamena', t.open.length + ' ta', `bugun jami ${t.count} ta mashina`)}${'profit' in h ? tile('Yalpi foyda', fmt(h.profit), 'tushum − tannarx', h.profit < 0 ? 'neg' : 'pos') : tile('Qaytarishlar', fmt(h.refunds), `${h.refund_count} ta`)}</div>
    <div class="grid g2">
      <div class="card"><div class="row"><h3 class="sp">Smena</h3>${sh ? `<button class="btn" id="cls" type="button">Smenani yopish</button>` : `<button class="btn p" id="opn" type="button">Smenani ochish</button>`}</div>
        ${sh ? `<p class="muted">#${sh.id} · ${esc(sh.employee_name || '')} · ${timeOf(sh.opened_at)} dan · kassada naqd <b>${sum(sh.expected_cash)}</b></p>${shiftTable(sh)}` : '<div class="empty">Smena yopiq. Sotuv qilish uchun smenani oching.</div>'}</div>
      <div class="card"><h3>Qarzlar</h3>
        <div class="kv"><span>Mijozlar bizga qarz</span><b class="${debts.customer_total ? 'neg' : ''}">${sum(debts.customer_total)}</b></div>
        <div class="kv"><span>Biz yetkazib beruvchilarga qarz</span><b class="${debts.supplier_total ? 'neg' : ''}">${sum(debts.supplier_total)}</b></div>
        <div class="row" style="margin-top:10px"><button class="btn sm" data-go="mijoz" type="button">Mijozlar</button><button class="btn sm" data-go="taminot" type="button">Yetkazib beruvchilar</button></div>
        <h3 style="margin-top:16px">Bugun to'lov usullari</h3>
        ${r.by_method.length ? r.by_method.map(x => `<div class="kv"><span>${MNAME(x.method)}</span><b>${fmt(x.amount)}</b></div>`).join('') : '<div class="muted">Hali savdo yo\'q</div>'}</div></div></div>`;
  $('#pos').onclick = () => go('pos');
  if (sh) $('#cls').onclick = () => closeShiftModal(sh); else $('#opn').onclick = () => openShiftModal();
  $$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
};

// ================================================================== POS
const newSale = () => ({ items: [], customer: null, discount: 0 });
function posState() {
  if (!S.pos) S.pos = { mode: 'sotuv', cat: '', q: '', sale: LS.get('pos_sale', null) || newSale(), zid: null, zsale: null, zlist: [] };
  return S.pos;
}
const saveSale = () => LS.set('pos_sale', S.pos.sale);
const prodTile = p => p.image_url ? `<img class="pimg" src="${esc(p.image_url)}" alt="" loading="lazy">`
  : `<span class="pimg ph ${p.category}">${esc(p.category === 'moy' ? (p.grade || 'MOY') : (FNAME[p.kind] || CATS[p.category] || '').replace(' filtri', ''))}</span>`;

VIEWS.pos = async () => {
  const P = posState();
  $('#app').innerHTML = `<div class="posx">
    <header class="pos-top"><button class="pbtn" id="toPanel" type="button">${ic('back')}<span>Panel</span></button>
      <div class="pos-title">${esc(S.boot.settings.shop_name || 'Zamena')} <span class="muted">· POS</span></div><span class="sp"></span>
      <button class="pos-shift" id="pshift" type="button"></button><span class="pos-user">${ic('users', 'sm')} ${esc(S.boot.me.name)}</span><span class="clock"></span></header>
    <div class="pos-body">
      <nav class="pos-rail"><button data-pm="sotuv" type="button">${ic('cart')}<span>Sotuv</span></button>
        <button data-pm="zamena" type="button">${ic('wrench')}<span>Zamena</span><b class="rbadge" id="zcnt" hidden></b></button></nav>
      <section class="pos-left" id="posL"></section>
      <aside class="pos-cart" id="posC"></aside></div></div>`;
  $('#toPanel').onclick = () => go('bosh');
  $('.pos-rail').onclick = e => { const b = e.target.closest('[data-pm]'); if (b) { P.mode = b.dataset.pm; posDraw(); } };
  posDraw();
  posZamenaRefresh();
};
function posShiftChip() {
  const el = $('#pshift'); if (!el) return;
  const sh = S.boot.shift;
  el.className = 'pos-shift ' + (sh ? 'on' : 'off');
  el.innerHTML = sh ? `Smena #${sh.id} · ${timeOf(sh.opened_at)} dan` : 'Smena yopiq — ochish';
  el.onclick = () => sh ? go('kassa') : openShiftModal(() => posShiftChip());
}
function posDraw() {
  const P = S.pos;
  $$('.pos-rail [data-pm]').forEach(b => b.classList.toggle('on', b.dataset.pm === P.mode));
  posShiftChip();
  if (P.mode === 'sotuv') posProducts(); else posZamenaList();
  posCart();
}
// ---- Sotuv: mahsulotlar
function posProducts() {
  const P = S.pos, L = $('#posL');
  L.innerHTML = `<div class="pos-search"><div class="sbox">${ic('search')}<input id="pq" placeholder="Nomi yoki shtrix-kod (F2)" value="${esc(P.q)}" autocomplete="off"></div>
    <div class="chips" id="pcat">${[['', 'Hammasi'], ...Object.entries(CATS)].map(([k, v]) => `<button class="chip ${k === P.cat ? 'on' : ''}" data-c="${k}" type="button">${v}</button>`).join('')}</div></div>
    <div class="pgrid" id="pgrid"></div>`;
  const grid = () => {
    const q = P.q.trim().toLowerCase();
    const list = S.boot.products.filter(p => p.active && (!P.cat || p.category === P.cat) && (!q || p.name.toLowerCase().includes(q) || (p.barcode && p.barcode === P.q.trim())));
    $('#pgrid').innerHTML = list.map(p => `<button class="pcard" data-id="${p.id}" type="button">${prodTile(p)}<span class="pn">${esc(p.name)}</span>
      <span class="prow"><b>${fmt(p.price)}</b><small class="${p.stock <= 0 && p.category !== 'xizmat' ? 'neg' : 'muted'}">${p.category === 'xizmat' ? 'xizmat' : qtyFmt(p.stock) + ' ' + esc(p.unit)}</small></span></button>`).join('') || '<div class="empty">Topilmadi</div>';
  };
  $('#pq').oninput = e => { P.q = e.target.value; grid(); };
  $('#pq').onkeydown = e => {
    if (e.key !== 'Enter') return;
    const q = P.q.trim(); if (!q) return;
    const exact = S.boot.products.find(p => p.active && p.barcode && p.barcode === q);
    const hits = S.boot.products.filter(p => p.active && p.name.toLowerCase().includes(q.toLowerCase()));
    const p = exact || (hits.length === 1 ? hits[0] : null);
    if (p) { posAdd(p); P.q = ''; e.target.value = ''; grid(); }
  };
  $('#pcat').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; P.cat = b.dataset.c; $$('#pcat .chip').forEach(x => x.classList.toggle('on', x === b)); grid(); };
  $('#pgrid').onclick = e => { const b = e.target.closest('[data-id]'); if (b) posAdd(prod(b.dataset.id)); };
  grid();
}
function posAdd(p) {
  const P = S.pos;
  const s = P.mode === 'sotuv' ? P.sale : P.zsale;
  if (!s) return toast('Avval chapdan mashinani tanlang', true);
  const ex = s.items.find(i => i.product_id === p.id && !i.is_bonus);
  if (ex) ex.qty = +ex.qty + 1; else s.items.push({ product_id: p.id, name: p.name, category: p.category, qty: 1, price: p.price, is_bonus: false });
  s.dirty = true;
  if (P.mode === 'sotuv') saveSale();
  posCart();
}
// ---- Zamena: jarayondagi mashinalar
async function posZamenaRefresh() {
  const P = S.pos; if (!P) return;
  try { P.zlist = (await GET('orders?status=open')).filter(o => o.type === 'zamena'); } catch { return; }
  const c = $('#zcnt'); if (c) { c.hidden = !P.zlist.length; c.textContent = P.zlist.length; }
  if (P.zid && !P.zlist.some(o => o.id === P.zid)) { P.zid = null; P.zsale = null; if (P.mode === 'zamena') posCart(); }
  if (P.mode === 'zamena') posZamenaList();
}
function posZamenaList() {
  const P = S.pos, L = $('#posL'); if (!L) return;
  L.innerHTML = `<div class="zhead"><h3>Jarayondagi mashinalar <span class="cnt-pill">${P.zlist.length}</span></h3><span class="muted small">Planshetdan «Kassaga o'tkazish» qilingan mashinalar</span></div>
    <div class="zgrid">${P.zlist.map(o => `<button class="zcard ${o.status} ${P.zid === o.id ? 'on' : ''}" data-z="${o.id}" type="button">
      <span class="row"><span class="plate-mini">${plateFmt(o.plate)}</span><span class="tag ${o.status}">${STATUS[o.status]}</span></span>
      <span class="zcar">${carDesc(o)}</span><span class="small muted">${esc(o.customer_name || '')} · usta: ${esc(o.master_name || '—')} · ${timeOf(o.created_at)}</span>
      <span class="small">${orderLine(o) || '—'}</span><b class="zsum">${sum(o.subtotal)}</b></button>`).join('') || '<div class="empty">Hozir jarayonda mashina yo\'q</div>'}</div>`;
  L.onclick = e => {
    const b = e.target.closest('[data-z]'); if (!b) return;
    const o = P.zlist.find(x => x.id === +b.dataset.z);
    P.zid = o.id;
    P.zsale = { order: o, items: itemsFromOrder(o), discount: 0, dirty: false,
      customer: o.customer_id ? { id: o.customer_id, name: o.customer_name, phone: o.customer_phone, cashback: o.customer_cashback || 0, debt: o.customer_debt || 0 } : null };
    $$('.zcard').forEach(x => x.classList.toggle('on', x === b));
    posCart();
  };
}
// ---- Savat (o'ng tomon)
function posCart() {
  const P = S.pos, C = $('#posC'); if (!C) return;
  const s = P.mode === 'sotuv' ? P.sale : P.zsale;
  if (!s) { C.innerHTML = `<div class="cart-empty">${ic('wrench')}<p>Chapdan mashinani tanlang — uning zakazi shu yerda chiqadi va to'lovni qabul qilasiz.</p></div>`; return; }
  const z = P.mode === 'zamena';
  const subtotal = s.items.reduce((a, i) => a + (i.is_bonus ? 0 : Math.round((+i.price || 0) * (+i.qty || 0))), 0);
  const total = Math.max(subtotal - (s.discount || 0), 0);
  const cu = s.customer;
  C.innerHTML = `<div class="cart-head">
      ${z ? `<div class="row"><span class="plate-mini">${plateFmt(s.order.plate)}</span><span class="sp">${carDesc(s.order)}</span><span class="muted small">#${s.order.id}</span></div>` : ''}
      ${cu ? `<div class="cust on"><span class="av">${esc((cu.name || '?').slice(0, 1).toUpperCase())}</span><span class="sp"><b>${esc(cu.name || 'Ismsiz')}</b><small>${cu.phone ? phoneShow(cu.phone) : ''}</small>
          <small>Keshbek: <b class="pos">${fmt(cu.cashback)}</b>${cu.debt ? ` · Qarz: <b class="neg">${fmt(cu.debt)}</b>` : ''}</small></span>${z ? '' : `<button class="xbtn" id="unc" type="button" title="Olib tashlash">${ic('x')}</button>`}</div>`
        : `<button class="cust" id="pickc" type="button">${ic('users')}<span class="sp">Mijoz tanlash <small>F3 · keshbek va qarz uchun</small></span>${ic('plus', 'sm')}</button>`}
    </div>
    <div class="cart-lines" id="lines">${s.items.map((it, i) => {
      const line = it.is_bonus ? 0 : Math.round((+it.price || 0) * (+it.qty || 0));
      return `<div class="cl" data-i="${i}"><div class="cl1"><span class="tag ${it.category}">${CATS[it.category] || ''}</span><span class="sp cln">${esc(it.name)}</span><button class="xbtn" data-del type="button">${ic('x', 'sm')}</button></div>
        <div class="cl2"><span class="qty-ctl"><button data-q="-1" type="button">−</button><input data-k="qty" value="${qtyFmt(it.qty)}" inputmode="decimal"><button data-q="1" type="button">+</button></span>
          <span class="muted">×</span><input class="pr" data-k="price" value="${it.is_bonus ? 0 : it.price}" inputmode="numeric" ${it.is_bonus ? 'disabled' : ''}>
          <button class="gift ${it.is_bonus ? 'on' : ''}" data-b type="button" title="Bonus (tekin)">🎁</button><b class="sp num">${it.is_bonus ? 'tekin' : fmt(line)}</b></div></div>`;
    }).join('') || '<div class="empty">Mahsulot tanlang (chapdan) yoki shtrix-kodni skanerlang</div>'}</div>
    <div class="cart-foot">
      <button class="btn sm" id="addp" type="button">${ic('plus', 'sm')} Mahsulot qo'shish</button>
      <div class="kv"><span>Mahsulotlar (${s.items.length})</span><b>${fmt(subtotal)}</b></div>
      <div class="kv"><span>Chegirma</span>${moneyIn('disc', s.discount)}</div>
      <div class="kv tot"><span>Jami</span><b id="ctot">${sum(total)}</b></div>
      <div class="row"><button class="btn bad" id="clr" type="button">${z ? 'Zakazni bekor qilish' : 'Tozalash'}</button>
        <button class="btn ok xl sp" id="pay" type="button" ${s.items.length || total ? '' : 'disabled'}>To'lash · F9</button></div></div>`;
  const L = $('#lines');
  L.onclick = e => {
    const r = e.target.closest('[data-i]'); if (!r) return; const it = s.items[r.dataset.i];
    const q = e.target.closest('[data-q]');
    if (q) { it.qty = Math.max(0, Math.round((+it.qty + +q.dataset.q) * 100) / 100); if (!it.qty) s.items.splice(r.dataset.i, 1); }
    else if (e.target.closest('[data-del]')) s.items.splice(r.dataset.i, 1);
    else if (e.target.closest('[data-b]')) it.is_bonus = !it.is_bonus;
    else return;
    s.dirty = true; if (!z) saveSale(); posCart();
  };
  L.onchange = e => {
    const r = e.target.closest('[data-i]'); if (!r) return; const it = s.items[r.dataset.i], k = e.target.dataset.k;
    if (k === 'qty') { const v = parseFloat(String(e.target.value).replace(',', '.')); it.qty = v > 0 ? v : 0; if (!it.qty) s.items.splice(r.dataset.i, 1); }
    if (k === 'price') it.price = digits(e.target.value);
    s.dirty = true; if (!z) saveSale(); posCart();
  };
  $('#disc').addEventListener('input', e => { s.discount = Math.min(digits(e.target.value), subtotal); $('#ctot').textContent = sum(Math.max(subtotal - s.discount, 0)); if (!z) saveSale(); });
  $('#addp').onclick = () => pickProduct(p => posAdd(p));
  if ($('#pickc')) $('#pickc').onclick = () => pickCustomer(c => { s.customer = c; if (!z) saveSale(); posCart(); });
  if ($('#unc')) $('#unc').onclick = () => { s.customer = null; saveSale(); posCart(); };
  $('#clr').onclick = safe(async () => {
    if (!z) { if (s.items.length && !(await confirmBox('Savat tozalansinmi?'))) return; P.sale = newSale(); saveSale(); return posCart(); }
    if (!(await confirmBox(`Zakaz #${s.order.id} (${plateFmt(s.order.plate)}) bekor qilinsinmi? Mahsulotlar omborga qaytadi.`))) return;
    await POST(`orders/${s.order.id}/cancel`); P.zid = null; P.zsale = null; toast('Zakaz bekor qilindi'); posZamenaRefresh(); posCart();
  });
  $('#pay').onclick = () => posPay();
}
async function posPay() {
  const P = S.pos, z = P.mode === 'zamena', s = z ? P.zsale : P.sale;
  if (!s || !s.items.length) return toast("Savat bo'sh", true);
  if (!S.boot.shift) return openShiftModal(() => { posShiftChip(); posPay(); });
  const subtotal = s.items.reduce((a, i) => a + (i.is_bonus ? 0 : Math.round((+i.price || 0) * (+i.qty || 0))), 0);
  const total = Math.max(subtotal - (s.discount || 0), 0);
  payModal(total, s.customer, safe(async pay => {
    let o;
    if (z) {
      if (s.dirty) await PUT('orders/' + s.order.id, { items: itemsPayload(s.items) });
      o = await POST(`orders/${s.order.id}/close`, { discount: s.discount || 0, ...pay });
      P.zid = null; P.zsale = null; posZamenaRefresh();
    } else {
      o = await POST('orders', { type: 'sotuv', customer_id: s.customer ? s.customer.id : null, items: itemsPayload(s.items),
        close: { discount: s.discount || 0, customer_id: s.customer ? s.customer.id : null, ...pay } });
      P.sale = newSale(); saveSale();
    }
    await reloadBoot();
    posDraw();
    doneModal(o);
  }));
}
function doneModal(o) {
  const m = modal("To'lov qabul qilindi", `<div class="done-big">${sum(o.total)}</div>
    ${o.change_given ? `<div class="done-change">Qaytim: <b>${sum(o.change_given)}</b></div>` : ''}
    <p class="muted center">Chek #${o.id}${o.cashback_earned ? ` · keshbek +${fmt(o.cashback_earned)}` : ''}${o.paid_debt ? ` · qarzga ${fmt(o.paid_debt)}` : ''}</p>
    <div class="bigbtns"><button class="btn xl" id="pr" type="button">${ic('print')} Chek chiqarish</button><button class="btn p xl" id="nx" type="button">Yangi sotuv (Enter)</button></div>`);
  $('#pr', m.el).onclick = () => printReceipt(o);
  $('#nx', m.el).onclick = m.close;
  setTimeout(() => $('#nx', m.el).focus(), 50);
}
// ---- To'lov oynasi (Naqd F6, Terminal F7, O'tkazma F8, Qarzga F10)
function payModal(total, cust, onDone) {
  const m = modal("To'lov", `<div class="paygrid">
      <div class="paym">${PM.map(([k, n, key]) => `<div class="pmrow ${k === 'qarz' && !cust ? 'dis' : ''}"><button class="pmbtn" data-m="${k}" type="button" ${k === 'qarz' && !cust ? 'disabled title="Qarzga sotish uchun mijozni tanlang"' : ''}><span>${n}</span><small>${key}</small></button>${moneyIn('pa_' + k)}</div>`).join('')}
        ${cust && cust.cashback > 0 ? `<div class="pmrow"><span class="pmlbl">Keshbekdan<small>balans ${fmt(cust.cashback)}</small></span>${moneyIn('pa_cb')}</div>` : ''}
        ${!cust ? '<p class="small muted">Qarzga sotish va keshbek uchun savatda mijozni tanlang.</p>' : ''}</div>
      <div class="paysum"><div class="kv"><span>To'lash kerak</span><b id="pneed"></b></div><div class="kv"><span>Kiritildi</span><b id="pgot"></b></div>
        <div class="prest" id="prest"></div><button class="btn ok xl" id="pdone" type="button" style="width:100%">To'lovni yakunlash · Enter</button></div></div>`, { wide: true });
  const val = k => digits(($('#pa_' + k, m.el) || {}).value);
  const set = (k, v) => { const el = $('#pa_' + k, m.el); if (el) el.value = v ? fmt(v) : ''; };
  const cbMax = cust ? Math.min(cust.cashback || 0, total) : 0;
  const need = () => total - Math.min(val('cb'), cbMax);
  const got = () => PM.reduce((a, [k]) => a + val(k), 0);
  const upd = () => {
    if ($('#pa_cb', m.el) && val('cb') > cbMax) set('cb', cbMax);
    const n = need(), g = got(), d = g - n;
    $('#pneed', m.el).textContent = sum(n); $('#pgot', m.el).textContent = sum(g);
    const r = $('#prest', m.el);
    if (d < 0) { r.className = 'prest neg'; r.innerHTML = `Qoldi: <b>${sum(-d)}</b>`; }
    else if (d > 0) { const ok = val('naqd') >= d; r.className = 'prest ' + (ok ? 'pos' : 'neg'); r.innerHTML = ok ? `Qaytim: <b>${sum(d)}</b>` : `Ortiqcha: <b>${sum(d)}</b> (faqat naqddan qaytim beriladi)`; }
    else { r.className = 'prest pos'; r.innerHTML = '✓ To\'liq'; }
  };
  // Usul tugmasi: qolgan summani shu usulga yozadi; qoldiq bo'lmasa — butun summa shu usulga o'tadi
  const fill = k => {
    if (k === 'qarz' && !cust) return;
    const others = PM.reduce((a, [x]) => a + (x === k ? 0 : val(x)), 0);
    if (need() - others > 0) set(k, need() - others);
    else { PM.forEach(([x]) => set(x, x === k ? need() : 0)); }
    upd(); const el = $('#pa_' + k, m.el); el.focus(); el.select();
  };
  set('naqd', total); upd();
  m.el.addEventListener('input', upd);
  $('.paym', m.el).onclick = e => { const b = e.target.closest('[data-m]'); if (b && !b.disabled) fill(b.dataset.m); };
  const done = () => {
    const n = need(), g = got();
    if (g < n) return toast(`To'lov yetarli emas: yana ${sum(n - g)} kerak`, true);
    if (g > n && val('naqd') < g - n) return toast('Ortiqcha summa — faqat naqddan qaytim beriladi', true);
    const payments = PM.map(([k]) => ({ method: k, amount: val(k) })).filter(p => p.amount);
    m.close(); onDone({ payments, cashback_used: Math.min(val('cb'), cbMax) });
  };
  $('#pdone', m.el).onclick = done;
  m.el.addEventListener('keydown', e => {
    const k = { F6: 'naqd', F7: 'terminal', F8: 'otkazma', F10: 'qarz' }[e.key];
    if (k) { e.preventDefault(); fill(k); } else if (e.key === 'Enter') { e.preventDefault(); done(); }
  });
  setTimeout(() => { const el = $('#pa_naqd', m.el); el.focus(); el.select(); }, 50);
}
// ---- Mijoz tanlash / yangi mijoz (F3)
function pickCustomer(onPick) {
  const m = modal('Mijoz tanlash', `<div class="row"><div class="sbox sp">${ic('search')}<input id="cq" placeholder="Telefon, ism yoki mashina raqami" autocomplete="off"></div>
      <button class="btn p" id="cnew" type="button">${ic('plus', 'sm')} Yangi mijoz</button></div>
    <div class="picker-list" id="cl" style="margin-top:10px"><div class="empty">Qidirish uchun yozing</div></div>`, { wide: true });
  let timer = null;
  const search = async () => {
    const q = $('#cq', m.el).value.trim();
    const list = await GET('customers?q=' + encodeURIComponent(q.replace(/^\+?998/, '').replace(/\s/g, '')));
    $('#cl', m.el).innerHTML = list.slice(0, 50).map(c => `<div class="pi" data-id="${c.id}"><span class="av sm">${esc((c.name || '?').slice(0, 1).toUpperCase())}</span>
      <span class="sp"><b>${esc(c.name || 'Ismsiz')}</b> <span class="muted">${phoneShow(c.phone)}</span><br><small class="muted">${(c.plates || '').split(', ').filter(Boolean).map(plateFmt).join(', ')}</small></span>
      <span class="num small">keshbek ${fmt(c.cashback)}${c.debt ? `<br><b class="neg">qarz ${fmt(c.debt)}</b>` : ''}</span></div>`).join('') || '<div class="empty">Topilmadi — «Yangi mijoz» ni bosing</div>';
    $('#cl', m.el).onclick = e => { const r = e.target.closest('[data-id]'); if (!r) return; const c = list.find(x => x.id === +r.dataset.id); m.close(); onPick({ id: c.id, name: c.name, phone: c.phone, cashback: c.cashback, debt: c.debt || 0 }); };
  };
  $('#cq', m.el).oninput = () => { clearTimeout(timer); timer = setTimeout(safe(search), 250); };
  $('#cq', m.el).onkeydown = e => { if (e.key === 'Enter') { const f = $('#cl .pi', m.el); if (f) f.click(); } };
  $('#cnew', m.el).onclick = () => customerForm(null, c => { m.close(); onPick({ id: c.id, name: c.name, phone: c.phone, cashback: c.cashback, debt: c.debt || 0 }); });
  setTimeout(() => $('#cq', m.el).focus(), 50);
  safe(search)();
}
function customerForm(c, onSaved) {
  const m = modal(c ? 'Mijozni tahrirlash' : 'Yangi mijoz', `<label class="f"><span>Ism</span><input id="nm" value="${esc(c?.name || '')}" autocomplete="off"></label>
    <label class="f"><span>Telefon</span><div class="phone-in sm"><span>+998</span><input id="ph" inputmode="numeric" value="${esc(phoneFmt(c?.phone || ''))}" placeholder="90 123 45 67"></div></label>
    <label class="f"><span>Izoh</span><input id="no" value="${esc(c?.note || '')}"></label>
    <div class="row end"><button class="btn p" id="sv" type="button">Saqlash</button></div>`);
  $('#ph', m.el).oninput = e => { e.target.value = phoneFmt(e.target.value); };
  setTimeout(() => $('#nm', m.el).focus(), 50);
  $('#sv', m.el).onclick = safe(async () => {
    const ph = $('#ph', m.el).value.replace(/\D/g, '');
    const b = { name: $('#nm', m.el).value.trim(), phone: ph ? '998' + ph : '', note: $('#no', m.el).value };
    const r = c ? await PUT('customers/' + c.id, b) : await POST('customers', b);
    m.close(); toast('Saqlandi'); onSaved && onSaved(r);
  });
}
// POS klaviatura tugmalari: F2 qidiruv, F3 mijoz, F9 to'lov
document.addEventListener('keydown', e => {
  if (S.tab !== 'pos' || $$('.modal-bg').length) return;
  if (e.key === 'F2') { e.preventDefault(); if (S.pos.mode !== 'sotuv') { S.pos.mode = 'sotuv'; posDraw(); } $('#pq')?.focus(); }
  else if (e.key === 'F3') { e.preventDefault(); $('#pickc')?.click(); }
  else if (e.key === 'F9') { e.preventDefault(); posPay(); }
});

// ================================================================== Cheklar
const TYPES = { zamena: 'Zamena', sotuv: 'Sotuv', qaytarish: 'Qaytarish' };
const payChips = o => (o.payments || []).filter(p => p.amount).map(p => `<span class="mchip ${p.method}">${MNAME(p.method)}</span>`).join(' ');
VIEWS.cheklar = async () => {
  const pb = periodBar('chkP', 'today');
  const f = S.ctx.chk || (S.ctx.chk = { q: '', type: '', cashier: '' });
  const cashiers = S.boot.employees.filter(e => ['kassir', 'admin'].includes(e.role));
  const list = await GET(`orders?status=yopilgan&${pb.q}&type=${f.type}&cashier=${f.cashier}&q=${encodeURIComponent(f.q)}`);
  const sales = list.filter(o => o.type !== 'qaytarish'), refunds = list.filter(o => o.type === 'qaytarish');
  $('#app').innerHTML = `<div class="kpage"><div class="row khead"><h2 class="sp">Cheklar</h2></div>${pb.html}
    <div class="card row"><div class="sbox sp">${ic('search')}<input id="cq" placeholder="Chek №, mashina raqami, mijoz ismi yoki telefoni" value="${esc(f.q)}"></div>
      <div class="chips" id="ct">${[['', 'Hammasi'], ...Object.entries(TYPES)].map(([k, v]) => `<button class="chip ${f.type === k ? 'on' : ''}" data-ty="${k}" type="button">${v}</button>`).join('')}</div>
      <select id="cc" style="width:auto"><option value="">Barcha kassirlar</option>${cashiers.map(e => `<option value="${e.id}" ${+f.cashier === e.id ? 'selected' : ''}>${esc(e.name)}</option>`).join('')}</select></div>
    <div class="grid g4"><div class="card stat"><div class="label">Cheklar</div><div class="big">${sales.length}</div></div>
      <div class="card stat"><div class="label">Savdo</div><div class="big">${fmt(sales.reduce((a, o) => a + o.total, 0))}</div></div>
      <div class="card stat"><div class="label">Qaytarishlar</div><div class="big">${fmt(-refunds.reduce((a, o) => a + o.total, 0))}</div><div class="small muted">${refunds.length} ta</div></div>
      <div class="card stat"><div class="label">Sof tushum</div><div class="big">${fmt(list.reduce((a, o) => a + o.total, 0))}</div></div></div>
    <div class="card"><div class="tbl-wrap"><table><thead><tr><th>№</th><th>Vaqt</th><th>Turi</th><th>Mijoz / mashina</th><th>Kassir</th><th>To'lov</th><th class="num">Summa</th></tr></thead><tbody>
      ${list.map(o => `<tr class="click" data-id="${o.id}"><td><b>#${o.id}</b></td><td>${dateOf(o.closed_at)} ${timeOf(o.closed_at)}</td>
        <td><span class="tag ${o.type === 'qaytarish' ? 'bekor' : o.type === 'zamena' ? 'jarayonda' : 'yopilgan'}">${TYPES[o.type]}</span>${o.refunded ? ' <span class="tag bekor">qaytarilgan</span>' : ''}</td>
        <td>${o.plate ? `<span class="plate-mini sm">${plateFmt(o.plate)}</span> ` : ''}${esc(o.customer_name || '')}</td><td>${esc(o.cashier_name || '')}</td><td>${payChips(o)}</td>
        <td class="num ${o.total < 0 ? 'neg' : ''}"><b>${fmt(o.total)}</b></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Chek yo\'q</td></tr>'}</tbody></table></div></div></div>`;
  pb.bind();
  $('#cq').onkeydown = e => { if (e.key === 'Enter') { f.q = e.target.value.trim(); render(); } };
  $('#ct').onclick = e => { const b = e.target.closest('[data-ty]'); if (b) { f.type = b.dataset.ty; render(); } };
  $('#cc').onchange = e => { f.cashier = e.target.value; render(); };
  $$('tr[data-id]').forEach(tr => tr.onclick = safe(() => receiptCard(+tr.dataset.id)));
};
async function receiptCard(id) {
  const o = await GET('orders/' + id);
  const canRefund = o.status === 'yopilgan' && o.type !== 'qaytarish' && Math.abs(o.refunded || 0) < Math.abs(o.total) + 1;
  const m = modal(`${TYPES[o.type]} — chek #${o.id}`, `<div class="grid g2"><div>
      <div class="kv"><span>Sana</span><b>${dateOf(o.closed_at)} ${timeOf(o.closed_at)}</b></div><div class="kv"><span>Kassir</span><b>${esc(o.cashier_name || '—')}</b></div>
      ${o.plate ? `<div class="kv"><span>Mashina</span><b>${plateFmt(o.plate)} · ${carDesc(o)}</b></div><div class="kv"><span>Usta / sotuvchi</span><b>${esc(o.master_name || '—')} / ${esc(o.seller_name || '—')}</b></div><div class="kv"><span>Probeg</span><b>${km(o.mileage)}</b></div>` : ''}
      <div class="kv"><span>Mijoz</span><b>${esc(o.customer_name || '—')} ${o.customer_phone ? phoneShow(o.customer_phone) : ''}</b></div>
      ${o.parent_id ? `<div class="kv"><span>Asosiy chek</span><b>#${o.parent_id}</b></div>` : ''}</div>
      <div class="sum-box"><div class="kv"><span>Mahsulotlar</span><b>${fmt(o.subtotal)}</b></div>${o.discount ? `<div class="kv"><span>Chegirma</span><b>−${fmt(o.discount)}</b></div>` : ''}
        ${o.cashback_used ? `<div class="kv"><span>Keshbekdan</span><b>−${fmt(o.cashback_used)}</b></div>` : ''}<div class="kv tot"><span>Jami</span><b>${sum(o.total)}</b></div>
        ${(o.payments || []).map(p => `<div class="kv"><span>${MNAME(p.method)}</span><b>${fmt(p.amount)}</b></div>`).join('')}
        ${o.change_given ? `<div class="kv"><span>Qaytim berildi</span><b>${fmt(o.change_given)}</b></div>` : ''}${o.cashback_earned ? `<div class="kv"><span>Keshbek</span><b>${o.cashback_earned > 0 ? '+' : ''}${fmt(o.cashback_earned)}</b></div>` : ''}
        ${o.refunded ? `<div class="kv neg"><span>Qaytarilgan</span><b>−${fmt(o.refunded)}</b></div>` : ''}</div></div>
    <div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Mahsulot</th><th class="num">Miqdor</th><th class="num">Narx</th><th class="num">Summa</th></tr></thead><tbody>
      ${o.items.map(i => `<tr><td><span class="tag ${i.category}">${CATS[i.category] || ''}</span> ${esc(i.name)}${i.is_bonus ? ' <span class="tag bonus">bonus</span>' : ''}</td><td class="num">${qtyFmt(i.qty)}</td><td class="num">${fmt(i.price)}</td><td class="num">${i.is_bonus ? 'tekin' : fmt(i.qty * i.price)}</td></tr>`).join('')}</tbody></table></div>
    ${(o.refunds || []).length ? `<p class="small muted">Qaytarishlar: ${o.refunds.map(r => `#${r.id} (${fmt(r.total)})`).join(', ')}</p>` : ''}
    <div class="row end" style="margin-top:12px">${canRefund ? `<button class="btn bad" id="rf" type="button">${ic('undo', 'sm')} Qaytarish</button>` : ''}<button class="btn p" id="pr" type="button">${ic('print', 'sm')} Chek chiqarish</button></div>`, { wide: true });
  $('#pr', m.el).onclick = () => printReceipt(o);
  if (canRefund) $('#rf', m.el).onclick = () => { m.close(); refundModal(o); };
}
async function refundModal(o) {
  // allaqachon qaytarilgan miqdorlarni hisoblaymiz
  const done = {};
  for (const r of o.refunds || []) { const ro = await GET('orders/' + r.id); ro.items.forEach(i => { done[i.src_item_id] = (done[i.src_item_id] || 0) - i.qty; }); }
  const lines = o.items.map(i => ({ ...i, left: Math.round((i.qty - (done[i.id] || 0)) * 100) / 100 })).filter(i => i.left > 0);
  if (!lines.length) return toast("Bu chekdagi hamma narsa qaytarilgan", true);
  const ratio = o.subtotal ? o.total / o.subtotal : 0;
  const big = [...(o.payments || [])].sort((p, q) => q.amount - p.amount)[0];
  const defM = big && (big.method !== 'qarz' || o.customer_debt > 0) ? big.method : 'naqd';
  const m = modal(`Qaytarish — chek #${o.id}`, `<p class="muted">Qaytariladigan miqdorni kiriting. Mahsulot omborga qaytadi, pul tanlangan usulda qaytariladi.</p>
    <div class="tbl-wrap"><table><thead><tr><th>Mahsulot</th><th class="num">Mumkin</th><th style="width:120px">Qaytarish</th></tr></thead><tbody>
      ${lines.map(i => `<tr><td>${esc(i.name)}${i.is_bonus ? ' <span class="tag bonus">bonus</span>' : ''}</td><td class="num">${qtyFmt(i.left)}</td><td><input class="inl" data-it="${i.id}" data-max="${i.left}" data-price="${i.price}" inputmode="decimal" placeholder="0"></td></tr>`).join('')}</tbody></table></div>
    <div class="row" style="margin:10px 0"><button class="btn sm" id="all" type="button">Hammasini qaytarish</button></div>
    <label class="f"><span>Pulni qaytarish usuli</span><select id="mt">${['naqd', 'terminal', 'otkazma'].map(k => `<option value="${k}" ${k === defM ? 'selected' : ''}>${MNAME(k)}</option>`).join('')}${o.customer_debt > 0 ? `<option value="qarz" ${defM === 'qarz' ? 'selected' : ''}>Mijoz qarzidan ayirish</option>` : ''}</select>
    ${(o.payments || []).length ? `<p class="small muted">Asl to'lov: ${o.payments.map(p => `${MNAME(p.method)} ${fmt(p.amount)}`).join(', ')}</p>` : ''}</label>
    <label class="f"><span>Sabab / izoh</span><input id="nt"></label>
    <div class="sum-box"><div class="kv tot"><span>Qaytariladigan summa</span><b id="ra">0</b></div><div class="small muted">Chegirma va keshbek ulushi hisobga olingan</div></div>
    <div class="row end" style="margin-top:12px"><button class="btn bad lg" id="ok" type="button">Qaytarish</button></div>`, { wide: true });
  const calc = () => { let g = 0; $$('[data-it]', m.el).forEach(x => { const q = Math.min(+String(x.value).replace(',', '.') || 0, +x.dataset.max); g += Math.round(q * +x.dataset.price); }); $('#ra', m.el).textContent = sum(Math.round(g * ratio)); };
  m.el.addEventListener('input', calc);
  $('#all', m.el).onclick = () => { $$('[data-it]', m.el).forEach(x => { x.value = x.dataset.max; }); calc(); };
  $('#ok', m.el).onclick = safe(async () => {
    const items = $$('[data-it]', m.el).map(x => ({ item_id: +x.dataset.it, qty: +String(x.value).replace(',', '.') || 0 })).filter(x => x.qty > 0);
    if (!items.length) throw new Error('Qaytariladigan miqdorni kiriting');
    if (!S.boot.shift) throw new Error("Smena ochilmagan — avval «Kassa» bo'limida smenani oching");
    const r = await POST(`orders/${o.id}/refund`, { items, method: $('#mt', m.el).value, note: $('#nt', m.el).value });
    m.close(); toast(`Qaytarildi: ${sum(-r.total)}`); await reloadBoot(); render();
  });
}

// ================================================================== Mijozlar
VIEWS.mijoz = async () => {
  const f = S.ctx.mf || (S.ctx.mf = { q: '', debt: '' });
  const list = await GET(`customers?q=${encodeURIComponent(f.q)}&debt=${f.debt}`);
  const debt = list.reduce((a, c) => a + Math.max(c.debt || 0, 0), 0), cb = list.reduce((a, c) => a + c.cashback, 0);
  $('#app').innerHTML = `<div class="kpage"><div class="row khead"><h2 class="sp">Mijozlar</h2><button class="btn p" id="new" type="button">${ic('plus', 'sm')} Yangi mijoz</button></div>
    <div class="card row"><div class="sbox sp">${ic('search')}<input id="q" placeholder="Ism, telefon yoki mashina raqami — Enter" value="${esc(f.q)}"></div>
      <label class="row" style="gap:6px"><input type="checkbox" id="dbt" ${f.debt ? 'checked' : ''} style="width:20px;min-height:20px"> Faqat qarzdorlar</label></div>
    <div class="grid g3"><div class="card stat"><div class="label">Mijozlar</div><div class="big">${list.length}</div></div>
      <div class="card stat"><div class="label">Qarzlari (bizga)</div><div class="big ${debt ? 'neg' : ''}">${fmt(debt)}</div></div>
      <div class="card stat"><div class="label">Keshbek balansi</div><div class="big">${fmt(cb)}</div></div></div>
    <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Mijoz</th><th>Telefon</th><th>Mashinalar</th><th class="num">Xaridlar</th><th class="num">Jami</th><th class="num">Keshbek</th><th class="num">Qarz</th></tr></thead><tbody>
      ${list.map(c => `<tr class="click" data-id="${c.id}"><td><b>${esc(c.name || 'Ismsiz')}</b></td><td>${phoneShow(c.phone)}</td><td>${(c.plates || '').split(', ').filter(Boolean).map(p => `<span class="plate-mini sm">${plateFmt(p)}</span>`).join(' ')}</td>
        <td class="num">${c.visits}</td><td class="num">${fmt(c.spent)}</td><td class="num">${fmt(c.cashback)}</td><td class="num ${c.debt > 0 ? 'neg' : ''}"><b>${c.debt ? fmt(c.debt) : '—'}</b></td></tr>`).join('') || '<tr><td colspan="7" class="empty">Topilmadi</td></tr>'}</tbody></table></div></div></div>`;
  $('#q').onkeydown = e => { if (e.key === 'Enter') { f.q = e.target.value.trim(); render(); } };
  $('#dbt').onchange = e => { f.debt = e.target.checked ? '1' : ''; render(); };
  $('#new').onclick = () => customerForm(null, c => customerCard(c.id));
  $$('tr[data-id]').forEach(tr => tr.onclick = safe(() => customerCard(+tr.dataset.id)));
};
async function customerCard(id) {
  const c = await GET('customers/' + id);
  const m = modal(c.name || phoneShow(c.phone), `<div class="row"><div class="sp"><div class="big2">${esc(c.name || 'Ismsiz')}</div><div class="muted">${phoneShow(c.phone)}${c.note ? ' · ' + esc(c.note) : ''}</div></div>
      <button class="btn sm" id="ed" type="button">Tahrirlash</button></div>
    <div class="grid g4" style="margin-top:12px"><div class="stat"><div class="label">Xaridlar</div><div class="big">${c.orders.filter(o => o.status === 'yopilgan' && o.type !== 'qaytarish').length}</div></div>
      <div class="stat"><div class="label">Keshbek</div><div class="big pos">${fmt(c.cashback)}</div></div>
      <div class="stat"><div class="label">Qarz</div><div class="big ${c.debt > 0 ? 'neg' : ''}">${fmt(c.debt || 0)}</div></div>
      <div class="stat"><div class="label">Mashinalar</div><div>${c.cars.map(x => `<span class="plate-mini sm">${plateFmt(x.plate)}</span> ${esc(x.model)}`).join('<br>') || '—'}</div></div></div>
    <div class="row" style="margin:12px 0">${c.debt > 0 ? `<button class="btn ok" id="pay" type="button">Qarzni to'lash</button>` : ''}<button class="btn" id="cbk" type="button">Keshbekni o'zgartirish</button>${isAdmin() ? `<button class="btn" id="dadj" type="button">Qarzni tuzatish</button>` : ''}</div>
    <div class="grid g2" style="align-items:start"><div><h3>Xaridlar</h3><div class="tbl-wrap"><table><tbody>${c.orders.map(o => `<tr class="click" data-o="${o.id}"><td>#${o.id}</td><td>${dateOf(o.closed_at || o.created_at)}</td><td>${TYPES[o.type] || ''}${o.plate ? ' · ' + plateFmt(o.plate) : ''}</td><td class="num ${o.total < 0 ? 'neg' : ''}">${fmt(o.total)}</td></tr>`).join('') || '<tr><td class="empty">Yo\'q</td></tr>'}</tbody></table></div></div>
      <div><h3>Qarz tarixi</h3><div class="tbl-wrap"><table><tbody>${c.debt_tx.map(t => `<tr><td>${dateOf(t.created_at)}</td><td class="small">${esc(t.note)}</td><td class="num ${t.amount > 0 ? 'neg' : 'pos'}">${t.amount > 0 ? '+' : ''}${fmt(t.amount)}</td></tr>`).join('') || '<tr><td class="empty">Yo\'q</td></tr>'}</tbody></table></div>
      <h3 style="margin-top:12px">Keshbek tarixi</h3><div class="tbl-wrap"><table><tbody>${c.cashback_tx.map(t => `<tr><td>${dateOf(t.created_at)}</td><td>${esc(t.kind)}</td><td class="num ${t.amount < 0 ? 'neg' : 'pos'}">${t.amount > 0 ? '+' : ''}${fmt(t.amount)}</td></tr>`).join('') || '<tr><td class="empty">Yo\'q</td></tr>'}</tbody></table></div></div></div>`, { wide: true });
  const again = () => { m.close(); customerCard(id); if (S.tab === 'mijoz') render(); };
  $('#ed', m.el).onclick = () => customerForm(c, again);
  $$('[data-o]', m.el).forEach(r => r.onclick = () => receiptCard(+r.dataset.o));
  if ($('#pay', m.el)) $('#pay', m.el).onclick = () => moneyModal("Qarzni to'lash", { max: c.debt, methods: true, note: true, okText: "To'lovni qabul qilish" }, async v => { await POST(`customers/${id}/pay`, v); await reloadBoot(); toast("To'lov qabul qilindi"); again(); });
  $('#cbk', m.el).onclick = () => moneyModal('Keshbekni o\'zgartirish', { signed: true, hint: "Qo'shish uchun musbat, ayirish uchun manfiy summa (masalan −5000)" }, async v => { await POST(`customers/${id}/cashback`, v); again(); });
  if ($('#dadj', m.el)) $('#dadj', m.el).onclick = () => moneyModal('Qarzni tuzatish', { signed: true, note: true, hint: "Boshlang'ich qarz yoki xato tuzatish: + qarz qo'shadi, − kamaytiradi" }, async v => { await POST(`customers/${id}/debt`, v); again(); });
}
// Umumiy summa oynasi (pul usuli va izoh bilan)
function moneyModal(title, o, onOk) {
  const m = modal(title, `${o.hint ? `<p class="muted">${esc(o.hint)}</p>` : ''}${o.max ? `<p>Maksimal: <b>${sum(o.max)}</b></p>` : ''}
    <label class="f"><span>Summa</span>${o.signed ? '<input id="am" inputmode="numeric" placeholder="0">' : moneyIn('am', o.max || '')}</label>
    ${o.methods ? `<label class="f"><span>To'lov usuli</span><select id="mt">${['naqd', 'terminal', 'otkazma'].map(k => `<option value="${k}">${MNAME(k)}</option>`).join('')}</select></label>` : ''}
    ${o.cats ? `<label class="f"><span>Turi</span><select id="ct">${o.cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></label>` : ''}
    ${o.note ? '<label class="f"><span>Izoh</span><input id="nt"></label>' : ''}
    <div class="row end"><button class="btn p lg" id="ok" type="button">${esc(o.okText || 'Saqlash')}</button></div>`);
  setTimeout(() => $('#am', m.el).focus(), 50);
  const ok = safe(async () => {
    const raw = $('#am', m.el).value, amount = o.signed ? (/^\s*[−-]/.test(raw) ? -1 : 1) * digits(raw) : digits(raw);
    if (!amount) throw new Error('Summani kiriting');
    const v = { amount };
    if (o.methods) v.method = $('#mt', m.el).value;
    if (o.cats) v.category = $('#ct', m.el).value;
    if (o.note) v.note = $('#nt', m.el).value;
    await onOk(v); m.close();
  });
  $('#ok', m.el).onclick = ok; $('#am', m.el).onkeydown = e => e.key === 'Enter' && ok();
}

// ================================================================== Yetkazib beruvchilar
const supDebt = d => d > 0 ? `<b class="neg">${fmt(d)}</b> <small class="muted">qarzimiz</small>` : d < 0 ? `<b class="pos">${fmt(-d)}</b> <small class="muted">bizga qarz</small>` : '—';
VIEWS.taminot = async () => {
  const q = S.ctx.sq || '';
  const list = await GET('suppliers?q=' + encodeURIComponent(q));
  $('#app').innerHTML = `<div class="kpage"><div class="row khead"><h2 class="sp">Yetkazib beruvchilar</h2><button class="btn p" id="new" type="button">${ic('plus', 'sm')} Yangi</button></div>
    <div class="card row"><div class="sbox sp">${ic('search')}<input id="q" placeholder="Nomi yoki telefoni — Enter" value="${esc(q)}"></div></div>
    <div class="grid g2"><div class="card stat"><div class="label">Yetkazib beruvchilar</div><div class="big">${list.length}</div></div>
      <div class="card stat"><div class="label">Bizning qarzimiz</div><div class="big neg">${fmt(list.reduce((a, s) => a + Math.max(s.debt, 0), 0))}</div></div></div>
    <div class="card"><div class="tbl-wrap"><table><thead><tr><th>Nomi</th><th>Telefon</th><th class="num">Xaridlar</th><th>Oxirgi xarid</th><th class="num">Balans</th></tr></thead><tbody>
      ${list.map(s => `<tr class="click" data-id="${s.id}"><td><b>${esc(s.name)}</b>${s.note ? `<div class="small muted">${esc(s.note)}</div>` : ''}</td><td>${s.phone ? phoneShow(s.phone) : '—'}</td><td class="num">${s.purchases}</td><td>${dateOf(s.last_purchase) || '—'}</td><td class="num">${supDebt(s.debt)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Hali yo\'q — «Yangi» ni bosing</td></tr>'}</tbody></table></div></div></div>`;
  $('#q').onkeydown = e => { if (e.key === 'Enter') { S.ctx.sq = e.target.value.trim(); render(); } };
  $('#new').onclick = () => supplierForm(null);
  $$('tr[data-id]').forEach(tr => tr.onclick = safe(() => supplierCard(+tr.dataset.id)));
};
function supplierForm(sp, after) {
  const m = modal(sp ? 'Yetkazib beruvchi' : 'Yangi yetkazib beruvchi', `<label class="f"><span>Nomi</span><input id="nm" value="${esc(sp?.name || '')}"></label>
    <label class="f"><span>Telefon</span><div class="phone-in sm"><span>+998</span><input id="ph" inputmode="numeric" value="${esc(phoneFmt(sp?.phone || ''))}"></div></label>
    <label class="f"><span>Izoh</span><input id="no" value="${esc(sp?.note || '')}"></label>
    ${sp ? '' : `<label class="f"><span>Boshlang'ich qarzimiz (bo'lsa)</span>${moneyIn('db')}</label>`}
    <div class="row end"><button class="btn p" id="sv" type="button">Saqlash</button></div>`);
  $('#ph', m.el).oninput = e => { e.target.value = phoneFmt(e.target.value); };
  setTimeout(() => $('#nm', m.el).focus(), 50);
  $('#sv', m.el).onclick = safe(async () => {
    const ph = $('#ph', m.el).value.replace(/\D/g, '');
    const b = { name: $('#nm', m.el).value, phone: ph ? '998' + ph : '', note: $('#no', m.el).value };
    if (!sp) b.debt = digits($('#db', m.el).value);
    const r = sp ? await PUT('suppliers/' + sp.id, b) : await POST('suppliers', b);
    m.close(); toast('Saqlandi'); after ? after(r) : (S.tab === 'taminot' ? render() : null);
  });
}
async function supplierCard(id) {
  const sp = await GET('suppliers/' + id);
  const m = modal(sp.name, `<div class="row"><div class="sp"><div class="muted">${sp.phone ? phoneShow(sp.phone) : ''} ${esc(sp.note || '')}</div><div class="big2" style="margin-top:6px">Balans: ${supDebt(sp.debt)}</div></div>
      <button class="btn sm" id="ed" type="button">Tahrirlash</button></div>
    <div class="row" style="margin:12px 0"><button class="btn ok" id="give" type="button">Pul berish</button><button class="btn" id="take" type="button">Pul olish</button><button class="btn p" id="np" type="button">${ic('plus', 'sm')} Yangi xarid</button></div>
    <div class="grid g2" style="align-items:start"><div><h3>Xaridlar</h3><div class="tbl-wrap"><table><tbody>${sp.purchases.map(p => `<tr class="click" data-p="${p.id}"><td>#${p.id}</td><td>${dateOf(p.created_at)}</td><td class="num">${fmt(p.total)}</td><td class="num small">to'landi ${fmt(p.paid)}</td></tr>`).join('') || '<tr><td class="empty">Yo\'q</td></tr>'}</tbody></table></div></div>
      <div><h3>Harakatlar</h3><div class="tbl-wrap"><table><tbody>${sp.tx.map(t => `<tr><td>${dateOf(t.created_at)}</td><td class="small">${esc(t.note)}</td><td class="num ${t.amount > 0 ? 'neg' : 'pos'}">${t.amount > 0 ? '+' : ''}${fmt(t.amount)}</td></tr>`).join('') || '<tr><td class="empty">Yo\'q</td></tr>'}</tbody></table></div></div></div>`, { wide: true });
  const again = () => { m.close(); supplierCard(id); if (S.tab === 'taminot') render(); };
  $('#ed', m.el).onclick = () => supplierForm(sp, again);
  $('#give', m.el).onclick = () => moneyModal(`${sp.name} — pul berish`, { methods: true, note: true, max: sp.debt > 0 ? sp.debt : 0, okText: 'Pul berildi' }, async v => { await POST(`suppliers/${id}/pay`, { ...v, direction: 'berish' }); await reloadBoot(); toast('Yozildi'); again(); });
  $('#take', m.el).onclick = () => moneyModal(`${sp.name} — pul olish`, { methods: true, note: true, okText: 'Pul olindi' }, async v => { await POST(`suppliers/${id}/pay`, { ...v, direction: 'olish' }); await reloadBoot(); toast('Yozildi'); again(); });
  $('#np', m.el).onclick = () => { m.close(); go('xarid_new', { pf: { supplier_id: id, lines: [], discount: 0, note: '' } }); };
  $$('[data-p]', m.el).forEach(r => r.onclick = () => purchaseCard(+r.dataset.p));
}

// ================================================================== Xaridlar
VIEWS.xarid = async () => {
  const pb = periodBar('xarP', 'month');
  const sid = S.ctx.xs || '';
  const [list, sups] = await Promise.all([GET(`purchases?${pb.q}&supplier_id=${sid}`), GET('suppliers')]);
  const tot = list.reduce((a, p) => a + p.total, 0), paid = list.reduce((a, p) => a + p.paid, 0);
  $('#app').innerHTML = `<div class="kpage"><div class="row khead"><h2 class="sp">Xaridlar</h2><button class="btn p" id="new" type="button">${ic('plus', 'sm')} Yangi xarid</button></div>${pb.html}
    <div class="card row"><select id="sf" style="width:auto"><option value="">Barcha yetkazib beruvchilar</option>${sups.map(s => `<option value="${s.id}" ${+sid === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
    <div class="grid g3"><div class="card stat"><div class="label">Xaridlar</div><div class="big">${list.length}</div></div>
      <div class="card stat"><div class="label">Summa</div><div class="big">${fmt(tot)}</div></div><div class="card stat"><div class="label">Qarzga olingan</div><div class="big ${tot - paid ? 'neg' : ''}">${fmt(tot - paid)}</div></div></div>
    <div class="card"><div class="tbl-wrap"><table><thead><tr><th>№</th><th>Sana</th><th>Yetkazib beruvchi</th><th class="num">Pozitsiya</th><th class="num">Summa</th><th class="num">To'landi</th><th class="num">Qarzga</th><th>Kim</th></tr></thead><tbody>
      ${list.map(p => `<tr class="click" data-id="${p.id}"><td><b>#${p.id}</b></td><td>${dateOf(p.created_at)} ${timeOf(p.created_at)}</td><td>${esc(p.supplier_name || p.note || '—')}</td><td class="num">${p.n}</td><td class="num"><b>${fmt(p.total)}</b></td><td class="num">${fmt(p.paid)}</td><td class="num ${p.total - p.paid ? 'neg' : ''}">${p.total - p.paid ? fmt(p.total - p.paid) : '—'}</td><td>${esc(p.employee_name || '')}</td></tr>`).join('') || '<tr><td colspan="8" class="empty">Xarid yo\'q</td></tr>'}</tbody></table></div></div></div>`;
  pb.bind();
  $('#sf').onchange = e => { S.ctx.xs = e.target.value; render(); };
  $('#new').onclick = () => go('xarid_new');
  $$('tr[data-id]').forEach(tr => tr.onclick = safe(() => purchaseCard(+tr.dataset.id)));
};
async function purchaseCard(id) {
  const p = await GET('purchases/' + id);
  modal(`Xarid #${p.id}`, `<div class="kv"><span>Sana</span><b>${dateOf(p.created_at)} ${timeOf(p.created_at)}</b></div><div class="kv"><span>Yetkazib beruvchi</span><b>${esc(p.supplier_name || '—')}</b></div>
    <div class="kv"><span>Kim kiritdi</span><b>${esc(p.employee_name || '—')}</b></div>${p.note ? `<div class="kv"><span>Izoh</span><b>${esc(p.note)}</b></div>` : ''}
    <div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>Mahsulot</th><th class="num">Miqdor</th><th class="num">Kelish narxi</th><th class="num">Sotuv narxi</th><th class="num">Summa</th></tr></thead><tbody>
      ${p.items.map(i => `<tr><td>${esc(i.name)}</td><td class="num">${qtyFmt(i.qty)}</td><td class="num">${fmt(i.cost)}</td><td class="num">${fmt(i.price)}</td><td class="num">${fmt(i.qty * i.cost)}</td></tr>`).join('')}</tbody></table></div>
    <div class="sum-box" style="margin-top:10px">${p.discount ? `<div class="kv"><span>Chegirma</span><b>−${fmt(p.discount)}</b></div>` : ''}<div class="kv tot"><span>Jami</span><b>${sum(p.total)}</b></div>
      <div class="kv"><span>To'landi</span><b>${fmt(p.paid)}</b></div><div class="kv"><span>Qarzga</span><b class="${p.total - p.paid ? 'neg' : ''}">${fmt(p.total - p.paid)}</b></div></div>`, { wide: true });
}
VIEWS.xarid_new = async () => {
  const sups = await GET('suppliers');
  const f = S.ctx.pf || (S.ctx.pf = { supplier_id: '', lines: [], discount: 0, note: '' });
  S.ctx.form = true;
  $('#app').innerHTML = `<div class="kpage"><div class="row khead"><button class="btn" id="back" type="button">${ic('back', 'sm')} Xaridlar</button><h2 class="sp">Yangi xarid</h2></div>
    <div class="grid g2" style="grid-template-columns:2fr 1fr;align-items:start">
      <div class="card"><div class="row" style="margin-bottom:10px"><label class="f sp" style="margin:0"><span>Yetkazib beruvchi</span><select id="sp"><option value="">— tanlang —</option>${sups.map(s => `<option value="${s.id}" ${+f.supplier_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
          <button class="btn" id="nsp" type="button" style="align-self:flex-end">${ic('plus', 'sm')} Yangi</button></div>
        <div class="row" style="margin-bottom:10px"><div class="sbox sp">${ic('search')}<input id="bc" placeholder="Shtrix-kod yoki nom — Enter"></div><button class="btn p" id="addp" type="button">${ic('plus', 'sm')} Mahsulot</button></div>
        <div class="tbl-wrap"><table><thead><tr><th>Mahsulot</th><th style="width:90px">Miqdor</th><th style="width:130px">Kelish narxi</th><th style="width:130px">Sotuv narxi</th><th class="num">Summa</th><th></th></tr></thead><tbody id="pl"></tbody></table></div></div>
      <div class="card"><h3>Hisob</h3><div class="kv"><span>Mahsulotlar</span><b id="gs">0</b></div>
        <div class="kv"><span>Chegirma</span>${moneyIn('pd', f.discount)}</div><div class="kv tot"><span>Jami</span><b id="gt">0</b></div>
        <h3 style="margin-top:14px">To'lov</h3>
        ${['naqd', 'terminal', 'otkazma'].map(k => `<div class="kv"><span>${MNAME(k)}</span>${moneyIn('pp_' + k)}</div>`).join('')}
        <button class="btn sm" id="full" type="button">Hammasini naqd to'lash</button>
        <div class="sum-box" style="margin-top:10px"><div class="kv"><span>Qarzga qoladi</span><b id="gd">0</b></div></div>
        <label class="f" style="margin-top:10px"><span>Izoh</span><input id="nt" value="${esc(f.note)}"></label>
        <button class="btn ok xl" id="sv" type="button" style="width:100%">Xaridni saqlash</button></div></div></div>`;
  const totals = () => {
    const g = f.lines.reduce((a, l) => a + Math.round((+l.qty || 0) * (+l.cost || 0)), 0);
    f.discount = Math.min(digits($('#pd').value), g);
    const t = g - f.discount, paid = ['naqd', 'terminal', 'otkazma'].reduce((a, k) => a + digits($('#pp_' + k).value), 0);
    $('#gs').textContent = fmt(g); $('#gt').textContent = sum(t);
    $('#gd').textContent = sum(Math.max(t - paid, 0)); $('#gd').className = t - paid > 0 ? 'neg' : '';
    return { t, paid };
  };
  const draw = () => {
    $('#pl').innerHTML = f.lines.map((l, i) => `<tr data-i="${i}"><td>${esc(l.name)}<div class="small muted">hozir: tannarx ${fmt(prod(l.product_id)?.cost)} · narx ${fmt(prod(l.product_id)?.price)}</div></td>
      <td><input class="inl" data-k="qty" value="${qtyFmt(l.qty)}" inputmode="decimal"></td><td><input class="inl money" data-k="cost" value="${fmt(l.cost)}"></td>
      <td><input class="inl money" data-k="price" value="${fmt(l.price)}"></td><td class="num">${fmt((+l.qty || 0) * (+l.cost || 0))}</td><td><button class="btn sm bad" data-del type="button">×</button></td></tr>`).join('')
      || '<tr><td colspan="6" class="empty">Mahsulot qo\'shing</td></tr>';
    totals();
  };
  const add = p => { const ex = f.lines.find(l => l.product_id === p.id); if (ex) ex.qty = +ex.qty + 1; else f.lines.push({ product_id: p.id, name: p.name, qty: 1, cost: p.cost, price: p.price }); draw(); };
  $('#pl').onchange = e => { const tr = e.target.closest('tr[data-i]'); if (!tr) return; const l = f.lines[tr.dataset.i], k = e.target.dataset.k; l[k] = k === 'qty' ? (parseFloat(String(e.target.value).replace(',', '.')) || 0) : digits(e.target.value); draw(); };
  $('#pl').onclick = e => { if (e.target.closest('[data-del]')) { f.lines.splice(e.target.closest('tr').dataset.i, 1); draw(); } };
  $('#app').oninput = e => { if (['pd', 'pp_naqd', 'pp_terminal', 'pp_otkazma'].includes(e.target.id)) totals(); };
  $('#addp').onclick = () => pickProduct(add);
  $('#bc').onkeydown = e => { if (e.key !== 'Enter') return; const q = e.target.value.trim(); if (!q) return; const p = S.boot.products.find(x => x.barcode && x.barcode === q) || (S.boot.products.filter(x => x.name.toLowerCase().includes(q.toLowerCase())).length === 1 ? S.boot.products.find(x => x.name.toLowerCase().includes(q.toLowerCase())) : null); if (p) { add(p); e.target.value = ''; } else pickProduct(x => { add(x); e.target.value = ''; }); };
  $('#sp').onchange = e => { f.supplier_id = e.target.value; };
  $('#nsp').onclick = () => supplierForm(null, sp => { f.supplier_id = sp.id; render(); });
  $('#full').onclick = () => { const { t } = totals(); $('#pp_naqd').value = fmt(t); $('#pp_terminal').value = ''; $('#pp_otkazma').value = ''; totals(); };
  $('#back').onclick = () => { S.ctx.form = false; go('xarid'); };
  $('#sv').onclick = safe(async () => {
    const { t, paid } = totals();
    if (!f.lines.length) throw new Error("Mahsulot qo'shing");
    if (paid > t) throw new Error("To'lov xarid summasidan ko'p");
    if (!f.supplier_id && paid < t) throw new Error('Qarzga xarid uchun yetkazib beruvchini tanlang');
    const payments = ['naqd', 'terminal', 'otkazma'].map(k => ({ method: k, amount: digits($('#pp_' + k).value) })).filter(p => p.amount);
    const r = await POST('purchases', { supplier_id: f.supplier_id || null, items: f.lines, discount: f.discount, payments, note: $('#nt').value });
    S.ctx.pf = null; S.ctx.form = false; await reloadBoot();
    toast(`Xarid #${r.id} saqlandi${r.total - r.paid ? ` · qarzga ${fmt(r.total - r.paid)}` : ''}`);
    go('xarid');
  });
  draw();
};

// ================================================================== Kassa (smena, kirim/chiqim)
VIEWS.kassa = async () => {
  const pb = periodBar('kasP', 'today');
  const [sh, c, shifts] = await Promise.all([GET('shift'), GET('cash?' + pb.q), GET('shifts')]);
  S.boot.shift = sh; sideShift();
  const B = c.balances;
  $('#app').innerHTML = `<div class="kpage"><div class="row khead"><h2 class="sp">Kassa</h2>
      ${sh ? `<button class="btn" id="in" type="button">${ic('plus', 'sm')} Kirim</button><button class="btn" id="out" type="button">− Chiqim (xarajat)</button><button class="btn bad" id="cls" type="button">Smenani yopish</button>` : `<button class="btn p lg" id="opn" type="button">Smenani ochish</button>`}</div>
    <div class="grid g2" style="grid-template-columns:3fr 2fr;align-items:start">
      <div class="card">${sh ? `<div class="row"><h3 class="sp">Joriy smena #${sh.id}</h3><span class="muted">${esc(sh.employee_name || '')} · ${dateOf(sh.opened_at)} ${timeOf(sh.opened_at)} dan</span></div>
          <div class="grid g3" style="margin:8px 0"><div class="stat"><div class="label">Cheklar</div><div class="big">${sh.sales_count}</div><div class="small muted">${sum(sh.sales_total)}</div></div>
            <div class="stat"><div class="label">Qaytarishlar</div><div class="big">${sh.refund_count}</div><div class="small muted">${sum(sh.refund_total)}</div></div>
            <div class="stat"><div class="label">Kassada naqd</div><div class="big">${fmt(sh.expected_cash)}</div><div class="small muted">boshida ${fmt(sh.open_cash)}</div></div></div>${shiftTable(sh)}`
        : '<div class="empty">Smena yopiq. Pul qabul qilish uchun smenani oching.</div>'}</div>
      <div class="card"><h3>Umumiy qoldiq (barcha davr)</h3>
        ${['naqd', 'terminal', 'otkazma'].map(k => `<div class="kv"><span>${MNAME(k)}</span><b>${fmt(B[k])}</b></div>`).join('')}
        <p class="small muted">Naqd qoldiq — barcha savdo, kirim va chiqimlar (inkassatsiya ham chiqim sifatida) bo'yicha.</p></div></div>
    ${pb.html}
    <div class="grid g2" style="grid-template-columns:3fr 2fr;align-items:start">
      <div class="card"><h3>Kassa harakatlari</h3><div class="tbl-wrap"><table><thead><tr><th>Vaqt</th><th>Turi</th><th>Usul</th><th class="num">Summa</th><th>Izoh</th><th>Kim</th></tr></thead><tbody>
        ${c.tx.map(t => `<tr><td>${dateOf(t.created_at)} ${timeOf(t.created_at)}</td><td><span class="tag ${t.kind === 'kirim' ? 'tayyor' : 'bekor'}">${t.kind}</span> ${esc(t.category)}</td><td>${MNAME(t.method)}</td>
          <td class="num ${t.kind === 'kirim' ? 'pos' : 'neg'}"><b>${t.kind === 'kirim' ? '+' : '−'}${fmt(t.amount)}</b></td><td class="small">${esc(t.note || '')}</td><td class="small">${esc(t.employee_name || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Harakat yo\'q</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>Davr bo'yicha</h3><h4 class="muted">Savdodan tushum</h4>${c.sales.map(x => `<div class="kv"><span>${MNAME(x.method)}</span><b>${fmt(x.s)}</b></div>`).join('') || '<div class="muted small">yo\'q</div>'}
        <h4 class="muted" style="margin-top:10px">Kirim / chiqim turlari</h4>${c.by_category.map(x => `<div class="kv"><span>${x.kind === 'kirim' ? '+' : '−'} ${esc(x.category)} <small class="muted">(${x.n})</small></span><b class="${x.kind === 'kirim' ? 'pos' : 'neg'}">${fmt(x.s)}</b></div>`).join('') || '<div class="muted small">yo\'q</div>'}</div></div>
    <div class="card"><h3>Smenalar tarixi</h3><div class="tbl-wrap"><table><thead><tr><th>#</th><th>Ochildi</th><th>Yopildi</th><th>Kassir</th><th class="num">Cheklar</th><th class="num">Savdo</th><th class="num">Bo'lishi kerak</th><th class="num">Sanaldi</th><th class="num">Farq</th><th></th></tr></thead><tbody>
      ${shifts.map(x => { const d = x.closed_at ? (x.counted - x.expected) : null; return `<tr><td>${x.id}</td><td>${dateOf(x.opened_at)} ${timeOf(x.opened_at)}</td><td>${x.closed_at ? timeOf(x.closed_at) : '<span class="tag tayyor">ochiq</span>'}</td><td>${esc(x.employee_name || '')}</td>
        <td class="num">${x.sales_count}</td><td class="num">${fmt(x.sales_total)}</td><td class="num">${x.closed_at ? fmt(x.expected) : fmt(x.expected_cash)}</td><td class="num">${x.closed_at ? fmt(x.counted) : '—'}</td>
        <td class="num ${d < 0 ? 'neg' : d > 0 ? 'pos' : ''}">${d === null ? '—' : fmt(d)}</td><td>${x.closed_at ? `<button class="btn sm" data-z="${x.id}" type="button">${ic('print', 'sm')}</button>` : ''}</td></tr>`; }).join('') || '<tr><td colspan="10" class="empty">Hali smena yo\'q</td></tr>'}</tbody></table></div></div></div>`;
  pb.bind();
  if (sh) {
    $('#in').onclick = () => moneyModal('Kassaga kirim', { methods: true, note: true, cats: S.boot.cash_cats.kirim }, async v => { await POST('cash', { ...v, kind: 'kirim' }); toast('Kirim yozildi'); render(); });
    $('#out').onclick = () => moneyModal('Kassadan chiqim (xarajat)', { methods: true, note: true, cats: S.boot.cash_cats.chiqim }, async v => { await POST('cash', { ...v, kind: 'chiqim' }); toast('Chiqim yozildi'); render(); });
    $('#cls').onclick = () => closeShiftModal(sh);
  } else $('#opn').onclick = () => openShiftModal();
  $$('[data-z]').forEach(b => b.onclick = () => printZ(shifts.find(x => x.id === +b.dataset.z)));
};

// ================================================================== Hisobotlar
function barChart(rows, { label, value, height = 220 } = {}) {
  if (!rows.length) return '<div class="empty">Ma\'lumot yo\'q</div>';
  const data = rows.map(r => ({ l: label(r), v: value(r) }));
  return `<div class="chart" data-h="${height}" data-rows='${esc(JSON.stringify(data))}'><div class="tip" hidden></div></div>`;
}
// Bitta seriya: ustunlar ≤24px, uchi 4px yumaloq, asosda to'g'ri; to'r chiziqlari xira; har ustunda tooltip
function drawChart(ch) {
  const rows = JSON.parse(ch.dataset.rows), H = +ch.dataset.h, W = Math.max(ch.clientWidth, 280);
  const padL = 64, padB = 26, padT = 12;
  const vals = rows.map(r => r.v), max = Math.max(0, ...vals), min = Math.min(0, ...vals);
  const nice = v => { if (v <= 0) return 0; const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
  const top = nice(max) || 1, bot = min < 0 ? -nice(-min) : 0;
  const y = v => padT + (H - padT - padB) * (top - v) / (top - bot);
  const step = (W - padL) / rows.length, bw = Math.max(4, Math.min(24, step - 4));
  const ticks = [...new Set([bot, 0, (top + Math.max(bot, 0)) / 2, top])].sort((p, q) => p - q);
  const short = v => Math.abs(v) >= 1e6 ? +(v / 1e6).toFixed(1) + ' mln' : Math.abs(v) >= 1e3 ? Math.round(v / 1e3) + ' ming' : String(v);
  const bars = rows.map((r, i) => {
    const x = padL + i * step + (step - bw) / 2, y0 = y(0), y1 = y(r.v), h = Math.abs(y1 - y0), rr = Math.min(4, h), up = r.v >= 0;
    const d = up ? `M${x},${y0}V${y1 + rr}Q${x},${y1} ${x + rr},${y1}H${x + bw - rr}Q${x + bw},${y1} ${x + bw},${y1 + rr}V${y0}Z`
      : `M${x},${y0}V${y1 - rr}Q${x},${y1} ${x + rr},${y1}H${x + bw - rr}Q${x + bw},${y1} ${x + bw},${y1 - rr}V${y0}Z`;
    return `<g class="bar" tabindex="0" data-i="${i}"><rect x="${padL + i * step}" y="${padT}" width="${step}" height="${H - padT - padB}" fill="transparent"/>${h ? `<path d="${d}" class="${up ? '' : 'negbar'}"/>` : ''}</g>`;
  }).join('');
  const every = Math.max(1, Math.ceil(rows.length / Math.max(1, Math.floor((W - padL) / 48))));
  const xl = rows.map((r, i) => i % every ? '' : `<text x="${padL + i * step + step / 2}" y="${H - 8}" text-anchor="middle">${esc(r.l)}</text>`).join('');
  const old = $('svg', ch); if (old) old.parentNode.removeChild(old);
  ch.insertAdjacentHTML('afterbegin', `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ustunli grafik">
    ${ticks.map(v => `<line x1="${padL}" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${padL - 8}" y="${y(v) + 4}" text-anchor="end">${short(v)}</text>`).join('')}${bars}${xl}</svg>`);
  const tip = $('.tip', ch);
  const show = g => { const r = rows[+g.dataset.i]; tip.textContent = `${r.l}: ${fmt(r.v)} so'm`; tip.hidden = false; const cr = ch.getBoundingClientRect(), br = g.getBoundingClientRect(); tip.style.left = Math.min(Math.max(br.left - cr.left + br.width / 2, 70), cr.width - 70) + 'px'; tip.style.top = Math.max(y(Math.max(r.v, 0)) - 6, 30) + 'px'; };
  $$('.bar', ch).forEach(g => { g.onpointerenter = () => show(g); g.onfocus = () => show(g); g.onpointerleave = g.onblur = () => { tip.hidden = true; }; });
}
function bindCharts(root = document) { $$('.chart', root).forEach(drawChart); }
let chartTimer = null;
window.addEventListener('resize', () => { clearTimeout(chartTimer); chartTimer = setTimeout(() => bindCharts(), 200); });
const hbars = (rows, label, value) => { const max = Math.max(1, ...rows.map(value)); return rows.map(r => `<div class="hb"><span class="hbl">${label(r)}</span><span class="hbt"><i style="width:${Math.max(0, value(r)) / max * 100}%"></i></span><b class="num">${fmt(value(r))}</b></div>`).join('') || '<div class="muted">yo\'q</div>'; };

VIEWS.hisobot = async () => {
  const tabs = [['umumiy', 'Umumiy'], ['mahsulot', 'Mahsulotlar'], ['qarz', 'Qarzlar'], ...(isAdmin() ? [['foyda', 'Foyda']] : [])];
  const tab = S.ctx.rt || (S.ctx.rt = 'umumiy');
  const pb = periodBar('repP', 'month');
  const head = `<div class="kpage"><div class="row khead"><h2 class="sp">Hisobotlar</h2><div class="chips" id="rt">${tabs.map(([k, v]) => `<button class="chip ${tab === k ? 'on' : ''}" data-r="${k}" type="button">${v}</button>`).join('')}</div></div>${tab === 'qarz' ? '' : pb.html}`;
  const bindTop = () => { if (tab !== 'qarz') pb.bind(); $('#rt').onclick = e => { const b = e.target.closest('[data-r]'); if (b) { S.ctx.rt = b.dataset.r; render(); } }; };
  if (tab === 'foyda') { await profitView(head, pb); bindTop(); return; }
  if (tab === 'qarz') {
    const d = await GET('reports/debts');
    $('#app').innerHTML = head + `<div class="grid g2" style="align-items:start">
      <div class="card"><div class="row"><h3 class="sp">Mijozlar qarzi</h3><b class="neg">${sum(d.customer_total)}</b></div><div class="tbl-wrap"><table><tbody>
        ${d.customers.map(c => `<tr class="click" data-c="${c.id}"><td><b>${esc(c.name || 'Ismsiz')}</b><div class="small muted">${phoneShow(c.phone)} ${(c.plates || '').split(', ').filter(Boolean).map(plateFmt).join(', ')}</div></td><td class="small">${dateOf(c.last_tx)}</td><td class="num ${c.debt > 0 ? 'neg' : 'pos'}"><b>${fmt(c.debt)}</b></td></tr>`).join('') || '<tr><td class="empty">Qarzdor yo\'q</td></tr>'}</tbody></table></div></div>
      <div class="card"><div class="row"><h3 class="sp">Yetkazib beruvchilarga qarzimiz</h3><b class="neg">${sum(d.supplier_total)}</b></div><div class="tbl-wrap"><table><tbody>
        ${d.suppliers.map(s => `<tr class="click" data-s="${s.id}"><td><b>${esc(s.name)}</b></td><td class="num">${supDebt(s.debt)}</td></tr>`).join('') || '<tr><td class="empty">Qarz yo\'q</td></tr>'}</tbody></table></div></div></div></div>`;
    bindTop();
    $$('[data-c]').forEach(r => r.onclick = () => customerCard(+r.dataset.c));
    $$('[data-s]').forEach(r => r.onclick = () => supplierCard(+r.dataset.s));
    return;
  }
  const r = await GET('reports/summary?' + pb.q);
  const h = r.head, prof = 'profit' in h;
  if (tab === 'mahsulot') {
    $('#app').innerHTML = head + `<div class="grid g2" style="grid-template-columns:2fr 1fr;align-items:start">
      <div class="card"><h3>Eng ko'p sotilganlar (tushum bo'yicha)</h3><div class="tbl-wrap"><table><thead><tr><th>Mahsulot</th><th class="num">Miqdor</th><th class="num">Tushum</th>${prof ? '<th class="num">Foyda</th>' : ''}</tr></thead><tbody>
        ${r.top.map(p => `<tr><td><span class="tag ${p.category}">${CATS[p.category] || ''}</span> ${esc(p.name)}</td><td class="num">${qtyFmt(p.qty)}</td><td class="num"><b>${fmt(p.revenue)}</b></td>${prof ? `<td class="num ${p.profit < 0 ? 'neg' : 'pos'}">${fmt(p.profit)}</td>` : ''}</tr>`).join('') || '<tr><td colspan="4" class="empty">Sotuv yo\'q</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>Kategoriyalar</h3>${hbars(r.by_category, c => c.cat === 'bonus' ? '🎁 Bonus' : (CATS[c.cat] || c.cat), c => c.revenue)}
        ${prof ? `<h3 style="margin-top:14px">Foyda (kategoriya)</h3>${r.by_category.map(c => `<div class="kv"><span>${c.cat === 'bonus' ? '🎁 Bonus' : (CATS[c.cat] || c.cat)}</span><b class="${c.profit < 0 ? 'neg' : 'pos'}">${fmt(c.profit)}</b></div>`).join('')}` : ''}</div></div></div>`;
    bindTop(); return;
  }
  const tile = (l, v, sub = '', cls = '') => `<div class="card stat"><div class="label">${l}</div><div class="big ${cls}">${v}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>`;
  $('#app').innerHTML = head + `<div class="grid g4">${tile('Tushum', fmt(h.revenue), `${dateOf(r.from)} — ${dateOf(r.to)}`)}${tile('Cheklar', h.receipts, `zamena ${h.zamena}`)}
      ${tile("O'rtacha chek", fmt(h.avg_check))}${prof ? tile('Yalpi foyda', fmt(h.profit), 'tushum − tannarx', h.profit < 0 ? 'neg' : 'pos') : tile('Qarzga sotilgan', fmt(h.debt_given), '', h.debt_given ? 'neg' : '')}</div>
    <div class="grid g4">${tile('Qaytarishlar', fmt(h.refunds), `${h.refund_count} ta`)}${tile('Chegirmalar', fmt(h.discount))}${tile('Keshbekdan to\'langan', fmt(h.cashback_used))}${prof ? tile('Qarzga sotilgan', fmt(h.debt_given), '', h.debt_given ? 'neg' : '') : tile('Zamena', h.zamena + ' ta')}</div>
    <div class="card"><div class="row"><h3 class="sp">Kunlik tushum</h3><button class="btn sm" id="tbl" type="button">Jadval</button></div>${barChart(r.by_day, { label: x => x.d.slice(8, 10) + '.' + x.d.slice(5, 7), value: x => x.revenue })}
      <div id="dt" hidden><div class="tbl-wrap"><table><thead><tr><th>Sana</th><th class="num">Cheklar</th><th class="num">Tushum</th>${prof ? '<th class="num">Foyda</th>' : ''}</tr></thead><tbody>${r.by_day.map(x => `<tr><td>${dateOf(x.d)}</td><td class="num">${x.n}</td><td class="num">${fmt(x.revenue)}</td>${prof ? `<td class="num">${fmt(x.profit)}</td>` : ''}</tr>`).join('')}</tbody></table></div></div></div>
    <div class="grid g3" style="align-items:start">
      <div class="card"><h3>To'lov usullari</h3>${hbars(r.by_method, x => MNAME(x.method), x => x.amount)}</div>
      <div class="card"><h3>Kassirlar</h3>${r.by_cashier.map(x => `<div class="kv"><span>${esc(x.name || '—')} <small class="muted">${x.n} chek</small></span><b>${fmt(x.revenue)}</b></div>`).join('') || '<div class="muted">yo\'q</div>'}</div>
      <div class="card"><h3>Savdo turlari</h3>${r.by_type.map(x => `<div class="kv"><span>${TYPES[x.type] || x.type} <small class="muted">${x.n}</small></span><b class="${x.revenue < 0 ? 'neg' : ''}">${fmt(x.revenue)}</b></div>`).join('') || '<div class="muted">yo\'q</div>'}</div></div></div>`;
  bindTop(); bindCharts();
  $('#tbl').onclick = () => { $('#dt').hidden = !$('#dt').hidden; };
};

// ================================================================== Ombor, inventarizatsiya, oylik, xodimlar, sozlamalar
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
    <span class="sp"></span><span class="dates"><input type="date" id="pf" value="${cur.from}"><span>—</span><input type="date" id="pt" value="${cur.to}"></span></div>`;
  const bind = () => {
    $$('[data-f]').forEach(c => c.onclick = () => { S.ctx[id] = { from: c.dataset.f, to: c.dataset.t }; render(); });
    $('#pf').onchange = $('#pt').onchange = () => { S.ctx[id] = { from: $('#pf').value, to: $('#pt').value }; render(); };
  };
  return { html, bind, q: `from=${cur.from}&to=${cur.to}`, ...cur };
}


VIEWS.mahsulot = async () => {
  const ps = S.boot.products;
  const f = S.ctx.cat || '';
  const val = ps.filter(p => p.category !== 'xizmat').reduce((a, p) => a + Math.max(p.stock, 0) * p.cost, 0);
  $('#app').innerHTML = `<div class="row"><h2 class="sp">Ombor · qoldiq tannarxi ${sum(val)}</h2>
    <button class="btn" id="moves">Harakatlar</button><button class="btn" id="pur">+ Xarid (kirim)</button><button class="btn p" id="new">+ Yangi mahsulot</button></div>
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
  $('#pur').onclick = () => go('xarid_new');
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

async function profitView(head, pb) {
  const r = await GET('reports/profit?' + pb.q);
  const h = r.head;
  const cat = k => r.categories.find(c => c.cat === k) || { qty: 0, revenue: 0, cost: 0, profit: 0 };
  const card = (label, v, cls = '', sub = '') => `<div class="card stat"><div class="label">${label}</div><div class="big ${cls}">${fmt(v)}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>`;
  const sign = v => v < 0 ? 'neg' : 'pos';
  $('#app').innerHTML = head + `
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
    <div class="card"><div class="row"><h3 class="sp">Xarajatlar (kassadan)</h3><button class="btn sm" id="addx">+ Xarajat</button></div><div id="xl" class="small"></div></div></div>
    <div class="card"><h3>Mahsulotlar bo'yicha</h3><div class="tbl-wrap"><table><thead><tr><th>Mahsulot</th><th class="num">Miqdor</th><th class="num">Bonus</th><th class="num">Tushum</th><th class="num">Tannarx</th><th class="num">Foyda</th></tr></thead><tbody>
      ${r.products.map(p => `<tr><td><span class="tag ${p.category}">${CATS[p.category]}</span> ${esc(p.name)}</td><td class="num">${qtyFmt(p.qty)}</td><td class="num">${p.bonus_lines || ''}</td><td class="num">${fmt(p.revenue)}</td><td class="num">${fmt(p.cost)}</td><td class="num ${sign(p.profit)}"><b>${fmt(p.profit)}</b></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Sotuv yo\'q</td></tr>'}</tbody></table></div></div>`;
  const xs = await GET('expenses?' + pb.q);
  $('#xl').innerHTML = xs.map(x => `<div class="row"><span>${dateOf(x.created_at)}</span><span class="sp">${esc(x.title)}</span><b>${fmt(x.amount)}</b></div>`).join('') || '<div class="muted">Ijara, svet, va h.k. shu yerga</div>';
  $('#addx').onclick = () => moneyModal('Xarajat (kassadan chiqim)', { methods: true, note: true, cats: S.boot.cash_cats.chiqim }, async v => { await POST('cash', { ...v, kind: 'chiqim' }); toast('Xarajat yozildi'); render(); });
}

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
    moneyModal(`${e.name} — oylik to'lash`, { methods: true, max: +b.dataset.a, okText: "To'landi" }, async v => {
      await POST('salary', { employee_id: e.id, period_from: r.from, period_to: r.to, amount: v.amount, method: v.method }); toast("To'lov yozildi (kassadan chiqim)"); render();
    });
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
