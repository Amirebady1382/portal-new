import { apiRequest } from "@/lib/queryClient";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Settings, 
  Filter,
  Search,
  Eye,
  FileText,
  Code,
  Link,
  AlertCircle,
  Variable,
  FileSignature,
  MessageCircleMore
} from "lucide-react";

interface ContractVariable {
  id: number;
  name: string;
  label: string;
  description?: string;
  dataType: 'text' | 'number' | 'date' | 'boolean';
  source: 'form' | 'rasmio' | 'calculated' | 'system';
  defaultValue?: string;
  isRequired: boolean;
  validationRules?: string;
  placeholder?: string;
  category?: string;
  isActive: boolean;
  sortOrder: number;
  createdBy: number;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  templateCount: number;
}

interface ContractTemplate {
  id: number;
  name: string;
  templateType?: 'contract' | 'report';
  filename: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

interface VariableMapping {
  id: number;
  templateId: number;
  templateName: string;
  variableId: number;
  variableName: string;
  variableLabel: string;
  isRequired: boolean;
  defaultValue?: string;
  sortOrder: number;
}

interface BaleEmployeeMapping {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeUsername: string;
  baleChatId: string;
  baleUserId?: string;
  isActive: boolean;
  notes?: string;
  createdBy: number;
  createdByName?: string;
  createdAt: string;
}

interface Employee {
  id: number;
  username: string;
  fullName: string;
  department: string;
  role: string;
}

export default function AdminTemplateManagement() {
  const [activeTab, setActiveTab] = useState("variables");
  const [templateTypeFilter, setTemplateTypeFilter] = useState<'all' | 'contract' | 'report'>('all');
  const { toast } = useToast();

  // Contract Variables State
  const [variables, setVariables] = useState<ContractVariable[]>([]);
  const [filteredVariables, setFilteredVariables] = useState<ContractVariable[]>([]);
  const [variableSearchTerm, setVariableSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");
  const [isVariableDialogOpen, setIsVariableDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<ContractVariable | null>(null);
  const [variableFormData, setVariableFormData] = useState({
    name: "",
    label: "",
    description: "",
    dataType: "text" as const,
    source: "form" as const,
    defaultValue: "",
    isRequired: false,
    validationRules: "",
    placeholder: "",
    category: "",
    sortOrder: 0,
  });

  // Template Mappings State
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [mappings, setMappings] = useState<VariableMapping[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);

  // Bale Mappings State
  const [baleMappings, setBaleMappings] = useState<BaleEmployeeMapping[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isBaleDialogOpen, setIsBaleDialogOpen] = useState(false);
  const [editingBaleMapping, setEditingBaleMapping] = useState<BaleEmployeeMapping | null>(null);
  const [baleFormData, setBaleFormData] = useState({
    employeeId: 0,
    baleChatId: "",
    baleUserId: "",
    isActive: true,
    notes: "",
  });

  // Load data on component mount
  useEffect(() => {
    loadVariables();
    loadTemplates();
    loadBaleMappings();
    loadEmployees();
  }, []);

  // Filter variables when search term or filters change
  useEffect(() => {
    let filtered = variables;
    
    if (variableSearchTerm) {
      filtered = filtered.filter(variable => 
        variable.name.toLowerCase().includes(variableSearchTerm.toLowerCase()) ||
        variable.label.toLowerCase().includes(variableSearchTerm.toLowerCase()) ||
        variable.description?.toLowerCase().includes(variableSearchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(variable => variable.category === selectedCategory);
    }
    
    if (selectedSource !== "all") {
      filtered = filtered.filter(variable => variable.source === selectedSource);
    }
    
    setFilteredVariables(filtered);
  }, [variables, variableSearchTerm, selectedCategory, selectedSource]);

  // API Functions
  const loadVariables = async () => {
    try {
      console.log('🔍 Loading contract variables...');
      const data: any = await apiRequest("GET", "/api/admin/contract-variables");
      
      console.log('📊 Variables data received:', data);
      setVariables(data.variables || []);
      
      if (data.variables && data.variables.length > 0) {
        console.log(`✅ ${data.variables.length} variables loaded successfully`);
        toast({ 
          title: "موفق", 
          description: `${data.variables.length} متغیر بارگذاری شد` 
        });
      } else {
        console.log('⚠️ No variables found');
        toast({ 
          title: "اطلاع", 
          description: "هیچ متغیری تعریف نشده است" 
        });
      }
    } catch (error: any) {
      console.error("Error loading variables:", error);
      toast({ 
        title: "خطا در بارگذاری متغیرها", 
        description: error.message || "خطای ناشناخته",
        variant: "destructive" 
      });
    }
  };

  const loadTemplates = async () => {
    try {
      console.log('🔍 Loading all templates (contracts + reports)...');
      
      // دریافت قالب‌های قرارداد
      const contractData: any = await apiRequest("GET", "/api/contracts/templates");
      
      // دریافت قالب‌های گزارش
      const reportData: any = await apiRequest("GET", "/api/investment-reports/templates");
      
      let allTemplates: ContractTemplate[] = [];
      
      const contractTemplates = (contractData.templates || []).map((t: any) => ({
        ...t,
        templateType: 'contract' as const
      }));
      allTemplates = [...allTemplates, ...contractTemplates];
      console.log('📋 Contract templates:', contractTemplates.length);
      
      const reportTemplates = (reportData.templates || []).map((t: any) => ({
        ...t,
        templateType: 'report' as const
      }));
      allTemplates = [...allTemplates, ...reportTemplates];
      console.log('📊 Report templates:', reportTemplates.length);
      
      setTemplates(allTemplates);
      console.log('✅ Total templates loaded:', allTemplates.length);
      
    } catch (error) {
      console.error("Error loading templates:", error);
      toast({
        title: "خطا",
        description: "خطا در بارگذاری قالب‌ها",
        variant: "destructive"
      });
    }
  };

  const loadBaleMappings = async () => {
    try {
      console.log('🔍 Loading bale mappings...');
      const data: any = await apiRequest("GET", "/api/admin/bale-employee-mappings");
      console.log('📱 Bale mappings data received:', data);
      setBaleMappings(data.mappings || []);
    } catch (error) {
      console.error("Error loading Bale mappings:", error);
      toast({ title: "خطا در بارگذاری تنظیمات بله", variant: "destructive" });
    }
  };

  const loadEmployees = async () => {
    try {
      console.log('🔍 Loading employees...');
      const data: any = await apiRequest("GET", "/api/admin/employees-dropdown");
      console.log('👥 Employees data received:', data);
      setEmployees(data.employees || []);
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const loadTemplateMappings = async (templateId: number) => {
    try {
      const data: any = await apiRequest("GET", `/api/admin/contract-templates/${templateId}/variables`);
      setMappings(data.variables || []);
    } catch (error) {
      console.error("Error loading template mappings:", error);
      toast({ title: "خطا در بارگذاری متغیرهای قالب", variant: "destructive" });
    }
  };

  const saveVariable = async () => {
    try {
      const method = editingVariable ? "PUT" : "POST";
      const url = editingVariable 
        ? `/api/admin/contract-variables/${editingVariable.id}`
        : "/api/admin/contract-variables";
      
      await apiRequest(method, url, variableFormData);

      toast({ title: editingVariable ? "متغیر بروزرسانی شد" : "متغیر ایجاد شد" });
      setIsVariableDialogOpen(false);
      loadVariables();
      resetVariableForm();
    } catch (error: any) {
      console.error("Error saving variable:", error);
      toast({ title: error.message || "خطا در ذخیره متغیر", variant: "destructive" });
    }
  };

  const deleteVariable = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/contract-variables/${id}`);
      toast({ title: "متغیر حذف شد" });
      loadVariables();
    } catch (error: any) {
      console.error("Error deleting variable:", error);
      toast({ title: error.message || "خطا در حذف متغیر", variant: "destructive" });
    }
  };

  const saveBaleMapping = async () => {
    try {
      const method = editingBaleMapping ? "PUT" : "POST";
      const url = editingBaleMapping 
        ? `/api/admin/bale-employee-mappings/${editingBaleMapping.id}`
        : "/api/admin/bale-employee-mappings";
      
      await apiRequest(method, url, baleFormData);

      toast({ title: editingBaleMapping ? "تنظیمات بله بروزرسانی شد" : "تنظیمات بله ایجاد شد" });
      setIsBaleDialogOpen(false);
      loadBaleMappings();
      resetBaleForm();
    } catch (error: any) {
      console.error("Error saving Bale mapping:", error);
      toast({ title: error.message || "خطا در ذخیره تنظیمات بله", variant: "destructive" });
    }
  };

  const deleteBaleMapping = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/admin/bale-employee-mappings/${id}`);
      toast({ title: "تنظیمات بله حذف شد" });
      loadBaleMappings();
    } catch (error: any) {
      console.error("Error deleting Bale mapping:", error);
      toast({ title: error.message || "خطا در حذف تنظیمات بله", variant: "destructive" });
    }
  };

  // Helper Functions
  const resetVariableForm = () => {
    setVariableFormData({
      name: "",
      label: "",
      description: "",
      dataType: "text",
      source: "form",
      defaultValue: "",
      isRequired: false,
      validationRules: "",
      placeholder: "",
      category: "",
      sortOrder: 0,
    });
    setEditingVariable(null);
  };

  const resetBaleForm = () => {
    setBaleFormData({
      employeeId: 0,
      baleChatId: "",
      baleUserId: "",
      isActive: true,
      notes: "",
    });
    setEditingBaleMapping(null);
  };

  const getUniqueCategories = () => {
    const categories = variables.map(v => v.category).filter(Boolean);
    return [...new Set(categories)];
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case "form": return "bg-blue-100 text-blue-800";
      case "rasmio": return "bg-green-100 text-green-800";
      case "calculated": return "bg-purple-100 text-purple-800";
      case "system": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case "form": return "فرم";
      case "rasmio": return "راسمیو";
      case "calculated": return "محاسبه‌ای";
      case "system": return "سیستم";
      default: return source;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 md:mr-72 p-6 mt-16">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">تنظیمات متغیرها</h1>
              <p className="text-gray-600">
                مدیریت متغیرهای قرارداد، اتصال آنها به قالب‌ها و تنظیمات چت بله
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="variables" className="flex items-center gap-2">
                  <Variable className="h-4 w-4" />
                  متغیرهای قرارداد
                </TabsTrigger>
                <TabsTrigger value="mappings" className="flex items-center gap-2">
                  <FileSignature className="h-4 w-4" />
                  اتصال به قالب‌ها
                </TabsTrigger>
                <TabsTrigger value="bale" className="flex items-center gap-2">
                  <MessageCircleMore className="h-4 w-4" />
                  تنظیمات بله
                </TabsTrigger>
              </TabsList>

              {/* Variables Tab */}
              <TabsContent value="variables" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-xl">متغیرهای قرارداد</CardTitle>
                      <CardDescription>
                        مدیریت متغیرهای قابل استفاده در قراردادها
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => {
                        resetVariableForm();
                        setIsVariableDialogOpen(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      افزودن متغیر
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {/* Search and Filter */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                      <div className="flex-1 relative">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          placeholder="جستجو در متغیرها..."
                          value={variableSearchTerm}
                          onChange={(e) => setVariableSearchTerm(e.target.value)}
                          className="pr-10"
                        />
                      </div>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="دسته‌بندی" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">همه دسته‌ها</SelectItem>
                          {getUniqueCategories().map(category => (
                            <SelectItem key={category} value={category!}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedSource} onValueChange={setSelectedSource}>
                        <SelectTrigger className="w-full sm:w-48">
                          <SelectValue placeholder="منبع" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">همه منابع</SelectItem>
                          <SelectItem value="form">فرم</SelectItem>
                          <SelectItem value="rasmio">راسمیو</SelectItem>
                          <SelectItem value="calculated">محاسبه‌ای</SelectItem>
                          <SelectItem value="system">سیستم</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Variables Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">نام متغیر</TableHead>
                            <TableHead className="text-right">برچسب</TableHead>
                            <TableHead className="text-right">منبع</TableHead>
                            <TableHead className="text-right">نوع</TableHead>
                            <TableHead className="text-right">دسته‌بندی</TableHead>
                            <TableHead className="text-right">وضعیت</TableHead>
                            <TableHead className="text-right">عملیات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredVariables.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                متغیری یافت نشد
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredVariables.map((variable) => (
                              <TableRow key={variable.id}>
                                <TableCell className="font-medium">
                                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                    {variable.name}
                                  </code>
                                </TableCell>
                                <TableCell>{variable.label}</TableCell>
                                <TableCell>
                                  <Badge className={getSourceBadgeColor(variable.source)}>
                                    {getSourceLabel(variable.source)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{variable.dataType}</Badge>
                                </TableCell>
                                <TableCell>{variable.category || "-"}</TableCell>
                                <TableCell>
                                  {variable.isActive ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800">فعال</Badge>
                                  ) : (
                                    <Badge variant="secondary">غیرفعال</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingVariable(variable);
                                        setVariableFormData({
                                          name: variable.name,
                                          label: variable.label,
                                          description: variable.description || "",
                                          dataType: variable.dataType,
                                          source: variable.source,
                                          defaultValue: variable.defaultValue || "",
                                          isRequired: variable.isRequired,
                                          validationRules: variable.validationRules || "",
                                          placeholder: variable.placeholder || "",
                                          category: variable.category || "",
                                          sortOrder: variable.sortOrder,
                                        });
                                        setIsVariableDialogOpen(true);
                                      }}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-red-600">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>حذف متغیر</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            آیا از حذف متغیر "{variable.label}" اطمینان دارید؟
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>لغو</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteVariable(variable.id)}
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
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Template Mappings Tab */}
              <TabsContent value="mappings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl">اتصال متغیرها به قالب‌ها</CardTitle>
                    <CardDescription>
                      مشخص کنید کدام متغیرها در هر قالب استفاده شوند
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="template-select">انتخاب قالب</Label>
                        <Select 
                          value={selectedTemplate?.toString() || ""} 
                          onValueChange={(value) => {
                            const templateId = parseInt(value);
                            setSelectedTemplate(templateId);
                            loadTemplateMappings(templateId);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="قالب مورد نظر را انتخاب کنید" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map(template => (
                              <SelectItem key={template.id} value={template.id.toString()}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedTemplate && (
                        <div className="border rounded-lg p-4">
                          <h3 className="font-semibold mb-4">
                            متغیرهای متصل به قالب: {templates.find(t => t.id === selectedTemplate)?.name}
                          </h3>
                          {mappings.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                              هیچ متغیری به این قالب متصل نشده است
                            </p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>متغیر</TableHead>
                                  <TableHead>برچسب</TableHead>
                                  <TableHead>اجباری</TableHead>
                                  <TableHead>مقدار پیش‌فرض</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {mappings.map((mapping) => (
                                  <TableRow key={mapping.id}>
                                    <TableCell>
                                      <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                        {mapping.variableName}
                                      </code>
                                    </TableCell>
                                    <TableCell>{mapping.variableLabel}</TableCell>
                                    <TableCell>
                                      {mapping.isRequired ? (
                                        <Badge variant="destructive">اجباری</Badge>
                                      ) : (
                                        <Badge variant="secondary">اختیاری</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>{mapping.defaultValue || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Bale Settings Tab */}
              <TabsContent value="bale" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-xl">تنظیمات Chat ID بله</CardTitle>
                      <CardDescription>
                        اتصال کارمندان به Chat ID های بله
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => {
                        resetBaleForm();
                        setIsBaleDialogOpen(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      افزودن تنظیمات
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right">کارمند</TableHead>
                            <TableHead className="text-right">نام کاربری</TableHead>
                            <TableHead className="text-right">Chat ID بله</TableHead>
                            <TableHead className="text-right">وضعیت</TableHead>
                            <TableHead className="text-right">یادداشت</TableHead>
                            <TableHead className="text-right">عملیات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {baleMappings.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                تنظیماتی یافت نشد
                              </TableCell>
                            </TableRow>
                          ) : (
                            baleMappings.map((mapping) => (
                              <TableRow key={mapping.id}>
                                <TableCell className="font-medium">
                                  {mapping.employeeName}
                                </TableCell>
                                <TableCell>{mapping.employeeUsername}</TableCell>
                                <TableCell>
                                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                                    {mapping.baleChatId}
                                  </code>
                                </TableCell>
                                <TableCell>
                                  {mapping.isActive ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800">فعال</Badge>
                                  ) : (
                                    <Badge variant="secondary">غیرفعال</Badge>
                                  )}
                                </TableCell>
                                <TableCell>{mapping.notes || "-"}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingBaleMapping(mapping);
                                        setBaleFormData({
                                          employeeId: mapping.employeeId,
                                          baleChatId: mapping.baleChatId,
                                          baleUserId: mapping.baleUserId || "",
                                          isActive: mapping.isActive,
                                          notes: mapping.notes || "",
                                        });
                                        setIsBaleDialogOpen(true);
                                      }}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-red-600">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>حذف تنظیمات</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            آیا از حذف تنظیمات بله برای "{mapping.employeeName}" اطمینان دارید؟
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>لغو</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteBaleMapping(mapping.id)}
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
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Variable Dialog */}
      <Dialog open={isVariableDialogOpen} onOpenChange={setIsVariableDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingVariable ? "ویرایش متغیر" : "افزودن متغیر جدید"}
            </DialogTitle>
            <DialogDescription>
              اطلاعات متغیر قرارداد را وارد کنید
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">نام متغیر *</Label>
                <Input
                  id="name"
                  placeholder="مثال: company_name"
                  value={variableFormData.name}
                  onChange={(e) => setVariableFormData({...variableFormData, name: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="label">برچسب *</Label>
                <Input
                  id="label"
                  placeholder="مثال: نام شرکت"
                  value={variableFormData.label}
                  onChange={(e) => setVariableFormData({...variableFormData, label: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">توضیحات</Label>
              <Textarea
                id="description"
                placeholder="توضیح مختصر از کاربرد متغیر"
                value={variableFormData.description}
                onChange={(e) => setVariableFormData({...variableFormData, description: e.target.value})}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dataType">نوع داده</Label>
                <Select value={variableFormData.dataType} onValueChange={(value: any) => setVariableFormData({...variableFormData, dataType: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">متن</SelectItem>
                    <SelectItem value="number">عدد</SelectItem>
                    <SelectItem value="date">تاریخ</SelectItem>
                    <SelectItem value="boolean">بولی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="source">منبع</Label>
                <Select value={variableFormData.source} onValueChange={(value: any) => setVariableFormData({...variableFormData, source: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="form">فرم</SelectItem>
                    <SelectItem value="rasmio">راسمیو</SelectItem>
                    <SelectItem value="calculated">محاسبه‌ای</SelectItem>
                    <SelectItem value="system">سیستم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">دسته‌بندی</Label>
                <Input
                  id="category"
                  placeholder="مثال: اطلاعات شرکت"
                  value={variableFormData.category}
                  onChange={(e) => setVariableFormData({...variableFormData, category: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="defaultValue">مقدار پیش‌فرض</Label>
                <Input
                  id="defaultValue"
                  placeholder="مقدار پیش‌فرض"
                  value={variableFormData.defaultValue}
                  onChange={(e) => setVariableFormData({...variableFormData, defaultValue: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="placeholder">متن راهنما</Label>
              <Input
                id="placeholder"
                placeholder="متن راهنمای نمایشی در فرم"
                value={variableFormData.placeholder}
                onChange={(e) => setVariableFormData({...variableFormData, placeholder: e.target.value})}
              />
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="isRequired"
                checked={variableFormData.isRequired}
                onCheckedChange={(checked) => setVariableFormData({...variableFormData, isRequired: checked})}
              />
              <Label htmlFor="isRequired">فیلد اجباری</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVariableDialogOpen(false)}>
              لغو
            </Button>
            <Button onClick={saveVariable}>
              {editingVariable ? "بروزرسانی" : "ایجاد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bale Mapping Dialog */}
      <Dialog open={isBaleDialogOpen} onOpenChange={setIsBaleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBaleMapping ? "ویرایش تنظیمات بله" : "افزودن تنظیمات بله جدید"}
            </DialogTitle>
            <DialogDescription>
              اتصال کارمند به Chat ID بله
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="employee">کارمند *</Label>
              <Select 
                value={baleFormData.employeeId.toString()} 
                onValueChange={(value) => setBaleFormData({...baleFormData, employeeId: parseInt(value)})}
                disabled={!!editingBaleMapping}
              >
                <SelectTrigger>
                  <SelectValue placeholder="کارمند را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.fullName} ({employee.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="baleChatId">Chat ID بله *</Label>
              <Input
                id="baleChatId"
                placeholder="123456789"
                value={baleFormData.baleChatId}
                onChange={(e) => setBaleFormData({...baleFormData, baleChatId: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="baleUserId">User ID بله</Label>
              <Input
                id="baleUserId"
                placeholder="user123"
                value={baleFormData.baleUserId}
                onChange={(e) => setBaleFormData({...baleFormData, baleUserId: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="notes">یادداشت</Label>
              <Textarea
                id="notes"
                placeholder="یادداشت اضافی"
                value={baleFormData.notes}
                onChange={(e) => setBaleFormData({...baleFormData, notes: e.target.value})}
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="isActive"
                checked={baleFormData.isActive}
                onCheckedChange={(checked) => setBaleFormData({...baleFormData, isActive: checked})}
              />
              <Label htmlFor="isActive">فعال</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBaleDialogOpen(false)}>
              لغو
            </Button>
            <Button onClick={saveBaleMapping}>
              {editingBaleMapping ? "بروزرسانی" : "ایجاد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

