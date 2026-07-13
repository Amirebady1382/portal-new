import { useState, useEffect } from "react";
import { Package, Plus, Edit, Trash2 } from "lucide-react";
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

export default function ServicesManagementSimpleClean() {
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        toast({
          title: "خطا",
          description: "لطفاً ابتدا وارد سامانه شوید",
          variant: "destructive"
        });
        return;
      }
      
      console.log("🔍 Fetching services...");
      const servicesData = await apiRequest("GET", "/api/services");
      console.log("✅ Services data:", servicesData);
      
      setServices(Array.isArray(servicesData) ? servicesData : []);
      
      toast({
        title: "موفق",
        description: `${servicesData?.length || 0} خدمت بارگیری شد`,
      });
      
    } catch (error: any) {
      console.error("❌ Error fetching services:", error);
      toast({
        title: "خطا",
        description: error.message || "خطا در دریافت خدمات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      
      const userData = await apiRequest("GET", "/api/auth/me");
      setUser(userData);
    } catch (error: any) {
      console.error("Error fetching user:", error);
    }
  };

  const handleDeleteService = async (serviceId: number, serviceName: string) => {
    if (!confirm(`آیا از حذف خدمت "${serviceName}" اطمینان دارید؟`)) return;

    try {
      await apiRequest("DELETE", `/api/services/${serviceId}`);
      toast({
        title: "موفق",
        description: "خدمت با موفقیت حذف شد"
      });
      fetchServices(); // Refresh list
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "خطا در حذف خدمت",
        variant: "destructive"
      });
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
          title: "موفق",
          description: "خدمت با موفقیت بروزرسانی شد"
        });
        setEditingService(null);
      } else {
        await apiRequest("POST", "/api/services", serviceData);
        toast({
          title: "موفق",
          description: "خدمت جدید با موفقیت ایجاد شد"
        });
        setIsCreateDialogOpen(false);
      }
      
      fetchServices(); // Refresh list
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "خطا در ذخیره خدمت",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchUser();
    fetchServices();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              مدیریت خدمات
            </h1>
            <p className="text-text-secondary">
              نمایش و مدیریت خدمات سیستم
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mb-6">
            <Button onClick={fetchServices} disabled={loading}>
              {loading ? "در حال بارگیری..." : "بروزرسانی"}
            </Button>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  خدمت جدید
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>ایجاد خدمت جدید</DialogTitle>
                  <DialogDescription>
                    تعریف خدمت جدید برای ارائه به مشتریان
                  </DialogDescription>
                </DialogHeader>
                <ServiceForm onSubmit={handleSubmitService} />
              </DialogContent>
            </Dialog>
          </div>

          {/* Services List */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p>در حال بارگیری...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">هیچ خدمتی یافت نشد</p>
                <Button onClick={fetchServices} className="mt-4">
                  تلاش مجدد
                </Button>
              </div>
            ) : (
              services.map((service: any) => (
                <Card key={service.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {service.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {service.description && (
                        <p className="text-sm text-gray-600">{service.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {service.department === "investment" ? "سرمایه‌گذاری" : "اداری"}
                        </Badge>
                        
                        {service.category && (
                          <Badge variant="outline">{service.category}</Badge>
                        )}
                        
                        {service.estimatedDays && (
                          <Badge variant="outline">{service.estimatedDays} روز</Badge>
                        )}
                        
                        <Badge className={service.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {service.isActive ? "فعال" : "غیرفعال"}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingService(service)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          ویرایش
                        </Button>
                        {user?.role === 'admin' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteService(service.id, service.title)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            حذف
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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
                <ServiceForm service={editingService} onSubmit={handleSubmitService} />
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
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

