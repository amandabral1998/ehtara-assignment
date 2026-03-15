from pymongo.collection import Collection
from app.db.mongoDB import db

class Database:
    def __init__(self) -> None:
        self.employees: Collection = db["employees"]
        self.attendance: Collection = db["attendance"]


database = Database()
