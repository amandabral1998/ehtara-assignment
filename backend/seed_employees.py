from app.db.mongoDB import db
from datetime import datetime
import random

def seed_employees():
    """Seed employees collection with sample data"""
    
    # Get departments
    departments = list(db.departments.find())
    if not departments:
        print("❌ No departments found. Please run seed_departments.py first.")
        return
    
    # Clear existing employees
    db.employees.delete_many({})
    
    first_names = ["John", "Jane", "Michael", "Sarah", "David", "Emily", "Robert", "Lisa", "James", "Mary"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
    
    employees = []
    for i in range(20):  # Create 20 employees
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        department = random.choice(departments)
        
        employee = {
            "full_name": f"{first_name} {last_name}",
            "email": f"{first_name.lower()}.{last_name.lower()}@company.com",
            "phone": f"+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
            "department_id": str(department["_id"]),
            "position": random.choice(["Manager", "Senior Developer", "Developer", "Designer", "Analyst", "Coordinator", "Specialist"]),
            "salary": random.randint(50000, 120000),
            "hire_date": datetime.utcnow(),
            "status": random.choice(["active", "on_leave", "inactive"]),
            "created_at": datetime.utcnow()
        }
        employees.append(employee)
    
    # Insert employees
    result = db.employees.insert_many(employees)
    
    print(f"✅ Successfully seeded {len(result.inserted_ids)} employees:")
    
    # Show department distribution
    dept_counts = {}
    for emp in employees:
        dept_name = next((d["name"] for d in departments if str(d["_id"]) == emp["department_id"]), "Unknown")
        dept_counts[dept_name] = dept_counts.get(dept_name, 0) + 1
    
    print("\nDepartment Distribution:")
    for dept_name, count in sorted(dept_counts.items()):
        print(f"   {dept_name}: {count} employees")
    
    return result.inserted_ids

if __name__ == "__main__":
    seed_employees()
