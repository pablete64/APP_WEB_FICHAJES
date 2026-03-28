from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings

from app.routers import auth, users, projects, tasks, time_entries, reports

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[org.strip() for org in settings.ALLOWED_ORIGINS.split(",") if org.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(time_entries.router)
app.include_router(reports.router)

@app.get("/")
def root():
    return {"status": "Backend running", "db": "Postgres (Pydantic Mapped)"}
