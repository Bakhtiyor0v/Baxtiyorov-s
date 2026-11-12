# Moy almashtirish (zamena) tizimi

Do'kon kompyuterida ishlaydigan kichik server + planshet va kassa uchun brauzer ilovasi.
Internet shart emas — planshet va kompyuter **bir Wi-Fi** tarmog'ida bo'lsa yetarli.

## Telefon / planshetga ilova qilib o'rnatish
`static/app.html` — o'rnatiladigan ilova (PWA). Hozircha **demo rejimda**: serversiz ishlaydi, ma'lumotlar shu qurilmada.

1. Telefonda oching: **https://bakhtiyor0v.github.io/Baxtiyorov-s/**
2. **Android (Chrome):** «📲 O'rnatish» tugmasi yoki ⋮ → «Установить приложение».
   **iPhone (Safari):** Ulashish ⬆ → «На экран „Домой“».

Sayt GitHub Pages orqali `claude/salom-cloud-zwyzx3` branchidan chiqadi.

**Yangilanish avtomatik:** o'zgarish GitHub'ga push qilingach, ilova keyingi ochilishda (internet bo'lsa)
yangi versiyani o'zi oladi. Qayta o'rnatish shart emas. Internet bo'lmasa oxirgi versiya ochiladi.

Kompyuterda serversiz sinash: `static/app.html` ni ikki marta bosib oching.

## Ishga tushirish
1. Kompyuterga [Python 3](https://www.python.org/downloads/) o'rnating (o'rnatishda **"Add Python to PATH"** belgilang).
2. `ishga-tushirish.bat` ni ikki marta bosing (Linux/Mac: `python3 server.py`).
3. Oynada manzillar chiqadi:
   - **Kassa (shu kompyuter):** `http://localhost:8090/kassa`
   - **Planshet:** `http://<kompyuter-IP>:8090/planshet` — planshet brauzerida oching va "Bosh ekranga qo'shish" qiling.

Ma'lumotlar `data/zamena.db` faylida. **Zaxira nusxa** — shu faylni vaqti-vaqti bilan flesh/Telegram'ga nusxalang.

## Jarayon
| Kim | Qayerda | Nima qiladi |
|---|---|---|
| Zamena sotuvchisi | Planshet | **Mijoz kiritish** → raqam katta ekran klaviaturasida (`75 400 NAA`, `01 A 123 BC`) → bazada bo'lmasa: mashina nomi, **A/T yoki M/T**, rangi, **telefon (majburiy)** `+998 88 226 15 00`, ismi → probeg, **usta (majburiy)**, moy + litr, filtrlar → **«Almashtirilmoqda»** |
| Kassir | Do'kon PC → Navbat | Mashina darhol navbatda chiqadi (ovoz bilan). Summani aytadi, kerak bo'lsa mahsulot qo'shadi/bonus qiladi, chegirma, keshbekdan to'lash, naqd/karta → **To'landi** |
| Rahbar | PC → Hisobot / Oylik | Foyda, KPI, oylik, inventarizatsiya |

Planshetda faqat 2 bo'lim bor: **Mijoz kiritish** va **Bugungi tarix**. Mijoz (telefon) kiritilmasa zamena qilib bo'lmaydi.
Kim ishlayotgani (zamena sotuvchisi) planshetda bir marta tanlanadi va eslab qolinadi.

### Filtrlar mashinaga qarab
- Kassa → Ombor → filtrni oching → **Turi** (moy / havo / salon / yoqilg'i) va **qaysi mashinalarga mos**ligini belgilang.
- Planshetda «Moy filtri» tugmasi bosilganda shu mashinaga mos filtr avtomatik qo'shiladi. 3 marta bosilsa — 3 ta.
- Mos filtr belgilanmagan mashina (masalan, xitoy mashinalari — o'zimizning filtrni kesib qo'yamiz): sotuvchi istalgan filtrni tanlaydi, «keyingi safar avtomatik qo'shilsin» belgisi bilan tizim uni shu model uchun eslab qoladi.

## Pul hisobi
- **Xizmat haqi** odatda 0 — foyda mahsulotdan.
- **Bonus**: tekin berilgan narsa (salfetka, ochistitel…) «Bonus» belgisi bilan yoziladi — narxi 0, tannarxi foydadan ayriladi.
- Hisobotda: **moy foydasi**, **filtrlar foyda/zarari**, **bonus tannarxi** alohida ko'rinadi va «moy foydasi filtr zarari + bonuslarni qoplaydimi» qatori bor.
- **Sof foyda** = yalpi foyda − KPI − asosiy oylik − xarajatlar (ijara, svet…).
- **Keshbek**: to'langan summadan % (Sozlamalar). Mijoz telefon bo'yicha aniqlanadi, keyingi safar kassada keshbekdan to'lashi mumkin.

## KPI va oylik
- Usta: har bir mashina uchun X so'm + zakaz foydasidan Y% (Sozlamalar).
- Zamena sotuvchisi: har mashina uchun + %; kassir: o'zi yopgan savdo foydasidan %.
- Faqat **to'langan** zakazlar hisoblanadi.
- «Oylik / KPI» bo'limida **1–15** va **16–oxiri** davrlari: KPI + asosiy maoshning yarmi, «To'lash» tugmasi to'lovni yozib qo'yadi.

## Ombor va inventarizatsiya
- Mahsulot: tannarx, sotuv narxi, qoldiq. Moy — litrda (quyma).
- **Prixod**: kirim, tannarx o'rtacha usulda yangilanadi.
- **Inventarizatsiya** (oyda 1 marta): tizimdagi qoldiq ko'rinadi, sanalganini yozasiz → kamomad/ortiqcha summasi → yakunlaganda qoldiq to'g'rilanadi.

## Xavfsizlik
Sozlamalarda **rahbar PIN** qo'ying — Hisobot, Oylik, Xodimlar, Sozlamalar shu PIN bilan ochiladi.

## Fayllar
```
server.py            — server va baza (faqat Python standart kutubxonasi)
static/index.html    — sahifa
static/app.js        — planshet + kassa interfeysi
static/app.css       — dizayn
ishga-tushirish.bat  — Windows uchun ishga tushirish
```
