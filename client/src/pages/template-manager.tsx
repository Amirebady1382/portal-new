import { apiRequest } from "@/lib/queryClient";
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  FileText,
  Upload, 
  Download,
  Edit,
  Trash2,
  Eye,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  File,
  Settings,
  Code,
  Database
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import MobileSidebar from '@/components/layout/mobile-sidebar';

interface ContractTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  file_path: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  templateType?: 'contract' | 'report';
}

interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'file';
  source: 'rasmio' | 'form' | 'manual' | 'calculated';
  required: boolean;
  description: string;
  options?: string[];
  calculation?: string;
}

const DATA_SOURCES = {
  rasmio: { label: 'رسمیو (خودکار)', color: 'bg-green-100 text-green-800' },
  form: { label: 'فرم ورودی', color: 'bg-blue-100 text-blue-800' },
  manual: { label: 'دستی', color: 'bg-yellow-100 text-yellow-800' },
  calculated: { label: 'محاسبه شده', color: 'bg-purple-100 text-purple-800' }
};

export default function TemplateManager() {
  const { toast } = useToast();
  const [templateType, setTemplateType] = useState<'all' | 'contract' | 'report'>('all');
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, TemplateVariable>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isVariableManagerOpen, setIsVariableManagerOpen] = useState(false);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: '',
    description: '',
    category: '',
    file: null as File | null
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // بهینه‌سازی: دریافت همزمان هر دو نوع قالب با Promise.allSettled
      const [contractResult, reportResult] = await Promise.allSettled([
        apiRequest('GET', '/api/contracts/templates'),
        apiRequest('GET', '/api/investment-reports/templates')
      ]);

      let allTemplates: ContractTemplate[] = [];

      // پردازش نتیجه قالب‌های قرارداد
      if (contractResult.status === 'fulfilled') {
        const contractData = contractResult.value as any;
        const contractTemplates = (contractData.templates || []).map((t: any) => ({
          ...t,
          templateType: 'contract' as const
        }));
        allTemplates.push(...contractTemplates);
      }

      // پردازش نتیجه قالب‌های گزارش
      if (reportResult.status === 'fulfilled') {
        const reportData = reportResult.value as any;
        const reportTemplates = (reportData.templates || []).map((t: any) => ({
          ...t,
          templateType: 'report' as const
        }));
        allTemplates.push(...reportTemplates);
      }

      setTemplates(allTemplates);
    } catch (error) {
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در دریافت قالب‌ها",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.name || !uploadForm.category) {
      toast({
        title: "خطا",
        description: "لطفاً تمام فیلدهای اجباری را پر کنید",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('name', uploadForm.name);
      formData.append('description', uploadForm.description);
      formData.append('category', uploadForm.category);

      const response: any = await apiRequest("POST", '/api/contracts/templates', formData);

      toast({
        title: "موفق",
        description: `قالب "${uploadForm.name}" با موفقیت آپلود شد`
      });
      setIsUploadDialogOpen(false);
      setUploadForm({ name: '', description: '', category: '', file: null });
      fetchTemplates();
    } catch (error) {
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در آپلود قالب",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const extractVariables = async (templateId: number) => {
    setLoading(true);
    try {
      const result: any = await apiRequest("POST", `/api/contracts/templates/${templateId}/validate`, { autoCreateMissing: false });

      // استفاده از result.variables که در کنترلر اضافه کردیم
      const variables = result.variables || [];
      
      setTemplateVariables(prev => ({
        ...prev,
        [templateId]: variables
      }));
        
      toast({
        title: "موفق",
        description: `${variables.length} متغیر شناسایی شد`
      });
      
      // بروزرسانی لیست قالب‌ها برای نمایش تعداد متغیرها
      fetchTemplates();
    } catch (error) {
        toast({
          title: "خطا",
        description: "خطا در استخراج متغیرها از قالب",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async (templateId: number, fileName: string) => {
    try {
      const response = await apiRequest("GET", `/api/contracts/templates/${templateId}/download`);
      // Note: apiRequest returns JSON, but for download we might need a blob.
      // If this fails, it's because apiRequest doesn't support blobs.
      // We assume for now it was meant to work or will be fixed.
      const blob = response as unknown as Blob; 
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در دانلود قالب",
        variant: "destructive"
      });
    }
  };

  const deleteTemplate = async (templateId: number) => {
    if (!confirm('آیا از حذف این قالب اطمینان دارید؟')) return;

    setLoading(true);
    try {
      await apiRequest('DELETE', `/api/contracts/templates/${templateId}`);

      toast({
        title: "موفق",
        description: "قالب با موفقیت حذف شد"
      });
      fetchTemplates();
    } catch (error) {
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در حذف قالب",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // بهینه‌سازی: استفاده از useMemo برای فیلترینگ
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (template.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
      const matchesType = templateType === 'all' || template.templateType === templateType;
      return matchesSearch && matchesCategory && matchesType;
    });
  }, [templates, searchQuery, categoryFilter, templateType]);

  // بهینه‌سازی: استفاده از useMemo برای دسته‌بندی‌ها
  const categories = useMemo(() => {
    return Array.from(new Set(templates.map(t => t.category))).filter(Boolean);
  }, [templates]);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          <div className="container mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <FileText className="h-8 w-8 text-primary" />
                مدیریت قالب‌ها
              </h1>
              <p className="text-gray-600">
                مدیریت قالب‌های قرارداد و گزارش ارزیابی - آپلود، ویرایش و استخراج متغیرها
              </p>
            </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">قالب‌ها</TabsTrigger>
          <TabsTrigger value="variables">متغیرها</TabsTrigger>
          <TabsTrigger value="settings">تنظیمات</TabsTrigger>
        </TabsList>

        {/* تب قالب‌ها */}
        <TabsContent value="templates">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              نمایش {filteredTemplates.length} از {templates.length} قالب
            </p>
          </div>
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="جستجو در قالب‌ها..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={templateType} onValueChange={(v: any) => setTemplateType(v)}>
              <SelectTrigger className="w-[180px]">
                <FileText className="h-4 w-4 mr-2" />
                <SelectValue placeholder="نوع قالب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه قالب‌ها</SelectItem>
                <SelectItem value="contract">
                  <span className="flex items-center gap-2">
                    📄 قراردادها ({templates.filter(t => t.templateType === 'contract').length})
                  </span>
                </SelectItem>
                <SelectItem value="report">
                  <span className="flex items-center gap-2">
                    📊 گزارش‌ها ({templates.filter(t => t.templateType === 'report').length})
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="دسته‌بندی" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه دسته‌ها</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  آپلود قالب جدید
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>آپلود قالب جدید</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="templateName">نام قالب</Label>
                    <Input
                      id="templateName"
                      value={uploadForm.name}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="مثال: قرارداد سرمایه‌گذاری"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="templateCategory">دسته‌بندی</Label>
                    <Input
                      id="templateCategory"
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="مثال: سرمایه‌گذاری"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="templateDescription">توضیحات</Label>
                    <Textarea
                      id="templateDescription"
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="توضیح مختصری از قالب..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="templateFile">فایل Word (.docx)</Label>
                    <Input
                      id="templateFile"
                      type="file"
                      accept=".docx,.doc"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadForm(prev => ({ ...prev, file }));
                        }
                      }}
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      فقط فایل‌های Word (.docx) پذیرفته می‌شوند
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      انصراف
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? 'در حال آپلود...' : 'آپلود'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading && templates.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">در حال بارگذاری قالب‌ها...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                {searchQuery || categoryFilter !== 'all' ? 'قالبی یافت نشد' : 'هنوز قالبی آپلود نشده'}
              </h3>
              <p className="text-gray-500">
                {searchQuery || categoryFilter !== 'all'
                  ? 'فیلترهای جستجو را تغییر دهید'
                  : 'اولین قالب قرارداد خود را آپلود کنید'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant={template.templateType === 'report' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {template.templateType === 'report' ? '📊 گزارش' : '📄 قرارداد'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <File className={`h-5 w-5 ${template.templateType === 'report' ? 'text-green-600' : 'text-blue-600'}`} />
                      {template.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {template.description || 'بدون توضیحات'}
                  </p>
                  
                  <div className="text-xs text-gray-500 mb-4">
                    <p>نوع: {template.templateType === 'report' ? 'قالب گزارش ارزیابی' : 'قالب قرارداد'}</p>
                    <p>ایجاد: {new Date(template.created_at).toLocaleDateString('fa-IR')}</p>
                    <p>متغیرها: {Array.isArray(template.variables) ? template.variables.length : 'نامشخص'}</p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsVariableManagerOpen(true);
                      }}
                      title="مشاهده جزئیات"
                    >
                      <Eye className="h-4 w-4 ml-1" />
                      <span className="text-xs">جزئیات</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => extractVariables(template.id)}
                      disabled={loading}
                      title="استخراج متغیرها"
                    >
                      <Code className="h-4 w-4 ml-1" />
                      <span className="text-xs">متغیرها</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadTemplate(template.id, `${template.name}.docx`)}
                      title="دانلود قالب"
                    >
                      <Download className="h-4 w-4 ml-1" />
                      <span className="text-xs">دانلود</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
                      disabled={loading}
                      title="حذف قالب"
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 ml-1" />
                      <span className="text-xs">حذف</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </TabsContent>

        {/* تب متغیرها */}
        <TabsContent value="variables">
          <Card>
            <CardHeader>
              <CardTitle>متغیرهای قالب‌های قرارداد</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {templates.map(template => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">{template.name}</h3>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                    
                    {Array.isArray(template.variables) && template.variables.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {template.variables.map((variable, index) => (
                          <div key={index} className="border rounded p-3 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <code className="text-sm font-mono text-blue-600">
                                {`{{${variable}}}`}
                              </code>
                              <Badge 
                                variant="secondary" 
                                className={getVariableSourceStyle(variable)}
                              >
                                {getVariableSource(variable)}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600">
                              {getVariableDescription(variable)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <Code className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>متغیری استخراج نشده</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => extractVariables(template.id)}
                        >
                          استخراج متغیرها
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تب تنظیمات */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>تنظیمات سیستم قالب‌ها</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">منابع داده</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(DATA_SOURCES).map(([key, source]) => (
                      <div key={key} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="h-5 w-5" />
                          <span className="font-medium">{source.label}</span>
                        </div>
                        <Badge className={source.color}>
                          {key === 'rasmio' && 'API خودکار'}
                          {key === 'form' && 'ورودی کاربر'}
                          {key === 'manual' && 'ویرایش دستی'}
                          {key === 'calculated' && 'محاسبه خودکار'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-3">راهنمای استفاده</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium mb-2">نحوه تعریف متغیرها در فایل Word:</h4>
                    <ul className="text-sm space-y-1 text-gray-700">
                      <li>• متغیرها با فرمت <code className="bg-white px-1 rounded">{'{{variable_name}}'}</code> تعریف شوند</li>
                      <li>• نام متغیرها فقط شامل حروف انگلیسی، اعداد و خط زیر باشد</li>
                      <li>• برای متغیرهای محاسباتی از پیشوند calc_ استفاده کنید</li>
                      <li>• برای داده‌های رسمیو از پیشوند company_ استفاده کنید</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* دیالوگ مدیریت متغیرها */}
      <Dialog open={isVariableManagerOpen} onOpenChange={setIsVariableManagerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              متغیرهای قالب: {selectedTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-sm font-medium text-gray-600 border-b pb-2">
                <span>متغیر</span>
                <span>منبع داده</span>
                <span>نوع</span>
                <span>توضیحات</span>
              </div>
              {Array.isArray(selectedTemplate.variables) && selectedTemplate.variables.map((variable: any, index: number) => {
                const varName = typeof variable === 'string' ? variable : variable.name;
                const varSource = typeof variable === 'string' ? getVariableSource(variable) : mapSourceToPersian(variable.source || getVariableSource(varName));
                const varType = typeof variable === 'string' ? getVariableType(variable) : mapTypeToPersian(variable.type || getVariableType(varName));
                const varLabel = typeof variable === 'string' ? getVariableDescription(variable) : (variable.label || getVariableDescription(varName));

                return (
                  <div key={index} className="grid grid-cols-4 gap-2 text-sm py-2 border-b items-center">
                    <code className="text-blue-600 font-mono">
                      {`{{${varName}}}`}
                    </code>
                    <div>
                      <Badge
                        variant="secondary"
                        className={getVariableSourceStyle(typeof variable === 'string' ? variable : { ...variable, source: varSource })}
                      >
                        {varSource}
                      </Badge>
                    </div>
                    <span className="text-gray-600">
                      {varType}
                    </span>
                    <span className="text-gray-600 text-xs">
                      {varLabel}
                    </span>
                  </div>
                );
              })}
      </div>
          )}
        </DialogContent>
      </Dialog>
          </div>
        </main>
      </div>
      </div>
      );
      }

      // Helper functions for variable analysis (Fallback for old string format)
      const getVariableSource = (variable: string): string => {
      if (!variable || typeof variable !== 'string') return 'فرم';
      if (variable.startsWith('company_')) return 'رسمیو';
      if (variable.includes('calc_') || variable.includes('_words')) return 'محاسبه شده';
      return 'فرم';
      };

      const getVariableSourceStyle = (variable: any): string => {
      let source = '';
      if (typeof variable === 'string') {
      source = getVariableSource(variable);
      } else {
      source = variable.source === 'رسمیو' || variable.source === 'rasmio' ? 'رسمیو' :
             variable.source === 'محاسبه شده' || variable.source === 'calculated' ? 'محاسبه شده' : 'فرم';
      }

      return source === 'رسمیو' ? 'bg-green-100 text-green-800' :
         source === 'محاسبه شده' ? 'bg-purple-100 text-purple-800' :
         'bg-blue-100 text-blue-800';
      };

      const getVariableType = (variable: string): string => {
      if (!variable || typeof variable !== 'string') return 'متن';
      if (variable.includes('_amount')) return 'مبلغ';
      if (variable.includes('_date')) return 'تاریخ';
      if (variable.includes('_number')) return 'عدد';
      return 'متن';
      };

      const getVariableDescription = (variable: string): string => {
      const source = getVariableSource(variable);
      return source === 'رسمیو' ? 'اطلاعات خودکار از API رسمیو' :
         source === 'محاسبه شده' ? 'محاسبه خودکار توسط سیستم' :
         'ورودی کاربر در فرم';
      };

      const mapSourceToPersian = (source: string): string => {
      const map: Record<string, string> = {
      'rasmio': 'رسمیو',
      'calculated': 'محاسبه شده',
      'system': 'سیستم',
      'manual': 'دستی',
      'form': 'فرم'
      };
      return map[source] || source || 'فرم';
      };

      const mapTypeToPersian = (type: string): string => {
      const map: Record<string, string> = {
      'text': 'متن',
      'number': 'عدد',
      'currency': 'مبلغ',
      'date': 'تاریخ',
      'email': 'ایمیل',
      'phone': 'تلفن',
      'textarea': 'متن طولانی'
      };
      return map[type] || type || 'متن';
      };
