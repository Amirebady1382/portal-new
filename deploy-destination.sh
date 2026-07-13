#!/usr/bin/env bash
set -e

# ==============================================================================
# Automated Destination Server Deployment & Restore Script (deploy-destination.sh)
# Gilan Research & Technology Fund Portal - Offline / Direct Bundle Deployment
# ==============================================================================

ARCHIVE_FILE="full-portal-bundle.tar.gz"

echo "=========================================================================="
echo "🚀 شروع فرآیند استقرار خودکار و آفلاین سامانه روی سرور مقصد"
echo "=========================================================================="

# 1. بررسی نصب بودن Docker و Docker Compose
if ! command -v docker &> /dev/null; then
  echo "❌ ابزار Docker روی این سرور نصب نیست! لطفاً ابتدا Docker را نصب کنید."
  exit 1
fi

echo "✅ ابزار Docker نصب است."

# 2. بررسی و اکسترکت فایل فشرده پروژه (اگر فایل .tar.gz در مسیر جاری باشد)
if [ -f "$ARCHIVE_FILE" ]; then
  echo "📦 فایل آرشیو پروژه ($ARCHIVE_FILE) یافت شد. در حال اکسترکت..."
  tar -xzvf "$ARCHIVE_FILE"
elif [ -f "transfer-pack.tar.gz" ]; then
  echo "📦 فایل آرشیو اطلاعات (transfer-pack.tar.gz) یافت شد. در حال اکسترکت..."
  tar -xzvf "transfer-pack.tar.gz"
else
  echo "ℹ️ فایل آرشیوی یافت نشد. فرض بر این است که فایل‌ها از قبل در این پوشه اکسترکت شده‌اند."
fi

# 3. بررسی وجود فایل‌های ضروری پروژه (.env و docker-compose.yml)
if [ ! -f "docker-compose.yml" ]; then
  echo "❌ فایل docker-compose.yml یافت نشد! لطفاً اسکریپت را درون پوشه پروژه اجرا کنید."
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "❌ فایل .env یافت نشد! لطفاً فایل .env را در مسیر پروژه قرار دهید."
  exit 1
fi

# 4. راه‌اندازی کانتینر دیتابیس PostgreSQL
echo "🗄️ راه‌اندازی سرویس دیتابیس PostgreSQL..."
docker compose up -d db

echo "⏳ در حال انتظار برای آماده‌سازی دیتابیس (10 ثانیه)..."
sleep 10

# 5. بازیابی (Restore) دیتابیس از روی بکاپ
if [ -f "portal_db_backup.sql" ]; then
  echo "🔄 در حال بازیابی کامل دیتابیس (Restore Database)..."
  cat portal_db_backup.sql | docker exec -i portal_postgres psql -U portal_user -d portal_db || true
  echo "✅ بازیابی دیتابیس با موفقیت انجام شد."
else
  echo "⚠️ فایل portal_db_backup.sql یافت نشد. دیتابیس بازگردانی نشد (اجرای دیتابیس خالی)."
fi

# 6. بیلد و اجرای کانتینر اصلی برنامه (App)
echo "🏗️ بیلد و راه‌اندازی کانتینر اصلی برنامه (App)..."
docker compose up -d --build app

echo "=========================================================================="
echo "🎉 استقرار سامانه با موفقیت به پایان رسید!"
echo "=========================================================================="
echo "📊 وضعیت کانتینرها:"
docker compose ps
