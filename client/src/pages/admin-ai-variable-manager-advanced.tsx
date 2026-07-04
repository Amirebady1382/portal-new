import { apiRequest } from "@/lib/queryClient";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Wand2,
  Upload, 
  Download,
  FileText,
  Brain,
  Sparkles,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Settings,
  Code,
  Eye,
  Save,
  Copy,
  ChevronRight,
  Info,
  Zap,
  Globe,
  Database,
  Building2,
  User,
  Calendar,
  CreditCard,
  Scale,
  Calculator,
  Edit,
  Check,
  X,
  FileSearch,
  FormInput,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import MobileSidebar from '@/components/layout/mobile-sidebar';

interface DetectedVariable {
  id: string;
  original: string;
  suggestion: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean' | 'select';
  source: 'rasmio' | 'form' | 'manual' | 'calculated' | 'system' | 'missing';
  category: string;
  required: boolean;
  description: string;
  context: string;
  confidence: number;
  value?: any;
  availableInSystem: boolean;
  apiSource?: string;
  formField?: {
    label: string;
    placeholder?: string;
    options?: string[];
    validation?: string;
  };
  approved?: boolean;
}

interface AIAnalysisResult {
  documentType: string;
  documentTitle: string;
  detectedVariables: DetectedVariable[];
  suggestedCategories: string[];
  processingTime: number;
  modelUsed: string;
  confidence: number;
  rawContent?: string;
  processedContent?: string;
  processedText?: string; // متن با متغیرهای جایگذاری شده
  suggestedForms?: FormSuggestion[];
}

interface FormSuggestion {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  category: string;
}

interface FormField {
  variableName: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: string;
}

interface PreviewSection {
  original: string;
  replaced: string;
  variables: string[];
}

const VARIABLE_CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
  company: { label: 'اطلاعات شرکت', icon: Building2, color: 'blue' },
  financial: { label: 'اطلاعات مالی', icon: CreditCard, color: 'green' },
  dates: { label: 'تاریخ‌ها', icon: Calendar, color: 'purple' },
  personal: { label: 'اطلاعات فردی', icon: User, color: 'orange' },
  legal: { label: 'اطلاعات حقوقی', icon: Scale, color: 'red' },
  technical: { label: 'اطلاعات فنی', icon: Settings, color: 'gray' },
  other: { label: 'سایر', icon: FileText, color: 'gray' }
};

const AI_MODELS = [
  { value: 'claude-sonnet-4-20250514', label: '🚀 Claude Sonnet 4 (قوی‌ترین)', provider: 'anthropic' },
  { value: 'claude-3-7-sonnet-latest', label: '⚡ Claude 3.7 Sonnet (جدید)', provider: 'anthropic' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', provider: 'anthropic' }
];

export default function AdminAIVariableManagerAdvanced() {
  const { toast } = useToast();
  
  // State Management
  const [file, setFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState(''); // برای حالت متن
  const [inputMode, setInputMode] = useState<'file' | 'text' | 'excel'>('file'); // حالت ورودی
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4-20250514'); // جدیدترین مدل
  const [customPrompt, setCustomPrompt] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [selectedTab, setSelectedTab] = useState('upload');
  
  // Edit & Preview States
  const [editMode, setEditMode] = useState(false);
  const [editedVariables, setEditedVariables] = useState<DetectedVariable[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSections, setPreviewSections] = useState<PreviewSection[]>([]);
  
  // Approval States
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingVariables, setPendingVariables] = useState<DetectedVariable[]>([]);
  const [approvedVariables, setApprovedVariables] = useState<DetectedVariable[]>([]);
  
  // Form Generation States
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [generatedForms, setGeneratedForms] = useState<FormSuggestion[]>([]);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  
  // Template Save States
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateType, setTemplateType] = useState<'contract' | 'report'>('contract'); // نوع قالب
  
  // Advanced Settings
  const [autoDetectSource, setAutoDetectSource] = useState(true);
  const [checkExistingData, setCheckExistingData] = useState(true);
  const [generateFormForMissing, setGenerateFormForMissing] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  
  // Form Creation Settings
  const [selectedDepartment, setSelectedDepartment] = useState<string>('investment');
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [availableServices, setAvailableServices] = useState<any[]>([]);

  // Load available services on mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await apiRequest("GET", '/api/services');
        
        if (response.ok) {
          ;
          setAvailableServices(data.services || []);
        }
      } catch (error) {
        console.error('Failed to load services:', error);
      }
    };
    
    loadServices();
  }, []);

  // Enhanced System Context
  const systemContext = `
شما یک تحلیلگر حرفه‌ای قراردادها برای صندوق پژوهش و فناوری گیلان هستید.

وظایف شما:
1. شناسایی دقیق تمام بخش‌های قابل تغییر در سند
2. تعیین منبع داده برای هر متغیر:
   - رسمیو: اطلاعات شرکت (company_*)
   - فرم: اطلاعات ورودی کاربر
   - محاسباتی: مقادیر محاسبه شده (calc_*, *_words)
   - سیستم: مقادیر تولید شده توسط سیستم (system_*)
   - ناموجود: نیاز به تعریف فرم جدید

3. برای هر متغیر مشخص کنید:
   - آیا در سیستم موجود است؟
   - از کدام API قابل دریافت است؟
   - آیا نیاز به فرم ورودی دارد؟
   - نوع و فرمت صحیح داده

4. پیشنهاد فرم‌های مناسب برای داده‌های ناموجود

قوانین:
- فقط مواردی که واقعاً متغیر هستند را شناسایی کنید
- برای هر متغیر context کافی (حداقل 50 کاراکتر اطراف) ارائه دهید
- دقت بالا در تشخیص نوع داده
- اولویت با استفاده از داده‌های موجود در سیستم
  `;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      if (uploadedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          uploadedFile.type === 'application/msword') {
        setFile(uploadedFile);
        toast({
          title: "فایل آپلود شد",
          description: `${uploadedFile.name} آماده تحلیل است`
        });
      } else {
        toast({
          title: "خطا",
          description: "لطفاً فایل Word (.docx یا .doc) انتخاب کنید",
          variant: "destructive"
        });
      }
    }
  };

  const analyzeWithAI = async () => {
    // بررسی ورودی بر اساس حالت
    if (inputMode === 'file' && !file) {
      toast({
        title: "خطا",
        description: "لطفاً ابتدا فایل را آپلود کنید",
        variant: "destructive"
      });
      return;
    }

    if (inputMode === 'text' && !inputText.trim()) {
      toast({
        title: "خطا",
        description: "لطفاً متن مورد نظر را وارد کنید",
        variant: "destructive"
      });
      return;
    }

    if (inputMode === 'excel' && !file) {
      toast({
        title: "خطا",
        description: "لطفاً فایل Excel را آپلود کنید",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setProgress(0);
    setProgressMessage('در حال تحلیل...');

    try {
      setProgress(20);
      
      let response;

      if (inputMode === 'text') {
        // تحلیل متن
        setProgressMessage('در حال تحلیل متن با AI...');
        const result: any = await apiRequest("POST", '/api/ai/analyze-text-for-variables', { 
          text: inputText, 
          model: selectedModel 
        });
        
        setAnalysisResult(result);
        setEditedVariables(result.detectedVariables);
        setPendingVariables(result.detectedVariables);
        setSelectedTab('results');
        setLoading(false);
        return;
      } else if (inputMode === 'excel') {
        // تحلیل Excel
        setProgressMessage('در حال تحلیل فایل Excel...');
        const formData = new FormData();
        formData.append('file', file!);
        formData.append('model', selectedModel);

        response = await apiRequest("POST", '/api/ai/analyze-excel-for-variables', formData);
      } else {
        // تحلیل فایل Word
        setProgressMessage('در حال استخراج محتوای فایل...');
        const formData = new FormData();
        formData.append('file', file!);
        formData.append('model', selectedModel);
        formData.append('customPrompt', customPrompt);
        formData.append('systemContext', systemContext);
        formData.append('checkExisting', checkExistingData.toString());
        formData.append('detectSource', autoDetectSource.toString());

        response = await apiRequest("POST", '/api/ai/analyze-contract-template-advanced', formData);
      }

      setProgress(40);
      setProgressMessage('در حال تحلیل با هوش مصنوعی...');

      if (!response.ok) {
        throw new Error('خطا در تحلیل فایل');
      }

      const result: AIAnalysisResult = undefined /* auto-fixed json */;
      
      setProgress(60);
      setProgressMessage('در حال بررسی داده‌های موجود...');
      
      // Step 2: Check existing data availability
      if (checkExistingData) {
        await checkDataAvailability(result);
      }
      
      setProgress(80);
      setProgressMessage('در حال تولید فرم‌های پیشنهادی...');
      
      // Step 3: Generate forms for missing data
      if (generateFormForMissing) {
        const forms = await generateFormsForMissingData(result);
        setGeneratedForms(forms);
      }
      
      setProgress(100);
      setProgressMessage('تحلیل کامل شد!');
      
      setTimeout(() => {
        setAnalysisResult(result);
        setEditedVariables(result.detectedVariables);
        setPendingVariables(result.detectedVariables);
        
        if (requireApproval) {
          setShowApprovalDialog(true);
        } else {
          setApprovedVariables(result.detectedVariables);
          setSelectedTab('results');
        }
        
        setLoading(false);
        setProgress(0);
        
        toast({
          title: "تحلیل موفق",
          description: `${result.detectedVariables.length} متغیر شناسایی شد`
        });
      }, 500);

    } catch (error) {
      console.error('AI Analysis error:', error);
      setLoading(false);
      setProgress(0);
      toast({
        title: "خطا در تحلیل",
        description: error instanceof Error ? error.message : "خطا در تحلیل فایل با AI",
        variant: "destructive"
      });
    }
  };

  const checkDataAvailability = async (result: AIAnalysisResult) => {
    // Check which variables can be filled from existing data
    for (const variable of result.detectedVariables) {
      if (variable.source === 'rasmio') {
        // Check if Rasmio data is available
        variable.availableInSystem = true;
        variable.apiSource = 'Rasmio API';
      } else if (variable.source === 'system') {
        // System generated values
        variable.availableInSystem = true;
        variable.apiSource = 'System';
      } else if (variable.source === 'calculated') {
        // Calculated values
        variable.availableInSystem = true;
        variable.apiSource = 'Calculated';
      } else {
        // Need form input
        variable.availableInSystem = false;
        variable.source = 'missing';
      }
    }
  };

  const generateFormsForMissingData = async (result: AIAnalysisResult): Promise<FormSuggestion[]> => {
    const forms: FormSuggestion[] = [];
    const missingVariables = result.detectedVariables.filter(v => !v.availableInSystem);
    
    if (missingVariables.length > 0) {
      // Group by category
      const grouped = missingVariables.reduce((acc, variable) => {
        const cat = variable.category || 'general';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(variable);
        return acc;
      }, {} as Record<string, DetectedVariable[]>);
      
      // Create forms for each category
      for (const [category, variables] of Object.entries(grouped)) {
        forms.push({
          id: `form_${category}`,
          title: `فرم ${VARIABLE_CATEGORIES[category]?.label || category}`,
          description: `اطلاعات مورد نیاز برای ${variables.length} متغیر`,
          category,
          fields: variables.map(v => ({
            variableName: v.name,
            label: v.label,
            type: v.type,
            required: v.required,
            placeholder: v.formField?.placeholder,
            options: v.formField?.options,
            validation: v.formField?.validation
          }))
        });
      }
    }
    
    return forms;
  };

  const handleVariableApproval = (variable: DetectedVariable, approved: boolean) => {
    const updated = pendingVariables.map(v => 
      v.id === variable.id ? { ...v, approved } : v
    );
    setPendingVariables(updated);
  };

  const confirmApprovals = () => {
    const approved = pendingVariables.filter(v => v.approved !== false);
    setApprovedVariables(approved);
    setEditedVariables(approved);
    setShowApprovalDialog(false);
    setSelectedTab('results');
    
    toast({
      title: "تأیید شد",
      description: `${approved.length} متغیر تأیید و آماده اعمال است`
    });
  };

  const generatePreview = async () => {
    if (!analysisResult || !file) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('variables', JSON.stringify(approvedVariables));
      
      const response = await apiRequest("POST", '/api/ai/preview-variables', formData);
      
      if (response.ok) {
        ;
        setPreviewSections(preview.sections);
        setShowPreview(true);
      }
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در تولید پیش‌نمایش",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyVariables = async () => {
    if (!analysisResult || !file) return;

    setLoading(true);
    try {
      // Include form values with variables
      const variablesWithValues = approvedVariables.map(v => ({
        ...v,
        value: formValues[v.name] || v.value
      }));
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('variables', JSON.stringify(variablesWithValues));
      formData.append('formValues', JSON.stringify(formValues));

      const response = await apiRequest("POST", '/api/ai/apply-variables-final', formData);

      if (!response.ok) {
        throw new Error('خطا در اعمال متغیرها');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `variabled_${file.name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "موفق",
        description: "فایل متغیربندی شده دانلود شد"
      });
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در اعمال متغیرها",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveAsTemplate = async () => {
    if (!analysisResult || !file || !approvedVariables.length) {
      toast({
        title: "خطا",
        description: "برای ذخیره قالب، فایل و متغیرهای تأیید شده ضروری است",
        variant: "destructive"
      });
      return;
    }

    if (!templateName.trim()) {
      toast({
        title: "خطا", 
        description: "نام قالب را وارد کنید",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log('💾 Saving template with variables...');
      
      // اعمال متغیرها به فایل
      const variablesWithValues = approvedVariables.map(v => ({
        ...v,
        value: formValues[v.name] || v.value
      }));
      
      const applyFormData = new FormData();
      applyFormData.append('file', file);
      applyFormData.append('variables', JSON.stringify(variablesWithValues));
      applyFormData.append('formValues', JSON.stringify(formValues));

      // دریافت فایل متغیربندی شده
      const applyResponse = await apiRequest("POST", '/api/ai/apply-variables-final', applyFormData);

      if (!applyResponse.ok) {
        throw new Error('خطا در اعمال متغیرها');
      }

      const processedBlob = await applyResponse.blob();
      
      // ذخیره فایل پردازش شده به عنوان قالب جدید
      const saveTemplateFormData = new FormData();
      saveTemplateFormData.append('file', processedBlob, `${templateName.trim()}.docx`);
      saveTemplateFormData.append('name', templateName.trim());
      saveTemplateFormData.append('description', templateDescription.trim() || `قالب تولید شده از ${file.name}`);
      saveTemplateFormData.append('category', templateCategory || 'تولید خودکار');
      
      // تبدیل متغیرها به فرمت JSON
      const variablesList = approvedVariables.map(v => v.name);
      saveTemplateFormData.append('variables', JSON.stringify(variablesList));

      const saveResponse = await apiRequest("POST", '/api/contract/templates', saveTemplateFormData);

      if (saveResponse.ok) {
        ;
        console.log('✅ Template saved successfully:', result);
        
        toast({
          title: "موفق",
          description: `قالب "${templateName}" با ${approvedVariables.length} متغیر ذخیره شد`
        });

        // Reset form
        setShowSaveTemplateDialog(false);
        setTemplateName('');
        setTemplateDescription('');
        setTemplateCategory('');
        setTemplateType('contract');
        
      } else {
        ;
        throw new Error(errorData.message || 'خطا در ذخیره قالب');
      }

    } catch (error) {
      console.error('❌ Error saving template:', error);
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در ذخیره قالب",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔄 سینک کردن متغیرها به جدول contract_variables
   */
  const syncVariablesToSystem = async () => {
    if (!approvedVariables.length) {
      toast({
        title: "خطا",
        description: "هیچ متغیری برای سینک وجود ندارد",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const result: any = await apiRequest("POST", '/api/ai/sync-variables-to-system', {
        variables: approvedVariables
      });

      toast({
        title: "✅ سینک موفق",
        description: `${result.results.created.length} متغیر جدید ایجاد و ${result.results.updated.length} متغیر به‌روزرسانی شد`
      });

      console.log('✅ Sync result:', result);
      
    } catch (error) {
      console.error('❌ Sync error:', error);
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در سینک متغیرها",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 📋 ایجاد یک فرم پیشنهادی در سیستم
   */
  const createSuggestedForm = async (form: FormSuggestion, department: string, serviceIds: number[] = []) => {
    setLoading(true);
    try {
      const result: any = await apiRequest("POST", '/api/ai/create-form-from-variables', {
        title: form.title,
        description: form.description,
        fields: form.fields,
        department: department,
        serviceIds: serviceIds,
        category: form.category
      });

      toast({
        title: "✅ فرم ایجاد شد",
        description: result.message
      });

      console.log('✅ Form created:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Create form error:', error);
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در ایجاد فرم",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🚀 تکمیل خودکار فرآیند: سینک متغیرها + ایجاد فرم‌ها
   */
  const autoCompleteWorkflow = async () => {
    if (!approvedVariables.length) {
      toast({
        title: "خطا",
        description: "ابتدا متغیرها را تأیید کنید",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setProgress(0);
    setProgressMessage('در حال تکمیل خودکار فرآیند...');

    try {
      // مرحله 1: سینک متغیرها
      setProgress(25);
      setProgressMessage('سینک متغیرها به سامانه...');
      await syncVariablesToSystem();
      
      // مرحله 2: ایجاد فرم‌ها (اگر وجود دارند)
      if (generatedForms.length > 0) {
        setProgress(50);
        setProgressMessage(`ایجاد ${generatedForms.length} فرم پیشنهادی...`);
        
        let createdCount = 0;
        for (const form of generatedForms) {
          try {
            await createSuggestedForm(form, 'investment', []); // واحد پیش‌فرض
            createdCount++;
            setProgress(50 + (createdCount / generatedForms.length) * 50);
          } catch (error) {
            console.error(`Failed to create form: ${form.title}`, error);
          }
        }
        
        setProgress(100);
        setProgressMessage('تمام مراحل با موفقیت انجام شد!');
        
        toast({
          title: "✅ فرآیند تکمیل شد",
          description: `${approvedVariables.length} متغیر و ${createdCount} فرم با موفقیت ایجاد شدند`
        });
      } else {
        setProgress(100);
        setProgressMessage('فرآیند تکمیل شد!');
        
        toast({
          title: "✅ سینک تکمیل شد",
          description: `${approvedVariables.length} متغیر با موفقیت سینک شدند`
        });
      }

      // پاکسازی پس از 2 ثانیه
      setTimeout(() => {
        setProgress(0);
        setProgressMessage('');
      }, 2000);

    } catch (error) {
      console.error('❌ Auto complete workflow error:', error);
      setProgress(0);
      setProgressMessage('');
    } finally {
      setLoading(false);
    }
  };

  const renderVariableCard = (variable: DetectedVariable, isEditable: boolean = false) => (
    <div
      key={variable.id}
      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-sm font-mono bg-blue-50 px-2 py-1 rounded">
              {`{{${variable.name}}}`}
            </code>
            <Badge 
              variant="secondary"
              className={`text-xs ${getSourceColor(variable.source)}`}
            >
              {getSourceLabel(variable.source)}
            </Badge>
            {variable.availableInSystem ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            )}
            <Badge variant="outline" className="text-xs">
              {variable.type}
            </Badge>
            {variable.required && (
              <Badge variant="destructive" className="text-xs">
                اجباری
              </Badge>
            )}
          </div>
          
          {isEditable ? (
            <div className="space-y-2 mt-2">
              <Input
                value={variable.label}
                onChange={(e) => {
                  const updated = [...editedVariables];
                  const index = updated.findIndex(v => v.id === variable.id);
                  if (index !== -1) {
                    updated[index].label = e.target.value;
                    setEditedVariables(updated);
                  }
                }}
                placeholder="برچسب متغیر"
              />
              <Input
                value={variable.name}
                onChange={(e) => {
                  const updated = [...editedVariables];
                  const index = updated.findIndex(v => v.id === variable.id);
                  if (index !== -1) {
                    updated[index].name = e.target.value;
                    setEditedVariables(updated);
                  }
                }}
                placeholder="نام متغیر"
              />
            </div>
          ) : (
            <>
              <p className="text-sm font-medium">{variable.label}</p>
              <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
            </>
          )}
          
          {variable.apiSource && (
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
              <Database className="h-3 w-3" />
              <span>منبع: {variable.apiSource}</span>
            </div>
          )}
          
          {variable.context && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <span className="font-medium">متن اصلی: </span>
              <span className="text-gray-700">...{variable.context}...</span>
            </div>
          )}
          
          {!variable.availableInSystem && variable.formField && (
            <Alert className="mt-2">
              <FormInput className="h-4 w-4" />
              <AlertDescription className="text-xs">
                نیاز به ورودی در فرم: {variable.formField.label}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-gray-500">اطمینان</p>
            <p className="text-sm font-medium">
              {Math.round(variable.confidence * 100)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          <div className="container mx-auto max-w-7xl">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                  <Wand2 className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-800">
                  متغیربندی هوشمند پیشرفته
                </h1>
              </div>
              <p className="text-gray-600">
                تحلیل حرفه‌ای فایل‌های Word با شناسایی منابع داده و تولید فرم خودکار
              </p>
            </div>

            {/* Advanced Settings Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  تنظیمات پیشرفته
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="auto-detect" className="text-sm">
                      تشخیص خودکار منبع داده
                    </Label>
                    <Switch
                      id="auto-detect"
                      checked={autoDetectSource}
                      onCheckedChange={setAutoDetectSource}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="check-existing" className="text-sm">
                      بررسی داده‌های موجود
                    </Label>
                    <Switch
                      id="check-existing"
                      checked={checkExistingData}
                      onCheckedChange={setCheckExistingData}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="generate-form" className="text-sm">
                      تولید فرم برای داده‌های ناموجود
                    </Label>
                    <Switch
                      id="generate-form"
                      checked={generateFormForMissing}
                      onCheckedChange={setGenerateFormForMissing}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="require-approval" className="text-sm">
                      نیاز به تأیید قبل از اعمال
                    </Label>
                    <Switch
                      id="require-approval"
                      checked={requireApproval}
                      onCheckedChange={setRequireApproval}
                    />
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ai-model">مدل هوش مصنوعی</Label>
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger id="ai-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_MODELS.map(model => (
                          <SelectItem key={model.value} value={model.value}>
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-purple-500" />
                              {model.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="custom-prompt">دستورالعمل سفارشی (اختیاری)</Label>
                    <Textarea
                      id="custom-prompt"
                      placeholder="دستورالعمل خاصی برای AI دارید؟"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="h-20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="upload">
                  <Upload className="h-4 w-4 ml-2" />
                  آپلود فایل
                </TabsTrigger>
                <TabsTrigger value="results">
                  <Brain className="h-4 w-4 ml-2" />
                  نتایج تحلیل
                </TabsTrigger>
                <TabsTrigger value="forms">
                  <FormInput className="h-4 w-4 ml-2" />
                  فرم‌های پیشنهادی
                </TabsTrigger>
                <TabsTrigger value="output">
                  <FileText className="h-4 w-4 ml-2" />
                  خروجی نهایی
                </TabsTrigger>
              </TabsList>

              {/* Upload Tab */}
              <TabsContent value="upload">
                {/* انتخاب نوع ورودی */}
                <Tabs value={inputMode} onValueChange={(v: any) => setInputMode(v)} className="mb-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="file">
                      <FileText className="h-4 w-4 ml-2" />
                      فایل Word
                    </TabsTrigger>
                    <TabsTrigger value="text">
                      <FormInput className="h-4 w-4 ml-2" />
                      متن
                    </TabsTrigger>
                    <TabsTrigger value="excel">
                      <Database className="h-4 w-4 ml-2" />
                      Excel
                    </TabsTrigger>
                  </TabsList>

                  {/* تب فایل Word */}
                  <TabsContent value="file">
                    <Card>
                      <CardHeader>
                        <CardTitle>آپلود فایل Word</CardTitle>
                        <CardDescription>
                          فایل قرارداد یا قالب خود را آپلود کنید
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          
                          <Input
                            type="file"
                            accept=".doc,.docx"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="file-upload"
                          />
                          
                          <Label
                            htmlFor="file-upload"
                            className="cursor-pointer inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                          >
                            <Upload className="h-4 w-4 ml-2" />
                            انتخاب فایل Word
                          </Label>
                          
                          {file && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                              <p className="font-medium">{file.name}</p>
                              <p className="text-sm text-gray-500">
                                {(file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* تب متن */}
                  <TabsContent value="text">
                    <Card>
                      <CardHeader>
                        <CardTitle>ورود متن</CardTitle>
                        <CardDescription>
                          متن قرارداد یا قالب را مستقیماً وارد کنید
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          placeholder="متن قرارداد خود را اینجا وارد کنید...&#10;&#10;مثال: قرارداد سرمایه‌گذاری بین {{company_name}} به شناسه ملی {{national_id}} و صندوق..."
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          className="min-h-[400px] font-mono text-sm"
                          dir="auto"
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          💡 می‌توانید متغیرها را با {`{{نام}}`} مشخص کنید یا متن آزاد بنویسید
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* تب Excel */}
                  <TabsContent value="excel">
                    <Card>
                      <CardHeader>
                        <CardTitle>آپلود فایل Excel یا CSV</CardTitle>
                        <CardDescription>
                          فایل جدول خود را آپلود کنید
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                          <Database className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          
                          <Input
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="excel-upload"
                          />
                          
                          <Label
                            htmlFor="excel-upload"
                            className="cursor-pointer inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                          >
                            <Upload className="h-4 w-4 ml-2" />
                            انتخاب فایل
                          </Label>
                          
                          {file && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                              <p className="font-medium">{file.name}</p>
                              <p className="text-sm text-gray-500">
                                {(file.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* دکمه تحلیل */}
                {((inputMode === 'file' && file) || (inputMode === 'text' && inputText.trim())) && (
                  <Card className="mt-4">
                    <CardContent className="pt-6">
                      <Button
                        onClick={analyzeWithAI}
                        disabled={loading}
                        className="w-full"
                        size="lg"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="h-5 w-5 ml-2 animate-spin" />
                            در حال تحلیل...
                          </>
                        ) : (
                          <>
                            <Wand2 className="h-5 w-5 ml-2" />
                            تحلیل با هوش مصنوعی
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                    {loading && (
                  <Card className="mt-4">
                    <CardContent className="pt-6">
                      <Progress value={progress} className="mb-2" />
                      <p className="text-sm text-center text-gray-600">{progressMessage}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Results Tab */}
              <TabsContent value="results">
                {analysisResult ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>خلاصه تحلیل</span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={generatePreview}
                            >
                              <Eye className="h-4 w-4 ml-2" />
                              پیش‌نمایش
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditMode(!editMode)}
                            >
                              {editMode ? 'ذخیره' : 'ویرایش'}
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label>نوع سند</Label>
                            <p className="font-medium">{analysisResult.documentType}</p>
                          </div>
                          <div>
                            <Label>تعداد متغیرها</Label>
                            <p className="font-medium">{analysisResult.detectedVariables.length}</p>
                          </div>
                          <div>
                            <Label>متغیرهای موجود</Label>
                            <p className="font-medium text-green-600">
                              {analysisResult.detectedVariables.filter(v => v.availableInSystem).length}
                            </p>
                          </div>
                          <div>
                            <Label>نیاز به فرم</Label>
                            <p className="font-medium text-orange-600">
                              {analysisResult.detectedVariables.filter(v => !v.availableInSystem).length}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* 📋 Processed Text Card */}
                    {analysisResult.processedText && inputMode === 'text' && (
                      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-transparent">
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <FileText className="h-5 w-5 text-green-600" />
                              متن پردازش شده
                            </span>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(analysisResult.processedText!);
                                  toast({
                                    title: "کپی شد",
                                    description: "متن پردازش شده کپی شد"
                                  });
                                }}
                              >
                                <Copy className="h-4 w-4 ml-2" />
                                کپی متن
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const response: any = await apiRequest("POST", '/api/ai/generate-word-from-text', {
                                      text: analysisResult.processedText
                                    });

                                    const blob = response as unknown as Blob;
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `processed_text_${Date.now()}.docx`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    window.URL.revokeObjectURL(url);

                                    toast({
                                      title: "دانلود موفق",
                                      description: "فایل Word دانلود شد"
                                    });
                                  } catch (error) {
                                    toast({
                                      title: "خطا",
                                      description: "خطا در دانلود فایل Word",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <Download className="h-4 w-4 ml-2" />
                                دانلود Word
                              </Button>
                            </div>
                          </CardTitle>
                          <CardDescription>
                            متن شما با متغیرهای جایگذاری شده - آماده برای کپی یا دانلود
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={analysisResult.processedText}
                            readOnly
                            className="min-h-[300px] font-mono text-sm bg-white"
                            dir="auto"
                          />
                          <div className="mt-3 flex items-center gap-2">
                            <Badge variant="secondary">
                              {analysisResult.detectedVariables.length} متغیر جایگذاری شد
                            </Badge>
                            <Badge variant="outline">
                              {analysisResult.processedText.length} کاراکتر
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* 🔄 Sync Variables Action Card */}
                    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-primary" />
                          سینک متغیرها به سامانه
                        </CardTitle>
                        <CardDescription>
                          متغیرهای شناسایی شده را در جدول contract_variables ذخیره کنید تا در تمام قالب‌ها قابل استفاده باشند
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              {approvedVariables.length} متغیر آماده سینک
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {approvedVariables.filter(v => !v.availableInSystem).length} متغیر جدید، 
                              {' '}{approvedVariables.filter(v => v.availableInSystem).length} متغیر موجود
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={syncVariablesToSystem}
                              disabled={loading || !approvedVariables.length}
                              size="lg"
                            >
                              <Database className="h-4 w-4 ml-2" />
                              سینک به سامانه
                            </Button>
                            <Button
                              onClick={autoCompleteWorkflow}
                              disabled={loading || !approvedVariables.length}
                              variant="default"
                              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                              size="lg"
                            >
                              <Sparkles className="h-4 w-4 ml-2" />
                              تکمیل خودکار
                            </Button>
                          </div>
                        </div>
                        
                        {loading && progressMessage && (
                          <div className="mt-4 space-y-2">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-center text-muted-foreground">{progressMessage}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Variables by Category */}
                    <Card>
                      <CardHeader>
                        <CardTitle>متغیرهای شناسایی شده</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[500px]">
                          <div className="space-y-4">
                            {Object.entries(
                              approvedVariables.reduce((acc, variable) => {
                                const cat = variable.category || 'general';
                                if (!acc[cat]) acc[cat] = [];
                                acc[cat].push(variable);
                                return acc;
                              }, {} as Record<string, DetectedVariable[]>)
                            ).map(([category, variables]) => (
                              <div key={category}>
                                <div className="flex items-center gap-2 mb-3">
                                  {VARIABLE_CATEGORIES[category] && (
                                    <>
                                      {React.createElement(VARIABLE_CATEGORIES[category].icon, {
                                        className: "h-5 w-5"
                                      })}
                                      <h3 className="font-semibold">
                                        {VARIABLE_CATEGORIES[category].label}
                                      </h3>
                                    </>
                                  )}
                                  <Badge variant="secondary">{variables.length}</Badge>
                                </div>
                                <div className="space-y-3">
                                  {variables.map(variable => renderVariableCard(variable, editMode))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Brain className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">
                        ابتدا فایل را آپلود و تحلیل کنید
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Forms Tab */}
              <TabsContent value="forms">
                {generatedForms.length > 0 ? (
                  <div className="space-y-6">
                    {/* Settings for Form Creation */}
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5 text-blue-600" />
                          تنظیمات ایجاد فرم
                        </CardTitle>
                        <CardDescription>
                          واحد و خدمات مورد نظر برای فرم‌ها را انتخاب کنید
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>واحد سازمانی</Label>
                            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="investment">واحد سرمایه‌گذاری</SelectItem>
                                <SelectItem value="administrative">واحد اداری</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>خدمات مرتبط (اختیاری)</Label>
                            <Select
                              value={selectedServices.length > 0 ? selectedServices[0].toString() : ''}
                              onValueChange={(value) => setSelectedServices([parseInt(value)])}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="انتخاب خدمت (اختیاری)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">بدون اتصال به خدمت</SelectItem>
                                {availableServices
                                  .filter(s => s.department === selectedDepartment)
                                  .map(service => (
                                    <SelectItem key={service.id} value={service.id.toString()}>
                                      {service.title}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Generated Forms */}
                    {generatedForms.map((form, index) => (
                      <Card key={form.id} className="border-l-4 border-l-orange-500">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="flex items-center gap-2">
                                <FormInput className="h-5 w-5 text-orange-500" />
                                {form.title}
                              </CardTitle>
                              <CardDescription className="mt-1">{form.description}</CardDescription>
                            </div>
                            <Button
                              onClick={() => createSuggestedForm(form, selectedDepartment, selectedServices.filter(id => id > 0))}
                              disabled={loading}
                              size="lg"
                              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                            >
                              <CheckCircle className="h-4 w-4 ml-2" />
                              ایجاد این فرم
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {form.fields.map(field => (
                                <div key={field.variableName} className="p-3 bg-gray-50 rounded-lg border">
                                  <div className="flex items-start justify-between mb-1">
                                    <p className="text-sm font-medium">{field.label}</p>
                                    {field.required && (
                                      <Badge variant="destructive" className="text-xs h-5">الزامی</Badge>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs text-gray-500">متغیر: <code className="bg-white px-1 rounded">{field.variableName}</code></p>
                                    <p className="text-xs text-gray-500">نوع: {field.type}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <Alert>
                              <Info className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                این فرم شامل {form.fields.length} فیلد است و به متغیرهای مربوطه متصل خواهد شد.
                                {selectedServices.filter(id => id > 0).length > 0 && (
                                  <span className="font-medium"> و به {selectedServices.filter(id => id > 0).length} خدمت متصل می‌شود.</span>
                                )}
                              </AlertDescription>
                            </Alert>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {/* Bulk Actions */}
                    <Card className="border-2 border-dashed border-gray-300">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">ایجاد دسته‌جمعی</p>
                            <p className="text-sm text-muted-foreground">
                              تمام {generatedForms.length} فرم را به صورت یکجا ایجاد کنید
                            </p>
                          </div>
                          <Button
                            onClick={async () => {
                              setLoading(true);
                              let successCount = 0;
                              for (const form of generatedForms) {
                                try {
                                  await createSuggestedForm(form, selectedDepartment, selectedServices.filter(id => id > 0));
                                  successCount++;
                                } catch (error) {
                                  console.error('Error creating form:', error);
                                }
                              }
                              setLoading(false);
                              toast({
                                title: "✅ تکمیل شد",
                                description: `${successCount} از ${generatedForms.length} فرم با موفقیت ایجاد شدند`
                              });
                            }}
                            disabled={loading}
                            size="lg"
                            variant="outline"
                          >
                            <Sparkles className="h-4 w-4 ml-2" />
                            ایجاد همه فرم‌ها
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FormInput className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">
                        {analysisResult 
                          ? "همه متغیرها از منابع موجود قابل تکمیل هستند"
                          : "ابتدا فایل را تحلیل کنید"
                        }
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Output Tab */}
              <TabsContent value="output">
                {analysisResult && approvedVariables.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>فایل متغیربندی شده</span>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => setShowSaveTemplateDialog(true)} 
                            disabled={loading || !approvedVariables.length}
                            variant="outline"
                          >
                            <Save className="h-4 w-4 ml-2" />
                            ذخیره به عنوان قالب
                          </Button>
                          <Button onClick={applyVariables} disabled={loading}>
                            <Download className="h-4 w-4 ml-2" />
                            دانلود فایل نهایی
                          </Button>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <Database className="h-8 w-8 text-green-500" />
                              <div>
                                <p className="text-2xl font-bold">
                                  {approvedVariables.filter(v => v.source === 'rasmio').length}
                                </p>
                                <p className="text-sm text-gray-500">از رسمیو</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <FormInput className="h-8 w-8 text-orange-500" />
                              <div>
                                <p className="text-2xl font-bold">
                                  {approvedVariables.filter(v => !v.availableInSystem).length}
                                </p>
                                <p className="text-sm text-gray-500">نیاز به فرم</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                              <Calculator className="h-8 w-8 text-purple-500" />
                              <div>
                                <p className="text-2xl font-bold">
                                  {approvedVariables.filter(v => v.source === 'calculated').length}
                                </p>
                                <p className="text-sm text-gray-500">محاسباتی</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>آماده برای دانلود</AlertTitle>
                        <AlertDescription>
                          تمام متغیرها بررسی و تأیید شده‌اند. فایل نهایی آماده دانلود است.
                        </AlertDescription>
                      </Alert>

                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium mb-3">خلاصه اطلاعات:</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>تعداد کل متغیرها:</span>
                            <span className="font-medium">{approvedVariables.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>متغیرهای تأیید شده:</span>
                            <span className="font-medium text-green-600">{approvedVariables.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>فرم‌های تکمیل شده:</span>
                            <span className="font-medium">
                              {Object.keys(formValues).length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">
                        ابتدا فایل را تحلیل و متغیرها را تأیید کنید
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* Approval Dialog */}
            <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>تأیید متغیرهای شناسایی شده</DialogTitle>
                  <DialogDescription>
                    لطفاً متغیرهای شناسایی شده را بررسی و تأیید یا رد کنید
                  </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {pendingVariables.map(variable => (
                      <div key={variable.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <code className="text-sm font-mono bg-blue-50 px-2 py-1 rounded">
                                {`{{${variable.name}}}`}
                              </code>
                              <Badge variant="secondary" className="text-xs">
                                {getSourceLabel(variable.source)}
                              </Badge>
                              {variable.availableInSystem ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                              )}
                            </div>
                            <p className="text-sm font-medium">{variable.label}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {variable.context}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={variable.approved === true ? "default" : "outline"}
                              onClick={() => handleVariableApproval(variable, true)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant={variable.approved === false ? "destructive" : "outline"}
                              onClick={() => handleVariableApproval(variable, false)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                    انصراف
                  </Button>
                  <Button onClick={confirmApprovals}>
                    تأیید و ادامه ({pendingVariables.filter(v => v.approved !== false).length} متغیر)
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>پیش‌نمایش متغیرها</DialogTitle>
                </DialogHeader>
                
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {previewSections.map((section, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">متن اصلی</Label>
                            <div className="mt-1 p-3 bg-gray-50 rounded text-sm">
                              {section.original}
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">با متغیرها</Label>
                            <div className="mt-1 p-3 bg-blue-50 rounded text-sm">
                              {section.replaced}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {section.variables.map(v => (
                            <Badge key={v} variant="secondary" className="text-xs">
                              {v}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                
                <DialogFooter>
                  <Button onClick={() => setShowPreview(false)}>بستن</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Save as Template Dialog */}
            <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Save className="h-5 w-5" />
                    ذخیره به عنوان قالب
                  </DialogTitle>
                  <DialogDescription>
                    ذخیره فایل متغیربندی شده به عنوان قالب قرارداد یا گزارش
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="templateType">
                      نوع قالب <span className="text-red-500">*</span>
                    </Label>
                    <Select value={templateType} onValueChange={(value: 'contract' | 'report') => setTemplateType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب نوع قالب" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contract">
                          <span className="flex items-center gap-2">
                            📄 قالب قرارداد
                          </span>
                        </SelectItem>
                        <SelectItem value="report">
                          <span className="flex items-center gap-2">
                            📊 قالب گزارش ارزیابی
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {templateType === 'contract' 
                        ? '💼 برای قراردادهای ضمانت، سرمایه‌گذاری و...' 
                        : '📈 برای گزارش‌های ارزیابی، پیشرفت و...'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="templateName">
                      نام قالب <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="templateName"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder={templateType === 'contract' ? 'مثال: قالب قرارداد ضمانت' : 'مثال: قالب گزارش ارزیابی'}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="templateDescription">توضیحات</Label>
                    <Textarea
                      id="templateDescription"
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder="توضیح مختصری درباره این قالب..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="templateCategory">دسته‌بندی</Label>
                    <Select value={templateCategory} onValueChange={setTemplateCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب دسته‌بندی..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="سرمایه‌گذاری">سرمایه‌گذاری</SelectItem>
                        <SelectItem value="تأمین مالی">تأمین مالی</SelectItem>
                        <SelectItem value="خدمات">خدمات</SelectItem>
                        <SelectItem value="مشاوره">مشاوره</SelectItem>
                        <SelectItem value="ضمانت‌نامه">ضمانت‌نامه</SelectItem>
                        <SelectItem value="تولید خودکار">تولید خودکار</SelectItem>
                        <SelectItem value="سایر">سایر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>اطلاعات قالب</AlertTitle>
                    <AlertDescription>
                      این قالب با <strong>{approvedVariables.length} متغیر</strong> ذخیره خواهد شد.
                      <br />
                      منابع داده: 
                      <Badge className="mr-1 bg-green-100 text-green-800" variant="secondary">
                        {approvedVariables.filter(v => v.source === 'rasmio').length} رسمیو
                      </Badge>
                      <Badge className="mr-1 bg-blue-100 text-blue-800" variant="secondary">
                        {approvedVariables.filter(v => v.source === 'form').length} فرم
                      </Badge>
                      <Badge className="mr-1 bg-purple-100 text-purple-800" variant="secondary">
                        {approvedVariables.filter(v => v.source === 'calculated').length} محاسباتی
                      </Badge>
                    </AlertDescription>
                  </Alert>
                </div>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowSaveTemplateDialog(false);
                      setTemplateName('');
                      setTemplateDescription('');
                      setTemplateCategory('');
                    }}
                  >
                    انصراف
                  </Button>
                  <Button 
                    onClick={saveAsTemplate} 
                    disabled={!templateName.trim() || loading}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                        در حال ذخیره...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 ml-2" />
                        ذخیره قالب
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}

// Helper functions
const getSourceLabel = (source: string): string => {
  const labels: Record<string, string> = {
    rasmio: 'رسمیو',
    form: 'فرم',
    calculated: 'محاسباتی',
    system: 'سیستم',
    missing: 'ناموجود'
  };
  return labels[source] || source;
};

const getSourceColor = (source: string): string => {
  const colors: Record<string, string> = {
    rasmio: 'bg-green-100 text-green-800',
    form: 'bg-blue-100 text-blue-800',
    calculated: 'bg-purple-100 text-purple-800',
    system: 'bg-gray-100 text-gray-800',
    missing: 'bg-orange-100 text-orange-800'
  };
  return colors[source] || '';
};

