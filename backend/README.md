# HRMS Backend

## Project Overview

This is the backend API for the HRMS (Human Resource Management System) application. It provides RESTful endpoints for managing employees and their attendance records, built with FastAPI and MongoDB.

## Tech Stack

- Python 3.8+
- FastAPI
- MongoDB
- Pydantic
- Uvicorn

## Prerequisites

- Python 3.8 or higher
- MongoDB Atlas account or local MongoDB instance

## Steps to Run the Project Locally

1. Create a virtual environment:
   ```
   python -m venv env
   ```

2. Activate the virtual environment:
   - On Windows:
     ```
     .\env\Scripts\activate
     ```
   - On macOS/Linux:
     ```
     source env/bin/activate
     ```

3. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Update the `.env` file with your MongoDB URL and database name.

5. Run the backend server:
   ```
   uvicorn app.main:app --reload
   ```

The backend will be running at http://127.0.0.1:8000

## API Documentation

Visit http://127.0.0.1:8000/docs for the FastAPI interactive documentation.
