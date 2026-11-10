/* CarOne — mijozlar uchun sotuv sahifasi (SPA, hash-router) */
(function () {
  const { ICONS, categories, cars, products, shop } = window.CARONE;
  const { escapeHtml: esc } = window.Search;
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app');
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

  /* ---------- Saqlash (localStorage) ---------- */
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('carone_' + k)) ?? d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem('carone_' + k, JSON.stringify(v)); } catch (_) { /* yopiq rejim */ } },
  };
  let cart = store.get('cart', {});       // { id: qty }
  let favs = new Set(store.get('favs', []));
  let user = store.get('user', null);     // { name, phone, car }
  let orders = store.get('orders', []);

  const fmt = (n) => n.toLocaleString('ru-RU').replace(/,/g, ' ') + ' so\'m';
  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = () => Object.entries(cart).reduce((s, [id, q]) => s + (byId[id] ? byId[id].price * q : 0), 0);

  function saveCart() { store.set('cart', cart); updateBadge(); }
  function updateBadge() {
    const n = cartCount(), b = $('#cartBadge');
    b.textContent = n > 99 ? '99+' : n; b.hidden = n === 0;
  }
  function addToCart(id, q = 1) {
    const p = byId[id]; if (!p || p.stock <= 0) return;
    cart[id] = Math.min((cart[id] || 0) + q, p.stock);
    saveCart(); toast('Savatga qo\'shildi');
  }
  function setQty(id, q) {
    if (q <= 0) delete cart[id]; else cart[id] = Math.min(q, byId[id].stock);
    saveCart();
  }
  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    store.set('favs', [...favs]);
    return favs.has(id);
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('is-show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-show'), 1800);
  }

  /* ---------- UI bo'laklari ---------- */
  const icon = (name) => ICONS[name] || ICONS.box;
  const thumb = (p, cls = '') => `<span class="thumb ${cls}">${icon(catById[p.cat]?.icon)}</span>`;
  const heart = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z"/></svg>';
  const plus = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
  const chevron = '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>';

  function stockLabel(p) {
    if (p.stock <= 0) return '<span class="card__stock is-out">Tugagan</span>';
    if (p.stock <= 3) return `<span class="card__stock is-low">Oz qoldi: ${p.stock} ta</span>`;
    return '<span class="card__stock">Omborda bor</span>';
  }

  function card(p) {
    const inCart = cart[p.id];
    const carTag = p.cars.length && p.cars.length <= 2 ? `<span class="card__tag">${esc(p.cars.join(', '))}</span>` : '';
    return `
      <article class="card" data-open="${p.id}">
        <div class="card__media">
          ${thumb(p)}${carTag}
          <button class="card__fav ${favs.has(p.id) ? 'is-on' : ''}" data-fav="${p.id}" aria-label="Sevimli">${heart}</button>
        </div>
        <div class="card__body">
          <div class="card__price">${fmt(p.price)}</div>
          <div class="card__name">${esc(p.name)}</div>
          <div class="card__meta">Art: ${esc(p.sku)} · ${esc(p.brand)}</div>
          ${stockLabel(p)}
          <button class="card__add ${inCart ? 'is-in' : ''}" data-add="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
            ${p.stock <= 0 ? 'Tugagan' : inCart ? `Savatda · ${inCart}` : plus + 'Savatga'}
          </button>
        </div>
      </article>`;
  }
  const grid = (list) => `<div class="grid">${list.map(card).join('')}</div>`;

  function empty(iconSvg, title, text, action = '') {
    return `<div class="empty"><div class="empty__icon">${iconSvg}</div><h3>${title}</h3><p>${text}</p>${action}</div>`;
  }

  function carChips(active, base) {
    return `<div class="chips">${['Barchasi', ...cars].map((c) => {
      const val = c === 'Barchasi' ? '' : c;
      return `<a class="chip ${val === (active || '') ? 'is-active' : ''}" href="${base}${val ? (base.includes('?') ? '&' : '?') + 'car=' + encodeURIComponent(val) : ''}">${c}</a>`;
    }).join('')}</div>`;
  }

  /* ---------- Sahifalar ---------- */
  const views = {
    home() {
      const myCar = user?.car;
      const popular = products.filter((p) => p.stock > 0).sort((a, b) => b.stock - a.stock).slice(0, 10);
      const forMyCar = myCar ? products.filter((p) => p.cars.includes(myCar)).slice(0, 6) : [];
      return `
        <section class="banner">
          <div>
            <h2>Kerakli detalni rasmga oling</h2>
            <p>Quti, etiketka yoki shtrix-kodni suratga oling — biz topib beramiz.</p>
            <a class="btn" href="#/scan">Kamerani ochish</a>
          </div>
          <div class="banner__art"><svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg></div>
        </section>

        <section class="section">
          <div class="section__head"><h2 class="section__title">Mashinangiz</h2></div>
          ${carChips(myCar, '#/catalog')}
        </section>

        <section class="section">
          <div class="section__head"><h2 class="section__title">Kategoriyalar</h2><a class="section__link" href="#/catalog">Barchasi</a></div>
          <div class="cats">
            ${categories.slice(0, 8).map((c) => `
              <a class="cat" href="#/catalog?cat=${c.id}"><span class="cat__icon">${icon(c.icon)}</span>${esc(c.name)}</a>`).join('')}
          </div>
        </section>

        ${forMyCar.length ? `
        <section class="section">
          <div class="section__head"><h2 class="section__title">${esc(myCar)} uchun</h2><a class="section__link" href="#/catalog?car=${encodeURIComponent(myCar)}">Barchasi</a></div>
          ${grid(forMyCar)}
        </section>` : ''}

        <section class="section">
          <div class="section__head"><h2 class="section__title">Ommabop</h2><a class="section__link" href="#/catalog">Katalog</a></div>
          ${grid(popular)}
        </section>`;
    },

    catalog(params) {
      const cat = params.get('cat') || '';
      const car = params.get('car') || '';
      const sort = params.get('sort') || 'pop';
      if (!cat && !car && !params.get('all')) {
        const counts = Object.fromEntries(categories.map((c) => [c.id, products.filter((p) => p.cat === c.id).length]));
        return `
          <h1 class="page-title">Katalog</h1>
          ${carChips('', '#/catalog')}
          <div class="cat-list" style="margin-top:14px">
            <a class="cat-row" href="#/catalog?all=1"><span class="cat__icon">${icon('box')}</span><span class="cat-row__name">Barcha mahsulotlar</span><span class="cat-row__count">${products.length}</span>${chevron}</a>
            ${categories.map((c) => `
              <a class="cat-row" href="#/catalog?cat=${c.id}"><span class="cat__icon">${icon(c.icon)}</span><span class="cat-row__name">${esc(c.name)}</span><span class="cat-row__count">${counts[c.id]}</span>${chevron}</a>`).join('')}
          </div>`;
      }
      let list = products.filter((p) => (!cat || p.cat === cat) && (!car || p.cars.includes(car)));
      list = sortList(list, sort);
      const base = '#/catalog?' + (cat ? 'cat=' + cat : 'all=1');
      const title = cat ? catById[cat]?.name : car ? car + ' uchun' : 'Barcha mahsulotlar';
      return `
        <h1 class="page-title">${esc(title || 'Katalog')}</h1>
        ${carChips(car, base)}
        <div class="toolbar">
          <span class="toolbar__count">${list.length} ta mahsulot</span>
          ${sortSelect(sort)}
        </div>
        ${list.length ? grid(list) : empty(icon('box'), 'Hozircha yo\'q', 'Bu bo\'limda mos mahsulot topilmadi. Qidiruv yoki rasm orqali izlab ko\'ring.', '<a class="btn btn--ghost" href="#/catalog">Katalogga qaytish</a>')}`;
    },

    search(params) {
      const q = params.get('q') || '';
      const sort = params.get('sort') || 'rel';
      let list = window.Search.query(q);
      if (sort !== 'rel') list = sortList(list, sort);
      return `
        <h1 class="page-title">«${esc(q)}»</h1>
        <div class="toolbar">
          <span class="toolbar__count">${list.length} ta topildi</span>
          ${sortSelect(sort, true)}
        </div>
        ${list.length ? grid(list) : empty(
          '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
          'Hech narsa topilmadi',
          'Artikul yoki OEM raqamni kiriting, yoki detalni rasmga oling.',
          `<a class="btn" href="#/scan">Rasm orqali qidirish</a>`)}`;
    },

    scan() {
      return `
        <div class="scan-hero">
          <h1>Rasm orqali qidiruv</h1>
          <p>Detal qutisi, etiketka yoki shtrix-kodni ramkaga to'g'rilang</p>
        </div>
        <div class="camera" id="camera">
          <video id="camVideo" playsinline muted hidden></video>
          <img id="camPhoto" alt="Tanlangan rasm" hidden>
          <div class="camera__placeholder" id="camPlaceholder">
            <div>${'<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>'}
              <div>Kamera yoqilmoqda…</div></div>
          </div>
          <div class="camera__frame"></div>
          <div class="camera__line" id="camLine" hidden></div>
          <div class="camera__hint" id="camHint">Shtrix-kod avtomatik o'qiladi</div>
        </div>
        <div class="scan-actions">
          <label class="scan-side">
            <span class="round"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5-9 9"/></svg></span>
            Galereya
            <input type="file" accept="image/*" id="fileInput" hidden>
          </label>
          <button class="shutter" id="shutter" aria-label="Suratga olish"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/></svg></button>
          <a class="scan-side" href="#/" id="scanManual">
            <span class="round"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h7"/></svg></span>
            Qo'lda
          </a>
        </div>
        <div class="scan-status" id="scanStatus" hidden><span class="spinner"></span><span id="scanStatusText"></span></div>
        <div id="scanResults"></div>
        <div class="scan-tips" id="scanTips">
          <div class="tip"><span class="cat__icon">${icon('hardware')}</span><div><b>Shtrix-kod</b>Qutidagi shtrix-kodni ramkaga keltiring — darhol topiladi.</div></div>
          <div class="tip"><span class="cat__icon">${icon('filter')}</span><div><b>Artikul / OEM raqam</b>Masalan: 96879797, 26300-35505 — etiketkani yaqindan, yorug' joyda oling.</div></div>
          <div class="tip"><span class="cat__icon">${icon('electric')}</span><div><b>Topilmadimi?</b>Rasmni Telegram'ga yuboring — sotuvchi tanlab beradi.</div></div>
        </div>`;
    },

    cart() {
      const items = Object.entries(cart).filter(([id]) => byId[id]);
      if (!items.length) {
        return `<h1 class="page-title">Savat</h1>` + empty(
          '<svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L20.5 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>',
          'Savat bo\'sh', 'Kerakli detallarni qidiruv, katalog yoki kamera orqali toping.',
          '<a class="btn" href="#/catalog">Katalogga o\'tish</a>');
      }
      const count = cartCount(), total = cartTotal();
      return `
        <h1 class="page-title">Savat <span class="muted" style="font-weight:500;font-size:16px">${count} ta</span></h1>
        ${items.map(([id, q]) => { const p = byId[id]; return `
          <div class="cart-item">
            <span data-open="${id}">${thumb(p)}</span>
            <div class="cart-item__body">
              <div class="cart-item__name" data-open="${id}">${esc(p.name)}</div>
              <div class="muted" style="font-size:12px">Art: ${esc(p.sku)} · ${fmt(p.price)} / dona</div>
              <div class="cart-item__row">
                <div class="qty qty--sm"><button data-dec="${id}" aria-label="Kamaytirish">−</button><span>${q}</span><button data-inc="${id}" aria-label="Ko'paytirish">+</button></div>
                <span class="cart-item__price">${fmt(p.price * q)}</span>
              </div>
            </div>
          </div>`; }).join('')}
        <div class="summary">
          <div class="summary__row"><span class="muted">Mahsulotlar (${count})</span><span>${fmt(total)}</span></div>
          <div class="summary__row"><span class="muted">Yetkazib berish</span><span>Kelishiladi</span></div>
          <div class="summary__row summary__row--total"><span>Jami</span><span>${fmt(total)}</span></div>
        </div>
        <form class="form summary" id="checkout">
          <div class="field"><label for="cName">Ismingiz</label><input id="cName" name="name" required value="${esc(user?.name || '')}" placeholder="Ism"></div>
          <div class="field"><label for="cPhone">Telefon</label><input id="cPhone" name="phone" type="tel" required value="${esc(user?.phone || '')}" placeholder="+998 __ ___ __ __" inputmode="tel"></div>
          <div class="seg">
            <label><input type="radio" name="delivery" value="pickup" checked><span>Do'kondan olish</span></label>
            <label><input type="radio" name="delivery" value="courier"><span>Yetkazib berish</span></label>
          </div>
          <div class="field"><label for="cNote">Izoh (mashina, yil, VIN)</label><textarea id="cNote" name="note" placeholder="Masalan: Cobalt 2021, avtomat"></textarea></div>
          <button class="btn btn--block" type="submit">Buyurtma berish · ${fmt(total)}</button>
        </form>`;
    },

    account() {
      if (!user) {
        return `
          <h1 class="page-title">Kabinet</h1>
          <form class="form summary" id="login">
            <p class="muted" style="margin:0">Buyurtmalaringizni kuzatish uchun ma'lumotlaringizni kiriting.</p>
            <div class="field"><label for="lName">Ismingiz</label><input id="lName" name="name" required placeholder="Ism"></div>
            <div class="field"><label for="lPhone">Telefon</label><input id="lPhone" name="phone" type="tel" required inputmode="tel" placeholder="+998 __ ___ __ __"></div>
            <div class="field"><label for="lCar">Mashinangiz</label>
              <select id="lCar" name="car"><option value="">Tanlang</option>${cars.map((c) => `<option>${c}</option>`).join('')}</select></div>
            <button class="btn btn--block" type="submit">Kirish</button>
          </form>
          ${contactMenu()}`;
      }
      const favList = products.filter((p) => favs.has(p.id));
      return `
        <div class="profile">
          <div class="avatar">${esc((user.name || '?')[0].toUpperCase())}</div>
          <div style="flex:1"><div class="profile__name">${esc(user.name)}</div><div class="muted">${esc(user.phone)}${user.car ? ' · ' + esc(user.car) : ''}</div></div>
        </div>
        <section class="section">
          <div class="section__head"><h2 class="section__title">Buyurtmalarim</h2></div>
          ${orders.length ? orders.slice().reverse().map((o) => `
            <div class="order">
              <div class="order__head"><span>№ ${o.no}</span><span class="order__status">${esc(o.status)}</span></div>
              <div class="muted" style="font-size:13px;margin:4px 0">${new Date(o.date).toLocaleString('ru-RU')} · ${o.items.length} xil mahsulot</div>
              <div style="font-weight:600">${fmt(o.total)}</div>
            </div>`).join('') : '<p class="muted">Hali buyurtma yo\'q.</p>'}
        </section>
        <section class="section">
          <div class="section__head"><h2 class="section__title">Sevimlilar</h2></div>
          ${favList.length ? grid(favList) : '<p class="muted">Yoqqan mahsulotlarni ♡ belgisi bilan saqlang.</p>'}
        </section>
        ${contactMenu()}
        <div class="menu-list"><button id="logout"><svg viewBox="0 0 24 24"><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10"/></svg><span>Chiqish</span></button></div>`;
    },
  };

  function contactMenu() {
    return `
      <div class="menu-list">
        <a href="${shop.phoneHref}"><svg viewBox="0 0 24 24"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg><span>Qo'ng'iroq qilish</span><small>${esc(shop.phone)}</small></a>
        <a href="https://t.me/${shop.telegram}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="m21 4-18 7 6 2 2 6 3-4 5 4z"/><path d="m9 13 8-6"/></svg><span>Telegram</span><small>@${esc(shop.telegram)}</small></a>
        <a href="#/account"><svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg><span>Manzil</span><small>${esc(shop.address)}</small></a>
      </div>`;
  }

  function sortList(list, sort) {
    const l = list.slice();
    if (sort === 'cheap') l.sort((a, b) => a.price - b.price);
    else if (sort === 'exp') l.sort((a, b) => b.price - a.price);
    else if (sort === 'pop') l.sort((a, b) => (b.stock > 0) - (a.stock > 0) || b.stock - a.stock);
    return l;
  }
  function sortSelect(v, withRel) {
    const opts = [...(withRel ? [['rel', 'Mosligi']] : []), ['pop', 'Ommabop'], ['cheap', 'Arzonroq'], ['exp', 'Qimmatroq']];
    return `<select class="select" id="sortSel" aria-label="Saralash">${opts.map(([k, t]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  }

  /* ---------- Mahsulot oynasi ---------- */
  function openProduct(id) {
    const p = byId[id]; if (!p) return;
    let q = 1;
    const similar = products.filter((x) => x.id !== id && x.cat === p.cat && x.cars.some((c) => p.cars.includes(c))).slice(0, 4);
    $('#sheetBody').innerHTML = `
      <div class="pd__media">${thumb(p)}</div>
      <h2 class="pd__name" id="sheetTitle">${esc(p.name)}</h2>
      ${stockLabel(p)}
      <div class="pd__price">${fmt(p.price)}</div>
      <ul class="pd__specs">
        <li><span>Artikul</span><span>${esc(p.sku)}</span></li>
        <li><span>OEM raqam</span><span>${esc(p.oem)}</span></li>
        <li><span>Brend</span><span>${esc(p.brand)}</span></li>
        <li><span>Mos mashinalar</span><span>${p.cars.length ? esc(p.cars.join(', ')) : 'Universal'}</span></li>
        <li><span>Kategoriya</span><span>${esc(catById[p.cat]?.name || '')}</span></li>
      </ul>
      ${similar.length ? `<div class="section__head"><h3 class="section__title" style="font-size:16px">O'xshash</h3></div>${grid(similar)}<div style="height:12px"></div>` : ''}
      <div class="pd__actions">
        <div class="qty"><button id="pdDec" aria-label="Kamaytirish">−</button><span id="pdQty">1</span><button id="pdInc" aria-label="Ko'paytirish">+</button></div>
        <button class="btn" id="pdAdd" ${p.stock <= 0 ? 'disabled' : ''}>${p.stock <= 0 ? 'Tugagan' : 'Savatga qo\'shish'}</button>
      </div>`;
    $('#pdDec').onclick = () => { q = Math.max(1, q - 1); $('#pdQty').textContent = q; };
    $('#pdInc').onclick = () => { q = Math.min(p.stock || 1, q + 1); $('#pdQty').textContent = q; };
    $('#pdAdd').onclick = () => { addToCart(id, q); closeSheet(); render(); };
    $('#sheet').hidden = false;
    $('#sheet .sheet__panel').scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() { $('#sheet').hidden = true; document.body.style.overflow = ''; }

  /* ---------- Router ---------- */
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    return { route: path || 'home', params: new URLSearchParams(qs || '') };
  }

  function render() {
    const { route, params } = parseHash();
    window.Scan.stop();
    const view = views[route] || views.home;
    app.innerHTML = view(params);
    const tab = route === 'search' ? 'home' : route;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t.dataset.tab === tab));
    $('#searchInput').value = route === 'search' ? (params.get('q') || '') : '';
    $('#searchClear').hidden = !$('#searchInput').value;
    if (route === 'scan') initScan();
    if (route === 'cart') initCheckout();
    if (route === 'account') initAccount();
    const sortSel = $('#sortSel');
    if (sortSel) sortSel.onchange = () => { params.set('sort', sortSel.value); location.hash = '#/' + route + '?' + params; };
  }

  let lastRoute = '';
  window.addEventListener('hashchange', () => {
    const { route } = parseHash();
    closeSheet(); hideSuggest();
    render();
    if (route !== lastRoute) window.scrollTo(0, 0);
    lastRoute = route;
  });

  /* ---------- Global kliklar ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target;
    const fav = t.closest('[data-fav]');
    if (fav) {
      e.stopPropagation();
      const on = toggleFav(fav.dataset.fav);
      document.querySelectorAll(`[data-fav="${fav.dataset.fav}"]`).forEach((b) => b.classList.toggle('is-on', on));
      toast(on ? 'Sevimlilarga qo\'shildi' : 'Sevimlilardan olindi');
      return;
    }
    const add = t.closest('[data-add]');
    if (add) {
      e.stopPropagation();
      const id = add.dataset.add;
      if (cart[id]) { location.hash = '#/cart'; return; }
      addToCart(id);
      document.querySelectorAll(`[data-add="${id}"]`).forEach((b) => { b.classList.add('is-in'); b.textContent = 'Savatda · ' + cart[id]; });
      return;
    }
    const inc = t.closest('[data-inc]'), dec = t.closest('[data-dec]');
    if (inc) { setQty(inc.dataset.inc, (cart[inc.dataset.inc] || 0) + 1); render(); return; }
    if (dec) { setQty(dec.dataset.dec, (cart[dec.dataset.dec] || 0) - 1); render(); return; }
    const open = t.closest('[data-open]');
    if (open) { openProduct(open.dataset.open); return; }
    if (t.closest('[data-close]')) closeSheet();
    if (!t.closest('#searchForm')) hideSuggest();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeSheet(); hideSuggest(); } });

  /* ---------- Qidiruv + takliflar ---------- */
  const input = $('#searchInput'), suggest = $('#suggest');
  let sugIndex = -1, sugTimer;
  function hideSuggest() { suggest.hidden = true; sugIndex = -1; }
  function showSuggest() {
    const q = input.value.trim();
    $('#searchClear').hidden = !q;
    if (q.length < 2) { hideSuggest(); return; }
    const res = window.Search.query(q).slice(0, 6);
    if (!res.length) {
      suggest.innerHTML = `<a class="suggest__item" href="#/scan"><span class="thumb" style="width:36px;height:36px">${icon('box')}</span><span class="suggest__name">Topilmadi — rasm orqali qidirib ko'ring</span></a>`;
    } else {
      suggest.innerHTML = res.map((p) => `
        <div class="suggest__item" data-open="${p.id}">
          ${thumb(p)}
          <span class="suggest__name">${window.Search.highlight(p.name, q)}<small>Art: ${esc(p.sku)} · OEM: ${esc(p.oem)}</small></span>
          <span class="suggest__price">${fmt(p.price)}</span>
        </div>`).join('') +
        `<a class="suggest__item" href="#/search?q=${encodeURIComponent(q)}" style="color:var(--primary-600);font-weight:600;justify-content:center">Barcha natijalar →</a>`;
    }
    suggest.hidden = false; sugIndex = -1;
  }
  input.addEventListener('input', () => { clearTimeout(sugTimer); sugTimer = setTimeout(showSuggest, 120); });
  input.addEventListener('focus', showSuggest);
  input.addEventListener('keydown', (e) => {
    const items = [...suggest.querySelectorAll('.suggest__item')];
    if (suggest.hidden || !items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sugIndex = (sugIndex + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle('is-active', i === sugIndex));
    } else if (e.key === 'Enter' && sugIndex >= 0) {
      e.preventDefault(); items[sugIndex].click(); hideSuggest();
    }
  });
  $('#searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim(); if (!q) return;
    hideSuggest(); input.blur();
    location.hash = '#/search?q=' + encodeURIComponent(q);
  });
  $('#searchClear').addEventListener('click', () => { input.value = ''; input.focus(); hideSuggest(); $('#searchClear').hidden = true; });

  /* ---------- Kamera sahifasi ---------- */
  function initScan() {
    const video = $('#camVideo'), photo = $('#camPhoto'), ph = $('#camPlaceholder');
    const statusBox = $('#scanStatus'), statusText = $('#scanStatusText'), results = $('#scanResults');
    let busy = false;
    const status = (msg) => { statusBox.hidden = !msg; statusText.textContent = msg || ''; };

    $('#scanManual').onclick = (e) => { e.preventDefault(); input.focus(); window.scrollTo(0, 0); };

    function showResults(list, title, chips = []) {
      $('#scanTips').hidden = true;
      results.innerHTML = `
        <div class="section">
          <div class="section__head"><h2 class="section__title">${title}</h2></div>
          ${chips.length ? `<div class="found-tokens">${chips.map((c) => `<a class="chip" href="#/search?q=${encodeURIComponent(c)}">${esc(c)}</a>`).join('')}</div>` : ''}
          ${list.length ? grid(list.slice(0, 12)) : empty(icon('box'), 'Mos mahsulot topilmadi',
            'Etiketkani yaqinroqdan, yorug\' joyda qayta suratga oling yoki rasmni sotuvchiga yuboring.',
            `<a class="btn" href="https://t.me/${shop.telegram}" target="_blank" rel="noopener">Telegram'da so'rash</a>`)}
        </div>`;
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function onCode(code) {
      if (navigator.vibrate) navigator.vibrate(60);
      const list = window.Search.byCode(code);
      const more = list.length ? list : window.Search.query(code);
      showResults(more, list.length ? 'Shtrix-kod bo\'yicha topildi' : 'Kod: ' + esc(code), [code]);
    }

    async function run(source) {
      if (busy) return; busy = true;
      $('#camLine').hidden = false;
      try {
        const r = await window.Scan.analyze(source, status);
        if (r.barcode) { onCode(r.barcode); return; }
        const queries = [...r.codes, ...r.words];
        const list = queries.length ? window.Search.queryMany(queries) : [];
        showResults(list, list.length ? 'Rasm bo\'yicha topildi' : 'Natija', [...r.codes, ...r.words.slice(0, 5)]);
      } catch (err) {
        console.error(err);
        toast('Rasmni tahlil qilib bo\'lmadi. Internetni tekshiring.');
      } finally {
        status(''); busy = false; $('#camLine').hidden = true;
      }
    }

    $('#shutter').onclick = () => {
      if (!video.hidden && video.readyState >= 2) {
        run(video);
      } else {
        $('#fileInput').click();
      }
    };
    $('#fileInput').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const { img, url } = await window.Scan.fileToImage(f);
      window.Scan.stop();
      video.hidden = true; ph.hidden = true;
      photo.src = url; photo.hidden = false;
      $('#camHint').textContent = 'Tanlangan rasm tahlil qilinmoqda';
      run(img);
      e.target.value = '';
    };

    if (!window.Scan.cameraSupported() || !window.isSecureContext) {
      ph.querySelector('div > div').textContent = 'Kamera mavjud emas. Galereyadan rasm tanlang yoki tugmani bosing.';
      return;
    }
    window.Scan.start(video, onCode).then(() => {
      ph.hidden = true; video.hidden = false;
      window.Scan.getDetector().then((d) => {
        $('#camHint').textContent = d ? 'Shtrix-kod avtomatik o\'qiladi · etiketka uchun tugmani bosing' : 'Etiketkani ramkaga to\'g\'rilab, tugmani bosing';
      });
    }).catch(() => {
      ph.querySelector('div > div').textContent = 'Kameraga ruxsat berilmadi. Tugmani bosib rasm tanlang.';
    });
  }

  /* ---------- Buyurtma ---------- */
  function initCheckout() {
    const form = $('#checkout'); if (!form) return;
    form.onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const name = fd.get('name').trim(), phone = fd.get('phone').trim();
      if (phone.replace(/\D/g, '').length < 9) { toast('Telefon raqamni to\'liq kiriting'); return; }
      user = { ...(user || {}), name, phone }; store.set('user', user);
      const items = Object.entries(cart).map(([id, q]) => ({ id, q, price: byId[id].price, name: byId[id].name, sku: byId[id].sku }));
      const order = {
        no: String(Date.now()).slice(-6), date: Date.now(), status: 'Qabul qilindi',
        items, total: cartTotal(), delivery: fd.get('delivery'), note: fd.get('note'),
      };
      orders.push(order); store.set('orders', orders);
      // Buyurtma matni — sotuvchiga Telegram orqali yuborish uchun
      const text = [`🛒 CarOne buyurtma №${order.no}`, `${name}, ${phone}`,
        order.delivery === 'courier' ? 'Yetkazib berish' : 'Do\'kondan olish',
        ...items.map((i) => `• ${i.name} (art. ${i.sku}) × ${i.q} = ${fmt(i.price * i.q)}`),
        `Jami: ${fmt(order.total)}`, order.note ? 'Izoh: ' + order.note : ''].filter(Boolean).join('\n');
      cart = {}; saveCart();
      app.innerHTML = `
        <div class="empty" style="padding-top:60px">
          <div class="empty__icon" style="background:#e7f7ef;color:var(--success)"><svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></div>
          <h3>Buyurtma №${order.no} qabul qilindi</h3>
          <p>Tez orada operator siz bilan bog'lanadi. Tezroq bo'lishi uchun buyurtmani Telegram'da yuboring.</p>
          <div style="display:grid;gap:10px;max-width:320px;margin:0 auto">
            <a class="btn" target="_blank" rel="noopener" href="https://t.me/${shop.telegram}?text=${encodeURIComponent(text)}">Telegram'da yuborish</a>
            <a class="btn btn--ghost" href="#/account">Buyurtmalarim</a>
          </div>
        </div>`;
      window.scrollTo(0, 0);
    };
  }

  function initAccount() {
    const login = $('#login');
    if (login) login.onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(login);
      user = { name: fd.get('name').trim(), phone: fd.get('phone').trim(), car: fd.get('car') };
      store.set('user', user); toast('Xush kelibsiz, ' + user.name + '!'); render();
    };
    const out = $('#logout');
    if (out) out.onclick = () => { user = null; store.set('user', null); render(); };
  }

  /* ---------- Start ---------- */
  updateBadge();
  lastRoute = parseHash().route;
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
