import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
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
  location?: string;
  notes?: string;
}

interface AttendanceDetailDrawerProps {
  record: AttendanceRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceDetailDrawer({ record, open, onOpenChange }: AttendanceDetailDrawerProps) {
  if (!record) return null;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      present: { label: "Present", className: "bg-green-100 text-green-800 hover:bg-green-200" },
      absent: { label: "Absent", className: "bg-red-100 text-red-800 hover:bg-red-200" },
      late: { label: "Late", className: "bg-orange-100 text-orange-800 hover:bg-orange-200" },
      half_day: { label: "Half Day", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200" },
      wfh: { label: "Work From Home", className: "bg-blue-100 text-blue-800 hover:bg-blue-200" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      className: "bg-gray-100 text-gray-800 hover:bg-gray-200"
    };

    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatTime = (time: string) => {
    if (!time) return "--";
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "EEEE, MMMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const detailItems = [
    { label: "Employee Name", value: record.employee_name },
    { label: "Employee ID", value: record.employee_id },
    { label: "Department", value: record.department },
    { label: "Date", value: formatDate(record.date) },
    { label: "Check In", value: formatTime(record.check_in) },
    { label: "Check Out", value: formatTime(record.check_out) },
    { label: "Working Hours", value: record.working_hours || "--" },
    { label: "Status", value: getStatusBadge(record.status) },
    { label: "Location", value: record.location || "Office" },
    { label: "Notes", value: record.notes || record.remarks || "--" },
  ];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b">
          <DrawerTitle>Attendance Details</DrawerTitle>
        </DrawerHeader>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Employee Info Card */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-semibold text-primary">
                  {record.employee_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">{record.employee_name}</h3>
                <p className="text-sm text-muted-foreground">{record.employee_id} • {record.department}</p>
              </div>
            </div>
          </div>

          {/* Attendance Details */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Attendance Information
            </h4>
            
            <div className="grid grid-cols-1 gap-4">
              {detailItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm font-medium text-muted-foreground">
                    {item.label}
                  </span>
                  <div className="text-sm font-medium text-right">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Additional Information
            </h4>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
                <div className="text-sm text-blue-800">
                  <p className="font-medium">System Information</p>
                  <p className="text-blue-600 mt-1">
                    This attendance record was automatically generated based on check-in and check-out times.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
