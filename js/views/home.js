/* Bosh sahifa */
(function () {
  const CO = window.CO;
  const { esc, sectionHead, hscroll, grid } = CO.ui;
  const I = CO.icons;
  const t = (...a) => CO.i18n.t(...a);
  const L = (o) => CO.i18n.pick(o);

  function view() {
    const products = CO.api.products();
    const cats = CO.api.categories();
    const car = CO.store.state.activeCar;
    const inStock = products.filter((p) => p.stock > 0);
    const forCar = car ? inStock.filter((p) => p.cars.includes(car)) : [];
    const sale = inStock.filter((p) => p.oldPrice > p.price);
    const hits = inStock.filter((p) => p.isHit);
    const fresh = inStock.filter((p) => p.isNew);
    const popular = inStock.slice().sort((a, b) => (b.isHit - a.isHit) || b.stock - a.stock).slice(0, 10);
    const recent = CO.store.state.recent.map((id) => CO.api.product(id)).filter(Boolean).slice(0, 10);

    const html = `
      <div class="banners">
        <div class="hscroll" id="banners">
          <a class="banner banner--1" href="#/scan">
            <div><h3>${t('home.b1.title')}</h3><p>${t('home.b1.text')}</p></div>
            <span class="btn btn--white btn--sm">${I.camera}${t('home.b1.btn')}</span>
            <span class="banner__art">${I.camera}</span>
          </a>
          <a class="banner banner--2" href="#/catalog?sale=1">
            <div><h3>${t('home.b2.title')}</h3><p>${t('home.b2.text')}</p></div>
            <span class="btn btn--white btn--sm">${t('home.b2.btn')}</span>
            <span class="banner__art">${I.tag}</span>
          </a>
          <a class="banner banner--3" href="#/account">
            <div><h3>${t('home.b3.title')}</h3><p>${t('home.b3.text')}</p></div>
            <span class="btn btn--white btn--sm">${t('home.b3.btn')}</span>
            <span class="banner__art">${I.truck}</span>
          </a>
        </div>
        <div class="dots" id="bannerDots"><i class="is-on"></i><i></i><i></i></div>
      </div>

      <button class="garage-card" data-garage>
        <span class="garage-card__icon">${I.car}</span>
        <span class="garage-card__body">
          <span class="garage-card__title">${car ? t('home.garage.for', { car: esc(car) }) : t('home.garage.title')}</span>
          <span class="garage-card__sub" style="display:block">${car ? t('home.garage.change') : t('home.garage.sub')}</span>
        </span>
        ${I.chevron}
      </button>

      <section class="section">
        ${sectionHead(t('home.categories'), '#/catalog')}
        <div class="cats">
          ${cats.map((c) => `
            <a class="cat" href="#/catalog/${c.id}" style="${CO.ui.catStyle(c.id)}">
              <span class="cat__icon">${CO.catIcons[c.icon] || CO.catIcons.box}</span>${esc(L(c.name))}
            </a>`).join('')}
        </div>
      </section>

      ${forCar.length ? `<section class="section">${sectionHead(t('home.forCar', { car: esc(car) }), '#/catalog?car=' + encodeURIComponent(car), I.car)}${hscroll(forCar.slice(0, 12))}</section>` : ''}

      ${sale.length ? `<section class="section">${sectionHead(t('home.sale'), '#/catalog?sale=1&sort=sale', I.tag)}${hscroll(sale)}</section>` : ''}

      <div class="features">
        <div class="feature">${I.shield}${t('home.f1')}</div>
        <div class="feature">${I.camera}${t('home.f2')}</div>
        <div class="feature">${I.truck}${t('home.f3')}</div>
      </div>

      ${hits.length ? `<section class="section">${sectionHead(t('home.hits'), '#/catalog?sort=pop', I.fire)}${hscroll(hits)}</section>` : ''}

      ${fresh.length ? `<section class="section">${sectionHead(t('home.new'), '#/catalog?sort=new', I.sparkle)}${hscroll(fresh)}</section>` : ''}

      ${recent.length ? `<section class="section">${sectionHead(t('home.recent'), '')}${hscroll(recent)}</section>` : ''}

      <section class="section">
        ${sectionHead(t('home.popular'), '#/catalog')}
        ${grid(popular)}
        <div style="text-align:center;margin-top:16px"><a class="btn btn--ghost" href="#/catalog?all=1">${t('home.allProducts')}</a></div>
      </section>

      <footer class="footer">
        <div><b>${esc(CO.config.shop.name)}</b> — ${esc(L(CO.config.shop.slogan))}</div>
        <div>${esc(L(CO.config.shop.hours))} · <a href="${CO.config.shop.phoneHref}">${esc(CO.config.shop.phone)}</a></div>
      </footer>`;

    function mount(root) {
      root.querySelector('[data-garage]').addEventListener('click', () => CO.garage.open());
      // Banner nuqtalari + avtomatik aylanish
      const strip = root.querySelector('#banners');
      const dots = [...root.querySelectorAll('#bannerDots i')];
      const update = () => {
        const w = strip.firstElementChild.getBoundingClientRect().width + 10;
        const i = Math.round(strip.scrollLeft / w);
        dots.forEach((d, k) => d.classList.toggle('is-on', k === Math.min(i, dots.length - 1)));
      };
      strip.addEventListener('scroll', update, { passive: true });
      let paused = false;
      strip.addEventListener('touchstart', () => { paused = true; }, { passive: true });
      const timer = setInterval(() => {
        if (paused || !document.body.contains(strip)) return;
        const w = strip.firstElementChild.getBoundingClientRect().width + 10;
        const max = strip.scrollWidth - strip.clientWidth;
        const next = strip.scrollLeft + w > max + 4 ? 0 : strip.scrollLeft + w;
        strip.scrollTo({ left: next, behavior: 'smooth' });
      }, 5000);
      return () => clearInterval(timer);
    }

    return { html, mount, header: 'main', tab: 'home' };
  }

  CO.views = CO.views || {};
  CO.views.home = view;
})();
