import { apiRequest } from "@/lib/queryClient";
/**
 * صفحه تولید گزارش ارزیابی هوشمند
 * مشابه flexible-contract-generator.tsx اما برای گزارش‌های سرمایه‌گذاری
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import MobileSidebar from '@/components/layout/mobile-sidebar';
import { 
  FileText, 
  Building2, 
  TrendingUp,
  Download,
  Eye,
  Star,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { VariableSummaryPanel, VariableBadge, getPersianPlaceholder } from '@/components/variable-summary-panel';

interface ReportTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  variables: string[];
  isActive: boolean;
}

interface Company {
  id: number;
  name: string;
  nationalId: string;
  status: string;
}

interface AIAnalysis {
  teamAnalysis?: { score: number; summary: string };
  productAnalysis?: { score: number; summary: string };
  marketAnalysis?: { score: number; summary: string };
  financialAnalysis?: { score: number; summary: string };
  riskAnalysis?: { score: number; summary: string };
  overallRecommendation?: { score: number; recommendation: string };
}

export default function AdminInvestmentReportGenerator() {
  const { toast } = useToast();
  
  // State
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [reportType, setReportType] = useState<'evaluation' | 'progress' | 'final' | 'risk_assessment'>('evaluation');
  
  // Dialog states
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  useEffect(() => {
    fetchTemplates();
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchAIAnalysis();
    }
  }, [selectedCompany]);

  const fetchTemplates = async () => {
    try {
      const data: any = await apiRequest("GET", '/api/investment-reports/templates');
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const data: any = await apiRequest("GET", '/api/companies');
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchAIAnalysis = async () => {
    if (!selectedCompany) return;
    
    setLoadingAnalysis(true);
    try {
      const data: any = await apiRequest("GET", `/api/companies/${selectedCompany.id}/ai-analysis`);
      setAiAnalysis(data);
      
      toast({
        title: "موفق",
        description: "تحلیل هوش مصنوعی بارگذاری شد",
      });
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      toast({
        title: "خطا",
        description: "خطا در دریافت تحلیل هوش مصنوعی",
        variant: "destructive"
      });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const generateReport = async () => {
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
      const result: any = await apiRequest("POST", '/api/investment-reports/generate', {
        templateId: selectedTemplate.id,
        companyId: selectedCompany.id,
        reportType,
        formData,
        aiAnalysis
      });

      if (result.success) {
        toast({
          title: "موفق",
          description: `گزارش با شماره ${result.reportNumber} تولید شد`,
        });

        // Download report
        const downloadUrl = result.downloadUrl;
        window.open(downloadUrl, '_blank');
      } else {
        throw new Error(result.message || 'خطا در تولید گزارش');
      }

    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در تولید گزارش",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(templateSearchQuery.toLowerCase())
  );

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(companySearchQuery.toLowerCase()) ||
    company.nationalId.includes(companySearchQuery)
  );

  // Calculate overall score from AI analysis
  const getOverallScore = () => {
    if (!aiAnalysis) return null;
    
    const scores = [
      aiAnalysis.teamAnalysis?.score || 0,
      aiAnalysis.productAnalysis?.score || 0,
      aiAnalysis.marketAnalysis?.score || 0,
      aiAnalysis.financialAnalysis?.score || 0,
      aiAnalysis.riskAnalysis?.score || 0,
    ];

    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(average * 10) / 10;
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="flex">
        <Sidebar />
        <MobileSidebar />
        <main className="flex-1 mr-0 md:mr-72 p-6">
          <div className="container mx-auto py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Sparkles className="text-primary" />
                تولید گزارش ارزیابی هوشمند
              </h1>
              <p className="text-gray-600">
                تولید گزارش‌های حرفه‌ای ارزیابی شرکت‌های سرمایه‌گذاری با استفاده از هوش مصنوعی
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel - Selection */}
              <div className="lg:col-span-1 space-y-4">
                {/* Template Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      قالب گزارش
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedTemplate ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-primary/5 rounded-lg">
                          <div className="font-semibold text-sm">{selectedTemplate.name}</div>
                          <div className="text-xs text-gray-600 mt-1">{selectedTemplate.description}</div>
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {selectedTemplate.category}
                          </Badge>
                        </div>
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
                      <Button 
                        variant="default" 
                        className="w-full"
                        onClick={() => setIsTemplateDialogOpen(true)}
                      >
                        انتخاب قالب
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Company Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      شرکت
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedCompany ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-primary/5 rounded-lg">
                          <div className="font-semibold text-sm">{selectedCompany.name}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            شناسه ملی: {selectedCompany.nationalId}
                          </div>
                          <Badge 
                            variant={selectedCompany.status === 'active' ? 'default' : 'secondary'} 
                            className="mt-2 text-xs"
                          >
                            {selectedCompany.status}
                          </Badge>
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
                      <Button 
                        variant="default" 
                        className="w-full"
                        onClick={() => setIsCompanyDialogOpen(true)}
                      >
                        انتخاب شرکت
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Report Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">نوع گزارش</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="انتخاب نوع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="evaluation">ارزیابی اولیه</SelectItem>
                        <SelectItem value="progress">گزارش پیشرفت</SelectItem>
                        <SelectItem value="final">گزارش نهایی</SelectItem>
                        <SelectItem value="risk_assessment">ارزیابی ریسک</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {/* خلاصه اطلاعات قبل از تولید گزارش */}
                {selectedCompany && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">خلاصه اطلاعات گزارش</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <div className="flex items-center gap-2">
                            <VariableBadge source="rasmio" />
                            <span>نام شرکت</span>
                          </div>
                          <span className="font-medium">{selectedCompany.name}</span>
                        </div>
                        
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <div className="flex items-center gap-2">
                            <VariableBadge source="rasmio" />
                            <span>شناسه ملی</span>
                          </div>
                          <span className="font-mono font-medium">{selectedCompany.nationalId}</span>
                        </div>

                        {aiAnalysis && (
                          <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                            <div className="flex items-center gap-2">
                              <VariableBadge source="calculated" />
                              <span>نمره کلی AI</span>
                            </div>
                            <span className="font-bold text-lg">{aiAnalysis.overallScore || '-'}/10</span>
                          </div>
                        )}

                        {formData.proposed_investment_amount && (
                          <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <div className="flex items-center gap-2">
                              <VariableBadge source="form" />
                              <span>مبلغ پیشنهادی</span>
                            </div>
                            <span className="font-medium">{parseInt(formData.proposed_investment_amount).toLocaleString()} ریال</span>
                          </div>
                        )}

                        {formData.investment_structure && (
                          <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                            <div className="flex items-center gap-2">
                              <VariableBadge source="form" />
                              <span>ساختار</span>
                            </div>
                            <span className="font-medium">{formData.investment_structure}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Generate Button */}
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={generateReport}
                  disabled={loading || !selectedTemplate || !selectedCompany}
                >
                  {loading ? (
                    <>پردازش...</>
                  ) : (
                    <>
                      <Sparkles className="ml-2 h-4 w-4" />
                      تولید گزارش هوشمند
                    </>
                  )}
                </Button>
              </div>

              {/* Right Panel - Analysis & Form */}
              <div className="lg:col-span-2">
                <Tabs defaultValue="analysis" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="analysis">
                      <BarChart3 className="ml-2 h-4 w-4" />
                      تحلیل هوش مصنوعی
                    </TabsTrigger>
                    <TabsTrigger value="form">
                      <FileText className="ml-2 h-4 w-4" />
                      اطلاعات تکمیلی
                    </TabsTrigger>
                  </TabsList>

                  {/* AI Analysis Tab */}
                  <TabsContent value="analysis">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>نتایج تحلیل هوش مصنوعی</span>
                          {selectedCompany && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={fetchAIAnalysis}
                              disabled={loadingAnalysis}
                            >
                              {loadingAnalysis ? 'بارگذاری...' : 'بروزرسانی'}
                            </Button>
                          )}
                        </CardTitle>
                        <CardDescription>
                          تحلیل جامع از شرکت توسط هوش مصنوعی
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {!selectedCompany ? (
                          <div className="text-center py-12 text-gray-500">
                            <Building2 className="mx-auto h-12 w-12 mb-3 opacity-50" />
                            <p>ابتدا یک شرکت را انتخاب کنید</p>
                          </div>
                        ) : loadingAnalysis ? (
                          <div className="text-center py-12">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                            <p className="text-gray-600">در حال تحلیل با هوش مصنوعی...</p>
                          </div>
                        ) : aiAnalysis ? (
                          <div className="space-y-6">
                            {/* Overall Score */}
                            <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                              <div className="text-4xl font-bold text-primary mb-2">
                                {getOverallScore()}/10
                              </div>
                              <div className="text-sm text-gray-600">امتیاز کلی</div>
                              <Badge variant="default" className="mt-2">
                                {aiAnalysis.overallRecommendation?.recommendation || 'در انتظار تحلیل'}
                              </Badge>
                            </div>

                            <Separator />

                            {/* Score Breakdown */}
                            <div className="space-y-4">
                              {[
                                { key: 'teamAnalysis', label: 'تیم', icon: '👥' },
                                { key: 'productAnalysis', label: 'محصول', icon: '📦' },
                                { key: 'marketAnalysis', label: 'بازار', icon: '📊' },
                                { key: 'financialAnalysis', label: 'مالی', icon: '💰' },
                                { key: 'riskAnalysis', label: 'ریسک', icon: '⚠️' },
                              ].map(({ key, label, icon }) => {
                                const data = aiAnalysis[key as keyof AIAnalysis] as any;
                                const score = data?.score || 0;
                                
                                return (
                                  <div key={key}>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium flex items-center gap-2">
                                        <span>{icon}</span>
                                        {label}
                                      </span>
                                      <span className="text-sm font-bold">{score}/10</span>
                                    </div>
                                    <Progress value={score * 10} className="h-2" />
                                    {data?.summary && (
                                      <p className="text-xs text-gray-600 mt-1">{data.summary.substring(0, 100)}...</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-gray-500">
                            <AlertCircle className="mx-auto h-12 w-12 mb-3 opacity-50" />
                            <p>تحلیل هوش مصنوعی موجود نیست</p>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-3"
                              onClick={fetchAIAnalysis}
                            >
                              تحلیل جدید
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Form Tab */}
                  <TabsContent value="form">
                    <Card>
                      <CardHeader>
                        <CardTitle>اطلاعات تکمیلی گزارش</CardTitle>
                        <CardDescription>
                          اطلاعات اضافی که می‌خواهید در گزارش قرار گیرد
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label className="flex items-center gap-2">
                              مبلغ سرمایه‌گذاری پیشنهادی
                              <VariableBadge source="form" />
                            </Label>
                            <Input 
                              type="number"
                              placeholder="مبلغ پیشنهادی به ریال (مثال: 1000000000)"
                              value={formData.proposed_investment_amount || ''}
                              onChange={(e) => setFormData({ ...formData, proposed_investment_amount: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label className="flex items-center gap-2">
                              ساختار سرمایه‌گذاری
                              <VariableBadge source="form" />
                            </Label>
                            <Input 
                              placeholder="نوع سرمایه‌گذاری (مثال: 30% سهام، قرض‌الحسنه، مشارکت)"
                              value={formData.investment_structure || ''}
                              onChange={(e) => setFormData({ ...formData, investment_structure: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label className="flex items-center gap-2">
                              بازده مورد انتظار (%)
                              <VariableBadge source="form" />
                            </Label>
                            <Input 
                              type="number"
                              placeholder="نرخ بازده سالانه (مثال: 20)"
                              value={formData.expected_roi || ''}
                              onChange={(e) => setFormData({ ...formData, expected_roi: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label className="flex items-center gap-2">
                              مدت زمان سرمایه‌گذاری
                              <VariableBadge source="form" />
                            </Label>
                            <Input 
                              placeholder="مدت زمان (مثال: 5 سال، 36 ماه)"
                              value={formData.investment_duration || ''}
                              onChange={(e) => setFormData({ ...formData, investment_duration: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label className="flex items-center gap-2">
                              نظرات کارشناس
                              <VariableBadge source="form" />
                            </Label>
                            <Textarea 
                              rows={4}
                              placeholder="نظرات، توصیه‌ها و ارزیابی کارشناسی خود را بنویسید..."
                              value={formData.expert_comments || ''}
                              onChange={(e) => setFormData({ ...formData, expert_comments: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label className="flex items-center gap-2">
                              یادداشت‌های ویژه
                              <VariableBadge source="form" />
                            </Label>
                            <Textarea 
                              rows={3}
                              placeholder="یادداشت‌های داخلی و نکات مهم برای بررسی بعدی..."
                              value={formData.special_notes || ''}
                              onChange={(e) => setFormData({ ...formData, special_notes: e.target.value })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>

          {/* Template Selection Dialog */}
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh]" dir="rtl">
              <DialogHeader>
                <DialogTitle>انتخاب قالب گزارش</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input 
                  placeholder="جستجوی قالب..."
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                />
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer hover:bg-accent ${selectedTemplate?.id === template.id ? 'border-primary' : ''}`}
                      onClick={() => {
                        setSelectedTemplate(template);
                        setIsTemplateDialogOpen(false);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold">{template.name}</div>
                            <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {template.category}
                            </Badge>
                          </div>
                          {selectedTemplate?.id === template.id && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Company Selection Dialog */}
          <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh]" dir="rtl">
              <DialogHeader>
                <DialogTitle>انتخاب شرکت</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input 
                  placeholder="جستجوی شرکت..."
                  value={companySearchQuery}
                  onChange={(e) => setCompanySearchQuery(e.target.value)}
                />
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredCompanies.map((company) => (
                    <Card 
                      key={company.id}
                      className={`cursor-pointer hover:bg-accent ${selectedCompany?.id === company.id ? 'border-primary' : ''}`}
                      onClick={() => {
                        setSelectedCompany(company);
                        setIsCompanyDialogOpen(false);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold">{company.name}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              شناسه ملی: {company.nationalId}
                            </div>
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {company.status}
                            </Badge>
                          </div>
                          {selectedCompany?.id === company.id && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}


