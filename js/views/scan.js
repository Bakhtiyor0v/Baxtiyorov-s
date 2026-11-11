/* Rasm orqali qidiruv — to'liq ekranli kamera: #/scan
 * Rejimlar:
 *   product — detalning O'ZINI rasmga olish: turini aniqlaydi, do'kon rasmlari bilan
 *             solishtiradi va "bizda bor / yo'q" ni ko'rsatadi
 *   barcode — shtrix-kod (jonli, avtomatik)
 *   label   — etiketkadagi OEM / artikul (OCR)
 */
(function () {
  const CO = window.CO;
  const { esc, grid, empty, openSheet, closeSheet } = CO.ui;
  const I = CO.icons;
  const t = (...a) => CO.i18n.t(...a);
  const L = (o) => CO.i18n.pick(o);

  // Ramka o'lchamlari → rasmdagi nisbiy koordinatalar
  function frameCrop(view, video, mode) {
    const vr = view.getBoundingClientRect();
    const fr = view.querySelector('.scan__frame').getBoundingClientRect();
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return null;
    const scale = Math.max(vr.width / vw, vr.height / vh);
    const dispW = vw * scale, dispH = vh * scale;
    const offX = (dispW - vr.width) / 2, offY = (dispH - vr.height) / 2;
    const px = mode === 'label' ? 0.1 : mode === 'product' ? 0.04 : 0.08, py = 0.05;
    const x = (fr.left - vr.left + offX) / dispW, y = (fr.top - vr.top + offY) / dispH;
    const w = fr.width / dispW, h = fr.height / dispH;
    const x0 = Math.max(0, x - px), y0 = Math.max(0, y - py);
    return { x: x0, y: y0, w: Math.min(1 - x0, w + 2 * px), h: Math.min(1 - y0, h + 2 * py) };
  }

  const HINT = { product: 'scan.hint.product', barcode: 'scan.hint.barcode', label: 'scan.hint.label' };

  function view(params) {
    let mode = ['product', 'barcode', 'label'].includes(params.get('mode')) ? params.get('mode') : 'product';
    const html = `
      <div class="scan">
        <div class="scan__top">
          <button class="icon-btn" data-back aria-label="${esc(t('common.back'))}">${I.close}</button>
          <div class="scan__title">${t('scan.title')}</div>
          <button class="icon-btn" id="torch" aria-label="${esc(t('scan.torch'))}" hidden>${I.flash}</button>
          <span id="torchStub" style="width:40px"></span>
        </div>
        <div class="scan__view" id="scanView">
          <video id="camVideo" playsinline muted hidden></video>
          <img class="scan__photo" id="camPhoto" alt="" hidden>
          <div class="scan__placeholder" id="camPh"><div>${I.camera}<span id="camPhText">${t('scan.starting')}</span>
            <div id="camPhBtn" hidden style="margin-top:18px"><button class="btn" data-pick-file>${I.gallery}${t('scan.pickPhoto')}</button></div></div></div>
          <div class="scan__frame is-${mode}" id="frame"><i></i><i></i><i></i><i></i><span class="scan__laser" id="laser"></span></div>
          <div class="scan__hint" id="hint">${t(HINT[mode])}</div>
          <div class="scan__status" id="status" hidden><span class="spinner"></span><span id="statusText"></span></div>
        </div>
        <div class="scan__bottom">
          <div class="scan__modes"><div class="seg">
            <button data-mode="product" class="${mode === 'product' ? 'is-active' : ''}">${I.box}${t('scan.mode.product')}</button>
            <button data-mode="barcode" class="${mode === 'barcode' ? 'is-active' : ''}">${I.barcode}${t('scan.mode.barcode')}</button>
            <button data-mode="label" class="${mode === 'label' ? 'is-active' : ''}">${I.text}${t('scan.mode.label')}</button>
          </div></div>
          <div class="scan__actions">
            <label class="scan__side"><span>${I.gallery}</span>${t('scan.gallery')}<input type="file" accept="image/*" id="fileInput" hidden></label>
            <button class="shutter" id="shutter" aria-label="${esc(t('scan.shoot'))}"><i>${I.search}</i></button>
            <a class="scan__side" href="#/search"><span>${I.text}</span>${t('scan.manual')}</a>
          </div>
        </div>
      </div>`;

    function mount(root) {
      const $ = (s) => root.querySelector(s);
      const video = $('#camVideo'), photo = $('#camPhoto'), ph = $('#camPh'), viewEl = $('#scanView');
      let busy = false, torchOn = false, alive = true;

      const status = (key, extra = '') => {
        $('#status').hidden = !key;
        if (key) $('#statusText').textContent = t('scan.status.' + key) + extra;
      };
      const setHint = () => { $('#hint').textContent = photo.hidden ? t(HINT[mode]) : t('scan.hint.photo'); };

      $('[data-back]').onclick = () => CO.router.back();
      root.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => {
        mode = b.dataset.mode;
        root.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('is-active', x === b));
        $('#frame').className = 'scan__frame is-' + mode;
        setHint();
        if (mode === 'product') CO.vision.load().catch(() => {}); // modelni oldindan yuklab qo'yamiz
      });
      if (mode === 'product') CO.vision.load().catch(() => {});

      const askLink = (text) => `<a class="btn" href="https://t.me/${CO.config.shop.telegram}?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">${I.telegram}${t('scan.ask')}</a>`;

      /* ---------- Natija: kod / etiketka bo'yicha ---------- */
      function showResults(list, { title, chips = [], code, similar = [] } = {}) {
        const body = `
          ${chips.length ? `<div class="found">${chips.map((c) => `<a class="chip chip--soft" href="#/search?q=${encodeURIComponent(c)}">${esc(c)}</a>`).join('')}</div>` : ''}
          ${list.length ? availability(list) : empty({
            icon: I.search, title: t('scan.none.title'), text: t('scan.none.text'),
            actions: askLink(t('scan.askText', { code: code || chips.join(', ') })),
          })}
          ${similar.length ? `<div class="section__head" style="margin-top:20px"><h3 class="section__title" style="font-size:16px">${t('scan.alsoSimilar')}</h3></div>${CO.ui.hscroll(similar)}` : ''}`;
        openResult(title || t('scan.found', { n: list.length }), body);
      }

      function openResult(title, body) {
        openSheet({
          title, body, cls: 'scan-result',
          foot: `<button class="btn btn--line" data-again>${I.camera}${t('scan.again')}</button>`,
          onClose: () => { if (alive) resetPhoto(); },
        });
        document.querySelector('#sheet [data-again]').onclick = () => closeSheet();
      }

      // "Bizda bor / yo'q" bloki
      function availability(list, { car } = {}) {
        const inStock = list.filter((p) => p.stock > 0);
        const out = list.filter((p) => p.stock <= 0);
        return `
          ${inStock.length
            ? `<div class="avail avail--yes">${I.check}<div><b>${t('scan.r.inStock', { n: inStock.length })}</b>${car ? `<span>${t('scan.r.forCarNote', { car: esc(car) })}</span>` : ''}</div></div>${grid(inStock.slice(0, 12))}`
            : `<div class="avail avail--no">${I.alert}<div><b>${car ? t('scan.r.noneForCar', { car: esc(car) }) : t('scan.r.noneInStock')}</b><span>${t('scan.r.askSeller')}</span></div></div>
               <div style="text-align:center;margin:12px 0 4px">${askLink(t('scan.r.askText'))}</div>`}
          ${out.length ? `<details class="avail-out"><summary>${t('scan.r.outStock', { n: out.length })}</summary>${grid(out.slice(0, 8))}</details>` : ''}`;
      }

      /* ---------- Natija: mahsulotning o'zi (vizual) ---------- */
      function showProductResult(r) {
        const products = CO.api.products();
        const pk = CO.vision.pick(r.visual);
        const visStrong = pk.strong.map((id) => CO.api.product(id)).filter(Boolean);
        const visMaybe = pk.maybe.map((id) => CO.api.product(id)).filter(Boolean);
        const types = r.types.filter((x) => x.score >= 0.04).slice(0, 3);
        // Vizual moslik bo'lsa, kategoriya o'shandan olinadi
        let cat = visStrong[0]?.cat || visMaybe[0]?.cat || types[0]?.cat || null;
        let car = CO.store.state.activeCar || '';

        let picked = false; // mijoz turini o'zi tanlasa — vizual natija e'tiborga olinmaydi
        const visAll = [...visStrong, ...visMaybe];

        const draw = () => {
          const catObj = cat ? CO.api.category(cat) : null;
          const useVisual = !picked && !r.exact.length && visAll.length;
          const fitsCar = (p) => !car || !p.cars.length || p.cars.includes(car);
          let list, others = [];
          if (r.exact.length) list = r.exact;
          else if (useVisual) {
            list = visAll;
            others = CO.api.products().filter((p) => p.cat === cat && !visAll.includes(p) && fitsCar(p) && p.stock > 0);
          } else {
            list = products.filter((p) => (!cat || p.cat === cat) && fitsCar(p))
              .sort((a, b) => (b.stock > 0) - (a.stock > 0) || (b.isHit - a.isHit));
          }
          const title = r.exact.length ? t('scan.byCode')
            : useVisual ? t('scan.r.visual')
            : catObj ? t('scan.r.type', { type: esc(L(catObj.name)) })
            : t('scan.r.unknown');

          const typeChips = !r.exact.length ? `
            <div class="field__label">${t('scan.r.whatIs')}</div>
            <div class="chips chips--wrap" style="margin-bottom:12px">
              ${[...new Set([...types.map((x) => x.cat), ...(cat ? [cat] : [])])].map((c) => {
                const co = CO.api.category(c);
                const conf = types.find((x) => x.cat === c);
                return `<button class="chip chip--sm ${c === cat ? 'is-active' : ''}" data-cat="${c}">${esc(L(co.name))}${conf ? ` <span class="count">${Math.min(99, Math.round(conf.score * 100))}%</span>` : ''}</button>`;
              }).join('')}
              <button class="chip chip--sm chip--soft" data-cat-other>${t('scan.r.other')}</button>
            </div>
            <div class="cats cats--pick" id="catPick" hidden>
              ${CO.api.categories().map((c) => `<button class="cat" data-cat="${c.id}" style="${CO.ui.catStyle(c.id)}"><span class="cat__icon">${CO.catIcons[c.icon] || CO.catIcons.box}</span>${esc(L(c.name))}</button>`).join('')}
            </div>` : '';

          const carChips = !r.exact.length && !useVisual && cat ? `
            <div class="field__label">${t('scan.r.forCar')}</div>
            <div class="chips" style="margin-bottom:12px">
              <button class="chip chip--sm ${!car ? 'is-active' : ''}" data-car="">${t('scan.r.allCars')}</button>
              ${[...new Set([...(CO.store.state.activeCar ? [CO.store.state.activeCar] : []), ...CO.api.db.quickCars])].map((c) => `<button class="chip chip--sm ${c === car ? 'is-active' : ''}" data-car="${esc(c)}">${esc(c)}</button>`).join('')}
            </div>` : '';

          const body = `
            ${typeChips}
            ${carChips}
            ${cat || r.exact.length || useVisual ? availability(list, { car: r.exact.length || useVisual ? '' : car }) : empty({
              icon: I.search, title: t('scan.r.unknown'), text: t('scan.r.unknownText'), actions: askLink(t('scan.r.askText')),
            })}
            ${others.length ? `<div class="section__head" style="margin-top:20px"><h3 class="section__title" style="font-size:16px">${t('scan.r.sameType')}</h3></div>${CO.ui.hscroll(others.slice(0, 10))}` : ''}
            ${!r.hasIndex ? `<div class="note" style="margin-top:16px">${I.info}<div>${t('scan.r.indexNote')}</div></div>` : ''}`;

          const panel = document.querySelector('#sheet .sheet__body');
          if (panel) {
            panel.innerHTML = body;
            document.querySelector('#sheet .sheet__title').innerHTML = title;
          } else openResult(title, body);
          const sh = document.querySelector('#sheet');
          sh.querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => { cat = b.dataset.cat; picked = true; draw(); });
          sh.querySelectorAll('[data-car]').forEach((b) => b.onclick = () => { car = b.dataset.car; draw(); });
          const other = sh.querySelector('[data-cat-other]');
          if (other) other.onclick = () => { const g = sh.querySelector('#catPick'); g.hidden = !g.hidden; };
        };
        draw();
      }

      function onCode(code) {
        if (busy || CO.ui.sheetOpen()) return;
        if (navigator.vibrate) navigator.vibrate(50);
        const exact = CO.search.byCode(code);
        const list = exact.length ? exact : CO.search.query(code);
        showResults(list, { title: exact.length ? t('scan.byBarcode') : t('scan.code', { code: esc(code) }), chips: [code], code });
      }

      function resetPhoto() {
        photo.hidden = true; photo.removeAttribute('src');
        if (CO.scan.isActive()) { video.hidden = false; $('#frame').hidden = false; }
        else { ph.hidden = false; $('#hint').hidden = true; }
        setHint();
      }

      async function runText(source, crop) {
        const r = await CO.scan.analyze(source, {
          crop,
          isGood: (c) => CO.search.matchScan(c).strong.length > 0,
          onStatus: (s) => status(s),
          onProgress: (p) => status('ocr', ' ' + Math.round(p * 100) + '%'),
        });
        if (r.barcode) { onCode(r.barcode); return; }
        const m = CO.search.matchScan(r);
        const chips = [...r.codes.slice(0, 4), ...r.words.slice(0, 4)];
        if (m.strong.length) showResults(m.strong, { title: t('scan.byCode'), chips, similar: m.similar.slice(0, 8) });
        else showResults(m.similar, { title: m.similar.length ? t('scan.similar') : '', chips });
      }

      async function runProduct(source, crop) {
        // 1) Shtrix-kod bo'lsa — eng aniq
        const det = await CO.scan.getDetector();
        if (det) {
          try {
            const found = await det.detect(CO.scan.toCanvas(source), crop);
            if (found.length) { onCode(found[0].rawValue); return; }
          } catch (_) { /* davom */ }
        }
        // 2) Rasmni tanish
        status('vision-load');
        await CO.vision.load((p) => status('vision-load', ' ' + Math.round(p * 100) + '%'));
        status('vision');
        const r = await CO.vision.recognize(source, { crop });
        // 3) Qutida bo'lsa yoki aniq emas bo'lsa — yozuvini ham o'qib ko'ramiz
        r.exact = [];
        const confident = CO.vision.pick(r.visual).strong.length > 0;
        if (!confident) {
          try {
            const txt = await CO.scan.analyze(source, {
              crop, skipBarcode: true,
              isGood: (c) => CO.search.matchScan(c).strong.length > 0,
              onStatus: () => status('ocr'),
              onProgress: (p) => status('ocr', ' ' + Math.round(p * 100) + '%'),
            });
            r.exact = CO.search.matchScan(txt).strong;
          } catch (_) { /* OCR bo'lmasa ham davom etamiz */ }
        }
        showProductResult(r);
      }

      async function run(source, crop) {
        if (busy) return; busy = true;
        $('#shutter').classList.add('is-busy');
        try {
          if (mode === 'product') await runProduct(source, crop);
          else await runText(source, crop);
        } catch (err) {
          console.error(err);
          const key = err.message === 'ocr-load' || err.message === 'vision-load' ? 'scan.err.net' : 'scan.err.generic';
          CO.ui.toast(t(key), { icon: I.alert });
          resetPhoto();
        } finally {
          status(''); busy = false; $('#shutter').classList.remove('is-busy');
        }
      }

      $('#shutter').onclick = () => {
        if (busy) return;
        if (!video.hidden && video.readyState >= 2) {
          const snap = CO.scan.toCanvas(video, null, 1600);
          const crop = frameCrop(viewEl, video, mode);
          photo.src = snap.toDataURL('image/jpeg', 0.85);
          photo.hidden = false; video.hidden = true; setHint();
          run(snap, crop);
        } else {
          $('#fileInput').click();
        }
      };

      $('#fileInput').onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        e.target.value = '';
        const { img, url } = await CO.scan.fileToImage(f);
        photo.src = url; photo.hidden = false; video.hidden = true; ph.hidden = true;
        $('#frame').hidden = true; $('#hint').hidden = false; setHint();
        run(img, null);
      };

      $('#torch').onclick = async () => {
        torchOn = !torchOn;
        if (await CO.scan.setTorch(torchOn)) $('#torch').classList.toggle('is-on', torchOn);
      };

      const noCamera = (key) => {
        $('#camPhText').textContent = t(key);
        $('#camPhBtn').hidden = false;
        $('#frame').hidden = true; $('#hint').hidden = true;
      };
      $('[data-pick-file]').onclick = () => $('#fileInput').click();

      if (!CO.scan.cameraSupported()) {
        noCamera(window.isSecureContext ? 'scan.noCamera' : 'scan.needHttps');
      } else {
        CO.scan.start(video, onCode).then((info) => {
          if (!alive) { CO.scan.stop(); return; }
          ph.hidden = true; video.hidden = false;
          if (info.hasTorch) { $('#torch').hidden = false; $('#torchStub').hidden = true; }
        }).catch(() => { if (alive) noCamera('scan.denied'); });
      }

      return () => { alive = false; CO.scan.stop(); };
    }

    return { html, mount, header: 'none', noTabbar: true, tab: 'scan', flush: true };
  }

  CO.views = CO.views || {};
  CO.views.scan = view;
})();
