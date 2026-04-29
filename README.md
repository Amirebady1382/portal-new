# 🏢 سامانه مدیریت جامع صندوق پژوهش و فناوری گیلان

<div dir="rtl">

سیستم جامع مدیریت مشتریان، درخواست‌های خدمات، و گردش کار برای صندوق تحقیقات و فناوری غیردولتی گیلان

</div>

---

## English

A comprehensive customer management, service request, and workflow system for Guilan Non-Governmental Research and Technology Fund.

---

## ✨ ویژگی‌های کلیدی

<div dir="rtl">

### 🔐 سیستم احراز هویت چند سطحی
- نقش‌های کاربری: Admin, Employee (Investment/Administrative), Customer
- احراز هویت دو عاملی (2FA) با OTP
- مدیریت جلسات امن با JWT

### 🏭 مدیریت جامع شرکت‌ها
- ثبت و مدیریت اطلاعات کامل شرکت‌ها
- مدیریت حق امضاداران (حداکثر 2 نفر)
- ادغام با API رسمیو (Rasmio) برای دریافت اطلاعات رسمی
- پنل‌های اطلاعاتی: تیم، محصول، بازار، مالی

### 🔄 سیستم خدمات دو واحدی
- واحد سرمایه‌گذاری و واحد اداری
- گردش کار کامل (Workflow) برای درخواست‌های خدمات
- تخصیص خودکار به کارشناسان
- پیگیری وضعیت درخواست‌ها

### 📋 سیستم فرم‌های پویا
- ایجاد و مدیریت فرم‌های سفارشی
- اختصاص فرم‌ها به خدمات مختلف
- کنترل دسترسی به فرم‌ها (عمومی یا خاص)
- ذخیره و بازیابی خودکار داده‌های فرم

### 🤖 تحلیل مالی هوش مصنوعی
- استخراج خودکار اطلاعات مالی از اظهارنامه مالیاتی
- تحلیل هوشمند با Claude AI
- تولید گزارش‌های تحلیلی جامع
- ذخیره‌سازی هوشمند برای کاهش هزینه API

### 🔖 سیستم پیشرفته متغیرهای قرارداد
- **100+ متغیر آماده** در 5 دسته:
  - 🟢 **Rasmio**: اطلاعات خودکار از API (11 متغیر)
  - 🔵 **Form**: ورودی مشتری (10 متغیر)
  - 🟠 **Manual**: ورودی کارشناس (5 متغیر)
  - 🟣 **Calculated**: محاسبات خودکار
  - ⚪ **System**: تنظیمات سیستم
- Mapping هوشمند به فرم‌ها و منابع داده
- پشتیبانی از فرمول‌های مالی پیچیده (33 متغیر)

### 📄 تولید قرارداد از Template
- آپلود و مدیریت قالب‌های Word
- جایگزینی خودکار متغیرها
- پیش‌نمایش قبل از تولید
- تاریخچه قراردادهای تولید شده

### 📊 گزارش‌گیری سرمایه‌گذاری
- سیستم 62 متغیره مالی
- محاسبات خودکار با Formula Engine
- نمودارهای تحلیلی تعاملی
- صادرات گزارش‌ها به PDF

### 💬 سیستم ارتباطات
- ادغام با Bale Messenger Bot
- چت داخلی بین کارشناسان و مشتریان
- ارسال اعلان‌های خودکار
- پشتیبانی از فایل و تصویر

### 📁 مدیریت اسناد
- آپلود و دسته‌بندی اسناد
- پردازش OCR برای متن‌های فارسی
- نسخه‌بندی اسناد
- کنترل دسترسی به اسناد

### 🎨 Dashboard های تخصصی
- داشبورد مدیر: آمار کلی، مدیریت کاربران
- داشبورد کارشناس: درخواست‌های فعال، آمار عملکرد
- داشبورد مشتری: وضعیت درخواست‌ها، پیام‌ها

### 🛡️ امنیت پیشرفته
- Password hashing با bcrypt
- Rate limiting (2000 req/15min)
- Helmet.js security headers
- SQL injection prevention (Drizzle ORM)
- XSS protection
- CORS configuration
- Role-based access control

</div>

---

## 🏗️ معماری فنی

### Stack تکنولوژی

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS + Shadcn/ui
- TanStack Query (React Query)
- Wouter (Routing)
- Framer Motion (Animations)

**Backend:**
- Node.js + Express.js
- TypeScript
- Drizzle ORM
- SQLite (Production-ready for PostgreSQL)

**AI & External APIs:**
- Anthropic Claude API
- Rasmio API (Company Registry)
- SMS.ir (OTP)
- Bale Messenger API

### ساختار پروژه

```
PORTAL/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # UI Components
│   │   ├── pages/          # Page Components
│   │   ├── hooks/          # Custom React Hooks
│   │   └── lib/            # Utilities
├── server/                 # Express Backend
│   ├── controllers/        # Request Handlers (16 controllers)
│   ├── services/           # Business Logic (36 services)
│   ├── routes/             # API Routes (23 route files)
│   ├── middleware/         # Middlewares (auth, validation, etc.)
│   └── migrations/         # Database Migrations (23 migrations)
├── shared/                 # Shared Code
│   ├── schema.ts           # Drizzle Schema (830 lines, 30+ tables)
│   └── variable-utils.ts   # Variable System Utilities
└── uploads/                # Uploaded Files (gitignored)
```

### Database Schema

<div dir="rtl">

**23 Migration** و **830 خط Schema** شامل **30+ جدول**:

- **User Management**: users, otpCodes, baleEmployeeMappings
- **Company Management**: companies, userCompanies
- **Services & Workflows**: services, serviceRequests, serviceRequestWorkflow, companyServices
- **Forms & Submissions**: documentRequirements, formSubmissions, documentRequirementAccess
- **Contracts**: contractTemplates, contractVariables, contractVariableMappings, contractFormData
- **Financial System**: financialFormulas, formulaDependencies
- **Messaging**: conversations, messages, baleConversations, baleMessages
- **System**: systemSettings, auditLogs
- و بیشتر...

</div>

---

## 🚀 نصب و راه‌اندازی

### پیش‌نیازها

```bash
Node.js >= 18.0.0
npm یا yarn
```

### مراحل نصب

```bash
# 1. کلون پروژه
git clone https://github.com/your-username/PORTAL.git
cd PORTAL

# 2. نصب dependencies
npm install

# 3. تنظیم متغیرهای محیطی
cp .env.example .env
# ویرایش .env و پر کردن مقادیر ضروری

# 4. راه‌اندازی database (migrations به صورت خودکار اجرا می‌شوند)
npm run db:push

# 5. Seed کردن داده‌های اولیه
npm run seed

# 6. اجرای در حالت Development
npm run dev

# 7. (Production) Build و اجرا
npm run build
npm start
```

### اطلاعات ورود پیش‌فرض

<div dir="rtl">

پس از اجرای `npm run seed`:

</div>

```
👤 Admin:
   username: admin
   password: admin123

👤 Employee (Investment):
   username: employee_investment
   password: employee123

👤 Employee (Administrative):
   username: employee_admin
   password: employee123

👤 Customer:
   username: customer_test
   password: customer123
```

---

## ⚙️ متغیرهای محیطی

### ضروری

```env
DATABASE_URL=file:./database.db
JWT_SECRET=your-very-secure-jwt-secret-key-here (min 32 chars)
SESSION_SECRET=your-session-secret-key-here
```

### اختیاری (برای فیچرهای پیشرفته)

```env
# AI Analysis
ANTHROPIC_API_KEY=your-anthropic-api-key

# SMS OTP
SMS_IR_API_KEY=your-sms-ir-api-key

# Bale Bot
BALE_BOT_TOKEN=your-bale-bot-token

# Company Registry
RASMIO_API_KEY=your-rasmio-api-key

# AI Research
PERPLEXITY_API_KEY=your-perplexity-api-key
```

<div dir="rtl">

برای لیست کامل متغیرها، فایل `.env.example` را مشاهده کنید.

</div>

---

## 📖 راهنمای توسعه‌دهنده

### Scripts مفید

```bash
npm run dev         # Development mode با hot reload
npm run build       # Production build
npm run start       # اجرای production build
npm run check       # TypeScript type checking
npm run db:push     # Push schema به database
npm run seed        # Seed کردن داده‌های نمونه
```

### معماری Services

<div dir="rtl">

سیستم از **36 service مجزا** تشکیل شده:

**Core Services:**
- `companies.service.ts` - مدیریت شرکت‌ها و اطلاعات مالی
- `services.service.ts` - مدیریت خدمات
- `workflow.service.ts` - مدیریت گردش کار
- `auth.service.ts` - احراز هویت و مجوزدهی

**AI Services:**
- `ai-report-generation.service.ts` - تولید گزارش‌های AI
- `ai-variable-detection.service.ts` - تشخیص متغیرها
- `tax-declaration-extractor.service.ts` - استخراج اطلاعات مالی
- `perplexity-research.service.ts` - تحقیقات هوش مصنوعی

**Contract Services:**
- `contract-variables.service.ts` - مدیریت متغیرها
- `contracts.service.ts` - تولید قراردادها
- `unified-variable-manager.service.ts` - مدیریت یکپارچه

**Integration Services:**
- `rasmio-integration.service.ts` - ادغام رسمیو
- `bale-bot.service.ts` - Bale Messenger
- `sms.service.ts` - ارسال SMS

و 22 سرویس دیگر...

</div>

### API Endpoints

```
🔐 Authentication
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout

🏢 Companies
GET    /api/companies
GET    /api/companies/:id
POST   /api/companies
PUT    /api/companies/:id
DELETE /api/companies/:id

🔖 Services
GET    /api/services
POST   /api/services
PUT    /api/services/:id

📋 Service Requests
GET    /api/service-requests
POST   /api/service-requests
PUT    /api/service-requests/:id/status

🔖 Contract Variables
GET    /api/admin/contract-variables
POST   /api/admin/contract-variables
PUT    /api/admin/contract-variables/:id

📄 Contracts
POST   /api/contract/generate

و بیشتر از 100 endpoint دیگر...
```

---

## 👥 نقش‌های کاربری

<div dir="rtl">

### 🔑 Admin (مدیر سیستم)
- مدیریت کاربران و دسترسی‌ها
- تنظیمات سیستم (Settings)
- مدیریت متغیرهای قرارداد
- مدیریت Template ها
- مشاهده گزارش‌های کلی

### 👔 Employee - Investment (کارشناس سرمایه‌گذاری)
- بررسی درخواست‌های سرمایه‌گذاری
- مدیریت فرم‌های واحد سرمایه‌گذاری
- تحلیل مالی شرکت‌ها
- تولید گزارش سرمایه‌گذاری

### 👔 Employee - Administrative (کارشناس اداری)
- بررسی درخواست‌های اداری
- مدیریت فرم‌های واحد اداری
- تولید قراردادها و ضمانت‌نامه‌ها

### 🏭 Customer (مشتری/شرکت)
- ثبت و مدیریت اطلاعات شرکت
- درخواست خدمات
- پر کردن فرم‌های مورد نیاز
- پیگیری وضعیت درخواست‌ها
- چت با کارشناسان

</div>

---

## 🔒 Security & Best Practices

- ✅ **Password Hashing** با bcrypt (10 rounds)
- ✅ **JWT Authentication** با expiry
- ✅ **Rate Limiting** (2000 req/15min API, 100 req/15min Auth)
- ✅ **Helmet.js** security headers
- ✅ **Input Validation** با Zod
- ✅ **SQL Injection Prevention** (Drizzle ORM)
- ✅ **XSS Protection** با sanitization
- ✅ **CORS Configuration** با whitelist
- ✅ **Session Management** با secure cookies
- ✅ **Role-Based Access Control** (RBAC)
- ✅ **File Upload Validation** (type, size, mime)
- ✅ **Error Handling** با custom middleware

---

## 🗺️ Roadmap

- [ ] **Database Migration** به PostgreSQL برای production
- [ ] **Unit & Integration Tests** با Jest/Vitest
- [ ] **API Documentation** با Swagger/OpenAPI
- [ ] **Docker Containerization** برای deployment آسان
- [ ] **CI/CD Pipeline** با GitHub Actions
- [ ] **Monitoring & Logging** با ELK Stack
- [ ] **Performance Optimization** و caching بهتر
- [ ] **Mobile App** با React Native

---

## 📊 آمار پروژه

<div dir="rtl">

- **36** Service
- **16** Controller
- **23** Route File
- **23** Migration
- **30+** Database Table
- **830** خط Schema
- **100+** متغیر قرارداد
- **62** متغیر مالی
- **100+** API Endpoint

</div>

---

## 📝 مجوز

این پروژه تحت مجوز **MIT License** منتشر شده است. برای جزئیات بیشتر، فایل [LICENSE](LICENSE) را مشاهده کنید.

---

## 🤝 مشارکت در پروژه

<div dir="rtl">

مشارکت شما در بهبود این پروژه بسیار ارزشمند است!

</div>

1. Fork کنید
2. یک feature branch بسازید (`git checkout -b feature/AmazingFeature`)
3. تغییرات را commit کنید (`git commit -m 'Add some AmazingFeature'`)
4. به branch خود push کنید (`git push origin feature/AmazingFeature`)
5. یک Pull Request ایجاد کنید

---

## 📧 تماس و پشتیبانی

<div dir="rtl">

**سازمان:** صندوق تحقیقات و فناوری غیردولتی گیلان

برای سوالات، گزارش باگ‌ها، یا پیشنهادات، لطفاً یک **Issue** در گیت‌هاب باز کنید.

</div>

---

<div align="center">

**⭐ اگر این پروژه برای شما مفید بود، یک ستاره به آن بدهید!**

Made with ❤️ in Iran

</div>
