/*
 * Do'kon sozlamalari — shu yerni o'zgartiring.
 */
window.CO = window.CO || {};
window.CO.config = {
  shop: {
    name: 'CarOne',
    slogan: { uz: 'Koreys avtomobillari uchun ehtiyot qismlar', ru: 'Запчасти для корейских автомобилей' },
    phone: '+998 00 000 00 00',        // TODO: haqiqiy telefon raqam
    phoneHref: 'tel:+998000000000',    // TODO
    telegram: 'carone_shop',           // TODO: Telegram username (@ belgisisiz)
    address: { uz: 'Toshkent shahri', ru: 'г. Ташкент' }, // TODO: to'liq manzil
    mapUrl: '',                        // TODO: Google/Yandex xarita havolasi
    hours: { uz: 'Har kuni 09:00 – 19:00', ru: 'Ежедневно 09:00 – 19:00' },
    currency: { uz: 'so\'m', ru: 'сум' },
  },

  /*
   * Ma'lumot manbai:
   *  - 'demo' : js/data/catalog.js dagi namunaviy katalog (hozir shu)
   *  - 'bito' : Bito CarOne (HALI ULANMAGAN — integrations/bito/README.md)
   * Bito'ga ulash faqat do'kon egasining ruxsati bilan qilinadi.
   */
  dataSource: 'demo',

  delivery: {
    freeFrom: 500000,        // shu summadan yuqori — yetkazish bepul (namuna)
    price: 25000,            // yetkazib berish narxi (namuna)
  },

  defaultLang: 'uz',
};
