import { Users, UserCheck, UserX, Clock, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/contexts/DataContext";

export default function DashboardPage() {
  const { employees, attendance, departments, employeesLoading, attendanceLoading, departmentsLoading } = useData();
  const today = new Date().toISOString().split("T")[0];
  const isLoading = employeesLoading || attendanceLoading || departmentsLoading;
  
  // Handle both individual records and summary data
  const todayData = attendance.find((r) => {
    const recordDate = r.date?.split('T')[0] || r.date;
    return recordDate === today;
  });
  
  // Initialize counts
  let present = 0;
  let absent = 0;
  let onLeave = 0;
  
  // If data is summary format (with present/absent/leave counts)
  if (todayData && 'present' in todayData) {
    present = (todayData as any).present || 0;
    absent = (todayData as any).absent || 0;
    onLeave = (todayData as any).leave || 0;
  } else {
    // If data is individual records format
    const todayRecords = attendance.filter((r) => {
      const recordDate = r.date?.split('T')[0] || r.date;
      return recordDate === today;
    });
    present = todayRecords.filter((r) => r.status === "Present").length;
    absent = todayRecords.filter((r) => r.status === "Absent").length;
    onLeave = todayRecords.filter((r) => r.status === "Leave").length;
  }
  
  const deptCount = departments.length;

  const cards = [
    { title: "Total Employees", value: employees.length, icon: Users, color: "text-primary" },
    { title: "Present Today", value: present, icon: UserCheck, color: "text-success" },
    { title: "Absent Today", value: absent, icon: UserX, color: "text-destructive" },
    { title: "On Leave", value: onLeave, icon: Clock, color: "text-warning" },
    { title: "Departments", value: deptCount, icon: Building2, color: "text-muted-foreground" },
  ];

  // Skeleton cards for loading state
  const skeletonCards = Array.from({ length: 5 }, (_, index) => (
    <Card key={`skeleton-${index}`} className="animate-pulse">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="h-4 bg-muted rounded w-24"></div>
        <div className="h-4 w-4 bg-muted rounded"></div>
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-muted rounded w-16"></div>
      </CardContent>
    </Card>
  ));

  // For summary view, create mock attendance records for display
  const recentAttendance = todayData && 'present' in todayData 
    ? [
        ...(present > 0 ? [{ status: "Present", count: present }] : []),
        ...(absent > 0 ? [{ status: "Absent", count: absent }] : []),
        ...(onLeave > 0 ? [{ status: "Leave", count: onLeave }] : []),
      ]
    : attendance.filter((r) => {
        const recordDate = r.date?.split('T')[0] || r.date;
        return recordDate === today;
      }).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of employee attendance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {isLoading ? skeletonCards : cards.map((card) => (
          <Card key={card.title} className="hover:-translate-y-0.5 transition-transform duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono-data">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {departmentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-muted rounded-full animate-pulse w-0"></div>
                      </div>
                      <div className="h-4 bg-muted rounded w-8 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {departments.map((dept) => {
                  const count = employees.filter((e) => e.department_id === dept._id).length;
                  const pct = employees.length ? Math.round((count / employees.length) * 100) : 0;
                  return (
                    <div key={dept._id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{dept.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm text-muted-foreground font-mono-data w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-muted rounded-full animate-pulse"></div>
                      <div className="h-4 bg-muted rounded w-32 animate-pulse"></div>
                    </div>
                    <div className="h-3 bg-muted rounded w-16 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : recentAttendance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance recorded today.</p>
            ) : (
              <div className="space-y-2">
                {recentAttendance.map((record, index) => {
                  // Handle summary format (with count)
                  if ('count' in record) {
                    const dotColor = record.status === "Present" ? "bg-success" : record.status === "Absent" ? "bg-destructive" : "bg-warning";
                    return (
                      <div key={record.status} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${dotColor}`} />
                          <span className="text-sm">{record.status}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{record.count} employees</span>
                      </div>
                    );
                  }
                  // Handle individual record format
                  const emp = employees.find((e) => e._id === record.employee_id || e.id === record.employee_id);
                  const dotColor = record.status === "Present" ? "bg-success" : record.status === "Absent" ? "bg-destructive" : "bg-warning";
                  return (
                    <div key={record.employee_id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${dotColor}`} />
                        <span className="text-sm">{emp?.full_name ?? record.employee_id}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{record.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
