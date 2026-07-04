import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { toPersianNumber } from "@/lib/persian-utils";
import { 
  Building, 
  FileText, 
  TrendingUp,
  Users,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  Shield,
  Briefcase,
  Target,
  DollarSign,
  UserCheck,
  Calendar,
  PieChart,
  Bot,
  MessageSquare,
  Bell
} from "lucide-react";

export default function CeoDashboard() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  // دریافت آمار کلی سیستم
  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  // دریافت لیست شرکت‌ها
  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies"],
  });

  // دریافت آمار سرمایه‌گذاری
  const { data: investmentStats } = useQuery({
    queryKey: ["/api/reports/investment-stats"],
  });

  // محاسبه آمارهای مهم برای مدیرعامل
  const activeCompanies = companies.filter((c: any) => c.status === 'active').length;
  const pendingCompanies = companies.filter((c: any) => c.status === 'pending').length;
  const totalInvestment = companies.reduce((sum: number, c: any) => {
    const financialInfo = c.financialInfo ? JSON.parse(c.financialInfo) : {};
    return sum + (financialInfo.totalInvestment || 0);
  }, 0);

  const calculateGrowth = () => {
    // محاسبه رشد ماهانه (این داده‌ها در واقعیت از API می‌آیند)
    return {
      companies: 15.5,
      investment: 23.8,
      users: 12.3
    };
  };

  const growth = calculateGrowth();

  const navigateToSection = (path: string) => {
    setLocation(`/ceo${path}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* عنوان صفحه */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                  پنل مدیریت عامل
                </h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                  خوش آمدید، {user?.fullName || 'مدیرعامل محترم'}
                </p>
              </div>
              <Badge variant="secondary" className="self-start sm:self-auto text-base sm:text-lg px-3 sm:px-4 py-1.5 sm:py-2">
                <Shield className="w-4 sm:w-5 h-4 sm:h-5 ml-2" />
                مدیرعامل
              </Badge>
            </div>

            {/* کارت‌های آمار کلیدی */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateToSection('/companies')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">شرکت‌های فعال</CardTitle>
                  <Building className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{toPersianNumber(activeCompanies)}</div>
                  <div className="flex items-center text-xs text-green-600 mt-2">
                    <TrendingUp className="h-3 w-3 ml-1" />
                    {toPersianNumber(growth.companies)}% رشد ماهانه
                  </div>
                  <Progress value={75} className="mt-2" />
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateToSection('/investment-overview')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">حجم سرمایه‌گذاری</CardTitle>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {toPersianNumber(Math.floor(totalInvestment / 1000000))} میلیارد
                  </div>
                  <div className="flex items-center text-xs text-green-600 mt-2">
                    <TrendingUp className="h-3 w-3 ml-1" />
                    {toPersianNumber(growth.investment)}% رشد ماهانه
                  </div>
                  <Progress value={85} className="mt-2" />
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateToSection('/pending-approvals')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">در انتظار تأیید</CardTitle>
                  <Clock className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{toPersianNumber(pendingCompanies)}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    درخواست جدید از هفته گذشته
                  </p>
                  <Progress value={35} className="mt-2" />
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateToSection('/performance')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">عملکرد کلی</CardTitle>
                  <Activity className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">%{toPersianNumber(92)}</div>
                  <p className="text-xs text-green-600 mt-2">
                    عملکرد عالی
                  </p>
                  <Progress value={92} className="mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* بخش گزارشات تحلیلی */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">نمای کلی</TabsTrigger>
                <TabsTrigger value="investment">سرمایه‌گذاری</TabsTrigger>
                <TabsTrigger value="performance">عملکرد واحدها</TabsTrigger>
                <TabsTrigger value="ai-insights">تحلیل هوش مصنوعی</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {/* نمودار وضعیت شرکت‌ها */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <PieChart className="h-5 w-5 ml-2" />
                        وضعیت شرکت‌ها
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full ml-2" />
                            <span>فعال</span>
                          </div>
                          <span className="font-bold">{toPersianNumber(activeCompanies)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full ml-2" />
                            <span>در انتظار</span>
                          </div>
                          <span className="font-bold">{toPersianNumber(pendingCompanies)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded-full ml-2" />
                            <span>غیرفعال</span>
                          </div>
                          <span className="font-bold">{toPersianNumber(3)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* گزارش فعالیت‌های اخیر */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Clock className="h-5 w-5 ml-2" />
                        فعالیت‌های اخیر
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span>شرکت نوآوران گیلان ثبت شد</span>
                          <Badge variant="secondary">امروز</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>قرارداد سرمایه‌گذاری جدید</span>
                          <Badge variant="secondary">دیروز</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>تحلیل AI برای ۳ شرکت</span>
                          <Badge variant="secondary">۲ روز پیش</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>گزارش مالی فصلی تولید شد</span>
                          <Badge variant="secondary">هفته گذشته</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="investment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Briefcase className="h-5 w-5 ml-2" />
                      وضعیت سرمایه‌گذاری‌ها
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{toPersianNumber(25)}</div>
                        <p className="text-sm text-muted-foreground">پروژه فعال</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{toPersianNumber(18)}</div>
                        <p className="text-sm text-muted-foreground">پروژه موفق</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold">%{toPersianNumber(78)}</div>
                        <p className="text-sm text-muted-foreground">نرخ بازگشت سرمایه</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {/* عملکرد واحد سرمایه‌گذاری */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="h-5 w-5 ml-2" />
                        واحد سرمایه‌گذاری
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">پردازش درخواست‌ها</span>
                          <div className="flex items-center">
                            <Progress value={85} className="w-20 ml-2" />
                            <span className="text-sm font-bold">%{toPersianNumber(85)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">رضایت مشتریان</span>
                          <div className="flex items-center">
                            <Progress value={92} className="w-20 ml-2" />
                            <span className="text-sm font-bold">%{toPersianNumber(92)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">تحقق اهداف</span>
                          <div className="flex items-center">
                            <Progress value={78} className="w-20 ml-2" />
                            <span className="text-sm font-bold">%{toPersianNumber(78)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* عملکرد واحد اداری */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Shield className="h-5 w-5 ml-2" />
                        واحد اداری
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">پردازش اسناد</span>
                          <div className="flex items-center">
                            <Progress value={90} className="w-20 ml-2" />
                            <span className="text-sm font-bold">%{toPersianNumber(90)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">زمان پاسخ‌دهی</span>
                          <div className="flex items-center">
                            <Progress value={88} className="w-20 ml-2" />
                            <span className="text-sm font-bold">%{toPersianNumber(88)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">دقت عملیات</span>
                          <div className="flex items-center">
                            <Progress value={95} className="w-20 ml-2" />
                            <span className="text-sm font-bold">%{toPersianNumber(95)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="ai-insights" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bot className="h-5 w-5 ml-2" />
                      تحلیل‌های هوش مصنوعی
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="font-semibold mb-2">🎯 پیش‌بینی رشد</h4>
                        <p className="text-sm">
                          بر اساس تحلیل داده‌ها، پیش‌بینی می‌شود حجم سرمایه‌گذاری در ۳ ماه آینده {toPersianNumber(35)}% رشد داشته باشد.
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <h4 className="font-semibold mb-2">💡 توصیه استراتژیک</h4>
                        <p className="text-sm">
                          تمرکز بر شرکت‌های حوزه فناوری اطلاعات می‌تواند بازدهی سرمایه‌گذاری را تا {toPersianNumber(20)}% افزایش دهد.
                        </p>
                      </div>
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <h4 className="font-semibold mb-2">⚠️ هشدار ریسک</h4>
                        <p className="text-sm">
                          {toPersianNumber(3)} شرکت نیاز به بازبینی وضعیت مالی دارند. پیشنهاد می‌شود جلسه با مدیران آنها برگزار شود.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* دسترسی‌های سریع */}
            <Card>
              <CardHeader>
                <CardTitle>دسترسی سریع</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-auto flex flex-col items-center justify-center py-3 sm:py-4 text-xs sm:text-sm"
                    onClick={() => navigateToSection('/reports')}
                  >
                    <BarChart3 className="h-6 sm:h-8 w-6 sm:w-8 mb-1 sm:mb-2" />
                    <span className="text-center">گزارشات مدیریتی</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto flex flex-col items-center justify-center py-3 sm:py-4 text-xs sm:text-sm"
                    onClick={() => navigateToSection('/ai-analysis')}
                  >
                    <Bot className="h-6 sm:h-8 w-6 sm:w-8 mb-1 sm:mb-2" />
                    <span className="text-center">تحلیل AI</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto flex flex-col items-center justify-center py-3 sm:py-4 text-xs sm:text-sm"
                    onClick={() => navigateToSection('/strategic-planning')}
                  >
                    <Target className="h-6 sm:h-8 w-6 sm:w-8 mb-1 sm:mb-2" />
                    <span className="text-center">برنامه‌ریزی استراتژیک</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto flex flex-col items-center justify-center py-3 sm:py-4 text-xs sm:text-sm"
                    onClick={() => navigateToSection('/messages')}
                  >
                    <MessageSquare className="h-6 sm:h-8 w-6 sm:w-8 mb-1 sm:mb-2" />
                    <span className="text-center">پیام‌ها و اعلانات</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

