from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Query, Body, Depends
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, date, timedelta
import json

from app.db.mongoDB import db
from app.schemas.mongodb_schema import Attendance, AttendanceCreate, AttendanceUpdate

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

router = APIRouter(prefix="/api/attendance-history", tags=["Attendance History"])

def convert_objectids(obj):
    """Recursively convert ObjectId objects to strings"""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: convert_objectids(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectids(item) for item in obj]
    else:
        return obj

# Response model for attendance history
class AttendanceHistoryResponse(BaseModel):
    data: List[Dict[str, Any]]
    pagination: Dict[str, Any]

# Response model for update
class UpdateAttendanceResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

# Request model for update
class UpdateAttendanceRequest(BaseModel):
    status: str

@router.get("/", response_model=dict)
def get_attendance_history(
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    status: Optional[str] = Query(None, description="Filter by status (Present, Absent, Leave)"),
    search: Optional[str] = Query(None, description="Search by employee name or ID"),
    page: int = Query(1, description="Page number"),
    limit: int = Query(10, description="Items per page")
):
    """
    Get attendance history with filtering and pagination
    """
    if not start_date or not end_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start date and end date are required")

    try:
        start_date_obj = datetime.fromisoformat(start_date).date()
        if end_date:
            end_date_obj = datetime.fromisoformat(end_date).date()
        else:
            end_date_obj = start_date_obj + timedelta(days=30)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format")

    # Build match conditions
    match_conditions = {
        "date": {
            "$gte": datetime.combine(start_date_obj, datetime.min.time()),
            "$lte": datetime.combine(end_date_obj, datetime.max.time())
        }
    }

    # Add employee filter
    if employee_id:
        try:
            # Check if it's a valid ObjectId (24-character hex string)
            if len(employee_id) == 24 and all(c in '0123456789abcdefABCDEF' for c in employee_id):
                match_conditions["employee_id"] = ObjectId(employee_id)
            else:
                # If not a valid ObjectId, try multiple string fields
                employee_filter = {
                    "$or": [
                        {"employee.employee_code": employee_id},
                        {"employee.id": employee_id},
                        {"employee._id": employee_id}
                    ]
                }
                # Merge with existing conditions
                if "$or" in match_conditions:
                    # If we already have an $or (from search), combine them
                    match_conditions = {
                        "$and": [
                            match_conditions,
                            employee_filter
                        ]
                    }
                else:
                    match_conditions.update(employee_filter)
        except Exception:
            # If ObjectId conversion fails, try string fields
            employee_filter = {
                "$or": [
                    {"employee.employee_code": employee_id},
                    {"employee.id": employee_id},
                    {"employee._id": employee_id}
                ]
            }
            # Merge with existing conditions
            if "$or" in match_conditions:
                # If we already have an $or (from search), combine them
                match_conditions = {
                    "$and": [
                        match_conditions,
                        employee_filter
                    ]
                }
            else:
                match_conditions.update(employee_filter)

    # Add department filter
    if department:
        try:
            # Check if it's a valid ObjectId (24-character hex string)
            if len(department) == 24 and all(c in '0123456789abcdefABCDEF' for c in department):
                match_conditions["employee.department_id"] = ObjectId(department)
            else:
                # If not a valid ObjectId, treat as a string field (e.g., department name)
                match_conditions["department.name"] = department
        except Exception:
            # If ObjectId conversion fails, treat as string field
            match_conditions["department.name"] = department

    # Add status filter
    if status:
        match_conditions["status"] = status

    # Add search filter
    if search:
        # Trim search term and ensure it's not empty
        search_term = search.strip()
        print(f"DEBUG: Search term received: '{search}' -> trimmed: '{search_term}'")
        
        if search_term:
            search_filter = {
                "$or": [
                    {"employee.full_name": {"$regex": search_term, "$options": "i"}},
                    {"employee.employee_code": {"$regex": search_term, "$options": "i"}},
                    {"employee_id_str": {"$regex": search_term, "$options": "i"}}
                ]
            }
            print(f"DEBUG: Search filter created: {search_filter}")
            
            # Merge with existing conditions
            if "$or" in match_conditions or "$and" in match_conditions:
                # If we already have complex conditions, combine them
                match_conditions = {
                    "$and": [
                        match_conditions,
                        search_filter
                    ]
                }
            else:
                match_conditions.update(search_filter)
            print(f"DEBUG: Final match_conditions: {match_conditions}")

    # Calculate skip for pagination
    skip = (page - 1) * limit

    # Get total count for pagination
    total_count = db.attendance.count_documents(match_conditions)

    # Get attendance records with pagination
    attendance_records = list(db.attendance.aggregate([
        {"$match": match_conditions},
        {"$lookup": {"from": "employees", "localField": "employee_id", "foreignField": "_id", "as": "employee"}},
        {"$unwind": {"path": "$employee", "preserveNullAndEmptyArrays": True}},
        {"$lookup": {"from": "departments", "localField": "employee.department_id", "foreignField": "_id", "as": "department"}},
        {"$unwind": {"path": "$department", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"date": -1}},
        {"$skip": skip},
        {"$limit": limit},
        {
            "$project": {
                "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
                "employee_name": "$employee.full_name",
                "employee_id": {"$toString": "$employee_id"},
                "employee_code": "$employee.employee_code",
                "department": {"$ifNull": ["$department.name", ""]},
                "check_in": {"$dateToString": {"format": "%H:%M", "date": "$check_in"}},
                "check_out": {"$dateToString": {"format": "%H:%M", "date": "$check_out"}},
                "working_hours": {"$ifNull": [{"$dateToString": {"format": "%H:%M", "date": "$working_hours"}}, ""]},
                "status": "$status",
                "remarks": {"$ifNull": ["$remarks", ""]},
                "employee_id_str": {"$toString": "$employee_id"},
                "department_id": {"$toString": {"$ifNull": ["$employee.department_id", ObjectId("000000000000000000000000")]}}
            }
        }
    ]))
    
    print(f"DEBUG: Found {len(attendance_records)} records")
    if attendance_records:
        print(f"DEBUG: Sample record: {attendance_records[0]}")
    else:
        print("DEBUG: No records found with current filters")

    # Convert any remaining ObjectId objects to strings
    attendance_records = convert_objectids(attendance_records)

    return {
        "data": attendance_records,
        "pagination": {
            "total": total_count,
            "page": page,
            "limit": limit
        }
    }

@router.get("/export/csv")
def export_attendance_history_csv(
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    status: Optional[str] = Query(None, description="Filter by status (Present, Absent, Leave)"),
    search: Optional[str] = Query(None, description="Search by employee name or ID")
):
    """
    Export attendance history as CSV
    """
    # Get data (reuse logic from get_attendance_history)
    data = get_attendance_history(start_date, end_date, employee_id, department, status, search, 1, 10000)
    
    # For now, return a simple response indicating CSV export would be generated
    return {
        "message": "CSV export functionality",
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
            "employee_id": employee_id,
            "department": department,
            "status": status,
            "search": search
        },
        "record_count": len(data["data"])
    }

@router.get("/export/pdf")
def export_attendance_history_pdf(
    start_date: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    end_date: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    department: Optional[str] = Query(None, description="Filter by department"),
    status: Optional[str] = Query(None, description="Filter by status (Present, Absent, Leave)"),
    search: Optional[str] = Query(None, description="Search by employee name or ID")
):
    """
    Export attendance history as PDF
    """
    # Get data (reuse logic from get_attendance_history)
    data = get_attendance_history(start_date, end_date, employee_id, department, status, search, 1, 10000)
    
    # For now, return a simple response indicating PDF export would be generated
    return {
        "message": "PDF export functionality",
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
            "employee_id": employee_id,
            "department": department,
            "status": status,
            "search": search
        },
        "record_count": len(data["data"])
    }

@router.put("/{attendance_id}", response_model=UpdateAttendanceResponse)
def update_attendance_status(
    attendance_id: str,
    request: UpdateAttendanceRequest
):
    """
    Update attendance status for a specific attendance record
    """
    try:
        status = request.status
        
        # Validate status
        valid_statuses = ["Present", "Absent", "Leave"]
        if status not in valid_statuses:
            return UpdateAttendanceResponse(
                success=False,
                message=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        
        # Convert attendance_id to ObjectId
        try:
            obj_id = ObjectId(attendance_id)
        except Exception:
            return UpdateAttendanceResponse(
                success=False,
                message="Invalid attendance ID format"
            )
        
        # Update the attendance record
        result = db.attendance.update_one(
            {"_id": obj_id},
            {"$set": {"status": status}}
        )
        
        if result.matched_count == 0:
            return UpdateAttendanceResponse(
                success=False,
                message="Attendance record not found"
            )
        
        if result.modified_count == 0:
            return UpdateAttendanceResponse(
                success=False,
                message="No changes made to the record"
            )
        
        # Get the updated record
        updated_record = db.attendance.find_one({"_id": obj_id})
        
        return UpdateAttendanceResponse(
            success=True,
            message="Attendance status updated successfully",
            data=convert_objectids(updated_record)
        )
        
    except Exception as e:
        return UpdateAttendanceResponse(
            success=False,
            message=f"Error updating attendance: {str(e)}"
        )
