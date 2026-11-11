/* Kabinet (#/account), buyurtmalar (#/orders), garaj (#/garage) + garaj tanlash oynasi */
(function () {
  const CO = window.CO;
  const { esc, money, pimg, empty, openSheet, closeSheet } = CO.ui;
  const I = CO.icons;
  const t = (...a) => CO.i18n.t(...a);
  const L = (o) => CO.i18n.pick(o);
  const shop = () => CO.config.shop;

  function contacts() {
    const s = shop();
    return `
      <div class="menu">
        <a class="menu__item" href="${s.phoneHref}">${I.phone}<span>${t('acc.call')}</span><small>${esc(s.phone)}</small>${I.chevron}</a>
        <a class="menu__item" href="https://t.me/${s.telegram}" target="_blank" rel="noopener">${I.telegram}<span>Telegram</span><small>@${esc(s.telegram)}</small>${I.chevron}</a>
        <a class="menu__item" ${s.mapUrl ? `href="${esc(s.mapUrl)}" target="_blank" rel="noopener"` : ''}>${I.pin}<span>${t('acc.address')}</span><small>${esc(L(s.address))}</small>${I.chevron}</a>
        <div class="menu__item">${I.clock}<span>${t('acc.hours')}</span><small>${esc(L(s.hours))}</small></div>
      </div>`;
  }

  function langMenu() {
    const cur = CO.i18n.lang();
    return `
      <div class="menu">
        <div class="menu__item">${I.globe}<span>${t('acc.lang')}</span>
          <div class="seg" style="width:150px"><button data-lang="uz" class="${cur === 'uz' ? 'is-active' : ''}">O'zbek</button><button data-lang="ru" class="${cur === 'ru' ? 'is-active' : ''}">Русский</button></div>
        </div>
      </div>`;
  }

  function mountCommon(root) {
    root.querySelectorAll('[data-lang]').forEach((b) => b.onclick = () => { CO.i18n.set(b.dataset.lang); });
    root.querySelectorAll('[data-garage]').forEach((b) => b.onclick = () => CO.garage.open());
  }

  function account() {
    const st = CO.store.state;
    const u = st.user;
    let html;
    if (!u) {
      html = `
        <h1 class="page-title">${t('acc.title')}</h1>
        <div class="card-box">
          <div style="display:flex;gap:14px;align-items:center;margin-bottom:14px">
            <div class="avatar" style="background:var(--primary-50);color:var(--primary)">${I.user}</div>
            <div><b style="font-size:16px">${t('acc.welcome')}</b><div class="muted" style="font-size:13px">${t('acc.welcome.sub')}</div></div>
          </div>
          <form class="form" id="login" novalidate>
            <div class="field"><label for="lName">${t('form.name')}</label><input id="lName" name="name" autocomplete="name" required placeholder="${esc(t('form.name.ph'))}"></div>
            <div class="field"><label for="lPhone">${t('form.phone')}</label><input id="lPhone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="+998 90 123 45 67"></div>
            <button class="btn btn--block" type="submit">${t('acc.login')}</button>
            <p class="muted" style="font-size:12px;margin:0;text-align:center">${t('acc.localNote')}</p>
          </form>
        </div>`;
    } else {
      html = `
        <div class="profile">
          <div class="avatar">${esc((u.name || '?').trim()[0].toUpperCase())}</div>
          <div style="flex:1;min-width:0"><div class="profile__name">${esc(u.name)}</div><div class="muted">${esc(u.phone)}</div></div>
          <button class="icon-btn icon-btn--soft" data-edit aria-label="${esc(t('acc.edit'))}">${I.edit}</button>
        </div>
        <div class="stats">
          <a class="stat" href="#/orders"><b>${st.orders.length}</b><span>${t('acc.orders')}</span></a>
          <a class="stat" href="#/favorites"><b>${st.favs.length}</b><span>${t('acc.favs')}</span></a>
          <a class="stat" href="#/garage"><b>${st.garage.length}</b><span>${t('acc.cars')}</span></a>
        </div>`;
    }
    const active = st.activeCar;
    html += `
      <div class="menu">
        <a class="menu__item" href="#/garage">${I.car}<span>${t('garage.title')}</span><small>${active ? esc(active) : t('garage.none')}</small>${I.chevron}</a>
        <a class="menu__item" href="#/orders">${I.receipt}<span>${t('orders.title')}</span><small>${st.orders.length || ''}</small>${I.chevron}</a>
        <a class="menu__item" href="#/favorites">${I.heart}<span>${t('fav.title')}</span><small>${st.favs.length || ''}</small>${I.chevron}</a>
      </div>
      ${langMenu()}
      <div class="menu"><a class="menu__item" href="#/admin">${I.camera}<span>${t('acc.owner')}</span><small>${t('acc.owner.sub')}</small>${I.chevron}</a></div>
      <h2 class="section__title" style="font-size:16px;margin:22px 0 0">${t('acc.contacts')}</h2>
      ${contacts()}
      ${u ? `<div class="menu"><button class="menu__item menu__item--danger" data-logout>${I.logout}<span>${t('acc.logout')}</span></button></div>` : ''}
      <footer class="footer">${esc(shop().name)} · ${esc(L(shop().slogan))}</footer>`;

    function mount(root) {
      mountCommon(root);
      const form = root.querySelector('#login');
      if (form) {
        const phone = form.querySelector('#lPhone');
        phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+998 '; });
        phone.addEventListener('input', () => { phone.value = CO.formatPhone(phone.value); });
        form.onsubmit = (e) => {
          e.preventDefault();
          const name = form.name.value.trim(), ph = form.phone.value.trim();
          if (name.length < 2) { form.name.focus(); CO.ui.toast(t('form.err.name'), { icon: I.alert }); return; }
          if (ph.replace(/\D/g, '').length !== 12) { form.phone.focus(); CO.ui.toast(t('form.err.phone'), { icon: I.alert }); return; }
          CO.store.set('user', { name, phone: ph });
          CO.ui.toast(t('acc.hello', { name: esc(name) }));
          CO.router.render();
        };
      }
      const out = root.querySelector('[data-logout]');
      if (out) out.onclick = () => { if (confirm(t('acc.logoutConfirm'))) { CO.store.set('user', null); CO.router.render(); } };
      const edit = root.querySelector('[data-edit]');
      if (edit) edit.onclick = () => editProfile();
    }
    return { html, mount, header: { title: t('acc.title'), noBack: true }, tab: 'account' };
  }

  function editProfile() {
    const u = CO.store.state.user || {};
    openSheet({
      title: t('acc.edit'),
      body: `<form class="form" id="editForm">
        <div class="field"><label for="eName">${t('form.name')}</label><input id="eName" value="${esc(u.name || '')}"></div>
        <div class="field"><label for="ePhone">${t('form.phone')}</label><input id="ePhone" type="tel" inputmode="tel" value="${esc(u.phone || '')}"></div>
      </form>`,
      foot: `<button class="btn" id="eSave">${t('common.save')}</button>`,
    });
    const ph = document.getElementById('ePhone');
    ph.addEventListener('input', () => { ph.value = CO.formatPhone(ph.value); });
    document.getElementById('eSave').onclick = () => {
      const name = document.getElementById('eName').value.trim();
      if (name.length < 2 || ph.value.replace(/\D/g, '').length !== 12) { CO.ui.toast(t('form.err.check'), { icon: I.alert }); return; }
      CO.store.set('user', { name, phone: ph.value.trim() });
      closeSheet(); CO.router.render();
    };
  }

  function orders() {
    const list = CO.store.state.orders;
    const html = list.length ? `<div style="margin-top:16px">${list.map((o) => {
      const ps = o.items.map((i) => CO.api.product(i.id)).filter(Boolean);
      return `
        <a class="order" href="#/order/${o.no}" style="display:block">
          <div class="order__head"><span class="order__no">${t('order.no', { no: o.no })}</span><span class="status">${t('status.' + o.status)}</span></div>
          <div class="order__thumbs">${ps.slice(0, 4).map((p) => pimg(p)).join('')}${ps.length > 4 ? `<span class="more">+${ps.length - 4}</span>` : ''}</div>
          <div class="order__foot"><span>${new Date(o.date).toLocaleDateString('ru-RU')} · ${t('cart.items', { n: o.items.reduce((s, i) => s + i.qty, 0) })}</span><b>${money(o.total)}</b></div>
        </a>`; }).join('')}</div>`
      : empty({ icon: I.receipt, title: t('orders.empty.title'), text: t('orders.empty.text'), actions: `<a class="btn" href="#/catalog">${t('cart.toCatalog')}</a>` });
    return { html, header: { back: true, title: t('orders.title') }, tab: 'account' };
  }

  function garage() {
    const st = CO.store.state;
    const html = `
      <div class="card-box" style="margin-top:16px">
        ${st.garage.length ? st.garage.map((c) => `
          <div class="car-item ${c.model === st.activeCar ? 'is-active' : ''}">
            <span class="car-item__icon">${I.car}</span>
            <div class="car-item__body" data-activate="${esc(c.model)}"><b>${esc(c.model)}</b><small>${c.year ? esc(c.year) + ' · ' : ''}${c.model === st.activeCar ? '' : t('garage.tapToSelect')}</small></div>
            ${c.model === st.activeCar ? `<span class="tag-active">${t('garage.active')}</span>` : ''}
            <button class="cart-line__del" data-remove="${c.id}" aria-label="${esc(t('common.delete'))}">${I.trash}</button>
          </div>`).join('') : `<p class="muted" style="margin:0 0 4px">${t('garage.emptyText')}</p>`}
      </div>
      <button class="btn btn--block" data-garage style="margin-top:12px">${I.plus}${t('garage.add')}</button>
      <div class="note" style="margin-top:14px">${I.info}<div>${t('garage.why')}</div></div>`;
    return {
      html, header: { back: true, title: t('garage.title') }, tab: 'account',
      mount(root) {
        mountCommon(root);
        root.querySelectorAll('[data-activate]').forEach((b) => b.onclick = () => { CO.store.setActiveCar(b.dataset.activate); CO.router.render(); });
        root.querySelectorAll('[data-remove]').forEach((b) => b.onclick = () => { CO.store.removeCar(b.dataset.remove); CO.router.render(); });
      },
    };
  }

  /* ---------- Garaj tanlash oynasi (har qayerdan ochiladi) ---------- */
  const garagePicker = {
    open() {
      const brands = CO.api.db.brands;
      let brand = brands[0].id, model = null;
      const cur = CO.store.state.activeCar;
      const draw = () => {
        const b = brands.find((x) => x.id === brand);
        const st = CO.store.state;
        document.querySelector('#sheet .sheet__body').innerHTML = `
          ${st.garage.length ? `<div class="field__label">${t('garage.mine')}</div>
            <div class="chips chips--wrap" style="margin-bottom:16px">${st.garage.map((c) => `<button class="chip ${c.model === cur ? 'is-active' : ''}" data-pick="${esc(c.model)}">${I.car}${esc(c.model)}</button>`).join('')}</div>` : ''}
          <div class="seg" style="margin-bottom:14px">${brands.map((x) => `<button data-brand="${x.id}" class="${x.id === brand ? 'is-active' : ''}">${esc(x.name.split(' ')[0])}</button>`).join('')}</div>
          <div class="model-list">${b.models.map((m) => `<button class="model ${m === model ? 'is-active' : ''}" data-model="${esc(m)}">${esc(m.replace(/^(Kia|Hyundai) /, ''))}</button>`).join('')}</div>
          ${model ? `<div class="field__label" style="margin-top:16px">${t('garage.year')}</div>
            <div class="years">${Array.from({ length: 12 }, (_, i) => 2025 - i).map((y) => `<button class="model" data-year="${y}">${y}</button>`).join('')}<button class="model" data-year="">${t('garage.skipYear')}</button></div>` : ''}`;
        const root = document.querySelector('#sheet');
        root.querySelectorAll('[data-brand]').forEach((x) => x.onclick = () => { brand = x.dataset.brand; model = null; draw(); });
        root.querySelectorAll('[data-model]').forEach((x) => x.onclick = () => {
          model = x.dataset.model; draw();
          root.querySelector('.years')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        root.querySelectorAll('[data-year]').forEach((x) => x.onclick = () => finish(model, x.dataset.year));
        root.querySelectorAll('[data-pick]').forEach((x) => x.onclick = () => { CO.store.setActiveCar(x.dataset.pick); done(x.dataset.pick); });
      };
      const done = (m) => { closeSheet(); CO.ui.toast(t('garage.selected', { car: esc(m) })); CO.router.render({ keepScroll: true }); };
      const finish = (m, y) => { CO.store.addCar(m, y); done(m); };
      openSheet({ title: t('garage.pickTitle'), body: '' });
      draw();
    },
  };

  CO.garage = garagePicker;
  CO.views = CO.views || {};
  Object.assign(CO.views, { account, orders, garage });
})();
