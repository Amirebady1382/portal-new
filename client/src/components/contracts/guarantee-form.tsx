import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  Save,
  RefreshCw,
  Building2,
  User,
  Calendar,
  CreditCard,
  FileText,
  Calculator
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface GuaranteeFormProps {
  companyId: number;
  templateId: number;
  onSubmit: (formData: any) => void;
  initialData?: any;
}

interface FormSection {
  title: string;
  icon: React.ReactNode;
  fields: FormField[];
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'email' | 'phone';
  source: 'rasmio' | 'form' | 'calculated';
  required: boolean;
  placeholder?: string;
  validation?: string;
  calculation?: string;
  disabled?: boolean;
}

// تعریف بخش‌ها و فیلدهای فرم بر اساس JSON ارسالی
const formSections: FormSection[] = [
  {
    title: 'اطلاعات درخواست',
    icon: <FileText className="h-5 w-5" />,
    fields: [
      { name: 'request_letter_number', label: 'شماره نامه درخواست', type: 'text', source: 'form', required: true, placeholder: 'شماره نامه درخواست شرکت' },
      { name: 'request_letter_date', label: 'تاریخ نامه درخواست', type: 'date', source: 'form', required: true, placeholder: '13xx/xx/xx' },
      { name: 'contract_date', label: 'تاریخ قرارداد', type: 'date', source: 'form', required: true }
    ]
  },
  {
    title: 'اطلاعات شرکت مضمون‌عنه',
    icon: <Building2 className="h-5 w-5" />,
    fields: [
      { name: 'company_name', label: 'نام شرکت', type: 'text', source: 'rasmio', required: true },
      { name: 'company_registration_number', label: 'شماره ثبت', type: 'text', source: 'rasmio', required: true },
      { name: 'company_registration_office', label: 'محل ثبت', type: 'text', source: 'rasmio', required: true },
      { name: 'company_national_id', label: 'شناسه ملی', type: 'text', source: 'rasmio', required: true },
      { name: 'company_address', label: 'آدرس', type: 'textarea', source: 'rasmio', required: true },
      { name: 'company_postal_code', label: 'کد پستی', type: 'text', source: 'rasmio', required: true, validation: '10 رقم' },
      { name: 'company_phone', label: 'تلفن ثابت', type: 'phone', source: 'rasmio', required: true },
      { name: 'company_mobile', label: 'تلفن همراه', type: 'phone', source: 'rasmio', required: true },
      { name: 'company_email', label: 'ایمیل', type: 'email', source: 'rasmio', required: true }
    ]
  },
  {
    title: 'اطلاعات نماینده شرکت',
    icon: <User className="h-5 w-5" />,
    fields: [
      { name: 'representative_name', label: 'نام نماینده/مدیرعامل', type: 'text', source: 'rasmio', required: true },
      { name: 'representative_father_name', label: 'نام پدر', type: 'text', source: 'rasmio', required: true },
      { name: 'representative_birth_date', label: 'تاریخ تولد', type: 'date', source: 'rasmio', required: true },
      { name: 'representative_birth_place', label: 'محل صدور شناسنامه', type: 'text', source: 'rasmio', required: true },
      { name: 'representative_id_number', label: 'شماره شناسنامه', type: 'text', source: 'rasmio', required: true },
      { name: 'representative_national_code', label: 'کد ملی', type: 'text', source: 'rasmio', required: true, validation: '10 رقم' },
      { name: 'representative_position', label: 'سمت', type: 'text', source: 'rasmio', required: true },
      { name: 'newspaper_page', label: 'صفحه آگهی روزنامه رسمی', type: 'text', source: 'rasmio', required: true },
      { name: 'newspaper_number', label: 'شماره روزنامه رسمی', type: 'text', source: 'rasmio', required: true },
      { name: 'newspaper_date', label: 'تاریخ روزنامه رسمی', type: 'date', source: 'rasmio', required: true }
    ]
  },
  {
    title: 'اطلاعات ضامن',
    icon: <User className="h-5 w-5" />,
    fields: [
      { name: 'guarantor_name', label: 'نام ضامن', type: 'text', source: 'form', required: true },
      { name: 'guarantor_father_name', label: 'نام پدر ضامن', type: 'text', source: 'form', required: true },
      { name: 'guarantor_birth_date', label: 'تاریخ تولد ضامن', type: 'date', source: 'form', required: true },
      { name: 'guarantor_birth_place', label: 'محل صدور شناسنامه ضامن', type: 'text', source: 'form', required: true },
      { name: 'guarantor_id_number', label: 'شماره شناسنامه ضامن', type: 'text', source: 'form', required: true },
      { name: 'guarantor_national_code', label: 'کد ملی ضامن', type: 'text', source: 'form', required: true, validation: '10 رقم' },
      { name: 'guarantor_address', label: 'آدرس ضامن', type: 'textarea', source: 'form', required: true },
      { name: 'guarantor_postal_code', label: 'کد پستی ضامن', type: 'text', source: 'form', required: true, validation: '10 رقم' },
      { name: 'guarantor_mobile', label: 'تلفن همراه ضامن', type: 'phone', source: 'form', required: true }
    ]
  },
  {
    title: 'مشخصات ضمانت‌نامه',
    icon: <FileText className="h-5 w-5" />,
    fields: [
      { name: 'guarantee_type', label: 'نوع ضمانت‌نامه', type: 'text', source: 'form', required: true, placeholder: 'حسن انجام کار/پیش پرداخت/...' },
      { name: 'sepas_code', label: 'کد سپاص', type: 'text', source: 'form', required: true },
      { name: 'beneficiary_name', label: 'نام شرکت مضمون‌له', type: 'text', source: 'form', required: true },
      { name: 'guarantee_amount', label: 'مبلغ ضمانت‌نامه (ریال)', type: 'number', source: 'form', required: true },
      { name: 'guarantee_amount_words', label: 'مبلغ به حروف', type: 'text', source: 'calculated', required: true, disabled: true },
      { name: 'start_date', label: 'تاریخ شروع اعتبار', type: 'date', source: 'form', required: true },
      { name: 'end_date', label: 'تاریخ پایان اعتبار', type: 'date', source: 'form', required: true },
      { name: 'duration_days', label: 'مدت اعتبار (روز)', type: 'number', source: 'calculated', required: true, disabled: true }
    ]
  },
  {
    title: 'کارمزد',
    icon: <Calculator className="h-5 w-5" />,
    fields: [
      { name: 'commission_rate', label: 'نرخ کارمزد (درصد)', type: 'number', source: 'form', required: true },
      { name: 'commission_amount', label: 'مبلغ کارمزد (ریال)', type: 'number', source: 'calculated', required: true, disabled: true },
      { name: 'commission_amount_words', label: 'مبلغ کارمزد به حروف', type: 'text', source: 'calculated', required: true, disabled: true }
    ]
  },
  {
    title: 'تضامین',
    icon: <CreditCard className="h-5 w-5" />,
    fields: [
      { name: 'company_check_count', label: 'تعداد چک شرکت', type: 'number', source: 'form', required: false },
      { name: 'company_check_amount', label: 'مبلغ چک شرکت (ریال)', type: 'number', source: 'form', required: false },
      { name: 'company_check_amount_words', label: 'مبلغ چک شرکت به حروف', type: 'text', source: 'calculated', required: false },
      { name: 'personal_check_count', label: 'تعداد چک شخصی', type: 'number', source: 'form', required: false },
      { name: 'personal_check_amount', label: 'مبلغ چک شخصی (ریال)', type: 'number', source: 'form', required: false },
      { name: 'personal_check_amount_words', label: 'مبلغ چک شخصی به حروف', type: 'text', source: 'calculated', required: false },
      { name: 'cash_deposit_amount', label: 'مبلغ سپرده نقدی (ریال)', type: 'number', source: 'form', required: false },
      { name: 'cash_deposit_amount_words', label: 'مبلغ سپرده نقدی به حروف', type: 'text', source: 'calculated', required: false },
      { name: 'cash_deposit_percentage', label: 'درصد سپرده نقدی', type: 'number', source: 'calculated', required: false }
    ]
  }
];

export default function GuaranteeForm({ companyId, templateId, onSubmit, initialData }: GuaranteeFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [rasmioLoading, setRasmioLoading] = useState(false);
  const [rasmioEnabled, setRasmioEnabled] = useState(true);

  // بارگذاری داده‌های اولیه
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      loadSavedData();
    }
  }, [companyId, templateId]);

  // محاسبات خودکار
  useEffect(() => {
    calculateFields();
  }, [formData.guarantee_amount, formData.commission_rate, formData.start_date, formData.end_date, 
      formData.cash_deposit_amount, formData.company_check_amount, formData.personal_check_amount]);

  const loadSavedData = async () => {
    try {
      const response = await fetch(`/api/contract-form-data/${companyId}/${templateId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.formData) {
          const parsedData = JSON.parse(data.formData.formData);
          setFormData(parsedData);
          toast({
            title: "داده‌ها بارگذاری شد",
            description: "اطلاعات ذخیره شده قبلی بارگذاری شد"
          });
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };

  const loadRasmioData = async () => {
    setRasmioLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/rasmio`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });

      if (response.ok) {
        const rasmioData = await response.json();
        
        // Map Rasmio data to form fields
        const mappedData: Record<string, any> = {
          company_name: rasmioData.name,
          company_national_id: rasmioData.nationalId,
          company_registration_number: rasmioData.registrationNumber,
          company_registration_office: rasmioData.registrationCity || 'رشت',
          company_address: rasmioData.address,
          company_postal_code: rasmioData.postalCode,
          company_phone: rasmioData.phone,
          company_email: rasmioData.email || '',
          // Add representative data if available
          representative_name: rasmioData.managers?.[0]?.name || '',
          representative_position: rasmioData.managers?.[0]?.position || 'مدیرعامل',
          representative_national_code: rasmioData.managers?.[0]?.nationalId || ''
        };

        setFormData(prev => ({ ...prev, ...mappedData }));
        toast({
          title: "اطلاعات رسمیو دریافت شد",
          description: "اطلاعات شرکت از سامانه رسمیو بارگذاری شد"
        });
      } else {
        throw new Error('Failed to fetch Rasmio data');
      }
    } catch (error) {
      console.error('Error loading Rasmio data:', error);
      toast({
        title: "خطا در دریافت اطلاعات",
        description: "امکان دریافت اطلاعات از رسمیو وجود ندارد. لطفاً به صورت دستی وارد کنید.",
        variant: "destructive"
      });
      setRasmioEnabled(false);
    } finally {
      setRasmioLoading(false);
    }
  };

  const calculateFields = () => {
    const updates: Record<string, any> = {};

    // محاسبه مبلغ به حروف
    if (formData.guarantee_amount) {
      updates.guarantee_amount_words = numberToWords(parseInt(formData.guarantee_amount));
    }

    // محاسبه مدت قرارداد
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      updates.duration_days = days > 0 ? days : 0;
    }

    // محاسبه کارمزد
    if (formData.guarantee_amount && formData.commission_rate) {
      const amount = parseInt(formData.guarantee_amount);
      const rate = parseFloat(formData.commission_rate);
      const commission = Math.floor(amount * rate / 100);
      updates.commission_amount = commission;
      updates.commission_amount_words = numberToWords(commission);
    }

    // محاسبه درصد سپرده نقدی
    if (formData.cash_deposit_amount && formData.guarantee_amount) {
      const deposit = parseInt(formData.cash_deposit_amount);
      const total = parseInt(formData.guarantee_amount);
      updates.cash_deposit_percentage = ((deposit / total) * 100).toFixed(2);
    }

    // محاسبه مبلغ چک‌ها به حروف
    if (formData.company_check_amount) {
      updates.company_check_amount_words = numberToWords(parseInt(formData.company_check_amount));
    }
    
    if (formData.personal_check_amount) {
      updates.personal_check_amount_words = numberToWords(parseInt(formData.personal_check_amount));
    }
    
    if (formData.cash_deposit_amount) {
      updates.cash_deposit_amount_words = numberToWords(parseInt(formData.cash_deposit_amount));
    }

    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  };

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/contract-form-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          companyId,
          templateId,
          formType: 'guarantee',
          formData
        })
      });

      if (response.ok) {
        toast({
          title: "ذخیره موفق",
          description: "اطلاعات فرم با موفقیت ذخیره شد"
        });
      } else {
        throw new Error('Failed to save form data');
      }
    } catch (error) {
      console.error('Error saving form data:', error);
      toast({
        title: "خطا در ذخیره",
        description: "خطا در ذخیره اطلاعات فرم",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    // Validate required fields
    const missingFields: string[] = [];
    
    formSections.forEach(section => {
      section.fields.forEach(field => {
        if (field.required && field.source !== 'calculated' && !formData[field.name]) {
          missingFields.push(field.label);
        }
      });
    });

    if (missingFields.length > 0) {
      toast({
        title: "فیلدهای اجباری",
        description: `لطفاً فیلدهای زیر را تکمیل کنید: ${missingFields.join('، ')}`,
        variant: "destructive"
      });
      return;
    }

    onSubmit(formData);
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name] || '';
    const isDisabled = field.source === 'calculated';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.name}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={isDisabled}
            className="min-h-[80px]"
          />
        );
      
      case 'date':
        return (
          <Input
            id={field.name}
            type="text"
            value={value}
            placeholder="YYYY-MM-DD"
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            disabled={isDisabled}
          />
        );
      
      case 'number':
        return (
          <Input
            id={field.name}
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={isDisabled}
          />
        );
      
      default:
        return (
          <Input
            id={field.name}
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            disabled={isDisabled}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* نوار ابزار */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {rasmioEnabled && (
            <Button
              variant="outline"
              onClick={loadRasmioData}
              disabled={rasmioLoading}
            >
              {rasmioLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  در حال دریافت...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 ml-2" />
                  دریافت از رسمیو
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={loading}
          >
            <Save className="h-4 w-4 ml-2" />
            ذخیره پیش‌نویس
          </Button>
        </div>

        {!rasmioEnabled && (
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              سرویس رسمیو در دسترس نیست. لطفاً اطلاعات را به صورت دستی وارد کنید.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* بخش‌های فرم */}
      {formSections.map((section, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {section.icon}
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name} className="flex items-center gap-2">
                    {field.label}
                    {field.required && <span className="text-red-500">*</span>}
                    {field.source === 'rasmio' && (
                      <Badge variant="secondary" className="text-xs">رسمیو</Badge>
                    )}
                    {field.source === 'calculated' && (
                      <Badge variant="secondary" className="text-xs">محاسباتی</Badge>
                    )}
                  </Label>
                  {renderField(field)}
                  {field.validation && (
                    <p className="text-xs text-gray-500">{field.validation}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* دکمه‌های عملیات */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={handleSave} disabled={loading}>
          ذخیره پیش‌نویس
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          تولید قرارداد
        </Button>
      </div>
    </div>
  );
}

// تابع تبدیل عدد به حروف فارسی
function numberToWords(num: number): string {
  if (num === 0) return 'صفر';
  
  const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const tens = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const hundreds = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scales = ['', 'هزار', 'میلیون', 'میلیارد'];
  
  const convertHundreds = (n: number): string => {
    let result = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;
    
    if (h > 0) result += hundreds[h];
    
    if (t === 1) {
      const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
      result += (result ? ' و ' : '') + teens[o];
    } else {
      if (t > 1) result += (result ? ' و ' : '') + tens[t];
      if (o > 0) result += (result ? ' و ' : '') + ones[o];
    }
    
    return result;
  };
  
  const groups = [];
  let tempNum = num;
  
  while (tempNum > 0) {
    groups.push(tempNum % 1000);
    tempNum = Math.floor(tempNum / 1000);
  }
  
  let result = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] > 0) {
      const groupText = convertHundreds(groups[i]);
      if (groupText) {
        result += (result ? ' و ' : '') + groupText;
        if (i > 0) result += ' ' + scales[i];
      }
    }
  }
  
  return result + ' ریال';
} 