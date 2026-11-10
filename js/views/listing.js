/* Ro'yxat sahifalari uchun umumiy filtr / saralash (Katalog, Qidiruv, Sevimlilar) */
(function () {
  const CO = window.CO;
  const { esc, grid, empty, openSheet, closeSheet, $, $$ } = CO.ui;
  const I = CO.icons;
  const t = (...a) => CO.i18n.t(...a);

  const SORTS = ['rel', 'pop', 'cheap', 'exp', 'new', 'sale'];

  function readFilters(params) {
    return {
      sort: params.get('sort') || '',
      fit: params.get('fit') === '1',
      stock: params.get('stock') === '1',
      sale: params.get('sale') === '1',
      brands: (params.get('brand') || '').split(',').filter(Boolean),
      min: +params.get('min') || 0,
      max: +params.get('max') || 0,
      car: params.get('car') || '',
    };
  }

  function apply(list, f, defaultSort = 'pop') {
    const car = f.car || (f.fit ? CO.store.state.activeCar : '');
    let l = list.filter((p) =>
      (!car || p.cars.includes(car) || !p.cars.length && !f.car) &&
      (!f.stock || p.stock > 0) &&
      (!f.sale || p.oldPrice > p.price) &&
      (!f.brands.length || f.brands.includes(p.brand)) &&
      (!f.min || p.price >= f.min) &&
      (!f.max || p.price <= f.max));
    const sort = f.sort || defaultSort;
    if (sort === 'cheap') l.sort((a, b) => a.price - b.price);
    else if (sort === 'exp') l.sort((a, b) => b.price - a.price);
    else if (sort === 'new') l.sort((a, b) => b.isNew - a.isNew);
    else if (sort === 'sale') l.sort((a, b) => CO.ui.discount(b) - CO.ui.discount(a));
    else if (sort === 'pop') l.sort((a, b) => (b.stock > 0) - (a.stock > 0) || (b.isHit - a.isHit) || b.stock - a.stock);
    // 'rel' — qidiruv tartibi saqlanadi, lekin tugaganlar oxirida
    else if (sort === 'rel') l.sort((a, b) => (b.stock > 0) - (a.stock > 0));
    return l;
  }

  function activeCount(f) {
    return (f.stock ? 1 : 0) + (f.sale ? 1 : 0) + f.brands.length + (f.min || f.max ? 1 : 0);
  }

  function setParams(base, params, patch) {
    const p = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (v === '' || v == null || v === false) p.delete(k); else p.set(k, v === true ? '1' : v); });
    const qs = p.toString();
    CO.router.replace(base + (qs ? '?' + qs : ''));
  }

  function toolbar(f, { withRel = false } = {}) {
    const car = CO.store.state.activeCar;
    const n = activeCount(f);
    const sortKey = f.sort || (withRel ? 'rel' : 'pop');
    return `
      <div class="toolbar">
        <div class="chips" style="margin:0;padding:0;flex:1">
          <button class="chip filter-btn" data-act="filters">${I.filter}${t('filter.title')}${n ? ` <span class="count" style="background:var(--primary);color:#fff">${n}</span>` : ''}</button>
          <button class="chip" data-act="sort">${I.sort}${t('sort.' + sortKey)}</button>
          ${car ? `<button class="chip ${f.fit ? 'is-active' : ''}" data-toggle="fit">${I.car}${esc(car)}</button>`
            : `<button class="chip chip--soft" data-act="garage">${I.car}${t('garage.pick')}</button>`}
          <button class="chip ${f.stock ? 'is-active' : ''}" data-toggle="stock">${t('filter.inStock')}</button>
          <button class="chip ${f.sale ? 'is-active' : ''}" data-toggle="sale">${I.tag}${t('filter.sale')}</button>
        </div>
      </div>`;
  }

  function results(list, emptyOpts) {
    return list.length
      ? `<div class="toolbar__count">${t('list.count', { n: list.length })}</div>${grid(list)}`
      : empty(emptyOpts);
  }

  function mountToolbar(root, base, params, source, { withRel = false } = {}) {
    const f = readFilters(params);
    $$('[data-toggle]', root).forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.toggle;
      setParams(base, params, { [k]: !f[k] });
    }));
    $$('[data-act]', root).forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.act;
      if (a === 'sort') openSort(base, params, f, withRel);
      if (a === 'filters') openFilters(base, params, f, source);
      if (a === 'garage') CO.garage.open();
    }));
  }

  function openSort(base, params, f, withRel) {
    const cur = f.sort || (withRel ? 'rel' : 'pop');
    const list = SORTS.filter((s) => withRel || s !== 'rel');
    openSheet({
      title: t('sort.title'),
      body: `<div class="options">${list.map((s) => `
        <label class="option"><input type="radio" name="sort" value="${s}" ${s === cur ? 'checked' : ''}>
          <span class="option__body"><b>${t('sort.' + s)}</b></span><span class="option__radio"></span></label>`).join('')}</div>`,
    });
    $$('#sheet input[name=sort]').forEach((r) => r.addEventListener('change', () => {
      closeSheet(); setParams(base, params, { sort: r.value === (withRel ? 'rel' : 'pop') ? '' : r.value });
    }));
  }

  function openFilters(base, params, f, source) {
    const brands = [...new Set(source.map((p) => p.brand))].sort();
    const prices = source.map((p) => p.price);
    const lo = prices.length ? Math.min(...prices) : 0, hi = prices.length ? Math.max(...prices) : 0;
    openSheet({
      title: t('filter.title'),
      body: `
        <div class="form">
          <label class="check"><span><b>${t('filter.inStock')}</b></span><span class="switch"><input type="checkbox" id="fStock" ${f.stock ? 'checked' : ''}><i></i></span></label>
          <label class="check"><span><b>${t('filter.sale')}</b></span><span class="switch"><input type="checkbox" id="fSale" ${f.sale ? 'checked' : ''}><i></i></span></label>
          ${CO.store.state.activeCar ? `<label class="check"><span><b>${t('filter.fitMyCar', { car: esc(CO.store.state.activeCar) })}</b></span><span class="switch"><input type="checkbox" id="fFit" ${f.fit ? 'checked' : ''}><i></i></span></label>` : ''}
          <div>
            <div class="field__label">${t('filter.price')} <span class="muted">(${CO.ui.money(lo)} – ${CO.ui.money(hi)})</span></div>
            <div class="row2 field">
              <input type="number" inputmode="numeric" id="fMin" placeholder="${t('filter.from')}" value="${f.min || ''}">
              <input type="number" inputmode="numeric" id="fMax" placeholder="${t('filter.to')}" value="${f.max || ''}">
            </div>
          </div>
          ${brands.length > 1 ? `<div>
            <div class="field__label">${t('filter.brand')}</div>
            <div class="chips chips--wrap">${brands.map((b) => `<button type="button" class="chip chip--sm ${f.brands.includes(b) ? 'is-active' : ''}" data-brand="${esc(b)}">${esc(b)}</button>`).join('')}</div>
          </div>` : ''}
        </div>`,
      foot: `<button class="btn btn--line" id="fReset">${t('filter.reset')}</button><button class="btn" id="fApply">${t('filter.apply')}</button>`,
    });
    const sel = new Set(f.brands);
    $$('#sheet [data-brand]').forEach((b) => b.addEventListener('click', () => {
      const v = b.dataset.brand;
      sel.has(v) ? sel.delete(v) : sel.add(v);
      b.classList.toggle('is-active');
    }));
    $('#fReset').onclick = () => { closeSheet(); setParams(base, params, { stock: '', sale: '', fit: '', brand: '', min: '', max: '' }); };
    $('#fApply').onclick = () => {
      const patch = {
        stock: $('#fStock').checked, sale: $('#fSale').checked,
        brand: [...sel].join(','), min: $('#fMin').value, max: $('#fMax').value,
      };
      if ($('#fFit')) patch.fit = $('#fFit').checked;
      closeSheet(); setParams(base, params, patch);
    };
  }

  CO.listing = { readFilters, apply, toolbar, results, mountToolbar, setParams };
})();
