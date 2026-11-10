/* SVG ikonlar (stroke, currentColor) */
(function () {
  const p = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I = {
    home: p('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
    grid: p('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'),
    camera: p('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>'),
    cart: p('<path d="M3 4h2l2.2 11.2a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L20.5 8H6"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>'),
    user: p('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    search: p('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    close: p('<path d="M6 6l12 12M18 6 6 18"/>'),
    back: p('<path d="M15 5l-7 7 7 7"/>'),
    chevron: p('<path d="m9 6 6 6-6 6"/>'),
    down: p('<path d="m6 9 6 6 6-6"/>'),
    heart: p('<path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9z"/>'),
    plus: p('<path d="M12 5v14M5 12h14"/>'),
    minus: p('<path d="M5 12h14"/>'),
    trash: p('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    check: p('<path d="m5 12 5 5 9-10"/>'),
    alert: p('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>'),
    phone: p('<path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/>'),
    telegram: p('<path d="m21 4-18 7 6 2 2 6 3-4 5 4z"/><path d="m9 13 8-6"/>'),
    pin: p('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    clock: p('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    filter: p('<path d="M4 6h16M7 12h10M10 18h4"/>'),
    sort: p('<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>'),
    gallery: p('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5-9 9"/>'),
    flash: p('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
    barcode: p('<path d="M4 6v12M7 6v12M10 6v12M14 6v12M17 6v12M20 6v12"/>'),
    text: p('<path d="M4 7V5h16v2M12 5v14M9 19h6"/>'),
    share: p('<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>'),
    car: p('<path d="M3 15v-3l2-5h14l2 5v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="7.5" cy="16" r="2"/><circle cx="16.5" cy="16" r="2"/><path d="M5 12h14"/>'),
    truck: p('<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
    store: p('<path d="M4 10v10h16V10M3 6l2-3h14l2 3v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M10 20v-5h4v5"/>'),
    shield: p('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
    box: p('<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/>'),
    receipt: p('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
    globe: p('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>'),
    logout: p('<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10"/>'),
    history: p('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 8v4l3 2"/>'),
    fire: p('<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z"/>'),
    tag: p('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>'),
    sparkle: p('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
    edit: p('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
    card: p('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>'),
    cash: p('<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>'),
    info: p('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
    mic: p('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  };

  // Kategoriya rasmlari (kattaroq, ikki tonli)
  const C = {
    filter: p('<path d="M4 5h16l-6 7v6l-4 2v-8z"/>'),
    oil: p('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>'),
    brake: p('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6"/>'),
    engine: p('<path d="M4 10h2V8h4V6h4v2h3l2 3h2v5h-2l-2 3H8l-2-3H4z"/><path d="M10 12h4"/>'),
    suspension: p('<path d="M12 2v3M9 5h6M9 8l6 2-6 2 6 2-6 2 6 2M9 19h6M12 19v3"/>'),
    electric: p('<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 7V5h3v2M14 7V5h3v2M7 13h3M15.5 11.5v3M14 13h3"/>'),
    body: I.car,
    light: p('<path d="M9 6c-3 0-5 2.7-5 6s2 6 5 6h3V6z"/><path d="M15 8h5M15 12h6M15 16h5"/>'),
    wiper: p('<path d="M3 18A13 13 0 0 1 21 18"/><path d="M12 18 6 7"/><circle cx="12" cy="18" r="1"/>'),
    chem: p('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 15h9"/>'),
    hardware: p('<path d="M9 3h6l3 5-3 5H9L6 8z"/><circle cx="12" cy="8" r="1.8"/><path d="M10.5 13v8M13.5 13v8"/>'),
    box: I.box,
  };

  window.CO = window.CO || {};
  window.CO.icons = I;
  window.CO.catIcons = C;
})();
