/* Savat (#/cart), rasmiylashtirish (#/checkout), buyurtma (#/order/:no) */
(function () {
  const CO = window.CO;
  const { esc, money, pimg, empty, hscroll, sectionHead } = CO.ui;
  const I = CO.icons;
  const t = (...a) => CO.i18n.t(...a);
  const L = (o) => CO.i18n.pick(o);

  function lines() {
    return CO.store.cartLines().map(({ id, qty }) => ({ p: CO.api.product(id), qty })).filter((l) => l.p);
  }
  function totals(ls, delivery = 'pickup') {
    const count = ls.reduce((s, l) => s + l.qty, 0);
    const sum = ls.reduce((s, l) => s + l.p.price * l.qty, 0);
    const old = ls.reduce((s, l) => s + Math.max(l.p.oldPrice, l.p.price) * l.qty, 0);
    const cfg = CO.config.delivery;
    const ship = delivery === 'courier' ? (sum >= cfg.freeFrom ? 0 : cfg.price) : 0;
    return { count, sum, save: old - sum, ship, total: sum + ship };
  }

  function summary(tt, { showShip = false } = {}) {
    return `
      <div class="summary__row"><span>${t('cart.items', { n: tt.count })}</span><b>${money(tt.sum + tt.save)}</b></div>
      ${tt.save ? `<div class="summary__row summary__row--save"><span>${t('cart.discount')}</span><b>−${money(tt.save)}</b></div>` : ''}
      ${showShip ? `<div class="summary__row"><span>${t('checkout.delivery')}</span><b>${tt.ship ? money(tt.ship) : t('checkout.free')}</b></div>` : ''}
      <div class="summary__row summary__row--total"><span>${t('cart.total')}</span><span>${money(showShip ? tt.total : tt.sum)}</span></div>`;
  }

  function cart() {
    const ls = lines();
    if (!ls.length) {
      const recent = CO.store.state.recent.map((id) => CO.api.product(id)).filter((p) => p && p.stock > 0);
      return {
        html: `<h1 class="page-title">${t('cart.title')}</h1>` + empty({
          icon: I.cart, title: t('cart.empty.title'), text: t('cart.empty.text'),
          actions: `<a class="btn" href="#/catalog">${t('cart.toCatalog')}</a><a class="btn btn--ghost" href="#/scan">${I.camera}${t('scan.short')}</a>`,
        }) + (recent.length ? `<section class="section">${sectionHead(t('home.recent'), '')}${hscroll(recent)}</section>` : ''),
        header: 'main', tab: 'cart',
      };
    }
    const tt = totals(ls);
    const cfg = CO.config.delivery;
    const left = Math.max(0, cfg.freeFrom - tt.sum);
    const car = CO.store.state.activeCar;
    const html = `
      <h1 class="page-title">${t('cart.title')}<small>${t('cart.items', { n: tt.count })}</small></h1>
      <div class="cart-layout">
        <div>
          <div class="card-box">
            ${ls.map(({ p, qty }) => {
              const notFit = car && p.cars.length && !p.cars.includes(car);
              return `
              <div class="cart-line">
                <div class="cart-line__img" data-open="${p.id}">${pimg(p)}</div>
                <div class="cart-line__body">
                  <div class="cart-line__top">
                    <div class="cart-line__name" data-open="${p.id}">${esc(p.name)}</div>
                    <button class="cart-line__del" data-del="${p.id}" aria-label="${esc(t('cart.remove'))}">${I.trash}</button>
                  </div>
                  <div class="muted" style="font-size:12px">${esc(p.brand)} · OEM ${esc(p.oem)}</div>
                  ${notFit ? `<div class="fit fit--no">${I.alert}${t('fit.no', { car: esc(car) })}</div>` : ''}
                  ${qty >= p.stock ? `<div class="stock stock--low">${t('cart.maxStock', { n: p.stock })}</div>` : ''}
                  <div class="cart-line__foot">
                    <div class="stepper"><button data-dec="${p.id}" aria-label="−">${I.minus}</button><span>${qty}</span><button data-inc="${p.id}" aria-label="+" ${qty >= p.stock ? 'disabled' : ''}>${I.plus}</button></div>
                    <div class="cart-line__price">${money(p.price * qty)}${qty > 1 ? `<small>${money(p.price)} × ${qty}</small>` : ''}</div>
                  </div>
                </div>
              </div>`; }).join('')}
          </div>
          <div class="card-box">
            ${left > 0
              ? `<div style="font-size:14px">${t('cart.freeLeft', { sum: `<b>${money(left)}</b>` })}</div>`
              : `<div style="font-size:14px;color:var(--success);font-weight:600">${t('cart.freeOk')}</div>`}
            <div class="progress"><i style="width:${Math.min(100, (tt.sum / cfg.freeFrom) * 100)}%"></i></div>
          </div>
        </div>
        <aside>
          <div class="card-box">
            <h2 class="card-box__title">${t('cart.summary')}</h2>
            ${summary(tt)}
          </div>
          <div class="checkout-bar"><a class="btn btn--block" href="#/checkout">${t('cart.checkout')} · ${money(tt.sum)}</a></div>
          <button class="btn btn--line btn--block btn--sm" data-clear style="margin-top:4px">${I.trash}${t('cart.clear')}</button>
        </aside>
      </div>`;
    return {
      html, header: 'main', tab: 'cart',
      mount(root) {
        root.querySelectorAll('[data-del]').forEach((b) => b.onclick = (e) => {
          e.stopPropagation();
          const id = b.dataset.del, q = CO.store.cartQty(id);
          CO.store.setQty(id, 0);
          CO.ui.toast(t('cart.removed'), { icon: I.trash, link: { href: 'javascript:void(0)', text: t('common.undo') } });
          const a = document.querySelector('#toast a');
          if (a) a.onclick = (ev) => { ev.preventDefault(); CO.store.setQty(id, q); };
        });
        root.querySelector('[data-clear]').onclick = () => {
          if (confirm(t('cart.clearConfirm'))) CO.store.clearCart();
        };
        return CO.store.on('cart', () => CO.router.render({ keepScroll: true }));
      },
    };
  }

  // ---------- Rasmiylashtirish ----------
  function formatPhone(v) {
    let d = v.replace(/\D/g, '');
    if (d.startsWith('998')) d = d.slice(3);
    d = d.slice(0, 9);
    const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
    return '+998 ' + parts.join(' ');
  }

  function checkout() {
    const ls = lines();
    if (!ls.length) { setTimeout(() => CO.router.go('#/cart'), 0); return { html: '', header: { back: true, title: t('checkout.title') } }; }
    const u = CO.store.state.user || {};
    const car = CO.store.state.garage.find((c) => c.model === CO.store.state.activeCar);
    const addr = CO.store.state.addresses[0] || '';
    const cfg = CO.config.delivery;
    const tt0 = totals(ls, 'pickup');
    const html = `
      <form class="form" id="checkout" novalidate style="margin-top:16px;padding-bottom:20px">
        <div class="card-box">
          <h2 class="card-box__title">${t('checkout.contact')}</h2>
          <div class="form">
            <div class="field"><label for="cName">${t('form.name')}</label><input id="cName" name="name" autocomplete="name" required value="${esc(u.name || '')}" placeholder="${esc(t('form.name.ph'))}"></div>
            <div class="field"><label for="cPhone">${t('form.phone')}</label><input id="cPhone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required value="${esc(u.phone || '+998 ')}" placeholder="+998 90 123 45 67"></div>
          </div>
        </div>

        <div class="card-box">
          <h2 class="card-box__title">${t('checkout.how')}</h2>
          <div class="options">
            <label class="option"><input type="radio" name="delivery" value="pickup" checked>
              <span class="option__icon">${I.store}</span>
              <span class="option__body"><b>${t('checkout.pickup')}</b><small>${esc(L(CO.config.shop.address))} · ${esc(L(CO.config.shop.hours))}</small></span>
              <span class="option__price">${t('checkout.free')}</span><span class="option__radio"></span></label>
            <label class="option"><input type="radio" name="delivery" value="courier">
              <span class="option__icon">${I.truck}</span>
              <span class="option__body"><b>${t('checkout.courier')}</b><small>${t('checkout.courier.sub', { sum: money(cfg.freeFrom) })}</small></span>
              <span class="option__price">${tt0.sum >= cfg.freeFrom ? t('checkout.free') : money(cfg.price)}</span><span class="option__radio"></span></label>
          </div>
          <div class="field" id="addrField" hidden style="margin-top:12px"><label for="cAddr">${t('checkout.address')}</label><textarea id="cAddr" name="address" placeholder="${esc(t('checkout.address.ph'))}">${esc(addr)}</textarea></div>
        </div>

        <div class="card-box">
          <h2 class="card-box__title">${t('checkout.pay')}</h2>
          <div class="options">
            <label class="option"><input type="radio" name="pay" value="cash" checked><span class="option__icon">${I.cash}</span><span class="option__body"><b>${t('pay.cash')}</b><small>${t('pay.onReceive')}</small></span><span class="option__radio"></span></label>
            <label class="option"><input type="radio" name="pay" value="card"><span class="option__icon">${I.card}</span><span class="option__body"><b>${t('pay.card')}</b><small>Uzcard · Humo · ${t('pay.onReceive')}</small></span><span class="option__radio"></span></label>
            <label class="option"><input type="radio" name="pay" value="transfer"><span class="option__icon">${I.receipt}</span><span class="option__body"><b>${t('pay.transfer')}</b><small>Click · Payme</small></span><span class="option__radio"></span></label>
          </div>
        </div>

        <div class="card-box">
          <h2 class="card-box__title">${t('checkout.car')}</h2>
          <div class="field"><label for="cNote">${t('checkout.note')}</label><textarea id="cNote" name="note" placeholder="${esc(t('checkout.note.ph'))}">${car ? esc(car.model + (car.year ? ', ' + car.year : '')) : ''}</textarea></div>
          <div class="note" style="margin-top:10px">${I.info}<div>${t('checkout.vinNote')}</div></div>
        </div>

        <div class="card-box" id="sumBox">${summary(tt0, { showShip: true })}</div>
        <div class="checkout-bar"><button class="btn btn--block" type="submit" id="submitBtn">${t('checkout.confirm')} · ${money(tt0.total)}</button></div>
        <p class="muted" style="font-size:12px;text-align:center;margin:8px 0 0">${t('checkout.agree')}</p>
      </form>`;

    function mount(root) {
      const form = root.querySelector('#checkout');
      const phone = form.querySelector('#cPhone');
      phone.addEventListener('input', () => { phone.value = formatPhone(phone.value); });
      phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+998 '; });
      const recalc = () => {
        const d = form.delivery.value;
        root.querySelector('#addrField').hidden = d !== 'courier';
        const tt = totals(lines(), d);
        root.querySelector('#sumBox').innerHTML = summary(tt, { showShip: true });
        root.querySelector('#submitBtn').textContent = `${t('checkout.confirm')} · ${money(tt.total)}`;
      };
      form.querySelectorAll('input[name=delivery]').forEach((r) => r.addEventListener('change', recalc));

      const setErr = (input, msg) => {
        const f = input.closest('.field');
        f.classList.toggle('is-error', !!msg);
        let e = f.querySelector('.field__error');
        if (msg && !e) { e = document.createElement('div'); e.className = 'field__error'; f.appendChild(e); }
        if (e) e.textContent = msg || '';
      };

      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const name = form.name.value.trim();
        const ph = form.phone.value.trim();
        const delivery = form.delivery.value;
        const address = form.address.value.trim();
        let ok = true;
        setErr(form.name, name.length < 2 ? t('form.err.name') : ''); if (name.length < 2) ok = false;
        const digits = ph.replace(/\D/g, '');
        setErr(form.phone, digits.length !== 12 ? t('form.err.phone') : ''); if (digits.length !== 12) ok = false;
        if (delivery === 'courier') { setErr(form.address, address.length < 5 ? t('form.err.address') : ''); if (address.length < 5) ok = false; }
        if (!ok) { root.querySelector('.is-error input, .is-error textarea')?.focus(); return; }

        const btn = root.querySelector('#submitBtn');
        btn.disabled = true;
        CO.store.set('user', { ...(CO.store.state.user || {}), name, phone: ph });
        if (address) CO.store.set('addresses', [address, ...CO.store.state.addresses.filter((a) => a !== address)].slice(0, 3));

        const ls = lines();
        const tt = totals(ls, delivery);
        const draft = {
          date: Date.now(), name, phone: ph, delivery, address, pay: form.pay.value, note: form.note.value.trim(),
          items: ls.map(({ p, qty }) => ({ id: p.id, sku: p.sku, oem: p.oem, name: p.name, price: p.price, qty })),
          sum: tt.sum, ship: tt.ship, total: tt.total,
        };
        const order = await CO.api.createOrder(draft);
        CO.store.addOrder(order);
        CO.store.clearCart();
        CO.router.go('#/order/' + order.no + '?new=1', { replace: true });
      });
    }

    return { html, mount, header: { back: true, title: t('checkout.title') }, noTabbar: true, tab: 'cart' };
  }

  // ---------- Buyurtma tafsiloti ----------
  function orderText(o) {
    const lines = [
      t('order.tg.title', { no: o.no }),
      `${o.name}, ${o.phone}`,
      o.delivery === 'courier' ? `${t('checkout.courier')}: ${o.address}` : t('checkout.pickup'),
      `${t('checkout.pay')}: ${t('pay.' + o.pay)}`,
      '',
      ...o.items.map((i) => `• ${i.name} (OEM ${i.oem}, art. ${i.sku}) × ${i.qty} = ${money(i.price * i.qty)}`),
      '',
      o.ship ? `${t('checkout.delivery')}: ${money(o.ship)}` : '',
      `${t('cart.total')}: ${money(o.total)}`,
      o.note ? `${t('checkout.note')}: ${o.note}` : '',
    ];
    return lines.filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n').trim();
  }

  const STEPS = ['new', 'confirmed', 'ready', 'done'];
  function order(params, [no]) {
    const o = CO.store.state.orders.find((x) => x.no === no);
    if (!o) return { html: empty({ icon: I.receipt, title: t('order.notFound'), actions: `<a class="btn" href="#/orders">${t('orders.title')}</a>` }), header: { back: true, title: t('order.title') } };
    const isNew = params.get('new') === '1';
    const step = Math.max(0, STEPS.indexOf(o.status));
    const tg = `https://t.me/${CO.config.shop.telegram}?text=${encodeURIComponent(orderText(o))}`;
    const html = `
      ${isNew ? empty({ ok: true, icon: I.check, title: t('order.thanks', { no: o.no }), text: t('order.thanks.text') }) : `<h1 class="page-title">${t('order.no', { no: o.no })}</h1>`}
      <div class="card-box">
        <div class="order__head"><span class="order__no">${t('order.no', { no: o.no })}</span><span class="status">${t('status.' + o.status)}</span></div>
        <div class="timeline">${STEPS.map((s, i) => `<div class="timeline__step ${i <= step ? 'is-done' : ''}"><i>${i <= step ? I.check : ''}</i>${t('status.' + s)}</div>`).join('')}</div>
      </div>
      <div class="card-box">
        <a class="btn btn--block" href="${tg}" target="_blank" rel="noopener">${I.telegram}${t('order.sendTg')}</a>
        <a class="btn btn--line btn--block" href="${CO.config.shop.phoneHref}" style="margin-top:8px">${I.phone}${t('order.call')}</a>
        <div class="note" style="margin-top:12px">${I.info}<div>${t('order.demoNote')}</div></div>
      </div>
      <div class="card-box">
        <h2 class="card-box__title">${t('order.items')}</h2>
        ${o.items.map((i) => { const p = CO.api.product(i.id); return `
          <div class="cart-line">
            <div class="cart-line__img" ${p ? `data-open="${p.id}"` : ''} style="width:60px;height:60px">${p ? pimg(p) : ''}</div>
            <div class="cart-line__body"><div class="cart-line__name">${esc(i.name)}</div>
              <div class="cart-line__foot"><span class="muted">${money(i.price)} × ${i.qty}</span><b>${money(i.price * i.qty)}</b></div></div>
          </div>`; }).join('')}
      </div>
      <div class="card-box">
        <ul class="specs">
          <li><span>${t('order.date')}</span><span>${new Date(o.date).toLocaleString(CO.i18n.lang() === 'ru' ? 'ru-RU' : 'uz-UZ')}</span></li>
          <li><span>${t('form.name')}</span><span>${esc(o.name)}</span></li>
          <li><span>${t('form.phone')}</span><span>${esc(o.phone)}</span></li>
          <li><span>${t('checkout.how')}</span><span>${o.delivery === 'courier' ? t('checkout.courier') + '<br><small class="muted">' + esc(o.address) + '</small>' : t('checkout.pickup')}</span></li>
          <li><span>${t('checkout.pay')}</span><span>${t('pay.' + o.pay)}</span></li>
          ${o.note ? `<li><span>${t('checkout.note')}</span><span>${esc(o.note)}</span></li>` : ''}
          <li><span>${t('checkout.delivery')}</span><span>${o.ship ? money(o.ship) : t('checkout.free')}</span></li>
          <li><span><b style="color:var(--text)">${t('cart.total')}</b></span><span><b>${money(o.total)}</b></span></li>
        </ul>
      </div>
      <div style="display:grid;gap:8px;margin-top:12px">
        <button class="btn btn--ghost" data-repeat>${t('order.repeat')}</button>
        <a class="btn btn--line" href="#/">${t('order.toHome')}</a>
      </div>`;
    return {
      html, header: { back: !isNew, title: t('order.title') }, tab: 'account',
      mount(root) {
        root.querySelector('[data-repeat]').onclick = () => {
          o.items.forEach((i) => { const p = CO.api.product(i.id); if (p && p.stock > 0) CO.store.add(p.id, i.qty, p.stock); });
          CO.router.go('#/cart');
        };
      },
    };
  }

  CO.views = CO.views || {};
  Object.assign(CO.views, { cart, checkout, order });
  CO.orderText = orderText;
  CO.formatPhone = formatPhone;
})();
