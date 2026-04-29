import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import MobileSidebar from '@/components/layout/mobile-sidebar';
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
import { VariableSummaryPanel, VariableBadge, getPersianPlaceholder } from '@/components/variable-summary-panel';

// استفاده از ابزارهای یکپارچه متغیرها
import {
  getVariableSource,
  getVariableType,
  getVariableLabel,
  getVariablePlaceholder,
  getDefaultValue,
  getCompanyDataValue,
  calculateVariableValue,
  isVariableRequired,
  generateContractNumber,
  type VariableSource,
  type VariableType,
  type CompanyData
} from '../../../shared/variable-utils';

// تمام helper functionها به shared/variable-utils.ts منتقل شدند

interface ContractTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  variables: string[];
  is_active: boolean;
}

interface Company extends CompanyData {}

interface DynamicFormData {
  [key: string]: any;
}

interface VariableConfig {
  name: string;
  label: string;
  type: VariableType;
  source: VariableSource;
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
  
  // Dialog states
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');

  // Filtered arrays for search
  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
    template.category.toLowerCase().includes(templateSearchQuery.toLowerCase())
  );

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(companySearchQuery.toLowerCase()) ||
    company.nationalId.includes(companySearchQuery)
  );

  // Debug logs
  console.log('🏗️ FlexibleContractGenerator render:');
  console.log('📋 Templates:', templates.length, templates);
  console.log('🏢 Companies:', companies.length, companies);
  console.log('🔍 Filtered templates:', filteredTemplates.length);
  console.log('🔍 Filtered companies:', filteredCompanies.length);

  useEffect(() => {
    fetchTemplates();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      generateVariableConfigs();
      resetFormData();
    }
  }, [selectedTemplate]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/contract-templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📋 Templates fetched:', data.templates?.length || 0);
        
        // Debug template variables
        data.templates?.forEach((template: any, index: number) => {
          console.log(`🔍 Template ${index + 1}: ${template.name}`);
          console.log(`  📊 Variables type:`, typeof template.variables);
          console.log(`  📊 Variables value:`, template.variables);
          console.log(`  📊 Is array:`, Array.isArray(template.variables));
          
          if (template.variables && typeof template.variables === 'string') {
            try {
              const parsed = JSON.parse(template.variables);
              console.log(`  ✅ Parsed successfully:`, Array.isArray(parsed), parsed?.length || 0);
            } catch (e) {
              console.log(`  ❌ Parse failed:`, (e as Error).message);
            }
          }
        });
        
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Template fetch error:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Companies data received:', data);
        // API returns array directly, not in companies property
        setCompanies(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const generateVariableConfigs = () => {
    if (!selectedTemplate?.variables) return;

    // Ensure variables is an array
    let variables: string[] = [];
    if (Array.isArray(selectedTemplate.variables)) {
      variables = selectedTemplate.variables;
    } else if (typeof selectedTemplate.variables === 'string') {
      try {
        variables = JSON.parse(selectedTemplate.variables);
      } catch (error) {
        console.error('Failed to parse template variables:', error);
        variables = [];
      }
    }

    if (!Array.isArray(variables)) {
      console.error('Template variables is not an array:', variables);
      return;
    }

    const configs: VariableConfig[] = variables.map(variable => {
      const source = getVariableSource(variable);
      const type = getVariableType(variable);
      
      return {
        name: variable,
        label: getVariableLabel(variable),
        type: type,
        source: source,
        required: isVariableRequired(variable, source),
        placeholder: getVariablePlaceholder(variable, type),
        calculation: undefined // This will be handled by calculateVariableValue
      };
    });

    setVariableConfigs(configs);
  };

  const resetFormData = () => {
    if (!selectedTemplate?.variables) {
      console.log('❌ No template variables available');
      return;
    }

    // Ensure variables is an array
    let variables: string[] = [];
    if (Array.isArray(selectedTemplate.variables)) {
      variables = selectedTemplate.variables;
    } else if (typeof selectedTemplate.variables === 'string') {
      try {
        variables = JSON.parse(selectedTemplate.variables);
      } catch (error) {
        console.error('Failed to parse template variables:', error);
        return;
      }
    }

    if (!Array.isArray(variables)) {
      console.error('Template variables is not an array:', variables);
      return;
    }

    console.log('🔄 Resetting form data for template:', selectedTemplate.name);
    console.log('📋 Template variables:', variables);

    const newFormData: DynamicFormData = {};
    
    variables.forEach(variable => {
      const source = getVariableSource(variable);
      console.log(`🔍 Processing variable: ${variable} (source: ${source})`);
      
      if (source === 'rasmio' && selectedCompany) {
        // Auto-fill from company data
        const value = getCompanyDataValue(variable, selectedCompany);
        newFormData[variable] = value;
        console.log(`✅ Auto-filled ${variable} = ${value}`);
      } else if (source === 'calculated') {
        // Calculate value
        const value = calculateVariableValue(variable, newFormData);
        newFormData[variable] = value;
        console.log(`🧮 Calculated ${variable} = ${value}`);
      } else {
        // Default empty for form input
        const defaultValue = getDefaultValue(variable);
        newFormData[variable] = defaultValue;
        console.log(`📝 Form field ${variable} = ${defaultValue || '(empty)'}`);
      }
    });

    console.log('💾 Final form data:', newFormData);
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
    console.log('🏢 Company selected:', company);
    setSelectedCompany(company);
    setIsCompanyDialogOpen(false);
    
    // Auto-fill company data if template is selected
    if (selectedTemplate) {
      console.log('🔄 Auto-filling company data for template:', selectedTemplate.name);
      
      // Ensure variables is an array
      let variables: string[] = [];
      if (Array.isArray(selectedTemplate.variables)) {
        variables = selectedTemplate.variables;
      } else if (typeof selectedTemplate.variables === 'string') {
        try {
          variables = JSON.parse(selectedTemplate.variables);
        } catch (error) {
          console.error('Failed to parse template variables:', error);
          variables = [];
        }
      }

      if (!Array.isArray(variables)) {
        console.error('Template variables is not an array:', variables);
        return;
      }

      console.log('📋 Template variables:', variables);
      
      const updatedFormData = { ...formData };
      
      variables.forEach(variable => {
        const source = getVariableSource(variable);
        console.log(`🔍 Variable ${variable} source: ${source}`);
        
        if (source === 'rasmio') {
          const value = getCompanyDataValue(variable, company);
          updatedFormData[variable] = value;
          console.log(`✅ Auto-filled ${variable} = ${value}`);
        } else if (source === 'calculated') {
          const value = calculateVariableValue(variable, updatedFormData);
          updatedFormData[variable] = value;
          console.log(`🧮 Calculated ${variable} = ${value}`);
        }
      });
      
      console.log('💾 Updated form data after company selection:', updatedFormData);
      setFormData(updatedFormData);
      
      // Regenerate variable configs to reflect updated sources
      generateVariableConfigs();
    }
    
    toast({
      title: "شرکت انتخاب شد",
      description: `${company.name} انتخاب شد - اطلاعات خودکار پر شد`
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

    // Enhanced validation with detailed debugging
    console.log('🔍 === VALIDATION DEBUGGING START ===');
    console.log('📋 Total variable configs:', variableConfigs.length);
    console.log('📝 Form data keys:', Object.keys(formData));
    
    // Group variables by source for debugging
    const groupedVariables = {
      rasmio: variableConfigs.filter(v => v.source === 'rasmio'),
      form: variableConfigs.filter(v => v.source === 'form'),
      calculated: variableConfigs.filter(v => v.source === 'calculated')
    };
    
    console.log('🟢 Rasmio variables:', groupedVariables.rasmio.map(v => v.name));
    console.log('🔵 Form variables:', groupedVariables.form.map(v => v.name));
    console.log('🟣 Calculated variables:', groupedVariables.calculated.map(v => v.name));
    
    // Check form variables only
    const formRequiredVariables = variableConfigs.filter(config => 
      config.required && config.source === 'form'
    );
    console.log('📋 Required form fields:', formRequiredVariables.map(v => `${v.name} (${v.label})`));
    
    const missingFields = formRequiredVariables.filter(config => {
      const value = formData[config.name];
      const isEmpty = !value || String(value).trim() === '';
      if (isEmpty) {
        console.log(`❌ Missing: ${config.name} = "${value}"`);
      } else {
        console.log(`✅ Valid: ${config.name} = "${value}"`);
      }
      return isEmpty;
    }).map(config => config.label);

    console.log('❌ Final missing fields:', missingFields);
    console.log('🔍 === VALIDATION DEBUGGING END ===');

    if (missingFields.length > 0) {
      toast({
        title: "خطا - اطلاعات ناقص",
        description: `فیلدهای اجباری خالی: ${missingFields.join('، ')}`,
        variant: "destructive"
      });
      return;
    }

    console.log('✅ All validation checks passed!');

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Auth token:', token ? 'موجود' : 'ناموجود');
      console.log('📡 Sending request to /api/contracts/generate');
      
      const response = await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          companyId: selectedCompany.id,
          contractNumber: generateContractNumber(),
          customFields: formData,
          variables: formData
        })
      });
      
      console.log('📥 Response status:', response.status, response.statusText);
      console.log('📥 Response ok:', response.ok);

      if (response.ok) {
        console.log('🔍 Trying to parse JSON response...');
        const responseText = await response.text();
        console.log('📄 Response text (first 200 chars):', responseText.substring(0, 200));
        
        let result;
        try {
          result = JSON.parse(responseText);
          console.log('✅ JSON parsed successfully:', result);
        } catch (parseError) {
          console.error('❌ JSON parse failed:', parseError);
          console.error('📄 Full response:', responseText);
          throw new Error('Response is not valid JSON');
        }
        
        // Download the generated contract
        if (result.downloadUrl && result.fileName) {
          console.log('📥 Downloading from:', result.downloadUrl);
          const downloadResponse = await fetch(result.downloadUrl, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('📥 Download response:', downloadResponse.status, downloadResponse.ok);
          
          if (downloadResponse.ok) {
            const contentType = downloadResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await downloadResponse.json();
                throw new Error(errorData.message || 'خطا در دانلود فایل');
            }
            
            try {
              const blob = await downloadResponse.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = result.fileName; // Use the fileName from server response
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);

              toast({
                title: "موفق",
                description: `قرارداد با موفقیت تولید شد: ${result.fileName}`
              });
            } catch (blobError) {
              console.error('❌ Error handling file blob:', blobError);
              throw new Error('خطا در پردازش فایل دانلود شده');
            }
          } else {
            throw new Error(`خطا در دانلود فایل - ${downloadResponse.status}`);
          }
        }
      } else {
        const errorText = await response.text();
        let errorMessage = 'خطا در تولید قرارداد';

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error('Failed to parse error response:', errorText.substring(0, 200));
          errorMessage = `خطای سرور (${response.status}): لطفاً با پشتیبانی تماس بگیرید.`;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Contract generation error:', error);
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در تولید قرارداد",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const rasmioVariables = variableConfigs.filter(v => v.source === 'rasmio');
  const formVariables = variableConfigs.filter(v => v.source === 'form');
  const calculatedVariables = variableConfigs.filter(v => v.source === 'calculated');

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="flex">
        <Sidebar />
        <MobileSidebar />
        <main className="flex-1 mr-0 md:mr-64 p-6">
          <div className="container mx-auto py-8">
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
          {selectedTemplate ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  تکمیل اطلاعات قرارداد: {selectedTemplate.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* متغیرهای رسمیو (فقط نمایش) */}
                {rasmioVariables.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">رسمیو</Badge>
                      اطلاعات خودکار از رسمیو
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
                      {rasmioVariables.map(variable => (
                        <div key={variable.name} className="space-y-1">
                          <Label className="text-sm text-green-700">{variable.label}</Label>
                          <div className="p-2 bg-white rounded border text-sm text-gray-600">
                            {formData[variable.name] || 'در انتظار انتخاب شرکت...'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* متغیرهای فرم (ورودی کاربر) */}
                {formVariables.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                      <VariableBadge source="form" size="md" />
                      اطلاعات ورودی
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {formVariables.map(variable => (
                        <div key={variable.name} className="space-y-2">
                          <Label htmlFor={variable.name} className="flex items-center gap-2">
                            {variable.label}
                            {variable.required && <span className="text-red-500 mr-1">*</span>}
                            <VariableBadge source="form" />
                          </Label>
                          {renderFormField(
                            {
                              ...variable,
                              placeholder: getPersianPlaceholder(variable.name) || variable.placeholder
                            }, 
                            formData[variable.name], 
                            (value) => handleInputChange(variable.name, value)
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* خلاصه متغیرها قبل از تولید */}
                {variableConfigs.length > 0 && selectedCompany && (
                  <div className="pt-4">
                    <VariableSummaryPanel 
                      variables={variableConfigs.map(v => ({
                        name: v.name,
                        label: v.label,
                        source: v.source,
                        value: formData[v.name],
                        required: v.required,
                        filled: v.source === 'form' ? !!formData[v.name] : true
                      }))}
                    />
                  </div>
                )}

                {/* دکمه تولید قرارداد */}
                <div className="pt-4">
                  <Button
                    onClick={generateContract}
                    disabled={loading || !selectedTemplate || !selectedCompany}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        در حال تولید قرارداد...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        تولید و دانلود قرارداد
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-medium mb-2">قالب قرارداد را انتخاب کنید</h3>
                  <p>برای شروع تولید قرارداد، ابتدا یک قالب انتخاب کنید</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Helper function for rendering form fields
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