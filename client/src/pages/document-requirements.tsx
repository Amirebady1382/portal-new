import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus,
  FileText,
  Edit,
  Trash2,
  GripVertical,
  Settings,
  Type,
  Calendar,
  Hash,
  Upload,
  List,
  ToggleLeft,
  Mail,
  Phone,
  Building
} from "lucide-react";

// Field types for different input types
const FIELD_TYPES = [
  { value: "text", label: "متن کوتاه", icon: Type, description: "برای نام، عنوان و متن‌های کوتاه" },
  { value: "textarea", label: "متن بلند", icon: FileText, description: "برای توضیحات و متن‌های طولانی" },
  { value: "number", label: "عدد", icon: Hash, description: "برای اعداد و مقادیر عددی" },
  { value: "date", label: "تاریخ", icon: Calendar, description: "برای انتخاب تاریخ" },
  { value: "file", label: "فایل", icon: Upload, description: "برای آپلود فایل" },
  { value: "select", label: "انتخابی", icon: List, description: "برای انتخاب از گزینه‌های محدود" },
  { value: "checkbox", label: "چک باکس", icon: ToggleLeft, description: "برای بله/خیر" },
  { value: "email", label: "ایمیل", icon: Mail, description: "برای آدرس ایمیل" },
  { value: "phone", label: "تلفن", icon: Phone, description: "برای شماره تلفن" },
  { value: "national_id", label: "کد ملی", icon: Building, description: "برای کد ملی/شناسه ملی" },
];

interface DocumentField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  variableName?: string; // ← جدید: نام متغیر مرتبط
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    allowedFormats?: string[];
    maxFileSize?: number;
  };
  options?: string[]; // For select fields
  description?: string;
}

export default function DocumentRequirements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<any>(null);
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  
  const [newRequirement, setNewRequirement] = useState({
    title: "",
    description: "",
    department: "investment",
    category: "",
    fields: [] as DocumentField[],
    isRequired: true,
    accessType: "all" as string,
    companyIds: [] as number[],
  });

  const [currentField, setCurrentField] = useState<DocumentField>({
    id: "",
    name: "",
    label: "",
    type: "text",
    required: false,
    variableName: "", // ← جدید
    placeholder: "",
    validation: {},
    options: [],
    description: ""
  });

  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

  // Get document requirements
  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ["/api/document-requirements"],
  });

  // همه شرکت‌ها برای انتخاب (در پنل کارمند)
  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies", { limit: 1000 }],
  });

  // Get services for linking to requirements
  const { data: services = [], isLoading: servicesLoading, error: servicesError } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      try {
        console.log("🔍 Fetching services for requirements...");
        const data = await apiRequest("GET", "/api/services");
        console.log("✅ Services loaded:", data);
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("❌ Error loading services:", error);
        throw error;
      }
    }
  });

  // Get contract variables for mapping
  const { data: variablesData } = useQuery({
    queryKey: ["/api/admin/contract-variables"],
    queryFn: async () => {
      try {
        const data = await apiRequest("GET", "/api/admin/contract-variables");
        return (data as { variables?: any[] }).variables || [];
      } catch (error) {
        console.error("Error loading variables:", error);
        return [];
      }
    }
  });

  // Filter requirements by department
  const filteredRequirements = (requirements as any[]).filter((req: any) => {
    if (selectedDepartment === "all") return true;
    return req.department === selectedDepartment;
  });

  // Create requirement mutation
  const createRequirementMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/document-requirements", data);
    },
    onSuccess: () => {
      toast({
        title: "موفقیت",
        description: "فرم مدارک جدید ایجاد شد",
      });
      setIsCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/document-requirements"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در ایجاد فرم مدارک",
        variant: "destructive",
      });
    },
  });

  // Update requirement mutation
  const updateRequirementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PUT", `/api/document-requirements/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "موفقیت",
        description: "فرم مدارک به‌روزرسانی شد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/document-requirements"] });
      setEditingRequirement(null);
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در به‌روزرسانی فرم مدارک",
        variant: "destructive",
      });
    },
  });

  // Delete requirement mutation
  const deleteRequirementMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/document-requirements/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "موفقیت",
        description: "فرم مدارک حذف شد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/document-requirements"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در حذف فرم مدارک",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewRequirement({
      title: "",
      description: "",
      department: "investment",
      category: "",
      fields: [],
      isRequired: true,
      accessType: "all",
      companyIds: [],
    });
    setCurrentField({
      id: "",
      name: "",
      label: "",
      type: "text",
      required: false,
      placeholder: "",
      validation: {},
      options: [],
      description: ""
    });
  };

  const handleCreateRequirement = () => {
    if (!newRequirement.title.trim()) {
      toast({
        title: "خطا",
        description: "عنوان فرم مدارک الزامی است",
        variant: "destructive",
      });
      return;
    }

    if (!newRequirement.description.trim()) {
      toast({
        title: "خطا", 
        description: "توضیحات فرم الزامی است",
        variant: "destructive",
      });
      return;
    }

    if (newRequirement.fields.length === 0) {
      toast({
        title: "خطا",
        description: "حداقل یک فیلد باید تعریف کنید",
        variant: "destructive",
      });
      return;
    }

    // Validate all fields have proper configuration
    for (const field of newRequirement.fields) {
      if (!field.name.trim() || !field.label.trim()) {
        toast({
          title: "خطا",
          description: `فیلد "${field.label || 'نامشخص'}" دارای نام یا برچسب نامعتبر است`,
          variant: "destructive",
        });
        return;
      }
    }

    // Prepare data for submission
    console.log('📤 Submitting document requirement with fields:', {
      title: newRequirement.title,
      fieldsCount: newRequirement.fields.length,
      fields: newRequirement.fields,
      fieldsWithVariables: newRequirement.fields.filter(f => f.variableName)
    });

    const submitData = {
      ...newRequirement,
      fields: JSON.stringify(newRequirement.fields),
      accessType: "all",
      companyIds: [],
    };

    console.log('📤 Stringified fields:', submitData.fields);

    if (editingRequirement) {
      updateRequirementMutation.mutate({ id: editingRequirement.id, data: submitData });
    } else {
      createRequirementMutation.mutate(submitData);
    }
  };
  
  const handleEditRequirement = (requirement: any) => {
    try {
      const parsedFields = typeof requirement.fields === 'string' 
        ? JSON.parse(requirement.fields) 
        : requirement.fields || [];
      
      setNewRequirement({
        title: requirement.title,
        description: requirement.description || "",
        department: requirement.department,
        category: requirement.category || "",
        fields: parsedFields,
        isRequired: requirement.isRequired,
        accessType: requirement.accessType || "all",
        companyIds: requirement.companyIds || [],
      });
      
      setEditingRequirement(requirement);
      setIsCreateOpen(true);
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در بارگذاری اطلاعات فرم",
        variant: "destructive",
      });
    }
  };

  const addField = () => {
    if (!currentField.name.trim() || !currentField.label.trim()) {
      toast({
        title: "خطا",
        description: "نام و برچسب فیلد الزامی است",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate field names
    const existingFieldNames = newRequirement.fields.map(f => f.name);
    if (editingFieldIndex === null && existingFieldNames.includes(currentField.name)) {
      toast({
        title: "خطا",
        description: "نام فیلد تکراری است. لطفاً نام دیگری انتخاب کنید",
        variant: "destructive",
      });
      return;
    }

    // Validate field type specific requirements
    if (currentField.type === "select" && (!currentField.options || currentField.options.length === 0)) {
      toast({
        title: "خطا",
        description: "برای فیلد انتخابی باید حداقل یک گزینه تعریف کنید",
        variant: "destructive",
      });
      return;
    }

    const fieldId = Date.now().toString() + "_" + Math.random().toString(36).substr(2, 9);
    const newField = { 
      ...currentField, 
      id: fieldId,
      name: currentField.name.trim().toLowerCase().replace(/\s+/g, '_'), // Ensure proper field naming
      variableName: currentField.variableName || undefined, // Explicitly include variableName
    };

    console.log('🔍 Adding field with variableName:', {
      fieldName: newField.name,
      variableName: newField.variableName,
      fullField: newField
    });

    if (editingFieldIndex !== null) {
      const updatedFields = [...newRequirement.fields];
      updatedFields[editingFieldIndex] = newField;
      setNewRequirement({ ...newRequirement, fields: updatedFields });
      setEditingFieldIndex(null);
      console.log('✅ Field updated at index:', editingFieldIndex);
    } else {
      setNewRequirement({ 
        ...newRequirement, 
        fields: [...newRequirement.fields, newField] 
      });
      console.log('✅ Field added. Total fields:', newRequirement.fields.length + 1);
    }

    setCurrentField({
      id: "",
      name: "",
      label: "",
      type: "text",
      required: false,
      variableName: "",
      placeholder: "",
      validation: {},
      options: [],
      description: ""
    });
    setIsFieldDialogOpen(false);
  };

  const editField = (index: number) => {
    setCurrentField(newRequirement.fields[index]);
    setEditingFieldIndex(index);
    setIsFieldDialogOpen(true);
  };

  const removeField = (index: number) => {
    const updatedFields = newRequirement.fields.filter((_, i) => i !== index);
    setNewRequirement({ ...newRequirement, fields: updatedFields });
  };

  const renderFieldValidation = () => {
    const fieldType = FIELD_TYPES.find(t => t.value === currentField.type);
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>حداقل طول</Label>
            <Input
              type="number"
              value={currentField.validation?.minLength || ""}
              onChange={(e) => setCurrentField({
                ...currentField,
                validation: { ...currentField.validation, minLength: parseInt(e.target.value) || undefined }
              })}
              placeholder="حداقل تعداد کاراکتر"
            />
          </div>
          <div>
            <Label>حداکثر طول</Label>
            <Input
              type="number"
              value={currentField.validation?.maxLength || ""}
              onChange={(e) => setCurrentField({
                ...currentField,
                validation: { ...currentField.validation, maxLength: parseInt(e.target.value) || undefined }
              })}
              placeholder="حداکثر تعداد کاراکتر"
            />
          </div>
        </div>

        {currentField.type === "number" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>حداقل مقدار</Label>
              <Input
                type="number"
                value={currentField.validation?.min || ""}
                onChange={(e) => setCurrentField({
                  ...currentField,
                  validation: { ...currentField.validation, min: parseInt(e.target.value) || undefined }
                })}
              />
            </div>
            <div>
              <Label>حداکثر مقدار</Label>
              <Input
                type="number"
                value={currentField.validation?.max || ""}
                onChange={(e) => setCurrentField({
                  ...currentField,
                  validation: { ...currentField.validation, max: parseInt(e.target.value) || undefined }
                })}
              />
            </div>
          </div>
        )}

        {currentField.type === "file" && (
          <div className="space-y-4">
            <div>
              <Label>فرمت‌های مجاز</Label>
              <Input
                value={currentField.validation?.allowedFormats?.join(", ") || ""}
                onChange={(e) => setCurrentField({
                  ...currentField,
                  validation: { 
                    ...currentField.validation, 
                    allowedFormats: e.target.value.split(",").map(f => f.trim()).filter(f => f)
                  }
                })}
                placeholder="مثال: pdf, jpg, png"
              />
            </div>
            <div>
              <Label>حداکثر اندازه فایل (مگابایت)</Label>
              <Input
                type="number"
                value={currentField.validation?.maxFileSize || ""}
                onChange={(e) => setCurrentField({
                  ...currentField,
                  validation: { ...currentField.validation, maxFileSize: parseInt(e.target.value) || undefined }
                })}
                placeholder="مثال: 10"
              />
            </div>
          </div>
        )}

        {currentField.type === "select" && (
          <div>
            <Label>گزینه‌ها (هر کدام در خط جداگانه)</Label>
            <Textarea
              value={currentField.options?.join("\n") || ""}
              onChange={(e) => setCurrentField({
                ...currentField,
                options: e.target.value.split("\n").filter(option => option.trim())
              })}
              placeholder="گزینه اول&#10;گزینه دوم&#10;گزینه سوم"
              rows={4}
            />
          </div>
        )}

        <div>
          <Label>الگوی اعتبارسنجی (Regex)</Label>
          <Input
            value={currentField.validation?.pattern || ""}
            onChange={(e) => setCurrentField({
              ...currentField,
              validation: { ...currentField.validation, pattern: e.target.value }
            })}
            placeholder="مثال: ^[0-9]{10}$ برای کد ملی"
          />
        </div>
      </div>
    );
  };



  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="flex">
        <Sidebar />
        <MobileSidebar />
        
        <main className="flex-1 mr-0 md:mr-64 p-6 pt-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between mb-6 gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">مدیریت فرم‌های مدارک</h1>
                <p className="text-gray-600 mt-2">تعریف و مدیریت فرم‌های دریافت مدارک از مشتریان</p>
              </div>
              
              <div className="flex-shrink-0">
                              <Dialog open={isCreateOpen} onOpenChange={(open) => {
                if (!open) {
                  setEditingRequirement(null);
                  resetForm();
                }
                setIsCreateOpen(open);
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 whitespace-nowrap">
                    <Plus className="h-4 w-4 ml-2" />
                    فرم جدید
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRequirement ? "ویرایش فرم مدارک" : "ایجاد فرم مدارک جدید"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingRequirement ? "ویرایش اطلاعات و فیلدهای فرم موجود" : "تعریف فرم جدید برای دریافت مدارک از مشتریان"}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="title">عنوان فرم *</Label>
                        <Input
                          id="title"
                          value={newRequirement.title}
                          onChange={(e) => setNewRequirement({...newRequirement, title: e.target.value})}
                          placeholder="مثال: فرم درخواست تسهیلات"
                        />
                      </div>
                      <div>
                        <Label htmlFor="department">واحد *</Label>
                        <Select 
                          value={newRequirement.department} 
                          onValueChange={(value) => setNewRequirement({...newRequirement, department: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="انتخاب واحد" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="investment">سرمایه‌گذاری</SelectItem>
                            <SelectItem value="administrative">اداری</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="category">دسته‌بندی</Label>
                        <Select 
                          value={newRequirement.category} 
                          onValueChange={(value) => setNewRequirement({...newRequirement, category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="انتخاب دسته‌بندی" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="facilities">تسهیلات</SelectItem>
                            <SelectItem value="investment">سرمایه‌گذاری</SelectItem>
                            <SelectItem value="guarantee">ضمانت‌نامه</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="isRequired" 
                          checked={newRequirement.isRequired}
                          onCheckedChange={(checked) => setNewRequirement({...newRequirement, isRequired: !!checked})}
                        />
                        <Label htmlFor="isRequired">الزامی</Label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">توضیحات</Label>
                      <Textarea
                        id="description"
                        value={newRequirement.description}
                        onChange={(e) => setNewRequirement({...newRequirement, description: e.target.value})}
                        placeholder="توضیحات کاملی در مورد این فرم و نحوه تکمیل آن ارائه دهید..."
                        rows={3}
                      />
                    </div>


                    {/* Fields Management */}
                    <div className="border-t pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">فیلدهای فرم</h3>
                        <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Plus className="h-4 w-4 ml-1" />
                              افزودن فیلد
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                {editingFieldIndex !== null ? "ویرایش فیلد" : "افزودن فیلد جدید"}
                              </DialogTitle>
                              <DialogDescription>
                                {editingFieldIndex !== null ? "ویرایش اطلاعات فیلد موجود" : "تعریف فیلد جدید برای فرم"}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>نام فیلد (انگلیسی) *</Label>
                                  <Input
                                    value={currentField.name}
                                    onChange={(e) => setCurrentField({...currentField, name: e.target.value})}
                                    placeholder="firstName"
                                  />
                                </div>
                                <div>
                                  <Label>برچسب فیلد *</Label>
                                  <Input
                                    value={currentField.label}
                                    onChange={(e) => setCurrentField({...currentField, label: e.target.value})}
                                    placeholder="نام"
                                  />
                                </div>
                              </div>

                              <div>
                                <Label>نوع فیلد *</Label>
                                <Select 
                                  value={currentField.type} 
                                  onValueChange={(value) => setCurrentField({...currentField, type: value})}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {FIELD_TYPES.map((type) => {
                                      const Icon = type.icon;
                                      return (
                                        <SelectItem key={type.value} value={type.value}>
                                          <div className="flex items-center">
                                            <Icon className="h-4 w-4 ml-2" />
                                            <div>
                                              <div>{type.label}</div>
                                              <div className="text-xs text-muted-foreground">{type.description}</div>
                                            </div>
                                          </div>
                                        </SelectItem>
                                      );
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* متغیر مرتبط */}
                              <div>
                                <Label>متغیر مرتبط (برای قرارداد/گزارش)</Label>
                                <Select
                                  value={currentField.variableName || "none"}
                                  onValueChange={(value) => setCurrentField({
                                    ...currentField,
                                    variableName: value === "none" ? "" : value
                                  })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="انتخاب متغیر..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">بدون متغیر</SelectItem>
                                    {Array.isArray(variablesData) && variablesData
                                      .filter((v: any) => v.source === 'form' || v.source === 'rasmio')
                                      .map((variable: any) => (
                                        <SelectItem key={variable.id} value={variable.name}>
                                          {variable.label} ({variable.name})
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-1">
                                  اگر این فیلد به متغیری در قالب‌ها map می‌شود، آن را انتخاب کنید
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>متن راهنما</Label>
                                  <Input
                                    value={currentField.placeholder || ""}
                                    onChange={(e) => setCurrentField({...currentField, placeholder: e.target.value})}
                                    placeholder="نام خود را وارد کنید"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox 
                                    checked={currentField.required}
                                    onCheckedChange={(checked) => setCurrentField({...currentField, required: !!checked})}
                                  />
                                  <Label>فیلد الزامی</Label>
                                </div>
                              </div>

                              <div>
                                <Label>توضیحات فیلد</Label>
                                <Textarea
                                  value={currentField.description || ""}
                                  onChange={(e) => setCurrentField({...currentField, description: e.target.value})}
                                  placeholder="توضیحات تکمیلی برای کاربر..."
                                  rows={2}
                                />
                              </div>

                              <div className="border-t pt-4">
                                <h4 className="font-medium mb-3">تنظیمات اعتبارسنجی</h4>
                                {renderFieldValidation()}
                              </div>

                              <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                                <Button variant="outline" onClick={() => setIsFieldDialogOpen(false)}>
                                  انصراف
                                </Button>
                                <Button onClick={addField}>
                                  {editingFieldIndex !== null ? "ویرایش" : "افزودن"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {/* Fields List */}
                      <div className="space-y-2">
                        {newRequirement.fields.map((field, index) => {
                          const fieldType = FIELD_TYPES.find(t => t.value === field.type);
                          const Icon = fieldType?.icon || Type;
                          
                          return (
                            <div key={field.id || field.name || `field-${index}`} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                              <div className="flex items-center space-x-3 space-x-reverse">
                                <GripVertical className="h-4 w-4 text-gray-400" />
                                <Icon className="h-4 w-4 text-blue-600" />
                                <div>
                                  <div className="font-medium">{field.label}</div>
                                  <div className="text-sm text-gray-500">
                                    {field.name} • {fieldType?.label} 
                                    {field.required && " • الزامی"}
                                    {field.variableName && (
                                      <span className="mr-2 text-blue-600">
                                        → {field.variableName}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => editField(index)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => removeField(index)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                        
                        {newRequirement.fields.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            هنوز فیلدی تعریف نشده است. برای شروع یک فیلد اضافه کنید.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 space-x-reverse pt-4 border-t">
                      <Button variant="outline" onClick={() => {
                        setIsCreateOpen(false);
                        setEditingRequirement(null);
                        resetForm();
                      }}>
                        انصراف
                      </Button>
                      <Button 
                        onClick={handleCreateRequirement}
                        disabled={createRequirementMutation.isPending || updateRequirementMutation.isPending}
                      >
                        {editingRequirement ? 
                          (updateRequirementMutation.isPending ? "در حال به‌روزرسانی..." : "به‌روزرسانی فرم") :
                          (createRequirementMutation.isPending ? "در حال ایجاد..." : "ایجاد فرم")
                        }
                      </Button>
                    </div>
                  </div>
                </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Filter */}
            <div className="mb-6">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="همه واحدها" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه واحدها</SelectItem>
                  <SelectItem value="investment">سرمایه‌گذاری</SelectItem>
                  <SelectItem value="administrative">اداری</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Requirements List */}
            <div className="grid gap-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-pulse">در حال بارگذاری...</div>
                </div>
              ) : filteredRequirements.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {selectedDepartment === "all" ? "هیچ فرم مدرکی تعریف نشده" : "هیچ فرم مدرکی برای این واحد تعریف نشده"}
                    </h3>
                    <p className="text-gray-500">برای شروع، یک فرم مدارک جدید ایجاد کنید.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredRequirements.map((requirement: any) => (
                  <Card key={requirement.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <CardTitle className="text-xl">{requirement.title}</CardTitle>
                            {requirement.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {requirement.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={requirement.department === "investment" ? "default" : "secondary"}>
                            {requirement.department === "investment" ? "سرمایه‌گذاری" : "اداری"}
                          </Badge>
                          <Badge variant={requirement.isRequired ? "destructive" : "outline"}>
                            {requirement.isRequired ? "الزامی" : "اختیاری"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-4 text-sm">
                          {requirement.category && (
                            <div>
                              <strong>دسته‌بندی:</strong> {requirement.category}
                            </div>
                          )}
                          
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">فیلدهای تعریف شده:</h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {(() => {
                              // Parse fields if they're stored as JSON string
                              let parsedFields = [];
                              try {
                                if (typeof requirement.fields === 'string') {
                                  parsedFields = JSON.parse(requirement.fields);
                                } else {
                                  parsedFields = requirement.fields || [];
                                }
                              } catch (error) {
                                console.error('Error parsing requirement fields:', error);
                                parsedFields = [];
                              }

                              if (Array.isArray(parsedFields) && parsedFields.length > 0) {
                                return parsedFields.map((field: any, index: number) => {
                                  const fieldType = FIELD_TYPES.find(t => t.value === field.type);
                                  const Icon = fieldType?.icon || Type;
                                  
                                  return (
                                    <div key={field.id || field.name || index} className="flex items-center space-x-2 space-x-reverse text-sm bg-gray-50 p-2 rounded">
                                      <Icon className="h-3 w-3 text-gray-600" />
                                      <span>{field.label}</span>
                                      {field.required && <span className="text-red-500">*</span>}
                                    </div>
                                  );
                                });
                              } else {
                                return (
                                  <div className="text-sm text-gray-500 col-span-full">
                                    هیچ فیلدی تعریف نشده است
                                  </div>
                                );
                              }
                            })()}
                          </div>
                          <div className="text-xs text-gray-400 mt-2">
                            تعداد فیلدها: {(() => {
                              try {
                                const fields = typeof requirement.fields === 'string' 
                                  ? JSON.parse(requirement.fields) 
                                  : requirement.fields || [];
                                return Array.isArray(fields) ? fields.length : 0;
                              } catch {
                                return 0;
                              }
                            })()}
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="text-sm text-muted-foreground">
                            ایجاد شده: {new Date(requirement.createdAt).toLocaleDateString('fa-IR')}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditRequirement(requirement)}
                            >
                              <Edit className="h-4 w-4 ml-1" />
                              ویرایش
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`آیا مطمئن هستید که می‌خواهید فرم "${requirement.title}" را حذف کنید؟\n\nاین عمل غیرقابل بازگشت است و تمام داده‌های مرتبط با این فرم حذف خواهد شد.`)) {
                                  deleteRequirementMutation.mutate(requirement.id);
                                }
                              }}
                              disabled={deleteRequirementMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500 ml-1" />
                              {deleteRequirementMutation.isPending ? "در حال حذف..." : "حذف"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}