from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Query
from bson import ObjectId

from app.db.mongoDB import db
from app.schemas.mongodb_schema import Employee, EmployeeCreate, EmployeeUpdate

router = APIRouter(prefix="/api/employees", tags=["Employee Management"])

def generate_employee_code() -> str:
    last_employee = db.employees.find_one(sort=[("employee_code", -1)])
    if not last_employee or not last_employee.get("employee_code"):
        return "EMP-001"
    last_code = last_employee["employee_code"]
    try:
        num = int(last_code.split("-")[1])
        return f"EMP-{str(num + 1).zfill(3)}"
    except (IndexError, ValueError):
        return "EMP-001"

@router.get("/", response_model=dict)
def list_employees(
    search: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(8, ge=1, le=50)
):
    query = {}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"employee_code": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    if department:
        query["department_id"] = ObjectId(department)
    if status:
        query["status"] = status

    total = db.employees.count_documents(query)
    employees = list(db.employees.aggregate([
        {"$match": query},
        {"$lookup": {"from": "departments", "localField": "department_id", "foreignField": "_id", "as": "department"}},
        {"$unwind": {"path": "$department", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"full_name": 1}},
        {"$skip": (page - 1) * per_page},
        {"$limit": per_page}
    ]))

    return {
        "data": [Employee(**{**doc, "_id": str(doc["_id"]), "department_id": str(doc["department_id"])}) for doc in employees],
        "total": total,
        "page": page,
        "per_page": per_page
    }

@router.get("/{employee_id}", response_model=Employee)
def get_employee(employee_id: str):
    if not ObjectId.is_valid(employee_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid employee id")
    employee = db.employees.aggregate([
        {"$match": {"_id": ObjectId(employee_id)}},
        {"$lookup": {"from": "departments", "localField": "department_id", "foreignField": "_id", "as": "department"}},
        {"$unwind": {"path": "$department", "preserveNullAndEmptyArrays": True}}
    ]).next()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return Employee(**{**employee, "_id": str(employee["_id"]), "department_id": str(employee["department_id"])})

@router.post("/", response_model=Employee, status_code=status.HTTP_201_CREATED)
def create_employee(payload: EmployeeCreate):
    data = payload.model_dump()
    data["email"] = data["email"].lower()
    data["employee_code"] = generate_employee_code()
    
    # Validate and convert department_id (accepting department names from seeder)
    valid_departments = ["Engineering", "Marketing", "Sales", "Human Resources", "Finance"]
    if isinstance(data["department_id"], str) and data["department_id"] in valid_departments:
        # Look up department by name
        department = db.departments.find_one({"name": data["department_id"]})
        if not department:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Department '{data['department_id']}' not found")
        data["department_id"] = department["_id"]
    else:
        # Assume it's already an ObjectId string
        data["department_id"] = ObjectId(data["department_id"])
    
    data["joining_date"] = data.get("joining_date", datetime.utcnow())
    if isinstance(data["joining_date"], date):
        data["joining_date"] = datetime.combine(data["joining_date"], datetime.min.time())
    data["status"] = data.get("status", "Active")
    data["created_at"] = datetime.utcnow()
    data["updated_at"] = datetime.utcnow()

    if db.employees.find_one({"employee_code": data["employee_code"]}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee code generation failed")
    if db.employees.find_one({"email": data["email"]}):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    inserted = db.employees.insert_one(data)
    employee = db.employees.aggregate([
        {"$match": {"_id": inserted.inserted_id}},
        {"$lookup": {"from": "departments", "localField": "department_id", "foreignField": "_id", "as": "department"}},
        {"$unwind": {"path": "$department", "preserveNullAndEmptyArrays": True}}
    ]).next()
    return Employee(**{**employee, "_id": str(employee["_id"]), "department_id": str(employee["department_id"])})

@router.patch("/{employee_id}", response_model=Employee)
def update_employee(employee_id: str, payload: EmployeeUpdate):
    if not ObjectId.is_valid(employee_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid employee id")

    update_data = payload.model_dump(exclude_unset=True)
    if "email" in update_data:
        update_data["email"] = update_data["email"].lower()
        if db.employees.find_one({"email": update_data["email"], "_id": {"$ne": ObjectId(employee_id)}}):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    if "department_id" in update_data:
        # Try to lookup department by name first
        department = db.departments.find_one({"name": update_data["department_id"]})
        if department:
            update_data["department_id"] = department["_id"]
        else:
            # Check if it's a valid ObjectId string
            if ObjectId.is_valid(update_data["department_id"]):
                update_data["department_id"] = ObjectId(update_data["department_id"])
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid department_id: '{update_data['department_id']}' is not a valid department name or ObjectId")
    if "joining_date" in update_data:
        joining_date = update_data["joining_date"]
        if isinstance(joining_date, date):
            update_data["joining_date"] = datetime.combine(joining_date, datetime.min.time())

    update_data["updated_at"] = datetime.utcnow()

    result = db.employees.update_one({"_id": ObjectId(employee_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    employee = db.employees.aggregate([
        {"$match": {"_id": ObjectId(employee_id)}},
        {"$lookup": {"from": "departments", "localField": "department_id", "foreignField": "_id", "as": "department"}},
        {"$unwind": {"path": "$department", "preserveNullAndEmptyArrays": True}}
    ]).next()
    return Employee(**{**employee, "_id": str(employee["_id"]), "department_id": str(employee["department_id"])})

@router.delete("/{employee_id}")
def delete_employee(employee_id: str):
    if not ObjectId.is_valid(employee_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid employee id")
    result = db.employees.delete_one({"_id": ObjectId(employee_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    db.attendance.delete_many({"employee_id": ObjectId(employee_id)})
    return {"message": "Employee and associated attendance records removed"}
