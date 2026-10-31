# SmartStock TN — React frontend (Vite)
Backend (FastAPI on Render) and database (Supabase) are unchanged.

```
npm install
copy .env.example .env     # Windows (macOS/Linux: cp)  → fill the 3 VITE_ values
npm run dev                # http://localhost:5173  (add it to CORS_ORIGINS on Render to test locally)
npm run build              # creates the dist/ folder
```
Deploy: Netlify → Add new site → Deploy manually → drag the **dist** folder.
(Or connect GitHub: build command `npm run build`, publish directory `dist`, and add the 3 VITE_ variables in Netlify → Environment variables.)
