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
| Zamena sotuvchisi | Planshet | Raqam → mijoz/mashina → probeg, usta, moy, litr, filtrlar → **Kassaga o'tkazish** |
| Kassir | Do'kon PC → Navbat | Mashina darhol navbatda chiqadi (ovoz bilan). Summani aytadi, chegirma, keshbek, naqd/karta → **To'landi** |
| Rahbar | PC → Hisobot / Oylik | Foyda, KPI, oylik, inventarizatsiya, sozlamalar |

## Kirish (login) va rollar
Planshet ham, kassa ham **login va parol** bilan ochiladi (bir vaqtda 2–3 kishi ishlashi mumkin). Chap burchakda kim kirgani ko'rinadi.

| Rol | Nima qila oladi |
|---|---|
| Zamena sotuvchisi | Planshet: jarayondagi mashinalar va yangi sotuv. **Mijozlar ro'yxatini ko'ra olmaydi** — faqat raqami terilgan bitta mashina chiqadi (bazani o'g'irlashdan himoya) |
| Kassir | Kassa: navbat, to'lov, sotuv, ombor, mijozlar, inventarizatsiya |
| Rahbar | Hammasi: hisobot, oylik/KPI, xodimlar (login-parol berish), sozlamalar |

Birinchi kirish: **admin / 1234** — darhol Xodimlar bo'limida parolni almashtiring va sotuvchi/kassirga login bering.
Ustalar tizimga kirmaydi — sotuvchi ularni planshetda belgilaydi. Sotuvchi KPI'si o'zi kiritgan mashinalar bo'yicha hisoblanadi.

## Planshet jarayoni
1. Asosiy ekran — **Jarayonda**: hozir ishlanayotgan mashinalar (Tayyor / Tahrirlash).
2. **＋ Yangi sotuv** → raqam: `01 A 123 BC` yoki `01 123 ABC`. Boshqa format xato beradi; chet el mashinasi uchun **Istisno**.
3. Mashina bazada bo'lsa — mijoz ma'lumoti va **moy almashtirish tarixi** (sana, km, qaysi moy, necha litr, filtrlar).
   Bo'lmasa — mashina nomi, A/T yoki M/T, rangi, telefon (majburiy).
4. **Motor moyi** bosiladi → chapda yopishqoqlik (10W-40, 5W-30…) → o'sha turdagi moylar rasmi bilan.
5. Litr: 2.5 / 3 / 3.5 / 4 yoki qo'lda.
6. Filtrlar mashina turiga qarab: **Chevrolet** — moy, havo, salon; **Xitoy** — moy, salon, havo, reduktor; **Damas/Labo** — moy, havo.
   Chevrolet/Damas uchun faqat shu modelga mos filtrlar (2–3 firma) chiqadi; xitoy mashinalarida qo'lda tanlanadi.
7. **Kassaga o'tkazish.**

Kassa → Ombor → moyni oching: **rasm yuklash**, yopishqoqlik va **«shu moy bilan tekin filtr»** (bonus) belgilanadi.
Kassa → Sozlamalar → **Mashina turlari**: har bir model Chevrolet / Xitoy / Damas / Boshqa.

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
- Har bir xodim o'z login-paroli bilan kiradi; parollar bazada shifrlangan (tuzli SHA-256) holda saqlanadi.
- 5 marta noto'g'ri parol — 5 daqiqa kutish.
- Planshet (sotuvchi) mijozlar ro'yxatini, telefon raqamlarini (jarayondagi ro'yxatda), hisobotlarni ocha olmaydi;
  raqam bo'yicha qidiruv ham cheklangan (10 daqiqada 60 ta).

## Fayllar
```
server.py            — server va baza (faqat Python standart kutubxonasi)
static/index.html    — sahifa
static/app.js        — planshet + kassa interfeysi
static/app.css       — dizayn
ishga-tushirish.bat  — Windows uchun ishga tushirish
```
