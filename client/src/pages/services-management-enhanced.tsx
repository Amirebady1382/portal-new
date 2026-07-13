import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Edit, Trash2, Building, FileText, CheckCircle, XCircle, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import ServiceWizard from "@/components/service-wizard";

const DEPARTMENTS = [
  { value: "investment", label: "واحد سرمایه‌گذاری" },
  { value: "administrative", label: "واحد اداری" },
];

const SERVICE_CATEGORIES = [
  { value: "facilities", label: "تسهیلات" },
  { value: "investment", label: "سرمایه‌گذاری" },
  { value: "guarantee", label: "ضمانت‌نامه" }
];

export default function ServicesManagementEnhanced() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState("services");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false); // Also acts as "Is Wizard Open"
  const [isEditing, setIsEditing] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // Kept for legacy dialogs if needed, but we will use wizard
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isFormsDialogOpen, setIsFormsDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [companySearchQuery, setCompanySearchQuery] = useState("");

  // Service Form State
  const [serviceForm, setServiceForm] = useState({
    title: "",
    description: "",
    department: "investment",
    category: "",
    icon: "Package",
    estimatedDays: "",
    requirements: "",
  });

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery<any[]>({
    queryKey: ["/api/services"],
    queryFn: async () => {
      const result = await apiRequest("GET", "/api/services");
      return Array.isArray(result) ? result : [];
    },
  });

  // Fetch companies
  const { data: companies = [], isLoading: companiesLoading } = useQuery<any[]>({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      const result = await apiRequest("GET", "/api/companies");
      return Array.isArray(result) ? result : [];
    },
  });

  // Fetch document requirements (forms)
  const { data: documentRequirements = [] } = useQuery<any[]>({
    queryKey: ["/api/document-requirements"],
    queryFn: async () => {
      const result = await apiRequest("GET", "/api/document-requirements");
      return Array.isArray(result) ? result : [];
    },
  });

  // Fetch service forms when a service is selected
  const { data: serviceFormsData } = useQuery<{ forms: any[] }>({
    queryKey: ["/api/services", selectedService?.id, "forms"],
    queryFn: async () => {
      if (!selectedService) return { forms: [] };
      const result = await apiRequest("GET", `/api/services/${selectedService.id}/forms`);
      return result && typeof result === 'object' && 'forms' in result 
        ? result as { forms: any[] }
        : { forms: [] };
    },
    enabled: !!selectedService && isFormsDialogOpen,
  });

  const serviceForms = Array.isArray(serviceFormsData?.forms) ? serviceFormsData.forms : [];

  // Fetch companies for selected service
  const { data: serviceCompaniesData } = useQuery<{ companies: any[] }>({
    queryKey: ["/api/services", selectedService?.id, "companies"],
    queryFn: async () => {
      if (!selectedService) return { companies: [] };
      const result = await apiRequest("GET", `/api/services/${selectedService.id}/companies`);
      return result && typeof result === 'object' && 'companies' in result 
        ? result as { companies: any[] }
        : { companies: [] };
    },
    enabled: !!selectedService && isAssignDialogOpen,
  });

  const serviceCompanies = Array.isArray(serviceCompaniesData?.companies) ? serviceCompaniesData.companies : [];

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/services", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsCreateDialogOpen(false);
      resetServiceForm();
      toast({
        title: "موفق",
        description: "خدمت با موفقیت ایجاد شد",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در ایجاد خدمت",
        variant: "destructive",
      });
    },
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PUT", `/api/services/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsEditDialogOpen(false);
      setSelectedService(null);
      toast({
        title: "موفق",
        description: "خدمت با موفقیت به‌روزرسانی شد",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در به‌روزرسانی خدمت",
        variant: "destructive",
      });
    },
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "موفق",
        description: "خدمت با موفقیت حذف شد",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در حذف خدمت",
        variant: "destructive",
      });
    },
  });

  // Assign service to company mutation
  const assignServiceMutation = useMutation({
    mutationFn: async ({ companyId, serviceId, notes }: any) => {
      return await apiRequest("POST", "/api/services/assign-to-company", {
        companyId,
        serviceId,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services", selectedService?.id, "companies"] });
      toast({
        title: "موفق",
        description: "خدمت با موفقیت به شرکت اختصاص یافت",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در اختصاص خدمت",
        variant: "destructive",
      });
    },
  });

  // Add form to service mutation
  const addFormToServiceMutation = useMutation({
    mutationFn: async ({
      serviceId,
      documentRequirementId,
      department,
      isRequired,
    }: any) => {
      return await apiRequest("POST", `/api/services/${serviceId}/forms`, {
        documentRequirementId,
        department,
        isRequired,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services", selectedService?.id, "forms"] });
      toast({
        title: "موفق",
        description: "فرم با موفقیت به خدمت اضافه شد",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در افزودن فرم",
        variant: "destructive",
      });
    },
  });

  // Remove form from service mutation
  const removeFormMutation = useMutation({
    mutationFn: async (mappingId: number) => {
      return await apiRequest("DELETE", `/api/services/forms/${mappingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services", selectedService?.id, "forms"] });
      toast({
        title: "موفق",
        description: "فرم با موفقیت از خدمت حذف شد",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در حذف فرم",
        variant: "destructive",
      });
    },
  });

  const resetServiceForm = () => {
    setServiceForm({
      title: "",
      description: "",
      department: "investment",
      category: "",
      icon: "Package",
      estimatedDays: "",
      requirements: "",
    });
  };

  const handleCreateService = () => {
    createServiceMutation.mutate({
      ...serviceForm,
      estimatedDays: serviceForm.estimatedDays ? parseInt(serviceForm.estimatedDays) : null,
      isActive: true,
      sortOrder: 0,
    });
  };

  const handleEditService = () => {
    if (!selectedService) return;
    updateServiceMutation.mutate({
      id: selectedService.id,
      ...serviceForm,
      estimatedDays: serviceForm.estimatedDays ? parseInt(serviceForm.estimatedDays) : null,
    });
  };

  const handleDeleteService = (serviceId: number) => {
    if (confirm("آیا از حذف این خدمت اطمینان دارید؟")) {
      deleteServiceMutation.mutate(serviceId);
    }
  };

  const openEditDialog = (service: any) => {
    setSelectedService(service);
    setIsEditing(true);
    setIsCreateDialogOpen(true); // Re-use the wizard view
  };

  const openAssignDialog = (service: any) => {
    setSelectedService(service);
    setIsAssignDialogOpen(true);
  };

  const openFormsDialog = (service: any) => {
    setSelectedService(service);
    setIsFormsDialogOpen(true);
  };

  const handleAssignToCompany = (companyId: number) => {
    if (!selectedService) return;
    assignServiceMutation.mutate({
      companyId,
      serviceId: selectedService.id,
      notes: "",
    });
  };

  const handleAddFormToService = (formId: number, department: string) => {
    if (!selectedService) return;
    addFormToServiceMutation.mutate({
      serviceId: selectedService.id,
      documentRequirementId: formId,
      department,
      isRequired: true,
    });
  };

  // Filter services
  const filteredServices = services.filter((service: any) => {
    const matchesSearch = service.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || service.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">مدیریت خدمات</h1>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">
                  تعریف خدمات، اختصاص به شرکت‌ها و مدیریت فرم‌ها
                </p>
              </div>
              {!isCreateDialogOpen && (
                <Button
                  onClick={() => {
                    setSelectedService(null);
                    setIsEditing(false);
                    setIsCreateDialogOpen(true);
                  }}
                  className="w-full sm:w-auto"
                >
                  <Plus className="ml-2 h-4 w-4" />
                  تعریف خدمت جدید (ویزارد)
                </Button>
              )}
            </div>

            {/* Create/Edit Wizard Mode */}
            {isCreateDialogOpen ? (
              <div className="mb-6">
                <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="mb-4">
                   بازگشت به لیست
                </Button>
                <ServiceWizard
                  onSuccess={() => setIsCreateDialogOpen(false)}
                  onCancel={() => setIsCreateDialogOpen(false)}
                  initialService={isEditing ? selectedService : undefined}
                />
              </div>
            ) : (
              <>
                {/* Filters */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="جستجوی خدمات..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pr-10"
                        />
                      </div>
                      <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                          <SelectValue placeholder="واحد" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">همه واحدها</SelectItem>
                          {DEPARTMENTS.map((dept) => (
                            <SelectItem key={dept.value} value={dept.value}>
                              {dept.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Services List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {servicesLoading ? (
                    <div className="col-span-full text-center py-8">در حال بارگذاری...</div>
                  ) : filteredServices.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      خدمتی یافت نشد
                    </div>
                  ) : (
                    filteredServices.map((service: any) => (
                      <Card key={service.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Package className="h-5 w-5" />
                              <CardTitle className="text-lg">{service.title}</CardTitle>
                            </div>
                            {service.isActive ? (
                              <Badge variant="default">فعال</Badge>
                            ) : (
                              <Badge variant="secondary">غیرفعال</Badge>
                            )}
                          </div>
                          <CardDescription>{service.description || "بدون توضیحات"}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">واحد:</span>
                            <Badge variant="outline">
                              {DEPARTMENTS.find((d) => d.value === service.department)?.label}
                            </Badge>
                          </div>

                          {service.estimatedDays && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">زمان تخمینی:</span>
                              <span>{service.estimatedDays} روز</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(service)}
                            >
                              <Edit className="ml-1 h-3 w-3" />
                              <span className="hidden sm:inline">ویرایش</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAssignDialog(service)}
                            >
                              <Building className="ml-1 h-3 w-3" />
                              <span className="hidden sm:inline">اختصاص</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openFormsDialog(service)}
                            >
                              <FileText className="ml-1 h-3 w-3" />
                              <span className="hidden sm:inline">فرم‌ها</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteService(service.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="hidden sm:inline">حذف</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Create Service Dialog Removed - Replaced with Wizard in main view */}

      {/* Edit Service Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ویرایش خدمت</DialogTitle>
            <DialogDescription>
              اطلاعات خدمت را ویرایش کنید
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Same form fields as create dialog */}
            <div>
              <Label htmlFor="edit-title">عنوان خدمت</Label>
              <Input
                id="edit-title"
                value={serviceForm.title}
                onChange={(e) => setServiceForm({ ...serviceForm, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">توضیحات</Label>
              <Textarea
                id="edit-description"
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-department">واحد</Label>
                <Select
                  value={serviceForm.department}
                  onValueChange={(value) => setServiceForm({ ...serviceForm, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.value} value={dept.value}>
                        {dept.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-estimatedDays">زمان تخمینی (روز)</Label>
                <Input
                  id="edit-estimatedDays"
                  type="number"
                  value={serviceForm.estimatedDays}
                  onChange={(e) => setServiceForm({ ...serviceForm, estimatedDays: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-category">دسته‌بندی</Label>
              <Select
                value={serviceForm.category}
                onValueChange={(value) => setServiceForm({ ...serviceForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب دسته‌بندی" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={handleEditService} disabled={!serviceForm.title || updateServiceMutation.isPending}>
              {updateServiceMutation.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Companies Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[600px]">
          <DialogHeader>
            <DialogTitle>اختصاص خدمت به شرکت‌ها</DialogTitle>
            <DialogDescription>
              خدمت "{selectedService?.title}" را به شرکت‌های مورد نظر اختصاص دهید
            </DialogDescription>
          </DialogHeader>

          {/* Company Search */}
          <div className="relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="جستجوی نام یا شناسه ملی شرکت..."
              value={companySearchQuery}
              onChange={(e) => setCompanySearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[400px]">
            {companiesLoading ? (
              <div className="text-center py-4">در حال بارگذاری شرکت‌ها...</div>
            ) : companies.filter((company: any) => 
                !companySearchQuery || 
                company.name.toLowerCase().includes(companySearchQuery.toLowerCase()) ||
                company.nationalId.includes(companySearchQuery)
              ).length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                شرکتی یافت نشد
              </div>
            ) : (
              companies.filter((company: any) => 
                !companySearchQuery || 
                company.name.toLowerCase().includes(companySearchQuery.toLowerCase()) ||
                company.nationalId.includes(companySearchQuery)
              ).map((company: any) => {
                const isAssigned = serviceCompanies.some((sc: any) => sc.companyId === company.id);
                
                return (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                  >
                    <div>
                      <div className="font-medium">{company.name}</div>
                      <div className="text-sm text-muted-foreground">
                        شناسه ملی: {company.nationalId}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAssigned ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          اختصاص داده شده
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAssignToCompany(company.id)}
                          disabled={assignServiceMutation.isPending}
                        >
                          اختصاص به این شرکت
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              بستن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Forms Dialog */}
      <Dialog open={isFormsDialogOpen} onOpenChange={setIsFormsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>مدیریت فرم‌های خدمت</DialogTitle>
            <DialogDescription>
              فرم‌های مرتبط با خدمت "{selectedService?.title}" را مدیریت کنید
            </DialogDescription>
          </DialogHeader>

          {/* دکمه ایجاد فرم جدید */}
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/admin/document-requirements', '_blank')}
              className="w-full"
            >
              <Plus className="ml-2 h-4 w-4" />
              برای ایجاد فرم جدید کلیک کنید (باز می‌شود در tab جدید)
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="investment" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="investment">واحد سرمایه‌گذاری</TabsTrigger>
                <TabsTrigger value="administrative">واحد اداری</TabsTrigger>
              </TabsList>

              {DEPARTMENTS.map((dept) => (
                <TabsContent key={dept.value} value={dept.value} className="space-y-4">
                  {/* Current Forms */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">فرم‌های فعلی</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
                    {(Array.isArray(serviceForms) ? serviceForms : [])
                      .filter((sf: any) => sf.department === dept.value)
                      .map((sf: any) => (
                        <div
                          key={sf.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{sf.formTitle}</div>
                            <div className="text-sm text-muted-foreground">
                              {sf.formDescription}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFormMutation.mutate(sf.id)}
                            disabled={removeFormMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    {(Array.isArray(serviceForms) ? serviceForms : []).filter((sf: any) => sf.department === dept.value).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        فرمی اضافه نشده است
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Available Forms */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">افزودن فرم جدید</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[250px] overflow-y-auto">
                    {documentRequirements
                      .filter((req: any) => req.department === dept.value)
                      .map((req: any) => {
                        const isAdded = (Array.isArray(serviceForms) ? serviceForms : []).some(
                          (sf: any) => sf.documentRequirementId === req.id && sf.department === dept.value
                        );

                        return (
                          <div
                            key={req.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <div className="font-medium">{req.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {req.description}
                              </div>
                            </div>
                            {isAdded ? (
                              <Badge variant="secondary">
                                <CheckCircle className="ml-1 h-3 w-3" />
                                اضافه شده
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleAddFormToService(req.id, dept.value)}
                                disabled={addFormToServiceMutation.isPending}
                              >
                                <Plus className="ml-1 h-3 w-3" />
                                افزودن
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    {documentRequirements.filter((req: any) => req.department === dept.value).length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        فرمی برای افزودن وجود ندارد
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
            </Tabs>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsFormsDialogOpen(false)}>
              بستن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


