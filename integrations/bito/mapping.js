/*
 * Bito CarOne → do'kon formati (SHABLON, faqat o'zgartirish funksiyasi).
 * ------------------------------------------------------------------
 * Bu fayl Bito'ga HECH QANDAY so'rov yubormaydi. U faqat kelajakda serveringiz
 * Bito'dan O'QIB olgan mahsulot obyektini sayt tushunadigan ko'rinishga keltiradi.
 * Hozir sayt 'demo' katalogda ishlaydi (js/core/config.js → dataSource).
 *
 * Bito mahsulot obyekti tuzilishi (bito_product_get_paging javobidan):
 *   { _id, number, name, sku, barcodes: [], images: [], category_id?,
 *     measure: { name }, organizations: [{ organization_id, amount, booked,
 *     is_available_for_sale }], custom_fields: [], attributes: [] }
 * Narxlar mahsulot ichida kelmaydi — alohida narx ro'yxatidan olinadi
 * (bito_price_items_get_paging), shuning uchun priceOf() parametr sifatida beriladi.
 */
(function (root) {
  // Nomdan mashina modellarini aniqlash (Bito'da alohida maydon bo'lmasa)
  const CAR_PATTERNS = [
    ['Nexia 3', /nexia[\s-]?3|нексия[\s-]?3/i],
    ['Nexia', /nexia|нексия|neksiya/i],
    ['Cobalt', /cobalt|кобальт|kobalt/i],
    ['Lacetti', /lacetti|ласетти|lasetti/i],
    ['Gentra', /gentra|жентра|jentra/i],
    ['Spark', /spark|спарк/i],
    ['Matiz', /matiz|матиз/i],
    ['Damas', /damas|дамас/i],
    ['Labo', /labo|лабо/i],
    ['Malibu', /malibu|малибу/i],
    ['Captiva', /captiva|каптива/i],
    ['Tracker', /tracker|трекер/i],
    ['Onix', /onix|оникс/i],
    ['Kia Rio', /kia\s?rio|киа\s?рио/i],
    ['Kia K5', /\bk5\b/i],
    ['Kia Sportage', /sportage|спортейдж/i],
    ['Kia Seltos', /seltos|селтос/i],
    ['Hyundai Accent', /accent|акцент/i],
    ['Hyundai Elantra', /elantra|элантра/i],
    ['Hyundai Sonata', /sonata|соната/i],
    ['Hyundai Tucson', /tucson|туксон/i],
    ['Hyundai Creta', /creta|крета/i],
  ];

  function detectCars(name) {
    const found = [];
    for (const [model, re] of CAR_PATTERNS) {
      if (re.test(name) && !(model === 'Nexia' && found.includes('Nexia 3') && !/nexia(?![\s-]?3)/i.test(name))) found.push(model);
    }
    return found;
  }

  // Nomdagi OEM raqamni ajratish: "Шланг вакум Нексия 96215685" → 96215685
  function detectOem(name) {
    const m = String(name).match(/\b(\d{5}-[A-Z0-9]{5}|\d{8}|[A-Z0-9]{2,5}-\d{5,6})\b/i);
    return m ? m[1] : '';
  }

  /**
   * @param {object} b         Bito mahsulot obyekti
   * @param {object} opts
   *   orgId      — do'kon (organization) id, qoldiq shu bo'yicha olinadi
   *   priceOf    — (bitoProductId) => narx (so'm) | 0
   *   catOf      — (bitoCategoryId) => sayt kategoriyasi id ('filter', 'oil', ...) | 'other'
   *   imageUrl   — (fileId) => rasm URL (Bito fayl xizmati orqali)
   */
  function mapProduct(b, opts = {}) {
    const org = (b.organizations || []).find((o) => !opts.orgId || o.organization_id === opts.orgId) || {};
    const free = Math.max(0, (org.amount || 0) - (org.booked || 0));
    const forSale = org.is_available_for_sale !== false && org.is_available !== false;
    const name = String(b.name || '').trim();
    return {
      id: 'b' + b._id,
      bitoId: b._id,
      name,
      sku: String(b.sku || b.number || ''),
      oem: detectOem(name),
      barcode: (b.barcodes || [])[0] || '',
      cat: opts.catOf ? opts.catOf(b.category_id) : 'other',
      cars: detectCars(name),
      brand: '',
      country: '',
      price: opts.priceOf ? opts.priceOf(b._id) || 0 : 0,
      oldPrice: 0,
      stock: forSale ? Math.floor(free) : 0,
      unit: 'dona',
      isHit: false,
      isNew: false,
      image: (b.images || [])[0] && opts.imageUrl ? opts.imageUrl(b.images[0]) : null,
    };
  }

  // Narxi yo'q yoki sotuvga chiqarilmagan mahsulotlar saytda ko'rsatilmaydi
  const isSellable = (p) => p.price > 0 && p.name.length > 1;

  const api = { mapProduct, detectCars, detectOem, isSellable };
  root.CO = root.CO || {};
  root.CO.bitoMapping = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
