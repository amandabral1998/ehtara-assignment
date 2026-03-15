from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query
from bson import ObjectId
from datetime import datetime, date, timedelta

from app.db.mongoDB import db
from app.schemas.mongodb_schema import Attendance, AttendanceCreate, AttendanceUpdate

router = APIRouter(prefix="/api/attendance", tags=["Attendance Management"])

# New router for attendance history
history_router = APIRouter(prefix="/api/attendance-history", tags=["Attendance History"])

@router.get("/", response_model=dict)
def get_attendance(date: Optional[str] = Query(None)):
    if not date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Date parameter is required")

    try:
        query_date = datetime.fromisoformat(date).date()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format")

    attendance_records = list(db.attendance.aggregate([
        {"$match": {"date": {"$gte": datetime.combine(query_date, datetime.min.time()), "$lt": datetime.combine(query_date, datetime.max.time())}}},
        {"$lookup": {"from": "employees", "localField": "employee_id", "foreignField": "_id", "as": "employee"}},
        {"$unwind": {"path": "$employee", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "departments", "localField": "employee.department_id", "foreignField": "_id", "as": "department"}},
        {"$unwind": {"path": "$department", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"employee.full_name": 1}}
    ]))

    active_employees = db.employees.count_documents({"status": "Active"})

    return {
        "data": [
            {
                "_id": str(doc["_id"]),
                "employee_id": str(doc["employee_id"]),
                "date": doc["date"].isoformat() if hasattr(doc["date"], 'isoformat') else str(doc["date"]),
                "status": doc["status"],
                "marked_by": doc.get("marked_by", "system"),
                "created_at": doc["created_at"].isoformat() if hasattr(doc["created_at"], 'isoformat') else str(doc["created_at"]),
                "updated_at": doc["updated_at"].isoformat() if hasattr(doc["updated_at"], 'isoformat') else str(doc["updated_at"]),
                "employee": {
                    "_id": str(doc["employee"]["_id"]),
                    "full_name": doc["employee"]["full_name"],
                    "employee_code": doc["employee"]["employee_code"],
                    "email": doc["employee"]["email"],
                    "status": doc["employee"]["status"],
                    "department_id": str(doc["employee"]["department_id"]) if doc["employee"].get("department_id") else None
                },
                "department": {
                    "_id": str(doc["department"]["_id"]) if doc.get("department") else None,
                    "name": doc["department"]["name"] if doc.get("department") else None
                } if doc.get("department") else None
            }
            for doc in attendance_records
        ],
        "marked": len(attendance_records),
        "total_active": active_employees
    }

@router.post("/", response_model=Attendance, status_code=status.HTTP_201_CREATED)
def create_attendance(payload: AttendanceCreate):
    if not ObjectId.is_valid(payload.employee_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid employee id")

    employee = db.employees.find_one({"_id": ObjectId(payload.employee_id)})
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    existing = db.attendance.find_one({
        "employee_id": ObjectId(payload.employee_id),
        "date": {"$gte": datetime.combine(payload.date.date(), datetime.min.time()), "$lt": datetime.combine(payload.date.date(), datetime.max.time())}
    })
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Attendance already marked for this date")

    data = payload.model_dump()
    data["employee_id"] = ObjectId(data["employee_id"])
    data["date"] = datetime.combine(payload.date.date(), datetime.min.time())
    data["created_at"] = datetime.utcnow()
    data["updated_at"] = datetime.utcnow()

    inserted = db.attendance.insert_one(data)
    attendance = db.attendance.aggregate([
        {"$match": {"_id": inserted.inserted_id}},
        {"$lookup": {"from": "employees", "localField": "employee_id", "foreignField": "_id", "as": "employee"}},
        {"$unwind": {"path": "$employee", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "departments", "localField": "employee.department_id", "foreignField": "_id", "as": "department"}},
        {"$unwind": {"path": "$department", "preserveNullAndEmptyArrays": True}}
    ]).next()
    return Attendance(**{**attendance, "_id": str(attendance["_id"]), "employee_id": str(attendance["employee_id"]), "marked_by": attendance.get("marked_by", "system")})

@router.post("/bulk", response_model=dict)
def create_bulk_attendance(records: List[AttendanceCreate]):
    if not records:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No records provided")

    inserted_count = 0
    skipped_count = 0

    for record in records:
        try:
            create_attendance(record)
            inserted_count += 1
        except HTTPException as e:
            if e.status_code == 409:
                skipped_count += 1
            else:
                raise

    return {
        "message": f"Bulk attendance processed",
        "inserted": inserted_count,
        "skipped": skipped_count
    }

@router.get("/employee/{employee_id}", response_model=List[Attendance])
def get_employee_attendance(employee_id: str):
    if not ObjectId.is_valid(employee_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid employee id")

    if not db.employees.find_one({"_id": ObjectId(employee_id)}):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    attendance_records = list(db.attendance.find({"employee_id": ObjectId(employee_id)}).sort("date", -1))
    return [Attendance(**{**doc, "_id": str(doc["_id"])}) for doc in attendance_records]

@router.patch("/{attendance_id}", response_model=Attendance)
def update_attendance(attendance_id: str, payload: AttendanceUpdate):
    if not ObjectId.is_valid(attendance_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid attendance id")

    update_data = payload.model_dump()
    update_data["updated_at"] = datetime.utcnow()

    result = db.attendance.update_one({"_id": ObjectId(attendance_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")

    attendance = db.attendance.find_one({"_id": ObjectId(attendance_id)})
    if not attendance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found")
    
    # Convert ObjectId to string and handle missing fields
    attendance_data = {
        "_id": str(attendance["_id"]),  # Provide _id for the alias
        "id": str(attendance["_id"]),   # Also provide id for the field
        "employee_id": str(attendance["employee_id"]),  # Convert ObjectId to string
        "date": attendance["date"],
        "status": attendance["status"],
        "marked_by": attendance.get("marked_by"),  # Use get() for optional field
        "created_at": attendance.get("created_at"),
        "updated_at": attendance.get("updated_at")
    }
    
    return Attendance(**attendance_data)

@router.get("/chart/filtered")
def get_attendance_chart_filtered(
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    days: int = Query(30, description="Number of days to fetch if no date range provided"),
    department_id: Optional[str] = Query(None, description="Filter by department ID"),
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    status: Optional[str] = Query(None, description="Filter by status (Present, Absent, Leave)"),
    group_by: str = Query("daily", description="Group by: daily, weekly, monthly")
):
    """
    Get filtered attendance data for chart display with advanced filtering options
    """
    try:
        # Default to last 30 days if no dates provided
        if not start_date:
            end_date_obj = datetime.now().date()
            start_date_obj = end_date_obj - timedelta(days=days-1)
        else:
            start_date_obj = datetime.fromisoformat(start_date).date()
            if end_date:
                end_date_obj = datetime.fromisoformat(end_date).date()
            else:
                end_date_obj = start_date_obj + timedelta(days=days-1)
        
        # Build match conditions
        match_conditions = {
            "date": {
                "$gte": datetime.combine(start_date_obj, datetime.min.time()),
                "$lte": datetime.combine(end_date_obj, datetime.max.time())
            }
        }
        
        # Add department filter
        if department_id:
            match_conditions["employee.department_id"] = ObjectId(department_id)
        
        # Add employee filter
        if employee_id:
            match_conditions["employee_id"] = ObjectId(employee_id)
        
        # Add status filter
        if status:
            match_conditions["status"] = status
        
        # Determine grouping format
        if group_by == "weekly":
            date_format = "%Y-%U"  # Year-Week
        elif group_by == "monthly":
            date_format = "%Y-%m"  # Year-Month
        else:
            date_format = "%Y-%m-%d"  # Daily
        
        # Aggregate attendance data
        pipeline = [
            {"$lookup": {"from": "employees", "localField": "employee_id", "foreignField": "_id", "as": "employee"}},
            {"$unwind": {"path": "$employee", "preserveNullAndEmptyArrays": True}},
            {"$match": match_conditions},
            {
                "$group": {
                    "_id": {
                        "date": {"$dateToString": {"format": date_format, "date": "$date"}},
                        "status": "$status"
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.date",
                    "statuses": {
                        "$push": {
                            "status": "$_id.status",
                            "count": "$count"
                        }
                    }
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        results = list(db.attendance.aggregate(pipeline))
        
        # Format the data for chart consumption
        chart_data = []
        
        if group_by == "daily":
            current_date = start_date_obj
            while current_date <= end_date_obj:
                date_str = current_date.strftime("%Y-%m-%d")
                day_data = next((r for r in results if r["_id"] == date_str), None)
                
                if day_data:
                    present_count = next((s["count"] for s in day_data["statuses"] if s["status"] == "Present"), 0)
                    absent_count = next((s["count"] for s in day_data["statuses"] if s["status"] == "Absent"), 0)
                    leave_count = next((s["count"] for s in day_data["statuses"] if s["status"] == "Leave"), 0)
                else:
                    present_count = 0
                    absent_count = 0
                    leave_count = 0
                
                chart_data.append({
                    "date": date_str,
                    "present": present_count,
                    "absent": absent_count,
                    "leave": leave_count,
                    "total": present_count + absent_count + leave_count
                })
                
                current_date += timedelta(days=1)
        else:
            # For weekly/monthly grouping, use the aggregated results directly
            for result in results:
                present_count = next((s["count"] for s in result["statuses"] if s["status"] == "Present"), 0)
                absent_count = next((s["count"] for s in result["statuses"] if s["status"] == "Absent"), 0)
                leave_count = next((s["count"] for s in result["statuses"] if s["status"] == "Leave"), 0)
                
                chart_data.append({
                    "date": result["_id"],
                    "present": present_count,
                    "absent": absent_count,
                    "leave": leave_count,
                    "total": present_count + absent_count + leave_count
                })
        
        return {
            "data": chart_data,
            "summary": {
                "total_days": len(chart_data),
                "total_present": sum(d["present"] for d in chart_data),
                "total_absent": sum(d["absent"] for d in chart_data),
                "total_leave": sum(d["leave"] for d in chart_data),
                "date_range": {
                    "start": start_date_obj.strftime("%Y-%m-%d"),
                    "end": end_date_obj.strftime("%Y-%m-%d")
                },
                "filters_applied": {
                    "department_id": department_id,
                    "employee_id": employee_id,
                    "status": status,
                    "group_by": group_by
                }
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")

@router.get("/chart")
def get_attendance_chart_data(
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    days: int = Query(30, description="Number of days to fetch if no date range provided")
):
    """
    Get attendance data formatted for chart display
    Returns daily counts of Present, Absent, and Leave for the specified date range
    """
    try:
        # Default to last 30 days if no dates provided
        if not start_date:
            end_date_obj = datetime.now().date()
            start_date_obj = end_date_obj - timedelta(days=days-1)
        else:
            start_date_obj = datetime.fromisoformat(start_date).date()
            if end_date:
                end_date_obj = datetime.fromisoformat(end_date).date()
            else:
                end_date_obj = start_date_obj + timedelta(days=days-1)
        
        # Aggregate attendance data by date and status
        pipeline = [
            {
                "$match": {
                    "date": {
                        "$gte": datetime.combine(start_date_obj, datetime.min.time()),
                        "$lte": datetime.combine(end_date_obj, datetime.max.time())
                    }
                }
            },
            {
                "$group": {
                    "_id": {
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
                        "status": "$status"
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.date",
                    "statuses": {
                        "$push": {
                            "status": "$_id.status",
                            "count": "$count"
                        }
                    }
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        results = list(db.attendance.aggregate(pipeline))
        
        # Format the data for chart consumption
        chart_data = []
        current_date = start_date_obj
        
        while current_date <= end_date_obj:
            date_str = current_date.strftime("%Y-%m-%d")
            day_data = next((r for r in results if r["_id"] == date_str), None)
            
            if day_data:
                present_count = next((s["count"] for s in day_data["statuses"] if s["status"] == "Present"), 0)
                absent_count = next((s["count"] for s in day_data["statuses"] if s["status"] == "Absent"), 0)
                leave_count = next((s["count"] for s in day_data["statuses"] if s["status"] == "Leave"), 0)
            else:
                present_count = 0
                absent_count = 0
                leave_count = 0
            
            chart_data.append({
                "date": date_str,
                "present": present_count,
                "absent": absent_count,
                "leave": leave_count,
                "total": present_count + absent_count + leave_count
            })
            
            current_date += timedelta(days=1)
        
        return {
            "data": chart_data,
            "summary": {
                "total_days": len(chart_data),
                "total_present": sum(d["present"] for d in chart_data),
                "total_absent": sum(d["absent"] for d in chart_data),
                "total_leave": sum(d["leave"] for d in chart_data),
                "date_range": {
                    "start": start_date_obj.strftime("%Y-%m-%d"),
                    "end": end_date_obj.strftime("%Y-%m-%d")
                }
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error: {str(e)}")
