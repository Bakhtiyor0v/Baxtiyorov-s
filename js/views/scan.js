/* Rasm orqali qidiruv — to'liq ekranli kamera: #/scan */
(function () {
  const CO = window.CO;
  const { esc, grid, empty, openSheet, closeSheet } = CO.ui;
  const I = CO.icons;
  const t = (...a) => CO.i18n.t(...a);

  // Ramka o'lchamlari (CSS bilan bir xil) — OCR faqat shu qismni o'qiydi
  function frameCrop(view, video, mode) {
    const vr = view.getBoundingClientRect();
    const fr = view.querySelector('.scan__frame').getBoundingClientRect();
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return null;
    // object-fit: cover — ko'rinadigan qism
    const scale = Math.max(vr.width / vw, vr.height / vh);
    const dispW = vw * scale, dispH = vh * scale;
    const offX = (dispW - vr.width) / 2, offY = (dispH - vr.height) / 2;
    // Ramkadan biroz kengroq o'qiymiz — chetdagi harflar kesilmasin
    const px = mode === 'label' ? 0.1 : 0.08, py = 0.05;
    const x = (fr.left - vr.left + offX) / dispW, y = (fr.top - vr.top + offY) / dispH;
    const w = fr.width / dispW, h = fr.height / dispH;
    const x0 = Math.max(0, x - px), y0 = Math.max(0, y - py);
    return { x: x0, y: y0, w: Math.min(1 - x0, w + 2 * px), h: Math.min(1 - y0, h + 2 * py) };
  }

  function view() {
    let mode = 'barcode';
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
          <div class="scan__frame" id="frame"><i></i><i></i><i></i><i></i><span class="scan__laser" id="laser"></span></div>
          <div class="scan__hint" id="hint">${t('scan.hint.barcode')}</div>
          <div class="scan__status" id="status" hidden><span class="spinner"></span><span id="statusText"></span></div>
        </div>
        <div class="scan__bottom">
          <div class="scan__modes"><div class="seg">
            <button data-mode="barcode" class="is-active">${I.barcode}${t('scan.mode.barcode')}</button>
            <button data-mode="label">${I.text}${t('scan.mode.label')}</button>
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
      let busy = false, torchOn = false, alive = true, liveCode = null;

      const status = (key, extra = '') => {
        $('#status').hidden = !key;
        if (key) $('#statusText').textContent = t('scan.status.' + key) + extra;
      };
      const setHint = () => {
        $('#hint').textContent = photo.hidden ? t(mode === 'barcode' ? 'scan.hint.barcode' : 'scan.hint.label') : t('scan.hint.photo');
      };

      $('[data-back]').onclick = () => CO.router.back();
      root.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => {
        mode = b.dataset.mode;
        root.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('is-active', x === b));
        $('#frame').classList.toggle('is-label', mode === 'label');
        setHint();
      });

      function showResults(list, { title, chips = [], code, similar = [] } = {}) {
        const body = `
          ${chips.length ? `<div class="found">${chips.map((c) => `<a class="chip chip--soft" href="#/search?q=${encodeURIComponent(c)}">${esc(c)}</a>`).join('')}</div>` : ''}
          ${list.length ? grid(list.slice(0, 12)) : empty({
            icon: I.search, title: t('scan.none.title'), text: t('scan.none.text'),
            actions: `<a class="btn" href="https://t.me/${CO.config.shop.telegram}?text=${encodeURIComponent(t('scan.askText', { code: code || chips.join(', ') }))}" target="_blank" rel="noopener">${I.telegram}${t('scan.ask')}</a>`,
          })}
          ${similar.length ? `<div class="section__head" style="margin-top:20px"><h3 class="section__title" style="font-size:16px">${t('scan.alsoSimilar')}</h3></div>${CO.ui.hscroll(similar)}` : ''}`;
        openSheet({
          title: title || t('scan.found', { n: list.length }), body, cls: 'scan-result',
          foot: `<button class="btn btn--line" data-again>${I.camera}${t('scan.again')}</button>${list.length > 12 ? `<a class="btn" href="#/search?q=${encodeURIComponent(chips[0] || '')}">${t('common.all')}</a>` : ''}`,
          onClose: () => { if (alive) resetPhoto(); },
        });
        document.querySelector('#sheet [data-again]').onclick = () => closeSheet();
      }

      function onCode(code) {
        if (busy || CO.ui.sheetOpen()) return;
        if (navigator.vibrate) navigator.vibrate(50);
        const exact = CO.search.byCode(code);
        const list = exact.length ? exact : CO.search.query(code);
        liveCode = code;
        showResults(list, { title: exact.length ? t('scan.byBarcode') : t('scan.code', { code: esc(code) }), chips: [code], code });
      }

      function resetPhoto() {
        photo.hidden = true; photo.removeAttribute('src');
        if (CO.scan.isActive()) { video.hidden = false; $('#frame').hidden = false; }
        else { ph.hidden = false; $('#hint').hidden = true; }
        setHint();
      }

      async function run(source, crop) {
        if (busy) return; busy = true;
        $('#shutter').classList.add('is-busy');
        try {
          const r = await CO.scan.analyze(source, {
            crop,
            isGood: (c) => CO.search.matchScan(c).strong.length > 0,
            onStatus: (s) => status(s),
            onProgress: (p) => status('ocr', ' ' + Math.round(p * 100) + '%'),
          });
          if (r.barcode) { status(''); busy = false; onCode(r.barcode); return; }
          const m = CO.search.matchScan(r);
          const chips = [...r.codes.slice(0, 4), ...r.words.slice(0, 4)];
          if (m.strong.length) showResults(m.strong, { title: t('scan.byCode'), chips, similar: m.similar.slice(0, 8) });
          else showResults(m.similar, { title: m.similar.length ? t('scan.similar') : '', chips });
        } catch (err) {
          console.error(err);
          CO.ui.toast(t(err.message === 'ocr-load' ? 'scan.err.net' : 'scan.err.generic'), { icon: I.alert });
          resetPhoto();
        } finally {
          status(''); busy = false; $('#shutter').classList.remove('is-busy');
        }
      }

      $('#shutter').onclick = () => {
        if (busy) return;
        if (!video.hidden && video.readyState >= 2) {
          // Kadrni "muzlatish" va tahlil qilish
          const snap = CO.scan.toCanvas(video);
          photo.src = snap.toDataURL('image/jpeg', 0.85);
          photo.hidden = false; video.hidden = true; setHint();
          run(snap, frameCrop(viewEl, video, mode));
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
        // Ekrandagi "suratga olish" tugmasi galereyani ochadi
      };
      $('[data-pick-file]').onclick = () => $('#fileInput').click();

      if (!CO.scan.cameraSupported()) {
        noCamera(window.isSecureContext ? 'scan.noCamera' : 'scan.needHttps');
      } else {
        CO.scan.start(video, onCode).then((info) => {
          if (!alive) { CO.scan.stop(); return; }
          ph.hidden = true; video.hidden = false;
          if (info.hasTorch) { $('#torch').hidden = false; $('#torchStub').hidden = true; }
          if (!info.hasDetector && mode === 'barcode') {
            // Brauzer shtrix-kodni o'zi o'qiy olmasa — etiketka rejimi qulayroq
            root.querySelector('[data-mode="label"]').click();
          }
        }).catch(() => { if (alive) noCamera('scan.denied'); });
      }

      return () => { alive = false; CO.scan.stop(); liveCode = null; };
    }

    return { html, mount, header: 'none', noTabbar: true, tab: 'scan', flush: true };
  }

  CO.views = CO.views || {};
  CO.views.scan = view;
})();
