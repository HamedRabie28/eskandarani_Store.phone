# أسكندراني فون — Askandarani Phone

متجر إلكتروني احترافي للهواتف الذكية والإكسسوارات، مبني بـ Next.js 16 + React 19 + Prisma + TypeScript.

## النشر على Vercel

### 1. إعداد قاعدة البيانات

هذا المشروع الآن مهيأ للعمل على PostgreSQL في Vercel.

**الخيار الأسهل — Vercel Postgres:**
1. اذهب إلى [vercel.com/dashboard](https://vercel.com/dashboard)
2. أنشئ project جديد
3. اذهب إلى **Storage** → **Create Database** → **Postgres**
4. انسخ `DATABASE_URL`

**بدائل أخرى:** Supabase, Neon, Railway (كلها مجانية)

### 2. تحديث Prisma Schema لـ PostgreSQL

في ملف `prisma/schema.prisma`, تأكد من أن:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

> ملاحظة: لم يعد المشروع يدعم SQLite كمخطط افتراضي، لذا تحتاج PostgreSQL محلياً أو عبر Vercel أثناء التطوير.

### 3. إعداد Environment Variables على Vercel

في Vercel Project Settings → Environment Variables:
```
DATABASE_URL = postgresql://user:password@host:port/dbname?sslmode=require
```

### 4. النشر

```bash
# بعد رفع الكود لـ GitHub:
git add .
git commit -m "Fix Vercel deployment"
git push origin main
```

Vercel سيبني المشروع تلقائياً.

### 5. تعبئة البيانات الأولية

بعد النشر، شغّل الـ seed:
```bash
# محلياً مع DATABASE_URL الخاص بـ Vercel
DATABASE_URL="your-vercel-postgres-url" npm run seed
```

## التشغيل المحلي

```bash
npm install
npm run db:push      # إنشاء قاعدة البيانات
npm run db:clear     # مسح جميع بيانات الموقع مع الاحتفاظ بحساب الأدمن
npm run seed         # تعبئة البيانات الأولية
npm run dev          # تشغيل السيرفر
```

> لإزالة بيانات الموقع بالكامل مع الاحتفاظ بمستخدم الأدمن فقط، يمكنك استخدام:
> ```bash
> ADMIN_EMAIL="admin@askandarani.phone" npm run db:clear
> ```

# ملاحظة
تحتاج إلى إعداد `DATABASE_URL` لقاعدة PostgreSQL محلية لأن مخطط Prisma يستخدم PostgreSQL.

## بيانات دخول لوحة الإدارة

- **البريد**: `admin@askandarani.phone`
- **كلمة المرور**: `admin123`
- **الوصول**: أضف `#admin` للرابط أو اضغط `Ctrl+Shift+A`

## التقنيات

- Next.js 16 (App Router)
- React 19 + TypeScript 5
- Prisma 6 (SQLite محلياً / PostgreSQL على Vercel)
- Tailwind CSS 4 + shadcn/ui
- Zustand + TanStack Query
- Framer Motion
