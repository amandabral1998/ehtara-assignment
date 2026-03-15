from typing import List
from fastapi import APIRouter, HTTPException, status
from bson import ObjectId
from datetime import datetime

from app.db.mongoDB import db
from app.schemas.mongodb_schema import Department, DepartmentCreate

router = APIRouter(prefix="/api/departments", tags=["Department Management"])

@router.get("/", response_model=List[Department])
def list_departments():
    departments = list(db.departments.find().sort("name", 1))
    return [Department(**{**doc, "_id": str(doc["_id"])}) for doc in departments]

@router.post("/", response_model=Department, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate):
    data = payload.model_dump()
    if db.departments.find_one({"name": data["name"]}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department name already exists")

    data["created_at"] = datetime.utcnow()
    inserted = db.departments.insert_one(data)
    department = db.departments.find_one({"_id": inserted.inserted_id})
    return Department(**{**department, "_id": str(department["_id"])})
