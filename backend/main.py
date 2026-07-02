import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from core.database import connect_db, close_db
from routers import auth, resume, interview

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(title="CTRL+INTERVIEW API", lifespan=lifespan)

# Local dev origins always allowed. Add your deployed frontend URL(s) via the
# FRONTEND_ORIGINS env var (comma-separated), e.g.:
# FRONTEND_ORIGINS=https://ctrl-interview.vercel.app
_default_origins = ["http://localhost:5173", "http://localhost:3000"]
_extra_origins = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _extra_origins,
    # Also allow any Vercel preview deployment URL for this project
    allow_origin_regex=r"https://ctrl-interview.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(interview.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "CTRL+INTERVIEW"}
