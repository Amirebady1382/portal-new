import { apiRequest } from "@/lib/queryClient";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Building2, 
  User, 
  Calendar, 
  CreditCard, 
  Upload,
  Download,
  Calculator,
  Search,
  Settings,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GuaranteeForm from '@/components/contracts/guarantee-form';

interface ContractTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  variables: string[];
  is_active: boolean;
}

interface Company {
  id: number;
  name: string;
  nationalId: string;
  registrationNumber: string;
  address: string;
  phone: string;
  email: string;
  postalCode: string;
}

interface DynamicFormData {
  [key: string]: any;
}

interface VariableConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'email' | 'phone';
  source: 'rasmio' | 'form' | 'calculated';
  required: boolean;
  placeholder?: string;
  calculation?: string;
}

export default function FlexibleContractGenerator() {
  const { toast } = useToast();

  // State management
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [formData, setFormData] = useState<DynamicFormData>({});
  const [variableConfigs, setVariableConfigs] = useState<VariableConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  
  // Dialog states
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');

  useEffect(() => {
    fetchTemplates();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      generateVariableConfigs();
      resetFormData();
      // Check if template needs custom form
      if (selectedTemplate.category === 'ضمانت‌نامه' || selectedTemplate.name.includes('ضمانت')) {
        setShowCustomForm(true);
      } else {
        setShowCustomForm(false);
      }
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const data: any = await apiRequest("GET", '/api/contracts/templates');
      console.log('📋 Templates API response:', data);
      setTemplates(data.templates?.filter((t: ContractTemplate) => t.is_active) || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const data: any = await apiRequest("GET", '/api/companies');
      console.log('🏢 Companies API response:', data);
      // API returns array directly or {companies: [...]}
      setCompanies(Array.isArray(data) ? data : (data.companies || []));
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const generateVariableConfigs = () => {
    if (!selectedTemplate?.variables) return;

    const configs: VariableConfig[] = selectedTemplate.variables.map(variable => ({
      name: variable,
      label: getVariableLabel(variable),
      type: getVariableType(variable),
      source: getVariableSource(variable),
      required: isVariableRequired(variable),
      placeholder: getVariablePlaceholder(variable),
      calculation: getVariableCalculation(variable)
    }));

    setVariableConfigs(configs);
  };

  const resetFormData = () => {
    if (!selectedTemplate?.variables) return;

    const newFormData: DynamicFormData = {};
    
    selectedTemplate.variables.forEach(variable => {
      const source = getVariableSource(variable);
      
      if (source === 'rasmio' && selectedCompany) {
        // Auto-fill from company data
        newFormData[variable] = getCompanyDataValue(variable, selectedCompany);
      } else if (source === 'calculated') {
        // Calculate value
        newFormData[variable] = calculateVariableValue(variable, newFormData);
      } else {
        // Default empty for form input
        newFormData[variable] = getDefaultValue(variable);
      }
    });

    setFormData(newFormData);
  };

  const handleInputChange = (variable: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [variable]: value };
      
      // Recalculate dependent variables
      variableConfigs.forEach(config => {
        if (config.source === 'calculated') {
          updated[config.name] = calculateVariableValue(config.name, updated);
        }
      });
      
      return updated;
    });
  };

  const selectTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setIsTemplateDialogOpen(false);
    toast({
      title: "قالب انتخاب شد",
      description: `قالب "${template.name}" انتخاب شد`
    });
  };

  const selectCompany = (company: Company) => {
    setSelectedCompany(company);
    setIsCompanyDialogOpen(false);
    
    // Auto-fill company data
    if (selectedTemplate) {
      const updatedFormData = { ...formData };
      selectedTemplate.variables.forEach(variable => {
        if (getVariableSource(variable) === 'rasmio') {
          updatedFormData[variable] = getCompanyDataValue(variable, company);
        }
      });
      setFormData(updatedFormData);
    }
    
    toast({
      title: "شرکت انتخاب شد",
      description: `${company.name} انتخاب شد`
    });
  };

  const generateContract = async () => {
    if (!selectedTemplate || !selectedCompany) {
      toast({
        title: "خطا",
        description: "لطفاً قالب و شرکت را انتخاب کنید",
        variant: "destructive"
      });
      return;
    }

    // Validate required fields
    const missingFields = variableConfigs
      .filter(config => config.required && config.source === 'form')
      .filter(config => !formData[config.name] || formData[config.name] === '')
      .map(config => config.label);

    if (missingFields.length > 0) {
      toast({
        title: "خطا",
        description: `فیلدهای اجباری: ${missingFields.join('، ')}`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Auth token:', token ? 'موجود' : 'ناموجود');
      console.log('📡 Sending request to /api/contracts/generate');
      
      const data: any = await apiRequest("POST", '/api/contracts/generate', {
          templateId: selectedTemplate.id,
          companyId: selectedCompany.id,
          contractNumber: generateContractNumber()
      });
      
      console.log('📥 Response data:', data);

      // Download the generated contract
      if (data.downloadUrl) {
        const downloadResponse = await apiRequest("GET", data.downloadUrl, undefined, { rawResponse: true });

        if ((downloadResponse as Response).ok) {
          const contentType = (downloadResponse as Response).headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await (downloadResponse as Response).json();
            throw new Error(errorData.message || 'خطا در دانلود فایل');
          }
          
          try {
            const blob = await (downloadResponse as Response).blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.fileName || `contract_${selectedCompany.name}_${Date.now()}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
              title: "موفق",
              description: `قرارداد با موفقیت تولید شد: ${data.fileName || 'قرارداد'}`
            });
          } catch (blobError) {
            console.error('❌ Error handling file blob:', blobError);
            throw new Error('خطا در پردازش فایل دانلود شده');
          }
        } else {
          throw new Error(`خطا در دانلود فایل - ${downloadResponse.status}`);
        }
      }
    } catch (error: any) {
      console.error('Contract generation error:', error);
      toast({
        title: "خطا",
        description: error.message || "خطا در تولید قرارداد",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuaranteeFormSubmit = async (guaranteeFormData: any) => {
    if (!selectedTemplate || !selectedCompany) {
      toast({
        title: "خطا",
        description: "لطفاً قالب و شرکت را انتخاب کنید",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const data: any = await apiRequest("POST", '/api/contracts/generate', {
          templateId: selectedTemplate.id,
          companyId: selectedCompany.id,
          contractNumber: generateContractNumber()
      });

      // Download the generated contract
      if (data.downloadUrl) {
        const downloadResponse = await apiRequest("GET", data.downloadUrl, undefined, { rawResponse: true });

        if ((downloadResponse as Response).ok) {
          const contentType = (downloadResponse as Response).headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await (downloadResponse as Response).json();
            throw new Error(errorData.message || 'خطا در دانلود فایل');
          }
          
          try {
            const blob = await (downloadResponse as Response).blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.fileName || `contract_${selectedCompany.name}_${Date.now()}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({
              title: "موفق",
              description: `قرارداد با موفقیت تولید شد: ${data.fileName || 'قرارداد'}`
            });
          } catch (blobError) {
            console.error('❌ Error handling file blob:', blobError);
            throw new Error('خطا در پردازش فایل دانلود شده');
          }
        } else {
          throw new Error(`خطا در دانلود فایل - ${downloadResponse.status}`);
        }
      }
    } catch (error: any) {
      console.error('Contract generation error:', error);
      toast({
        title: "خطا",
        description: error.message || "خطا در تولید قرارداد",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
    template.category.toLowerCase().includes(templateSearchQuery.toLowerCase())
  );

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(companySearchQuery.toLowerCase()) ||
    company.nationalId.includes(companySearchQuery)
  );

  const rasmioVariables = variableConfigs.filter(v => v.source === 'rasmio');
  const formVariables = variableConfigs.filter(v => v.source === 'form');
  const calculatedVariables = variableConfigs.filter(v => v.source === 'calculated');

  return (
    <div className="container mx-auto py-8" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          تولید قرارداد هوشمند
        </h1>
        <p className="text-gray-600">
          تولید انواع قراردادها بر اساس قالب‌های آپلود شده
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* پانل انتخاب قالب و شرکت */}
        <div className="lg:col-span-1 space-y-4">
          {/* انتخاب قالب */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                قالب قرارداد
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTemplate ? (
                <div className="space-y-2">
                  <p className="font-medium">{selectedTemplate.name}</p>
                  <Badge variant="secondary">{selectedTemplate.category}</Badge>
                  <p className="text-sm text-gray-600">
                    {selectedTemplate.variables?.length || 0} متغیر
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setIsTemplateDialogOpen(true)}
                  >
                    تغییر قالب
                  </Button>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>قالب انتخاب نشده</p>
                  <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="mt-2">
                        انتخاب قالب
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>انتخاب قالب قرارداد</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="جستجو بر اساس نام یا دسته‌بندی..."
                            value={templateSearchQuery}
                            onChange={(e) => setTemplateSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <div className="max-h-96 overflow-y-auto space-y-2">
                          {filteredTemplates.map((template) => (
                            <Card 
                              key={template.id} 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => selectTemplate(template)}
                            >
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="font-medium">{template.name}</h3>
                                    <p className="text-sm text-gray-500">{template.description}</p>
                                    <p className="text-xs text-gray-400">
                                      {template.variables?.length || 0} متغیر
                                    </p>
                                  </div>
                                  <Badge variant="outline">{template.category}</Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* انتخاب شرکت */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                شرکت
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedCompany ? (
                <div className="space-y-2">
                  <p className="font-medium">{selectedCompany.name}</p>
                  <Badge variant="secondary">رسمیو</Badge>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>شناسه ملی: {selectedCompany.nationalId}</p>
                    <p>تلفن: {selectedCompany.phone}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setIsCompanyDialogOpen(true)}
                  >
                    تغییر شرکت
                  </Button>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>شرکت انتخاب نشده</p>
                  <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="mt-2">
                        انتخاب شرکت
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>انتخاب شرکت</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            placeholder="جستجو بر اساس نام یا شناسه ملی..."
                            value={companySearchQuery}
                            onChange={(e) => setCompanySearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <div className="max-h-96 overflow-y-auto space-y-2">
                          {filteredCompanies.map((company) => (
                            <Card 
                              key={company.id} 
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => selectCompany(company)}
                            >
                              <CardContent className="p-4">
            <div>
                                  <h3 className="font-medium">{company.name}</h3>
                                  <p className="text-sm text-gray-500">
                                    شناسه ملی: {company.nationalId}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    تلفن: {company.phone || 'نامشخص'}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* نمایش محاسبات خودکار */}
          {calculatedVariables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  محاسبات خودکار
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {calculatedVariables.map(variable => (
                  <div key={variable.name} className="flex justify-between text-sm">
                    <span>{variable.label}:</span>
                    <span className="font-mono">
                      {formData[variable.name] || '-'}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
            </div>

        {/* فرم ورود اطلاعات */}
        <div className="lg:col-span-3">
          {selectedTemplate && selectedCompany && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  اطلاعات قرارداد
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showCustomForm ? (
                  // نمایش فرم سفارشی برای قراردادهای خاص
                  <GuaranteeForm
                    companyId={selectedCompany.id}
                    templateId={selectedTemplate.id}
                    onSubmit={handleGuaranteeFormSubmit}
                    initialData={formData}
                  />
                ) : (
                  // نمایش فرم عمومی برای سایر قراردادها
                  <>
                    {/* Rasmio Variables */}
                    {rasmioVariables.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          اطلاعات شرکت (رسمیو)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {rasmioVariables.map(variable => (
                            <div key={variable.name} className="space-y-2">
                              <Label htmlFor={variable.name}>
                                {variable.label}
                                {variable.required && <span className="text-red-500 mr-1">*</span>}
                              </Label>
                              <Input
                                id={variable.name}
                                type={variable.type}
                                value={String(formData[variable.name] || '')}
                                onChange={(e) => handleInputChange(variable.name, e.target.value)}
                                placeholder={variable.placeholder}
                                disabled
                                className="bg-gray-50"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Form Variables */}
                    {formVariables.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          اطلاعات قرارداد
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {formVariables.map(variable => (
                            <div key={variable.name} className="space-y-2">
                              <Label htmlFor={variable.name}>
                                {variable.label}
                                {variable.required && <span className="text-red-500 mr-1">*</span>}
                              </Label>
                              {variable.type === 'textarea' ? (
                                <Textarea
                                  id={variable.name}
                                  value={formData[variable.name] || ''}
                                  onChange={(e) => handleInputChange(variable.name, e.target.value)}
                                  placeholder={variable.placeholder}
                                  rows={3}
                                />
                              ) : (
                                <Input
                                  id={variable.name}
                                  type={variable.type}
                                  value={formData[variable.name] || ''}
                                  onChange={(e) => handleInputChange(variable.name, e.target.value)}
                                  placeholder={variable.placeholder}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Calculated Variables */}
                    {calculatedVariables.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Calculator className="h-5 w-5" />
                          مقادیر محاسبه شده
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {calculatedVariables.map(variable => (
                            <div key={variable.name} className="space-y-2">
                              <Label htmlFor={variable.name}>{variable.label}</Label>
                              <Input
                                id={variable.name}
                                type={variable.type}
                                value={String(formData[variable.name] || '')}
                                disabled
                                className="bg-gray-50"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons for generic form */}
                    <Separator className="my-6" />
                    <div className="flex justify-end">
                      <Button 
                        onClick={generateContract}
                        disabled={loading || !selectedTemplate || !selectedCompany}
                        size="lg"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-5 w-5 ml-2 animate-spin" />
                            در حال تولید...
                          </>
                        ) : (
                          <>
                            <Download className="h-5 w-5 ml-2" />
                            تولید و دانلود قرارداد
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
          </div>
      </div>
    </div>
  );
}

// Helper functions
function renderFormField(variable: VariableConfig, value: any, onChange: (value: any) => void) {
  const commonProps = {
    id: variable.name,
    value: value || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    placeholder: variable.placeholder,
    required: variable.required
  };

  switch (variable.type) {
    case 'textarea':
      return <Textarea {...commonProps} rows={3} />;
    case 'number':
      return <Input {...commonProps} type="number" />;
    case 'date':
      return <Input {...commonProps} type="date" />;
    case 'email':
      return <Input {...commonProps} type="email" />;
    case 'phone':
      return <Input {...commonProps} type="tel" />;
    default:
      return <Input {...commonProps} />;
  }
}

function getVariableLabel(variable: string): string {
  const labels: Record<string, string> = {
    company_name: 'نام شرکت',
    company_national_id: 'شناسه ملی شرکت',
    company_registration_number: 'شماره ثبت',
    company_address: 'آدرس شرکت',
    company_phone: 'تلفن شرکت',
    company_email: 'ایمیل شرکت',
    company_representative: 'نماینده قانونی',
    representative_national_id: 'کد ملی نماینده',
    contract_type: 'نوع قرارداد',
    contract_number: 'شماره قرارداد',
    contract_date: 'تاریخ قرارداد',
    contract_subject: 'موضوع قرارداد',
    total_amount: 'مبلغ کل',
    total_amount_words: 'مبلغ کل (حروف)',
    advance_amount: 'مبلغ پیش‌پرداخت',
    start_date: 'تاریخ شروع',
    end_date: 'تاریخ پایان',
    duration_days: 'مدت (روز)',
    guarantees_description: 'شرح تضامین',
    special_conditions: 'شرایط خاص',
    fund_representative: 'نماینده صندوق',
    fund_signature: 'امضای صندوق',
    company_signature: 'امضای شرکت'
  };
  
  return labels[variable] || variable.replace(/_/g, ' ');
}

function getVariableType(variable: string): 'text' | 'number' | 'date' | 'textarea' | 'email' | 'phone' {
  if (variable.includes('amount')) return 'number';
  if (variable.includes('date')) return 'date';
  if (variable.includes('email')) return 'email';
  if (variable.includes('phone')) return 'phone';
  if (variable.includes('description') || variable.includes('conditions') || variable.includes('subject')) return 'textarea';
  return 'text';
}

function getVariableSource(variable: string): 'rasmio' | 'form' | 'calculated' {
  if (variable.startsWith('company_')) return 'rasmio';
  if (variable.includes('_words') || variable === 'duration_days' || variable === 'contract_number') return 'calculated';
  return 'form';
}

function isVariableRequired(variable: string): boolean {
  const requiredVariables = [
    'contract_type', 'contract_subject', 'total_amount', 'start_date', 'end_date'
  ];
  return requiredVariables.includes(variable);
}

function getVariablePlaceholder(variable: string): string {
  const placeholders: Record<string, string> = {
    contract_type: 'مثال: سرمایه‌گذاری',
    contract_subject: 'مثال: سرمایه‌گذاری در پروژه فناوری',
    total_amount: 'مثال: 1000000000',
    advance_amount: 'مثال: 100000000',
    guarantees_description: 'شرح تضامین و ضمانت‌نامه‌ها',
    special_conditions: 'شرایط و مقررات خاص این قرارداد'
  };
  
  return placeholders[variable] || '';
}

function getVariableCalculation(variable: string): string | undefined {
  if (variable === 'total_amount_words') return 'numberToWords(total_amount)';
  if (variable === 'duration_days') return 'daysBetween(start_date, end_date)';
  if (variable === 'contract_number') return 'generateContractNumber()';
  return undefined;
}

function getCompanyDataValue(variable: string, company: Company): string {
  const mapping: Record<string, keyof Company> = {
    company_name: 'name',
    company_national_id: 'nationalId',
    company_registration_number: 'registrationNumber',
    company_address: 'address',
    company_phone: 'phone',
    company_email: 'email'
  };
  
  const key = mapping[variable];
  return key ? String(company[key] || '') : '';
}

function getDefaultValue(variable: string): string {
  if (variable === 'contract_date') return new Date().toISOString().split('T')[0];
  if (variable === 'fund_representative') return 'دانیال صابر سمیعی';
  return '';
}

function calculateVariableValue(variable: string, data: DynamicFormData): string {
  if (variable === 'total_amount_words') {
    return numberToWords(parseInt(data.total_amount) || 0);
  }
  if (variable === 'duration_days') {
    if (data.start_date && data.end_date) {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)).toString();
    }
  }
  if (variable === 'contract_number') {
    return generateContractNumber();
  }
  return '';
}

function generateContractNumber(): string {
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const day = new Date().getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${year}${month}${day}-${random}`;
}

function numberToWords(num: number): string {
  if (num === 0) return 'صفر';
  // Simplified Persian number to words
  return num.toLocaleString('fa-IR') + ' ریال';
}

