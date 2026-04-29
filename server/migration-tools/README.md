# 🛠️ ابزارهای مایگریشن دیتابیس

این پوشه شامل اسکریپت‌های کمکی برای مایگریشن از SQLite به PostgreSQL است.

## 📂 فایل‌ها

### 1. `test-connection.ts`
**تست اتصال به هر دو دیتابیس**

```bash
npm run db:test
```

**خروجی نمونه:**
```
═══════════════════════════════════════════════
   Database Connection Test Tool
═══════════════════════════════════════════════

📦 Testing SQLite Connection...
✅ SQLite connected successfully
   Users in database: 15

🐘 Testing PostgreSQL Connection...
✅ PostgreSQL connected successfully
   Time: 2024-10-21 10:30:45
   Version: PostgreSQL 14.x
   Tables in database: 31

═══════════════════════════════════════════════
   Summary
═══════════════════════════════════════════════
SQLite:     ✅ OK
PostgreSQL: ✅ OK

🎉 Both databases are ready! You can now migrate data.
```

---

### 2. `sqlite-to-postgres.ts`
**انتقال کامل داده‌ها از SQLite به PostgreSQL**

```bash
npm run db:migrate
```

**این اسکریپت:**
- ✅ Backup اتوماتیک از SQLite
- ✅ بررسی schema PostgreSQL
- ✅ مایگریشن 31 جدول به ترتیب صحیح
- ✅ تبدیل خودکار type ها (Boolean, DateTime)
- ✅ Transaction-based (rollback در صورت خطا)
- ✅ Progress indicator
- ✅ گزارش JSON کامل

**خروجی نمونه:**
```
═══════════════════════════════════════════════
   SQLite to PostgreSQL Migration Tool
═══════════════════════════════════════════════

🔍 Testing database connections...
✅ SQLite connection successful
✅ PostgreSQL connection successful
✅ PostgreSQL schema exists

💾 Creating backup of SQLite database...
✅ Backup created: database.db.backup-1729512345

🚀 Starting migration...

📦 Migrating table: users
   Found 15 rows
   Progress: 15/15
   ✅ Migrated 15/15 rows

📦 Migrating table: companies
   Found 10 rows
   ✅ Migrated 10/10 rows

[... سایر جداول ...]

═══════════════════════════════════════════════
   Migration Summary
═══════════════════════════════════════════════

Total tables: 31
Successful: 31
Failed: 0
Total rows migrated: 1,523
Duration: 12.34s

Detailed Results:
✅ users                         15 rows  0.23s
✅ companies                     10 rows  0.15s
✅ documents                     45 rows  0.67s
...

📄 Migration log saved: migration-log-1729512345.json

🎉 Migration completed successfully!
```

---

## 🔄 فرآیند مایگریشن گام به گام

### مرحله 1: نصب PostgreSQL روی سرور
```bash
# روی سرور Ubuntu
sudo bash SERVER_COMMANDS.sh
```

### مرحله 2: تنظیم .env
```env
POSTGRES_URL=postgresql://user:pass@localhost:5432/portal_db
```

### مرحله 3: نصب dependencies
```bash
npm install
```

### مرحله 4: تست اتصال
```bash
npm run db:test
```

### مرحله 5: ایجاد schema
```bash
npm run db:push:pg
```

### مرحله 6: مایگریشن داده‌ها
```bash
npm run db:migrate
```

### مرحله 7: سوئیچ به PostgreSQL
```env
# در .env:
DATABASE_URL=postgresql://user:pass@localhost:5432/portal_db
```

### مرحله 8: راه‌اندازی
```bash
npm run build
npm start
```

---

## 📊 ترتیب مایگریشن جداول

جداول به ترتیب زیر منتقل می‌شوند (برای رعایت foreign key constraints):

```
1. users
2. departments
3. companies
4. otp_codes
5. system_settings
6. audit_logs
7. contract_templates
8. document_requirements
9. services
10. contract_variables
11. authorized_phones
12. bale_users
13. user_companies
14. documents
15. conversations
16. company_services
17. service_requests
18. document_requirement_access
19. bale_conversations
20. contract_form_data
21. bale_employee_mappings
22. messages
23. form_submissions
24. request_status_history
25. service_request_workflow
26. contract_variable_mappings
27. bale_messages
28. service_document_requirements
29. financial_formulas
30. formula_dependencies
31. [سایر جداول...]
```

---

## 🔍 عیب‌یابی

### خطا: "POSTGRES_URL not set"
```bash
# اضافه کردن به .env:
echo 'POSTGRES_URL=postgresql://user:pass@localhost:5432/db' >> .env
```

### خطا: "PostgreSQL schema not initialized"
```bash
npm run db:push:pg
```

### خطا: "connection refused"
```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### خطا در مایگریشن یک جدول خاص
```bash
# لاگ را بررسی کنید:
cat migration-log-*.json

# آن جدول را دستی بررسی کنید:
psql -U portal_user -d portal_db
SELECT COUNT(*) FROM table_name;
```

---

## 📄 فایل‌های خروجی

### Backup files
```
database.db.backup-[timestamp]
```

### Migration logs
```
migration-log-[timestamp].json
```

محتوا:
```json
{
  "timestamp": "2024-10-21T10:30:45.123Z",
  "duration": "12.34",
  "stats": [
    {
      "table": "users",
      "rows": 15,
      "success": true,
      "duration": 234
    }
  ]
}
```

---

## 🔐 امنیت

### دسترسی محدود
فایل‌های حاوی رمز عبور:
```bash
chmod 600 .env
chmod 600 /root/postgresql-portal-config.txt
```

### Backup منظم
```bash
# اضافه کردن به cron
0 2 * * * pg_dump -U portal_user -d portal_db -F c -f /backup/portal_$(date +\%Y\%m\%d).dump
```

### SSL/TLS
برای production:
```env
POSTGRES_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

---

## 📚 منابع مفید

- **راهنمای کامل:** `POSTGRESQL_SETUP_GUIDE.md`
- **راهنمای سریع:** `MIGRATION_QUICK_START.md`
- **خلاصه تغییرات:** `MIGRATION_SUMMARY.md`
- **اسکریپت سرور:** `SERVER_COMMANDS.sh`

---

## 💡 نکات مهم

1. ✅ **SQLite دست نخورده باقی می‌ماند** - فقط کپی می‌شود
2. ✅ **Transaction-safe** - در صورت خطا rollback می‌شود
3. ✅ **Idempotent** - می‌توان چندین بار اجرا کرد (ON CONFLICT DO NOTHING)
4. ✅ **Progress tracking** - هر 100 رکورد یک بار گزارش
5. ✅ **Type conversion** - Boolean و DateTime خودکار تبدیل می‌شوند

---

**موفق باشید! 🚀**

