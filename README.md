# מערכת התאמות פיננסיות

מערכת לניהול והתאמה אוטומטית של נתונים פיננסיים, כולל עסקאות בנק, צ'קים, העברות בנקאיות, חשבוניות וקבלות.

## ארכיטקטורה

* Single Page Application (SPA) מבוססת React
* ארכיטקטורת קומפוננטות מודולרית
* State management באמצעות React Query
* Backend מבוסס Supabase (PostgreSQL)

### רכיבים מרכזיים

* Dashboard - תצוגת נתונים פיננסיים
* TaskBoard - לוח קנבן לניהול משימות
* GanttChart - תצוגת גאנט למעקב אחר משימות
* ProfileManagement - ניהול פרופיל משתמש

## טכנולוגיות

* Frontend:
  * React + TypeScript
  * Vite
  * Tailwind CSS
  * @tanstack/react-query
  * recharts
  * react-beautiful-dnd
  * react-hook-form

* Backend:
  * Supabase
  * PostgreSQL
  * Row Level Security (RLS)

## התקנה

1. התקן את הדרישות:
```bash
npm install
```

2. צור קובץ `.env` והגדר את המשתנים הבאים:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_KEY=your-api-key
```

3. הרץ את הפרויקט:
```bash
npm run dev
```

## הגדרת מסד הנתונים

1. צור פרויקט חדש ב-Supabase
2. הרץ את הסקריפטים מתוך `supabase/init.sql`
3. וודא שה-RLS policies מופעלות

## שימוש במערכת

1. התחבר למערכת
2. העלה קבצים:
   * נתוני חשבון בנק
   * צ'קים
   * העברות בנקאיות
   * חשבוניות
   * קבלות

המערכת תבצע התאמה אוטומטית בין הנתונים ותציג את התוצאות בדשבורד.

## פיצ'רים

* התאמה אוטומטית של עסקאות
* ניהול משימות עם תצוגת קנבן
* תצוגת גאנט למעקב אחר התקדמות
* דשבורד עם מדדים וגרפים
* אבטחה מבוססת RLS
* תמיכה בריבוי משתמשים

## אבטחה

* אימות משתמשים
* Row Level Security (RLS)
* הרשאות לפי משתמש
* JWT authentication

## פיתוח עתידי

* אימות דו-שלבי
* אינטגרציה עם Revit
* מערכת תשלומים
* התראות בזמן אמת
* ייצוא דוחות מתקדם 