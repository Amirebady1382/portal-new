import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, MessageCircle, Bell, BellOff, Users, Activity, Settings } from 'lucide-react';

interface Employee {
  id: number;
  username: string;
  fullName: string;
  department: string | null;
  role: string;
}

interface EmployeeBaleSettings {
  id: number;
  employeeId: number;
  baleChatId: string | null;
  baleUserId: string | null;
  isActive: boolean;
  notificationsEnabled: boolean;
  departmentFilter: string | null;
  lastActivity: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface EmployeeWithSettings {
  employee: Employee;
  baleSettings: EmployeeBaleSettings;
}

interface BaleStats {
  totalEmployees: number;
  employeesWithBale: number;
  activeConnections: number;
  byDepartment: Record<string, number>;
}

interface FormData {
  employeeId: number | null;
  baleChatId: string;
  baleUserId: string;
  isActive: boolean;
  notificationsEnabled: boolean;
  departmentFilter: string[];
}

const initialFormData: FormData = {
  employeeId: null,
  baleChatId: '',
  baleUserId: '',
  isActive: true,
  notificationsEnabled: true,
  departmentFilter: []
};

const DEPARTMENTS = [
  { value: 'investment', label: 'واحد سرمایه‌گذاری' },
  { value: 'administrative', label: 'واحد اداری' },
  { value: 'technical', label: 'واحد فنی' },
  { value: 'support', label: 'پشتیبانی' }
];

export default function AdminEmployeeBaleSettings() {
  const { toast } = useToast();
  const [employeesWithSettings, setEmployeesWithSettings] = useState<EmployeeWithSettings[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<BaleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<{
    search: string;
    department: string;
    status: 'all' | 'active' | 'inactive';
  }>({
    search: '',
    department: '',
    status: 'all'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await apiRequest("GET", '/api/admin/employee-bale-settings');
      setEmployeesWithSettings(data.employeesWithSettings);
      setAvailableEmployees(data.availableEmployees);
      setStats(data.stats);
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در بارگذاری داده‌ها',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await apiRequest("POST", '/api/admin/employee-bale-settings', formData);

      toast({
        title: 'موفقیت',
        description: 'تنظیمات بله کارمند ذخیره شد'
      });
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در ذخیره تنظیمات',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (item: EmployeeWithSettings) => {
    setEditingEmployeeId(item.employee.id);
    setFormData({
      employeeId: item.employee.id,
      baleChatId: item.baleSettings.baleChatId || '',
      baleUserId: item.baleSettings.baleUserId || '',
      isActive: item.baleSettings.isActive,
      notificationsEnabled: item.baleSettings.notificationsEnabled,
      departmentFilter: item.baleSettings.departmentFilter 
        ? JSON.parse(item.baleSettings.departmentFilter) 
        : []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (employeeId: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/employee-bale-settings/${employeeId}`);

      toast({
        title: 'موفقیت',
        description: 'تنظیمات بله کارمند حذف شد'
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در حذف تنظیمات',
        variant: 'destructive'
      });
    }
  };

  const handleToggleStatus = async (employeeId: number) => {
    try {
      await apiRequest("POST", `/api/admin/employee-bale-settings/${employeeId}/toggle-status`);

      toast({
        title: 'موفقیت',
        description: 'وضعیت بله کارمند تغییر کرد'
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در تغییر وضعیت',
        variant: 'destructive'
      });
    }
  };

  const handleToggleNotifications = async (employeeId: number) => {
    try {
      await apiRequest("POST", `/api/admin/employee-bale-settings/${employeeId}/toggle-notifications`);

      toast({
        title: 'موفقیت',
        description: 'تنظیمات اعلان‌رسانی تغییر کرد'
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در تغییر تنظیمات اعلان',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingEmployeeId(null);
  };

  const filteredEmployees = employeesWithSettings.filter(item => {
    const matchesSearch = !filter.search || 
      item.employee.fullName.toLowerCase().includes(filter.search.toLowerCase()) ||
      item.employee.username.toLowerCase().includes(filter.search.toLowerCase());
    
    const matchesDepartment = !filter.department || item.employee.department === filter.department;
    const matchesStatus = filter.status === 'all' || 
      (filter.status === 'active' && item.baleSettings.isActive) ||
      (filter.status === 'inactive' && !item.baleSettings.isActive);

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getDepartmentLabel = (department: string | null) => {
    if (!department) return 'تعریف نشده';
    const found = DEPARTMENTS.find(d => d.value === department);
    return found ? found.label : department;
  };

  const formatLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) return 'هیچ‌گاه';
    try {
      const date = new Date(lastActivity);
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return 'نامعلوم';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">مدیریت اتصال بله کارمندان</h1>
          <p className="text-gray-600 mt-2">
            مدیریت اتصال کارمندان به سیستم چت بله
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="gap-2">
              <Plus className="w-4 h-4" />
              اتصال جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {editingEmployeeId ? 'ویرایش تنظیمات بله' : 'اتصال کارمند به بله'}
              </DialogTitle>
              <DialogDescription>
                اطلاعات اتصال کارمند به سیستم چت بله را وارد کنید
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="employee">کارمند *</Label>
                <Select 
                  value={formData.employeeId?.toString() || ''} 
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, employeeId: parseInt(value) }))
                  }
                  disabled={!!editingEmployeeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب کارمند" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map(employee => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.fullName} ({employee.username})
                        {employee.department && (
                          <span className="text-gray-500 mr-2">
                            - {getDepartmentLabel(employee.department)}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                    {editingEmployeeId && (
                      <SelectItem value={editingEmployeeId.toString()}>
                        {employeesWithSettings.find(e => e.employee.id === editingEmployeeId)?.employee.fullName}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="baleChatId">Chat ID بله</Label>
                  <Input
                    id="baleChatId"
                    value={formData.baleChatId}
                    onChange={(e) => setFormData(prev => ({ ...prev, baleChatId: e.target.value }))}
                    placeholder="مثال: 123456789"
                    dir="ltr"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    شناسه چت بله کارمند
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="baleUserId">User ID بله</Label>
                  <Input
                    id="baleUserId"
                    value={formData.baleUserId}
                    onChange={(e) => setFormData(prev => ({ ...prev, baleUserId: e.target.value }))}
                    placeholder="مثال: 987654321"
                    dir="ltr"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    شناسه کاربری بله
                  </p>
                </div>
              </div>
              
              <div>
                <Label>فیلتر واحدها</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {DEPARTMENTS.map(department => (
                    <div key={department.value} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={department.value}
                        checked={formData.departmentFilter.includes(department.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev,
                              departmentFilter: [...prev.departmentFilter, department.value]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              departmentFilter: prev.departmentFilter.filter(d => d !== department.value)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={department.value} className="text-sm">
                        {department.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  کارمند فقط پیام‌های واحدهای انتخاب شده را دریافت می‌کند
                </p>
              </div>
              
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="isActive">فعال</Label>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="notificationsEnabled"
                    checked={formData.notificationsEnabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notificationsEnabled: checked }))}
                  />
                  <Label htmlFor="notificationsEnabled">اعلان‌رسانی</Label>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit">
                  {editingEmployeeId ? 'به‌روزرسانی' : 'ایجاد'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                کل کارمندان
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                متصل به بله
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.employeesWithBale}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                اتصال فعال
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activeConnections}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">درصد پوشش</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((stats.employeesWithBale / stats.totalEmployees) * 100)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">جستجو</Label>
              <Input
                id="search"
                value={filter.search}
                onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                placeholder="جستجو در نام یا نام کاربری..."
              />
            </div>
            
            <div>
              <Label htmlFor="departmentFilter">واحد</Label>
              <Select value={filter.department} onValueChange={(value) => 
                setFilter(prev => ({ ...prev, department: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="همه واحدها" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">همه واحدها</SelectItem>
                  {DEPARTMENTS.map(department => (
                    <SelectItem key={department.value} value={department.value}>
                      {department.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="statusFilter">وضعیت</Label>
              <Select value={filter.status} onValueChange={(value) => 
                setFilter(prev => ({ ...prev, status: value as typeof filter.status }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="inactive">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            کارمندان متصل به بله ({filteredEmployees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">در حال بارگذاری...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>کارمند</TableHead>
                  <TableHead>واحد</TableHead>
                  <TableHead>Chat ID</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>اعلان‌ها</TableHead>
                  <TableHead>آخرین فعالیت</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((item) => (
                  <TableRow key={item.employee.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.employee.fullName}</div>
                        <div className="text-sm text-gray-500">@{item.employee.username}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getDepartmentLabel(item.employee.department)}</TableCell>
                    <TableCell>
                      {item.baleSettings.baleChatId ? (
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {item.baleSettings.baleChatId}
                        </code>
                      ) : (
                        <span className="text-gray-400">تعریف نشده</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStatus(item.employee.id)}
                        className="gap-1"
                      >
                        {item.baleSettings.isActive ? (
                          <Badge className="bg-green-100 text-green-800">فعال</Badge>
                        ) : (
                          <Badge variant="secondary">غیرفعال</Badge>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleNotifications(item.employee.id)}
                        className="gap-1"
                      >
                        {item.baleSettings.notificationsEnabled ? (
                          <Bell className="w-4 h-4 text-blue-600" />
                        ) : (
                          <BellOff className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatLastActivity(item.baleSettings.lastActivity)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف اتصال بله</AlertDialogTitle>
                              <AlertDialogDescription>
                                آیا از حذف اتصال بله برای کارمند "{item.employee.fullName}" اطمینان دارید؟
                                این عمل غیرقابل برگشت است.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>انصراف</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(item.employee.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                حذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEmployees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      {employeesWithSettings.length === 0 
                        ? 'هیچ کارمندی به بله متصل نیست' 
                        : 'نتیجه‌ای برای فیلتر اعمال شده یافت نشد'
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Available Employees */}
      {availableEmployees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              کارمندان قابل اتصال ({availableEmployees.length})
            </CardTitle>
            <CardDescription>
              کارمندانی که هنوز به سیستم چت بله متصل نشده‌اند
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableEmployees.map((employee) => (
                <Card key={employee.id} className="border-dashed">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{employee.fullName}</h4>
                        <p className="text-sm text-gray-500">@{employee.username}</p>
                        <p className="text-sm text-blue-600">
                          {getDepartmentLabel(employee.department)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, employeeId: employee.id }));
                          setIsDialogOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

