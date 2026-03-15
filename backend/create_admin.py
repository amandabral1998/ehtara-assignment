#!/usr/bin/env python3
"""
Script to create a default admin user for development
"""
import os
from datetime import datetime
from passlib.context import CryptContext
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# Database connection
client = MongoClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017/"))
db = client[os.getenv("DATABASE_NAME", "hr_system")]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_default_admin():
    email = "admin@ehatara.com"
    password = "admin123"

    # Check if admin already exists
    if db.admins.find_one({"email": email}):
        print(f"Admin user {email} already exists")
        return

    # Create admin user
    hashed_password = pwd_context.hash(password)
    admin_data = {
        "email": email,
        "hashed_password": hashed_password,
        "created_at": datetime.utcnow()
    }

    db.admins.insert_one(admin_data)
    print(f"Created admin user: {email}")
    print(f"Password: {password}")
    print("You can now login with these credentials")

if __name__ == "__main__":
    create_default_admin()
