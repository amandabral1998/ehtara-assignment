import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useData } from "@/contexts/DataContext";
import { StatusBadge } from "@/components/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/api";

type AttendanceStatusType = "Present" | "Absent" | "Leave";

const statuses: AttendanceStatusType[] = ["Present", "Absent", "Leave"];

export default function AttendancePage() {
  const { employees, departments, createAttendance, createBulkAttendance, updateAttendance } = useData();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatusType>("Present");
  
  // Use date-specific attendance query
  const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: () => apiService.getAttendance(selectedDate),
  });
  
  const attendance = attendanceData?.data || [];
  const markedCount = attendanceData?.marked || 0;
  const totalActive = attendanceData?.total_active || 0;

  const getStatus = (empId: string): AttendanceStatusType | null => {
    try {
      const record = attendance.find((r) => r.employee_id === empId);
      return record?.status ?? null;
    } catch (error) {
      console.error('Error getting status:', error);
      return null;
    }
  };

  const getDepartmentName = (empId: string): string => {
    try {
      // First try to get department from attendance data (populated)
      const attendanceRecord = attendance.find((r) => r.employee_id === empId);
      if (attendanceRecord?.department?.name) {
        return attendanceRecord.department.name;
      }
      
      // Fallback: lookup department by department_id from employees
      const emp = employees.find((e) => e._id === empId || e.id === empId);
      if (emp?.department_id) {
        const dept = departments.find((d) => d._id === emp.department_id);
        return dept?.name || "N/A";
      }
      
      return "N/A";
    } catch (error) {
      console.error('Error getting department name:', error);
      return "N/A";
    }
  };

  const handleMarkAttendance = async (empId: string, status: AttendanceStatusType) => {
    if (!empId) {
      console.error('Employee ID is missing');
      return;
    }
    
    // Check for existing record - try both date formats
    const existingRecord = attendance.find((r) => {
      const recordDate = r.date?.split('T')[0] || r.date;
      const selectedDateOnly = selectedDate;
      return r.employee_id === empId && recordDate === selectedDateOnly;
    });
    
    console.log('Existing record found:', existingRecord);
    console.log('Record _id:', existingRecord?._id);
    console.log('Record id:', existingRecord?.id);
    
    try {
      if (existingRecord) {
        // Update existing attendance - use _id from MongoDB response
        const recordId = existingRecord._id || existingRecord.id;
        if (!recordId) {
          console.error('No valid record ID found:', existingRecord);
          return;
        }
        await updateAttendance(recordId, { status });
        console.log('Attendance updated successfully');
      } else {
        // Create new attendance
        const attendanceData = {
          employee_id: empId,
          date: selectedDate + 'T00:00:00',
          status: status,
          marked_by: "system"
        };
        await createAttendance(attendanceData);
        console.log('Attendance created successfully');
      }
    } catch (error) {
      console.error('Failed to mark attendance:', error);
    }
  };

  const handleMarkSelected = async () => {
    if (!selectedEmployee) {
      console.error('No employee selected');
      return;
    }
    
    // Check for existing record - try both date formats
    const existingRecord = attendance.find((r) => {
      const recordDate = r.date?.split('T')[0] || r.date;
      const selectedDateOnly = selectedDate;
      return r.employee_id === selectedEmployee && recordDate === selectedDateOnly;
    });
    
    console.log('Selected existing record found:', existingRecord);
    console.log('Selected Record _id:', existingRecord?._id);
    console.log('Selected Record id:', existingRecord?.id);
    
    try {
      if (existingRecord) {
        // Update existing attendance - use _id from MongoDB response
        const recordId = existingRecord._id || existingRecord.id;
        if (!recordId) {
          console.error('No valid record ID found:', existingRecord);
          return;
        }
        await updateAttendance(recordId, { status: selectedStatus });
        console.log('Selected attendance updated successfully');
      } else {
        // Create new attendance
        const attendanceData = {
          employee_id: selectedEmployee,
          date: selectedDate + 'T00:00:00',
          status: selectedStatus,
          marked_by: "system"
        };
        await createAttendance(attendanceData);
        console.log('Selected attendance created successfully');
      }
      setSelectedEmployee("");
    } catch (error) {
      console.error('Failed to mark attendance:', error);
    }
  };

  // Filter active employees and get attendance records for selected date
  // Use populated employee data from attendance when available, fallback to employees list
  const activeEmployees = employees.filter(emp => emp.status === 'Active').map(emp => {
    // Find if this employee has attendance data with populated info
    const attendanceRecord = attendance.find(r => r.employee_id === emp._id || r.employee_id === emp.id);
    if (attendanceRecord?.employee) {
      return {
        ...emp,
        ...attendanceRecord.employee, // Use populated data from API
        // Keep original _id for consistency
        _id: emp._id || emp.id
      };
    }
    return emp;
  });
  const dayRecords = attendance.filter(record => record.date === selectedDate);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground">Mark and manage daily attendance</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Select Date</Label>
              <Input id="date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-48" />
            </div>
          </div>
          {selectedEmployee && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Selected: {activeEmployees.find(emp => emp.id === selectedEmployee)?.full_name}</span>
              <select 
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value as AttendanceStatusType)}
                className="flex h-8 w-32 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <Button size="sm" onClick={handleMarkSelected}>Mark Attendance</Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedEmployee("")}>Clear</Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="hidden sm:table-cell">Department</TableHead>
                <TableHead>Current Status</TableHead>
                <TableHead>Mark Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceLoading ? (
                // Skeleton loading rows
                Array.from({ length: 8 }, (_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <div>
                        <div className="h-4 bg-muted animate-pulse rounded w-32 mb-1"></div>
                        <div className="h-3 bg-muted animate-pulse rounded w-20"></div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-6 bg-muted animate-pulse rounded w-20"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-8 bg-muted animate-pulse rounded w-28"></div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // Real attendance data
                activeEmployees.map((emp) => {
                  const currentStatus = getStatus(emp._id);
                  // Try to get employee data from attendance record first, then fallback
                  const attendanceRecord = attendance.find((r) => r.employee_id === emp._id);
                  const employeeData = attendanceRecord?.employee || emp;
                  return (
                    <TableRow 
                      key={emp._id} 
                      className={selectedEmployee === emp._id ? "bg-muted/50" : "cursor-pointer hover:bg-muted/30"}
                      onClick={() => setSelectedEmployee(selectedEmployee === emp._id ? "" : emp._id)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{employeeData.full_name}</div>
                          <div className="text-xs text-muted-foreground font-mono-data">{employeeData.employee_code || emp._id}</div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{getDepartmentName(emp._id)}</TableCell>
                      <TableCell>
                        {currentStatus ? <StatusBadge status={currentStatus} /> : <span className="text-xs text-muted-foreground">Not marked</span>}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <select 
                          value={currentStatus || ""} 
                          onChange={(e) => handleMarkAttendance(emp._id, e.target.value as AttendanceStatusType)}
                          className="flex h-8 w-28 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select</option>
                          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
