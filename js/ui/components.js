/* Qayta ishlatiladigan UI bo'laklari */
(function () {
  const CO = window.CO;
  const I = CO.icons;
  const t = (...a) => CO.i18n.t(...a);
  const L = (obj) => CO.i18n.pick(obj);

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => Math.round(n).toLocaleString('ru-RU').replace(/[ ,]/g, ' ') + ' ' + L(CO.config.shop.currency);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  function hexTint(hex, a = 0.12) {
    const n = parseInt(hex.slice(1), 16);
    const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const mix = (c) => Math.round(255 - (255 - c) * a);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
  }
  function catStyle(catId) {
    const c = CO.api.category(catId);
    const color = c?.color || '#3a9ff0';
    return `--cat-color:${color};--tint:${hexTint(color)}`;
  }

  function pimg(p, { code = false } = {}) {
    const c = CO.api.category(p.cat);
    const inner = p.image
      ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
      : (CO.catIcons[c?.icon] || CO.catIcons.box);
    return `<div class="pimg" style="${catStyle(p.cat)}">${inner}${code && !p.image ? `<span class="pimg__code">${esc(p.oem)}</span>` : ''}</div>`;
  }

  const discount = (p) => (p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0);

  function badges(p) {
    const d = discount(p);
    const b = [];
    if (d) b.push(`<span class="badge-tag badge-tag--sale">−${d}%</span>`);
    if (p.isNew) b.push(`<span class="badge-tag badge-tag--new">${t('badge.new')}</span>`);
    if (p.isHit && !d) b.push(`<span class="badge-tag badge-tag--hit">${t('badge.hit')}</span>`);
    return b.length ? `<div class="badges">${b.join('')}</div>` : '';
  }

  function priceHtml(p) {
    const d = discount(p);
    return `<div class="price"><span class="price__now ${d ? 'is-sale' : ''}">${money(p.price)}</span>${d ? `<span class="price__old">${money(p.oldPrice)}</span>` : ''}</div>`;
  }

  function stockHtml(p) {
    if (p.stock <= 0) return `<span class="stock stock--out">${t('stock.out')}</span>`;
    if (p.stock <= 3) return `<span class="stock stock--low">${t('stock.low', { n: p.stock })}</span>`;
    return `<span class="stock">${t('stock.in')}</span>`;
  }

  // Faol mashinaga mosligi: true / false / null (universal yoki mashina tanlanmagan)
  function fits(p) {
    const car = CO.store.state.activeCar;
    if (!car || !p.cars.length) return null;
    return p.cars.includes(car);
  }
  function fitHtml(p) {
    const f = fits(p);
    if (f === true) return `<span class="fit fit--yes">${I.check}${t('fit.yes.short', { car: esc(CO.store.state.activeCar) })}</span>`;
    return '';
  }

  function buyControl(p) {
    const q = CO.store.cartQty(p.id);
    if (p.stock <= 0) return `<button class="card__add" disabled>${t('stock.out')}</button>`;
    if (!q) return `<button class="card__add" data-add="${p.id}" aria-label="${esc(t('cart.add'))}">${I.plus}${t('cart.addShort')}</button>`;
    return `<div class="stepper" data-stepper="${p.id}">
      <button data-dec="${p.id}" aria-label="−">${I.minus}</button><span>${q}</span><button data-inc="${p.id}" aria-label="+" ${q >= p.stock ? 'disabled' : ''}>${I.plus}</button>
    </div>`;
  }

  function card(p) {
    return `
      <article class="card" data-open="${p.id}">
        <div class="card__media">
          ${pimg(p)}
          ${badges(p)}
          <button class="card__fav ${CO.store.isFav(p.id) ? 'is-on' : ''}" data-fav="${p.id}" aria-label="${esc(t('fav.toggle'))}">${I.heart}</button>
        </div>
        <div class="card__body">
          ${priceHtml(p)}
          <div class="card__name">${esc(p.name)}</div>
          <div class="card__meta">${esc(p.brand)} · ${esc(p.oem)}</div>
          ${fitHtml(p) || stockHtml(p)}
          <div data-buy="${p.id}">${buyControl(p)}</div>
        </div>
      </article>`;
  }
  const grid = (list) => `<div class="grid">${list.map(card).join('')}</div>`;
  const hscroll = (list) => `<div class="hscroll">${list.map(card).join('')}</div>`;

  function empty({ icon = I.box, title, text = '', actions = '', ok = false }) {
    return `<div class="empty ${ok ? 'empty--ok' : ''}"><div class="empty__icon">${icon}</div><h3>${title}</h3>${text ? `<p>${text}</p>` : ''}${actions}</div>`;
  }

  function sectionHead(title, link, icon = '') {
    return `<div class="section__head"><h2 class="section__title">${icon}${title}</h2>${link ? `<a class="section__link" href="${link}">${t('common.all')}${I.chevron}</a>` : ''}</div>`;
  }

  // Har bir mahsulotning savat tugmasini yangilash (sahifani qayta chizmasdan)
  function refreshBuy(id) {
    const p = CO.api.product(id);
    $$(`[data-buy="${id}"]`).forEach((el) => { el.innerHTML = buyControl(p); });
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg, { icon = I.check, link } = {}) {
    const el = $('#toast');
    el.innerHTML = `${icon}<span>${msg}</span>${link ? `<a href="${link.href}">${link.text}</a>` : ''}`;
    el.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-show'), 2400);
  }

  /* ---------- Bottom sheet ---------- */
  let sheetOnClose = null;
  function openSheet({ title = '', body = '', foot = '', cls = '', onClose } = {}) {
    const root = $('#sheet');
    root.className = 'sheet ' + cls;
    root.innerHTML = `
      <div class="sheet__backdrop" data-close-sheet></div>
      <div class="sheet__panel" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="sheet__grip"></div>
        <div class="sheet__head"><div class="sheet__title">${title}</div><button class="icon-btn" data-close-sheet aria-label="${esc(t('common.close'))}">${I.close}</button></div>
        <div class="sheet__body">${body}</div>
        ${foot ? `<div class="sheet__foot">${foot}</div>` : ''}
      </div>`;
    root.hidden = false;
    document.body.classList.add('lock');
    sheetOnClose = onClose || null;
    // Pastga surib yopish
    const panel = $('.sheet__panel', root);
    let y0 = null;
    panel.addEventListener('touchstart', (e) => { if (panel.querySelector('.sheet__body').scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
    panel.addEventListener('touchmove', (e) => {
      if (y0 == null) return;
      const dy = e.touches[0].clientY - y0;
      if (dy > 0) panel.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    panel.addEventListener('touchend', (e) => {
      if (y0 == null) return;
      const dy = e.changedTouches[0].clientY - y0; y0 = null;
      if (dy > 110) closeSheet(); else panel.style.transform = '';
    });
    return root;
  }
  function closeSheet() {
    const root = $('#sheet');
    if (root.hidden) return;
    root.hidden = true; root.innerHTML = '';
    document.body.classList.remove('lock');
    const cb = sheetOnClose; sheetOnClose = null;
    if (cb) cb();
  }
  const sheetOpen = () => !$('#sheet').hidden;

  CO.ui = { esc, money, $, $$, pimg, badges, priceHtml, stockHtml, fits, card, grid, hscroll, empty, sectionHead, buyControl, refreshBuy, toast, openSheet, closeSheet, sheetOpen, catStyle, hexTint, discount };
})();
