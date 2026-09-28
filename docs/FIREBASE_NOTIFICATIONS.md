# إعداد إشعارات Firebase (FCM)

## المشروع الحالي: `socialmedia-eb549`

## 1) Frontend — تم ضبطه في `.env.local`

| المتغير | المصدر |
|---------|--------|
| `NEXT_PUBLIC_FIREBASE_*` | Project settings → General → Your apps (Web) |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Cloud Messaging → Web Push certificates → **Key pair** (المفتاح العام) |

## 2) Backend — مطلوب Service Account (مهم)

الـ **Private_Key** الذي يظهر بجانب VAPID **ليس** مفتاح الباكند.  
الباكند يحتاج **Service Account JSON** منفصل:

1. Firebase Console → **Project settings → Service accounts**
2. **Generate new private key** → يُحمّل ملف `.json`
3. من الملف انسخ إلى `socialMedia-V2-main/.env.development`:

```env
FIREBASE_PROJECT_ID=socialmedia-eb549
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@socialmedia-eb549.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> `private_key` من JSON يُكتب في سطر واحد مع `\n` بدل الأسطر الحقيقية.

## 3) تشغيل

```bash
cd socialMedia-V2-main && npm run start:dev
cd FE-SocialMedia-main && npm run dev
```

بعد تسجيل الدخول، اسمح بالإشعارات في المتصفح.

## 4) ملاحظات

- **Analytics** (`measurementId`) اختياري للإشعارات — غير مستخدم حالياً في الكود.
- أعد تشغيل السيرفرات بعد تعديل `.env`.
- لا ترفع مفاتيح Firebase على GitHub.
