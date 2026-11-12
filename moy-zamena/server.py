#!/usr/bin/env python3
"""Moy almashtirish (zamena) tizimi — server.

Do'kondagi kompyuterda ishga tushiriladi. Planshet va kassa kompyuteri
bir Wi-Fi tarmog'ida brauzer orqali ulanadi:
    http://<kompyuter-IP>:8090/planshet
    http://<kompyuter-IP>:8090/kassa

Faqat Python standart kutubxonasi ishlatiladi (o'rnatish shart emas).
Ma'lumotlar bazasi: data/zamena.db (SQLite).
"""
import json
import os
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
    "admin_pin": "",                  # hisobot/oylik/sozlamalar uchun PIN
}

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS employees(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL,
  phone TEXT DEFAULT '', base_salary INTEGER DEFAULT 0, active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS customers(
  id INTEGER PRIMARY KEY, name TEXT DEFAULT '', phone TEXT DEFAULT '',
  cashback INTEGER DEFAULT 0, note TEXT DEFAULT '', created_at TEXT);
CREATE TABLE IF NOT EXISTS cars(
  id INTEGER PRIMARY KEY, plate TEXT UNIQUE NOT NULL, model TEXT DEFAULT '',
  customer_id INTEGER, last_mileage INTEGER DEFAULT 0, created_at TEXT,
  transmission TEXT DEFAULT '', color TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
  unit TEXT DEFAULT 'dona', cost REAL DEFAULT 0, price INTEGER DEFAULT 0,
  stock REAL DEFAULT 0, barcode TEXT DEFAULT '', active INTEGER DEFAULT 1, kind TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS car_models(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, sort INTEGER DEFAULT 100);
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
CREATE INDEX IF NOT EXISTS ix_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS ix_orders_closed ON orders(closed_at);
CREATE INDEX IF NOT EXISTS ix_items_order ON order_items(order_id);
"""

# name, category, kind, unit, cost, price, mos mashinalar (namuna — o'zingiznikiga almashtiring)
SEED_PRODUCTS = [
    ("Motor moyi 5W-30 (1 L, quyma)", "moy", "motor", "litr", 70000, 95000, []),
    ("Motor moyi 5W-40 (1 L, quyma)", "moy", "motor", "litr", 65000, 90000, []),
    ("Motor moyi 10W-40 (1 L, quyma)", "moy", "motor", "litr", 45000, 65000, []),
    ("Karobka moyi (1 L)", "moy", "karobka", "litr", 60000, 85000, []),
    ("Moy filtri (Cobalt/Nexia 3/Gentra/Lacetti)", "filtr", "moy", "dona", 32000, 30000,
     ["Cobalt", "Nexia 3", "Gentra", "Lacetti", "Nexia 2"]),
    ("Moy filtri (Spark/Matiz/Damas)", "filtr", "moy", "dona", 28000, 28000, ["Spark", "Matiz", "Damas", "Labo"]),
    ("Havo filtri (Cobalt/Nexia 3)", "filtr", "havo", "dona", 35000, 35000, ["Cobalt", "Nexia 3"]),
    ("Havo filtri (Gentra/Lacetti)", "filtr", "havo", "dona", 38000, 38000, ["Gentra", "Lacetti"]),
    ("Salon filtri (Cobalt/Nexia 3)", "filtr", "salon", "dona", 30000, 30000, ["Cobalt", "Nexia 3"]),
    ("Salon filtri (Gentra/Lacetti)", "filtr", "salon", "dona", 30000, 30000, ["Gentra", "Lacetti"]),
    ("Yoqilg'i filtri", "filtr", "yoqilgi", "dona", 40000, 45000, []),
    ("Antifriz (1 L)", "boshqa", "", "litr", 18000, 25000, []),
    ("Tormoz suyuqligi", "boshqa", "", "dona", 25000, 35000, []),
    ("Salfetka / ochistitel", "boshqa", "", "dona", 5000, 10000, []),
    ("Moy almashtirish xizmati", "xizmat", "", "dona", 0, 0, []),
]

CAR_MODELS = ["Cobalt", "Nexia 3", "Gentra", "Lacetti", "Spark", "Damas", "Matiz", "Nexia 2", "Malibu",
              "Tracker", "Onix", "Captiva", "Labo", "Monza", "Equinox", "Kia K5", "Hyundai Elantra",
              "BYD Chazor", "BYD Song Plus", "Chery Tiggo", "Haval", "Jetour"]

SEED_EMPLOYEES = [
    ("Usta 1", "usta"), ("Usta 2", "usta"),
    ("Zamena sotuvchisi", "sotuvchi"), ("Kassir", "kassir"),
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
        for n, c, k, u, cost, price, models in SEED_PRODUCTS:
            pid = CON.execute("INSERT INTO products(name,category,kind,unit,cost,price,stock) VALUES(?,?,?,?,?,?,?)",
                              (n, c, k, u, cost, price, 0 if c == "xizmat" else 50)).lastrowid
            for m in models:
                CON.execute("INSERT OR IGNORE INTO product_models(product_id,model) VALUES(?,?)", (pid, m))
    if not CON.execute("SELECT 1 FROM car_models LIMIT 1").fetchone():
        for i, m in enumerate(CAR_MODELS):
            CON.execute("INSERT OR IGNORE INTO car_models(name,sort) VALUES(?,?)", (m, i))
    if not CON.execute("SELECT 1 FROM employees LIMIT 1").fetchone():
        for n, r in SEED_EMPLOYEES:
            CON.execute("INSERT INTO employees(name,role) VALUES(?,?)", (n, r))
    CON.commit()


def migrate():
    """Eski bazaga yangi ustunlarni qo'shadi."""
    for table, col, ddl in (("cars", "transmission", "TEXT DEFAULT ''"), ("cars", "color", "TEXT DEFAULT ''"),
                            ("products", "kind", "TEXT DEFAULT ''")):
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


def api_car_lookup(q):
    plate = norm_plate(q.get("plate", [""])[0])
    if not plate:
        raise ApiError("Raqam kiriting")
    car = row("SELECT id FROM cars WHERE plate=?", (plate,))
    return {"plate": plate, "car": car_full(car["id"]) if car else None}


def clean_car_fields(b):
    model = (b.get("model") or "").strip()
    tr = (b.get("transmission") or "").upper()
    if tr not in ("", "AT", "MT"):
        raise ApiError("Uzatmalar qutisi A/T yoki M/T bo'lishi kerak")
    if model:
        CON.execute("INSERT OR IGNORE INTO car_models(name,sort) VALUES(?,1000)", (model,))
    return model, tr, (b.get("color") or "").strip()


def require_phone(b):
    phone = norm_phone(b.get("phone"))
    if not re.fullmatch(r"998\d{9}", phone):
        raise ApiError("Mijoz telefon raqamini to'liq kiriting (+998 XX XXX XX XX)")
    return phone


def api_car_create(b):
    plate = norm_plate(b.get("plate"))
    if len(plate) < 4:
        raise ApiError("Mashina raqami noto'g'ri")
    if row("SELECT 1 FROM cars WHERE plate=?", (plate,)):
        raise ApiError("Bu raqam bazada bor")
    phone = require_phone(b)
    model, tr, color = clean_car_fields(b)
    cid = get_or_create_customer((b.get("customer_name") or "").strip(), phone)
    cur = CON.execute("INSERT INTO cars(plate,model,transmission,color,customer_id,created_at) VALUES(?,?,?,?,?,?)",
                      (plate, model, tr, color, cid, now()))
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
        WHERE ?='' OR c.name LIKE ? OR c.phone LIKE ? OR cars.plate LIKE ?
        GROUP BY c.id ORDER BY c.id DESC LIMIT 200""", (s, like, like, pl))


def api_customer(cid):
    c = row("SELECT * FROM customers WHERE id=?", (cid,))
    if not c:
        raise ApiError("Topilmadi", 404)
    c["cars"] = rows("SELECT * FROM cars WHERE customer_id=?", (cid,))
    c["orders"] = rows("""SELECT o.*, cars.plate FROM orders o LEFT JOIN cars ON cars.id=o.car_id
                          WHERE o.customer_id=? AND o.status!='bekor' ORDER BY o.id DESC LIMIT 50""", (cid,))
    c["cashback_tx"] = rows("SELECT * FROM cashback_tx WHERE customer_id=? ORDER BY id DESC LIMIT 50", (cid,))
    return c


# ---------------------------------------------------------------- products/stock

def api_product_save(b, pid=None):
    name = (b.get("name") or "").strip()
    if not name:
        raise ApiError("Nomi kerak")
    cat = b.get("category") or "boshqa"
    if cat not in ("moy", "filtr", "boshqa", "xizmat"):
        raise ApiError("Kategoriya noto'g'ri")
    vals = (name, cat, b.get("unit") or "dona", float(b.get("cost") or 0),
            int(float(b.get("price") or 0)), (b.get("barcode") or "").strip(), 1 if b.get("active", 1) else 0,
            (b.get("kind") or "").strip())
    if pid:
        CON.execute("UPDATE products SET name=?,category=?,unit=?,cost=?,price=?,barcode=?,active=?,kind=? WHERE id=?",
                    vals + (pid,))
    else:
        cur = CON.execute("""INSERT INTO products(name,category,unit,cost,price,barcode,active,kind,stock)
                             VALUES(?,?,?,?,?,?,?,?,0)""", vals)
        pid = cur.lastrowid
        if float(b.get("stock") or 0):
            move_stock(pid, float(b["stock"]), "prixod", "boshlang'ich", float(b.get("cost") or 0))
    if "models" in b:
        CON.execute("DELETE FROM product_models WHERE product_id=?", (pid,))
        for m in b["models"] or []:
            if str(m).strip():
                CON.execute("INSERT OR IGNORE INTO product_models(product_id,model) VALUES(?,?)", (pid, str(m).strip()))
    return products_full(pid)[0]


def products_full(pid=None):
    ps = rows("SELECT * FROM products" + (" WHERE id=?" if pid else "") + " ORDER BY category, kind, name",
              (pid,) if pid else ())
    pm = {}
    for r in rows("SELECT * FROM product_models"):
        pm.setdefault(r["product_id"], []).append(r["model"])
    for p in ps:
        p["models"] = sorted(pm.get(p["id"], []))
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


def api_purchase(b):
    items = b.get("items") or []
    if not items:
        raise ApiError("Mahsulot yo'q")
    ref = (b.get("supplier") or "prixod").strip()
    for it in items:
        pid = int(it["product_id"])
        qty = float(it.get("qty") or 0)
        cost = float(it.get("cost") or 0)
        if qty <= 0:
            continue
        p = row("SELECT * FROM products WHERE id=?", (pid,))
        old_stock = max(p["stock"], 0)
        if cost > 0:
            new_cost = (old_stock * p["cost"] + qty * cost) / (old_stock + qty)  # o'rtacha tannarx
            CON.execute("UPDATE products SET cost=? WHERE id=?", (round(new_cost, 2), pid))
        if it.get("price"):
            CON.execute("UPDATE products SET price=? WHERE id=?", (int(float(it["price"])), pid))
        move_stock(pid, qty, "prixod", ref, cost or p["cost"])
    return {"ok": True}


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


def api_order_create(b):
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
        return api_order_close(oid, b["close"])
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


def api_order_close(oid, b):
    o = row("SELECT * FROM orders WHERE id=?", (oid,))
    if not o or o["status"] in ("yopilgan", "bekor"):
        raise ApiError("Zakaz yopiq yoki topilmadi")
    s = settings()
    discount = max(int(float(b.get("discount") or 0)), 0)
    due = max(o["subtotal"] - discount, 0)
    cb_used = max(int(float(b.get("cashback_used") or 0)), 0)
    cust = row("SELECT * FROM customers WHERE id=?", (o["customer_id"],)) if o["customer_id"] else None
    if cb_used:
        if not cust:
            raise ApiError("Keshbek uchun mijoz kerak")
        if cb_used > cust["cashback"]:
            raise ApiError("Keshbek balansi yetarli emas")
        cb_used = min(cb_used, due)
    total = due - cb_used
    cash = int(float(b.get("paid_cash") or 0))
    card = int(float(b.get("paid_card") or 0))
    if cash == 0 and card == 0:
        if b.get("method") == "karta":
            card = total
        else:
            cash = total
    over = cash + card - total
    if over > 0 and cash >= over:  # mijozga qaytim berildi
        cash -= over
    if cash + card != total:
        raise ApiError(f"To'lov summasi {total} bo'lishi kerak (kiritildi {cash + card})")
    earned = 0
    if cust:
        earned = int(total * setting_num(s, "cashback_percent") / 100)
        delta = earned - cb_used
        CON.execute("UPDATE customers SET cashback=cashback+? WHERE id=?", (delta, cust["id"]))
        if cb_used:
            CON.execute("INSERT INTO cashback_tx(customer_id,order_id,amount,kind,created_at) VALUES(?,?,?,?,?)",
                        (cust["id"], oid, -cb_used, "ishlatildi", now()))
        if earned:
            CON.execute("INSERT INTO cashback_tx(customer_id,order_id,amount,kind,created_at) VALUES(?,?,?,?,?)",
                        (cust["id"], oid, earned, "yig'ildi", now()))
    CON.execute("""UPDATE orders SET status='yopilgan', discount=?, cashback_used=?, cashback_earned=?,
                   total=?, paid_cash=?, paid_card=?, cashier_id=?, closed_at=? WHERE id=?""",
                (discount, cb_used, earned, total, cash, card, b.get("cashier_id"), now(), oid))
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
    orders = [load_order(r["id"]) for r in rows(
        "SELECT id FROM orders WHERE type='zamena' AND status!='bekor' AND date(created_at)=? ORDER BY id DESC", (d,))]
    return {"date": d, "count": total["n"], "oil": total["oil"], "by_master": by_master,
            "by_master_month": by_master_month, "orders": orders}


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
    expenses = row("SELECT COALESCE(SUM(amount),0) s FROM expenses WHERE date(created_at) BETWEEN ? AND ?", p)["s"]
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
    for e in rows("SELECT * FROM employees ORDER BY role, name"):
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


def api_salary_pay(b):
    CON.execute("""INSERT INTO salary_payments(employee_id,period_from,period_to,amount,note,created_at)
                   VALUES(?,?,?,?,?,?)""", (int(b["employee_id"]), b["period_from"], b["period_to"],
                                           int(float(b["amount"])), b.get("note") or "", now()))
    return {"ok": True}


# ---------------------------------------------------------------- employees/settings

def api_employee_save(b, eid=None):
    name = (b.get("name") or "").strip()
    role = b.get("role")
    if not name or role not in ("usta", "sotuvchi", "kassir"):
        raise ApiError("Ism va lavozim kerak")
    vals = (name, role, b.get("phone") or "", int(float(b.get("base_salary") or 0)), 1 if b.get("active", 1) else 0)
    if eid:
        CON.execute("UPDATE employees SET name=?,role=?,phone=?,base_salary=?,active=? WHERE id=?", vals + (eid,))
    else:
        eid = CON.execute("INSERT INTO employees(name,role,phone,base_salary,active) VALUES(?,?,?,?,?)", vals).lastrowid
    return row("SELECT * FROM employees WHERE id=?", (eid,))


def public_settings():
    s = settings()
    s["has_pin"] = bool(s.pop("admin_pin", ""))
    return s


def api_bootstrap():
    return {
        "settings": public_settings(),
        "employees": rows("SELECT * FROM employees ORDER BY role, name"),
        "products": products_full(),
        "car_models": rows("SELECT * FROM car_models ORDER BY sort, name"),
        "version": VERSION["v"],
    }


# ---------------------------------------------------------------- HTTP

ADMIN_PREFIXES = ("/api/reports", "/api/salary", "/api/settings", "/api/expenses")
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

    def handle_any(self, method):
        u = urlparse(self.path)
        path = u.path.rstrip("/") or "/"
        if not path.startswith("/api/"):
            if method == "GET":
                return self.serve_static(u.path)
            return self.send_error(405)
        q = parse_qs(u.query)
        try:
            b = self.body() if method in ("POST", "PUT") else {}
            if path.startswith(ADMIN_PREFIXES) and not (method == "GET" and path == "/api/settings"):
                pin = settings().get("admin_pin") or ""
                if pin and self.headers.get("X-Pin", "") != pin:
                    raise ApiError("PIN kod noto'g'ri", 403)
            with LOCK:
                try:
                    res = route(method, path, q, b)
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


def route(method, path, q, b):
    parts = path.split("/")[2:]  # after /api/
    head = parts[0]
    rid = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
    action = parts[2] if len(parts) > 2 else None

    if head == "version":
        return {"v": VERSION["v"]}
    if head == "bootstrap":
        return api_bootstrap()
    if head == "cars":
        if method == "GET" and len(parts) > 1 and parts[1] == "lookup":
            return api_car_lookup(q)
        if method == "GET" and rid:
            return car_full(rid)
        if method == "POST":
            return api_car_create(b)
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
        if method == "POST" and rid and action == "cashback":
            amt = int(float(b.get("amount") or 0))
            CON.execute("UPDATE customers SET cashback=MAX(cashback+?,0) WHERE id=?", (amt, rid))
            CON.execute("INSERT INTO cashback_tx(customer_id,amount,kind,created_at) VALUES(?,?,?,?)",
                        (rid, amt, "qo'lda", now()))
            return api_customer(rid)
    if head == "car_models":
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
    if head == "purchases" and method == "POST":
        return api_purchase(b)
    if head == "stock_moves" and method == "GET":
        return rows("""SELECT m.*, p.name, p.unit FROM stock_moves m JOIN products p ON p.id=m.product_id
                       ORDER BY m.id DESC LIMIT 300""")
    if head == "orders":
        if method == "GET" and rid:
            return load_order(rid)
        if method == "GET":
            return api_orders(q)
        if method == "POST" and not rid:
            return api_order_create(b)
        if method == "PUT" and rid:
            return api_order_update(rid, b)
        if method == "POST" and rid and action == "close":
            return api_order_close(rid, b)
        if method == "POST" and rid and action == "cancel":
            return api_order_cancel(rid)
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
            return rows("SELECT * FROM employees ORDER BY role, name")
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
    if head == "salary":
        if method == "POST":
            return api_salary_pay(b)
        return rows("""SELECT sp.*, e.name FROM salary_payments sp JOIN employees e ON e.id=sp.employee_id
                       ORDER BY sp.id DESC LIMIT 200""")
    if head == "expenses":
        if method == "POST":
            CON.execute("INSERT INTO expenses(title,amount,created_at) VALUES(?,?,?)",
                        (b.get("title") or "", int(float(b.get("amount") or 0)), now()))
            return {"ok": True}
        frm, to = period_args(q)
        return rows("SELECT * FROM expenses WHERE date(created_at) BETWEEN ? AND ? ORDER BY id DESC", (frm, to))
    if head == "settings":
        if method == "GET":
            return public_settings()
        if method == "PUT":
            for k, v in b.items():
                if k in DEFAULT_SETTINGS:
                    CON.execute("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)", (k, str(v)))
            return public_settings()
    if head == "pin" and method == "POST":
        pin = settings().get("admin_pin") or ""
        if pin and b.get("pin") != pin:
            raise ApiError("PIN kod noto'g'ri", 403)
        return {"ok": True}
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
    print(" To'xtatish: Ctrl+C")
    print("=" * 56)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    sys.exit(main())
