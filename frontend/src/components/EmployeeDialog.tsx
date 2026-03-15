import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/contexts/DataContext";
import { Employee, EmployeeCreate, EmployeeUpdate } from "@/data/dummy-data";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
}

export function EmployeeDialog({ open, onOpenChange, employee }: Props) {
  const { departments, createEmployee, updateEmployee } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    department_name: "",
    joining_date: new Date().toISOString().split("T")[0],
    status: "Active"
  });
  
  console.log(employee, 'employee');
  

  useEffect(() => {
    if (open) {
      if (employee) {
        const dept = departments.find((d:any) => d._id === employee.department_id);
        console.log('Found department:', dept?.name, 'for employee department_id:', employee.department_id);
        setForm({
          full_name: employee.full_name,
          email: employee.email,
          phone: employee.phone || "",
          department_name: dept ? dept.name : employee.department_id,
          joining_date: employee.joining_date.split("T")[0],
          status: employee.status
        });
        console.log('Set form department_name to:', dept ? dept.name : employee.department_id);
      } else {
        setForm({
          full_name: "",
          email: "",
          phone: "",
          department_name: "",
          joining_date: new Date().toISOString().split("T")[0],
          status: "Active"
        });
      }
    }
  }, [employee, open, departments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();    
    
    // Debug: Log the form data
    console.log("Form data being submitted:", form);
    
    // Validate required fields
    if (!form.department_name) {
      toast.error("Please select a department");
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (employee) {
        // Update existing employee - use EmployeeUpdate interface
        const updateData: EmployeeUpdate = {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          department_id: form.department_name,
          status: form.status as 'Active' | 'Inactive',
          joining_date: form.joining_date
        };
        await updateEmployee(employee._id, updateData);
        toast.success("Employee updated successfully");
      } else {
        // Create new employee - use EmployeeCreate interface
        const createData: EmployeeCreate = {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          department_id: form.department_name,
          joining_date: form.joining_date
        };
        await createEmployee(createData);
        toast.success("Employee created successfully");
      }
      
      // Only close dialog on success
      onOpenChange(false);
      
      // Reset form for next use
      setForm({
        full_name: "",
        email: "",
        phone: "",
        department_name: "",
        joining_date: new Date().toISOString().split("T")[0],
        status: "Active"
      });
      
    } catch (error) {
      console.error('Failed to save employee:', error);
      toast.error(`Failed to ${employee ? 'update' : 'create'} employee. Please try again.`);
      // Keep dialog open on failure - do not close
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{employee ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="department">Department *</Label>
              <select 
                id="department"
                value={form.department_name} 
                onChange={(e) => setForm({ ...form, department_name: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Select department</option>
                {departments && departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {!form.department_name && (
                <p className="text-sm text-red-500 mt-1">Please select a department</p>
              )}
            </div>
            <div>
              <Label htmlFor="joiningDate">Joining Date</Label>
              <Input id="joiningDate" type="date" value={form.joining_date} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select 
                id="status"
                value={form.status} 
                onChange={(e) => setForm({ ...form, status: e.target.value as "Active" | "Inactive" })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {employee ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>{employee ? "Update" : "Add"} Employee</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
