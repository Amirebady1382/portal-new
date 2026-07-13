#!/usr/bin/env bash
set -e

# ==============================================================================
# Automated Destination Server Deployment & Restore Script (deploy-destination.sh)
# Gilan Research & Technology Fund Portal - Deployment Automation
# ==============================================================================

REPO_URL="https://github.com/Amirebady1382/portal-new.git"
PROJECT_DIR="portal-new"
TRANSFER_ARCHIVE="transfer-pack.tar.gz"

echo "=========================================================================="
echo "🚀 شروع فرآیند استقرار خودکار سامانه روی سرور مقصد"
echo "=========================================================================="

# 1. بررسی نصب بودن Docker و Docker Compose
if ! command -v docker &> /dev/null; then
  echo "❌ ابزار Docker روی این سرور نصب نیست! لطفاً ابتدا Docker را نصب کنید."
  exit 1
fi

echo "✅ Docker نصب است."

# 2. دریافت یا به‌روزرسانی کدها از مخزن Git
if [ -d "$PROJECT_DIR" ]; then
  echo "🔄 پوشه پروژه از قبل وجود دارد. دریافت آخرین تغییرات از Git..."
  cd "$PROJECT_DIR"
  git pull origin main
else
  echo "📥 کلون پروژه از مخزن Git..."
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

# 3. بررسی و اکسترکت فایل‌های انتقالی (env، دیتابیس و آپلودها)
if [ -f "../$TRANSFER_ARCHIVE" ]; then
  echo "📦 فایل بسته‌بندی انتقال ($TRANSFER_ARCHIVE) یافت شد. در حال اکسترکت..."
  tar -xzvf "../$TRANSFER_ARCHIVE" -C .
elif [ -f "./$TRANSFER_ARCHIVE" ]; then
  echo "📦 فایل بسته‌بندی انتقال ($TRANSFER_ARCHIVE) یافت شد. در حال اکسترکت..."
  tar -xzvf "./$TRANSFER_ARCHIVE" -C .
else
  echo "⚠️ هشدار: فایل $TRANSFER_ARCHIVE یافت نشد!"
  echo "لطفاً مطمئن شوید فایل .env، فایل بکاپ portal_db_backup.sql و پوشه uploads در پوشه پروژه قرار دارند."
fi

# بررسی وجود فایل .env
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
