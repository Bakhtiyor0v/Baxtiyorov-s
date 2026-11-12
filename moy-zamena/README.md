# Moy almashtirish (zamena) tizimi

Do'kon kompyuterida ishlaydigan kichik server + planshet va kassa uchun brauzer ilovasi.
Internet shart emas — planshet va kompyuter **bir Wi-Fi** tarmog'ida bo'lsa yetarli.

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
| Zamena sotuvchisi | Planshet | Raqamni kiritadi → bazada bo'lmasa model/ism/telefon bilan qo'shiladi → mijoz tanlagan moy, probeg, **usta (majburiy)**, quyilgan va to'kib olingan litr, nimalar almashtirilgani → **«Almashtirilmoqda»** |
| Kassir | Do'kon PC → Navbat | Mashina darhol navbatda chiqadi (ovoz bilan). Summani aytadi, kerak bo'lsa mahsulot qo'shadi/bonus qiladi, chegirma, keshbekdan to'lash, naqd/karta → **To'landi** |
| Rahbar | PC → Hisobot / Oylik | Foyda, KPI, oylik, inventarizatsiya |

Planshet bosh sahifasida: bugun nechta mashina, quyilgan litr, **ustalar reytingi** (bugun va shu oy).

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
