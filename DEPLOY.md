# 🚀 دليل النشر على Vercel — أسكندراني فون

## الخطوة 1: رفع الكود لـ GitHub

```bash
# 1. اذهب لمجلد المشروع
cd askandarani-phone

# 2. تهيئة Git (إذا لم تكن مهيأة)
git init
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# 3. أضف كل الملفات (تأكد أن prisma/ مضاف)
git add .

# 4. تحقق أن prisma/schema.prisma مضاف
git status
# يجب أن ترى: prisma/schema.prisma في القائمة

# 5. إذا لم ترَ prisma، أضفه قسراً
git add -f prisma/schema.prisma

# 6. ارفع التغييرات
git commit -m "Ready for Vercel deployment"
git push -u origin main
```

## الخطوة 2: إنشاء قاعدة بيانات PostgreSQL

SQLite لا يعمل على Vercel. استخدم PostgreSQL:

### الخيار الأسهل: Vercel Postgres
1. اذهب لـ [vercel.com/dashboard](https://vercel.com/dashboard)
2. Storage → Create Database → Postgres
3. انسخ `DATABASE_URL`

### بدائل مجانية:
- **Supabase**: [supabase.com](https://supabase.com)
- **Neon**: [neon.tech](https://neon.tech)
- **Railway**: [railway.app](https://railway.app)

## الخطوة 3: تعديل Prisma Schema

في ملف `prisma/schema.prisma`, تأكد من:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## الخطوة 4: النشر على Vercel

1. اذهب لـ [vercel.com/new](https://vercel.com/new)
2. اختر مستودعك من GitHub
3. **قبل Deploy**، أضف Environment Variables:
   - Key: `DATABASE_URL`
   - Value: `postgresql://...` (رابط قاعدة البيانات)
4. في الملف `vercel.json` موجود الآن build command يقوم بإنشاء الجداول قبل البناء:
   - `npx prisma db push --schema=prisma/schema.prisma && next build`
5. اضغط **Deploy**
6. انتظر 2-3 دقائق

## الخطوة 5: تعبئة البيانات الأولية

```bash
# محلياً، استخدم DATABASE_URL الخاص بـ Vercel:
DATABASE_URL="postgresql://..." npm run seed
```

## الخطوة 6: الوصول للوحة الإدارة

```
https://your-site.vercel.app/#admin
```
- البريد: `admin@askandarani.phone`
- كلمة المرور: `admin123`

## حل المشاكل الشائعة

### خطأ: Could not find Prisma Schema
- تأكد أن `prisma/schema.prisma` مرفوع لـ GitHub
- استخدم: `git add -f prisma/schema.prisma`

### خطأ: DATABASE_URL not defined
- أضف `DATABASE_URL` في Vercel → Settings → Environment Variables

### خطأ: Can't reach database
- تأكد أن `provider = "postgresql"` في schema.prisma
- تأكد أن قاعدة البيانات نشطة

### خطأ: Table does not exist
- شغّل: `DATABASE_URL="..." npm run db:push`
- ثم: `DATABASE_URL="..." npm run seed`
