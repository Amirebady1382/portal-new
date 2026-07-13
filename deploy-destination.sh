#!/usr/bin/env bash
set -e

echo "=========================================================================="
echo "🚀 شروع فرآیند استقرار خودکار سامانه روی سرور مقصد (بدون نیاز به Git)"
echo "=========================================================================="

# 1. بررسی نصب بودن Docker و انتخاب خودکار دستور docker compose یا docker-compose
if ! command -v docker &> /dev/null; then
  echo "❌ ابزار Docker روی این سرور نصب نیست!"
  exit 1
fi

if docker compose version &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE="docker-compose"
else
  echo "❌ افزونه Docker Compose روی سرور نصب نیست!"
  echo "لطفاً با دستور زیر آن را نصب کنید:"
  echo "apt update && apt install -y docker-compose-plugin docker-compose"
  exit 1
fi

echo "✅ ابزار Docker و Compose ($DOCKER_COMPOSE) شناسایی شد."

# 2. اکسترکت فایل transfer-pack.tar.gz (در صورت وجود)
if [ -f "transfer-pack.tar.gz" ]; then
  echo "📦 فایل transfer-pack.tar.gz یافت شد. در حال اکسترکت (.env، دیتابیس و آپلودها)..."
  tar -xzvf "transfer-pack.tar.gz"
fi

# 3. بررسی وجود فایل‌های حیاتی
if [ ! -f ".env" ]; then
  echo "❌ فایل .env یافت نشد! لطفاً مطمئن شوید فایل .env در پوشه پروژه قرار دارد."
  exit 1
fi

# 4. راه‌اندازی کانتینر دیتابیس PostgreSQL
echo "🗄️ راه‌اندازی سرویس دیتابیس PostgreSQL..."
$DOCKER_COMPOSE up -d db

echo "⏳ در حال انتظار برای آماده‌سازی دیتابیس (10 ثانیه)..."
sleep 10

# 5. بازیابی (Restore) دیتابیس از روی بکاپ
if [ -f "portal_db_backup.sql" ]; then
  echo "🔄 در حال بازیابی کامل دیتابیس (Restore Database)..."
  cat portal_db_backup.sql | docker exec -i portal_postgres psql -U portal_user -d portal_db || true
  echo "✅ بازیابی دیتابیس با موفقیت انجام شد."
else
  echo "⚠️ فایل portal_db_backup.sql یافت نشد."
fi

# 6. بیلد و اجرای کانتینر اصلی برنامه (App)
echo "🏗️ بیلد و راه‌اندازی کانتینر اصلی برنامه (App)..."
$DOCKER_COMPOSE up -d --build app

echo "=========================================================================="
echo "🎉 استقرار سامانه با موفقیت به پایان رسید!"
echo "=========================================================================="
$DOCKER_COMPOSE ps
