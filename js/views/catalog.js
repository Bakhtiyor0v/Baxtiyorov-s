/* Katalog, kategoriya, qidiruv natijalari, sevimlilar */
(function () {
  const CO = window.CO;
  const { esc } = CO.ui;
  const I = CO.icons;
  const t = (...a) => CO.i18n.t(...a);
  const L = (o) => CO.i18n.pick(o);

  // #/catalog  — kategoriyalar ro'yxati (yoki filtr bilan barcha mahsulotlar)
  function catalog(params, [catId]) {
    const all = CO.api.products();
    const hasFilter = ['all', 'car', 'sale', 'sort', 'stock', 'fit', 'brand', 'min', 'max'].some((k) => params.has(k));
    if (!catId && !hasFilter) {
      const cats = CO.api.categories();
      const counts = Object.fromEntries(cats.map((c) => [c.id, all.filter((p) => p.cat === c.id).length]));
      const quick = CO.api.db.quickCars;
      const html = `
        <h1 class="page-title">${t('catalog.title')}</h1>
        <div class="section__head"><h2 class="section__title" style="font-size:16px">${t('catalog.byCar')}</h2></div>
        <div class="chips">${quick.map((c) => `<a class="chip" href="#/catalog?car=${encodeURIComponent(c)}">${esc(c)}</a>`).join('')}
          <button class="chip chip--soft" data-garage>${I.plus}${t('catalog.otherCar')}</button></div>
        <div class="cat-list" style="margin-top:18px">
          <a class="cat-row" href="#/catalog?all=1"><span class="cat-row__icon">${I.grid}</span><span class="cat-row__name">${t('catalog.all')}</span><span class="cat-row__count">${all.length}</span>${I.chevron}</a>
          <a class="cat-row" href="#/catalog?sale=1&sort=sale" style="--cat-color:#ff5a5f;--tint:#ffecec"><span class="cat-row__icon">${I.tag}</span><span class="cat-row__name">${t('catalog.sale')}</span><span class="cat-row__count">${all.filter((p) => p.oldPrice > p.price).length}</span>${I.chevron}</a>
          ${cats.map((c) => `
            <a class="cat-row" href="#/catalog/${c.id}" style="${CO.ui.catStyle(c.id)}">
              <span class="cat-row__icon">${CO.catIcons[c.icon] || CO.catIcons.box}</span>
              <span class="cat-row__name">${esc(L(c.name))}</span><span class="cat-row__count">${counts[c.id]}</span>${I.chevron}
            </a>`).join('')}
        </div>`;
      return {
        html, header: 'main', tab: 'catalog',
        mount(root) { root.querySelector('[data-garage]').onclick = () => CO.garage.open(); },
      };
    }

    const cat = catId ? CO.api.category(catId) : null;
    const f = CO.listing.readFilters(params);
    const source = all.filter((p) => !cat || p.cat === cat.id);
    const list = CO.listing.apply(source, f);
    const title = cat ? L(cat.name) : f.car ? t('catalog.forCar', { car: f.car }) : f.sale ? t('catalog.sale') : t('catalog.all');
    const base = '#/catalog' + (catId ? '/' + catId : '');
    const html = `
      <h1 class="page-title">${esc(title)}</h1>
      ${CO.listing.toolbar(f)}
      ${CO.listing.results(list, {
        title: t('list.empty.title'), text: t('list.empty.text'),
        actions: `<a class="btn btn--ghost" href="${base}">${t('filter.reset')}</a> <a class="btn" href="#/scan">${I.camera}${t('scan.short')}</a>`,
      })}`;
    return {
      html, header: 'main', tab: 'catalog',
      mount(root) { CO.listing.mountToolbar(root, base, params, source); },
    };
  }

  // #/search?q=
  function search(params) {
    const q = (params.get('q') || '').trim();
    if (!q) return searchStart();
    const f = CO.listing.readFilters(params);
    const found = q ? CO.search.query(q) : [];
    const list = CO.listing.apply(found, f, 'rel');
    const cats = [...new Set(found.map((p) => p.cat))].slice(0, 5).map((id) => CO.api.category(id));
    const html = `
      <h1 class="page-title">«${esc(q)}»</h1>
      ${found.length ? CO.listing.toolbar(f, { withRel: true }) : ''}
      ${cats.length > 1 ? `<div class="chips" style="margin-bottom:10px">${cats.map((c) => `<a class="chip chip--sm chip--soft" href="#/catalog/${c.id}">${esc(L(c.name))}</a>`).join('')}</div>` : ''}
      ${CO.listing.results(list, {
        icon: I.search,
        title: found.length ? t('list.empty.title') : t('search.empty.title'),
        text: found.length ? t('list.empty.text') : t('search.empty.text'),
        actions: `<a class="btn" href="#/scan">${I.camera}${t('scan.short')}</a>
          <div style="margin-top:12px"><a class="link" href="https://t.me/${CO.config.shop.telegram}?text=${encodeURIComponent(t('search.askText', { q }))}" target="_blank" rel="noopener">${t('search.ask')}</a></div>`,
      })}`;
    return {
      html, header: 'main', tab: 'catalog', searchValue: q,
      mount(root) { CO.listing.mountToolbar(root, '#/search', params, found, { withRel: true }); },
    };
  }

  // #/search (bo'sh) — tarix, ommabop so'rovlar, kategoriyalar
  function searchStart() {
    const hist = CO.store.state.history;
    const popular = CO.i18n.lang() === 'ru'
      ? ['масляный фильтр', 'колодки Cobalt', 'свечи', 'амортизатор Нексия', 'антифриз', 'лампа H4']
      : ['moy filtri', 'Cobalt kolodka', 'svecha', 'Nexia amortizator', 'antifriz', 'lampa H4'];
    const html = `
      <div style="height:8px"></div>
      ${hist.length ? `<section class="section" style="margin-top:12px">
        <div class="section__head"><h2 class="section__title" style="font-size:16px">${I.history}${t('search.history')}</h2><button class="section__link" data-clear>${t('search.clear')}</button></div>
        <div class="chips chips--wrap">${hist.map((h) => `<a class="chip chip--sm" href="#/search?q=${encodeURIComponent(h)}">${esc(h)}</a>`).join('')}</div>
      </section>` : ''}
      <section class="section" style="margin-top:16px">
        <div class="section__head"><h2 class="section__title" style="font-size:16px">${I.fire}${t('search.popular')}</h2></div>
        <div class="chips chips--wrap">${popular.map((h) => `<a class="chip chip--sm chip--soft" href="#/search?q=${encodeURIComponent(h)}">${esc(h)}</a>`).join('')}</div>
      </section>
      <a class="garage-card" href="#/scan" style="margin-top:20px">
        <span class="garage-card__icon">${I.camera}</span>
        <span class="garage-card__body"><span class="garage-card__title" style="display:block">${t('search.byPhoto')}</span><span class="garage-card__sub">${t('search.byPhoto.sub')}</span></span>${I.chevron}
      </a>
      <div class="note" style="margin-top:14px">${I.info}<div>${t('search.tips')}</div></div>`;
    return {
      html, header: 'main', tab: 'catalog', focusSearch: true,
      mount(root) { const b = root.querySelector('[data-clear]'); if (b) b.onclick = () => { CO.store.clearHistory(); CO.router.render(); }; },
    };
  }

  // #/favorites
  function favorites(params) {
    const list = CO.store.state.favs.map((id) => CO.api.product(id)).filter(Boolean);
    const html = list.length
      ? `<h1 class="page-title">${t('fav.title')}<small>${list.length}</small></h1>${CO.ui.grid(list)}`
      : CO.ui.empty({ icon: I.heart, title: t('fav.empty.title'), text: t('fav.empty.text'), actions: `<a class="btn" href="#/catalog">${t('cart.toCatalog')}</a>` });
    return { html, header: { back: true, title: t('fav.title') }, tab: 'account' };
  }

  CO.views = CO.views || {};
  Object.assign(CO.views, { catalog, search, favorites });
})();
