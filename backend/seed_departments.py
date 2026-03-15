from app.db.mongoDB import db
from datetime import datetime

def seed_departments():
    """Seed departments collection with sample data"""
    
    # Clear existing departments
    db.departments.delete_many({})
    
    departments = [
        {
            "name": "Engineering",
            "description": "Software development and IT infrastructure",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Human Resources",
            "description": "Employee management and recruitment",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Sales",
            "description": "Sales and business development",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Marketing",
            "description": "Marketing and communications",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Finance",
            "description": "Financial planning and accounting",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Operations",
            "description": "Business operations and logistics",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Customer Support",
            "description": "Customer service and support",
            "created_at": datetime.utcnow()
        },
        {
            "name": "Product",
            "description": "Product management and design",
            "created_at": datetime.utcnow()
        }
    ]
    
    # Insert departments
    result = db.departments.insert_many(departments)
    
    print(f"✅ Successfully seeded {len(result.inserted_ids)} departments:")
    for i, dept in enumerate(departments, 1):
        print(f"   {i}. {dept['name']} - {dept['description']}")
    
    return result.inserted_ids

if __name__ == "__main__":
    seed_departments()
