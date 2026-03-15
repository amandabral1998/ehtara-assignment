from pydantic import BaseModel, Field, field_serializer
from typing import Optional, List
from datetime import datetime, date
from bson import ObjectId

class Profile(BaseModel):
    id: str = Field(..., alias="_id")
    full_name: Optional[str]
    avatar_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    @field_serializer('id')
    def serialize_id(self, value):
        return str(value)

class Department(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    created_at: datetime

    @field_serializer('id')
    def serialize_id(self, value):
        return str(value)   

class Employee(BaseModel):
    id: str = Field(..., alias="_id")
    employee_code: str
    full_name: str
    email: str
    phone: Optional[str]
    department_id: str
    joining_date: datetime
    status: str
    created_at: datetime
    updated_at: datetime

    @field_serializer('id', 'department_id')
    def serialize_id(self, value):
        return str(value) if isinstance(value, ObjectId) else value

class Attendance(BaseModel):
    id: str = Field(..., alias="_id")
    employee_id: str
    date: datetime
    status: str
    marked_by: Optional[str]
    created_at: datetime
    updated_at: datetime

    @field_serializer('id', 'employee_id')
    def serialize_id(self, value):
        return str(value) if isinstance(value, ObjectId) else value

class EmployeeCreate(BaseModel):
    full_name: str
    email: str
    phone: Optional[str]
    department_id: str
    joining_date: Optional[date]

class EmployeeUpdate(BaseModel):
    full_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    department_id: Optional[str]
    status: Optional[str]
    joining_date: Optional[date]

class AttendanceCreate(BaseModel):
    employee_id: str
    date: datetime
    status: str

class AttendanceUpdate(BaseModel):
    status: str

class DepartmentCreate(BaseModel):
    name: str

class AnalyticsDepartment(BaseModel):
    department: str
    count: int

class AnalyticsAttendance(BaseModel):
    date: str
    present: int
    absent: int
    leave: int
