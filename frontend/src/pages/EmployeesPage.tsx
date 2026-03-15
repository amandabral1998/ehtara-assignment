import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/contexts/DataContext";
import { StatusBadge } from "@/components/StatusBadge";
import { EmployeeDialog } from "@/components/EmployeeDialog";
import { toast } from "sonner";

export default function EmployeesPage() {
  const { employees, departments, employeesLoading, createEmployee, updateEmployee, deleteEmployee } = useData();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<typeof employees[0] | null>(null);
  const [page, setPage] = useState(0);
  const perPage = 8;

  // Debounce search input with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0); // Reset to first page when search changes
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Helper function to get department name
  const getDepartmentName = (emp: any) => {
    // Try to use populated department first, then fallback to lookup
    if (emp.department?.name) {
      return emp.department.name;
    }
    
    // Fallback: lookup department by department_id
    if (emp.department_id) {
      const dept = departments.find((d) => d._id === emp.department_id);
      return dept?.name || "N/A";
    }
    
    return "N/A";
  };

  // Use useMemo to only recalculate filtered results when debouncedSearch or deptFilter changes
  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const matchSearch = e.full_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                         e.employee_code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                         e.email.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchDept = deptFilter === "all" || e.department_id === deptFilter;
      
      return matchSearch && matchDept;
    });
  }, [employees, debouncedSearch, deptFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-sm text-muted-foreground">{employees.length} total employees</p>
        </div>
        <Button onClick={() => { setEditingEmp(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, code, or email..." value={search} onChange={(e) => { setSearch(e.target.value); }} className="pl-9" />
            </div>
            <select 
              value={deptFilter} 
              onChange={(v) => { setDeptFilter(v.target.value); setPage(0); }}
              className="w-full sm:w-44 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {employeesLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono-data">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="h-4 bg-muted animate-pulse rounded w-16"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-muted animate-pulse rounded w-32"></div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="h-4 bg-muted animate-pulse rounded w-24"></div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="h-4 bg-muted animate-pulse rounded w-40"></div>
                    </TableCell>
                    <TableCell>
                      <div className="h-6 bg-muted animate-pulse rounded w-16"></div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
                        <div className="h-8 w-8 bg-muted animate-pulse rounded"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono-data">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium font-mono-data">{emp.employee_code}</TableCell>
                    <TableCell>{emp.full_name}</TableCell>
                    <TableCell className="hidden md:table-cell">{getDepartmentName(emp)}</TableCell>
                    <TableCell className="hidden lg:table-cell">{emp.email}</TableCell>
                    <TableCell>
                      <StatusBadge status={emp.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => { setEditingEmp(emp); setDialogOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            console.log(emp, 'EMP');
                            if (emp?._id) {
                              deleteEmployee(emp._id);
                            } else {
                              toast.error('Invalid employee ID');
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={editingEmp}
      />
    </div>
  );
}
