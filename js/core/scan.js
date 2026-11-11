/*
 * Rasm orqali qidiruv
 *  1) Jonli kamera + shtrix-kod/QR avtomatik o'qish (BarcodeDetector API bo'lsa)
 *  2) Suratdan matn o'qish (OCR, Tesseract.js, CDN'dan kerak bo'lganda yuklanadi)
 *     — faqat ramka ichidagi qism, kulrang + kontrast oshirilib o'qiladi
 *  3) Topilgan shtrix-kod / artikul / OEM / so'zlar bo'yicha katalogdan qidirish
 */
(function () {
  // OCR fayllari saytning o'zida (vendor/ocr) — tashqi CDN'ga bog'liq emas.
  // Lokal yuklanmasa, CDN zaxira sifatida ishlatiladi.
  const base = new URL('vendor/ocr/', document.baseURI).href;
  const OCR = {
    local: { script: base + 'tesseract.min.js', workerPath: base + 'worker.min.js', corePath: base + 'core', langPath: base + 'lang' },
    cdn: {
      script: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',
      langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int',
    },
  };
  let ocrSrc = OCR.local;
  let stream = null, loopTimer = null, detector, tessLoading = null, worker = null, track = null;

  /*
   * Shtrix-kod o'quvchi: brauzerning o'zidagi BarcodeDetector (Android Chrome),
   * bo'lmasa — ZXing (iPhone Safari va boshqalar). Ikkalasi ham bir xil interfeys:
   *   detect(source, crop?) → [{ rawValue }]
   */
  const ZXING_URL = new URL('vendor/zxing/zxing.min.js', document.baseURI).href;
  let zxLoading = null;
  function loadZXing() {
    if (window.ZXing) return Promise.resolve(window.ZXing);
    if (!zxLoading) {
      zxLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = ZXING_URL; s.async = true;
        s.onload = () => (window.ZXing ? resolve(window.ZXing) : reject(new Error('zxing')));
        s.onerror = () => { zxLoading = null; reject(new Error('zxing')); };
        document.head.appendChild(s);
      });
    }
    return zxLoading;
  }

  function zxingDetector(Z) {
    const hints = new Map();
    const F = Z.BarcodeFormat;
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39, F.ITF, F.QR_CODE, F.DATA_MATRIX]);
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    const reader = new Z.MultiFormatReader();
    reader.setHints(hints);
    const decode = (canvas) => {
      try {
        const lum = new Z.HTMLCanvasElementLuminanceSource(canvas);
        return reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(lum))).getText();
      } catch (_) { return null; } finally { reader.reset(); }
    };
    return {
      native: false,
      async detect(source, crop) {
        // Avval ramka qismi (tezroq), keyin butun kadr
        for (const part of crop ? [crop, null] : [null]) {
          const v = decode(toCanvas(source, part, 1000));
          if (v) return [{ rawValue: v }];
        }
        return [];
      },
    };
  }

  async function getDetector() {
    if (detector !== undefined) return detector;
    detector = null;
    if ('BarcodeDetector' in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        if (formats.length) {
          const nd = new window.BarcodeDetector({ formats });
          detector = { native: true, detect: (src) => nd.detect(src) };
          return detector;
        }
      } catch (_) { /* yo'q */ }
    }
    try { detector = zxingDetector(await loadZXing()); } catch (_) { detector = null; }
    return detector;
  }

  const LIVE_CROP = { x: 0.08, y: 0.2, w: 0.84, h: 0.6 };

  const cameraSupported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext;

  async function start(video, onCode) {
    stop();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
    track = stream.getVideoTracks()[0];
    try { await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }); } catch (_) { /* ixtiyoriy */ }
    video.srcObject = stream;
    video.setAttribute('playsinline', '');
    video.muted = true;
    await video.play();
    const det = await getDetector();
    if (det && onCode) {
      let lastCode = '';
      const tick = async () => {
        if (!stream) return;
        try {
          const codes = await det.detect(video, LIVE_CROP);
          const v = codes[0]?.rawValue;
          if (v && v !== lastCode) { lastCode = v; onCode(v); }
        } catch (_) { /* kadr tayyor emas */ }
        loopTimer = setTimeout(tick, det.native ? 300 : 450);
      };
      tick();
    }
    return { hasDetector: !!det, hasTorch: hasTorch() };
  }

  function hasTorch() {
    try { return !!(track && track.getCapabilities && track.getCapabilities().torch); } catch (_) { return false; }
  }
  async function setTorch(on) {
    if (!hasTorch()) return false;
    try { await track.applyConstraints({ advanced: [{ torch: on }] }); return true; } catch (_) { return false; }
  }

  function stop() {
    clearTimeout(loopTimer);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null; track = null;
  }

  const isActive = () => !!stream;

  /* Rasmdan canvas: crop = {x,y,w,h} nisbatlarda (0..1) */
  function toCanvas(source, crop, maxSide = 1600) {
    const sw = source.videoWidth || source.naturalWidth || source.width;
    const sh = source.videoHeight || source.naturalHeight || source.height;
    const c = crop || { x: 0, y: 0, w: 1, h: 1 };
    const sx = sw * c.x, sy = sh * c.y, cw = sw * c.w, ch = sh * c.h;
    const scale = Math.min(1, maxSide / Math.max(cw, ch));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cw * scale); canvas.height = Math.round(ch * scale);
    canvas.getContext('2d').drawImage(source, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  /* OCR uchun: kulrang + kontrastni cho'zish */
  function preprocess(canvas) {
    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    let min = 255, max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = g; if (g < min) min = g; if (g > max) max = g;
    }
    const range = Math.max(1, max - min);
    for (let i = 0; i < d.length; i += 4) {
      const v = ((d[i] - min) / range) * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  function fileToImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = reject;
      img.src = url;
    });
  }

  function addScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error('ocr-load')));
      s.onerror = () => { s.remove(); reject(new Error('ocr-load')); };
      document.head.appendChild(s);
    });
  }
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!tessLoading) {
      tessLoading = addScript(OCR.local.script)
        .catch(() => { ocrSrc = OCR.cdn; return addScript(OCR.cdn.script); })
        .catch((e) => { tessLoading = null; throw e; });
    }
    return tessLoading;
  }

  async function getWorker(onProgress) {
    if (worker) return worker;
    const T = await loadTesseract();
    worker = await T.createWorker('eng', 1, {
      workerPath: ocrSrc.workerPath, corePath: ocrSrc.corePath, langPath: ocrSrc.langPath,
      workerBlobURL: false, gzip: true,
      logger: (m) => { if (m.status === 'recognizing text' && onProgress.current) onProgress.current(m.progress); },
    });
    return worker;
  }
  const progressRef = { current: null };

  // Artikul / OEM / shtrix-kod va mazmunli so'zlarni ajratish
  const STOP = new Set(['the', 'and', 'for', 'made', 'korea', 'china', 'with', 'use', 'only', 'parts', 'part', 'genuine', 'quality', 'www', 'com', 'http', 'https', 'no', 'qty', 'date', 'lot']);
  function extractCandidates(text) {
    const clean = String(text).replace(/[|_[\]{}]/g, ' ');
    const codes = new Set();
    const codeRe = /\b[A-Z0-9]{2,6}[- ]?[A-Z0-9]{3,6}(?:[- ]?[A-Z0-9]{1,5})?\b/gi;
    (clean.match(codeRe) || []).forEach((m) => {
      const c = m.trim().toUpperCase();
      if (/\d/.test(c) && c.replace(/\W/g, '').length >= 5 && (c.match(/\d/g) || []).length >= 3) codes.add(c);
    });
    (clean.match(/\b\d{5,13}\b/g) || []).forEach((m) => codes.add(m));
    // OCR ko'p uchraydigan xatolari: O→0, I→1 (faqat raqamli kodlarda)
    [...codes].forEach((c) => {
      if (/\d{3,}/.test(c)) {
        const fixed = c.replace(/O/g, '0').replace(/[IL]/g, '1');
        if (fixed !== c) codes.add(fixed);
      }
    });
    const words = (clean.match(/[A-Za-zА-Яа-яЁё]{3,}/g) || [])
      .map((w) => w.toLowerCase())
      .filter((w, i, a) => a.indexOf(w) === i && !STOP.has(w))
      .slice(0, 14);
    return { codes: [...codes].slice(0, 12), words };
  }

  async function analyze(source, { crop, isGood, skipBarcode = false, onStatus = () => {}, onProgress = () => {} } = {}) {
    const result = { barcode: null, codes: [], words: [], text: '' };

    const det = skipBarcode ? null : await getDetector();
    if (det) {
      onStatus('barcode');
      try {
        const found = await det.detect(toCanvas(source), crop);
        if (found.length) { result.barcode = found[0].rawValue; return result; }
      } catch (_) { /* davom */ }
    }

    onStatus('ocr-load');
    progressRef.current = onProgress;
    const w = await getWorker(progressRef);
    onStatus('ocr');
    // Avval ramka ichi, natija kam bo'lsa — butun rasm
    const parts = crop ? [crop, null] : [null];
    for (const part of parts) {
      const canvas = preprocess(toCanvas(source, part, 1800));
      const { data } = await w.recognize(canvas);
      result.text += '\n' + (data.text || '');
      const cand = extractCandidates(result.text);
      Object.assign(result, cand);
      // Ramka ichidan katalogdagi kod topilsa — yetarli; aks holda butun rasmni ham o'qiymiz
      if (isGood && isGood(cand)) break;
    }
    return result;
  }

  window.CO = window.CO || {};
  window.CO.scan = { cameraSupported, start, stop, isActive, setTorch, analyze, fileToImage, getDetector, extractCandidates, toCanvas };
})();
