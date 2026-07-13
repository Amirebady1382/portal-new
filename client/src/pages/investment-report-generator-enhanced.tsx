import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { FileText, Building, Zap, Download, Eye, RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const DETAIL_LEVELS = [
  { value: 'basic', label: 'خلاصه' },
  { value: 'detailed', label: 'تفصیلی' },
  { value: 'comprehensive', label: 'جامع و کامل' }
];

export default function InvestmentReportGeneratorEnhanced() {
  const { toast } = useToast();

  const [mode, setMode] = useState<'template' | 'freetext'>('freetext');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [customText, setCustomText] = useState("");
  const [usePerplexity, setUsePerplexity] = useState(true);
  const [researchCompany, setResearchCompany] = useState(true);
  const [researchIndustry, setResearchIndustry] = useState(true);
  const [detailLevel, setDetailLevel] = useState('detailed');
  
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch templates
  const { data: templatesResponse } = useQuery({
    queryKey: ["/api/investment-reports/templates"],
    queryFn: async () => {
      return await apiRequest<{ success: boolean; templates: any[] }>("GET", "/api/investment-reports/templates");
    }
  });
  const templates = templatesResponse?.templates || [];

  // Fetch companies - اصلاح شده برای رفع مشکل
  const { data: companies = [], isLoading: companiesLoading, error: companiesError } = useQuery({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      console.log('🔍 Fetching companies for report generator...');
      const data: any = await apiRequest('GET', '/api/companies');
      console.log('✅ Companies received:', data?.length || 0);
      return data || [];
    }
  });

  // Fetch company services when a company is selected
  const { data: companyServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['/api/companies', selectedCompanyId, 'services'],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      console.log('🔍 Fetching services for company:', selectedCompanyId);
      
      const data: any = await apiRequest('GET', `/api/companies/${selectedCompanyId}/services`);
      console.log('✅ Raw services data:', data);
      
      // Normalize: تبدیل به format قابل استفاده
      const services = (data.services || []).map((cs: any) => ({
        id: cs.serviceId,           // استفاده از serviceId به عنوان id
        title: cs.serviceTitle,      // استفاده از serviceTitle به عنوان title
        description: cs.serviceDescription,
        department: cs.serviceDepartment,
        category: cs.category || cs.serviceCategory,
        icon: cs.serviceIcon,
        estimatedDays: cs.estimatedDays,
        mappingId: cs.id,           // نگه داشتن mapping ID
        isActive: cs.isActive,
        activatedAt: cs.activatedAt
      }));
      
      console.log('✅ Normalized services:', services);
      return services;
    },
    enabled: !!selectedCompanyId
  });

  // Fetch company reports history when a company is selected
  const { data: reportsResponse, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['/api/investment-reports/company', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return { success: true, reports: [] };
      return await apiRequest<{ success: boolean; reports: any[] }>('GET', `/api/investment-reports/company/${selectedCompanyId}`);
    },
    enabled: !!selectedCompanyId
  });
  const previousReports = reportsResponse?.reports || [];

  // Show error toast if companies fail to load
  useEffect(() => {
    if (companiesError) {
      toast({
        title: "خطا در دریافت لیست شرکت‌ها",
        description: companiesError instanceof Error ? companiesError.message : 'خطای ناشناخته',
        variant: "destructive"
      });
    }
  }, [companiesError, toast]);

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (data: any) => {
      if (mode === 'freetext') {
        // تولید با AI بدون قالب
        return await apiRequest("POST", "/api/investment-reports/generate-ai", data);
      } else {
        // تولید با قالب
        return await apiRequest("POST", "/api/investment-reports/generate", data);
      }
    },
    onSuccess: (data: any) => {
      setGeneratedReport(data.report);
      setShowPreview(true);
      refetchReports(); // Refresh history
      toast({
        title: "موفق",
        description: "گزارش با موفقیت تولید شد"
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در تولید گزارش",
        variant: "destructive"
      });
    }
  });

  const handleGenerateReport = () => {
    if (!selectedCompanyId) {
      toast({
        title: "خطا",
        description: "لطفاً یک شرکت انتخاب کنید",
        variant: "destructive"
      });
      return;
    }

    if (mode === 'template' && !selectedTemplateId) {
      toast({
        title: "خطا",
        description: "لطفاً یک قالب انتخاب کنید",
        variant: "destructive"
      });
      return;
    }

    if (mode === 'freetext' && !customText.trim()) {
      toast({
        title: "خطا",
        description: "لطفاً متن مورد نظر را وارد کنید",
        variant: "destructive"
      });
      return;
    }

    const requestData: any = {
      companyId: selectedCompanyId,
      serviceId: selectedServiceId, // اضافه کردن serviceId
      detailLevel
    };

    if (mode === 'freetext') {
      requestData.customText = customText;
      requestData.usePerplexity = usePerplexity;
      requestData.perplexityOptions = {
        researchCompany,
        researchIndustry
      };
    } else {
      requestData.templateId = selectedTemplateId;
      requestData.reportType = 'evaluation';
    }

    console.log('📊 Generating report with data:', { 
      companyId: selectedCompanyId, 
      serviceId: selectedServiceId,
      mode 
    });

    generateReportMutation.mutate(requestData);
  };

  const handleDownloadPDF = async () => {
    if (!generatedReport) return;

    try {
      // اینجا یک workaround ساده: تبدیل HTML به یک فایل قابل دانلود
      // برای تبدیل واقعی به PDF باید از puppeteer یا jsPDF استفاده شود
      const blob = new Blob([generatedReport.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${generatedReport.metadata.companyName}_${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "موفق",
        description: "فایل HTML دانلود شد"
      });
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در دانلود فایل",
        variant: "destructive"
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 text-right">
            {/* Header */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 md:h-8 w-6 md:w-8" />
                گزارش ارزیابی AI
              </h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                تولید گزارش با AI و Perplexity
              </p>
            </div>

            {!showPreview ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Settings Panel */}
                <div className="lg:col-span-1 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>تنظیمات</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Mode Selection */}
                      <div>
                        <Label>حالت تولید</Label>
                        <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="mt-2">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="freetext">متن آزاد</TabsTrigger>
                            <TabsTrigger value="template">با قالب</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      {/* Company Selection */}
                      <div>
                        <Label>انتخاب شرکت</Label>
                        <Select
                          value={selectedCompanyId?.toString() || ""}
                          onValueChange={(value) => {
                            setSelectedCompanyId(parseInt(value));
                            setSelectedServiceId(null); // Reset service when company changes
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="انتخاب شرکت..." />
                          </SelectTrigger>
                          <SelectContent>
                            {companiesLoading ? (
                              <SelectItem value="loading" disabled>
                                <RefreshCw className="h-4 w-4 animate-spin ml-2 inline" />
                                در حال بارگیری...
                              </SelectItem>
                            ) : companies.length > 0 ? (
                              companies.map((company: any) => (
                                <SelectItem key={company.id} value={company.id.toString()}>
                                  {company.name}
                                  {company.status && (
                                    <Badge variant="outline" className="mr-2 text-xs">
                                      {company.status}
                                    </Badge>
                                  )}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="empty" disabled>
                                <AlertCircle className="h-4 w-4 ml-2 inline" />
                                شرکتی یافت نشد
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Service Selection - Optional */}
                      {selectedCompanyId && (
                        <div>
                          <Label>
                            انتخاب خدمت (اختیاری)
                            <span className="text-xs text-gray-500 mr-2">
                              برای تحلیل متمرکز
                            </span>
                          </Label>
                          <Select
                            value={selectedServiceId?.toString() || "none"}
                            onValueChange={(value) => setSelectedServiceId(value === "none" ? null : parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="تحلیل کلی (همه خدمات)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <Sparkles className="h-4 w-4 ml-2 inline" />
                                تحلیل کلی شرکت
                              </SelectItem>
                              {servicesLoading ? (
                                <SelectItem value="loading" disabled>
                                  <RefreshCw className="h-4 w-4 animate-spin ml-2 inline" />
                                  در حال بارگیری خدمات...
                                </SelectItem>
                              ) : companyServices.length > 0 ? (
                                companyServices.map((service: any) => (
                                  <SelectItem key={service.id} value={service.id.toString()}>
                                    {service.title}
                                    {service.category && (
                                      <Badge variant="outline" className="mr-2 text-xs">
                                        {service.category}
                                      </Badge>
                                    )}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-services" disabled>
                                  <AlertCircle className="h-4 w-4 ml-2 inline" />
                                  خدمتی برای این شرکت فعال نشده
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Template Selection (if template mode) */}
                      {mode === 'template' && (
                        <div>
                          <Label>انتخاب قالب</Label>
                          <Select
                            value={selectedTemplateId?.toString() || ""}
                            onValueChange={(value) => setSelectedTemplateId(parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="انتخاب قالب..." />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((template: any) => (
                                <SelectItem key={template.id} value={template.id.toString()}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Detail Level */}
                      <div>
                        <Label>سطح جزئیات</Label>
                        <Select value={detailLevel} onValueChange={setDetailLevel}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DETAIL_LEVELS.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Perplexity Options (only for freetext mode) */}
                      {mode === 'freetext' && (
                        <>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                              id="usePerplexity"
                              checked={usePerplexity}
                              onCheckedChange={(checked) => setUsePerplexity(checked as boolean)}
                            />
                            <Label htmlFor="usePerplexity" className="cursor-pointer">
                              استفاده از Perplexity برای تحقیق
                            </Label>
                          </div>

                          {usePerplexity && (
                            <>
                              <div className="flex items-center space-x-2 space-x-reverse mr-6">
                                <Checkbox
                                  id="researchCompany"
                                  checked={researchCompany}
                                  onCheckedChange={(checked) => setResearchCompany(checked as boolean)}
                                />
                                <Label htmlFor="researchCompany" className="cursor-pointer text-sm">
                                  تحقیق درباره شرکت
                                </Label>
                              </div>

                              <div className="flex items-center space-x-2 space-x-reverse mr-6">
                                <Checkbox
                                  id="researchIndustry"
                                  checked={researchIndustry}
                                  onCheckedChange={(checked) => setResearchIndustry(checked as boolean)}
                                />
                                <Label htmlFor="researchIndustry" className="cursor-pointer text-sm">
                                  تحقیق درباره صنعت
                                </Label>
                              </div>
                            </>
                          )}
                        </>
                      )}

                      <Button
                        onClick={handleGenerateReport}
                        disabled={generateReportMutation.isPending}
                        className="w-full"
                      >
                        {generateReportMutation.isPending ? (
                          <>
                            <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                            در حال تولید...
                          </>
                        ) : (
                          <>
                            <Zap className="ml-2 h-4 w-4" />
                            تولید گزارش
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Info Alerts */}
                  {mode === 'freetext' && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>حالت متن آزاد</AlertTitle>
                      <AlertDescription>
                        در این حالت، شما می‌توانید prompt دلخواه خود را وارد کنید و AI گزارش را بر اساس آن تولید می‌کند.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Service Focus Alert */}
                  {selectedServiceId && (
                    <Alert className="border-blue-200 bg-blue-50">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <AlertTitle className="text-blue-900">تحلیل متمرکز بر خدمت</AlertTitle>
                      <AlertDescription className="text-blue-800">
                        گزارش با تمرکز بر خدمت "{companyServices.find((s: any) => s.id === selectedServiceId)?.title}" تولید می‌شود.
                        AI فرم‌ها و توضیحات مربوط به این خدمت را بررسی می‌کند.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Input / History Panel */}
                <div className="lg:col-span-2">
                  <Tabs defaultValue="editor" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="editor">تنظیمات و محتوای گزارش</TabsTrigger>
                      <TabsTrigger value="history">
                        سوابق گزارش‌های تولید شده ({selectedCompanyId ? previousReports.length : 0})
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="editor">
                      <Card className="h-full">
                        <CardHeader>
                          <CardTitle>
                            {mode === 'freetext' ? 'ورود متن (Prompt)' : 'پیکربندی گزارش'}
                          </CardTitle>
                          <CardDescription>
                            {mode === 'freetext' 
                              ? 'متن مورد نظر خود را وارد کنید. AI این متن را با اطلاعات شرکت کامل خواهد کرد.' 
                              : 'گزارش بر اساس قالب انتخابی تولید خواهد شد.'}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {mode === 'freetext' ? (
                            <Textarea
                              placeholder="مثال: گزارش ارزیابی جامع برای شرکت را تهیه کنید. گزارش باید شامل تحلیل تیم، محصول، بازار و ریسک‌ها باشد..."
                              value={customText}
                              onChange={(e) => setCustomText(e.target.value)}
                              rows={20}
                              className="font-mono text-right"
                              dir="rtl"
                            />
                          ) : (
                            <div className="space-y-4">
                              <Alert>
                                <FileText className="h-4 w-4" />
                                <AlertTitle>تولید با قالب</AlertTitle>
                                <AlertDescription>
                                  گزارش بر اساس قالب انتخابی و با استفاده از اطلاعات موجود شرکت تولید می‌شود.
                                </AlertDescription>
                              </Alert>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="history">
                      <Card>
                        <CardHeader>
                          <CardTitle>تاریخچه گزارش‌های ارزیابی</CardTitle>
                          <CardDescription>
                            لیست تمام گزارش‌های ارزیابی تولید شده برای این شرکت
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {!selectedCompanyId ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Building className="h-12 w-12 mx-auto mb-3 opacity-40" />
                              <p>لطفاً ابتدا یک شرکت را از پنل سمت راست انتخاب کنید تا تاریخچه گزارش‌های آن را مشاهده کنید.</p>
                            </div>
                          ) : reportsLoading ? (
                            <div className="text-center py-8">
                              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                              <p>در حال بارگذاری تاریخچه...</p>
                            </div>
                          ) : previousReports.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                              <p>هیچ گزارشی تا کنون برای این شرکت ثبت نشده است.</p>
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-right text-gray-500">
                                <thead className="text-xs text-gray-700 bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-4 py-3">شماره گزارش</th>
                                    <th scope="col" className="px-4 py-3">نوع گزارش</th>
                                    <th scope="col" className="px-4 py-3">تاریخ تولید</th>
                                    <th scope="col" className="px-4 py-3">حجم فایل</th>
                                    <th scope="col" className="px-4 py-3 text-center">عملیات</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {previousReports.map((report: any) => {
                                    const isAI = report.reportType === 'ai_freetext';
                                    return (
                                      <tr key={report.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900 font-mono">
                                          {report.reportNumber}
                                        </td>
                                        <td className="px-4 py-3">
                                          <Badge variant={isAI ? "secondary" : "outline"}>
                                            {isAI ? "متن آزاد AI" : "قالب قرارداد/ارزیابی"}
                                          </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                          {new Date(report.generatedAt).toLocaleDateString('fa-IR')}
                                        </td>
                                        <td className="px-4 py-3 font-mono">
                                          {report.fileSize ? `${Math.round(report.fileSize / 1024)} KB` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center flex justify-center gap-2">
                                          {isAI && report.reportData && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => {
                                                try {
                                                  const data = JSON.parse(report.reportData);
                                                  setGeneratedReport({
                                                    content: data.html || '',
                                                    metadata: data.metadata || {
                                                      companyName: companies.find((c: any) => c.id === selectedCompanyId)?.name || 'نامشخص',
                                                      generatedAt: report.generatedAt,
                                                      model: 'GapGPT',
                                                      tokensUsed: 0,
                                                      processingTime: 0,
                                                      dataSources: ['تاریخچه دیتابیس']
                                                    }
                                                  });
                                                  setShowPreview(true);
                                                } catch (e) {
                                                  toast({
                                                    title: "خطا در بارگذاری",
                                                    description: "قالب داده گزارش خوانا نیست.",
                                                    variant: "destructive"
                                                  });
                                                }
                                              }}
                                            >
                                              <Eye className="h-4 w-4 ml-1" />
                                              نمایش
                                            </Button>
                                          )}
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                          >
                                            <a href={`/api/investment-reports/download/${report.fileName}`} download>
                                              <Download className="h-4 w-4 ml-1" />
                                              دانلود
                                            </a>
                                          </Button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            ) : (
              /* Preview Panel */
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>پیش‌نمایش گزارش</CardTitle>
                        <CardDescription>
                          شرکت: {generatedReport?.metadata?.companyName} | 
                          زمان تولید: {generatedReport?.metadata?.processingTime}ms
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleDownloadPDF} variant="outline">
                          <Download className="ml-2 h-4 w-4" />
                          دانلود HTML
                        </Button>
                        <Button onClick={() => setShowPreview(false)} variant="outline">
                          <Eye className="ml-2 h-4 w-4" />
                          بازگشت به تنظیمات
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Metadata */}
                    <div className="flex gap-2 mb-4">
                      <Badge>مدل: {generatedReport?.metadata?.model}</Badge>
                      <Badge>توکن: {generatedReport?.metadata?.tokensUsed}</Badge>
                      <Badge>منابع: {generatedReport?.metadata?.dataSources?.length || 0}</Badge>
                    </div>

                    {/* Data Sources */}
                    {generatedReport?.metadata?.dataSources && (
                      <div className="mb-4">
                        <h3 className="font-medium mb-2">منابع داده استفاده شده:</h3>
                        <div className="flex flex-wrap gap-2">
                          {generatedReport.metadata.dataSources.map((source: string, index: number) => (
                            <Badge key={index} variant="secondary">{source}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* HTML Preview */}
                    <div 
                      className="prose prose-sm max-w-none bg-white p-8 rounded-lg border text-right"
                      dir="rtl"
                      dangerouslySetInnerHTML={{ __html: generatedReport?.content || '' }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DashboardLayout>
  );
}


