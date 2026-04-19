from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import admin, analytics, attempts, auth, payments, questions

app = FastAPI(title="UPSC IAS Prep API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(questions.router, prefix="/api/questions", tags=["Questions"])
app.include_router(attempts.router, prefix="/api/attempts", tags=["Attempts"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


@app.get("/health")
async def health():
    return {"status": "healthy"}
