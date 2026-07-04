import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Package, Users, Clock, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { toPersianNumber } from "@/lib/persian-utils";
import { apiRequest } from "@/lib/queryClient";

const SERVICE_ICONS = {
  FileText: "📄",
  Shield: "🛡️", 
  TrendingUp: "📈",
  Edit: "✏️",
  Package: "📦",
  Users: "👥",
  Settings: "⚙️",
  CheckCircle: "✅"
};

const DEPARTMENTS = [
  { value: "investment", label: "سرمایه‌گذاری" },
  { value: "administrative", label: "اداری" }
];

const SERVICE_CATEGORIES = [
  { value: "evaluation", label: "بررسی و ارزیابی" },
  { value: "verification", label: "تایید و اعتبارسنجی" },
  { value: "financial", label: "مالی" },
  { value: "registration", label: "ثبت و تغییرات" },
  { value: "consultation", label: "مشاوره" },
  { value: "technical", label: "فنی" }
];

export default function ServicesManagementFixed() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [services, setServices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUser();
    fetchServices();
    fetchStats();
  }, [selectedDepartment]);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.log("No auth token found");
        return;
      }
      
      const userData = await apiRequest("GET", "/api/auth/me");
      setUser(userData);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      if (error.message?.includes("401") || error.message?.includes("غیرمجاز")) {
        toast({
          title: "خطا",
          description: "لطفاً دوباره وارد سامانه شوید",
          variant: "destructive"
        });
      } else {
        toast({
          title: "خطا",
          description: "خطا در دریافت اطلاعات کاربر",
          variant: "destructive"
        });
      }
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.log("No auth token for services");
        setServices([]);
        return;
      }
      
      const params = new URLSearchParams();
      if (selectedDepartment && selectedDepartment !== "all") params.set('department', selectedDepartment);
      
      const servicesData = await apiRequest("GET", `/api/services?${params.toString()}`);
      setServices(Array.isArray(servicesData) ? servicesData : []);
    } catch (error: any) {
      console.error("Error fetching services:", error);
      setServices([]);
      if (error.message?.includes("401") || error.message?.includes("غیرمجاز")) {
        toast({
          title: "خطا",
          description: "لطفاً دوباره وارد سامانه شوید",
          variant: "destructive"
        });
      } else {
        toast({
          title: "خطا",
          description: "خطا در دریافت خدمات",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.log("No auth token for stats");
        return;
      }
      
      const params = new URLSearchParams();
      if (selectedDepartment && selectedDepartment !== "all") params.set('department', selectedDepartment);
      
      const statsData = await apiRequest("GET", `/api/services/statistics/overview?${params.toString()}`);
      setStats(statsData || {});
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      setStats({});
    }
  };

  const handleSubmitService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const serviceData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      department: formData.get('department') as string,
      category: formData.get('category') as string,
      icon: formData.get('icon') as string,
      estimatedDays: formData.get('estimatedDays') ? parseInt(formData.get('estimatedDays') as string) : null,
      isActive: true
    };

    try {
      if (editingService) {
        await apiRequest("PUT", `/api/services/${editingService.id}`, serviceData);
        toast({
          title: "موفقیت",
          description: "خدمت با موفقیت بروزرسانی شد"
        });
        setEditingService(null);
      } else {
        await apiRequest("POST", "/api/services", serviceData);
        toast({
          title: "موفقیت",
          description: "خدمت جدید با موفقیت ایجاد شد"
        });
        setIsCreateDialogOpen(false);
      }
      
      fetchServices();
      fetchStats();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm('آیا از حذف این خدمت اطمینان دارید؟')) return;

    try {
      await apiRequest("DELETE", `/api/services/${serviceId}`);
      toast({
        title: "موفقیت",
        description: "خدمت با موفقیت حذف شد"
      });
      fetchServices();
      fetchStats();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getDepartmentLabel = (dept: string) => {
    return DEPARTMENTS.find(d => d.value === dept)?.label || dept;
  };

  const getCategoryLabel = (cat: string) => {
    return SERVICE_CATEGORIES.find(c => c.value === cat)?.label || cat;
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              مدیریت خدمات (Fixed)
            </h1>
            <p className="text-text-secondary">
              تعریف و مدیریت خدمات ارائه شده به مشتریان
            </p>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">کل خدمات</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {toPersianNumber(stats.totalServices)}
                      </p>
                    </div>
                    <Package className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">درخواست‌های جدید</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {toPersianNumber(stats.pendingRequests)}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">تکمیل شده</p>
                      <p className="text-2xl font-bold text-green-600">
                        {toPersianNumber(stats.completedRequests)}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">کل درخواست‌ها</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {toPersianNumber(stats.totalRequests)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters and Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex gap-4">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="انتخاب واحد" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه واحدها</SelectItem>
                  {DEPARTMENTS.map(dept => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  ایجاد خدمت جدید
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>ایجاد خدمت جدید</DialogTitle>
                  <DialogDescription>
                    تعریف خدمت جدید برای ارائه به مشتریان
                  </DialogDescription>
                </DialogHeader>
                <ServiceForm 
                  onSubmit={handleSubmitService}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Services List */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p>در حال بارگیری...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">هیچ خدمتی تعریف نشده است</p>
              </div>
            ) : (
              services.map((service: any) => (
                <Card key={service.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {SERVICE_ICONS[service.icon as keyof typeof SERVICE_ICONS] || "📋"}
                        </span>
                        <div>
                          <CardTitle className="text-lg">{service.title}</CardTitle>
                          <p className="text-sm text-gray-500">
                            {getDepartmentLabel(service.department)}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={service.isActive ? "default" : "secondary"}
                        className={service.isActive ? "bg-green-100 text-green-800" : ""}
                      >
                        {service.isActive ? "فعال" : "غیرفعال"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {service.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {service.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {service.category && (
                        <Badge variant="outline" className="text-xs">
                          {getCategoryLabel(service.category)}
                        </Badge>
                      )}
                      {service.estimatedDays && (
                        <Badge variant="outline" className="text-xs">
                          {toPersianNumber(service.estimatedDays)} روز
                        </Badge>
                      )}
                    </div>

                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingService(service)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        ویرایش
                      </Button>
                      {user?.role === 'admin' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteService(service.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          حذف
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>

      {/* Edit Service Dialog */}
      {editingService && (
        <Dialog open={!!editingService} onOpenChange={() => setEditingService(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>ویرایش خدمت</DialogTitle>
              <DialogDescription>
                ویرایش اطلاعات خدمت {editingService.title}
              </DialogDescription>
            </DialogHeader>
            <ServiceForm 
              service={editingService}
              onSubmit={handleSubmitService}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Service Form Component
function ServiceForm({ 
  service, 
  onSubmit
}: { 
  service?: any; 
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">عنوان خدمت</Label>
          <Input
            id="title"
            name="title"
            defaultValue={service?.title || ''}
            placeholder="مثال: بررسی طرح کسب و کار"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">واحد</Label>
          <Select name="department" defaultValue={service?.department || 'investment'} required>
            <SelectTrigger>
              <SelectValue placeholder="انتخاب واحد" />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map(dept => (
                <SelectItem key={dept.value} value={dept.value}>
                  {dept.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">دسته‌بندی</Label>
          <Select name="category" defaultValue={service?.category || 'evaluation'}>
            <SelectTrigger>
              <SelectValue placeholder="انتخاب دسته‌بندی" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimatedDays">زمان تخمینی (روز)</Label>
          <Input
            id="estimatedDays"
            name="estimatedDays"
            type="number"
            min="1"
            defaultValue={service?.estimatedDays || ''}
            placeholder="7"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="icon">آیکون</Label>
        <Select name="icon" defaultValue={service?.icon || 'Package'}>
          <SelectTrigger>
            <SelectValue placeholder="انتخاب آیکون" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SERVICE_ICONS).map(([key, emoji]) => (
              <SelectItem key={key} value={key}>
                {emoji} {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">توضیحات</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={service?.description || ''}
          placeholder="توضیحات مفصل در مورد این خدمت..."
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-4">
        <Button type="submit" className="min-w-24">
          {service ? "بروزرسانی" : "ایجاد خدمت"}
        </Button>
      </div>
    </form>
  );
}

