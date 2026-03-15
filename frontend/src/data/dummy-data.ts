export interface Department {
  _id: string;
  id: string;
  name: string;
  created_at: string;
}

export interface Employee {
  id: string;
  _id: string;
  employee_code: string;
  full_name: string;
  email: string;
  phone?: string;
  department_id: string;
  department?: Department;
  joining_date: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  _id: string;
  id?: string;
  employee_id: string;
  employee?: Employee;
  department?: Department;
  date: string;
  status: 'Present' | 'Absent' | 'Leave';
  marked_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummary {
  data: Attendance[];
  marked: number;
  total_active: number;
}

export interface EmployeesResponse {
  data: Employee[];
  total: number;
  page: number;
  per_page: number;
}

export interface AnalyticsDepartment {
  department: string;
  count: number;
}

export interface AnalyticsAttendance {
  date: string;
  present: number;
  absent: number;
  leave: number;
}

export interface EmployeeCreate {
  full_name: string;
  email: string;
  phone?: string;
  department_id: string;
  joining_date?: string;
}

export interface EmployeeUpdate {
  full_name?: string;
  email?: string;
  phone?: string;
  department_id?: string;
  joining_date?: string;
  status?: 'Active' | 'Inactive';
}

export interface AttendanceCreate {
  employee_id: string;
  date: string;
  status: 'Present' | 'Absent' | 'Leave';
  marked_by?: string;
}

export interface AttendanceUpdate {
  status: 'Present' | 'Absent' | 'Leave';
}

export interface DepartmentCreate {
  name: string;
}
