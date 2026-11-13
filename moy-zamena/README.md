# Zamena — moy almashtirish va kassa tizimi

Planshet (zamena sotuvchisi) + kassa (do'kon kompyuteri, Bito uslubidagi panel va POS) + rahbar hisobotlari.
**Bitta kirish:** kim login-parolini tersa, o'ziga mos bo'limga o'tadi.

## Sinab ko'rish (serversiz demo)
**https://bakhtiyor0v.github.io/Baxtiyorov-s/** — telefon, planshet yoki kompyuterda oching.

| Login / parol | Kim | Qayerga kiradi |
|---|---|---|
| `sotuvchi` / `1111` | Zamena sotuvchisi | Planshet: jarayondagi mashinalar, yangi sotuv |
| `kassir` / `2222` | Kassir | Kassa paneli + POS |
| `admin` / `1234` | Rahbar | Hammasi: hisobot (foyda), oylik/KPI, xodimlar, sozlamalar |

Demo'da ma'lumotlar faqat shu brauzerda saqlanadi («Tozalash» — boshidan boshlash). Sayt GitHub Pages orqali
`claude/salom-cloud-zwyzx3` branchidan chiqadi. O'rnatilgan ilova (📲 O'rnatish) o'zi yangilanadi.

## Do'konda ishga tushirish (haqiqiy server)
1. Kompyuterga [Python 3](https://www.python.org/downloads/) o'rnating (**"Add Python to PATH"** belgilang).
2. `ishga-tushirish.bat` ni ikki marta bosing (Linux/Mac: `python3 server.py`).
3. Oynada chiqqan manzilni oching: kompyuterda `http://localhost:8090`, planshetda `http://<kompyuter-IP>:8090`.
4. Birinchi kirish: **admin / 1234** → Xodimlar bo'limida parolni almashtiring, sotuvchi va kassirga login bering.

Ma'lumotlar `data/zamena.db` faylida — **zaxira nusxasini** vaqti-vaqti bilan oling.

## Kassa paneli (chap menyu)
| Bo'lim | Nima bor |
|---|---|
| **POS — Sotuv** | To'liq ekran. Chapda 2 bo'lim: **Sotuv** (mahsulotlar, qidiruv/shtrix-kod, kategoriyalar, savat) va **Zamena** (planshetdan «Kassaga o'tkazish» qilingan mashinalar — tanlansa savatga tushadi). Mijoz tanlash/qo'shish (F3), chegirma, to'lov (F9) |
| To'lov oynasi | **Naqd F6 · Terminal F7 · Kartadan o'tkazma F8 · Qarzga F10**, keshbekdan to'lash, bir nechta usul birga, qaytim hisobi, chek chiqarish |
| Bosh sahifa | Bugungi tushum, cheklar, o'rtacha chek, jarayondagi zamena, smena, qarzlar |
| Cheklar | Barcha cheklar: qidiruv (№, mashina raqami, mijoz), turi, kassir; chekni ko'rish, chop etish, **qaytarish** (qisman ham) |
| Mijozlar | Ro'yxat, qarzdorlar filtri, yangi mijoz; kartochka: xaridlar, **qarzni to'lash**, keshbek va qarz tarixi |
| Xaridlar | Yangi xarid: yetkazib beruvchi, mahsulotlar, kelish va sotuv narxi, chegirma, qisman to'lov → qolgani **qarzga** |
| Yetkazib beruvchilar | Balans (qarzimiz), **pul berish / pul olish**, xaridlar va harakatlar tarixi |
| Ombor / Inventarizatsiya | Mahsulotlar (moy rasmi, yopishqoqlik, bonus filtr, mos mashinalar), harakatlar, oylik inventarizatsiya |
| Kassa | **Smena** ochish/yopish (Z-hisobot, sanalgan pul va farq), **kirim / chiqim (xarajat)** turlari bilan, harakatlar, smenalar tarixi |
| Hisobotlar | Umumiy (kunlik tushum grafigi, to'lov usullari, kassirlar), mahsulotlar, qarzlar; rahbarga **Foyda** (moy/filtr/bonus, KPI, sof foyda) |
| Oylik / KPI · Xodimlar · Sozlamalar | Faqat rahbar |

Xarajat turlari Bito'dagidek: Ijara, Kommunal, Elektr, Gaz, Telefon, Reklama, Yo'lkira, Ish haqi, Avans, Usta puli, Inkassatsiya…
Sotuv uchun smena ochiq bo'lishi shart.

## Planshet (zamena sotuvchisi)
1. Asosiy ekran — **Jarayonda**; **＋ Yangi sotuv** → raqam (`01 A 123 BC` / `01 123 ABC`, chet el uchun **Istisno**).
2. Mashina bazada bo'lsa — mijoz va moy almashtirish tarixi; bo'lmasa — nomi, A/T–M/T, rangi, telefon (majburiy).
3. Probeg, usta, **motor moyi** (yopishqoqlik → rasmli moylar), litr (2.5/3/3.5/4 yoki qo'lda),
   filtrlar mashina turiga qarab (Chevrolet: moy, havo, salon · Xitoy: + reduktor · Damas: moy, havo).
4. **Kassaga o'tkazish** → kassada POS → Zamena bo'limida paydo bo'ladi (ovoz bilan).

## Rollar va xavfsizlik
- Sotuvchi mijozlar ro'yxatini, telefonlarni, hisobotlarni ko'ra olmaydi — faqat raqami terilgan bitta mashina (bazani o'g'irlashdan himoya); raqam qidiruvi cheklangan.
- Kassir foydani ko'rmaydi; hisobotlarda faqat savdo.
- Parollar tuzli SHA-256; 5 marta noto'g'ri — 5 daqiqa kutish.

## Pul hisobi
- **Bonus** (tekin) — narxi 0, tannarxi foydadan ayriladi. Moyga bog'langan bonus filtr avtomatik tekin bo'ladi.
- **Keshbek** — to'langan (qarzga emas) summadan %. **Qarzga sotish** faqat tanlangan mijozga.
- **Qaytarish** — mahsulot omborga qaytadi, pul tanlangan usulda (yoki mijoz qarzidan), keshbek ulushi qaytariladi.
- **Sof foyda** = yalpi foyda − KPI − asosiy oylik − xarajatlar (ish haqi turlari oylikda alohida hisoblanadi).

## Fayllar
```
server.py            — server va baza (faqat Python standart kutubxonasi + SQLite)
static/index.html    — server rejimidagi sahifa
static/app.html      — o'rnatiladigan ilova (demo rejim, GitHub Pages)
static/app.js        — umumiy qism, kirish, planshet
static/kassa.js      — kassa paneli, POS, hisobotlar
static/demo.js       — serversiz demo (server.py qoidalarining brauzerdagi nusxasi)
static/app.css       — dizayn
ishga-tushirish.bat  — Windows uchun ishga tushirish
```
