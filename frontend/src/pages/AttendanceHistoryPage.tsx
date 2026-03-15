import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { AttendanceFilters } from "@/components/attendance/AttendanceFilters";
import { AttendanceTable } from "@/components/attendance/AttendanceTable";
import { AttendanceDetailDrawer } from "@/components/attendance/AttendanceDetailDrawer";
import { AttendanceEditDialog } from "@/components/attendance/AttendanceEditDialog";
import { useAttendanceHistory } from "../hooks/useAttendanceHistory";
import { apiService } from "@/lib/api";

export default function AttendanceHistoryPage() {
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const {
    data,
    isLoading,
    pagination,
    filters,
    setFilters,
    setPage,
    applyFilters,
    exportCSV,
    exportPDF
  } = useAttendanceHistory();

  const handleViewDetails = (record: any) => {
    setSelectedRecord(record);
    setIsDrawerOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (updatedRecord: any) => {
    try {
      // Call the API to update attendance status
      const response = await apiService.updateAttendanceStatus(updatedRecord._id, updatedRecord.status);
      
      if (response.success) {
        // Show success toast
        toast.success("Attendance status updated successfully!");
        // Refresh the data to show the updated status
        applyFilters();
        // Close the dialog on success
        setIsEditDialogOpen(false);
      } else {
        // Show error toast
        toast.error(`Failed to update attendance: ${response.message}`);
        // Keep dialog open on failure
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
      // Show error toast
      toast.error("Failed to update attendance. Please try again.");
      // Keep dialog open on failure
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportCSV();
    } catch (error) {
      console.error("Export CSV failed:", error);
    }
  };

  const handleExportPDF = async () => {
    try {
      await exportPDF();
    } catch (error) {
      console.error("Export PDF failed:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance History</h1>
          <p className="text-muted-foreground">Track employee attendance records and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportPDF}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AttendanceFilters 
        filters={filters}
        onFiltersChange={setFilters}
        onApply={applyFilters}
      />

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceTable
            data={data}
            isLoading={isLoading}
            pagination={pagination}
            onPageChange={setPage}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
          />
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <AttendanceDetailDrawer
        record={selectedRecord}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />

      {/* Edit Dialog */}
      <AttendanceEditDialog
        record={editingRecord}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveEdit}
      />
    </div>
  );
}
