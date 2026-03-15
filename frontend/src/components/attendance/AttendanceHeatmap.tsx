import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

interface AttendanceHeatmapProps {
  data: AttendanceRecord[];
}

export function AttendanceHeatmap({ data }: AttendanceHeatmapProps) {
  const heatmapData = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];
      const dayRecords = data.filter(record => record.date === dateStr);
      
      const present = dayRecords.filter(r => r.status === 'present').length;
      const absent = dayRecords.filter(r => r.status === 'absent').length;
      const total = dayRecords.length;
      
      days.push({
        date: dateStr,
        day: current.getDate(),
        present,
        absent,
        total,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [data]);

  const getIntensityColor = (percentage: number) => {
    if (percentage === 0) return "bg-gray-100";
    if (percentage < 25) return "bg-red-100";
    if (percentage < 50) return "bg-orange-100";
    if (percentage < 75) return "bg-yellow-100";
    if (percentage < 90) return "bg-green-100";
    return "bg-green-200";
  };

  const getIntensityBorder = (percentage: number) => {
    if (percentage === 0) return "border-gray-300";
    if (percentage < 25) return "border-red-300";
    if (percentage < 50) return "border-orange-300";
    if (percentage < 75) return "border-yellow-300";
    if (percentage < 90) return "border-green-300";
    return "border-green-400";
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const firstDay = new Date(heatmapData[0]?.date || new Date()).getDay();
  
  const weeks = [];
  let currentWeek = Array(7).fill(null);
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    currentWeek[i] = null;
  }
  
  // Fill in the days
  heatmapData.forEach((day, index) => {
    const dayIndex = (firstDay + index) % 7;
    currentWeek[dayIndex] = day;
    
    if (dayIndex === 6 || index === heatmapData.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = Array(7).fill(null);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Attendance Heatmap</CardTitle>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <span>Attendance presence pattern for the current month</span>
          <div className="flex items-center space-x-2">
            <span>Less</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              <div className="w-3 h-3 bg-green-200 border border-green-400 rounded"></div>
            </div>
            <span>More</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => (
                  <div key={dayIndex} className="aspect-square">
                    {day ? (
                      <div
                        className={`
                          w-full h-full border rounded flex flex-col items-center justify-center cursor-pointer
                          hover:opacity-80 transition-opacity
                          ${getIntensityColor(day.percentage)}
                          ${getIntensityBorder(day.percentage)}
                        `}
                        title={`${day.present}/${day.total} employees present (${day.percentage}%)`}
                      >
                        <span className="text-xs font-medium">{day.day}</span>
                        {day.total > 0 && (
                          <span className="text-xs">{day.percentage}%</span>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full"></div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
