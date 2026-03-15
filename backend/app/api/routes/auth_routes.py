from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel
import os

from app.db.mongoDB import db

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Security configurations
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
security = HTTPBearer()

class User(BaseModel):
    email: str
    hashed_password: str
    created_at: datetime

# Note: All authentication endpoints have been removed as requested
# The auth routes file is kept for potential future use but contains no active endpoints
