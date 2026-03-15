import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";

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

interface AttendanceChartProps {
  data: AttendanceRecord[];
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  const chartData = useMemo(() => {
    const groupedData = data.reduce((acc, record) => {
      const date = record.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          present: 0,
          absent: 0,
          total: 0
        };
      }
      
      acc[date].total++;
      if (record.status === 'present') {
        acc[date].present++;
      } else if (record.status === 'absent') {
        acc[date].absent++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(groupedData)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30) // Last 30 days
      .map(item => ({
        ...item,
        displayDate: format(new Date(item.date), "MMM dd")
      }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded" 
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="capitalize">{entry.name}</span>
              </div>
              <span className="font-medium">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Present vs Absent by Date</CardTitle>
        <p className="text-sm text-muted-foreground">
          Daily attendance comparison for the last 30 days
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="displayDate" 
              className="text-xs"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis className="text-xs" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="present" 
              fill="#10B981" 
              name="Present" 
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="absent" 
              fill="#EF4444" 
              name="Absent" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
