/**
 * ===============================================
 * 📊 Variable Summary Panel
 * ===============================================
 * 
 * نمایش خلاصه متغیرها و منبع آن‌ها قبل از تولید قرارداد/گزارش
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, FileText, Calculator, Database, AlertCircle, Edit3 } from "lucide-react";
import { useState } from "react";

interface VariableInfo {
  name: string;
  label: string;
  source: 'rasmio' | 'form' | 'calculated' | 'system' | 'manual' | 'missing';
  type?: 'text' | 'number' | 'date' | 'currency' | 'email' | 'phone' | 'textarea' | 'boolean';
  value?: string | number | null;
  required?: boolean;
  filled?: boolean;
  placeholder?: string;
  relatedTo?: 'company' | 'fund' | 'representative' | 'guarantor' | 'witness' | 'other'; // جدید: نقش متغیر
}

interface VariableSummaryPanelProps {
  variables: VariableInfo[];
  className?: string;
  editable?: boolean; // آیا فیلدهای manual/form قابل ویرایش هستند؟
  onVariableChange?: (name: string, value: any) => void; // callback برای تغییرات
}

// نگاشت منابع به فارسی و رنگ‌ها
const SOURCE_CONFIG = {
  rasmio: {
    label: 'رسمیو',
    icon: Database,
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
    description: 'خودکار از API رسمیو'
  },
  form: {
    label: 'فرم',
    icon: FileText,
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'ورودی دستی کاربر'
  },
  calculated: {
    label: 'محاسباتی',
    icon: Calculator,
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'محاسبه خودکار'
  },
  system: {
    label: 'سیستمی',
    icon: CheckCircle2,
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'تولید خودکار سیستم'
  },
  manual: {
    label: 'دستی',
    icon: FileText,
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    description: 'ورودی دستی کارشناس'
  },
  missing: {
    label: 'ناموجود',
    icon: AlertCircle,
    badgeClass: 'bg-red-100 text-red-800 border-red-200',
    description: 'داده موجود نیست'
  }
};

export function VariableSummaryPanel({
  variables,
  className = '',
  editable = false,
  onVariableChange
}: VariableSummaryPanelProps) {
  // state محلی برای مقادیر ورودی
  const [localValues, setLocalValues] = useState<Record<string, any>>({});

  // handler برای تغییر مقدار
  const handleValueChange = (name: string, value: any) => {
    setLocalValues(prev => ({ ...prev, [name]: value }));
    if (onVariableChange) {
      onVariableChange(name, value);
    }
  };

  // گروه‌بندی متغیرها بر اساس منبع
  const groupedVariables = {
    rasmio: variables.filter(v => v.source === 'rasmio'),
    form: variables.filter(v => v.source === 'form'),
    calculated: variables.filter(v => v.source === 'calculated'),
    system: variables.filter(v => v.source === 'system'),
    manual: variables.filter(v => v.source === 'manual'),
    missing: variables.filter(v => v.source === 'missing')
  };

  // شمارش متغیرهای پر شده و خالی
  const stats = {
    total: variables.length,
    filled: variables.filter(v => v.filled || (v.source !== 'form' && v.source !== 'manual')).length,
    empty: variables.filter(v => !v.filled && (v.source === 'form' || v.source === 'manual') && v.required).length
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          خلاصه متغیرها
        </CardTitle>
        <CardDescription>
          جزئیات {stats.total} متغیر و منبع داده آن‌ها
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* آمار کلی */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
            <div className="text-xs text-blue-600">کل متغیرها</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.filled}</div>
            <div className="text-xs text-green-600">پر شده</div>
          </div>
          {stats.empty > 0 && (
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-700">{stats.empty}</div>
              <div className="text-xs text-red-600">نیاز به ورود</div>
            </div>
          )}
        </div>

        {/* هشدار برای متغیرهای خالی */}
        {stats.empty > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {stats.empty} متغیر الزامی هنوز پر نشده است. لطفاً آن‌ها را تکمیل کنید.
            </AlertDescription>
          </Alert>
        )}

        {/* نمایش متغیرها بر اساس منبع */}
        <div className="space-y-4">
          {Object.entries(groupedVariables).map(([source, vars]) => {
            if (vars.length === 0) return null;
            
            const config = SOURCE_CONFIG[source as keyof typeof SOURCE_CONFIG];
            const Icon = config.icon;

            return (
              <div key={source} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={config.badgeClass}>
                    <Icon className="h-3 w-3 ml-1" />
                    {config.label}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {config.description} • {vars.length} متغیر
                  </span>
                </div>
                
                <div className="mr-4 space-y-2">
                  {vars.map(variable => {
                    const isEditable = editable && (variable.source === 'form' || variable.source === 'manual') && !variable.filled;
                    const currentValue = localValues[variable.name] ?? variable.value ?? '';

                    if (isEditable) {
                      // نمایش فیلد ورودی برای متغیرهای قابل ویرایش
                      return (
                        <div key={variable.name} className="p-3 bg-white border border-gray-200 rounded-lg space-y-2">
                          <Label htmlFor={variable.name} className="flex items-center gap-2 text-sm font-medium">
                            <Edit3 className="h-4 w-4 text-blue-500" />
                            {variable.label}
                            {variable.required && <span className="text-red-500">*</span>}
                          </Label>

                          {variable.type === 'textarea' ? (
                            <Textarea
                              id={variable.name}
                              value={currentValue}
                              onChange={(e) => handleValueChange(variable.name, e.target.value)}
                              placeholder={variable.placeholder || getPersianPlaceholder(variable.name)}
                              required={variable.required}
                              className="w-full"
                              rows={3}
                            />
                          ) : variable.type === 'date' ? (
                            <Input
                              id={variable.name}
                              type="text"
                              value={currentValue}
                              onChange={(e) => handleValueChange(variable.name, e.target.value)}
                              placeholder={variable.placeholder || "مثال: 1403/01/01"}
                              required={variable.required}
                              className="w-full text-left"
                              dir="ltr"
                            />
                          ) : variable.type === 'currency' || variable.type === 'number' ? (
                            <Input
                              id={variable.name}
                              type="text"
                              inputMode="numeric"
                              value={currentValue}
                              onChange={(e) => {
                                // اجازه فقط اعداد و کاما
                                const val = e.target.value.replace(/[^\d,]/g, '');
                                handleValueChange(variable.name, val);
                              }}
                              placeholder={variable.placeholder || (variable.type === 'currency' ? 'مبلغ به ریال' : 'عدد را وارد کنید')}
                              required={variable.required}
                              className="w-full"
                            />
                          ) : (
                            <Input
                              id={variable.name}
                              type={variable.type === 'email' ? 'email' : variable.type === 'phone' ? 'tel' : 'text'}
                              value={currentValue}
                              onChange={(e) => handleValueChange(variable.name, e.target.value)}
                              placeholder={variable.placeholder || getPersianPlaceholder(variable.name)}
                              required={variable.required}
                              className="w-full"
                            />
                          )}
                        </div>
                      );
                    } else {
                      // نمایش read-only برای سایر متغیرها
                      return (
                        <div
                          key={variable.name}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {variable.filled || (variable.source !== 'form' && variable.source !== 'manual') ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : variable.required ? (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                            )}
                            <span className="font-medium text-gray-700">
                              {variable.label}
                            </span>
                            {variable.required && (
                              <span className="text-red-500 text-xs">*</span>
                            )}
                          </div>

                          {variable.value && (
                            <span className="text-xs text-gray-500 font-mono max-w-[200px] truncate">
                              {String(variable.value)}
                            </span>
                          )}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* راهنما */}
        <div className="pt-4 border-t space-y-2">
          <div className="text-sm font-medium text-gray-700">راهنما:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(SOURCE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <div key={key} className="flex items-center gap-2">
                  <Badge className={`${config.badgeClass} h-5 px-2`}>
                    <Icon className="h-3 w-3" />
                  </Badge>
                  <span className="text-gray-600">{config.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ===============================================
 * 🏷️ Variable Badge Component
 * ===============================================
 * 
 * نمایش badge کوچک برای نشان دادن منبع متغیر
 */

interface VariableBadgeProps {
  source: 'rasmio' | 'form' | 'calculated' | 'system' | 'manual' | 'missing';
  size?: 'sm' | 'md';
}

export function VariableBadge({ source, size = 'sm' }: VariableBadgeProps) {
  const config = SOURCE_CONFIG[source];
  const Icon = config.icon;
  
  return (
    <Badge className={`${config.badgeClass} ${size === 'sm' ? 'h-5 text-xs' : 'h-6'}`}>
      <Icon className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} ml-1`} />
      {config.label}
    </Badge>
  );
}

/**
 * ===============================================
 * 📝 Persian Placeholder Generator
 * ===============================================
 * 
 * تبدیل نام متغیر به placeholder فارسی
 */

export function getPersianPlaceholder(variableName: string): string {
  const placeholders: Record<string, string> = {
    // اطلاعات شرکت
    'company_name': 'نام شرکت',
    'company_national_id': 'شناسه ملی شرکت',
    'national_id': 'شناسه ملی',
    'company_registration_number': 'شماره ثبت شرکت',
    'registration_number': 'شماره ثبت',
    'company_address': 'آدرس شرکت',
    'address': 'آدرس کامل',
    'company_phone': 'تلفن شرکت',
    'phone': 'شماره تلفن',
    'company_email': 'ایمیل شرکت',
    'email': 'آدرس ایمیل',
    'capital': 'سرمایه به ریال',
    'city': 'نام شهر',
    'postal_code': 'کد پستی',
    
    // اطلاعات قرارداد
    'contract_type': 'نوع قرارداد (ضمانت‌نامه، سرمایه‌گذاری، ...)',
    'contract_subject': 'موضوع قرارداد',
    'contract_number': 'شماره قرارداد',
    
    // مبالغ مالی
    'total_amount': 'مبلغ کل به ریال',
    'guarantee_amount': 'مبلغ ضمانت‌نامه به ریال',
    'cash_deposit_amount': 'مبلغ سپرده نقدی به ریال',
    'commission_rate': 'نرخ کمیسیون (درصد)',
    'commission_amount': 'مبلغ کمیسیون',
    'annual_fee_numbers': 'هزینه سالانه',
    
    // تاریخ‌ها
    'start_date': 'تاریخ شروع (مثال: 1403/01/01)',
    'end_date': 'تاریخ پایان (مثال: 1404/01/01)',
    'contract_date': 'تاریخ تنظیم قرارداد',
    'current_date': 'تاریخ جاری',
    'duration_days': 'مدت قرارداد (روز)',
    
    // اطلاعات نماینده
    'company_representative_name': 'نام نماینده شرکت',
    'company_representative_national_id': 'کد ملی نماینده',
    'company_representative_father_name': 'نام پدر نماینده',
    'company_representative_birth_date': 'تاریخ تولد نماینده',
    'company_representative_position': 'سمت نماینده',
    
    // حق امضاداران
    'signatory_1_name': 'نام حق امضای اول',
    'signatory_1_national_id': 'کد ملی حق امضای اول',
    'signatory_1_position': 'سمت حق امضای اول',
    'signatory_2_name': 'نام حق امضای دوم',
    'signatory_2_national_id': 'کد ملی حق امضای دوم',
    'signatory_2_position': 'سمت حق امضای دوم',
    
    // متغیرهای محاسباتی
    'total_amount_words': 'مبلغ به حروف (خودکار)',
    'guarantee_amount_words': 'مبلغ ضمانت به حروف (خودکار)',
    'commission_amount_words': 'مبلغ کمیسیون به حروف (خودکار)',
    'cash_deposit_amount_words': 'سپرده به حروف (خودکار)',
    'cash_deposit_percentage': 'درصد سپرده (خودکار)',
    'annual_fee_words': 'هزینه سالانه به حروف (خودکار)',
    
    // سایر
    'employee_notes': 'یادداشت کارشناس',
    'internal_reference_number': 'شماره مرجع داخلی',
    'risk_assessment': 'ارزیابی ریسک',
    'expert_recommendation': 'توصیه کارشناس',
    'approval_status': 'وضعیت تأیید'
  };

  // اگر mapping مستقیم داشت
  if (placeholders[variableName]) {
    return placeholders[variableName];
  }

  // تبدیل خودکار: snake_case به فارسی
  // مثلاً: company_type → نوع شرکت
  const persianWords: Record<string, string> = {
    'company': 'شرکت',
    'contract': 'قرارداد',
    'name': 'نام',
    'type': 'نوع',
    'date': 'تاریخ',
    'amount': 'مبلغ',
    'number': 'شماره',
    'address': 'آدرس',
    'phone': 'تلفن',
    'email': 'ایمیل',
    'representative': 'نماینده',
    'national': 'ملی',
    'id': 'شناسه',
    'code': 'کد',
    'registration': 'ثبت',
    'guarantee': 'ضمانت',
    'total': 'کل',
    'start': 'شروع',
    'end': 'پایان',
    'duration': 'مدت',
    'commission': 'کمیسیون',
    'rate': 'نرخ',
    'deposit': 'سپرده',
    'cash': 'نقدی',
    'words': 'به حروف',
    'percentage': 'درصد'
  };

  const parts = variableName.split('_');
  const persianParts = parts.map(part => persianWords[part] || part);
  
  return persianParts.join(' ');
}

