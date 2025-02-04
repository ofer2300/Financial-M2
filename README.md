# Video Conference System

מערכת ועידת וידאו מתקדמת עם יכולות שיתוף מסך ולוח לבן משותף.

## תכונות

- שיחות וידאו בזמן אמת עם תמיכה בריבוי משתתפים
- שיתוף מסך
- לוח לבן משותף לשיתוף פעולה
- צ'אט טקסטואלי
- הקלטת פגישות
- ניהול חדרים וירטואליים
- אבטחה מתקדמת

## דרישות מערכת

- Node.js 18.0.0 ומעלה
- npm או yarn
- Redis 6.0.0 ומעלה
- PostgreSQL 13.0 ומעלה
- תמיכה בWebRTC בדפדפן

## התקנה

1. שכפל את המאגר:
```bash
git clone https://github.com/yourusername/video-conference-system.git
cd video-conference-system
```

2. התקן את התלויות:
```bash
npm install
```

3. הגדר את משתני הסביבה:
```bash
cp .env.example .env
```
ערוך את קובץ `.env` והגדר את המשתנים הנדרשים:

```env
# שרת
PORT=3000
NODE_ENV=development

# מסד נתונים
DATABASE_URL=postgresql://user:password@localhost:5432/video_conference

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# אבטחה
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

4. הכן את מסד הנתונים:
```bash
npm run db:migrate
npm run db:seed
```

5. בנה את הפרויקט:
```bash
npm run build
```

6. הפעל את השרת:
```bash
npm start
```

## פיתוח

להפעלת סביבת הפיתוח:
```bash
npm run dev
```

## בדיקות

להרצת בדיקות:
```bash
npm test
```

להרצת בדיקות עם כיסוי:
```bash
npm run test:coverage
```

## לינטינג ופורמט

לבדיקת לינטינג:
```bash
npm run lint
```

לפורמט אוטומטי של הקוד:
```bash
npm run format
```

## API

### משתמשים

```typescript
POST /api/users/register
POST /api/users/login
GET /api/users/profile
PUT /api/users/profile
```

### פגישות

```typescript
POST /api/meetings/create
GET /api/meetings/:id
PUT /api/meetings/:id
DELETE /api/meetings/:id
GET /api/meetings/list
```

### צ'אט

```typescript
POST /api/messages/send
GET /api/messages/:meetingId
DELETE /api/messages/:id
```

### קבצים

```typescript
POST /api/files/upload
GET /api/files/:id
DELETE /api/files/:id
```

## ארכיטקטורה

המערכת בנויה מהרכיבים הבאים:

### שכבת השרת
- **Express.js**: שרת ה-API הראשי
- **Socket.IO**: לתקשורת בזמן אמת
- **MediaSoup**: לניהול חיבורי WebRTC
- **Redis**: לקאשינג ותקשורת בין שרתים
- **PostgreSQL**: מסד הנתונים הראשי

### שכבת הלקוח
- **React**: לממשק המשתמש
- **TypeScript**: לטיפוסים ובטיחות קוד
- **WebRTC**: לתקשורת וידאו ושמע
- **Fabric.js**: ללוח הלבן המשותף

### אבטחה
- הצפנת נתונים מקצה לקצה
- JWT לאימות משתמשים
- Rate Limiting למניעת התקפות
- סריקת קבצים לוירוסים
- מדיניות RLS במסד הנתונים

## ביצועים

המערכת כוללת מספר אופטימיזציות:

- **קאשינג**: שימוש ב-Redis לשמירת נתונים נפוצים
- **Lazy Loading**: טעינה מושהית של רכיבים ונתונים
- **Connection Pooling**: ניהול חיבורים למסד הנתונים
- **Compression**: דחיסת נתונים בתעבורה
- **CDN**: שימוש ב-CDN לקבצים סטטיים

## תרומה

1. צור fork של המאגר
2. צור ענף חדש לתכונה שלך
3. בצע commit לשינויים שלך
4. דחוף את הענף
5. פתח Pull Request

## רישיון

MIT
