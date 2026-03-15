import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService } from "@/lib/api";

interface AttendanceFilters {
  startDate: string;
  endDate: string;
  employeeId: string;
  department: string;
  status: string;
}

interface AttendanceRecord {
  date: string;
  employee_name: string;
  employee_id: string;
  department: string;
  check_in: string;
  check_out: string;
  working_hours: string;
  status: string;
  remarks: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
}

interface AttendanceResponse {
  data: AttendanceRecord[];
  pagination: Pagination;
}

export function useAttendanceHistory() {
  const [filters, setFilters] = useState<AttendanceFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    employeeId: "all",
    department: "all",
    status: "all"
  });
  
  const [page, setPage] = useState(1);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<AttendanceResponse>({
    queryKey: ["attendance-history", page], // Remove filters from query key to prevent automatic refetch
    queryFn: async () => {
      const params = {
        start_date: filters.startDate,
        end_date: filters.endDate,
        employee_id: filters.employeeId === "all" ? undefined : filters.employeeId,
        department: filters.department === "all" ? undefined : filters.department,
        status: filters.status === "all" ? undefined : filters.status,
        page,
        limit: 10
      };
      return await apiService.getAttendanceHistory(params);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: false, // Disable automatic fetching
  });

  // Load initial data on component mount
  useEffect(() => {
    refetch();
  }, []);

  // Refetch when page changes
  useEffect(() => {
    refetch();
  }, [page, refetch]);

  const exportCSV = useMutation({
    mutationFn: async () => {
      // Convert 'all' values to undefined for API
      const exportFilters = {
        start_date: filters.startDate,
        end_date: filters.endDate,
        employee_id: filters.employeeId === "all" ? undefined : filters.employeeId,
        department: filters.department === "all" ? undefined : filters.department,
        status: filters.status === "all" ? undefined : filters.status,
      };
      const blob = await apiService.exportAttendanceHistoryCSV(exportFilters);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-history-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
    }
  });

  const exportPDF = useMutation({
    mutationFn: async () => {
      // Convert 'all' values to undefined for API
      const exportFilters = {
        start_date: filters.startDate,
        end_date: filters.endDate,
        employee_id: filters.employeeId === "all" ? undefined : filters.employeeId,
        department: filters.department === "all" ? undefined : filters.department,
        status: filters.status === "all" ? undefined : filters.status,
      };
      const blob = await apiService.exportAttendanceHistoryPDF(exportFilters);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-history-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
    }
  });

  const result = {
    data: data?.data || [],
    isLoading: isLoading || isManualLoading, // Combine both loading states
    error,
    pagination: data?.pagination || { total: 0, page: 1, limit: 10 },
    filters,
    setFilters,
    setPage,
    refetch,
    applyFilters: async () => {
      setIsManualLoading(true);
      try {
        // Clear the query cache to ensure fresh data
        queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
        // Then refetch with current filters
        await refetch();
      } finally {
        setIsManualLoading(false);
      }
    },
    exportCSV: exportCSV.mutateAsync,
    exportPDF: exportPDF.mutateAsync,
    isExporting: exportCSV.isPending || exportPDF.isPending
  };

  return result;
}
