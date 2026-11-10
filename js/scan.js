/*
 * Rasm orqali qidiruv:
 *  1) Jonli kamera + shtrix-kod/QR avtomatik o'qish (BarcodeDetector bo'lsa)
 *  2) Suratdan matn o'qish (OCR, Tesseract.js) — qutidagi artikul / OEM raqam / nom
 *  3) Topilgan kod va so'zlar bo'yicha katalogdan qidirish
 */
window.Scan = (function () {
  const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  let stream = null, loopTimer = null, detector = null, tessLoading = null;

  async function getDetector() {
    if (detector !== null) return detector;
    detector = false;
    if ('BarcodeDetector' in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        if (formats.length) detector = new window.BarcodeDetector({ formats });
      } catch (_) { /* qo'llab-quvvatlanmaydi */ }
    }
    return detector;
  }

  const cameraSupported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  async function start(video, onCode) {
    stop();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false,
    });
    video.srcObject = stream;
    video.setAttribute('playsinline', '');
    video.muted = true;
    await video.play();
    const det = await getDetector();
    if (det && onCode) {
      const tick = async () => {
        if (!stream) return;
        try {
          const codes = await det.detect(video);
          if (codes.length && codes[0].rawValue) { onCode(codes[0].rawValue); return; }
        } catch (_) { /* kadr tayyor emas */ }
        loopTimer = setTimeout(tick, 350);
      };
      tick();
    }
  }

  function stop() {
    clearTimeout(loopTimer);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }

  function frameToCanvas(source) {
    const w = source.videoWidth || source.naturalWidth || source.width;
    const h = source.videoHeight || source.naturalHeight || source.height;
    const scale = Math.min(1, 1600 / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
    return c;
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

  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!tessLoading) {
      tessLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = TESSERACT_URL; s.async = true;
        s.onload = () => resolve(window.Tesseract);
        s.onerror = () => { tessLoading = null; reject(new Error('OCR yuklanmadi')); };
        document.head.appendChild(s);
      });
    }
    return tessLoading;
  }

  // Matndan artikul / OEM raqamlar va mazmunli so'zlarni ajratish
  function extractCandidates(text) {
    const clean = text.replace(/[|_]/g, ' ');
    const codes = new Set();
    const codeRe = /\b[A-Z0-9]{2,6}[- ]?[A-Z0-9]{3,6}(?:[- ]?[A-Z0-9]{1,4})?\b/gi;
    (clean.match(codeRe) || []).forEach((m) => {
      if (/\d/.test(m) && m.replace(/\W/g, '').length >= 5) codes.add(m.trim().toUpperCase());
    });
    (clean.match(/\b\d{5,13}\b/g) || []).forEach((m) => codes.add(m));
    const words = (clean.match(/[A-Za-zА-Яа-яЁё]{3,}/g) || [])
      .map((w) => w.toLowerCase())
      .filter((w, i, a) => a.indexOf(w) === i)
      .slice(0, 12);
    return { codes: [...codes].slice(0, 10), words };
  }

  async function analyze(source, onStatus = () => {}) {
    const canvas = frameToCanvas(source);
    const result = { barcode: null, codes: [], words: [], text: '' };

    const det = await getDetector();
    if (det) {
      onStatus('Shtrix-kod qidirilmoqda…');
      try {
        const found = await det.detect(canvas);
        if (found.length) { result.barcode = found[0].rawValue; return result; }
      } catch (_) { /* davom etamiz */ }
    }

    onStatus('Rasmdagi yozuvlar o\'qilmoqda…');
    const T = await loadTesseract();
    const { data } = await T.recognize(canvas, 'eng', {
      logger: (m) => { if (m.status === 'recognizing text') onStatus('Yozuv o\'qilmoqda… ' + Math.round(m.progress * 100) + '%'); },
    });
    result.text = data.text || '';
    Object.assign(result, extractCandidates(result.text));
    return result;
  }

  return { cameraSupported, start, stop, analyze, fileToImage, getDetector, extractCandidates };
})();
