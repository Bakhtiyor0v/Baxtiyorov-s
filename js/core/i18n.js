/* Tarjimalar: o'zbek (lotin) va rus tillari */
(function () {
  const uz = {
    'common.all': 'Barchasi', 'common.back': 'Orqaga', 'common.clear': 'Tozalash', 'common.close': 'Yopish',
    'common.delete': 'O\'chirish', 'common.open': 'Ochish', 'common.save': 'Saqlash', 'common.undo': 'Qaytarish',

    'tab.home': 'Bosh sahifa', 'tab.catalog': 'Katalog', 'tab.scan': 'Rasm orqali', 'tab.cart': 'Savat', 'tab.account': 'Kabinet',

    'search.ph': 'Detal nomi, OEM yoki artikul…', 'search.label': 'Mahsulot qidirish',
    'search.history': 'Siz qidirgansiz', 'search.clear': 'Tozalash', 'search.popular': 'Ko\'p qidiriladi',
    'search.allResults': 'Barcha natijalar', 'search.nothing': 'Hech narsa topilmadi', 'search.tryPhoto': 'Detalni rasmga olib qidirib ko\'ring',
    'search.category': 'Kategoriya',
    'search.empty.title': 'Hech narsa topilmadi', 'search.empty.text': 'So\'zni boshqacha yozing, OEM raqamni kiriting yoki detalni rasmga oling.',
    'search.ask': 'Sotuvchidan so\'rash (Telegram)', 'search.askText': 'Assalomu alaykum! Saytda topa olmadim: {q}',
    'search.byPhoto': 'Rasm orqali qidirish', 'search.byPhoto.sub': 'Shtrix-kod yoki etiketkani suratga oling',
    'search.tips': 'Qidiruv lotin va kirillni tushunadi: <b>нексия фильтр</b> = <b>nexia filtr</b>. OEM raqamni tire bilan ham, tiresiz ham yozish mumkin: <b>26300-35505</b>.',

    'badge.new': 'Yangi', 'badge.hit': 'Hit',
    'stock.in': 'Omborda bor', 'stock.low': 'Oz qoldi: {n} ta', 'stock.out': 'Tugagan',
    'fit.yes.short': '{car}ga mos', 'fit.yes': '{car} uchun mos', 'fit.yes.text': 'Zavod katalogi bo\'yicha mos keladi',
    'fit.no': '{car}ga mos emas', 'fit.no.text': 'Mashinangizga mosini tanlash uchun sotuvchiga yozing',
    'fit.ask': 'Mashinangizga mosmi?', 'fit.ask.text': 'Mashinani tanlang — moslikni ko\'rsatamiz',
    'fit.universal': 'Universal mahsulot', 'fit.universal.text': 'Barcha mashinalar uchun',
    'fav.toggle': 'Sevimlilar', 'fav.added': 'Sevimlilarga qo\'shildi', 'fav.removed': 'Sevimlilardan olindi',
    'fav.title': 'Sevimlilar', 'fav.empty.title': 'Sevimlilar bo\'sh', 'fav.empty.text': 'Yoqqan mahsulotlarni ♡ belgisi bilan saqlang',
    'unit.dona': 'dona',

    'cart.add': 'Savatga qo\'shish', 'cart.addShort': 'Savatga', 'cart.added': 'Savatga qo\'shildi', 'cart.go': 'Savatga',
    'cart.title': 'Savat', 'cart.items': '{n} ta mahsulot', 'cart.discount': 'Chegirma', 'cart.total': 'Jami',
    'cart.summary': 'Buyurtmangiz', 'cart.checkout': 'Rasmiylashtirish', 'cart.clear': 'Savatni tozalash',
    'cart.clearConfirm': 'Savatdagi barcha mahsulotlar o\'chirilsinmi?', 'cart.remove': 'O\'chirish', 'cart.removed': 'Savatdan olib tashlandi',
    'cart.empty.title': 'Savat hozircha bo\'sh', 'cart.empty.text': 'Kerakli detalni qidiruv, katalog yoki kamera orqali toping',
    'cart.toCatalog': 'Katalogga o\'tish', 'cart.maxStock': 'Omborda faqat {n} ta bor',
    'cart.freeLeft': 'Bepul yetkazib berishgacha yana {sum}', 'cart.freeOk': '✓ Yetkazib berish bepul',

    'filter.title': 'Filtr', 'filter.inStock': 'Omborda bor', 'filter.sale': 'Chegirma', 'filter.fitMyCar': 'Faqat {car}ga mos',
    'filter.price': 'Narx', 'filter.from': 'dan', 'filter.to': 'gacha', 'filter.brand': 'Brend',
    'filter.reset': 'Tozalash', 'filter.apply': 'Ko\'rsatish',
    'sort.title': 'Saralash', 'sort.rel': 'Mosligi bo\'yicha', 'sort.pop': 'Ommabop', 'sort.cheap': 'Arzonroq', 'sort.exp': 'Qimmatroq', 'sort.new': 'Yangilari', 'sort.sale': 'Chegirma kattaroq',
    'list.count': '{n} ta mahsulot', 'list.empty.title': 'Mos mahsulot topilmadi', 'list.empty.text': 'Filtrlarni o\'zgartiring yoki detalni rasm orqali qidiring',

    'home.b1.title': 'Detalni rasmga oling — biz topamiz', 'home.b1.text': 'Shtrix-kod yoki etiketkadagi OEM raqam bo\'yicha', 'home.b1.btn': 'Kamerani ochish',
    'home.b2.title': 'Chegirmalar', 'home.b2.text': 'Filtr, moy va tormoz kolodkalariga', 'home.b2.btn': 'Ko\'rish',
    'home.b3.title': 'Shahar bo\'ylab yetkazib berish', 'home.b3.text': 'Yoki do\'kondan o\'zingiz olib keting', 'home.b3.btn': 'Batafsil',
    'home.garage.title': 'Mashinangizni tanlang', 'home.garage.sub': 'Faqat mos detallarni ko\'rsatamiz',
    'home.garage.for': 'Mashinam: {car}', 'home.garage.change': 'Mos detallar belgilanadi · o\'zgartirish',
    'home.categories': 'Kategoriyalar', 'home.forCar': '{car} uchun', 'home.sale': 'Chegirmalar', 'home.hits': 'Ko\'p sotiladi',
    'home.new': 'Yangi kelganlar', 'home.recent': 'Siz ko\'rgansiz', 'home.popular': 'Ommabop mahsulotlar', 'home.allProducts': 'Barcha mahsulotlar',
    'home.f1': 'Original va sifatli', 'home.f2': 'Rasm orqali qidiruv', 'home.f3': 'Tez yetkazish',

    'catalog.title': 'Katalog', 'catalog.byCar': 'Mashina bo\'yicha', 'catalog.otherCar': 'Boshqa', 'catalog.all': 'Barcha mahsulotlar',
    'catalog.sale': 'Chegirmadagilar', 'catalog.forCar': '{car} uchun',

    'product.save': '{sum} tejaysiz', 'product.copy': 'Nusxa olish', 'product.copied': 'Nusxa olindi', 'product.linkCopied': 'Havola nusxalandi',
    'product.sku': 'Artikul', 'product.oem': 'OEM raqam', 'product.brand': 'Brend', 'product.category': 'Kategoriya', 'product.barcode': 'Shtrix-kod', 'product.unit': 'O\'lchov',
    'product.specs': 'Xususiyatlari', 'product.fitsCars': 'Mos mashinalar',
    'product.perk1': 'Sifat kafolati', 'product.perk1.sub': 'Mos kelmasa — almashtirib beramiz',
    'product.perk2': 'Do\'kondan olib ketish', 'product.perk3': 'Yetkazib berish', 'product.perk3.sub': '{sum}dan yuqori buyurtmalarga bepul',
    'product.ask': 'Sotuvchidan so\'rash', 'product.ask.sub': 'Moslik, analog yoki narx bo\'yicha Telegram\'da yozing',
    'product.askText': 'Assalomu alaykum! Shu detal haqida so\'ramoqchiman: {name} (art. {sku})',
    'product.askStock': 'Assalomu alaykum! {name} (art. {sku}) qachon keladi?',
    'product.notify': 'Kelishini so\'rash', 'product.goCart': 'Savatga o\'tish', 'product.share': 'Ulashish',
    'product.analogs': 'Analoglar', 'product.withThis': 'Shu mashina uchun yana', 'product.notFound': 'Mahsulot topilmadi',

    'scan.title': 'Rasm orqali qidiruv', 'scan.short': 'Rasm orqali', 'scan.torch': 'Chiroq', 'scan.starting': 'Kamera yoqilmoqda…',
    'scan.mode.product': 'Mahsulot', 'scan.mode.barcode': 'Shtrix-kod', 'scan.mode.label': 'Etiketka',
    'scan.hint.product': 'Detalni ramka ichiga joylab, tugmani bosing',
    'scan.status.vision-load': 'Tanish moduli yuklanmoqda…', 'scan.status.vision': 'Detal aniqlanmoqda…',
    'scan.r.visual': 'Rasmga o\'xshash mahsulot topildi', 'scan.r.type': 'Bu — {type}', 'scan.r.unknown': 'Detalni aniqlay olmadim',
    'scan.r.unknownText': 'Detal turini tanlang yoki rasmni sotuvchiga yuboring.',
    'scan.r.whatIs': 'Bu qaysi detal? (to\'g\'ri emasini o\'zgartiring)', 'scan.r.other': 'Boshqa…',
    'scan.r.forCar': 'Qaysi mashina uchun?', 'scan.r.allCars': 'Hammasi', 'scan.r.forCarNote': '{car} uchun',
    'scan.r.inStock': 'Bizda bor: {n} xil', 'scan.r.noneInStock': 'Hozir omborda yo\'q', 'scan.r.noneForCar': '{car} uchun hozir yo\'q',
    'scan.r.askSeller': 'Sotuvchidan so\'rang — keltirib beramiz', 'scan.r.outStock': 'Tugaganlar ({n})', 'scan.r.sameType': 'Shu turdagi boshqa mahsulotlar',
    'scan.r.askText': 'Assalomu alaykum! Shu detal bormi? (rasmini yuboraman)',
    'scan.r.indexNote': 'Aniq modelni topish uchun do\'kon mahsulot rasmlari bazasi kerak. Hozircha detal turi bo\'yicha ko\'rsatildi.',
    'scan.hint.barcode': 'Shtrix-kodni ramkaga keltiring — avtomatik o\'qiladi',
    'scan.hint.label': 'OEM raqam yoki nomni ramkaga to\'g\'rilab, tugmani bosing',
    'scan.hint.photo': 'Rasm tahlil qilinmoqda…',
    'scan.gallery': 'Galereya', 'scan.pickPhoto': 'Rasm tanlash', 'scan.shoot': 'Suratga olish', 'scan.manual': 'Qo\'lda',
    'scan.status.barcode': 'Shtrix-kod qidirilmoqda…', 'scan.status.ocr-load': 'Matn o\'qish tayyorlanmoqda…', 'scan.status.ocr': 'Yozuv o\'qilmoqda…',
    'scan.found': '{n} ta mos mahsulot', 'scan.byBarcode': 'Shtrix-kod bo\'yicha topildi', 'scan.byCode': 'OEM / artikul bo\'yicha topildi', 'scan.similar': 'O\'xshash mahsulotlar', 'scan.alsoSimilar': 'Yana o\'xshashlar', 'scan.code': 'Kod: {code}',
    'scan.none.title': 'Mos detal topilmadi', 'scan.none.text': 'Etiketkani yaqinroqdan, yorug\' joyda qayta suratga oling yoki rasmni sotuvchiga yuboring.',
    'scan.ask': 'Sotuvchiga yuborish', 'scan.askText': 'Assalomu alaykum! Shu detal kerak edi: {code}', 'scan.again': 'Qayta suratga olish',
    'scan.denied': 'Kameraga ruxsat berilmadi. Galereyadan rasm tanlang yoki brauzer sozlamalarida ruxsat bering.',
    'scan.noCamera': 'Kamera topilmadi. Galereyadan rasm tanlang.',
    'scan.needHttps': 'Kamera faqat xavfsiz (https) saytda ishlaydi. Galereyadan rasm tanlang.',
    'scan.err.net': 'Matn o\'qish moduli yuklanmadi. Internetni tekshiring.', 'scan.err.generic': 'Rasmni tahlil qilib bo\'lmadi. Qayta urinib ko\'ring.',

    'checkout.title': 'Rasmiylashtirish', 'checkout.contact': 'Aloqa ma\'lumotlari', 'checkout.how': 'Qabul qilish usuli',
    'checkout.pickup': 'Do\'kondan olib ketish', 'checkout.courier': 'Yetkazib berish', 'checkout.courier.sub': 'Shahar bo\'ylab · {sum}dan bepul',
    'checkout.free': 'Bepul', 'checkout.address': 'Manzil', 'checkout.address.ph': 'Tuman, ko\'cha, uy, mo\'ljal',
    'checkout.pay': 'To\'lov usuli', 'checkout.car': 'Mashina haqida', 'checkout.note': 'Izoh',
    'checkout.note.ph': 'Masalan: Cobalt 2021, avtomat, VIN …', 'checkout.vinNote': 'Mashina modeli, yili yoki VIN raqamini yozsangiz, sotuvchi moslikni tekshirib beradi.',
    'checkout.delivery': 'Yetkazib berish', 'checkout.confirm': 'Buyurtma berish', 'checkout.agree': 'Buyurtmadan so\'ng operator siz bilan bog\'lanib, mavjudlik va narxni tasdiqlaydi.',
    'pay.cash': 'Naqd pul', 'pay.card': 'Karta orqali', 'pay.transfer': 'O\'tkazma', 'pay.onReceive': 'qabul qilganda',

    'form.name': 'Ismingiz', 'form.name.ph': 'Ism', 'form.phone': 'Telefon raqam',
    'form.err.name': 'Ismingizni kiriting', 'form.err.phone': 'Telefon raqamni to\'liq kiriting', 'form.err.address': 'Manzilni kiriting', 'form.err.check': 'Ma\'lumotlarni tekshiring',

    'order.title': 'Buyurtma', 'order.no': 'Buyurtma №{no}', 'order.thanks': 'Rahmat! Buyurtma №{no} qabul qilindi',
    'order.thanks.text': 'Operator tez orada qo\'ng\'iroq qilib, buyurtmani tasdiqlaydi.',
    'order.sendTg': 'Buyurtmani Telegram\'da yuborish', 'order.call': 'Qo\'ng\'iroq qilish',
    'order.demoNote': 'Tezroq tasdiqlash uchun buyurtmani Telegram orqali ham yuboring.',
    'order.items': 'Mahsulotlar', 'order.date': 'Sana', 'order.repeat': 'Qayta buyurtma berish', 'order.toHome': 'Bosh sahifaga',
    'order.notFound': 'Buyurtma topilmadi', 'order.tg.title': '🛒 CarOne — buyurtma №{no}',
    'status.new': 'Qabul qilindi', 'status.confirmed': 'Tasdiqlandi', 'status.ready': 'Tayyor', 'status.done': 'Topshirildi',

    'orders.title': 'Buyurtmalarim', 'orders.empty.title': 'Hali buyurtma yo\'q', 'orders.empty.text': 'Birinchi buyurtmangizni bering — u shu yerda ko\'rinadi',

    'acc.title': 'Kabinet', 'acc.welcome': 'Xush kelibsiz!', 'acc.welcome.sub': 'Buyurtmalarni kuzatish uchun kiring',
    'acc.login': 'Kirish', 'acc.localNote': 'Ma\'lumotlar faqat shu qurilmada saqlanadi', 'acc.hello': 'Xush kelibsiz, {name}!',
    'acc.edit': 'Profilni tahrirlash', 'acc.orders': 'buyurtma', 'acc.favs': 'sevimli', 'acc.cars': 'mashina',
    'acc.lang': 'Til', 'acc.contacts': 'Biz bilan bog\'lanish', 'acc.call': 'Qo\'ng\'iroq qilish', 'acc.address': 'Manzil', 'acc.hours': 'Ish vaqti',
    'acc.owner': 'Do\'kon egasi uchun', 'acc.owner.sub': 'rasm bazasi', 'acc.logout': 'Chiqish', 'acc.logoutConfirm': 'Profildan chiqilsinmi?',

    'garage.title': 'Mening garajim', 'garage.pick': 'Mashinani tanlang', 'garage.pickShort': 'Mashina', 'garage.pickTitle': 'Mashinangizni tanlang',
    'garage.mine': 'Mening mashinalarim', 'garage.year': 'Ishlab chiqarilgan yili', 'garage.skipYear': 'Bilmayman',
    'garage.selected': '{car} tanlandi', 'garage.active': 'Faol', 'garage.tapToSelect': 'tanlash uchun bosing', 'garage.none': 'tanlanmagan',
    'garage.add': 'Mashina qo\'shish', 'garage.emptyText': 'Hali mashina qo\'shilmagan.',
    'garage.why': 'Mashinangiz tanlansa, katalogda mos detallar belgilanadi va «faqat mos» filtri ishlaydi.',
  };

  const ru = {
    'common.all': 'Все', 'common.back': 'Назад', 'common.clear': 'Очистить', 'common.close': 'Закрыть',
    'common.delete': 'Удалить', 'common.open': 'Открыть', 'common.save': 'Сохранить', 'common.undo': 'Вернуть',

    'tab.home': 'Главная', 'tab.catalog': 'Каталог', 'tab.scan': 'По фото', 'tab.cart': 'Корзина', 'tab.account': 'Кабинет',

    'search.ph': 'Название, OEM или артикул…', 'search.label': 'Поиск товаров',
    'search.history': 'Вы искали', 'search.clear': 'Очистить', 'search.popular': 'Часто ищут',
    'search.allResults': 'Все результаты', 'search.nothing': 'Ничего не найдено', 'search.tryPhoto': 'Попробуйте найти по фото детали',
    'search.category': 'Категория',
    'search.empty.title': 'Ничего не найдено', 'search.empty.text': 'Измените запрос, введите OEM-номер или сфотографируйте деталь.',
    'search.ask': 'Спросить продавца (Telegram)', 'search.askText': 'Здравствуйте! Не нашёл на сайте: {q}',
    'search.byPhoto': 'Поиск по фото', 'search.byPhoto.sub': 'Сфотографируйте штрихкод или этикетку',
    'search.tips': 'Поиск понимает латиницу и кириллицу: <b>нексия фильтр</b> = <b>nexia filtr</b>. OEM-номер можно вводить с дефисом и без: <b>26300-35505</b>.',

    'badge.new': 'Новинка', 'badge.hit': 'Хит',
    'stock.in': 'В наличии', 'stock.low': 'Осталось {n} шт', 'stock.out': 'Нет в наличии',
    'fit.yes.short': 'Подходит {car}', 'fit.yes': 'Подходит для {car}', 'fit.yes.text': 'Совместимость по каталогу производителя',
    'fit.no': 'Не подходит для {car}', 'fit.no.text': 'Напишите продавцу — подберём подходящую',
    'fit.ask': 'Подойдёт к вашему авто?', 'fit.ask.text': 'Выберите автомобиль — покажем совместимость',
    'fit.universal': 'Универсальный товар', 'fit.universal.text': 'Для всех автомобилей',
    'fav.toggle': 'Избранное', 'fav.added': 'Добавлено в избранное', 'fav.removed': 'Удалено из избранного',
    'fav.title': 'Избранное', 'fav.empty.title': 'В избранном пусто', 'fav.empty.text': 'Сохраняйте понравившиеся товары значком ♡',
    'unit.dona': 'шт',

    'cart.add': 'В корзину', 'cart.addShort': 'В корзину', 'cart.added': 'Добавлено в корзину', 'cart.go': 'Перейти',
    'cart.title': 'Корзина', 'cart.items': '{n} шт', 'cart.discount': 'Скидка', 'cart.total': 'Итого',
    'cart.summary': 'Ваш заказ', 'cart.checkout': 'Оформить', 'cart.clear': 'Очистить корзину',
    'cart.clearConfirm': 'Удалить все товары из корзины?', 'cart.remove': 'Удалить', 'cart.removed': 'Удалено из корзины',
    'cart.empty.title': 'Корзина пока пуста', 'cart.empty.text': 'Найдите нужную деталь через поиск, каталог или камеру',
    'cart.toCatalog': 'Перейти в каталог', 'cart.maxStock': 'В наличии только {n} шт',
    'cart.freeLeft': 'До бесплатной доставки ещё {sum}', 'cart.freeOk': '✓ Доставка бесплатно',

    'filter.title': 'Фильтр', 'filter.inStock': 'В наличии', 'filter.sale': 'Скидки', 'filter.fitMyCar': 'Только для {car}',
    'filter.price': 'Цена', 'filter.from': 'от', 'filter.to': 'до', 'filter.brand': 'Бренд',
    'filter.reset': 'Сбросить', 'filter.apply': 'Показать',
    'sort.title': 'Сортировка', 'sort.rel': 'По релевантности', 'sort.pop': 'Популярные', 'sort.cheap': 'Дешевле', 'sort.exp': 'Дороже', 'sort.new': 'Новинки', 'sort.sale': 'По скидке',
    'list.count': '{n} товаров', 'list.empty.title': 'Подходящих товаров нет', 'list.empty.text': 'Измените фильтры или найдите деталь по фото',

    'home.b1.title': 'Сфотографируйте деталь — мы найдём', 'home.b1.text': 'По штрихкоду или OEM-номеру на этикетке', 'home.b1.btn': 'Открыть камеру',
    'home.b2.title': 'Скидки', 'home.b2.text': 'На фильтры, масла и тормозные колодки', 'home.b2.btn': 'Смотреть',
    'home.b3.title': 'Доставка по городу', 'home.b3.text': 'Или самовывоз из магазина', 'home.b3.btn': 'Подробнее',
    'home.garage.title': 'Выберите автомобиль', 'home.garage.sub': 'Покажем только подходящие детали',
    'home.garage.for': 'Моё авто: {car}', 'home.garage.change': 'Подходящие детали отмечены · изменить',
    'home.categories': 'Категории', 'home.forCar': 'Для {car}', 'home.sale': 'Скидки', 'home.hits': 'Хиты продаж',
    'home.new': 'Новые поступления', 'home.recent': 'Вы смотрели', 'home.popular': 'Популярные товары', 'home.allProducts': 'Все товары',
    'home.f1': 'Оригинал и качество', 'home.f2': 'Поиск по фото', 'home.f3': 'Быстрая доставка',

    'catalog.title': 'Каталог', 'catalog.byCar': 'По автомобилю', 'catalog.otherCar': 'Другой', 'catalog.all': 'Все товары',
    'catalog.sale': 'Со скидкой', 'catalog.forCar': 'Для {car}',

    'product.save': 'Экономия {sum}', 'product.copy': 'Копировать', 'product.copied': 'Скопировано', 'product.linkCopied': 'Ссылка скопирована',
    'product.sku': 'Артикул', 'product.oem': 'OEM-номер', 'product.brand': 'Бренд', 'product.category': 'Категория', 'product.barcode': 'Штрихкод', 'product.unit': 'Ед. изм.',
    'product.specs': 'Характеристики', 'product.fitsCars': 'Подходит для',
    'product.perk1': 'Гарантия качества', 'product.perk1.sub': 'Не подошло — обменяем',
    'product.perk2': 'Самовывоз из магазина', 'product.perk3': 'Доставка', 'product.perk3.sub': 'Бесплатно при заказе от {sum}',
    'product.ask': 'Спросить продавца', 'product.ask.sub': 'О совместимости, аналогах или цене — в Telegram',
    'product.askText': 'Здравствуйте! Хочу уточнить по детали: {name} (арт. {sku})',
    'product.askStock': 'Здравствуйте! Когда будет {name} (арт. {sku})?',
    'product.notify': 'Узнать о поступлении', 'product.goCart': 'В корзину', 'product.share': 'Поделиться',
    'product.analogs': 'Аналоги', 'product.withThis': 'Ещё для этого авто', 'product.notFound': 'Товар не найден',

    'scan.title': 'Поиск по фото', 'scan.short': 'По фото', 'scan.torch': 'Фонарик', 'scan.starting': 'Включаем камеру…',
    'scan.mode.product': 'Товар', 'scan.mode.barcode': 'Штрихкод', 'scan.mode.label': 'Этикетка',
    'scan.hint.product': 'Поместите деталь в рамку и нажмите кнопку',
    'scan.status.vision-load': 'Загружаем распознавание…', 'scan.status.vision': 'Определяем деталь…',
    'scan.r.visual': 'Найден похожий товар', 'scan.r.type': 'Это — {type}', 'scan.r.unknown': 'Не удалось определить деталь',
    'scan.r.unknownText': 'Выберите тип детали или отправьте фото продавцу.',
    'scan.r.whatIs': 'Что это за деталь? (исправьте, если неверно)', 'scan.r.other': 'Другое…',
    'scan.r.forCar': 'Для какого автомобиля?', 'scan.r.allCars': 'Все', 'scan.r.forCarNote': 'для {car}',
    'scan.r.inStock': 'В наличии: {n} вид.', 'scan.r.noneInStock': 'Сейчас нет в наличии', 'scan.r.noneForCar': 'Для {car} сейчас нет',
    'scan.r.askSeller': 'Спросите продавца — привезём', 'scan.r.outStock': 'Нет в наличии ({n})', 'scan.r.sameType': 'Другие товары этого типа',
    'scan.r.askText': 'Здравствуйте! Есть такая деталь? (отправлю фото)',
    'scan.r.indexNote': 'Чтобы находить точную модель, нужна база фото товаров магазина. Пока показано по типу детали.',
    'scan.hint.barcode': 'Наведите рамку на штрихкод — считается автоматически',
    'scan.hint.label': 'Наведите на OEM-номер или название и нажмите кнопку',
    'scan.hint.photo': 'Анализируем фото…',
    'scan.gallery': 'Галерея', 'scan.pickPhoto': 'Выбрать фото', 'scan.shoot': 'Сфотографировать', 'scan.manual': 'Вручную',
    'scan.status.barcode': 'Ищем штрихкод…', 'scan.status.ocr-load': 'Готовим распознавание…', 'scan.status.ocr': 'Читаем надпись…',
    'scan.found': 'Найдено: {n}', 'scan.byBarcode': 'Найдено по штрихкоду', 'scan.byCode': 'Найдено по OEM / артикулу', 'scan.similar': 'Похожие товары', 'scan.alsoSimilar': 'Ещё похожие', 'scan.code': 'Код: {code}',
    'scan.none.title': 'Деталь не найдена', 'scan.none.text': 'Сфотографируйте этикетку ближе и при хорошем свете или отправьте фото продавцу.',
    'scan.ask': 'Отправить продавцу', 'scan.askText': 'Здравствуйте! Нужна деталь: {code}', 'scan.again': 'Снять заново',
    'scan.denied': 'Нет доступа к камере. Выберите фото из галереи или разрешите доступ в настройках браузера.',
    'scan.noCamera': 'Камера не найдена. Выберите фото из галереи.',
    'scan.needHttps': 'Камера работает только на защищённом (https) сайте. Выберите фото из галереи.',
    'scan.err.net': 'Не удалось загрузить распознавание. Проверьте интернет.', 'scan.err.generic': 'Не удалось обработать фото. Попробуйте ещё раз.',

    'checkout.title': 'Оформление', 'checkout.contact': 'Контактные данные', 'checkout.how': 'Способ получения',
    'checkout.pickup': 'Самовывоз из магазина', 'checkout.courier': 'Доставка', 'checkout.courier.sub': 'По городу · бесплатно от {sum}',
    'checkout.free': 'Бесплатно', 'checkout.address': 'Адрес', 'checkout.address.ph': 'Район, улица, дом, ориентир',
    'checkout.pay': 'Оплата', 'checkout.car': 'Об автомобиле', 'checkout.note': 'Комментарий',
    'checkout.note.ph': 'Например: Cobalt 2021, автомат, VIN …', 'checkout.vinNote': 'Укажите модель, год или VIN — продавец проверит совместимость.',
    'checkout.delivery': 'Доставка', 'checkout.confirm': 'Оформить заказ', 'checkout.agree': 'После заказа оператор свяжется с вами и подтвердит наличие и цену.',
    'pay.cash': 'Наличные', 'pay.card': 'Картой', 'pay.transfer': 'Перевод', 'pay.onReceive': 'при получении',

    'form.name': 'Ваше имя', 'form.name.ph': 'Имя', 'form.phone': 'Номер телефона',
    'form.err.name': 'Введите имя', 'form.err.phone': 'Введите номер полностью', 'form.err.address': 'Введите адрес', 'form.err.check': 'Проверьте данные',

    'order.title': 'Заказ', 'order.no': 'Заказ №{no}', 'order.thanks': 'Спасибо! Заказ №{no} принят',
    'order.thanks.text': 'Оператор скоро позвонит и подтвердит заказ.',
    'order.sendTg': 'Отправить заказ в Telegram', 'order.call': 'Позвонить',
    'order.demoNote': 'Для быстрого подтверждения отправьте заказ также в Telegram.',
    'order.items': 'Товары', 'order.date': 'Дата', 'order.repeat': 'Повторить заказ', 'order.toHome': 'На главную',
    'order.notFound': 'Заказ не найден', 'order.tg.title': '🛒 CarOne — заказ №{no}',
    'status.new': 'Принят', 'status.confirmed': 'Подтверждён', 'status.ready': 'Готов', 'status.done': 'Выдан',

    'orders.title': 'Мои заказы', 'orders.empty.title': 'Заказов пока нет', 'orders.empty.text': 'Оформите первый заказ — он появится здесь',

    'acc.title': 'Кабинет', 'acc.welcome': 'Добро пожаловать!', 'acc.welcome.sub': 'Войдите, чтобы отслеживать заказы',
    'acc.login': 'Войти', 'acc.localNote': 'Данные хранятся только на этом устройстве', 'acc.hello': 'Добро пожаловать, {name}!',
    'acc.edit': 'Редактировать профиль', 'acc.orders': 'заказов', 'acc.favs': 'в избранном', 'acc.cars': 'авто',
    'acc.lang': 'Язык', 'acc.contacts': 'Связаться с нами', 'acc.call': 'Позвонить', 'acc.address': 'Адрес', 'acc.hours': 'Время работы',
    'acc.owner': 'Для владельца', 'acc.owner.sub': 'база фото', 'acc.logout': 'Выйти', 'acc.logoutConfirm': 'Выйти из профиля?',

    'garage.title': 'Мой гараж', 'garage.pick': 'Выберите авто', 'garage.pickShort': 'Авто', 'garage.pickTitle': 'Выберите автомобиль',
    'garage.mine': 'Мои автомобили', 'garage.year': 'Год выпуска', 'garage.skipYear': 'Не знаю',
    'garage.selected': 'Выбран {car}', 'garage.active': 'Активный', 'garage.tapToSelect': 'нажмите, чтобы выбрать', 'garage.none': 'не выбран',
    'garage.add': 'Добавить автомобиль', 'garage.emptyText': 'Автомобили ещё не добавлены.',
    'garage.why': 'Когда автомобиль выбран, подходящие детали отмечаются в каталоге и работает фильтр «только подходящие».',
  };

  const dict = { uz, ru };
  let lang = 'uz';
  const subs = [];

  const i18n = {
    dict,
    init() {
      const saved = window.CO.store.state.lang;
      const nav = (navigator.language || '').toLowerCase();
      lang = saved || (nav.startsWith('ru') ? 'ru' : window.CO.config.defaultLang || 'uz');
      document.documentElement.lang = lang;
    },
    lang: () => lang,
    set(l) {
      if (!dict[l] || l === lang) return;
      lang = l; document.documentElement.lang = l;
      window.CO.store.set('lang', l);
      subs.forEach((fn) => fn(l));
    },
    onChange(fn) { subs.push(fn); },
    t(key, vars) {
      let s = dict[lang][key] ?? dict.uz[key];
      if (s == null) { console.warn('[i18n] yo\'q:', key); return key; }
      if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
      return s;
    },
    pick(obj) { return obj == null ? '' : typeof obj === 'string' ? obj : (obj[lang] ?? obj.uz ?? Object.values(obj)[0]); },
  };

  window.CO = window.CO || {};
  window.CO.i18n = i18n;
})();
