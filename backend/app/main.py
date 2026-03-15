from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import os
from dotenv import load_dotenv

from app.api.routes.employee_routes import router as employee_router
from app.api.routes.attendance_routes import router as attendance_router
from app.api.routes.attendance_history_routes import router as attendance_history_router
from app.api.routes.department_routes import router as department_router
from app.api.routes.analytics_routes import router as analytics_router
from app.api.routes.auth_routes import router as auth_router

load_dotenv()

app = FastAPI(title="Ehatara AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(employee_router)
app.include_router(attendance_router)
app.include_router(attendance_history_router)
app.include_router(department_router)
app.include_router(analytics_router)
app.include_router(auth_router)

@app.get("/")
def read_root():
    return {"message": "Hello, welcome to the HRMS API"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=False)
