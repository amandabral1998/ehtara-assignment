import React, { createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/lib/api";
import {
  Employee, Attendance, Department, AttendanceSummary,
  EmployeeCreate, EmployeeUpdate, AttendanceCreate, AttendanceUpdate,
  EmployeesResponse, AnalyticsDepartment, AnalyticsAttendance
} from "@/data/dummy-data";

interface DataContextType {
  // Departments
  departments: Department[];
  departmentsLoading: boolean;

  // Employees
  employees: Employee[];
  employeesLoading: boolean;
  employeesTotal: number;
  employeesPage: number;
  employeesPerPage: number;
  getEmployees: (params?: {
    search?: string;
    department?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }) => void;
  createEmployee: (data: EmployeeCreate) => Promise<Employee>;
  updateEmployee: (id: string, data: EmployeeUpdate) => Promise<Employee>;
  deleteEmployee: (id: string) => Promise<void>;

  // Attendance
  attendance: Attendance[];
  attendanceLoading: boolean;
  markedCount: number;
  totalActive: number;
  getAttendance: (date: string) => void;
  createAttendance: (data: AttendanceCreate) => Promise<Attendance>;
  createBulkAttendance: (data: AttendanceCreate[]) => Promise<{ inserted: number; skipped: number }>;
  updateAttendance: (id: string, data: AttendanceUpdate) => Promise<Attendance>;

  // Analytics
  departmentAnalytics: AnalyticsDepartment[];
  attendanceAnalytics: AnalyticsAttendance[];
  analyticsLoading: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be inside DataProvider");
  return ctx;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  // Departments
  const { data: departmentsData, isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiService.getDepartments(),
  });

  const departments = departmentsData || [];

  // Employees
  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => apiService.getEmployees(),
  });

  const employees = employeesData?.data || [];
  const employeesTotal = employeesData?.total || 0;
  const employeesPage = employeesData?.page || 1;
  const employeesPerPage = employeesData?.per_page || 8;

  const createEmployeeMutation = useMutation({
    mutationFn: (data: EmployeeCreate) => apiService.createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeUpdate }) =>
      apiService.updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!id || id === 'undefined') {
        throw new Error('Invalid employee ID');
      }
      await apiService.deleteEmployee(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  // Attendance
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', new Date().toISOString().split('T')[0]],
    queryFn: () => apiService.getAttendance(new Date().toISOString().split('T')[0]),
    // enabled: false, // Manual trigger - commented out to enable auto-fetch
  });

  const attendance = attendanceData?.data || [];
  const markedCount = attendanceData?.marked || 0;
  const totalActive = attendanceData?.total_active || 0;

  const createAttendanceMutation = useMutation({
    mutationFn: (data: AttendanceCreate) => apiService.createAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const createBulkAttendanceMutation = useMutation({
    mutationFn: (data: AttendanceCreate[]) => apiService.createBulkAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AttendanceUpdate }) =>
      apiService.updateAttendance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  // Analytics
  const { data: departmentAnalytics = [], isLoading: deptAnalyticsLoading } = useQuery({
    queryKey: ['analytics', 'departments'],
    queryFn: () => apiService.getDepartmentAnalytics(),
  });

  const { data: attendanceAnalytics = [], isLoading: attAnalyticsLoading } = useQuery({
    queryKey: ['analytics', 'attendance'],
    queryFn: () => apiService.getAttendanceAnalytics(),
  });

  const analyticsLoading = deptAnalyticsLoading || attAnalyticsLoading;

  const getEmployees = (params?: {
    search?: string;
    department?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }) => {
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  const getAttendance = (date: string) => {
    queryClient.fetchQuery({
      queryKey: ['attendance', date],
      queryFn: () => apiService.getAttendance(date),
    });
  };

  return (
    <DataContext.Provider
      value={{
        // Departments
        departments,
        departmentsLoading,

        // Employees
        employees,
        employeesLoading,
        employeesTotal,
        employeesPage,
        employeesPerPage,
        getEmployees,
        createEmployee: createEmployeeMutation.mutateAsync as (data: EmployeeCreate) => Promise<Employee>,
        updateEmployee: (id: string, data: EmployeeUpdate) => (updateEmployeeMutation.mutateAsync as (params: { id: string; data: EmployeeUpdate }) => Promise<Employee>)({ id, data }),
        deleteEmployee: deleteEmployeeMutation.mutateAsync,

        // Attendance
        attendance,
        attendanceLoading,
        markedCount,
        totalActive,
        getAttendance,
        createAttendance: createAttendanceMutation.mutateAsync as (data: AttendanceCreate) => Promise<Attendance>,
        createBulkAttendance: createBulkAttendanceMutation.mutateAsync as (data: AttendanceCreate[]) => Promise<{ inserted: number; skipped: number }>,
        updateAttendance: (id: string, data: AttendanceUpdate) => (updateAttendanceMutation.mutateAsync as (params: { id: string; data: AttendanceUpdate }) => Promise<Attendance>)({ id, data }),

        // Analytics
        departmentAnalytics,
        attendanceAnalytics,
        analyticsLoading,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
