from typing import List
from fastapi import APIRouter
from app.db.mongoDB import db
from app.schemas.mongodb_schema import AnalyticsDepartment, AnalyticsAttendance

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/departments", response_model=List[AnalyticsDepartment])
def get_department_distribution():
    pipeline = [
        {"$lookup": {"from": "departments", "localField": "department_id", "foreignField": "_id", "as": "department"}},
        {"$unwind": "$department"},
        {"$group": {"_id": "$department.name", "count": {"$sum": 1}}},
        {"$project": {"department": "$_id", "count": 1, "_id": 0}},
        {"$sort": {"count": -1}}
    ]
    return list(db.employees.aggregate(pipeline))

@router.get("/attendance", response_model=List[AnalyticsAttendance])
def get_attendance_trends(days: int = 30):
    from datetime import datetime, timedelta
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    pipeline = [
        {"$match": {"date": {"$gte": start_date, "$lte": end_date}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
            "present": {"$sum": {"$cond": [{"$eq": ["$status", "Present"]}, 1, 0]}},
            "absent": {"$sum": {"$cond": [{"$eq": ["$status", "Absent"]}, 1, 0]}},
            "leave": {"$sum": {"$cond": [{"$eq": ["$status", "Leave"]}, 1, 0]}}
        }},
        {"$project": {"date": "$_id", "present": 1, "absent": 1, "leave": 1, "_id": 0}},
        {"$sort": {"date": 1}}
    ]
    return list(db.attendance.aggregate(pipeline))
