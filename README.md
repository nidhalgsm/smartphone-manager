# Smartphone Stock & Sales (FastAPI + Supabase PWA)

## 1. Supabase
1. Create a project at supabase.com.
2. SQL Editor → paste and run `supabase/schema.sql`.
3. Authentication → Users → Add user (email + password) for each employee.
4. Project Settings → API: copy the URL, `anon` key and `service_role` key.

## 2. Backend
```
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # fill SUPABASE_URL and SUPABASE_SERVICE_KEY
uvicorn app.main:app --reload
```
API docs: http://localhost:8000/docs

## 3. Frontend
Edit the 3 constants at the top of the script in `frontend/index.html`
(Supabase URL, **anon** key, API URL), then serve it:
```
cd frontend && python -m http.server 5500
```

## Rules
- `service_role` key lives only in `backend/.env` (never committed, never in the frontend).
- Next phases: Tasjil checks, Drive/CSV exports, roles, import from Excel.
