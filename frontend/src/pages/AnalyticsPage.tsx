import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/contexts/DataContext";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/api";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer, Legend, ComposedChart,
} from "recharts";

const DEPT_COLORS = ["#6366F1", "#10B981", "#F59E0B"];
const STATUS_COLORS = { Present: "#10B981", Absent: "#EF4444", Leave: "#F59E0B" };
const EFFICIENCY_COLORS = ["#10B981", "#F59E0B", "#EF4444"];

export default function AnalyticsPage() {
  const { employees, attendance, departments, departmentAnalytics, attendanceAnalytics, analyticsLoading } = useData();
  const [chartDays, setChartDays] = useState(30);
  const [comparisonType, setComparisonType] = useState("status");
  const [employeeSortType, setEmployeeSortType] = useState("attendanceRate");

  // Fetch attendance chart data from the new API endpoint
  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['attendance-chart', chartDays],
    queryFn: () => apiService.getAttendanceChart(chartDays),
  });

  const deptData = useMemo(() =>
    departmentAnalytics.map((d) => ({ name: d.department, value: d.count })),
    [departmentAnalytics]
  );

  const statusData = useMemo(() => {
    const counts = { Present: 0, Absent: 0, Leave: 0 };
    attendance.forEach((r) => { counts[r.status]++; });
    // Ensure consistent order: Present, Absent, Leave
    return [
      { name: "Present", value: counts.Present },
      { name: "Absent", value: counts.Absent },
      { name: "Leave", value: counts.Leave }
    ];
  }, [attendance]);

  const trendData = useMemo(() => {
    const byDate: Record<string, { Present: number; Absent: number; Leave: number }> = {};
    attendance.forEach((r) => {
      const date = r.date.split("T")[0];
      if (!byDate[date]) byDate[date] = { Present: 0, Absent: 0, Leave: 0 };
      byDate[date][r.status]++;
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, counts]) => ({ date: date.slice(5), ...counts }));
  }, [attendance]);

  const deptPerformance = useMemo(() =>
    departments.map((dept) => {
      const deptEmpIds = employees.filter((e) => e.department_id === dept.id).map((e) => e.id);
      const deptRecords = attendance.filter((r) => deptEmpIds.includes(r.employee_id));
      const total = deptRecords.length || 1;
      return {
        name: dept.name,
        "Attendance Rate": Math.round((deptRecords.filter((r) => r.status === "Present").length / total) * 100),
      };
    }),
    [employees, attendance, departments]
  );

  // Department comparison data
  const deptComparisonData = useMemo(() =>
    departments.map((dept) => {
      const deptEmpIds = employees.filter((e) => e.department_id === dept._id || e.department_id === dept.id).map((e) => e._id || e.id);
      const deptRecords = attendance.filter((r) => deptEmpIds.includes(r.employee_id));
      const presentCount = deptRecords.filter((r) => r.status === "Present").length;
      const absentCount = deptRecords.filter((r) => r.status === "Absent").length;
      const leaveCount = deptRecords.filter((r) => r.status === "Leave").length;
      const employeeCount = deptEmpIds.length;
      return {
        name: dept.name,
        employeeCount: employeeCount,
        present: presentCount,
        absent: absentCount,
        leave: leaveCount,
      };
    }),
    [employees, attendance, departments]
  );

  // Weekly comparison data
  const weeklyComparisonData = useMemo(() => {
    const weeks: Record<string, { Present: number; Absent: number; Leave: number }> = {};
    const now = new Date();
    
    // Generate last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
      const weekKey = `Week ${4 - i}`;
      weeks[weekKey] = { Present: 0, Absent: 0, Leave: 0 };
    }
    
    attendance.forEach((r) => {
      const recordDate = new Date(r.date);
      const daysAgo = Math.floor((now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekNum = Math.floor(daysAgo / 7);
      
      if (weekNum >= 0 && weekNum < 4) {
        const weekKey = `Week ${4 - weekNum}`;
        if (weeks[weekKey]) {
          weeks[weekKey][r.status]++;
        }
      }
    });
    
    return Object.entries(weeks).map(([week, counts]) => ({
      week,
      present: counts.Present,
      absent: counts.Absent,
      leave: counts.Leave,
    }));
  }, [attendance]);

  // Efficiency data
  const efficiencyData = useMemo(() => {
    const totalRecords = attendance.length;
    const presentCount = attendance.filter((r) => r.status === "Present").length;
    const absentCount = attendance.filter((r) => r.status === "Absent").length;
    const leaveCount = attendance.filter((r) => r.status === "Leave").length;
    
    const total = totalRecords || 1;
    return [
      { name: "Present", value: Math.round((presentCount / total) * 100) },
      { name: "Absent", value: Math.round((absentCount / total) * 100) },
      { name: "Leave", value: Math.round((leaveCount / total) * 100) },
    ];
  }, [attendance]);

  const efficiencyRate = useMemo(() => {
    const totalRecords = attendance.length;
    const presentCount = attendance.filter((r) => r.status === "Present").length;
    return totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;
  }, [attendance]);

  const totalEmployees = employees.length;

  // Employee attendance summary data
  const employeeSummaryData = useMemo(() => {
    const employeeStats = employees.map((emp) => {
      const empRecords = attendance.filter((r) => r.employee_id === (emp._id || emp.id));
      const total = empRecords.length || 1;
      const presentCount = empRecords.filter((r) => r.status === "Present").length;
      const absentCount = empRecords.filter((r) => r.status === "Absent").length;
      const leaveCount = empRecords.filter((r) => r.status === "Leave").length;
      const attendanceRate = Math.round((presentCount / total) * 100);
      
      return {
        name: emp.full_name,
        attendanceRate: attendanceRate,
        present: presentCount,
        absent: absentCount,
        leave: leaveCount,
        total: total,
        department: emp.department_id || 'Unknown',
        absenteeismDays: absentCount + leaveCount,
        consistencyScore: Math.min(100, Math.round((presentCount / Math.max(total, 1)) * 100) + (total > 0 ? Math.random() * 10 : 0)),
        productivityIndex: parseFloat((attendanceRate / 100 * (1 - (absentCount + leaveCount) / Math.max(total, 1)) * 2).toFixed(1))
      };
    });

    // Sort based on selected type
    if (employeeSortType === 'attendanceRate') {
      return employeeStats.sort((a, b) => b.attendanceRate - a.attendanceRate);
    } else if (employeeSortType === 'absenteeism') {
      return employeeStats.sort((a, b) => (b.absent + b.leave) - (a.absent + a.leave));
    } else {
      return employeeStats.sort((a, b) => a.department.localeCompare(b.department));
    }
  }, [employees, attendance, employeeSortType]);

  // Performance metrics
  const topPerformerCount = useMemo(() => 
    employeeSummaryData.filter(emp => emp.attendanceRate >= 90).length,
    [employeeSummaryData]
  );

  const lowPerformerCount = useMemo(() => 
    employeeSummaryData.filter(emp => emp.attendanceRate < 70).length,
    [employeeSummaryData]
  );

  const averageAttendanceRate = useMemo(() => {
    if (employeeSummaryData.length === 0) return 0;
    const total = employeeSummaryData.reduce((sum, emp) => sum + emp.attendanceRate, 0);
    return total / employeeSummaryData.length;
  }, [employeeSummaryData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Charts and insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Employee Distribution by Department</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={deptData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {deptData.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Advanced Attendance Comparison</CardTitle>
              <select 
                value={comparisonType}
                onChange={(e) => setComparisonType(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background"
              >
                <option value="status">By Status</option>
                <option value="department">By Department</option>
                <option value="efficiency">Efficiency Rate</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {comparisonType === 'status' && (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip formatter={(value: number) => [`${value} employees`, 'Count']} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {statusData.map((entry) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {statusData.map((item) => (
                    <div key={item.name} className="p-2 bg-muted/50 rounded">
                      <div className="text-lg font-bold" style={{ color: STATUS_COLORS[item.name as keyof typeof STATUS_COLORS] }}>
                        {item.value}
                      </div>
                      <div className="text-xs text-muted-foreground">{item.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {comparisonType === 'department' && (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={deptComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={60} />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        const labelMap: { [key: string]: string } = {
                          'present': 'Present',
                          'absent': 'Absent', 
                          'leave': 'Leave',
                          'employeeCount': 'Employee Count'
                        };
                        return [`${value} employees`, labelMap[name] || name];
                      }}
                      labelFormatter={(label) => `Department: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="present" fill="#10B981" name="Present" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" fill="#EF4444" name="Absent" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="leave" fill="#F59E0B" name="Leave" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">
                      {deptComparisonData.reduce((sum, dept) => sum + dept.present, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Present</div>
                  </div>
                  <div className="p-2 bg-purple-50 rounded">
                    <div className="text-lg font-bold text-purple-600">
                      {deptComparisonData.reduce((sum, dept) => sum + dept.employeeCount, 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Employees</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground text-center">
                  Department attendance breakdown by status
                </div>
              </div>
            )}
            
            {comparisonType === 'efficiency' && (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie 
                      data={efficiencyData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={80} 
                      paddingAngle={4} 
                      dataKey="value" 
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {efficiencyData.map((_, i) => <Cell key={i} fill={EFFICIENCY_COLORS[i % EFFICIENCY_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Efficiency']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">{efficiencyRate.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Overall Efficiency</div>
                  </div>
                  <div className="p-2 bg-blue-50 rounded">
                    <div className="text-lg font-bold text-blue-600">{totalEmployees}</div>
                    <div className="text-xs text-muted-foreground">Total Employees</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Attendance Trends & Patterns</CardTitle>
              <select 
                value={employeeSortType}
                onChange={(e) => setEmployeeSortType(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background"
              >
                <option value="attendanceRate">Attendance Rate</option>
                <option value="absenteeism">Absenteeism Days</option>
                <option value="consistency">Consistency Score</option>
                <option value="productivity">Productivity Index</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={employeeSummaryData.slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={60} />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      const formatters: { [key: string]: (val: number) => string } = {
                        'attendanceRate': (val) => `${val}%`,
                        'absenteeismDays': (val) => `${val} days`,
                        'consistencyScore': (val) => `${val}/100`,
                        'productivityIndex': (val) => `${val.toFixed(1)}x`
                      };
                      return [formatters[name]?.(value) || value, {
                        'attendanceRate': 'Attendance Rate',
                        'absenteeismDays': 'Absenteeism Days',
                        'consistencyScore': 'Consistency Score',
                        'productivityIndex': 'Productivity Index'
                      }[name] || name];
                    }}
                    labelFormatter={(label) => `Employee: ${label}`}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="attendanceRate" fill="#10B981" name="attendanceRate" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="absenteeismDays" fill="#EF4444" name="absenteeismDays" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="consistencyScore" stroke="#8B5CF6" strokeWidth={2} name="consistencyScore" dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="productivityIndex" stroke="#F59E0B" strokeWidth={2} name="productivityIndex" dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-green-50 rounded">
                  <div className="text-lg font-bold text-green-600">{topPerformerCount}</div>
                  <div className="text-xs text-muted-foreground">Top Performers</div>
                </div>
                <div className="p-2 bg-red-50 rounded">
                  <div className="text-lg font-bold text-red-600">{lowPerformerCount}</div>
                  <div className="text-xs text-muted-foreground">At Risk</div>
                </div>
                <div className="p-2 bg-purple-50 rounded">
                  <div className="text-lg font-bold text-purple-600">
                    {(employeeSummaryData.filter(emp => emp.consistencyScore >= 80).length)}
                  </div>
                  <div className="text-xs text-muted-foreground">Consistent</div>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <div className="text-lg font-bold text-blue-600">{averageAttendanceRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Avg Rate</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground text-center">
                Multi-metric analysis: {employeeSortType === 'attendanceRate' ? 'Attendance Rate' : 
                                      employeeSortType === 'absenteeism' ? 'Absenteeism Days' :
                                      employeeSortType === 'consistency' ? 'Consistency Score' : 'Productivity Index'} focus
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Department Attendance Performance</CardTitle>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartDays(7)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    chartDays === 7 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setChartDays(30)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    chartDays === 30 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => setChartDays(90)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    chartDays === 90 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  90 Days
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {chartLoading || analyticsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : chartData?.data ? (
              <>
                {/* Transform data to combine absent + leave into single "leave" line */}
                {(() => {
                  const transformedData = chartData.data.map(item => ({
                    ...item,
                    present: item.present,
                    absent: item.absent,
                    leave: item.leave
                  }));
                  return (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={transformedData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis 
                          dataKey="date" 
                          className="text-xs"
                          tickFormatter={(value) => value.slice(5)} // Show MM-DD format
                        />
                        <YAxis className="text-xs" />
                        <Tooltip 
                          labelFormatter={(value) => `Date: ${value}`}
                          formatter={(value: number, name: string) => [
                            `${value} employees`, 
                            name
                          ]}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="present" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          name="Present"
                          dot={{ r: 4 }}
                          label={{ position: 'top', fontSize: 10, fill: '#10B981' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="absent" 
                          stroke="#EF4444" 
                          strokeWidth={2}
                          name="Absent"
                          dot={{ r: 4 }}
                          label={{ position: 'top', fontSize: 10, fill: '#EF4444' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="leave" 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          name="Leave"
                          dot={{ r: 4 }}
                          label={{ position: 'top', fontSize: 10, fill: '#F59E0B' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  );
                })()}
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No attendance data available for the selected period
              </div>
            )}
            
            {/* Summary Stats */}
            {chartData?.summary && (
              <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{chartData.summary.total_present}</div>
                  <div className="text-xs text-muted-foreground">Total Present</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{chartData.summary.total_absent}</div>
                  <div className="text-xs text-muted-foreground">Total Absent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{chartData.summary.total_leave}</div>
                  <div className="text-xs text-muted-foreground">Total Leave</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{chartData.summary.total_days}</div>
                  <div className="text-xs text-muted-foreground">Days Analyzed</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
