/*
 * Mijoz holati (savat, sevimlilar, garaj, tarix, buyurtmalar) — brauzerda saqlanadi.
 * Kichik pub/sub: CO.store.on('cart', fn)
 */
(function () {
  const PREFIX = 'carone_v2_';
  const read = (k, d) => { try { const v = localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (_) { /* private mode */ } };

  const state = {
    lang: read('lang', null),
    cart: read('cart', {}),          // { productId: qty }
    favs: read('favs', []),          // [productId]
    garage: read('garage', []),      // [{ id, model, year }]
    activeCar: read('activeCar', null), // model nomi
    user: read('user', null),        // { name, phone }
    orders: read('orders', []),
    history: read('history', []),    // qidiruv so'rovlari
    recent: read('recent', []),      // ko'rilgan mahsulotlar
    addresses: read('addresses', []),
    visual: read('visual', []),       // do'kon egasi qo'shgan mahsulot rasmlari (vektor ko'rinishida)
  };

  const listeners = {};
  function emit(key) { (listeners[key] || []).forEach((fn) => fn(state[key])); (listeners['*'] || []).forEach((fn) => fn(key)); }
  function set(key, value) { state[key] = value; write(key, value); emit(key); }

  const store = {
    state,
    on(key, fn) {
      (listeners[key] = listeners[key] || []).push(fn);
      return () => { listeners[key] = listeners[key].filter((f) => f !== fn); };
    },
    set,

    // Savat
    cartQty: (id) => state.cart[id] || 0,
    cartCount: () => Object.values(state.cart).reduce((a, b) => a + b, 0),
    cartLines: () => Object.entries(state.cart).map(([id, qty]) => ({ id, qty })),
    setQty(id, qty, max = Infinity) {
      const cart = { ...state.cart };
      if (qty <= 0) delete cart[id]; else cart[id] = Math.min(qty, max);
      set('cart', cart);
    },
    add(id, qty = 1, max = Infinity) { this.setQty(id, (state.cart[id] || 0) + qty, max); },
    clearCart() { set('cart', {}); },

    // Sevimlilar
    isFav: (id) => state.favs.includes(id),
    toggleFav(id) {
      const on = !state.favs.includes(id);
      set('favs', on ? [id, ...state.favs] : state.favs.filter((x) => x !== id));
      return on;
    },

    // Garaj
    addCar(model, year) {
      const car = { id: 'c' + Date.now(), model, year: year || '' };
      set('garage', [car, ...state.garage.filter((c) => c.model !== model)].slice(0, 5));
      set('activeCar', model);
    },
    removeCar(id) {
      const g = state.garage.filter((c) => c.id !== id);
      set('garage', g);
      if (!g.some((c) => c.model === state.activeCar)) set('activeCar', g[0]?.model || null);
    },
    setActiveCar(model) { set('activeCar', model); },

    // Tarix
    pushHistory(q) {
      q = q.trim(); if (!q) return;
      set('history', [q, ...state.history.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8));
    },
    clearHistory() { set('history', []); },
    pushRecent(id) { set('recent', [id, ...state.recent.filter((x) => x !== id)].slice(0, 12)); },

    // Buyurtmalar
    addOrder(order) { set('orders', [order, ...state.orders]); },
  };

  window.CO = window.CO || {};
  window.CO.store = store;
})();
