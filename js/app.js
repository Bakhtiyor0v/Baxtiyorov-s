/* CarOne — ilova yadrosi: router, header, pastki menyu, global hodisalar, qidiruv paneli */
(function () {
  const CO = window.CO;
  const I = CO.icons;
  const t = (...a) => CO.i18n.t(...a);
  const { esc, money, $, $$ } = CO.ui;

  const app = $('#app');
  const headerEl = $('#header');
  const tabbar = $('#tabbar');

  /* ================= Router ================= */
  const ROUTES = {
    '': 'home', catalog: 'catalog', search: 'search', p: 'product', scan: 'scan',
    cart: 'cart', checkout: 'checkout', order: 'order', account: 'account',
    orders: 'orders', favorites: 'favorites', garage: 'garage', admin: 'admin',
  };
  let cleanup = null;
  const scrollMem = new Map();
  let lastHash = location.hash;

  function parse(hash = location.hash) {
    const h = hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    const name = ROUTES[parts[0] || ''] || 'home';
    return { name, args: parts.slice(1), params: new URLSearchParams(qs || '') };
  }

  function render({ keepScroll = false } = {}) {
    const { name, args, params } = parse();
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    CO.ui.closeSheet();
    const y = window.scrollY;
    const v = CO.views[name](params, args);
    renderHeader(v.header ?? 'main', v);
    document.body.classList.toggle('no-tabbar', !!v.noTabbar);
    tabbar.hidden = !!v.noTabbar;
    $$('.tab', tabbar).forEach((el) => {
      const on = el.dataset.tab === v.tab;
      el.classList.toggle('is-active', on);
      if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    app.classList.toggle('is-flush', !!v.flush);
    app.innerHTML = v.html;
    if (!keepScroll) app.classList.remove('page-enter'), void app.offsetWidth, app.classList.add('page-enter');
    const c = v.mount ? v.mount(app) : null;
    if (typeof c === 'function') cleanup = c;
    if (keepScroll) window.scrollTo(0, y);
    if (v.focusSearch) setTimeout(() => $('#q')?.focus(), 60);
    document.title = (v.title || (typeof v.header === 'object' && v.header.title) || '') ? `${v.title || v.header.title} — CarOne` : 'CarOne — ' + CO.i18n.pick(CO.config.shop.slogan);
  }

  // Tarix: har bir yozuvga tartib raqami (i) — orqaga/oldinga farqlash uchun
  let idx = (history.state && history.state.i) || 0;
  if (!history.state) history.replaceState({ i: 0 }, '');

  const router = {
    render,
    go(hash, { replace = false } = {}) {
      if (hash === location.hash && !replace) { render(); window.scrollTo(0, 0); return; }
      if (replace) history.replaceState({ i: idx }, '', hash);
      else history.pushState({ i: ++idx }, '', hash);
      onRoute('push');
    },
    replace(hash) { history.replaceState({ i: idx }, '', hash); lastHash = location.hash; render({ keepScroll: true }); },
    back() {
      if (idx > 0) history.back();
      else router.go('#/', { replace: true });
    },
  };
  CO.router = router;

  function onRoute(type) {
    scrollMem.set(lastHash, window.scrollY);
    const hash = location.hash;
    lastHash = hash;
    render();
    const restore = scrollMem.get(hash);
    window.scrollTo(0, type === 'back' && restore ? restore : 0);
  }
  window.addEventListener('popstate', (e) => {
    const ni = (e.state && e.state.i) || 0;
    const type = ni < idx ? 'back' : 'forward';
    idx = ni;
    if (location.hash !== lastHash) onRoute(type);
  });
  window.addEventListener('hashchange', () => {
    // Qo'lda kiritilgan manzil
    if (location.hash !== lastHash) { history.replaceState({ i: ++idx }, ''); onRoute('push'); }
  });

  /* ================= Header ================= */
  function renderHeader(spec, v) {
    if (spec === 'none') { headerEl.hidden = true; return; }
    headerEl.hidden = false;
    if (spec === 'main') {
      const car = CO.store.state.activeCar;
      headerEl.className = 'header';
      headerEl.innerHTML = `
        <div class="header__inner">
          <div class="header__row">
            <a href="#/" class="logo" aria-label="CarOne"><span class="logo__mark">C1</span><span>Car<b>One</b></span></a>
            <span class="spacer"></span>
            <button class="car-pill" data-garage-pill>${I.car}<span>${car ? esc(car) : t('garage.pickShort')}</span>${I.down.replace('<svg', '<svg class="chev"')}</button>
            <a class="icon-btn icon-btn--soft" href="${CO.config.shop.phoneHref}" aria-label="${esc(t('acc.call'))}">${I.phone}</a>
          </div>
          <form class="search" id="searchForm" role="search" autocomplete="off">
            <div class="search__box">
              ${I.search.replace('<svg', '<svg class="search__icon"')}
              <input id="q" type="search" inputmode="search" enterkeyhint="search" placeholder="${esc(t('search.ph'))}" aria-label="${esc(t('search.label'))}" value="${esc(v.searchValue || '')}">
              <button type="button" class="search__clear" id="qClear" aria-label="${esc(t('common.clear'))}" ${v.searchValue ? '' : 'hidden'}>${I.close}</button>
              <a href="#/scan" class="search__cam" aria-label="${esc(t('scan.title'))}">${I.camera}</a>
            </div>
            <div class="panel" id="panel" hidden></div>
          </form>
        </div>`;
      $('[data-garage-pill]', headerEl).onclick = () => CO.garage.open();
      mountSearch();
    } else {
      const s = typeof spec === 'object' ? spec : {};
      headerEl.className = 'header header--compact';
      headerEl.innerHTML = `
        <div class="header__inner"><div class="header__row">
          ${s.noBack ? '<span style="width:40px"></span>' : `<button class="icon-btn" data-back aria-label="${esc(t('common.back'))}">${I.back}</button>`}
          <div class="header__title">${esc(s.title || '')}</div>
          ${(s.actions || []).map((a, i) => a.href
            ? `<a class="icon-btn" href="${a.href}" aria-label="${esc(a.label || '')}">${I[a.icon]}</a>`
            : `<button class="icon-btn" data-action="${i}" aria-label="${esc(a.label || '')}">${I[a.icon]}</button>`).join('') || '<span style="width:40px"></span>'}
        </div></div>`;
      const back = $('[data-back]', headerEl);
      if (back) back.onclick = () => router.back();
      $$('[data-action]', headerEl).forEach((b) => b.onclick = () => s.actions[+b.dataset.action].onClick());
    }
    document.documentElement.style.setProperty('--header-h', headerEl.offsetHeight + 'px');
  }

  window.addEventListener('scroll', () => headerEl.classList.toggle('is-scrolled', window.scrollY > 4), { passive: true });

  /* ================= Search panel ================= */
  function mountSearch() {
    const form = $('#searchForm'), input = $('#q'), panel = $('#panel'), clear = $('#qClear');
    let idx = -1, timer;
    const hide = () => { panel.hidden = true; idx = -1; };

    function show() {
      const q = input.value.trim();
      clear.hidden = !q;
      if (!q) {
        const hist = CO.store.state.history;
        // Bo'sh qidiruv sahifasida tarix sahifaning o'zida ko'rinadi
        if (!hist.length || /^#\/search(\?|$)/.test(location.hash)) { hide(); return; }
        panel.innerHTML = `
          <div class="panel__section"><div class="panel__title">${t('search.history')}<button type="button" data-clear-hist>${t('search.clear')}</button></div></div>
          ${hist.map((h) => `<a class="sug sug--hist" href="#/search?q=${encodeURIComponent(h)}">${I.history}<span class="sug__body"><span class="sug__name">${esc(h)}</span></span></a>`).join('')}`;
        $('[data-clear-hist]', panel).onclick = (e) => { e.preventDefault(); CO.store.clearHistory(); hide(); input.focus(); };
        panel.hidden = false; return;
      }
      if (q.length < 2) { hide(); return; }
      const res = CO.search.query(q).slice(0, 6);
      const ncats = CO.search.normalize(q);
      const cats = CO.api.categories().filter((c) => Object.values(c.name).some((n) => CO.search.normalize(n).startsWith(ncats.slice(0, 4)))).slice(0, 2);
      panel.innerHTML = `
        ${cats.map((c) => `<a class="sug" href="#/catalog/${c.id}"><span class="cat-row__icon" style="${CO.ui.catStyle(c.id)};width:42px;height:42px">${CO.catIcons[c.icon]}</span><span class="sug__body"><span class="sug__name">${esc(CO.i18n.pick(c.name))}</span><span class="sug__meta">${t('search.category')}</span></span></a>`).join('')}
        ${res.length ? res.map((p) => `
          <div class="sug" data-open="${p.id}" role="option">
            <span class="sug__thumb">${CO.ui.pimg(p)}</span>
            <span class="sug__body"><span class="sug__name">${CO.search.highlight(p.name, q, esc)}</span><span class="sug__meta">OEM ${esc(p.oem)} · ${esc(p.brand)}${p.stock <= 0 ? ' · ' + t('stock.out') : ''}</span></span>
            <span class="sug__price">${money(p.price)}</span>
          </div>`).join('') + `<a class="sug sug--all" href="#/search?q=${encodeURIComponent(q)}">${t('search.allResults')} →</a>`
        : `<a class="sug" href="#/scan"><span class="cat-row__icon" style="width:42px;height:42px">${I.camera}</span><span class="sug__body"><span class="sug__name">${t('search.nothing')}</span><span class="sug__meta">${t('search.tryPhoto')}</span></span></a>`}`;
      panel.hidden = false; idx = -1;
    }

    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(show, 100); });
    input.addEventListener('focus', show);
    input.addEventListener('keydown', (e) => {
      const items = $$('.sug', panel);
      if (panel.hidden || !items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((it, i) => it.classList.toggle('is-active', i === idx));
        items[idx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && idx >= 0) {
        e.preventDefault(); items[idx].click(); hide();
      } else if (e.key === 'Escape') { hide(); input.blur(); }
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.trim(); if (!q) return;
      CO.store.pushHistory(q);
      hide(); input.blur();
      router.go('#/search?q=' + encodeURIComponent(q));
    });
    clear.addEventListener('click', () => { input.value = ''; clear.hidden = true; input.focus(); show(); });
    panel.addEventListener('click', (e) => {
      const a = e.target.closest('a.sug, [data-open]');
      if (a && input.value.trim()) CO.store.pushHistory(input.value.trim());
      setTimeout(hide, 0);
    });
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#searchForm')) { const p = document.getElementById('panel'); if (p) p.hidden = true; }
  });

  /* ================= Global clicks ================= */
  document.addEventListener('click', (e) => {
    const tgt = e.target;
    const fav = tgt.closest('[data-fav]');
    if (fav) {
      e.preventDefault(); e.stopPropagation();
      const id = fav.dataset.fav;
      const on = CO.store.toggleFav(id);
      $$(`[data-fav="${id}"]`).forEach((b) => b.classList.toggle('is-on', on));
      CO.ui.toast(on ? t('fav.added') : t('fav.removed'), { icon: I.heart, link: on ? { href: '#/favorites', text: t('common.open') } : null });
      return;
    }
    const add = tgt.closest('[data-add]');
    if (add) {
      e.preventDefault(); e.stopPropagation();
      const p = CO.api.product(add.dataset.add);
      if (!p || p.stock <= 0) return;
      CO.store.add(p.id, 1, p.stock);
      CO.ui.refreshBuy(p.id);
      CO.ui.toast(t('cart.added'), { icon: I.cart, link: { href: '#/cart', text: t('cart.go') } });
      if (navigator.vibrate) navigator.vibrate(15);
      return;
    }
    const inc = tgt.closest('[data-inc]'), dec = tgt.closest('[data-dec]');
    if (inc || dec) {
      e.preventDefault(); e.stopPropagation();
      const id = (inc || dec).dataset[inc ? 'inc' : 'dec'];
      const p = CO.api.product(id);
      const q = CO.store.cartQty(id) + (inc ? 1 : -1);
      if (inc && q > p.stock) { CO.ui.toast(t('cart.maxStock', { n: p.stock }), { icon: I.alert }); return; }
      CO.store.setQty(id, q, p.stock);
      CO.ui.refreshBuy(id);
      return;
    }
    const open = tgt.closest('[data-open]');
    if (open && !tgt.closest('a[href]:not([data-open])')) {
      e.preventDefault();
      router.go('#/p/' + open.dataset.open);
      return;
    }
    if (tgt.closest('[data-close-sheet]')) { CO.ui.closeSheet(); return; }
    // Ichki havolalar — router orqali (orqaga tugmasi to'g'ri ishlashi uchun)
    const a = tgt.closest('a[href^="#/"], a[href="#"]');
    if (a && !a.target && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      router.go(a.getAttribute('href') === '#' ? '#/' : a.getAttribute('href'));
    }
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') CO.ui.closeSheet(); });

  /* ================= Badge ================= */
  function updateBadge(bump) {
    const n = CO.store.cartCount();
    const b = $('#cartBadge');
    b.textContent = n > 99 ? '99+' : n;
    b.hidden = n === 0;
    if (bump && n) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  }
  CO.store.on('cart', () => updateBadge(true));

  function renderTabbar() {
    tabbar.innerHTML = `
      <a href="#/" data-tab="home" class="tab">${I.home}<span>${t('tab.home')}</span></a>
      <a href="#/catalog" data-tab="catalog" class="tab">${I.grid}<span>${t('tab.catalog')}</span></a>
      <a href="#/scan" data-tab="scan" class="tab tab--scan" aria-label="${esc(t('scan.title'))}"><span class="tab__scan">${I.camera}</span><span>${t('tab.scan')}</span></a>
      <a href="#/cart" data-tab="cart" class="tab">${I.cart}<span>${t('tab.cart')}</span><i class="tab__badge" id="cartBadge" hidden>0</i></a>
      <a href="#/account" data-tab="account" class="tab">${I.user}<span>${t('tab.account')}</span></a>`;
    updateBadge(false);
  }

  /* ================= Start ================= */
  async function start() {
    CO.i18n.init();
    await CO.api.init();
    CO.search.build(CO.api.products(), CO.api.categories());
    renderTabbar();
    CO.i18n.onChange(() => { renderTabbar(); render({ keepScroll: true }); });
    render();
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  start();
})();
