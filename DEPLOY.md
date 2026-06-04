# קישורים לפריסה — חשבון yosefnoorani@gmail.com

## 1. Render (העלאת האתר)

| שלב | קישור |
|-----|--------|
| התחברות / Dashboard | https://dashboard.render.com/ |
| חיבור GitHub | https://dashboard.render.com/github |
| Static Site חדש (ידני) | https://dashboard.render.com/create?type=static |
| Blueprint מה-repo (`render.yaml`) | https://dashboard.render.com/select-repo?type=blueprint |
| מפתח API (אוטומציה) | https://dashboard.render.com/u/settings#api-keys |

**Repo:** https://github.com/Yosefnoorani/english-learning  
**הגדרות:** Branch `main` · Build `npm install && npm run build` · Publish `dist`

**URL צפוי אחרי Deploy:** https://english-learning.onrender.com

---

## 2. cron-job.org (ping כל 10 דקות)

| שלב | קישור |
|-----|--------|
| Console | https://console.cron-job.org/ |
| יצירת Job | https://console.cron-job.org/jobs/create |
| מפתח API | https://console.cron-job.org/settings |

**הגדרות:** Method GET · URL = כתובת Render · כל 10 דקות (`0,10,20,30,40,50`)

> Static Site ב-Render לא נרדם — Cron אופציונלי, אך מומלץ אם תעבור ל-Web Service בעתיד.

---

## 3. אוטומציה (אחרי יצירת API keys)

```powershell
$env:RENDER_API_KEY = 'rnd_...'      # מ-Render Settings
$env:CRONJOB_API_KEY = '...'         # מ-cron-job Settings
cd c:\Users\yosef\Programs\english
.\scripts\setup-render-and-cron.ps1
```

---

## 4. GitHub (כבר הועלה)

https://github.com/Yosefnoorani/english-learning
