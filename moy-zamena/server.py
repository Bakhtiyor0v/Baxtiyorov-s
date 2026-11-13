#!/usr/bin/env python3
"""Moy almashtirish (zamena) tizimi — server.

Do'kondagi kompyuterda ishga tushiriladi. Planshet va kassa kompyuteri
bir Wi-Fi tarmog'ida brauzer orqali ulanadi:
    http://<kompyuter-IP>:8090/planshet
    http://<kompyuter-IP>:8090/kassa

Faqat Python standart kutubxonasi ishlatiladi (o'rnatish shart emas).
Ma'lumotlar bazasi: data/zamena.db (SQLite).
"""
import base64
import hashlib
import json
import os
import secrets
import time
import re
import sqlite3
import sys
import threading
import calendar
from datetime import datetime, date, timedelta
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

BASE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(BASE, "static")
DB_PATH = os.environ.get("ZAMENA_DB", os.path.join(BASE, "data", "zamena.db"))
PORT = int(os.environ.get("ZAMENA_PORT", "8090"))

LOCK = threading.RLock()
VERSION = {"v": 1}

DEFAULT_SETTINGS = {
    "shop_name": "CarOne Moy almashtirish",
    "cashback_percent": "2",          # to'langan summadan % keshbek
    "cashback_on_bonus": "0",
    "master_kpi_per_car": "15000",    # usta: har bir mashina uchun so'm
    "master_kpi_percent": "0",        # usta: zakaz foydasidan %
    "seller_kpi_per_car": "5000",     # zamena sotuvchisi: har mashina uchun
    "seller_kpi_percent": "0",
    "cashier_kpi_percent": "0",       # kassir: o'zi yopgan savdo foydasidan %
    "next_service_km": "8000",        # keyingi almashtirishgacha km
}

# Mashina guruhi bo'yicha planshetda chiqadigan filtrlar
GROUP_FILTERS = {
    "chevrolet": ["moy", "havo", "salon"],
    "xitoy": ["moy", "salon", "havo", "reduktor"],
    "damas": ["moy", "havo"],
    "boshqa": ["moy", "havo", "salon"],
}
FILTER_KINDS = ("moy", "havo", "salon", "reduktor", "yoqilgi")
ROLES = ("usta", "sotuvchi", "kassir", "admin")
# O'zbekiston raqami: 01 A 123 BC yoki 01 123 ABC
PLATE_OK = re.compile(r"\d{2}[A-Z]\d{3}[A-Z]{2}|\d{5}[A-Z]{3}")

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS employees(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL,
  phone TEXT DEFAULT '', base_salary INTEGER DEFAULT 0, active INTEGER DEFAULT 1,
  login TEXT, pass_hash TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, employee_id INTEGER NOT NULL, created_at TEXT);
CREATE TABLE IF NOT EXISTS customers(
  id INTEGER PRIMARY KEY, name TEXT DEFAULT '', phone TEXT DEFAULT '',
  cashback INTEGER DEFAULT 0, note TEXT DEFAULT '', created_at TEXT);
CREATE TABLE IF NOT EXISTS cars(
  id INTEGER PRIMARY KEY, plate TEXT UNIQUE NOT NULL, model TEXT DEFAULT '',
  customer_id INTEGER, last_mileage INTEGER DEFAULT 0, created_at TEXT,
  transmission TEXT DEFAULT '', color TEXT DEFAULT '', plate_exception INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
  unit TEXT DEFAULT 'dona', cost REAL DEFAULT 0, price INTEGER DEFAULT 0,
  stock REAL DEFAULT 0, barcode TEXT DEFAULT '', active INTEGER DEFAULT 1, kind TEXT DEFAULT '',
  grade TEXT DEFAULT '', bonus_kinds TEXT DEFAULT '', image TEXT, image_v INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS car_models(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, sort INTEGER DEFAULT 100,
  grp TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS product_models(product_id INTEGER NOT NULL, model TEXT NOT NULL, PRIMARY KEY(product_id, model));
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY, type TEXT NOT NULL, car_id INTEGER, customer_id INTEGER,
  mileage INTEGER, next_mileage INTEGER, oil_in REAL, oil_out REAL,
  master_id INTEGER, seller_id INTEGER, cashier_id INTEGER,
  status TEXT NOT NULL, services TEXT DEFAULT '[]', note TEXT DEFAULT '',
  subtotal INTEGER DEFAULT 0, discount INTEGER DEFAULT 0,
  cashback_used INTEGER DEFAULT 0, cashback_earned INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0, paid_cash INTEGER DEFAULT 0, paid_card INTEGER DEFAULT 0,
  cost INTEGER DEFAULT 0, created_at TEXT, closed_at TEXT);
CREATE TABLE IF NOT EXISTS order_items(
  id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, product_id INTEGER,
  name TEXT, category TEXT, qty REAL, price INTEGER, cost REAL, is_bonus INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS stock_moves(
  id INTEGER PRIMARY KEY, product_id INTEGER, qty REAL, kind TEXT, ref TEXT,
  cost REAL, created_at TEXT);
CREATE TABLE IF NOT EXISTS cashback_tx(
  id INTEGER PRIMARY KEY, customer_id INTEGER, order_id INTEGER, amount INTEGER,
  kind TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS inventories(
  id INTEGER PRIMARY KEY, status TEXT, note TEXT DEFAULT '', created_at TEXT, closed_at TEXT);
CREATE TABLE IF NOT EXISTS inventory_items(
  inventory_id INTEGER, product_id INTEGER, expected REAL, actual REAL, cost REAL,
  PRIMARY KEY(inventory_id, product_id));
CREATE TABLE IF NOT EXISTS salary_payments(
  id INTEGER PRIMARY KEY, employee_id INTEGER, period_from TEXT, period_to TEXT,
  amount INTEGER, note TEXT DEFAULT '', created_at TEXT);
CREATE TABLE IF NOT EXISTS expenses(
  id INTEGER PRIMARY KEY, title TEXT, amount INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS payments(id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, method TEXT NOT NULL,
  amount INTEGER NOT NULL, shift_id INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS shifts(id INTEGER PRIMARY KEY, employee_id INTEGER, opened_at TEXT, closed_at TEXT,
  open_cash INTEGER DEFAULT 0, counted INTEGER, expected INTEGER, closed_by INTEGER, note TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS cash_tx(id INTEGER PRIMARY KEY, shift_id INTEGER, kind TEXT NOT NULL, category TEXT,
  method TEXT NOT NULL, amount INTEGER NOT NULL, note TEXT DEFAULT '', ref_type TEXT, ref_id INTEGER,
  employee_id INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS debt_tx(id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, order_id INTEGER,
  amount INTEGER NOT NULL, note TEXT DEFAULT '', employee_id INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS suppliers(id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT DEFAULT '',
  note TEXT DEFAULT '', debt INTEGER DEFAULT 0, active INTEGER DEFAULT 1, created_at TEXT);
CREATE TABLE IF NOT EXISTS supplier_tx(id INTEGER PRIMARY KEY, supplier_id INTEGER NOT NULL, purchase_id INTEGER,
  amount INTEGER NOT NULL, note TEXT DEFAULT '', employee_id INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS purchases(id INTEGER PRIMARY KEY, supplier_id INTEGER, total INTEGER DEFAULT 0,
  discount INTEGER DEFAULT 0, paid INTEGER DEFAULT 0, note TEXT DEFAULT '', employee_id INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS purchase_items(id INTEGER PRIMARY KEY, purchase_id INTEGER NOT NULL, product_id INTEGER,
  name TEXT, qty REAL, cost REAL, price INTEGER);
CREATE INDEX IF NOT EXISTS ix_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS ix_payments_shift ON payments(shift_id);
CREATE INDEX IF NOT EXISTS ix_cash_created ON cash_tx(created_at);
CREATE INDEX IF NOT EXISTS ix_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS ix_orders_closed ON orders(closed_at);
CREATE INDEX IF NOT EXISTS ix_items_order ON order_items(order_id);
"""

CHEV = ["Cobalt", "Nexia 3", "Gentra", "Lacetti", "Nexia 2"]
SMALL = ["Spark", "Matiz", "Damas", "Labo"]
# Namuna mahsulotlar — o'zingiznikiga almashtiring. Moy narxi 1 litr uchun.
# (nomi, kategoriya, turi, o'lchov, tannarx, narx, mos mashinalar, yopishqoqlik, bonus filtrlar)
SEED_PRODUCTS = [
    ("Mobil Super 3000 5W-40", "moy", "motor", "litr", 95000, 125000, [], "5W-40", "moy"),
    ("Total Quartz 9000 5W-40", "moy", "motor", "litr", 90000, 115000, [], "5W-40", ""),
    ("GM Dexos2 5W-30", "moy", "motor", "litr", 85000, 110000, [], "5W-30", "moy"),
    ("Lukoil Genesis 5W-30", "moy", "motor", "litr", 75000, 95000, [], "5W-30", ""),
    ("Shell Helix HX7 10W-40", "moy", "motor", "litr", 70000, 90000, [], "10W-40", "moy"),
    ("Lukoil Lux 10W-40", "moy", "motor", "litr", 50000, 65000, [], "10W-40", ""),
    ("Motor moyi 0W-20 (quyma)", "moy", "motor", "litr", 90000, 120000, [], "0W-20", ""),
    ("Karobka moyi (1 L)", "moy", "karobka", "litr", 60000, 85000, [], "", ""),
    ("Moy filtri — GM original", "filtr", "moy", "dona", 38000, 45000, CHEV, "", ""),
    ("Moy filtri — Koreya", "filtr", "moy", "dona", 24000, 30000, CHEV, "", ""),
    ("Moy filtri — Xitoy (arzon)", "filtr", "moy", "dona", 15000, 20000, CHEV, "", ""),
    ("Moy filtri — Spark/Matiz/Damas", "filtr", "moy", "dona", 22000, 28000, SMALL, "", ""),
    ("Havo filtri — Cobalt/Nexia 3", "filtr", "havo", "dona", 28000, 35000, ["Cobalt", "Nexia 3"], "", ""),
    ("Havo filtri — Gentra/Lacetti", "filtr", "havo", "dona", 30000, 38000, ["Gentra", "Lacetti"], "", ""),
    ("Havo filtri — Damas/Labo", "filtr", "havo", "dona", 20000, 25000, ["Damas", "Labo"], "", ""),
    ("Salon filtri — Cobalt/Nexia 3", "filtr", "salon", "dona", 22000, 30000, ["Cobalt", "Nexia 3"], "", ""),
    ("Salon filtri — Gentra/Lacetti", "filtr", "salon", "dona", 22000, 30000, ["Gentra", "Lacetti"], "", ""),
    ("Moy filtri — universal (xitoy)", "filtr", "moy", "dona", 25000, 35000, [], "", ""),
    ("Havo filtri — kesiladigan", "filtr", "havo", "dona", 20000, 30000, [], "", ""),
    ("Salon filtri — kesiladigan", "filtr", "salon", "dona", 18000, 28000, [], "", ""),
    ("Reduktor filtri — xitoy", "filtr", "reduktor", "dona", 60000, 80000, [], "", ""),
    ("Yoqilg'i filtri", "filtr", "yoqilgi", "dona", 40000, 45000, [], "", ""),
    ("Antifriz (1 L)", "boshqa", "", "litr", 18000, 25000, [], "", ""),
    ("Tormoz suyuqligi", "boshqa", "", "dona", 25000, 35000, [], "", ""),
    ("Salfetka / ochistitel", "boshqa", "", "dona", 5000, 10000, [], "", ""),
    ("Moy almashtirish xizmati", "xizmat", "", "dona", 0, 0, [], "", ""),
]

CAR_MODELS = [("Cobalt", "chevrolet"), ("Nexia 3", "chevrolet"), ("Gentra", "chevrolet"), ("Lacetti", "chevrolet"),
              ("Spark", "chevrolet"), ("Matiz", "chevrolet"), ("Nexia 2", "chevrolet"), ("Malibu", "chevrolet"),
              ("Tracker", "chevrolet"), ("Onix", "chevrolet"), ("Captiva", "chevrolet"), ("Monza", "chevrolet"),
              ("Equinox", "chevrolet"), ("Damas", "damas"), ("Labo", "damas"),
              ("BYD Chazor", "xitoy"), ("BYD Song Plus", "xitoy"), ("Chery Tiggo", "xitoy"), ("Chery Arrizo", "xitoy"),
              ("Haval", "xitoy"), ("Jetour", "xitoy"), ("Changan", "xitoy"), ("Geely", "xitoy"),
              ("Kia K5", "boshqa"), ("Hyundai Elantra", "boshqa")]

# (ism, lavozim, login, parol) — parollarni birinchi kirishda almashtiring
SEED_EMPLOYEES = [
    ("Usta 1", "usta", None, None), ("Usta 2", "usta", None, None),
    ("Zamena sotuvchisi", "sotuvchi", "sotuvchi", "1111"), ("Kassir", "kassir", "kassir", "2222"),
    ("Rahbar", "admin", "admin", "1234"),
]


def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def norm_plate(p):
    return re.sub(r"[^0-9A-ZА-ЯЁ]", "", (p or "").upper())


def norm_phone(p):
    d = re.sub(r"\D", "", p or "")
    if len(d) == 9:
        d = "998" + d
    return d


class ApiError(Exception):
    def __init__(self, msg, code=400):
        super().__init__(msg)
        self.code = code


def db():
    con = sqlite3.connect(DB_PATH, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys=ON")
    return con


CON = None


def init_db():
    global CON
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    CON = db()
    CON.executescript(SCHEMA)
    for k, v in DEFAULT_SETTINGS.items():
        CON.execute("INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)", (k, v))
    migrate()
    if not CON.execute("SELECT 1 FROM products LIMIT 1").fetchone():
        for n, c, k, u, cost, price, models, grade, bonus in SEED_PRODUCTS:
            pid = CON.execute("""INSERT INTO products(name,category,kind,unit,cost,price,stock,grade,bonus_kinds)
                                 VALUES(?,?,?,?,?,?,?,?,?)""",
                              (n, c, k, u, cost, price, 0 if c == "xizmat" else 50, grade, bonus)).lastrowid
            for m in models:
                CON.execute("INSERT OR IGNORE INTO product_models(product_id,model) VALUES(?,?)", (pid, m))
    for i, (m, g) in enumerate(CAR_MODELS):
        CON.execute("INSERT OR IGNORE INTO car_models(name,sort,grp) VALUES(?,?,?)", (m, i, g))
        CON.execute("UPDATE car_models SET grp=? WHERE name=? AND COALESCE(grp,'')=''", (g, m))
    if not CON.execute("SELECT 1 FROM employees LIMIT 1").fetchone():
        for n, r, login, pw in SEED_EMPLOYEES:
            CON.execute("INSERT INTO employees(name,role,login,pass_hash) VALUES(?,?,?,?)",
                        (n, r, login, hash_pw(pw) if pw else None))
    # eski «xarajatlar» jadvalini kassa harakatlariga ko'chirish (bir marta)
    if not CON.execute("SELECT 1 FROM settings WHERE key='expenses_migrated'").fetchone():
        for e in CON.execute("SELECT * FROM expenses").fetchall():
            CON.execute("""INSERT INTO cash_tx(kind,category,method,amount,note,created_at)
                           VALUES('chiqim','Boshqa xarajat','naqd',?,?,?)""", (e["amount"], e["title"], e["created_at"]))
        CON.execute("INSERT INTO settings(key,value) VALUES('expenses_migrated','1')")
    if not CON.execute("SELECT 1 FROM employees WHERE role='admin' AND COALESCE(login,'')!=''").fetchone():
        CON.execute("INSERT INTO employees(name,role,login,pass_hash) VALUES('Rahbar','admin','admin',?)", (hash_pw("1234"),))
    CON.commit()


def migrate():
    """Eski bazaga yangi ustunlarni qo'shadi."""
    for table, col, ddl in (("cars", "transmission", "TEXT DEFAULT ''"), ("cars", "color", "TEXT DEFAULT ''"),
                            ("cars", "plate_exception", "INTEGER DEFAULT 0"),
                            ("products", "kind", "TEXT DEFAULT ''"), ("products", "grade", "TEXT DEFAULT ''"),
                            ("products", "bonus_kinds", "TEXT DEFAULT ''"), ("products", "image", "TEXT"),
                            ("products", "image_v", "INTEGER DEFAULT 0"), ("car_models", "grp", "TEXT DEFAULT ''"),
                            ("employees", "login", "TEXT"), ("employees", "pass_hash", "TEXT"),
                            ("customers", "debt", "INTEGER DEFAULT 0"), ("orders", "shift_id", "INTEGER"),
                            ("orders", "parent_id", "INTEGER"), ("orders", "paid_debt", "INTEGER DEFAULT 0"),
                            ("orders", "refunded", "INTEGER DEFAULT 0"), ("orders", "change_given", "INTEGER DEFAULT 0"),
                            ("order_items", "src_item_id", "INTEGER")):
        cols = {r[1] for r in CON.execute(f"PRAGMA table_info({table})")}
        if col not in cols:
            CON.execute(f"ALTER TABLE {table} ADD COLUMN {col} {ddl}")


def rows(sql, args=()):
    return [dict(r) for r in CON.execute(sql, args).fetchall()]


def row(sql, args=()):
    r = CON.execute(sql, args).fetchone()
    return dict(r) if r else None


def settings():
    return {r["key"]: r["value"] for r in rows("SELECT * FROM settings")}


def setting_num(s, k):
    try:
        return float(s.get(k) or 0)
    except ValueError:
        return 0.0


def bump():
    VERSION["v"] += 1


# ---------------------------------------------------------------- kirish (login)

def hash_pw(pw, salt=None):
    salt = salt or secrets.token_hex(8)
    return salt + "$" + hashlib.sha256((salt + pw).encode()).hexdigest()


def check_pw(pw, stored):
    if not stored or "$" not in stored:
        return False
    return secrets.compare_digest(hash_pw(pw, stored.split("$", 1)[0]), stored)


def user_public(e):
    return {"id": e["id"], "name": e["name"], "role": e["role"]}


FAILS = {}      # ip -> noto'g'ri urinishlar vaqti
LOOKED = {}     # token -> sotuvchi raqam bo'yicha ochgan mashinalar
LOOKUPS = {}    # token -> raqam qidirish vaqtlari (bazani ko'chirib olishdan himoya)


def api_login(b, ip):
    t = time.time()
    FAILS[ip] = [x for x in FAILS.get(ip, []) if t - x < 300]
    if len(FAILS[ip]) >= 5:
        raise ApiError("Ko'p marta noto'g'ri kiritildi. 5 daqiqadan keyin urinib ko'ring.", 429)
    login = (b.get("login") or "").strip().lower()
    e = row("SELECT * FROM employees WHERE lower(login)=? AND active=1", (login,)) if login else None
    if not e or e["role"] == "usta" or not check_pw(b.get("password") or "", e["pass_hash"]):
        FAILS[ip].append(t)
        raise ApiError("Login yoki parol noto'g'ri", 401)
    tok = secrets.token_urlsafe(24)
    CON.execute("INSERT INTO sessions(token,employee_id,created_at) VALUES(?,?,?)", (tok, e["id"], now()))
    return {"token": tok, "user": user_public(e)}


def session_user(token):
    if not token:
        return None
    return row("""SELECT e.id, e.name, e.role FROM sessions s JOIN employees e ON e.id=s.employee_id
                  WHERE s.token=? AND e.active=1""", (token,))


SELLER_HEADS = {"bootstrap", "version", "me", "logout", "cars", "today", "orders"}
KASSA_HEADS = SELLER_HEADS | {"customers", "products", "purchases", "stock_moves", "inventories", "car_models",
                              "shift", "shifts", "cash", "suppliers", "reports"}


def check_access(user, token, method, parts):
    """Rollar: sotuvchi (planshet) — mijozlar bazasini ko'ra olmaydi; kassir — kassa; admin — hammasi."""
    role, head = user["role"], parts[0]
    rid = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
    action = parts[2] if len(parts) > 2 else None
    deny = ApiError("Bu amal uchun huquq yo'q", 403)
    if role == "admin":
        return
    if role == "kassir":
        if head not in KASSA_HEADS or (head == "car_models" and method != "GET"):
            raise deny
        if head == "reports" and (len(parts) < 2 or parts[1] not in ("summary", "debts")):
            raise deny
        return
    if role != "sotuvchi" or head not in SELLER_HEADS:
        raise deny
    if head == "cars":
        if method == "GET" and len(parts) > 1 and parts[1] == "lookup":
            t = time.time()
            LOOKUPS[token] = [x for x in LOOKUPS.get(token, []) if t - x < 600] + [t]
            if len(LOOKUPS[token]) > 60:
                raise ApiError("Juda ko'p qidiruv. Biroz kuting.", 429)
            return
        if rid and rid not in LOOKED.get(token, set()):
            raise deny          # faqat raqami terilgan mashina
    if head == "orders":
        if (method == "GET" and not rid) or action == "close":
            raise deny
        if rid:
            o = row("SELECT status FROM orders WHERE id=?", (rid,))
            if not o or o["status"] not in ("jarayonda", "tayyor"):
                raise deny


def scrub(x):
    """Planshet javoblaridan mijoz telefoni va keshbekini olib tashlaydi."""
    if isinstance(x, list):
        return [scrub(i) for i in x]
    if isinstance(x, dict):
        return {k: scrub(v) for k, v in x.items() if k not in ("customer_phone", "customer_cashback")}
    return x


# ---------------------------------------------------------------- customers/cars

def get_or_create_customer(name, phone):
    phone = norm_phone(phone)
    if phone:
        c = row("SELECT * FROM customers WHERE phone=?", (phone,))
        if c:
            if name and name != c["name"]:
                CON.execute("UPDATE customers SET name=? WHERE id=?", (name, c["id"]))
            return c["id"]
    if not name and not phone:
        return None
    cur = CON.execute("INSERT INTO customers(name,phone,created_at) VALUES(?,?,?)",
                      (name or "", phone, now()))
    return cur.lastrowid


def car_full(car_id):
    car = row("""SELECT cars.*, customers.name AS customer_name, customers.phone AS customer_phone,
                 customers.cashback AS customer_cashback
                 FROM cars LEFT JOIN customers ON customers.id=cars.customer_id WHERE cars.id=?""", (car_id,))
    if not car:
        return None
    hist = rows("SELECT * FROM orders WHERE car_id=? AND status!='bekor' ORDER BY id DESC LIMIT 15", (car_id,))
    for o in hist:
        o["items"] = rows("SELECT * FROM order_items WHERE order_id=?", (o["id"],))
        o["services"] = json.loads(o["services"] or "[]")
    car["history"] = hist
    return car


def api_car_lookup(q, token=None):
    plate = norm_plate(q.get("plate", [""])[0])
    if not plate:
        raise ApiError("Raqam kiriting")
    car = row("SELECT id FROM cars WHERE plate=?", (plate,))
    if car and token:
        LOOKED.setdefault(token, set()).add(car["id"])
    return {"plate": plate, "valid": bool(PLATE_OK.fullmatch(plate)), "car": car_full(car["id"]) if car else None}


def clean_car_fields(b):
    model = (b.get("model") or "").strip()
    tr = (b.get("transmission") or "").upper()
    if tr not in ("", "AT", "MT"):
        raise ApiError("Uzatmalar qutisi A/T yoki M/T bo'lishi kerak")
    if model:
        grp = b.get("model_grp") if b.get("model_grp") in GROUP_FILTERS else ""
        CON.execute("INSERT OR IGNORE INTO car_models(name,sort,grp) VALUES(?,1000,?)", (model, grp))
    return model, tr, (b.get("color") or "").strip()


def require_phone(b):
    phone = norm_phone(b.get("phone"))
    if not re.fullmatch(r"998\d{9}", phone):
        raise ApiError("Mijoz telefon raqamini to'liq kiriting (+998 XX XXX XX XX)")
    return phone


def api_car_create(b, token=None):
    plate = norm_plate(b.get("plate"))
    exc = 1 if b.get("exception") else 0
    if len(plate) < 3:
        raise ApiError("Mashina raqami juda qisqa")
    if not exc and not PLATE_OK.fullmatch(plate):
        raise ApiError("Raqam formati noto'g'ri: 01 A 123 BC yoki 01 123 ABC bo'lishi kerak. "
                       "Chet el mashinasi bo'lsa «Istisno»ni bosing.")
    if row("SELECT 1 FROM cars WHERE plate=?", (plate,)):
        raise ApiError("Bu raqam bazada bor")
    phone = require_phone(b)
    model, tr, color = clean_car_fields(b)
    cid = get_or_create_customer((b.get("customer_name") or "").strip(), phone)
    cur = CON.execute("""INSERT INTO cars(plate,model,transmission,color,customer_id,created_at,plate_exception)
                         VALUES(?,?,?,?,?,?,?)""", (plate, model, tr, color, cid, now(), exc))
    if token:
        LOOKED.setdefault(token, set()).add(cur.lastrowid)
    return car_full(cur.lastrowid)


def api_car_update(car_id, b):
    car = row("SELECT * FROM cars WHERE id=?", (car_id,))
    if not car:
        raise ApiError("Topilmadi", 404)
    model, tr, color = clean_car_fields({**car, **b})
    cid = car["customer_id"]
    if "phone" in b:
        phone = require_phone(b)
        name = (b.get("customer_name") or "").strip()
        same = row("SELECT * FROM customers WHERE phone=?", (phone,))
        if same:                       # bu raqamli mijoz bor — mashinani unga bog'laymiz
            cid = same["id"]
            if name:
                CON.execute("UPDATE customers SET name=? WHERE id=?", (name, cid))
        elif cid:                      # raqam xato yozilgan bo'lsa — to'g'rilaymiz
            CON.execute("UPDATE customers SET name=?, phone=? WHERE id=?", (name, phone, cid))
        else:
            cid = get_or_create_customer(name, phone)
    CON.execute("UPDATE cars SET model=?, transmission=?, color=?, customer_id=? WHERE id=?",
                (model, tr, color, cid, car_id))
    return car_full(car_id)


def api_customers(q):
    s = (q.get("q", [""])[0] or "").strip()
    like = f"%{s}%"
    pl = f"%{norm_plate(s)}%" if s else "%"
    return rows("""SELECT c.*, GROUP_CONCAT(cars.plate, ', ') AS plates,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id=c.id AND o.status='yopilgan') AS visits,
        (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.customer_id=c.id AND o.status='yopilgan') AS spent
        FROM customers c LEFT JOIN cars ON cars.customer_id=c.id
        WHERE (?='' OR c.name LIKE ? OR c.phone LIKE ? OR cars.plate LIKE ?) AND (?='' OR COALESCE(c.debt,0)>0)
        GROUP BY c.id ORDER BY c.id DESC LIMIT 300""", (s, like, like, pl, q.get("debt", [""])[0]))


def api_customer(cid):
    c = row("SELECT * FROM customers WHERE id=?", (cid,))
    if not c:
        raise ApiError("Topilmadi", 404)
    c["cars"] = rows("SELECT * FROM cars WHERE customer_id=?", (cid,))
    c["orders"] = rows("""SELECT o.*, cars.plate FROM orders o LEFT JOIN cars ON cars.id=o.car_id
                          WHERE o.customer_id=? AND o.status!='bekor' ORDER BY o.id DESC LIMIT 50""", (cid,))
    c["cashback_tx"] = rows("SELECT * FROM cashback_tx WHERE customer_id=? ORDER BY id DESC LIMIT 50", (cid,))
    c["debt_tx"] = rows("""SELECT t.*, e.name AS employee_name FROM debt_tx t LEFT JOIN employees e ON e.id=t.employee_id
                          WHERE customer_id=? ORDER BY t.id DESC LIMIT 100""", (cid,))
    return c


# ---------------------------------------------------------------- products/stock

def api_product_save(b, pid=None):
    name = (b.get("name") or "").strip()
    if not name:
        raise ApiError("Nomi kerak")
    cat = b.get("category") or "boshqa"
    if cat not in ("moy", "filtr", "boshqa", "xizmat"):
        raise ApiError("Kategoriya noto'g'ri")
    bonus = b.get("bonus_kinds") or []
    if isinstance(bonus, str):
        bonus = bonus.split(",")
    vals = (name, cat, b.get("unit") or "dona", float(b.get("cost") or 0),
            int(float(b.get("price") or 0)), (b.get("barcode") or "").strip(), 1 if b.get("active", 1) else 0,
            (b.get("kind") or "").strip(), norm_grade(b.get("grade")),
            ",".join(k for k in bonus if k in FILTER_KINDS))
    if pid:
        CON.execute("""UPDATE products SET name=?,category=?,unit=?,cost=?,price=?,barcode=?,active=?,kind=?,
                       grade=?,bonus_kinds=? WHERE id=?""", vals + (pid,))
    else:
        cur = CON.execute("""INSERT INTO products(name,category,unit,cost,price,barcode,active,kind,grade,bonus_kinds,stock)
                             VALUES(?,?,?,?,?,?,?,?,?,?,0)""", vals)
        pid = cur.lastrowid
        if float(b.get("stock") or 0):
            move_stock(pid, float(b["stock"]), "prixod", "boshlang'ich", float(b.get("cost") or 0))
    if "models" in b:
        CON.execute("DELETE FROM product_models WHERE product_id=?", (pid,))
        for m in b["models"] or []:
            if str(m).strip():
                CON.execute("INSERT OR IGNORE INTO product_models(product_id,model) VALUES(?,?)", (pid, str(m).strip()))
    if "image" in b:
        img = b.get("image") or None
        if img and (not re.match(r"data:image/(jpeg|png|webp);base64,", img) or len(img) > 2_000_000):
            raise ApiError("Rasm JPG/PNG bo'lishi va 1.5 MB dan oshmasligi kerak")
        CON.execute("UPDATE products SET image=?, image_v=COALESCE(image_v,0)+1 WHERE id=?", (img, pid))
    return products_full(pid)[0]


def norm_grade(g):
    """'5w30' -> '5W-30'"""
    g = re.sub(r"\s", "", str(g or "")).upper()
    m = re.fullmatch(r"(\d{1,2})W-?(\d{1,2})", g)
    return f"{m.group(1)}W-{m.group(2)}" if m else g


PRODUCT_COLS = ("id,name,category,unit,cost,price,stock,barcode,active,kind,grade,bonus_kinds,image_v,"
                "(image IS NOT NULL AND image!='') AS has_img")


def products_full(pid=None):
    ps = rows(f"SELECT {PRODUCT_COLS} FROM products" + (" WHERE id=?" if pid else "") + " ORDER BY category, kind, name",
              (pid,) if pid else ())
    pm = {}
    for r in rows("SELECT * FROM product_models"):
        pm.setdefault(r["product_id"], []).append(r["model"])
    for p in ps:
        p["models"] = sorted(pm.get(p["id"], []))
        p["bonus_kinds"] = [k for k in (p["bonus_kinds"] or "").split(",") if k]
        p["image_url"] = f"/api/products/{p['id']}/image?v={p['image_v']}" if p.pop("has_img") else ""
    return ps


def api_product_add_model(pid, b):
    model = (b.get("model") or "").strip()
    if not model or not row("SELECT 1 FROM products WHERE id=?", (pid,)):
        raise ApiError("Model yoki mahsulot noto'g'ri")
    CON.execute("INSERT OR IGNORE INTO product_models(product_id,model) VALUES(?,?)", (pid, model))
    return products_full(pid)[0]


def move_stock(pid, qty, kind, ref, cost=None):
    p = row("SELECT * FROM products WHERE id=?", (pid,))
    if not p or p["category"] == "xizmat":
        return
    CON.execute("UPDATE products SET stock=stock+? WHERE id=?", (qty, pid))
    CON.execute("INSERT INTO stock_moves(product_id,qty,kind,ref,cost,created_at) VALUES(?,?,?,?,?,?)",
                (pid, qty, kind, str(ref), p["cost"] if cost is None else cost, now()))


# ---------------------------------------------------------------- orders

def load_order(oid):
    o = row("""SELECT o.*, cars.plate, cars.model, cars.transmission, cars.color, cu.name AS customer_name, cu.phone AS customer_phone,
               cu.cashback AS customer_cashback,
               m.name AS master_name, s.name AS seller_name, k.name AS cashier_name
               FROM orders o LEFT JOIN cars ON cars.id=o.car_id
               LEFT JOIN customers cu ON cu.id=o.customer_id
               LEFT JOIN employees m ON m.id=o.master_id
               LEFT JOIN employees s ON s.id=o.seller_id
               LEFT JOIN employees k ON k.id=o.cashier_id WHERE o.id=?""", (oid,))
    if not o:
        raise ApiError("Zakaz topilmadi", 404)
    o["items"] = rows("SELECT * FROM order_items WHERE order_id=? ORDER BY id", (oid,))
    o["services"] = json.loads(o["services"] or "[]")
    o["payments"] = rows("SELECT method, amount FROM payments WHERE order_id=? ORDER BY id", (oid,))
    o["refunds"] = rows("SELECT id, total, closed_at FROM orders WHERE parent_id=? ORDER BY id", (oid,))
    o["customer_debt"] = row("SELECT debt FROM customers WHERE id=?", (o["customer_id"],))["debt"] if o["customer_id"] else 0
    return o


def write_items(oid, items):
    """Eski pozitsiyalarni omborga qaytarib, yangilarini yozadi."""
    for it in rows("SELECT * FROM order_items WHERE order_id=?", (oid,)):
        if it["product_id"]:
            move_stock(it["product_id"], it["qty"], "qaytarish", f"zakaz #{oid}")
    CON.execute("DELETE FROM order_items WHERE order_id=?", (oid,))
    subtotal = 0
    cost_total = 0.0
    for it in items:
        qty = float(it.get("qty") or 0)
        if qty <= 0:
            continue
        p = row("SELECT * FROM products WHERE id=?", (int(it["product_id"]),)) if it.get("product_id") else None
        if not p:
            raise ApiError("Mahsulot topilmadi")
        bonus = 1 if it.get("is_bonus") else 0
        price = 0 if bonus else int(float(it["price"] if it.get("price") not in (None, "") else p["price"]))
        CON.execute("""INSERT INTO order_items(order_id,product_id,name,category,qty,price,cost,is_bonus)
                       VALUES(?,?,?,?,?,?,?,?)""", (oid, p["id"], p["name"], p["category"], qty, price, p["cost"], bonus))
        move_stock(p["id"], -qty, "sotuv", f"zakaz #{oid}")
        subtotal += round(price * qty)
        cost_total += p["cost"] * qty
    CON.execute("UPDATE orders SET subtotal=?, cost=? WHERE id=?", (subtotal, round(cost_total), oid))


def api_order_create(b, user=None):
    if user and user["role"] != "usta":
        b["seller_id"] = user["id"]
    typ = b.get("type") or "zamena"
    s = settings()
    car_id = b.get("car_id")
    customer_id = b.get("customer_id")
    mileage = int(b.get("mileage") or 0) or None
    if typ == "zamena":
        if not car_id:
            raise ApiError("Mashina tanlanmagan")
        if not b.get("master_id"):
            raise ApiError("Ustani belgilang — bu majburiy")
        if not mileage:
            raise ApiError("Probegni kiriting")
        car = row("SELECT * FROM cars WHERE id=?", (car_id,))
        customer_id = car["customer_id"]
        cust = row("SELECT * FROM customers WHERE id=?", (customer_id,)) if customer_id else None
        if not cust or not cust["phone"]:
            raise ApiError("Avval mijozni kiriting — telefon raqami majburiy")
        if car["last_mileage"] and mileage < car["last_mileage"] and not b.get("force"):
            raise ApiError(f"Probeg avvalgidan ({car['last_mileage']:,} km) kam. Tekshiring.".replace(",", " "))
    elif b.get("phone") or b.get("customer_name"):
        customer_id = get_or_create_customer(b.get("customer_name"), b.get("phone"))
    next_km = mileage + int(setting_num(s, "next_service_km")) if mileage else None
    if b.get("next_mileage"):
        next_km = int(b["next_mileage"])
    cur = CON.execute("""INSERT INTO orders(type,car_id,customer_id,mileage,next_mileage,oil_in,oil_out,
        master_id,seller_id,status,services,note,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                      (typ, car_id, customer_id, mileage, next_km,
                       float(b.get("oil_in") or 0) or None, float(b.get("oil_out") or 0) or None,
                       b.get("master_id"), b.get("seller_id"),
                       "jarayonda", json.dumps(b.get("services") or [], ensure_ascii=False),
                       b.get("note") or "", now()))
    oid = cur.lastrowid
    write_items(oid, b.get("items") or [])
    if typ == "zamena" and mileage:
        CON.execute("UPDATE cars SET last_mileage=MAX(COALESCE(last_mileage,0),?) WHERE id=?", (mileage, car_id))
    if b.get("close") is not None:
        return api_order_close(oid, b["close"], user)
    return load_order(oid)


def api_order_update(oid, b):
    o = row("SELECT * FROM orders WHERE id=?", (oid,))
    if not o:
        raise ApiError("Topilmadi", 404)
    if o["status"] in ("yopilgan", "bekor"):
        raise ApiError("Yopilgan zakazni o'zgartirib bo'lmaydi")
    if o["type"] == "zamena" and "master_id" in b and not b.get("master_id"):
        raise ApiError("Ustani belgilang — bu majburiy")
    fields = {}
    for k in ("mileage", "next_mileage", "master_id", "seller_id"):
        if k in b:
            fields[k] = int(b[k]) if b[k] not in (None, "") else None
    for k in ("oil_in", "oil_out"):
        if k in b:
            fields[k] = float(b[k]) if b[k] not in (None, "") else None
    if "note" in b:
        fields["note"] = b["note"]
    if "services" in b:
        fields["services"] = json.dumps(b["services"], ensure_ascii=False)
    if "status" in b and b["status"] in ("jarayonda", "tayyor"):
        fields["status"] = b["status"]
    if fields:
        CON.execute("UPDATE orders SET " + ",".join(f"{k}=?" for k in fields) + " WHERE id=?",
                    list(fields.values()) + [oid])
    if "items" in b:
        write_items(oid, b["items"])
    if fields.get("mileage") and o["car_id"]:
        CON.execute("UPDATE cars SET last_mileage=MAX(COALESCE(last_mileage,0),?) WHERE id=?",
                    (fields["mileage"], o["car_id"]))
    return load_order(oid)


def api_order_cancel(oid):
    o = row("SELECT * FROM orders WHERE id=?", (oid,))
    if o["status"] == "yopilgan":
        raise ApiError("Yopilgan zakaz — avval qaytarishni qiling")
    write_items(oid, [])
    CON.execute("UPDATE orders SET status='bekor' WHERE id=?", (oid,))
    return load_order(oid)


def api_orders(q):
    st = q.get("status", [""])[0]
    frm = q.get("from", [""])[0]
    to = q.get("to", [""])[0]
    where, args = ["1=1"], []
    if st == "open":
        where.append("o.status IN ('jarayonda','tayyor')")
    elif st:
        where.append("o.status=?")
        args.append(st)
    if frm:
        where.append("date(COALESCE(o.closed_at,o.created_at))>=?")
        args.append(frm)
    if to:
        where.append("date(COALESCE(o.closed_at,o.created_at))<=?")
        args.append(to)
    if q.get("type", [""])[0]:
        where.append("o.type=?")
        args.append(q["type"][0])
    if q.get("cashier", [""])[0]:
        where.append("o.cashier_id=?")
        args.append(int(q["cashier"][0]))
    s_ = (q.get("q", [""])[0] or "").strip()
    if s_:
        where.append("""(CAST(o.id AS TEXT)=? OR o.car_id IN (SELECT id FROM cars WHERE plate LIKE ?)
                        OR o.customer_id IN (SELECT id FROM customers WHERE name LIKE ? OR phone LIKE ?))""")
        args += [s_.lstrip("#"), f"%{norm_plate(s_)}%", f"%{s_}%", f"%{re.sub(r'[^0-9]', '', s_) or s_}%"]
    ids = [r["id"] for r in rows(f"SELECT o.id FROM orders o WHERE {' AND '.join(where)} ORDER BY o.id DESC LIMIT 300", args)]
    return [load_order(i) for i in ids]


def api_today():
    d = date.today().isoformat()
    m = d[:7]
    base = "FROM orders o LEFT JOIN employees e ON e.id=o.master_id WHERE o.type='zamena' AND o.status!='bekor'"
    total = row(f"SELECT COUNT(*) n, COALESCE(SUM(o.oil_in),0) oil {base} AND date(o.created_at)=?", (d,))
    by_master = rows(f"""SELECT e.id, e.name, COUNT(*) n, COALESCE(SUM(o.oil_in),0) oil {base}
                         AND date(o.created_at)=? GROUP BY e.id ORDER BY n DESC""", (d,))
    by_master_month = rows(f"""SELECT e.id, e.name, COUNT(*) n {base}
                         AND substr(o.created_at,1,7)=? GROUP BY e.id ORDER BY n DESC""", (m,))
    open_ = [load_order(r["id"]) for r in rows(
        "SELECT id FROM orders WHERE type='zamena' AND status IN ('jarayonda','tayyor') ORDER BY id DESC")]
    done = [load_order(r["id"]) for r in rows(
        "SELECT id FROM orders WHERE type='zamena' AND status='yopilgan' AND date(closed_at)=? ORDER BY closed_at DESC", (d,))]
    return {"date": d, "count": total["n"], "oil": total["oil"], "by_master": by_master,
            "by_master_month": by_master_month, "open": open_, "done": done}


# ---------------------------------------------------------------- inventory

def api_inventory_create(b):
    if row("SELECT 1 FROM inventories WHERE status='ochiq'"):
        raise ApiError("Ochiq inventarizatsiya bor — avval uni yoping")
    cur = CON.execute("INSERT INTO inventories(status,note,created_at) VALUES('ochiq',?,?)", (b.get("note") or "", now()))
    iid = cur.lastrowid
    for p in rows("SELECT * FROM products WHERE active=1 AND category!='xizmat'"):
        CON.execute("INSERT INTO inventory_items(inventory_id,product_id,expected,actual,cost) VALUES(?,?,?,NULL,?)",
                    (iid, p["id"], p["stock"], p["cost"]))
    return api_inventory(iid)


def api_inventory(iid):
    inv = row("SELECT * FROM inventories WHERE id=?", (iid,))
    if not inv:
        raise ApiError("Topilmadi", 404)
    inv["items"] = rows("""SELECT ii.*, p.name, p.unit, p.category, p.stock AS current_stock
                           FROM inventory_items ii JOIN products p ON p.id=ii.product_id
                           WHERE inventory_id=? ORDER BY p.category, p.name""", (iid,))
    return inv


def api_inventory_save(iid, b):
    inv = row("SELECT * FROM inventories WHERE id=?", (iid,))
    if inv["status"] != "ochiq":
        raise ApiError("Inventarizatsiya yopilgan")
    for it in b.get("items") or []:
        a = it.get("actual")
        CON.execute("UPDATE inventory_items SET actual=? WHERE inventory_id=? AND product_id=?",
                    (None if a in (None, "") else float(a), iid, int(it["product_id"])))
    return api_inventory(iid)


def api_inventory_close(iid):
    inv = api_inventory(iid)
    if inv["status"] != "ochiq":
        raise ApiError("Yopilgan")
    for it in inv["items"]:
        if it["actual"] is None:
            continue
        # Inventar ochilgandan beri bo'lgan harakatlarni hisobga olamiz:
        # farq = haqiqiy - (kutilgan + o'shandan beri harakat) = haqiqiy - joriy qoldiq
        diff = it["actual"] - it["current_stock"]
        if abs(diff) > 1e-9:
            move_stock(it["product_id"], diff, "inventar", f"inventar #{iid}")
    CON.execute("UPDATE inventories SET status='yopilgan', closed_at=? WHERE id=?", (now(), iid))
    return api_inventory(iid)


# ---------------------------------------------------------------- reports

def period_args(q):
    frm = q.get("from", [""])[0] or date.today().replace(day=1).isoformat()
    to = q.get("to", [""])[0] or date.today().isoformat()
    return frm, to


def order_profit_sql():
    return "(o.total - o.cost)"


def api_report_profit(q):
    frm, to = period_args(q)
    p = (frm, to)
    w = "o.status='yopilgan' AND date(o.closed_at) BETWEEN ? AND ?"
    head = row(f"""SELECT COUNT(*) orders, SUM(o.type='zamena') zamena, SUM(o.type='sotuv') sotuv,
        COALESCE(SUM(o.subtotal),0) subtotal, COALESCE(SUM(o.discount),0) discount,
        COALESCE(SUM(o.cashback_used),0) cashback_used, COALESCE(SUM(o.cashback_earned),0) cashback_earned,
        COALESCE(SUM(o.total),0) revenue, COALESCE(SUM(o.paid_cash),0) cash, COALESCE(SUM(o.paid_card),0) card,
        COALESCE(SUM(o.cost),0) cost FROM orders o WHERE {w}""", p)
    cats = rows(f"""SELECT CASE WHEN i.is_bonus=1 THEN 'bonus' ELSE i.category END cat,
        SUM(i.qty) qty, SUM(i.price*i.qty) revenue, SUM(i.cost*i.qty) cost
        FROM order_items i JOIN orders o ON o.id=i.order_id WHERE {w} GROUP BY cat""", p)
    by_cat = {c["cat"]: c for c in cats}
    for c in cats:
        c["profit"] = round((c["revenue"] or 0) - (c["cost"] or 0))
    products = rows(f"""SELECT i.name, i.category, SUM(i.is_bonus) bonus_lines, SUM(i.qty) qty,
        SUM(i.price*i.qty) revenue, SUM(i.cost*i.qty) cost, SUM(i.price*i.qty - i.cost*i.qty) profit
        FROM order_items i JOIN orders o ON o.id=i.order_id WHERE {w}
        GROUP BY i.product_id ORDER BY profit DESC""", p)
    pay = api_report_payroll({"from": [frm], "to": [to]})
    expenses = row(f"""SELECT COALESCE(SUM(amount),0) s FROM cash_tx WHERE kind='chiqim' AND date(created_at) BETWEEN ? AND ?
                        AND category IN ({','.join('?' * len(EXPENSE_CATS))})""", p + EXPENSE_CATS)["s"]
    gross = head["revenue"] - head["cost"]
    oil = by_cat.get("moy", {}).get("profit", 0)
    filt = by_cat.get("filtr", {}).get("profit", 0)
    bonus = by_cat.get("bonus", {}).get("profit", 0)
    return {
        "from": frm, "to": to, "head": head, "categories": cats, "products": products,
        "gross_profit": gross,
        "oil_profit": oil, "filter_profit": filt, "bonus_cost": -bonus,
        "other_profit": gross - oil - filt - bonus,
        "kpi_total": pay["kpi_total"], "salary_total": pay["salary_total"],
        "expenses": expenses,
        "cashback_liability": row("SELECT COALESCE(SUM(cashback),0) s FROM customers")["s"],
        "net_profit": gross - pay["kpi_total"] - pay["salary_total"] - expenses,
    }


def api_report_payroll(q):
    frm, to = period_args(q)
    s = settings()
    d1, d2 = date.fromisoformat(frm), date.fromisoformat(to)
    days = (d2 - d1).days + 1
    dim = calendar.monthrange(d1.year, d1.month)[1]
    out = []
    kpi_total = sal_total = 0
    p = (frm, to)
    w = "o.status='yopilgan' AND date(o.closed_at) BETWEEN ? AND ?"
    for e in rows("SELECT id, name, role, phone, base_salary, active FROM employees ORDER BY role, name"):
        if e["role"] == "usta":
            col, per_car, pct = "master_id", "master_kpi_per_car", "master_kpi_percent"
        elif e["role"] == "sotuvchi":
            col, per_car, pct = "seller_id", "seller_kpi_per_car", "seller_kpi_percent"
        else:
            col, per_car, pct = "cashier_id", None, "cashier_kpi_percent"
        st = row(f"""SELECT COUNT(*) n, SUM(o.type='zamena') cars, COALESCE(SUM(o.total-o.cost),0) profit,
                     COALESCE(SUM(o.oil_in),0) oil FROM orders o WHERE {w} AND o.{col}=?""", p + (e["id"],))
        cars = st["cars"] or 0
        kpi = 0.0
        if per_car:
            kpi += cars * setting_num(s, per_car)
        kpi += st["profit"] * setting_num(s, pct) / 100
        base = round(e["base_salary"] * min(days, dim) / dim) if e["active"] else 0
        paid = row("""SELECT COALESCE(SUM(amount),0) s FROM salary_payments
                      WHERE employee_id=? AND period_from=? AND period_to=?""", (e["id"], frm, to))["s"]
        kpi = round(kpi)
        if not (e["active"] or cars or kpi or paid):
            continue
        out.append({"employee": e, "orders": st["n"], "cars": cars, "oil": st["oil"], "profit": st["profit"],
                    "kpi": kpi, "base": base, "total": kpi + base, "paid": paid, "due": kpi + base - paid})
        kpi_total += kpi
        sal_total += base
    return {"from": frm, "to": to, "rows": out, "kpi_total": kpi_total, "salary_total": sal_total}


def api_salary_pay(b, user=None):
    e = row("SELECT name FROM employees WHERE id=?", (int(b["employee_id"]),))
    method = b.get("method") or "naqd"
    if method in MONEY_METHODS and money(b["amount"]) > 0:
        CON.execute("""INSERT INTO cash_tx(shift_id,kind,category,method,amount,note,ref_type,ref_id,employee_id,created_at)
                       VALUES(?,'chiqim',?,?,?,?,'employee',?,?,?)""",
                    (shift_id_or_none(), CAT_SALARY, method, money(b["amount"]),
                     f"{e['name'] if e else ''}: {b['period_from']} — {b['period_to']}", int(b["employee_id"]),
                     user["id"] if user else None, now()))
    CON.execute("""INSERT INTO salary_payments(employee_id,period_from,period_to,amount,note,created_at)
                   VALUES(?,?,?,?,?,?)""", (int(b["employee_id"]), b["period_from"], b["period_to"],
                                           int(float(b["amount"])), b.get("note") or "", now()))
    return {"ok": True}




# ================================================================ KASSA (Bito uslubida)
# To'lov usullari (Bito: Naqd F6, Terminal F7, Kartadan o'tkazma) + qarzga sotish
METHODS = {"naqd": "Naqd", "terminal": "Terminal", "otkazma": "Kartadan o'tkazma", "qarz": "Qarzga"}
MONEY_METHODS = ("naqd", "terminal", "otkazma")
CHIQIM_CATS = ["Ijara", "Kommunal xizmatlar", "Elektr", "Gaz", "Telefon va aloqa", "Reklama", "Yo'lkira",
               "Ofis xarajatlari", "Ish haqi", "Avans", "Usta puli", "Inkassatsiya (rahbarga)", "Boshqa xarajat"]
KIRIM_CATS = ["Kassaga pul qo'yish", "Qarz olish", "Boshqa kirim"]
# Foyda hisobotida «xarajat» deb olinadiganlari (ish haqi oylik/KPI'da alohida hisoblanadi)
EXPENSE_CATS = ("Ijara", "Kommunal xizmatlar", "Elektr", "Gaz", "Telefon va aloqa", "Reklama", "Yo'lkira",
                "Ofis xarajatlari", "Boshqa xarajat")
CAT_DEBT_IN = "Mijoz qarzini to'lash"
CAT_SUP_OUT = "Yetkazib beruvchiga to'lov"
CAT_SUP_IN = "Yetkazib beruvchidan pul olish"
CAT_SALARY = "Ish haqi"


def money(v):
    try:
        return int(round(float(v or 0)))
    except (TypeError, ValueError):
        raise ApiError("Summa noto'g'ri")


def fmt_sum(n):
    return f"{int(n):,}".replace(",", " ")


# ---------------------------------------------------------------- smena
def current_shift():
    return row("""SELECT s.*, e.name AS employee_name FROM shifts s LEFT JOIN employees e ON e.id=s.employee_id
                  WHERE s.closed_at IS NULL ORDER BY s.id DESC LIMIT 1""")


def need_shift():
    sh = current_shift()
    if not sh:
        raise ApiError("Smena ochilmagan. Avval smenani oching.", 409)
    return sh


def shift_id_or_none():
    sh = current_shift()
    return sh["id"] if sh else None


def shift_summary(sh):
    sid = sh["id"]
    pay = {r["method"]: r["s"] for r in rows(
        "SELECT method, COALESCE(SUM(amount),0) s FROM payments WHERE shift_id=? GROUP BY method", (sid,))}
    cin = {r["method"]: r["s"] for r in rows(
        "SELECT method, COALESCE(SUM(amount),0) s FROM cash_tx WHERE shift_id=? AND kind='kirim' GROUP BY method", (sid,))}
    cout = {r["method"]: r["s"] for r in rows(
        "SELECT method, COALESCE(SUM(amount),0) s FROM cash_tx WHERE shift_id=? AND kind='chiqim' GROUP BY method", (sid,))}
    sales = row("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE shift_id=? AND type!='qaytarish' AND status='yopilgan'", (sid,))
    refunds = row("SELECT COUNT(*) n, COALESCE(-SUM(total),0) s FROM orders WHERE shift_id=? AND type='qaytarish'", (sid,))
    methods = {}
    for m in MONEY_METHODS + ("qarz",):
        methods[m] = {"sales": pay.get(m, 0), "in": cin.get(m, 0), "out": cout.get(m, 0),
                      "balance": pay.get(m, 0) + cin.get(m, 0) - cout.get(m, 0)}
    out = dict(sh)
    out.update({"methods": methods, "sales_count": sales["n"], "sales_total": sales["s"],
                "refund_count": refunds["n"], "refund_total": refunds["s"],
                "expected_cash": (sh["open_cash"] or 0) + methods["naqd"]["balance"]})
    return out


def api_shift_open(b, user):
    if current_shift():
        raise ApiError("Smena allaqachon ochiq")
    sid = CON.execute("INSERT INTO shifts(employee_id,opened_at,open_cash,note) VALUES(?,?,?,?)",
                      (user["id"], now(), max(money(b.get("open_cash")), 0), b.get("note") or "")).lastrowid
    return shift_summary(row("SELECT s.*, e.name AS employee_name FROM shifts s LEFT JOIN employees e ON e.id=s.employee_id WHERE s.id=?", (sid,)))


def api_shift_close(b, user):
    sh = need_shift()
    sm = shift_summary(sh)
    counted = money(b.get("counted")) if b.get("counted") not in (None, "") else sm["expected_cash"]
    CON.execute("UPDATE shifts SET closed_at=?, counted=?, expected=?, closed_by=?, note=? WHERE id=?",
                (now(), counted, sm["expected_cash"], user["id"], b.get("note") or sh.get("note") or "", sh["id"]))
    return api_shift(sh["id"])


def api_shift(sid):
    sh = row("""SELECT s.*, e.name AS employee_name, c.name AS closed_by_name FROM shifts s
                LEFT JOIN employees e ON e.id=s.employee_id LEFT JOIN employees c ON c.id=s.closed_by WHERE s.id=?""", (sid,))
    if not sh:
        raise ApiError("Smena topilmadi", 404)
    return shift_summary(sh)


def api_shifts():
    return [api_shift(r["id"]) for r in rows("SELECT id FROM shifts ORDER BY id DESC LIMIT 60")]


# ---------------------------------------------------------------- to'lovlar
def normalize_payments(b, total):
    pays = {}
    if "payments" in b:
        for p in b.get("payments") or []:
            m = p.get("method")
            if m not in METHODS:
                raise ApiError("To'lov usuli noto'g'ri")
            a = money(p.get("amount"))
            if a < 0:
                raise ApiError("Summa manfiy bo'lishi mumkin emas")
            pays[m] = pays.get(m, 0) + a
    else:  # eski format: paid_cash / paid_card
        cash, card = money(b.get("paid_cash")), money(b.get("paid_card"))
        if cash == 0 and card == 0:
            if b.get("method") == "karta":
                card = total
            else:
                cash = total
        pays = {"naqd": cash, "terminal": card}
    return {m: a for m, a in pays.items() if a}


def api_order_close(oid, b, user=None):
    o = row("SELECT * FROM orders WHERE id=?", (oid,))
    if not o or o["status"] in ("yopilgan", "bekor"):
        raise ApiError("Zakaz yopiq yoki topilmadi")
    sh = need_shift()
    s = settings()
    if o["type"] == "sotuv" and "customer_id" in b:
        cid = b.get("customer_id") or None
        if cid and not row("SELECT 1 FROM customers WHERE id=?", (cid,)):
            raise ApiError("Mijoz topilmadi")
        CON.execute("UPDATE orders SET customer_id=? WHERE id=?", (cid, oid))
        o["customer_id"] = cid
    discount = max(money(b.get("discount")), 0)
    due = max(o["subtotal"] - discount, 0)
    cb_used = max(money(b.get("cashback_used")), 0)
    cust = row("SELECT * FROM customers WHERE id=?", (o["customer_id"],)) if o["customer_id"] else None
    if cb_used:
        if not cust:
            raise ApiError("Keshbek uchun mijoz kerak")
        if cb_used > cust["cashback"]:
            raise ApiError("Keshbek balansi yetarli emas")
        cb_used = min(cb_used, due)
    total = due - cb_used
    pays = normalize_payments(b, total)
    paid = sum(pays.values())
    change = 0
    if paid > total:                                   # naqddan qaytim
        over = paid - total
        if pays.get("naqd", 0) >= over:
            pays["naqd"] -= over
            change = over
        else:
            raise ApiError(f"To'lov ortiqcha: {fmt_sum(total)} kerak, {fmt_sum(paid)} kiritildi")
    if sum(pays.values()) != total:
        raise ApiError(f"To'lov yetarli emas: {fmt_sum(total)} kerak, {fmt_sum(sum(pays.values()))} kiritildi")
    debt = pays.get("qarz", 0)
    if debt and not cust:
        raise ApiError("Qarzga sotish uchun mijozni tanlang")
    for m, a in pays.items():
        if a:
            CON.execute("INSERT INTO payments(order_id,method,amount,shift_id,created_at) VALUES(?,?,?,?,?)",
                        (oid, m, a, sh["id"], now()))
    if debt:
        CON.execute("UPDATE customers SET debt=COALESCE(debt,0)+? WHERE id=?", (debt, cust["id"]))
        CON.execute("INSERT INTO debt_tx(customer_id,order_id,amount,note,employee_id,created_at) VALUES(?,?,?,?,?,?)",
                    (cust["id"], oid, debt, f"Chek #{oid} — qarzga", user["id"] if user else None, now()))
    earned = 0
    if cust:
        earned = int((total - debt) * setting_num(s, "cashback_percent") / 100)
        CON.execute("UPDATE customers SET cashback=cashback+? WHERE id=?", (earned - cb_used, cust["id"]))
        if cb_used:
            CON.execute("INSERT INTO cashback_tx(customer_id,order_id,amount,kind,created_at) VALUES(?,?,?,?,?)",
                        (cust["id"], oid, -cb_used, "ishlatildi", now()))
        if earned:
            CON.execute("INSERT INTO cashback_tx(customer_id,order_id,amount,kind,created_at) VALUES(?,?,?,?,?)",
                        (cust["id"], oid, earned, "yig'ildi", now()))
    CON.execute("""UPDATE orders SET status='yopilgan', discount=?, cashback_used=?, cashback_earned=?, total=?,
                   paid_cash=?, paid_card=?, paid_debt=?, change_given=?, cashier_id=?, shift_id=?, closed_at=? WHERE id=?""",
                (discount, cb_used, earned, total, pays.get("naqd", 0), pays.get("terminal", 0) + pays.get("otkazma", 0),
                 debt, change, user["id"] if user else b.get("cashier_id"), sh["id"], now(), oid))
    return load_order(oid)


def api_order_refund(oid, b, user):
    o = load_order(oid)
    if o["status"] != "yopilgan" or o["type"] == "qaytarish":
        raise ApiError("Faqat to'langan chekni qaytarish mumkin")
    sh = need_shift()
    method = b.get("method") or "naqd"
    if method not in METHODS:
        raise ApiError("To'lov usuli noto'g'ri")
    done = {r["src_item_id"]: r["q"] for r in rows(
        """SELECT i.src_item_id, -SUM(i.qty) q FROM order_items i JOIN orders r ON r.id=i.order_id
           WHERE r.parent_id=? GROUP BY i.src_item_id""", (oid,))}
    lines = []
    for it in b.get("items") or []:
        src = next((x for x in o["items"] if x["id"] == int(it["item_id"])), None)
        q = float(it.get("qty") or 0)
        if not src or q <= 0:
            continue
        left = src["qty"] - (done.get(src["id"]) or 0)
        if q > left + 1e-9:
            raise ApiError(f"«{src['name']}»dan ko'pi bilan {left:g} qaytarish mumkin")
        lines.append((src, q))
    if not lines:
        raise ApiError("Qaytariladigan mahsulotni tanlang")
    gross = sum(round(src["price"] * q) for src, q in lines)
    ratio = (o["total"] / o["subtotal"]) if o["subtotal"] else 0
    amount = round(gross * ratio)
    cust = row("SELECT * FROM customers WHERE id=?", (o["customer_id"],)) if o["customer_id"] else None
    if method == "qarz":
        if not cust:
            raise ApiError("Mijoz yo'q — qarzdan ayirib bo'lmaydi")
        if amount > (cust["debt"] or 0):
            raise ApiError("Mijoz qarzi qaytariladigan summadan kam — boshqa usulni tanlang")
    cost = sum(src["cost"] * q for src, q in lines)
    rid = CON.execute("""INSERT INTO orders(type,parent_id,car_id,customer_id,status,services,note,subtotal,total,cost,
                         paid_cash,paid_card,paid_debt,cashier_id,shift_id,created_at,closed_at)
                         VALUES('qaytarish',?,?,?,'yopilgan','[]',?,?,?,?,?,?,?,?,?,?,?)""",
                      (oid, o["car_id"], o["customer_id"], b.get("note") or "", -gross, -amount, -round(cost),
                       -amount if method == "naqd" else 0, -amount if method in ("terminal", "otkazma") else 0,
                       -amount if method == "qarz" else 0, user["id"], sh["id"], now(), now())).lastrowid
    for src, q in lines:
        CON.execute("""INSERT INTO order_items(order_id,product_id,name,category,qty,price,cost,is_bonus,src_item_id)
                       VALUES(?,?,?,?,?,?,?,?,?)""", (rid, src["product_id"], src["name"], src["category"], -q,
                                                      src["price"], src["cost"], src["is_bonus"], src["id"]))
        if src["product_id"]:
            move_stock(src["product_id"], q, "qaytarish", f"chek #{oid}")
    if amount:
        CON.execute("INSERT INTO payments(order_id,method,amount,shift_id,created_at) VALUES(?,?,?,?,?)",
                    (rid, method, -amount, sh["id"], now()))
    if method == "qarz":
        CON.execute("UPDATE customers SET debt=debt-? WHERE id=?", (amount, cust["id"]))
        CON.execute("INSERT INTO debt_tx(customer_id,order_id,amount,note,employee_id,created_at) VALUES(?,?,?,?,?,?)",
                    (cust["id"], rid, -amount, f"Qaytarish #{rid} (chek #{oid})", user["id"], now()))
    if cust and o["cashback_earned"] and o["total"]:
        rev = round(o["cashback_earned"] * amount / o["total"])
        if rev:
            CON.execute("UPDATE customers SET cashback=MAX(cashback-?,0) WHERE id=?", (rev, cust["id"]))
            CON.execute("INSERT INTO cashback_tx(customer_id,order_id,amount,kind,created_at) VALUES(?,?,?,?,?)",
                        (cust["id"], rid, -rev, "qaytarish", now()))
            CON.execute("UPDATE orders SET cashback_earned=? WHERE id=?", (-rev, rid))
    CON.execute("UPDATE orders SET refunded=COALESCE(refunded,0)+? WHERE id=?", (amount, oid))
    return load_order(rid)


# ---------------------------------------------------------------- mijozlar (qarz)
def api_customer_create(b):
    name = (b.get("name") or "").strip()
    phone = norm_phone(b.get("phone"))
    if not name and not phone:
        raise ApiError("Ism yoki telefon kiriting")
    if phone and not re.fullmatch(r"998\d{9}", phone):
        raise ApiError("Telefon raqami to'liq emas (+998 XX XXX XX XX)")
    if phone and row("SELECT 1 FROM customers WHERE phone=?", (phone,)):
        raise ApiError("Bu telefon raqamli mijoz bor")
    cid = CON.execute("INSERT INTO customers(name,phone,note,created_at) VALUES(?,?,?,?)",
                      (name, phone, b.get("note") or "", now())).lastrowid
    return api_customer(cid)


def api_customer_pay(cid, b, user):
    c = row("SELECT * FROM customers WHERE id=?", (cid,))
    if not c:
        raise ApiError("Mijoz topilmadi", 404)
    amount = money(b.get("amount"))
    method = b.get("method") or "naqd"
    if method not in MONEY_METHODS:
        raise ApiError("To'lov usuli noto'g'ri")
    if amount <= 0:
        raise ApiError("Summani kiriting")
    if amount > (c["debt"] or 0):
        raise ApiError(f"Mijoz qarzi {fmt_sum(c['debt'] or 0)} so'm — undan ko'p olib bo'lmaydi")
    sid = need_shift()["id"]
    CON.execute("UPDATE customers SET debt=debt-? WHERE id=?", (amount, cid))
    CON.execute("INSERT INTO debt_tx(customer_id,amount,note,employee_id,created_at) VALUES(?,?,?,?,?)",
                (cid, -amount, b.get("note") or f"To'lov ({METHODS[method]})", user["id"], now()))
    CON.execute("""INSERT INTO cash_tx(shift_id,kind,category,method,amount,note,ref_type,ref_id,employee_id,created_at)
                   VALUES(?,'kirim',?,?,?,?,'customer',?,?,?)""",
                (sid, CAT_DEBT_IN, method, amount, c["name"] or c["phone"], cid, user["id"], now()))
    return api_customer(cid)


def api_customer_debt_adjust(cid, b, user):
    amount = money(b.get("amount"))
    if not amount:
        raise ApiError("Summani kiriting")
    CON.execute("UPDATE customers SET debt=COALESCE(debt,0)+? WHERE id=?", (amount, cid))
    CON.execute("INSERT INTO debt_tx(customer_id,amount,note,employee_id,created_at) VALUES(?,?,?,?,?)",
                (cid, amount, b.get("note") or "Qo'lda tuzatish", user["id"], now()))
    return api_customer(cid)


# ---------------------------------------------------------------- yetkazib beruvchilar
def api_suppliers(q):
    s = (q.get("q", [""])[0] or "").strip()
    like = f"%{s}%"
    return rows("""SELECT sp.*, (SELECT COUNT(*) FROM purchases p WHERE p.supplier_id=sp.id) purchases,
                   (SELECT MAX(created_at) FROM purchases p WHERE p.supplier_id=sp.id) last_purchase
                   FROM suppliers sp WHERE ?='' OR sp.name LIKE ? OR sp.phone LIKE ? ORDER BY sp.name""", (s, like, like))


def api_supplier(sid):
    sp = row("SELECT * FROM suppliers WHERE id=?", (sid,))
    if not sp:
        raise ApiError("Yetkazib beruvchi topilmadi", 404)
    sp["purchases"] = rows("SELECT * FROM purchases WHERE supplier_id=? ORDER BY id DESC LIMIT 100", (sid,))
    sp["tx"] = rows("""SELECT t.*, e.name AS employee_name FROM supplier_tx t LEFT JOIN employees e ON e.id=t.employee_id
                       WHERE supplier_id=? ORDER BY t.id DESC LIMIT 200""", (sid,))
    return sp


def api_supplier_save(b, sid=None, user=None):
    name = (b.get("name") or "").strip()
    if not name:
        raise ApiError("Nomini kiriting")
    phone = norm_phone(b.get("phone"))
    if sid:
        CON.execute("UPDATE suppliers SET name=?, phone=?, note=?, active=? WHERE id=?",
                    (name, phone, b.get("note") or "", 1 if b.get("active", 1) else 0, sid))
    else:
        sid = CON.execute("INSERT INTO suppliers(name,phone,note,debt,created_at) VALUES(?,?,?,0,?)",
                          (name, phone, b.get("note") or "", now())).lastrowid
        opening = money(b.get("debt"))
        if opening:
            CON.execute("UPDATE suppliers SET debt=? WHERE id=?", (opening, sid))
            CON.execute("INSERT INTO supplier_tx(supplier_id,amount,note,employee_id,created_at) VALUES(?,?,?,?,?)",
                        (sid, opening, "Boshlang'ich qoldiq", user["id"] if user else None, now()))
    return api_supplier(sid)


def api_supplier_pay(sid, b, user):
    sp = row("SELECT * FROM suppliers WHERE id=?", (sid,))
    if not sp:
        raise ApiError("Topilmadi", 404)
    amount = money(b.get("amount"))
    method = b.get("method") or "naqd"
    if method not in MONEY_METHODS:
        raise ApiError("To'lov usuli noto'g'ri")
    if amount <= 0:
        raise ApiError("Summani kiriting")
    give = (b.get("direction") or "berish") == "berish"
    delta = -amount if give else amount
    CON.execute("UPDATE suppliers SET debt=debt+? WHERE id=?", (delta, sid))
    CON.execute("INSERT INTO supplier_tx(supplier_id,amount,note,employee_id,created_at) VALUES(?,?,?,?,?)",
                (sid, delta, b.get("note") or (f"To'lov ({METHODS[method]})" if give else f"Pul olindi ({METHODS[method]})"),
                 user["id"], now()))
    CON.execute("""INSERT INTO cash_tx(shift_id,kind,category,method,amount,note,ref_type,ref_id,employee_id,created_at)
                   VALUES(?,?,?,?,?,?,'supplier',?,?,?)""",
                (shift_id_or_none(), "chiqim" if give else "kirim", CAT_SUP_OUT if give else CAT_SUP_IN, method, amount,
                 sp["name"], sid, user["id"], now()))
    return api_supplier(sid)


# ---------------------------------------------------------------- xaridlar
def api_purchase(b, user=None):
    items = [it for it in (b.get("items") or []) if float(it.get("qty") or 0) > 0]
    if not items:
        raise ApiError("Mahsulot qo'shing")
    sid = b.get("supplier_id") or None
    sp = row("SELECT * FROM suppliers WHERE id=?", (sid,)) if sid else None
    if sid and not sp:
        raise ApiError("Yetkazib beruvchi topilmadi")
    gross = sum(round(float(it["qty"]) * float(it.get("cost") or 0)) for it in items)
    discount = max(money(b.get("discount")), 0)
    total = max(gross - discount, 0)
    legacy = "payments" not in b
    pays = {} if legacy else normalize_payments(b, total)
    for m in pays:
        if m not in MONEY_METHODS:
            raise ApiError("Xarid uchun to'lov usuli: naqd, terminal yoki o'tkazma")
    paid = total if legacy else sum(pays.values())
    if paid > total:
        raise ApiError("To'langan summa xarid summasidan ko'p")
    if not sp and paid < total:
        raise ApiError("Qarzga xarid uchun yetkazib beruvchini tanlang")
    pid = CON.execute("""INSERT INTO purchases(supplier_id,total,discount,paid,note,employee_id,created_at)
                         VALUES(?,?,?,?,?,?,?)""", (sid, total, discount, paid,
                                                    (b.get("note") or b.get("supplier") or "").strip(),
                                                    user["id"] if user else None, now())).lastrowid
    for it in items:
        prid = int(it["product_id"])
        qty = float(it["qty"])
        cost = float(it.get("cost") or 0)
        p = row("SELECT * FROM products WHERE id=?", (prid,))
        if not p:
            raise ApiError("Mahsulot topilmadi")
        old_stock = max(p["stock"], 0)
        if cost > 0:
            new_cost = (old_stock * p["cost"] + qty * cost) / (old_stock + qty)  # o'rtacha tannarx
            CON.execute("UPDATE products SET cost=? WHERE id=?", (round(new_cost, 2), prid))
        price = int(float(it["price"])) if it.get("price") not in (None, "", 0, "0") else None
        if price:
            CON.execute("UPDATE products SET price=? WHERE id=?", (price, prid))
        CON.execute("INSERT INTO purchase_items(purchase_id,product_id,name,qty,cost,price) VALUES(?,?,?,?,?,?)",
                    (pid, prid, p["name"], qty, cost or p["cost"], price or p["price"]))
        move_stock(prid, qty, "prixod", f"xarid #{pid}" + (f" — {sp['name']}" if sp else ""), cost or p["cost"])
    if sp:
        CON.execute("UPDATE suppliers SET debt=debt+? WHERE id=?", (total - paid, sid))
        CON.execute("INSERT INTO supplier_tx(supplier_id,purchase_id,amount,note,employee_id,created_at) VALUES(?,?,?,?,?,?)",
                    (sid, pid, total, f"Xarid #{pid}", user["id"] if user else None, now()))
        if paid:
            CON.execute("INSERT INTO supplier_tx(supplier_id,purchase_id,amount,note,employee_id,created_at) VALUES(?,?,?,?,?,?)",
                        (sid, pid, -paid, f"Xarid #{pid} uchun to'lov", user["id"] if user else None, now()))
    for m, a in pays.items():
        CON.execute("""INSERT INTO cash_tx(shift_id,kind,category,method,amount,note,ref_type,ref_id,employee_id,created_at)
                       VALUES(?,'chiqim',?,?,?,?,'purchase',?,?,?)""",
                    (shift_id_or_none(), CAT_SUP_OUT, m, a, f"Xarid #{pid}" + (f" — {sp['name']}" if sp else ""),
                     pid, user["id"] if user else None, now()))
    return api_purchase_get(pid)


def api_purchase_get(pid):
    p = row("""SELECT p.*, s.name AS supplier_name, e.name AS employee_name FROM purchases p
               LEFT JOIN suppliers s ON s.id=p.supplier_id LEFT JOIN employees e ON e.id=p.employee_id WHERE p.id=?""", (pid,))
    if not p:
        raise ApiError("Xarid topilmadi", 404)
    p["items"] = rows("SELECT * FROM purchase_items WHERE purchase_id=? ORDER BY id", (pid,))
    return p


def api_purchases(q):
    frm, to = period_args(q)
    sid = q.get("supplier_id", [""])[0]
    return rows(f"""SELECT p.*, s.name AS supplier_name, e.name AS employee_name,
                    (SELECT COUNT(*) FROM purchase_items i WHERE i.purchase_id=p.id) n
                    FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id LEFT JOIN employees e ON e.id=p.employee_id
                    WHERE date(p.created_at) BETWEEN ? AND ? {"AND p.supplier_id=?" if sid else ""}
                    ORDER BY p.id DESC LIMIT 500""", (frm, to) + ((int(sid),) if sid else ()))


# ---------------------------------------------------------------- kassa (pul harakati)
def api_cash_add(b, user):
    kind = b.get("kind")
    if kind not in ("kirim", "chiqim"):
        raise ApiError("Kirim yoki chiqimni tanlang")
    cat = (b.get("category") or "").strip() or ("Boshqa kirim" if kind == "kirim" else "Boshqa xarajat")
    method = b.get("method") or "naqd"
    if method not in MONEY_METHODS:
        raise ApiError("To'lov usuli noto'g'ri")
    amount = money(b.get("amount"))
    if amount <= 0:
        raise ApiError("Summani kiriting")
    sh = need_shift()
    if kind == "chiqim" and method == "naqd":
        have = shift_summary(sh)["expected_cash"]
        if amount > have:
            raise ApiError(f"Kassada naqd {fmt_sum(have)} so'm bor — undan ko'p chiqarib bo'lmaydi")
    CON.execute("""INSERT INTO cash_tx(shift_id,kind,category,method,amount,note,employee_id,created_at)
                   VALUES(?,?,?,?,?,?,?,?)""", (sh["id"], kind, cat, method, amount, b.get("note") or "", user["id"], now()))
    return {"ok": True}


def cash_balances():
    pay = {r["method"]: r["s"] for r in rows("SELECT method, COALESCE(SUM(amount),0) s FROM payments GROUP BY method")}
    tx = {(r["kind"], r["method"]): r["s"] for r in rows(
        "SELECT kind, method, COALESCE(SUM(amount),0) s FROM cash_tx GROUP BY kind, method")}
    opening = row("SELECT COALESCE(SUM(open_cash),0) s FROM shifts WHERE id=(SELECT MAX(id) FROM shifts)")["s"]
    out = {}
    for m in MONEY_METHODS:
        out[m] = pay.get(m, 0) + tx.get(("kirim", m), 0) - tx.get(("chiqim", m), 0)
    sh = current_shift()
    out["naqd_kassada"] = shift_summary(sh)["expected_cash"] if sh else None
    out["opening_last"] = opening
    return out


def api_cash(q):
    frm, to = period_args(q)
    p = (frm, to)
    tx = rows("""SELECT t.*, e.name AS employee_name FROM cash_tx t LEFT JOIN employees e ON e.id=t.employee_id
                 WHERE date(t.created_at) BETWEEN ? AND ? ORDER BY t.id DESC LIMIT 1000""", p)
    sales = rows("""SELECT p.method, COALESCE(SUM(p.amount),0) s FROM payments p
                    WHERE date(p.created_at) BETWEEN ? AND ? GROUP BY p.method""", p)
    by_cat = rows("""SELECT kind, category, COALESCE(SUM(amount),0) s, COUNT(*) n FROM cash_tx
                     WHERE date(created_at) BETWEEN ? AND ? GROUP BY kind, category ORDER BY s DESC""", p)
    return {"from": frm, "to": to, "tx": tx, "sales": sales, "by_category": by_cat, "balances": cash_balances()}


# ---------------------------------------------------------------- hisobotlar
def api_report_summary(q, user):
    frm, to = period_args(q)
    p = (frm, to)
    w = "o.status='yopilgan' AND date(o.closed_at) BETWEEN ? AND ?"
    head = row(f"""SELECT COALESCE(SUM(o.total),0) revenue, COALESCE(SUM(o.total-o.cost),0) profit,
        COALESCE(SUM(CASE WHEN o.type!='qaytarish' THEN 1 END),0) receipts,
        COALESCE(SUM(CASE WHEN o.type='zamena' THEN 1 END),0) zamena,
        COALESCE(SUM(CASE WHEN o.type='qaytarish' THEN -o.total END),0) refunds,
        COALESCE(SUM(CASE WHEN o.type='qaytarish' THEN 1 END),0) refund_count,
        COALESCE(SUM(o.discount),0) discount, COALESCE(SUM(o.cashback_used),0) cashback_used,
        COALESCE(SUM(o.paid_debt),0) debt_given FROM orders o WHERE {w}""", p)
    sales_only = row(f"SELECT COALESCE(SUM(o.total),0) s FROM orders o WHERE {w} AND o.type!='qaytarish'", p)["s"]
    head["avg_check"] = round(sales_only / head["receipts"]) if head["receipts"] else 0
    by_day = rows(f"""SELECT date(o.closed_at) d, COALESCE(SUM(o.total),0) revenue, COALESCE(SUM(o.total-o.cost),0) profit,
                      COUNT(CASE WHEN o.type!='qaytarish' THEN 1 END) n FROM orders o WHERE {w} GROUP BY d ORDER BY d""", p)
    by_method = rows("""SELECT p.method, COALESCE(SUM(p.amount),0) amount, COUNT(DISTINCT p.order_id) n FROM payments p
                        JOIN orders o ON o.id=p.order_id WHERE o.status='yopilgan' AND date(o.closed_at) BETWEEN ? AND ?
                        GROUP BY p.method ORDER BY amount DESC""", p)
    by_cashier = rows(f"""SELECT e.name, COUNT(CASE WHEN o.type!='qaytarish' THEN 1 END) n, COALESCE(SUM(o.total),0) revenue
                          FROM orders o LEFT JOIN employees e ON e.id=o.cashier_id WHERE {w} GROUP BY o.cashier_id ORDER BY revenue DESC""", p)
    by_type = rows(f"""SELECT o.type, COUNT(*) n, COALESCE(SUM(o.total),0) revenue FROM orders o WHERE {w} GROUP BY o.type""", p)
    top = rows(f"""SELECT i.name, i.category, SUM(i.qty) qty, SUM(i.price*i.qty) revenue, SUM(i.price*i.qty - i.cost*i.qty) profit
                   FROM order_items i JOIN orders o ON o.id=i.order_id WHERE {w} GROUP BY i.product_id ORDER BY revenue DESC LIMIT 30""", p)
    by_cat = rows(f"""SELECT CASE WHEN i.is_bonus=1 THEN 'bonus' ELSE i.category END cat, SUM(i.qty) qty,
                      SUM(i.price*i.qty) revenue, SUM(i.price*i.qty - i.cost*i.qty) profit
                      FROM order_items i JOIN orders o ON o.id=i.order_id WHERE {w} GROUP BY cat""", p)
    res = {"from": frm, "to": to, "head": head, "by_day": by_day, "by_method": by_method, "by_cashier": by_cashier,
           "by_type": by_type, "top": top, "by_category": by_cat, "can_profit": user["role"] == "admin"}
    if user["role"] != "admin":           # kassir foydani ko'rmaydi
        res["head"].pop("profit", None)
        for lst in (by_day, top, by_cat):
            for r in lst:
                r.pop("profit", None)
    return res


def api_report_debts():
    cust = rows("""SELECT c.id, c.name, c.phone, c.debt, GROUP_CONCAT(cars.plate, ', ') plates,
                   (SELECT MAX(created_at) FROM debt_tx t WHERE t.customer_id=c.id) last_tx
                   FROM customers c LEFT JOIN cars ON cars.customer_id=c.id WHERE COALESCE(c.debt,0)!=0
                   GROUP BY c.id ORDER BY c.debt DESC""")
    sup = rows("SELECT id, name, phone, debt FROM suppliers WHERE COALESCE(debt,0)!=0 ORDER BY debt DESC")
    return {"customers": cust, "suppliers": sup,
            "customer_total": sum(c["debt"] for c in cust if c["debt"] > 0),
            "supplier_total": sum(s["debt"] for s in sup if s["debt"] > 0)}


# ---------------------------------------------------------------- employees/settings

EMP_COLS = "id, name, role, phone, base_salary, active, COALESCE(login,'') AS login, (pass_hash IS NOT NULL) AS has_password"


def api_employee_save(b, eid=None):
    name = (b.get("name") or "").strip()
    role = b.get("role")
    if not name or role not in ROLES:
        raise ApiError("Ism va lavozim kerak")
    login = (b.get("login") or "").strip().lower() or None
    if role == "usta":
        login = None
    if login:
        if not re.fullmatch(r"[a-z0-9_.]{3,20}", login):
            raise ApiError("Login: 3–20 ta lotin harfi yoki raqam")
        if row("SELECT 1 FROM employees WHERE lower(login)=? AND id!=?", (login, eid or 0)):
            raise ApiError("Bu login band")
    vals = (name, role, b.get("phone") or "", int(float(b.get("base_salary") or 0)), 1 if b.get("active", 1) else 0, login)
    if eid:
        CON.execute("UPDATE employees SET name=?,role=?,phone=?,base_salary=?,active=?,login=? WHERE id=?", vals + (eid,))
    else:
        eid = CON.execute("INSERT INTO employees(name,role,phone,base_salary,active,login) VALUES(?,?,?,?,?,?)", vals).lastrowid
    pw = b.get("password") or ""
    if pw:
        if len(pw) < 4:
            raise ApiError("Parol kamida 4 ta belgi bo'lsin")
        CON.execute("UPDATE employees SET pass_hash=? WHERE id=?", (hash_pw(pw), eid))
        CON.execute("DELETE FROM sessions WHERE employee_id=?", (eid,))
    if login and not row("SELECT pass_hash FROM employees WHERE id=?", (eid,))["pass_hash"]:
        raise ApiError("Login berilgan xodimga parol ham kiriting")
    if not b.get("active", 1):
        CON.execute("DELETE FROM sessions WHERE employee_id=?", (eid,))
    return row(f"SELECT {EMP_COLS} FROM employees WHERE id=?", (eid,))


def public_settings():
    s = settings()
    s.pop("admin_pin", None)
    return s


def api_bootstrap(user):
    return {
        "settings": public_settings(),
        "employees": rows("SELECT id, name, role, active FROM employees ORDER BY role, name"),
        "products": products_full(),
        "car_models": rows("SELECT * FROM car_models ORDER BY sort, name"),
        "group_filters": GROUP_FILTERS,
        "methods": METHODS,
        "cash_cats": {"kirim": KIRIM_CATS, "chiqim": CHIQIM_CATS},
        "shift": (shift_summary(current_shift()) if current_shift() else None) if user["role"] in ("kassir", "admin") else None,
        "me": user_public(user),
        "version": VERSION["v"],
    }


# ---------------------------------------------------------------- HTTP

MIME = {".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml",
        ".png": "image/png", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon"}


class Handler(BaseHTTPRequestHandler):
    server_version = "Zamena/1.0"

    def log_message(self, fmt, *args):
        if os.environ.get("ZAMENA_LOG"):
            super().log_message(fmt, *args)

    def send_json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False, default=str).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if not n:
            return {}
        return json.loads(self.rfile.read(n) or b"{}")

    def do_GET(self):
        self.handle_any("GET")

    def do_POST(self):
        self.handle_any("POST")

    def do_PUT(self):
        self.handle_any("PUT")

    def do_DELETE(self):
        self.handle_any("DELETE")

    def serve_static(self, path):
        if path in ("/", "/planshet", "/kassa", "/planshet/", "/kassa/"):
            path = "/index.html"
        fp = os.path.normpath(os.path.join(STATIC, path.lstrip("/")))
        if not fp.startswith(STATIC) or not os.path.isfile(fp):
            self.send_error(404)
            return
        with open(fp, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(os.path.splitext(fp)[1], "application/octet-stream"))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def serve_image(self, pid):
        with LOCK:
            r = row("SELECT image FROM products WHERE id=?", (pid,))
        img = (r or {}).get("image") or ""
        mm = re.match(r"data:(image/[a-z]+);base64,(.*)", img, re.S)
        if not mm:
            return self.send_error(404)
        data = base64.b64decode(mm.group(2))
        self.send_response(200)
        self.send_header("Content-Type", mm.group(1))
        self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def handle_any(self, method):
        u = urlparse(self.path)
        path = u.path.rstrip("/") or "/"
        if not path.startswith("/api/"):
            if method == "GET":
                return self.serve_static(u.path)
            return self.send_error(405)
        q = parse_qs(u.query)
        m = re.fullmatch(r"/api/products/(\d+)/image", path)
        if m and method == "GET":
            return self.serve_image(int(m.group(1)))
        try:
            b = self.body() if method in ("POST", "PUT") else {}
            parts = path.split("/")[2:]
            with LOCK:
                try:
                    if path == "/api/login" and method == "POST":
                        res = api_login(b, self.client_address[0])
                        CON.commit()
                    else:
                        token = self.headers.get("X-Token", "")
                        user = session_user(token)
                        if not user:
                            raise ApiError("Avval tizimga kiring", 401)
                        check_access(user, token, method, parts)
                        res = route(method, path, q, b, user, token)
                        if user["role"] == "sotuvchi" and parts[0] in ("today", "orders"):
                            res = scrub(res)
                        if method != "GET":
                            CON.commit()
                            bump()
                except Exception:
                    CON.rollback()
                    raise
            self.send_json(res)
        except ApiError as e:
            self.send_json({"error": str(e)}, e.code)
        except (ValueError, KeyError, TypeError) as e:
            self.send_json({"error": f"Noto'g'ri ma'lumot: {e}"}, 400)
        except Exception as e:  # noqa
            import traceback
            traceback.print_exc()
            self.send_json({"error": f"Server xatosi: {e}"}, 500)


def route(method, path, q, b, user, token):
    parts = path.split("/")[2:]  # after /api/
    head = parts[0]
    rid = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
    action = parts[2] if len(parts) > 2 else None

    if head == "version":
        return {"v": VERSION["v"]}
    if head == "me":
        return user_public(user)
    if head == "logout":
        CON.execute("DELETE FROM sessions WHERE token=?", (token,))
        LOOKED.pop(token, None)
        return {"ok": True}
    if head == "bootstrap":
        return api_bootstrap(user)
    if head == "cars":
        if method == "GET" and len(parts) > 1 and parts[1] == "lookup":
            return api_car_lookup(q, token)
        if method == "GET" and rid:
            return car_full(rid)
        if method == "POST":
            return api_car_create(b, token)
        if method == "PUT" and rid:
            return api_car_update(rid, b)
    if head == "customers":
        if method == "GET" and rid:
            return api_customer(rid)
        if method == "GET":
            return api_customers(q)
        if method == "PUT" and rid:
            CON.execute("UPDATE customers SET name=?, phone=?, note=? WHERE id=?",
                        (b.get("name", ""), norm_phone(b.get("phone")), b.get("note", ""), rid))
            return api_customer(rid)
        if method == "POST" and not rid:
            return api_customer_create(b)
        if method == "POST" and rid and action == "pay":
            return api_customer_pay(rid, b, user)
        if method == "POST" and rid and action == "debt":
            return api_customer_debt_adjust(rid, b, user)
        if method == "POST" and rid and action == "cashback":
            amt = int(float(b.get("amount") or 0))
            CON.execute("UPDATE customers SET cashback=MAX(cashback+?,0) WHERE id=?", (amt, rid))
            CON.execute("INSERT INTO cashback_tx(customer_id,amount,kind,created_at) VALUES(?,?,?,?)",
                        (rid, amt, "qo'lda", now()))
            return api_customer(rid)
    if head == "car_models":
        if method == "PUT" and rid:
            if b.get("grp") not in GROUP_FILTERS:
                raise ApiError("Guruh noto'g'ri")
            CON.execute("UPDATE car_models SET grp=? WHERE id=?", (b["grp"], rid))
        if method == "POST":
            name = (b.get("name") or "").strip()
            if not name or b.get("grp") not in GROUP_FILTERS:
                raise ApiError("Model nomi va guruhi kerak")
            CON.execute("INSERT OR IGNORE INTO car_models(name,sort,grp) VALUES(?,1000,?)", (name, b["grp"]))
        return rows("SELECT * FROM car_models ORDER BY sort, name")
    if head == "products":
        if method == "GET":
            return products_full()
        if method == "POST" and rid and action == "models":
            return api_product_add_model(rid, b)
        if method == "POST":
            return api_product_save(b)
        if method == "PUT" and rid:
            return api_product_save(b, rid)
    if head == "purchases":
        if method == "POST":
            return api_purchase(b, user)
        if rid:
            return api_purchase_get(rid)
        return api_purchases(q)
    if head == "suppliers":
        if method == "GET" and rid:
            return api_supplier(rid)
        if method == "GET":
            return api_suppliers(q)
        if method == "POST" and rid and action == "pay":
            return api_supplier_pay(rid, b, user)
        if method == "POST":
            return api_supplier_save(b, None, user)
        if method == "PUT" and rid:
            return api_supplier_save(b, rid, user)
    if head == "shift":
        sub = parts[1] if len(parts) > 1 else ""
        if method == "POST" and sub == "open":
            return api_shift_open(b, user)
        if method == "POST" and sub == "close":
            return api_shift_close(b, user)
        sh = current_shift()
        return shift_summary(sh) if sh else None
    if head == "shifts":
        return api_shift(rid) if rid else api_shifts()
    if head == "cash":
        if method == "POST":
            return api_cash_add(b, user)
        return api_cash(q)
    if head == "stock_moves" and method == "GET":
        return rows("""SELECT m.*, p.name, p.unit FROM stock_moves m JOIN products p ON p.id=m.product_id
                       ORDER BY m.id DESC LIMIT 300""")
    if head == "orders":
        if method == "GET" and rid:
            return load_order(rid)
        if method == "GET":
            return api_orders(q)
        if method == "POST" and not rid:
            return api_order_create(b, user)
        if method == "PUT" and rid:
            return api_order_update(rid, b)
        if method == "POST" and rid and action == "close":
            return api_order_close(rid, b, user)
        if method == "POST" and rid and action == "cancel":
            return api_order_cancel(rid)
        if method == "POST" and rid and action == "refund":
            return api_order_refund(rid, b, user)
    if head == "today":
        return api_today()
    if head == "inventories":
        if method == "GET" and rid:
            return api_inventory(rid)
        if method == "GET":
            return rows("""SELECT inv.*, (SELECT COUNT(*) FROM inventory_items WHERE inventory_id=inv.id) n
                           FROM inventories inv ORDER BY id DESC""")
        if method == "POST" and not rid:
            return api_inventory_create(b)
        if method == "PUT" and rid:
            return api_inventory_save(rid, b)
        if method == "POST" and rid and action == "close":
            return api_inventory_close(rid)
    if head == "employees":
        if method == "GET":
            return rows(f"SELECT {EMP_COLS} FROM employees ORDER BY role, name")
        if method == "POST":
            return api_employee_save(b)
        if method == "PUT" and rid:
            return api_employee_save(b, rid)
    if head == "reports":
        sub = parts[1] if len(parts) > 1 else ""
        if sub == "profit":
            return api_report_profit(q)
        if sub == "payroll":
            return api_report_payroll(q)
        if sub == "summary":
            return api_report_summary(q, user)
        if sub == "debts":
            return api_report_debts()
    if head == "salary":
        if method == "POST":
            return api_salary_pay(b, user)
        return rows("""SELECT sp.*, e.name FROM salary_payments sp JOIN employees e ON e.id=sp.employee_id
                       ORDER BY sp.id DESC LIMIT 200""")
    if head == "expenses":
        if method == "POST":
            return api_cash_add({"kind": "chiqim", "category": b.get("category") or "Boshqa xarajat",
                                 "method": b.get("method") or "naqd", "amount": b.get("amount"), "note": b.get("title")}, user)
        frm, to = period_args(q)
        return rows(f"""SELECT id, COALESCE(NULLIF(note,''), category) AS title, category, amount, created_at FROM cash_tx
                        WHERE kind='chiqim' AND date(created_at) BETWEEN ? AND ?
                        AND category IN ({','.join('?' * len(EXPENSE_CATS))}) ORDER BY id DESC""", (frm, to) + EXPENSE_CATS)
    if head == "settings":
        if method == "GET":
            return public_settings()
        if method == "PUT":
            for k, v in b.items():
                if k in DEFAULT_SETTINGS:
                    CON.execute("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)", (k, str(v)))
            return public_settings()
    raise ApiError("Topilmadi", 404)


def local_ips():
    import socket
    ips = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.add(s.getsockname()[0])
        s.close()
    except OSError:
        pass
    return sorted(ips) or ["127.0.0.1"]


def main():
    init_db()
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("=" * 56)
    print(" Moy almashtirish tizimi ishga tushdi")
    for ip in local_ips():
        print(f"   Planshet:  http://{ip}:{PORT}/planshet")
        print(f"   Kassa PC:  http://{ip}:{PORT}/kassa")
    print(f"   Shu kompyuterda: http://localhost:{PORT}/kassa")
    print(f" Baza: {DB_PATH}")
    print(" Birinchi kirish: admin / 1234 (Xodimlar bo'limida parolni almashtiring)")
    print(" To'xtatish: Ctrl+C")
    print("=" * 56)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    sys.exit(main())
