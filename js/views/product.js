/* Mahsulot sahifasi: #/p/:id */
(function () {
  const CO = window.CO;
  const { esc, money, pimg, badges, priceHtml, stockHtml, hscroll, sectionHead, discount } = CO.ui;
  const I = CO.icons;
  const t = (...a) => CO.i18n.t(...a);
  const L = (o) => CO.i18n.pick(o);

  const COUNTRY = { KR: '🇰🇷', JP: '🇯🇵', DE: '🇩🇪', CN: '🇨🇳', US: '🇺🇸', RU: '🇷🇺', NL: '🇳🇱', BE: '🇧🇪', TW: '🇹🇼', UZ: '🇺🇿' };

  function fitBox(p) {
    const car = CO.store.state.activeCar;
    if (!p.cars.length) return `<div class="fitbox fitbox--yes">${I.check}<div><b>${t('fit.universal')}</b>${t('fit.universal.text')}</div></div>`;
    if (!car) return `<div class="fitbox fitbox--ask">${I.car}<div><b>${t('fit.ask')}</b>${t('fit.ask.text')}</div><button class="btn btn--sm" data-garage>${t('garage.pickShort')}</button></div>`;
    if (p.cars.includes(car)) return `<div class="fitbox fitbox--yes">${I.check}<div><b>${t('fit.yes', { car: esc(car) })}</b>${t('fit.yes.text')}</div></div>`;
    return `<div class="fitbox fitbox--no">${I.alert}<div><b>${t('fit.no', { car: esc(car) })}</b>${t('fit.no.text')}</div></div>`;
  }

  function buybar(p) {
    const q = CO.store.cartQty(p.id);
    const fav = CO.store.isFav(p.id);
    let action;
    if (p.stock <= 0) action = `<a class="btn" href="https://t.me/${CO.config.shop.telegram}?text=${encodeURIComponent(t('product.askStock', { name: p.name, sku: p.sku }))}" target="_blank" rel="noopener">${t('product.notify')}</a>`;
    else if (!q) action = `<button class="btn" data-add="${p.id}">${I.cart}${t('cart.add')}</button>`;
    else action = `<div class="stepper stepper--lg"><button data-dec="${p.id}" aria-label="−">${I.minus}</button><span>${q}</span><button data-inc="${p.id}" aria-label="+" ${q >= p.stock ? 'disabled' : ''}>${I.plus}</button></div>
      <a class="btn" href="#/cart">${t('product.goCart')}</a>`;
    return `
      <div class="buybar__inner">
        <button class="icon-btn icon-btn--soft ${fav ? 'is-on' : ''}" data-fav="${p.id}" aria-label="${esc(t('fav.toggle'))}">${I.heart}</button>
        ${q ? '' : `<div class="buybar__price">${priceHtml(p)}</div>`}
        ${action}
      </div>`;
  }

  function view(params, [id]) {
    const p = CO.api.product(id);
    if (!p) {
      return { html: CO.ui.empty({ title: t('product.notFound'), actions: `<a class="btn" href="#/catalog">${t('cart.toCatalog')}</a>` }), header: { back: true, title: '' } };
    }
    const cat = CO.api.category(p.cat);
    const all = CO.api.products();
    const analogs = all.filter((x) => x.id !== p.id && x.cat === p.cat && x.cars.some((c) => p.cars.includes(c)));
    const sameCar = all.filter((x) => x.id !== p.id && x.cat !== p.cat && x.stock > 0 && x.cars.some((c) => p.cars.includes(c))).slice(0, 10);
    const d = discount(p);

    const html = `
      <div class="pd">
        <div class="pd__layout">
          <div class="pd__gallery">${pimg(p, { code: true })}${badges(p)}</div>
          <div>
            <div class="pd__main">
              <div class="pd__price">${priceHtml(p).replace(/^<div class="price">|<\/div>$/g, '')}${d ? `<span class="pd__save">${t('product.save', { sum: money(p.oldPrice - p.price) })}</span>` : ''}</div>
              <h1 class="pd__name">${esc(p.name)}</h1>
              <div class="pd__row">
                ${stockHtml(p)}<span class="sep"></span>
                <button class="copy" data-copy="${esc(p.oem)}" title="${esc(t('product.copy'))}">OEM: ${esc(p.oem)}</button><span class="sep"></span>
                <span>${t('product.sku')}: ${esc(p.sku)}</span>
              </div>
              ${fitBox(p)}
            </div>

            <div class="card-box" style="margin-top:12px">
              <h2 class="card-box__title">${t('product.specs')}</h2>
              <ul class="specs">
                <li><span>${t('product.brand')}</span><span>${esc(p.brand)} ${COUNTRY[p.country] || ''}</span></li>
                <li><span>${t('product.category')}</span><span><a class="link" href="#/catalog/${p.cat}">${esc(L(cat?.name || {}))}</a></span></li>
                <li><span>${t('product.oem')}</span><span>${esc(p.oem)}</span></li>
                <li><span>${t('product.sku')}</span><span>${esc(p.sku)}</span></li>
                <li><span>${t('product.barcode')}</span><span>${esc(p.barcode)}</span></li>
                <li><span>${t('product.unit')}</span><span>${t('unit.' + p.unit)}</span></li>
              </ul>
            </div>

            <div class="card-box">
              <h2 class="card-box__title">${t('product.fitsCars')}</h2>
              ${p.cars.length
                ? `<div class="chips chips--wrap">${p.cars.map((c) => `<a class="chip chip--sm ${c === CO.store.state.activeCar ? 'is-active' : ''}" href="#/catalog?car=${encodeURIComponent(c)}">${esc(c)}</a>`).join('')}</div>`
                : `<p class="muted" style="margin:0">${t('fit.universal.text')}</p>`}
            </div>

            <div class="card-box perks">
              <div class="perk">${I.shield}<div>${t('product.perk1')}<small>${t('product.perk1.sub')}</small></div></div>
              <div class="perk">${I.store}<div>${t('product.perk2')}<small>${esc(L(CO.config.shop.address))} · ${esc(L(CO.config.shop.hours))}</small></div></div>
              <div class="perk">${I.truck}<div>${t('product.perk3')}<small>${t('product.perk3.sub', { sum: money(CO.config.delivery.freeFrom) })}</small></div></div>
              <a class="perk" href="https://t.me/${CO.config.shop.telegram}?text=${encodeURIComponent(t('product.askText', { name: p.name, sku: p.sku }))}" target="_blank" rel="noopener">${I.telegram}<div class="link">${t('product.ask')}<small>${t('product.ask.sub')}</small></div></a>
            </div>
          </div>
        </div>

        ${analogs.length ? `<section class="section">${sectionHead(t('product.analogs'), '')}${hscroll(analogs)}</section>` : ''}
        ${sameCar.length ? `<section class="section">${sectionHead(t('product.withThis'), '')}${hscroll(sameCar)}</section>` : ''}
      </div>
      <div class="buybar" id="buybar">${buybar(p)}</div>`;

    function mount(root) {
      CO.store.pushRecent(p.id);
      root.querySelectorAll('[data-garage]').forEach((b) => b.onclick = () => CO.garage.open());
      root.querySelectorAll('[data-copy]').forEach((b) => b.onclick = async () => {
        try { await navigator.clipboard.writeText(b.dataset.copy); CO.ui.toast(t('product.copied')); } catch (_) { /* ruxsat yo'q */ }
      });
      const refresh = () => { const bb = document.getElementById('buybar'); if (bb) bb.innerHTML = buybar(p); };
      const off1 = CO.store.on('cart', refresh);
      const off2 = CO.store.on('favs', refresh);
      return () => { off1(); off2(); };
    }

    async function share() {
      const data = { title: p.name, text: `${p.name} — ${money(p.price)}`, url: location.href };
      try {
        if (navigator.share) await navigator.share(data);
        else { await navigator.clipboard.writeText(location.href); CO.ui.toast(t('product.linkCopied')); }
      } catch (_) { /* bekor qilindi */ }
    }

    return {
      html, mount, tab: 'catalog', noTabbar: true,
      header: { back: true, title: '', actions: [{ icon: 'search', href: '#/search' }, { icon: 'share', onClick: share, label: t('product.share') }] },
    };
  }

  CO.views = CO.views || {};
  CO.views.product = view;
})();
