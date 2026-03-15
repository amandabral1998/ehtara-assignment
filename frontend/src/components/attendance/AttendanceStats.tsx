import { Card, CardContent } from "@/components/ui/card";
import { Users, UserCheck, UserX, Clock } from "lucide-react";

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

interface AttendanceStatsProps {
  data: any[];
  isLoading?: boolean;
}

export function AttendanceStats({ data, isLoading }: AttendanceStatsProps) {
  // Calculate stats from the data
  const totalEmployees = new Set(data.map(record => record.employee_id)).size;
  const today = new Date().toISOString().split('T')[0];
  
  const todayRecords = data.filter(record => record.date === today);
  const presentToday = todayRecords.filter(record => record.status === 'present').length;
  const absentToday = todayRecords.filter(record => record.status === 'absent').length;
  
  // Calculate late arrivals (check-in after 9:00 AM)
  const lateArrivals = todayRecords.filter(record => {
    if (record.check_in && record.status === 'present') {
      const checkInTime = record.check_in.split(':');
      const hour = parseInt(checkInTime[0]);
      const minute = parseInt(checkInTime[1]);
      return hour > 9 || (hour === 9 && minute > 0);
    }
    return false;
  }).length;

  const stats = [
    {
      title: "Total Employees",
      value: totalEmployees.toString(),
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Present Today",
      value: presentToday.toString(),
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Absent Today",
      value: absentToday.toString(),
      icon: UserX,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Late Arrivals",
      value: lateArrivals.toString(),
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4"></div>
                <div className="text-sm text-gray-400">Loading...</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
