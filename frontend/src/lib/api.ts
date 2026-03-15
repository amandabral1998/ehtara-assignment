import {
  Department, Attendance, AttendanceSummary,
  EmployeeCreate, EmployeeUpdate,
  AttendanceCreate, AttendanceUpdate,
  EmployeesResponse, AnalyticsDepartment, AnalyticsAttendance,
  Employee, DepartmentCreate
} from "@/data/dummy-data";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { responseType?: 'blob' } = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const url = `${this.baseURL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} ${error}`);
    }

    // Handle blob responses for file downloads
    if (options.responseType === 'blob') {
      return response.blob() as Promise<T>;
    }

    return response.json();
  }

  // Departments
  async getDepartments() {
    return this.request<Department[]>('/api/departments');
  }

  async createDepartment(data: DepartmentCreate) {
    return this.request<Department>('/api/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Employees
  async getEmployees(params?: {
    search?: string;
    department?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.department) searchParams.set('department', params.department);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString());

    const query = searchParams.toString();
    return this.request<EmployeesResponse>(`/api/employees${query ? `?${query}` : ''}`);
  }

  async getEmployee(id: string) {
    return this.request<Employee>(`/api/employees/${id}`);
  }

  async createEmployee(data: EmployeeCreate) {
    return this.request<Employee>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployee(id: string, data: EmployeeUpdate) {
    return this.request<Employee>(`/api/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteEmployee(id: string) {
    return this.request<{ message: string }>(`/api/employees/${id}`, {
      method: 'DELETE',
    });
  }

  // Attendance
  async getAttendance(date: string) {
    return this.request<AttendanceSummary>(`/api/attendance?date=${date}`);
  }

  async createAttendance(data: AttendanceCreate) {
    return this.request<Attendance>('/api/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createBulkAttendance(data: AttendanceCreate[]) {
    return this.request<{ message: string; inserted: number; skipped: number }>('/api/attendance/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEmployeeAttendance(employeeId: string) {
    return this.request<Attendance[]>(`/api/attendance/employee/${employeeId}`);
  }

  async updateAttendance(id: string, data: AttendanceUpdate) {
    return this.request<Attendance>(`/api/attendance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Note: Authentication methods have been removed as requested
  // The application no longer requires login, register, or forgot password functionality

  // Analytics
  async getDepartmentAnalytics() {
    return this.request<AnalyticsDepartment[]>('/api/analytics/departments');
  }

  async getAttendanceAnalytics(days: number = 30) {
    return this.request<AnalyticsAttendance[]>(`/api/analytics/attendance?days=${days}`);
  }

  async getAttendanceChart(days: number = 30) {
    return this.request<any>(`/api/attendance/chart?days=${days}`);
  }

  // Attendance History
  async getAttendanceHistory(params?: {
    start_date?: string;
    end_date?: string;
    employee_id?: string;
    department?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.employee_id) searchParams.set('employee_id', params.employee_id);
    if (params?.department) searchParams.set('department', params.department);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<any>(`/api/attendance-history${query ? `?${query}` : ''}`);
  }

  async exportAttendanceHistoryCSV(params?: {
    start_date?: string;
    end_date?: string;
    employee_id?: string;
    department?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.employee_id) searchParams.set('employee_id', params.employee_id);
    if (params?.department) searchParams.set('department', params.department);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<Blob>(`/api/attendance-history/export/csv${query ? `?${query}` : ''}`, {
      responseType: 'blob'
    });
  }

  async exportAttendanceHistoryPDF(params?: {
    start_date?: string;
    end_date?: string;
    employee_id?: string;
    department?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set('start_date', params.start_date);
    if (params?.end_date) searchParams.set('end_date', params.end_date);
    if (params?.employee_id) searchParams.set('employee_id', params.employee_id);
    if (params?.department) searchParams.set('department', params.department);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.request<Blob>(`/api/attendance-history/export/pdf${query ? `?${query}` : ''}`, {
      responseType: 'blob'
    });
  }

  async updateAttendanceStatus(attendanceId: string, status: string) {
    return this.request<any>(`/api/attendance-history/${attendanceId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }
}

export const apiService = new ApiService(API_BASE_URL);
