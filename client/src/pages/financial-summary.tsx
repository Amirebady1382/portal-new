import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toPersianNumber, formatPersianCurrency } from "@/lib/persian-utils";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download
} from "lucide-react";

export default function FinancialSummary() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const companyId = parseInt(params.id || "0");

  // دریافت خلاصه مالی
  const { data: summaryData, isLoading, refetch } = useQuery({
    queryKey: [`/api/companies/${companyId}/financial-summary`],
    enabled: !!companyId,
  }) as any;

  // دریافت اطلاعات شرکت
  const { data: company } = useQuery({
    queryKey: [`/api/companies/${companyId}`],
    enabled: !!companyId,
  });

  const handleReprocess = async () => {
    try {
      await apiRequest("POST", `/api/companies/${companyId}/reprocess-tax-declaration`);
      toast({
        title: "پردازش مجدد شروع شد",
        description: "لطفاً چند لحظه صبر کنید...",
      });
      
      // Refresh after 5 seconds
      setTimeout(() => {
        refetch();
      }, 5000);
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در شروع پردازش مجدد",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <MobileSidebar />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 md:mr-64 p-4 md:p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-gray-200 rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg" />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!summaryData?.success) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <MobileSidebar />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 md:mr-64 p-4 md:p-6">
            <Card>
              <CardContent className="p-12 text-center">
                {summaryData?.status === 'processing' ? (
                  <>
                    <Clock className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
                    <h3 className="text-xl font-bold mb-2">در حال پردازش...</h3>
                    <p className="text-gray-600">اظهارنامه مالیاتی در حال پردازش است. لطفاً چند لحظه صبر کنید.</p>
                  </>
                ) : summaryData?.status === 'error' ? (
                  <>
                    <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">خطا در پردازش</h3>
                    <p className="text-gray-600 mb-4">{summaryData.error || 'خطای نامشخص'}</p>
                    <Button onClick={handleReprocess}>
                      <RefreshCw className="h-4 w-4 ml-2" />
                      پردازش مجدد
                    </Button>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">نیاز به اظهارنامه مالیاتی</h3>
                    <p className="text-gray-600">لطفاً ابتدا اظهارنامه مالیاتی را در بخش اسناد شرکت آپلود کنید.</p>
                  </>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  const data = summaryData.data;
  const metadata = data.metadata;
  const directItems = data.directItems;
  const keyRatios = data.keyRatios;
  const riskIndicators = data.riskIndicators;
  const supplementary = data.supplementary;

  // Helper functions
  const formatNumber = (num: number) => {
    if (num === 0) return '0';
    if (Math.abs(num) >= 1_000_000_000) {
      return `${toPersianNumber((num / 1_000_000_000).toFixed(1))} میلیارد`;
    }
    if (Math.abs(num) >= 1_000_000) {
      return `${toPersianNumber((num / 1_000_000).toFixed(1))} میلیون`;
    }
    return toPersianNumber(num.toLocaleString());
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  const getRiskColor = (score: number, higherIsBetter: boolean = true) => {
    if (higherIsBetter) {
      if (score > 2.6) return 'text-green-600 bg-green-50';
      if (score > 1.8) return 'text-yellow-600 bg-yellow-50';
      return 'text-red-600 bg-red-50';
    } else {
      if (score < 1) return 'text-green-600 bg-green-50';
      if (score < 2) return 'text-yellow-600 bg-yellow-50';
      return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-64 p-4 md:p-6 fade-in">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              بازگشت
            </Button>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-text-primary mb-2">
                  خلاصه مالی {metadata.companyName}
                </h1>
                <p className="text-text-secondary">
                  سال‌های مالی {toPersianNumber(metadata.fiscalYears[0])} و {toPersianNumber(metadata.fiscalYears[1])}
                </p>
                <Badge variant="outline" className="mt-2">
                  آخرین بروزرسانی: {new Date(summaryData.lastUpdated).toLocaleDateString('fa-IR')}
                </Badge>
              </div>
              
              <div className="flex space-x-2 space-x-reverse">
                <Button onClick={handleReprocess} variant="outline">
                  <RefreshCw className="h-4 w-4 ml-2" />
                  پردازش مجدد
                </Button>
                <Button>
                  <Download className="h-4 w-4 ml-2" />
                  دانلود گزارش
                </Button>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {metadata.warnings && metadata.warnings.length > 0 && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 ml-2 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-2">هشدارها:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {metadata.warnings.map((warning: string, i: number) => (
                        <li key={i}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Direct Items */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">اقلام مستقیم</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries({
                revenue: { label: 'فروش', icon: DollarSign, color: 'blue' },
                grossProfit: { label: 'سود ناخالص', icon: TrendingUp, color: 'green' },
                ebit: { label: 'سود عملیاتی (EBIT)', icon: TrendingUp, color: 'purple' },
                netProfit: { label: 'سود خالص', icon: TrendingUp, color: 'indigo' },
                totalAssets: { label: 'کل دارایی‌ها', icon: Building2, color: 'cyan' },
                totalLiabilities: { label: 'کل بدهی‌ها', icon: AlertTriangle, color: 'orange' },
                equity: { label: 'حقوق صاحبان سهام', icon: CheckCircle, color: 'teal' },
                financialExpenses: { label: 'هزینه‌های مالی', icon: DollarSign, color: 'red' },
              }).map(([key, config]) => {
                const item = directItems[key as keyof typeof directItems];
                const change = ((item.year2 - item.year1) / Math.abs(item.year1)) * 100;
                const Icon = config.icon;
                
                return (
                  <Card key={key}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-medium text-gray-600">{config.label}</h3>
                        <Icon className={`h-5 w-5 text-${config.color}-600`} />
                      </div>
                      
                      <div className="space-y-1">
                        <div>
                          <p className="text-xs text-gray-500">{toPersianNumber(metadata.fiscalYears[1])}</p>
                          <p className="text-lg font-bold number-font">{formatNumber(item.year2)}</p>
                        </div>
                        
                        <div className={`flex items-center text-sm ${getChangeColor(change)}`}>
                          {getChangeIcon(change)}
                          <span className="mr-1 number-font">
                            {change > 0 && '+'}{toPersianNumber(change.toFixed(1))}%
                          </span>
                          <span className="text-gray-400 text-xs mr-2">
                            ({formatNumber(item.year1)})
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Key Ratios */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">نسبت‌های کلیدی</h2>
            <Card>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '40%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                    </colgroup>
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-right py-3 px-4">نسبت</th>
                        <th className="text-center py-3 px-4">
                          <span className="number-font">{toPersianNumber(metadata.fiscalYears[0])}</span>
                        </th>
                        <th className="text-center py-3 px-4">
                          <span className="number-font">{toPersianNumber(metadata.fiscalYears[1])}</span>
                        </th>
                        <th className="text-center py-3 px-4">تغییر</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'currentRatio', label: 'نسبت جاری', suffix: '' },
                        { key: 'debtToEquity', label: 'نسبت بدهی به حقوق (D/E)', suffix: '' },
                        { key: 'equityRatio', label: 'نسبت مالکانه', suffix: '%' },
                        { key: 'netProfitMargin', label: 'حاشیه سود خالص', suffix: '%' },
                        { key: 'roe', label: 'بازده حقوق (ROE)', suffix: '%' },
                        { key: 'interestCoverage', label: 'نسبت پوشش بهره', suffix: '' },
                      ].map(({ key, label, suffix }) => {
                        const ratio = keyRatios[key as keyof typeof keyRatios];
                        if (typeof ratio === 'object' && 'year1' in ratio) {
                          const change = ratio.year2 - ratio.year1;
                          return (
                            <tr key={key} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium">{label}</td>
                              <td className="py-3 px-4 text-center">
                                <span className="number-font">{toPersianNumber(ratio.year1.toFixed(2))}{suffix}</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="number-font font-semibold">{toPersianNumber(ratio.year2.toFixed(2))}{suffix}</span>
                              </td>
                              <td className={`py-3 px-4 text-center ${getChangeColor(change)}`}>
                                <span className="number-font">{change > 0 && '+'}{toPersianNumber(change.toFixed(2))}{suffix}</span>
                              </td>
                            </tr>
                          );
                        }
                        return null;
                      })}
                      <tr className="border-b hover:bg-gray-50 font-semibold bg-blue-50">
                        <td className="py-3 px-4">رشد فروش</td>
                        <td className="py-3 px-4 text-center">-</td>
                        <td className="py-3 px-4 text-center">-</td>
                        <td className={`py-3 px-4 text-center ${getChangeColor(keyRatios.revenueGrowth)}`}>
                          <span className="number-font">{keyRatios.revenueGrowth > 0 && '+'}{toPersianNumber(keyRatios.revenueGrowth.toFixed(2))}%</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50 font-semibold bg-blue-50">
                        <td className="py-3 px-4">رشد سود خالص</td>
                        <td className="py-3 px-4 text-center">-</td>
                        <td className="py-3 px-4 text-center">-</td>
                        <td className={`py-3 px-4 text-center ${getChangeColor(keyRatios.netProfitGrowth)}`}>
                          <span className="number-font">{keyRatios.netProfitGrowth > 0 && '+'}{toPersianNumber(keyRatios.netProfitGrowth.toFixed(2))}%</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Indicators */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">شاخص‌های ریسک</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">امتیاز آلتمن (Z-Score)</h3>
                  <div className="space-y-2">
                    <div className={`text-3xl font-bold number-font p-3 rounded-lg ${getRiskColor(riskIndicators.altmanZScore.year2)}`}>
                      {toPersianNumber(riskIndicators.altmanZScore.year2.toFixed(2))}
                    </div>
                    <p className="text-xs text-gray-500">
                      {riskIndicators.altmanZScore.year2 > 2.6 ? '✅ امن' : 
                       riskIndicators.altmanZScore.year2 > 1.8 ? '⚠️ هشدار' : '❌ خطر'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">درجه اهرم مالی (DFL)</h3>
                  <div className="space-y-2">
                    <div className={`text-3xl font-bold number-font p-3 rounded-lg ${getRiskColor(riskIndicators.dfl.year2, false)}`}>
                      {toPersianNumber(riskIndicators.dfl.year2.toFixed(2))}
                    </div>
                    <p className="text-xs text-gray-500">
                      {riskIndicators.dfl.year2 < 1 ? '✅ کم ریسک' : 
                       riskIndicators.dfl.year2 < 2 ? '⚠️ متوسط' : '❌ پرریسک'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">نسبت بدهی خالص به EBITDA</h3>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold number-font p-3 rounded-lg bg-gray-50">
                      {toPersianNumber(riskIndicators.netDebtToEbitda.year2.toFixed(2))}
                    </div>
                    <p className="text-xs text-gray-500">
                      سال‌های بازپرداخت بدهی
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-3">اطمینان استخراج</h3>
                  <div className="space-y-2">
                    <div className={`text-3xl font-bold number-font p-3 rounded-lg ${
                      metadata.confidence > 80 ? 'text-green-600 bg-green-50' :
                      metadata.confidence > 60 ? 'text-yellow-600 bg-yellow-50' :
                      'text-red-600 bg-red-50'
                    }`}>
                      {toPersianNumber(metadata.confidence)}%
                    </div>
                    <p className="text-xs text-gray-500">
                      {metadata.confidence > 80 ? '✅ عالی' : 
                       metadata.confidence > 60 ? '⚠️ قابل قبول' : '❌ ضعیف'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Supplementary Metrics */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">موارد تکمیلی</h2>
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { key: 'grossMargin', label: 'حاشیه سود ناخالص', suffix: '%' },
                    { key: 'roa', label: 'بازده دارایی‌ها (ROA)', suffix: '%' },
                    { key: 'inventoryTurnover', label: 'گردش موجودی کالا', suffix: '' },
                    { key: 'retainedEarnings', label: 'سود انباشته', suffix: '' },
                    { key: 'quickRatio', label: 'نسبت آنی', suffix: '' },
                    { key: 'assetTurnover', label: 'گردش دارایی', suffix: '' },
                    { key: 'workingCapital', label: 'سرمایه در گردش', suffix: '' },
                    { key: 'depreciation', label: 'استهلاک', suffix: '' },
                  ].map(({ key, label, suffix }) => {
                    const item = supplementary[key as keyof typeof supplementary];
                    if (typeof item === 'object' && 'year1' in item) {
                      return (
                        <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">{label}</p>
                          <p className="text-lg font-bold number-font">
                            {suffix === '%' ? toPersianNumber(item.year2.toFixed(2)) : formatNumber(item.year2)}{suffix}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

