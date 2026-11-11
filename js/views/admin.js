/*
 * Do'kon egasi uchun: mahsulot rasmlari bazasi (#/admin)
 * Har bir mahsulotni 2–3 tomondan rasmga olasiz → telefon har bir rasmdan
 * "vizual imzo" (raqamlar to'plami) hisoblaydi. Rasmning o'zi saqlanmaydi.
 * Tayyor bazani fayl qilib yuklab olib, saytga (data/visual-index.json) joylasangiz,
 * barcha mijozlarda "mahsulotni rasmidan topish" aniq modelgacha ishlaydi.
 * Bu sahifa Bito'ga hech narsa yozmaydi.
 */
(function () {
  const CO = window.CO;
  const { esc, pimg, money } = CO.ui;
  const I = CO.icons;

  function counts() {
    const m = {};
    (CO.store.state.visual || []).forEach((x) => { m[x.id] = (m[x.id] || 0) + 1; });
    return m;
  }

  function view(params) {
    const q = params.get('q') || '';
    const c = counts();
    const all = CO.api.products();
    const list = q ? CO.search.query(q) : all.slice().sort((a, b) => (c[a.id] || 0) - (c[b.id] || 0));
    const done = all.filter((p) => c[p.id]).length;
    const total = (CO.store.state.visual || []).length;

    const html = `
      <h1 class="page-title">Rasm bazasi</h1>
      <div class="note">${I.info}<div>
        <b>Nima uchun kerak:</b> mijoz detalni rasmga olganda sayt aynan qaysi mahsulot ekanini topishi uchun.
        Har bir mahsulotni <b>2–3 tomondan</b>, oddiy fonda rasmga oling. Rasmning o'zi saqlanmaydi — faqat uning raqamli "imzosi".
      </div></div>

      <div class="stats" style="margin-top:12px">
        <div class="stat"><b>${done}</b><span>/ ${all.length} mahsulot</span></div>
        <div class="stat"><b>${total}</b><span>rasm</span></div>
        <div class="stat"><b>${Math.round((done / Math.max(1, all.length)) * 100)}%</b><span>tayyor</span></div>
      </div>

      <div class="card-box" style="margin-top:12px">
        <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr">
          <button class="btn btn--sm" data-export ${total ? '' : 'disabled'}>Faylni yuklab olish</button>
          <label class="btn btn--sm btn--line">Fayldan tiklash<input type="file" accept="application/json,.json" data-import hidden></label>
        </div>
        <p class="muted" style="font-size:12px;margin:10px 0 0">Yuklab olingan <b>visual-index.json</b> faylini saytdagi <b>data/</b> papkasiga joylang — shunda barcha mijozlarda ishlaydi. Hozircha baza faqat shu telefonda.</p>
      </div>

      <form class="search" id="adminSearch" style="margin-top:14px">
        <div class="search__box">${I.search.replace('<svg', '<svg class="search__icon"')}<input name="q" type="search" placeholder="Mahsulotni qidirish…" value="${esc(q)}"></div>
      </form>

      <div class="card-box" style="margin-top:12px">
        ${list.slice(0, 120).map((p) => `
          <div class="cart-line">
            <div class="cart-line__img" style="width:56px;height:56px">${pimg(p)}</div>
            <div class="cart-line__body">
              <div class="cart-line__name">${esc(p.name)}</div>
              <div class="muted" style="font-size:12px">${esc(p.sku)} · ${money(p.price)}</div>
            </div>
            <label class="btn btn--sm ${c[p.id] ? 'btn--ghost' : ''}" style="align-self:center">
              ${I.camera}${c[p.id] ? c[p.id] + ' ✓' : 'Rasm'}
              <input type="file" accept="image/*" capture="environment" multiple data-photo="${p.id}" hidden>
            </label>
          </div>`).join('')}
      </div>
      ${total ? `<button class="btn btn--danger btn--block" data-clear style="margin-top:12px">${I.trash}Bazani tozalash</button>` : ''}`;

    function mount(root) {
      root.querySelector('#adminSearch').onsubmit = (e) => {
        e.preventDefault();
        const v = e.target.q.value.trim();
        CO.router.replace('#/admin' + (v ? '?q=' + encodeURIComponent(v) : ''));
      };
      root.querySelectorAll('[data-photo]').forEach((inp) => inp.onchange = async () => {
        const files = [...inp.files]; inp.value = '';
        if (!files.length) return;
        CO.ui.toast('Tanish moduli tayyorlanmoqda…', { icon: I.clock });
        try {
          await CO.vision.load();
          let n = 0;
          for (const f of files) {
            const { img, url } = await CO.scan.fileToImage(f);
            n = await CO.vision.addReference(inp.dataset.photo, img);
            URL.revokeObjectURL(url);
          }
          CO.ui.toast(`Saqlandi: bu mahsulotda ${n} ta rasm`);
          CO.router.render({ keepScroll: true });
        } catch (e) {
          console.error(e);
          CO.ui.toast('Rasmni qayta ishlab bo\'lmadi', { icon: I.alert });
        }
      });
      const ex = root.querySelector('[data-export]');
      if (ex) ex.onclick = () => {
        const blob = new Blob([JSON.stringify(CO.vision.exportIndex())], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'visual-index.json';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      };
      root.querySelector('[data-import]').onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try {
          const j = JSON.parse(await f.text());
          if (j.model !== CO.vision.MODEL_ID || !Array.isArray(j.items)) throw new Error('format');
          CO.store.set('visual', j.items.map(({ id, v }) => ({ id, v, t: Date.now() })));
          CO.vision.resetIndex();
          CO.ui.toast(`Tiklandi: ${j.items.length} ta rasm`);
          CO.router.render();
        } catch (_) { CO.ui.toast('Fayl mos emas', { icon: I.alert }); }
      };
      const clr = root.querySelector('[data-clear]');
      if (clr) clr.onclick = () => {
        if (!confirm('Shu telefondagi rasm bazasi o\'chirilsinmi?')) return;
        CO.store.set('visual', []); CO.vision.resetIndex(); CO.router.render();
      };
    }

    return { html, mount, header: { back: true, title: 'Do\'kon egasi' }, tab: 'account' };
  }

  CO.views = CO.views || {};
  CO.views.admin = view;
})();
