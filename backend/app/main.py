"""CareCircle API - run with:  uvicorn app.main:app --reload --port 8000   (docs at /docs)"""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import init_db
from .protection import SecurityMiddleware
from .routers import agent, alerts, auth, care, checkins, directory, medications, patients
from .seed import seed_if_empty
from .services import ai_agent, scheduler


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    seed_if_empty()
    task = asyncio.create_task(scheduler.run_loop()) if settings.run_scheduler else None
    yield
    if task:
        task.cancel()


prod = settings.app_env == "production"
app = FastAPI(title="CareCircle API", version="1.0.0", lifespan=lifespan,
              docs_url=None if prod else "/docs", redoc_url=None if prod else "/redoc", openapi_url=None if prod else "/openapi.json",
              description="Elder-care platform: face-ID login, medicine reminders with camera confirmation, "
                          "6-hourly AI health check-ins, risk scoring, pharmacy ordering and family alerts.")
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False,
                   allow_methods=["GET", "POST", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type"])
app.add_middleware(SecurityMiddleware)

for r in (auth, directory, patients, medications, checkins, agent, alerts, care):
    app.include_router(r.router)


@app.get("/", tags=["meta"])
def root():
    return {"app": "CareCircle", "docs": "/docs", "ai": "gemini+rules" if ai_agent.enabled() else "rules-only"}


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}
