import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toPersianNumber, formatPersianCurrency } from "@/lib/persian-utils";
import { 
  TrendingUp, 
  DollarSign, 
  Users,
  Building,
  PieChart,
  BarChart3,
  Activity,
  Download
} from "lucide-react";

export default function Investment() {
  const [selectedTab, setSelectedTab] = useState("overview");

  const { data: companies = [] } = useQuery<any>({
    queryKey: ["/api/companies", { department: "investment" }],
  });

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/investment/stats"],
  });

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              واحد سرمایه‌گذاری
            </h1>
            <p className="text-text-secondary">
              مدیریت سرمایه‌گذاری‌ها و پروژه‌های تحت پوشش صندوق
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">شرکت‌های فعال</p>
                    <p className="text-2xl font-bold text-text-primary number-font">
                      {toPersianNumber(stats.activeCompanies || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">کل سرمایه‌گذاری</p>
                    <p className="text-xl font-bold text-text-primary number-font">
                      {formatPersianCurrency(stats.totalCapital || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">میانگین سرمایه</p>
                    <p className="text-xl font-bold text-text-primary number-font">
                      {formatPersianCurrency(stats.averageCapital || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">اشتغال‌زایی</p>
                    <p className="text-2xl font-bold text-text-primary number-font">
                      {toPersianNumber(stats.totalEmployees || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">نمای کلی</TabsTrigger>
              <TabsTrigger value="companies">شرکت‌ها</TabsTrigger>
              <TabsTrigger value="analytics">تحلیل‌ها</TabsTrigger>
              <TabsTrigger value="reports">گزارشات</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>توزیع سرمایه‌گذاری‌ها</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {stats.sectorDistribution && Object.entries(stats.sectorDistribution).map(([sector, count]) => {
                        const percentage = Math.round(((count as number) / stats.totalCompanies) * 100);
                        return (
                          <div key={sector} className="flex justify-between items-center">
                            <span>{sector}</span>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <div className="w-32 h-2 bg-gray-200 rounded-full">
                                <div 
                                  className="h-2 bg-blue-500 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm number-font">{toPersianNumber(percentage)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>روند سرمایه‌گذاری ماهانه</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.monthlyTrend && stats.monthlyTrend.map((month: any) => (
                        <div key={month.month} className="flex justify-between items-center">
                          <span className="text-sm">{month.month}</span>
                          <div className="text-left">
                            <p className="text-sm font-medium">
                              {toPersianNumber(month.count)} شرکت
                            </p>
                            <p className="text-xs text-text-secondary">
                              {formatPersianCurrency(month.capital)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="companies">
              <Card>
                <CardHeader>
                  <CardTitle>لیست شرکت‌های سرمایه‌گذاری</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {companies.length === 0 ? (
                      <p className="text-center text-text-secondary py-8">
                        شرکتی یافت نشد
                      </p>
                    ) : (
                      companies.map((company: any) => (
                        <div key={company.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg mb-2">{company.name}</h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-text-secondary">سرمایه: </span>
                                  <span className="font-medium">{formatPersianCurrency(company.capital || 0)}</span>
                                </div>
                                <div>
                                  <span className="text-text-secondary">کارکنان: </span>
                                  <span className="number-font">{toPersianNumber(company.employeeCount || 0)}</span>
                                </div>
                                <div>
                                  <span className="text-text-secondary">شهر: </span>
                                  <span>{company.city}</span>
                                </div>
                              </div>
                            </div>
                            <Badge 
                              className={company.status === "active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                            >
                              {company.status === "active" ? "فعال" : "در انتظار"}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-5 w-5 ml-2" />
                      نمودار عملکرد
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-text-secondary">
                      {stats.monthlyTrend && stats.monthlyTrend.length > 0 ? (
                        <div className="w-full">
                          <p className="text-sm mb-4">تعداد شرکت‌های جدید در هر ماه:</p>
                          {stats.monthlyTrend.map((item: any) => (
                            <div key={item.month} className="flex items-center gap-2 mb-2">
                              <span className="text-xs w-20">{item.month}:</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-4">
                                <div 
                                  className="bg-blue-500 h-4 rounded-full"
                                  style={{ width: `${(item.count / Math.max(...stats.monthlyTrend.map((m: any) => m.count))) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs number-font">{toPersianNumber(item.count)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>داده‌ای برای نمایش وجود ندارد</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChart className="h-5 w-5 ml-2" />
                      توزیع بخش‌ها
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-text-secondary">
                      {stats.sectorDistribution && Object.keys(stats.sectorDistribution).length > 0 ? (
                        <div className="w-full space-y-2">
                          {Object.entries(stats.sectorDistribution).map(([sector, count]) => {
                            const percentage = Math.round(((count as number) / stats.totalCompanies) * 100);
                            return (
                              <div key={sector} className="flex items-center justify-between">
                                <span className="text-sm">{sector}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-gray-200 rounded-full h-3">
                                    <div 
                                      className="bg-purple-500 h-3 rounded-full"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="text-xs number-font">{toPersianNumber(count as number)} ({toPersianNumber(percentage)}%)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p>داده‌ای برای نمایش وجود ندارد</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>گزارشات تخصصی</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">گزارش ماهانه عملکرد</h3>
                          <p className="text-sm text-text-secondary">آمار کامل سرمایه‌گذاری‌های ماه جاری</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('/api/reports?type=investment&format=pdf', '_blank')}
                        >
                          <Download className="h-4 w-4 ml-2" />
                          دانلود PDF
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">تحلیل ریسک پورتفولیو</h3>
                          <p className="text-sm text-text-secondary">ارزیابی ریسک‌های موجود در سرمایه‌گذاری‌ها</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('/api/reports?type=investment&format=excel', '_blank')}
                        >
                          <Download className="h-4 w-4 ml-2" />
                          دانلود Excel
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">پیش‌بینی بازدهی</h3>
                          <p className="text-sm text-text-secondary">تحلیل و پیش‌بینی بازدهی پروژه‌های آتی</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.location.href = '/admin/reports'}
                        >
                          مشاهده آنلاین
                        </Button>
                      </div>
                    </div>

                    {/* آمار زنده */}
                    {stats.lastUpdate && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-text-secondary">
                          آخرین بروزرسانی: {new Date(stats.lastUpdate).toLocaleDateString('fa-IR')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
