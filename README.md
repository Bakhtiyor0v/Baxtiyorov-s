# CarOne — mijozlar uchun onlayn do'kon

Koreys avtomobillari (Chevrolet/Daewoo, Kia, Hyundai) ehtiyot qismlari uchun
minimalist, mobilga moslangan sotuv sahifasi. Och ko'k rang, pastki menyu.

## Imkoniyatlar

| Bo'lim | Nima qiladi |
|---|---|
| **Bosh sahifa** | Banner, mashina tanlash (Nexia, Cobalt, Lacetti…), kategoriyalar, ommabop mahsulotlar |
| **Katalog** | Kategoriya va mashina bo'yicha filtr, narx bo'yicha saralash |
| **Rasm orqali** | Kamera: shtrix-kod avtomatik o'qiladi; etiketka rasmidan artikul/OEM raqam o'qiladi (OCR) va katalogdan topiladi. Galereyadan rasm tanlash ham mumkin |
| **Savat** | Miqdor, jami summa, buyurtma formasi (do'kondan olish / yetkazib berish), Telegram'ga yuborish |
| **Kabinet** | Ism/telefon/mashina, buyurtmalar tarixi, sevimlilar, aloqa |

### Qidiruv
Yuqoridagi qidiruv maydoni yozish bilan birga taklif beradi va:
- lotin va kirillni tushunadi (`нексия фильтр` = `nexia filtr`);
- rus/o'zbek sinonimlari (`масло` = `moy`, `воздушный` = `havo`, `колодка`…);
- artikul, OEM raqam, shtrix-kod bo'yicha (`26300-35505` yoki `2630035505`);
- 1 harflik xatolarni kechiradi (`akumulyator`, `kobalt`, `lasetti`).

## Ishga tushirish

Hech qanday build kerak emas — oddiy statik fayllar.

```bash
python3 -m http.server 8080
# http://localhost:8080
```

> Kamera faqat **HTTPS** (yoki localhost) da ishlaydi. Joylash uchun GitHub Pages,
> Netlify yoki Cloudflare Pages mos (bepul, HTTPS bilan).

## Sozlash

- `js/data.js` → `shop` — telefon, Telegram username, manzil (hozir namunaviy, **almashtiring**).
- `js/data.js` → `raw` — mahsulotlar. Hozir Bito CarOne'dagi nomlar asosida **namunaviy narxlar** bilan.
- Ranglar: `css/style.css` boshidagi `--primary` va boshqa o'zgaruvchilar.

## Keyingi qadamlar
1. Bito CarOne'dan mahsulot, narx va qoldiqni avtomatik eksport (kichik backend yoki jadval bo'yicha skript → `data.js`/JSON).
2. Buyurtmani to'g'ridan-to'g'ri Bito'ga `sale_order` sifatida yuborish (backend orqali, API kaliti brauzerda saqlanmasligi kerak).
3. Mahsulot rasmlari.
4. SMS orqali kirish (hozir kabinet ma'lumotlari faqat qurilmada saqlanadi).

## Fayllar
```
index.html            — sahifa karkasi, pastki menyu
css/style.css         — dizayn
js/data.js            — katalog va do'kon ma'lumotlari
js/search.js          — aqlli qidiruv
js/scan.js            — kamera, shtrix-kod, OCR (Tesseract.js CDN'dan)
js/app.js             — sahifalar, savat, kabinet, router
sw.js, manifest       — telefonga "ilova" sifatida o'rnatish va offline kesh
```
