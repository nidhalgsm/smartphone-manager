from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core import settings
from .api.v1 import devices, sales, dashboard, extras

app = FastAPI(title="Smartphone Stock & Sales")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins.split(","),
                   allow_methods=["*"], allow_headers=["*"])
for r in (devices.router, sales.router, dashboard.router, extras.router):
    app.include_router(r, prefix="/api/v1")


@app.get("/health")
def health():
    return {"ok": True}
