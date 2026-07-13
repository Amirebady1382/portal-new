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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Database, Plus, Edit, Trash2, Search, Filter, Link2, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const VARIABLE_TYPES = [
  { value: 'text', label: 'متن' },
  { value: 'number', label: 'عدد' },
  { value: 'date', label: 'تاریخ' },
  { value: 'currency', label: 'مبلغ (ریال)' },
  { value: 'percentage', label: 'درصد' },
  { value: 'boolean', label: 'بله/خیر' },
  { value: 'email', label: 'ایمیل' },
  { value: 'phone', label: 'تلفن' },
  { value: 'textarea', label: 'متن چندخطی' }
];

const VARIABLE_SOURCES = [
  { value: 'form', label: 'فرم مشتری', color: 'blue' },
  { value: 'manual', label: 'ورود دستی کارمند', color: 'orange' },
  { value: 'rasmio', label: 'رسمیو (خودکار)', color: 'green' },
  { value: 'calculated', label: 'محاسبه شده', color: 'purple' },
  { value: 'system', label: 'سیستمی', color: 'gray' }
];

const VARIABLE_CATEGORIES = [
  { value: 'company', label: 'اطلاعات شرکت' },
  { value: 'financial', label: 'اطلاعات مالی' },
  { value: 'dates', label: 'تاریخ‌ها' },
  { value: 'personal', label: 'اطلاعات فردی' },
  { value: 'legal', label: 'اطلاعات حقوقی' },
  { value: 'technical', label: 'اطلاعات فنی' },
  { value: 'other', label: 'سایر' }
];

export default function ContractVariablesManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [variableForm, setVariableForm] = useState({
    name: "",
    label: "",
    description: "",
    dataType: "text",
    source: "form",
    defaultValue: "",
    isRequired: false,
    placeholder: "",
    category: "other",
    validationRules: "",
    sortOrder: 0
  });

  // Form-Field Mapping states
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [selectedFieldName, setSelectedFieldName] = useState<string>("");
  const [mappingPriority, setMappingPriority] = useState<number>(1);

  // Fetch variables
  const { data: variables = [], isLoading } = useQuery({
    queryKey: ["/api/admin/contract-variables"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/contract-variables");
      return (response as { variables?: any[] }).variables || [];
    }
  });

  // Fetch document requirements (forms)
  const { data: documentRequirements = [] } = useQuery({
    queryKey: ["/api/admin/document-requirements"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/document-requirements");
      return (response as { requirements?: any[] }).requirements || [];
    }
  });

  // Fetch mappings for selected variable
  const { data: variableMappings = [], refetch: refetchMappings } = useQuery({
    queryKey: ["/api/contract-variables", selectedVariable?.id, "form-mappings"],
    queryFn: async () => {
      if (!selectedVariable?.id) return [];
      const response = await apiRequest("GET", `/api/contract-variables/${selectedVariable.id}/form-mappings`);
      return (response as { mappings?: any[] }).mappings || [];
    },
    enabled: !!selectedVariable?.id
  });

  // Create variable mutation
  const createVariableMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/admin/contract-variables", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contract-variables"] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "موفق",
        description: "متغیر با موفقیت ایجاد شد"
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در ایجاد متغیر",
        variant: "destructive"
      });
    }
  });

  // Update variable mutation
  const updateVariableMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PUT", `/api/admin/contract-variables/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contract-variables"] });
      setIsEditDialogOpen(false);
      setSelectedVariable(null);
      toast({
        title: "موفق",
        description: "متغیر با موفقیت به‌روزرسانی شد"
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در به‌روزرسانی متغیر",
        variant: "destructive"
      });
    }
  });

  // Delete variable mutation
  const deleteVariableMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/contract-variables/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contract-variables"] });
      toast({
        title: "موفق",
        description: "متغیر با موفقیت حذف شد"
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در حذف متغیر",
        variant: "destructive"
      });
    }
  });

  // Create mapping mutation
  const createMappingMutation = useMutation({
    mutationFn: async (data: { variableId: number; requirementId: number; fieldName: string; priority: number }) => {
      return await apiRequest("POST", "/api/variable-form-mappings", data);
    },
    onSuccess: () => {
      refetchMappings();
      setSelectedFormId("");
      setSelectedFieldName("");
      setMappingPriority(1);
      toast({
        title: "موفق",
        description: "منبع داده با موفقیت اضافه شد"
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در اضافه کردن منبع",
        variant: "destructive"
      });
    }
  });

  // Delete mapping mutation
  const deleteMappingMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/variable-form-mappings/${id}`);
    },
    onSuccess: () => {
      refetchMappings();
      toast({
        title: "موفق",
        description: "منبع داده حذف شد"
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در حذف منبع",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setVariableForm({
      name: "",
      label: "",
      description: "",
      dataType: "text",
      source: "form",
      defaultValue: "",
      isRequired: false,
      placeholder: "",
      category: "other",
      validationRules: "",
      sortOrder: 0
    });
  };

  const handleCreateVariable = () => {
    createVariableMutation.mutate(variableForm);
  };

  const handleEditVariable = () => {
    if (!selectedVariable) return;
    updateVariableMutation.mutate({
      id: selectedVariable.id,
      ...variableForm
    });
  };

  const handleDeleteVariable = (variableId: number) => {
    if (confirm("آیا از حذف این متغیر اطمینان دارید؟")) {
      deleteVariableMutation.mutate(variableId);
    }
  };

  const openEditDialog = (variable: any) => {
    setSelectedVariable(variable);
    setVariableForm({
      name: variable.name || "",
      label: variable.label || "",
      description: variable.description || "",
      dataType: variable.dataType || "text",
      source: variable.source || "form",
      defaultValue: variable.defaultValue || "",
      isRequired: variable.isRequired || false,
      placeholder: variable.placeholder || "",
      category: variable.category || "other",
      validationRules: variable.validationRules || "",
      sortOrder: variable.sortOrder || 0
    });
    setSelectedFormId("");
    setSelectedFieldName("");
    setMappingPriority(1);
    setIsEditDialogOpen(true);
  };

  const handleAddMapping = () => {
    if (!selectedVariable?.id || !selectedFormId || !selectedFieldName) {
      toast({
        title: "خطا",
        description: "لطفا فرم و فیلد را انتخاب کنید",
        variant: "destructive"
      });
      return;
    }

    createMappingMutation.mutate({
      variableId: selectedVariable.id,
      requirementId: parseInt(selectedFormId),
      fieldName: selectedFieldName,
      priority: mappingPriority
    });
  };

  const handleDeleteMapping = (mappingId: number) => {
    if (confirm("آیا از حذف این منبع اطمینان دارید؟")) {
      deleteMappingMutation.mutate(mappingId);
    }
  };

  // Get fields from selected form
  const selectedForm = documentRequirements.find((req: any) => req.id === parseInt(selectedFormId));
  const formFields = selectedForm?.fields ?
    (typeof selectedForm.fields === 'string' ? JSON.parse(selectedForm.fields) : selectedForm.fields) : [];

  // Filter variables
  const filteredVariables = variables.filter((variable: any) => {
    const matchesSearch = variable.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variable.label?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = sourceFilter === "all" || variable.source === sourceFilter;
    const matchesCategory = categoryFilter === "all" || variable.category === categoryFilter;
    return matchesSearch && matchesSource && matchesCategory;
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
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  <Database className="h-6 md:h-8 w-6 md:w-8" />
                  مدیریت متغیرها
                </h1>
                <p className="text-muted-foreground mt-1 text-sm md:text-base">
                  تعریف و مدیریت متغیرهای قالب‌ها
                </p>
              </div>
              <Button 
                onClick={() => {
                  resetForm();
                  setIsCreateDialogOpen(true);
                }}
                className="w-full sm:w-auto"
              >
                <Plus className="ml-2 h-4 w-4" />
                تعریف متغیر
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{variables.length}</div>
                  <div className="text-sm text-muted-foreground">کل متغیرها</div>
                </CardContent>
              </Card>
              {VARIABLE_SOURCES.map((source) => (
                <Card key={source.value}>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">
                      {variables.filter((v: any) => v.source === source.value).length}
                    </div>
                    <div className="text-sm text-muted-foreground">{source.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="جستجوی متغیرها..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="w-full md:w-[150px]">
                      <SelectValue placeholder="منبع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">همه منابع</SelectItem>
                      {VARIABLE_SOURCES.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[150px]">
                      <SelectValue placeholder="دسته" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">همه</SelectItem>
                      {VARIABLE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Variables Table */}
            <Card>
              <CardHeader>
                <CardTitle>لیست متغیرها ({filteredVariables.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">در حال بارگذاری...</div>
                ) : filteredVariables.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    متغیری یافت نشد
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredVariables.map((variable: any) => (
                      <div
                        key={variable.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                              {`{{${variable.name}}}`}
                            </code>
                            <span className="font-medium">{variable.label}</span>
                            {variable.isRequired && (
                              <Badge variant="destructive" className="text-xs">
                                اجباری
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {variable.description || "بدون توضیحات"}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">
                              {VARIABLE_TYPES.find(t => t.value === variable.dataType)?.label || variable.dataType}
                            </Badge>
                            <Badge variant="secondary">
                              {VARIABLE_SOURCES.find(s => s.value === variable.source)?.label || variable.source}
                            </Badge>
                            <Badge variant="outline">
                              {VARIABLE_CATEGORIES.find(c => c.value === variable.category)?.label || variable.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(variable)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteVariable(variable.id)}
                            disabled={deleteVariableMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Create Variable Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعریف متغیر جدید</DialogTitle>
            <DialogDescription>
              متغیر جدید را برای استفاده در قالب‌ها تعریف کنید
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">نام متغیر (انگلیسی)</Label>
                <Input
                  id="name"
                  value={variableForm.name}
                  onChange={(e) => setVariableForm({ ...variableForm, name: e.target.value })}
                  placeholder="company_name"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  فقط حروف انگلیسی، اعداد و _ (مثال: company_name)
                </p>
              </div>

              <div>
                <Label htmlFor="label">برچسب (فارسی)</Label>
                <Input
                  id="label"
                  value={variableForm.label}
                  onChange={(e) => setVariableForm({ ...variableForm, label: e.target.value })}
                  placeholder="نام شرکت"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">توضیحات</Label>
              <Textarea
                id="description"
                value={variableForm.description}
                onChange={(e) => setVariableForm({ ...variableForm, description: e.target.value })}
                placeholder="توضیحات کامل درباره این متغیر..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dataType">نوع داده</Label>
                <Select
                  value={variableForm.dataType}
                  onValueChange={(value) => setVariableForm({ ...variableForm, dataType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="source">منبع داده</Label>
                <Select
                  value={variableForm.source}
                  onValueChange={(value) => setVariableForm({ ...variableForm, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLE_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">دسته‌بندی</Label>
                <Select
                  value={variableForm.category}
                  onValueChange={(value) => setVariableForm({ ...variableForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="defaultValue">مقدار پیش‌فرض</Label>
                <Input
                  id="defaultValue"
                  value={variableForm.defaultValue}
                  onChange={(e) => setVariableForm({ ...variableForm, defaultValue: e.target.value })}
                  placeholder="(اختیاری)"
                />
              </div>

              <div>
                <Label htmlFor="placeholder">Placeholder</Label>
                <Input
                  id="placeholder"
                  value={variableForm.placeholder}
                  onChange={(e) => setVariableForm({ ...variableForm, placeholder: e.target.value })}
                  placeholder="راهنمای ورودی..."
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="isRequired"
                checked={variableForm.isRequired}
                onCheckedChange={(checked) => 
                  setVariableForm({ ...variableForm, isRequired: checked as boolean })
                }
              />
              <Label htmlFor="isRequired" className="cursor-pointer">
                این متغیر اجباری است
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              انصراف
            </Button>
            <Button 
              onClick={handleCreateVariable} 
              disabled={!variableForm.name || !variableForm.label || createVariableMutation.isPending}
            >
              {createVariableMutation.isPending ? "در حال ایجاد..." : "ایجاد متغیر"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Variable Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ویرایش متغیر</DialogTitle>
            <DialogDescription>
              اطلاعات متغیر را ویرایش کنید
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Same form fields as create */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">نام متغیر (انگلیسی)</Label>
                <Input
                  id="edit-name"
                  value={variableForm.name}
                  onChange={(e) => setVariableForm({ ...variableForm, name: e.target.value })}
                  dir="ltr"
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">
                  نام متغیر قابل تغییر نیست
                </p>
              </div>

              <div>
                <Label htmlFor="edit-label">برچسب (فارسی)</Label>
                <Input
                  id="edit-label"
                  value={variableForm.label}
                  onChange={(e) => setVariableForm({ ...variableForm, label: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">توضیحات</Label>
              <Textarea
                id="edit-description"
                value={variableForm.description}
                onChange={(e) => setVariableForm({ ...variableForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-dataType">نوع داده</Label>
                <Select
                  value={variableForm.dataType}
                  onValueChange={(value) => setVariableForm({ ...variableForm, dataType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-source">منبع داده</Label>
                <Select
                  value={variableForm.source}
                  onValueChange={(value) => setVariableForm({ ...variableForm, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLE_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-category">دسته‌بندی</Label>
                <Select
                  value={variableForm.category}
                  onValueChange={(value) => setVariableForm({ ...variableForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VARIABLE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-defaultValue">مقدار پیش‌فرض</Label>
                <Input
                  id="edit-defaultValue"
                  value={variableForm.defaultValue}
                  onChange={(e) => setVariableForm({ ...variableForm, defaultValue: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-placeholder">Placeholder</Label>
                <Input
                  id="edit-placeholder"
                  value={variableForm.placeholder}
                  onChange={(e) => setVariableForm({ ...variableForm, placeholder: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="edit-isRequired"
                checked={variableForm.isRequired}
                onCheckedChange={(checked) =>
                  setVariableForm({ ...variableForm, isRequired: checked as boolean })
                }
              />
              <Label htmlFor="edit-isRequired" className="cursor-pointer">
                این متغیر اجباری است
              </Label>
            </div>

            {/* Form-Field Mapping Section - فقط برای source === 'form' */}
            {variableForm.source === 'form' && selectedVariable?.id && (
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <Link2 className="h-5 w-5" />
                  <h3 className="font-semibold">منابع داده از فرم‌ها</h3>
                </div>

                {/* Existing Mappings */}
                {variableMappings.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <Label>منابع فعلی (به ترتیب اولویت):</Label>
                    {variableMappings.map((mapping: any, index: number) => (
                      <div
                        key={mapping.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {index + 1}
                            </Badge>
                            <span className="font-medium text-sm">
                              {mapping.requirementTitle || mapping.form?.title}
                            </span>
                            <span className="text-xs text-muted-foreground">→</span>
                            <code className="text-xs bg-background px-2 py-1 rounded">
                              {mapping.fieldName}
                            </code>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            اولویت: {mapping.priority}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteMapping(mapping.id)}
                          disabled={deleteMappingMutation.isPending}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Mapping */}
                <div className="border rounded-lg p-4 bg-background">
                  <Label className="mb-2 block">افزودن منبع جدید:</Label>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب فرم" />
                        </SelectTrigger>
                        <SelectContent>
                          {documentRequirements.map((req: any) => (
                            <SelectItem key={req.id} value={req.id.toString()}>
                              {req.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-5">
                      <Select
                        value={selectedFieldName}
                        onValueChange={setSelectedFieldName}
                        disabled={!selectedFormId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب فیلد" />
                        </SelectTrigger>
                        <SelectContent>
                          {formFields.map((field: any) => (
                            <SelectItem key={field.name} value={field.name}>
                              {field.label || field.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Button
                        size="sm"
                        onClick={handleAddMapping}
                        disabled={!selectedFormId || !selectedFieldName || createMappingMutation.isPending}
                        className="w-full"
                      >
                        <Plus className="h-3 w-3 ml-1" />
                        افزودن
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    💡 در صورت وجود چند منبع، اولین منبعی که داده دارد استفاده می‌شود
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              انصراف
            </Button>
            <Button 
              onClick={handleEditVariable} 
              disabled={!variableForm.label || updateVariableMutation.isPending}
            >
              {updateVariableMutation.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


