import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toPersianNumber } from "@/lib/persian-utils";
import { 
  Settings, 
  FileText, 
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Clipboard,
  Download,
  BarChart3
} from "lucide-react";

export default function Administrative() {
  const [selectedTab, setSelectedTab] = useState("overview");

  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents", { department: "administrative" }],
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ["/api/document-requirements", { department: "administrative" }],
  });

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/administrative/stats"],
  });

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-64 p-4 md:p-6 fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              واحد اداری
            </h1>
            <p className="text-text-secondary">
              مدیریت امور اداری و مستندات شرکت‌ها
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">کل اسناد</p>
                    <p className="text-2xl font-bold text-text-primary number-font">
                      {toPersianNumber(stats.totalDocuments || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">در انتظار بررسی</p>
                    <p className="text-2xl font-bold text-text-primary number-font">
                      {toPersianNumber(stats.pendingDocuments || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">تایید شده</p>
                    <p className="text-2xl font-bold text-text-primary number-font">
                      {toPersianNumber(stats.approvedDocuments || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">شرکت‌های فعال</p>
                    <p className="text-2xl font-bold text-text-primary number-font">
                      {toPersianNumber(stats.totalCompanies || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">نمای کلی</TabsTrigger>
              <TabsTrigger value="documents">اسناد</TabsTrigger>
              <TabsTrigger value="requirements">الزامات</TabsTrigger>
              <TabsTrigger value="reports">گزارشات</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>وضعیت پردازش اسناد</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>نرخ پردازش</span>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <div className="w-32 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-green-500 rounded-full"
                              style={{ width: `${stats.processingRate || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm number-font">{toPersianNumber(stats.processingRate || 0)}%</span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm text-text-secondary mb-2">توزیع دسته‌بندی اسناد:</p>
                        {stats.categoryDistribution && Object.entries(stats.categoryDistribution).map(([category, count]) => (
                          <div key={category} className="flex justify-between items-center mb-2">
                            <span className="text-sm">{
                              category === "identity" ? "هویتی" :
                              category === "financial" ? "مالی" :
                              category === "legal" ? "حقوقی" :
                              category === "technical" ? "فنی" :
                              category === "administrative" ? "اداری" :
                              "سایر"
                            }</span>
                            <span className="text-sm number-font">{toPersianNumber(count as number)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>روند پردازش ماهانه</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stats.monthlyProcessing && stats.monthlyProcessing.map((month: any) => (
                        <div key={month.month} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">{month.month}</span>
                            <span className="text-sm number-font">{toPersianNumber(month.total)} سند</span>
                          </div>
                          <div className="flex gap-1">
                            <div 
                              className="h-2 bg-green-500 rounded-r-full"
                              style={{ width: `${(month.approved / month.total) * 100}%` }}
                            />
                            <div 
                              className="h-2 bg-red-500 rounded-l-full"
                              style={{ width: `${(month.rejected / month.total) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <span>تایید شده</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                        <span>رد شده</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>آمار عملکرد</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-text-primary number-font">
                          {stats.averageProcessingTime || "۲ روز"}
                        </p>
                        <p className="text-sm text-text-secondary">میانگین زمان پردازش</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600 number-font">
                          {toPersianNumber(stats.approvedDocuments || 0)}
                        </p>
                        <p className="text-sm text-text-secondary">اسناد تایید شده</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-red-600 number-font">
                          {toPersianNumber(stats.rejectedDocuments || 0)}
                        </p>
                        <p className="text-sm text-text-secondary">اسناد رد شده</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600 number-font">
                          {toPersianNumber(stats.pendingDocuments || 0)}
                        </p>
                        <p className="text-sm text-text-secondary">در انتظار بررسی</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>اسناد اخیر</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {documents.length === 0 ? (
                      <p className="text-center text-text-secondary py-8">
                        سندی یافت نشد
                      </p>
                    ) : (
                      documents.slice(0, 10).map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3 space-x-reverse">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium">{doc.originalName}</p>
                              <p className="text-sm text-text-secondary">
                                {doc.companyName} - {new Date(doc.uploadedAt).toLocaleDateString('fa-IR')}
                              </p>
                            </div>
                          </div>
                          <Badge className={
                            doc.status === "approved" ? "bg-green-100 text-green-800" :
                            doc.status === "rejected" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }>
                            {doc.status === "approved" ? "تایید شده" :
                             doc.status === "rejected" ? "رد شده" :
                             "در انتظار"}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requirements">
              <Card>
                <CardHeader>
                  <CardTitle>الزامات مستندات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">اسناد هویتی</h3>
                      <ul className="text-sm space-y-1 text-text-secondary">
                        <li>• کپی شناسنامه مدیرعامل</li>
                        <li>• کپی کارت ملی مدیرعامل</li>
                        <li>• تصویر روزنامه رسمی ثبت شرکت</li>
                      </ul>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">اسناد مالی</h3>
                      <ul className="text-sm space-y-1 text-text-secondary">
                        <li>• صورت‌های مالی حسابرسی شده</li>
                        <li>• گواهی عدم بدهی مالیاتی</li>
                        <li>• تراز آزمایشی شرکت</li>
                        <li>• اظهارنامه مالیاتی</li>
                      </ul>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-2">اسناد فنی</h3>
                      <ul className="text-sm space-y-1 text-text-secondary">
                        <li>• طرح کسب و کار (Business Plan)</li>
                        <li>• مطالعه امکان‌سنجی پروژه</li>
                        <li>• مجوزهای لازم از مراجع ذی‌صلاح</li>
                        <li>• گواهی‌نامه‌های استاندارد</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports">
              <Card>
                <CardHeader>
                  <CardTitle>گزارشات واحد اداری</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">گزارش ماهانه پردازش اسناد</h3>
                          <p className="text-sm text-text-secondary">آمار کامل پردازش اسناد در ماه جاری</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('/api/reports?type=administrative&format=pdf', '_blank')}
                        >
                          <Download className="h-4 w-4 ml-2" />
                          دانلود PDF
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">گزارش تطبیق مدارک</h3>
                          <p className="text-sm text-text-secondary">وضعیت تطبیق مدارک شرکت‌ها با الزامات</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('/api/reports?type=administrative&format=excel', '_blank')}
                        >
                          <Download className="h-4 w-4 ml-2" />
                          دانلود Excel
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">داشبورد آماری</h3>
                          <p className="text-sm text-text-secondary">نمایش زنده آمار و عملکرد واحد</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.location.href = '/admin/reports'}
                        >
                          <BarChart3 className="h-4 w-4 ml-2" />
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