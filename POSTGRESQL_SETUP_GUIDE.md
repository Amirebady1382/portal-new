# 🐘 راهنمای نصب و راه‌اندازی PostgreSQL

این راهنما مراحل کامل نصب PostgreSQL و مایگریشن از SQLite را شرح می‌دهد.

## 📋 فهرست مطالب
1. [نصب PostgreSQL روی Ubuntu](#نصب-postgresql-روی-ubuntu)
2. [تنظیمات اولیه](#تنظیمات-اولیه)
3. [نصب پکیج‌های Node.js](#نصب-پکیجهای-nodejs)
4. [تنظیم متغیرهای محیطی](#تنظیم-متغیرهای-محیطی)
5. [ایجاد Schema](#ایجاد-schema)
6. [مایگریشن داده‌ها](#مایگریشن-دادهها)
7. [تست و راه‌اندازی](#تست-و-راهاندازی)
8. [عیب‌یابی](#عیبیابی)

---

## 🔧 نصب PostgreSQL روی Ubuntu

### مرحله 1: به‌روزرسانی سیستم

```bash
sudo apt update
sudo apt upgrade -y
```

### مرحله 2: نصب PostgreSQL

```bash
# نصب PostgreSQL (آخرین نسخه پایدار)
sudo apt install postgresql postgresql-contrib -y

# بررسی نصب و نسخه
psql --version
```

**خروجی مورد انتظار:**
```
psql (PostgreSQL) 14.x یا بالاتر
```

### مرحله 3: شروع سرویس PostgreSQL

```bash
# شروع سرویس
sudo systemctl start postgresql

# فعال‌سازی اتوماتیک در هنگام راه‌اندازی سیستم
sudo systemctl enable postgresql

# بررسی وضعیت
sudo systemctl status postgresql
```

**خروجی مورد انتظار:**
```
● postgresql.service - PostgreSQL RDBMS
   Loaded: loaded
   Active: active (running)
```

---

## ⚙️ تنظیمات اولیه

### مرحله 4: ایجاد دیتابیس و کاربر

```bash
# ورود به PostgreSQL با کاربر پیش‌فرض
sudo -u postgres psql

# در محیط PostgreSQL، دستورات زیر را اجرا کنید:
```

```sql
-- ایجاد کاربر جدید (username و password را تغییر دهید)
CREATE USER portal_user WITH PASSWORD 'your_secure_password_here';

-- ایجاد دیتابیس
CREATE DATABASE portal_db WITH OWNER portal_user ENCODING 'UTF8';

-- اعطای تمام دسترسی‌ها
GRANT ALL PRIVILEGES ON DATABASE portal_db TO portal_user;

-- خروج
\q
```

### مرحله 5: تنظیم دسترسی از راه دور (اختیاری)

اگر می‌خواهید از خارج سرور به PostgreSQL وصل شوید:

```bash
# ویرایش فایل تنظیمات PostgreSQL
sudo nano /etc/postgresql/14/main/postgresql.conf
```

**خط زیر را پیدا کرده و تغییر دهید:**
```conf
# قبل:
#listen_addresses = 'localhost'

# بعد (برای دسترسی از همه IP ها):
listen_addresses = '*'
```

**ویرایش فایل احراز هویت:**
```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

**در انتهای فایل اضافه کنید:**
```conf
# اجازه اتصال از شبکه محلی
host    all             all             0.0.0.0/0               md5
```

**راه‌اندازی مجدد PostgreSQL:**
```bash
sudo systemctl restart postgresql
```

⚠️ **هشدار امنیتی:** در محیط production از firewall استفاده کنید و فقط IP های مورد نیاز را مجاز کنید.

---

## 📦 نصب پکیج‌های Node.js

### مرحله 6: نصب Dependencies

در پوشه پروژه خود:

```bash
npm install
```

این دستور تمام پکیج‌های جدید از جمله `pg` و `postgres` را نصب می‌کند.

---

## 🔐 تنظیم متغیرهای محیطی

### مرحله 7: ویرایش فایل `.env`

```bash
nano .env
```

**اضافه کردن خط زیر به فایل `.env`:**

```env
# PostgreSQL Connection String
POSTGRES_URL=postgresql://portal_user:your_secure_password_here@localhost:5432/portal_db

# برای production روی سرور از IP سرور استفاده کنید:
# POSTGRES_URL=postgresql://portal_user:password@YOUR_SERVER_IP:5432/portal_db
```

**فرمت کلی:**
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

**نکات مهم:**
- `user`: نام کاربری که ساختید (مثلاً: `portal_user`)
- `password`: رمز عبوری که تعیین کردید
- `host`: آدرس سرور (`localhost` یا IP سرور)
- `port`: پورت PostgreSQL (پیش‌فرض: `5432`)
- `database`: نام دیتابیس (`portal_db`)

---

## 🗄️ ایجاد Schema

### مرحله 8: تست اتصال

```bash
npm run db:test
```

**خروجی مورد انتظار:**
```
✅ SQLite connected successfully
✅ PostgreSQL connected successfully
🎉 Both databases are ready!
```

### مرحله 9: ایجاد جداول در PostgreSQL

```bash
npm run db:push:pg
```

این دستور تمام جداول را در PostgreSQL ایجاد می‌کند بر اساس schema جدید.

**خروجی مورد انتظار:**
```
✅ Changes applied successfully!
```

---

## 🔄 مایگریشن داده‌ها

### مرحله 10: انتقال داده‌ها از SQLite به PostgreSQL

```bash
npm run db:migrate
```

این اسکریپت:
1. ✅ Backup از SQLite می‌گیرد
2. ✅ تمام جداول را به ترتیب صحیح منتقل می‌کند
3. ✅ Boolean و DateTime ها را تبدیل می‌کند
4. ✅ Sequence های SERIAL را به‌روز می‌کند
5. ✅ گزارش کامل migration را ذخیره می‌کند

**خروجی نمونه:**
```
🔍 Testing database connections...
✅ SQLite connection successful
✅ PostgreSQL connection successful
✅ PostgreSQL schema exists
💾 Creating backup...
✅ Backup created: database.db.backup-1729512345

🚀 Starting migration...
📦 Migrating table: users
   Found 15 rows
   ✅ Migrated 15/15 rows

📦 Migrating table: companies
   Found 10 rows
   ✅ Migrated 10/10 rows

... [تمام جداول]

🎉 Migration completed successfully!
```

---

## ✅ تست و راه‌اندازی

### مرحله 11: بررسی داده‌ها

وارد PostgreSQL شوید و داده‌ها را بررسی کنید:

```bash
psql -U portal_user -d portal_db
```

```sql
-- بررسی تعداد کاربران
SELECT COUNT(*) FROM users;

-- بررسی تعداد شرکت‌ها
SELECT COUNT(*) FROM companies;

-- بررسی لیست جداول
\dt

-- خروج
\q
```

### مرحله 12: سوئیچ به PostgreSQL

پس از اطمینان از صحت داده‌ها، DATABASE_URL را تغییر دهید:

**ویرایش `.env`:**
```env
# قبلی (SQLite)
# DATABASE_URL=file:database.db

# جدید (PostgreSQL)
DATABASE_URL=postgresql://portal_user:your_secure_password_here@localhost:5432/portal_db
```

یا به صورت ساده‌تر:
```env
DATABASE_URL=${POSTGRES_URL}
```

### مرحله 13: راه‌اندازی مجدد Application

```bash
# حالت Development
npm run dev

# حالت Production
npm run build
npm start
```

---

## 🔍 عیب‌یابی

### مشکل: "ECONNREFUSED" یا "connection refused"

**علت:** PostgreSQL در حال اجرا نیست.

**راه‌حل:**
```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

---

### مشکل: "password authentication failed"

**علت:** نام کاربری یا رمز عبور اشتباه است.

**راه‌حل:**
1. رمز عبور را در PostgreSQL تغییر دهید:
```bash
sudo -u postgres psql
```
```sql
ALTER USER portal_user WITH PASSWORD 'new_password';
\q
```
2. فایل `.env` را به‌روز کنید

---

### مشکل: "database does not exist"

**علت:** دیتابیس ایجاد نشده است.

**راه‌حل:**
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE portal_db WITH OWNER portal_user ENCODING 'UTF8';
\q
```

---

### مشکل: "relation does not exist"

**علت:** جداول ایجاد نشده‌اند.

**راه‌حل:**
```bash
npm run db:push:pg
```

---

### مشکل: Migration با خطا مواجه می‌شود

**راه‌حل:**
1. لاگ migration را بررسی کنید: `migration-log-[timestamp].json`
2. جدول مشکل‌دار را manually بررسی کنید
3. در صورت نیاز، جدول را خالی کنید و دوباره migration کنید:

```sql
TRUNCATE TABLE table_name CASCADE;
```

---

## 🔒 نکات امنیتی مهم

### 1. رمز عبور قوی
```bash
# تولید رمز عبور تصادفی
openssl rand -base64 32
```

### 2. تنظیم Firewall
```bash
# اجازه دسترسی فقط به IP خاص
sudo ufw allow from YOUR_IP to any port 5432
```

### 3. SSL/TLS (برای production)
در connection string:
```
postgresql://user:pass@host:5432/db?sslmode=require
```

### 4. Backup منظم
```bash
# Backup دستی
pg_dump -U portal_user -d portal_db -F c -f backup_$(date +%Y%m%d).dump

# Restore
pg_restore -U portal_user -d portal_db backup_20241021.dump
```

---

## 📊 مانیتورینگ و نگهداری

### بررسی حجم دیتابیس
```sql
SELECT pg_size_pretty(pg_database_size('portal_db'));
```

### بررسی کانکشن‌های فعال
```sql
SELECT * FROM pg_stat_activity WHERE datname = 'portal_db';
```

### Vacuum و Analyze (بهینه‌سازی)
```sql
VACUUM ANALYZE;
```

---

## 🎯 چک‌لیست نهایی

- [ ] PostgreSQL نصب و در حال اجرا است
- [ ] دیتابیس و کاربر ایجاد شده‌اند
- [ ] `POSTGRES_URL` در `.env` تنظیم شده
- [ ] `npm install` اجرا شده
- [ ] `npm run db:test` موفقیت‌آمیز بوده
- [ ] `npm run db:push:pg` جداول را ایجاد کرده
- [ ] `npm run db:migrate` داده‌ها را منتقل کرده
- [ ] داده‌ها در PostgreSQL تایید شده‌اند
- [ ] `DATABASE_URL` به PostgreSQL سوئیچ شده
- [ ] Application با موفقیت اجرا می‌شود
- [ ] Backup از SQLite نگهداری شده

---

## 📞 پشتیبانی

در صورت بروز مشکل:
1. لاگ‌های migration را بررسی کنید
2. فایل `migration-log-*.json` را چک کنید
3. دستور `npm run db:test` را اجرا کنید
4. PostgreSQL logs را بررسی کنید: `sudo tail -f /var/log/postgresql/postgresql-14-main.log`

---

## ✨ مزایای PostgreSQL نسبت به SQLite

✅ **Performance بهتر** با concurrent users زیاد  
✅ **JSONB** برای query های پیچیده روی JSON  
✅ **Full-text search** داخلی  
✅ **Replication** و **High Availability**  
✅ **Advanced indexing** (GiST, GIN, BRIN)  
✅ **Stored procedures** و **Triggers** قدرتمند  
✅ **Concurrent writes** بدون lock  
✅ **Network access** برای ماژول‌های جداگانه  

---

**موفق باشید! 🚀**

