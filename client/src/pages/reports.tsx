import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart3, TrendingUp, Users, Building, FileText, Download, Calendar, Plus, Edit } from "lucide-react";
import { toPersianNumber, formatPersianCurrency } from "@/lib/persian-utils";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<string>("general");
  const [dataEntryOpen, setDataEntryOpen] = useState(false);
  const [dataEntryType, setDataEntryType] = useState<string>("");

  // Fetch statistics from different endpoints
  const { data: investmentStats = {} } = useQuery({
    queryKey: ["/api/investment/stats"],
    enabled: selectedReport === "investment",
  });

  const { data: administrativeStats = {} } = useQuery({
    queryKey: ["/api/administrative/stats"],
    enabled: selectedReport === "administrative",
  });

  const { data: fundOverview = {} } = useQuery({
    queryKey: ["/api/fund/overview"],
    enabled: selectedReport === "fund",
  });

  const { data: generalReport = {} } = useQuery({
    queryKey: ["/api/reports", { type: "general" }],
    enabled: selectedReport === "general",
  });

  // Stats cards based on selected report
  const getStatsCards = () => {
    switch (selectedReport) {
      case "investment":
        return [
          { title: "شرکت‌های فعال", value: investmentStats.activeCompanies || 0, icon: Building, change: "+12%" },
          { title: "کل سرمایه‌گذاری", value: formatPersianCurrency(investmentStats.totalCapital || 0), icon: TrendingUp, change: "+8%" },
          { title: "اشتغال‌زایی", value: investmentStats.totalEmployees || 0, icon: Users, change: "+15%" },
          { title: "میانگین سرمایه", value: formatPersianCurrency(investmentStats.averageCapital || 0), icon: BarChart3, change: "+5%" },
        ];
      case "administrative":
        return [
          { title: "کل اسناد", value: administrativeStats.totalDocuments || 0, icon: FileText, change: "+20%" },
          { title: "در انتظار بررسی", value: administrativeStats.pendingDocuments || 0, icon: Calendar, change: "-5%" },
          { title: "نرخ پردازش", value: `${administrativeStats.processingRate || 0}%`, icon: TrendingUp, change: "+3%" },
          { title: "شرکت‌های فعال", value: administrativeStats.totalCompanies || 0, icon: Building, change: "+10%" },
        ];
      case "fund":
        const kpis = fundOverview.kpis || {};
        return [
          { title: "مبلغ تعهد شده", value: formatPersianCurrency(kpis.totalCommitted || 0), icon: TrendingUp, change: "+7%" },
          { title: "مبلغ سرمایه‌گذاری شده", value: formatPersianCurrency(kpis.totalInvested || 0), icon: BarChart3, change: "+12%" },
          { title: "شرکت‌های فعال", value: kpis.activeCompanies || 0, icon: Building, change: "+5%" },
          { title: "نرخ نکول", value: `${kpis.defaultRate || 0}%`, icon: Users, change: "-2%" },
        ];
      default:
        const summary = generalReport.summary || {};
        return [
          { title: "کل شرکت‌ها", value: summary.totalCompanies || 0, icon: Building, change: "+10%" },
          { title: "کل اسناد", value: summary.totalDocuments || 0, icon: FileText, change: "+15%" },
          { title: "کل کاربران", value: summary.totalUsers || 0, icon: Users, change: "+8%" },
          { title: "کاربران فعال", value: summary.activeUsers || 0, icon: TrendingUp, change: "+12%" },
        ];
    }
  };

  const stats = getStatsCards();

  // Available reports
  const reports = [
    {
      id: 1,
      title: "گزارش عملکرد ماهانه",
      description: "آمار کامل عملکرد صندوق در ماه جاری",
      type: "performance",
      date: new Date().toLocaleDateString('fa-IR'),
      category: "monthly"
    },
    {
      id: 2,
      title: "گزارش سرمایه‌گذاری",
      description: "تحلیل کامل سرمایه‌گذاری‌ها و بازدهی",
      type: "financial",
      date: new Date().toLocaleDateString('fa-IR'),
      category: "investment"
    },
    {
      id: 3,
      title: "گزارش پردازش اسناد",
      description: "آمار پردازش اسناد و مدارک شرکت‌ها",
      type: "quality",
      date: new Date().toLocaleDateString('fa-IR'),
      category: "administrative"
    },
  ];

  const handleDataEntry = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically send the data to your backend
    toast({
      title: "داده‌ها ذخیره شد",
      description: "اطلاعات با موفقیت ثبت گردید",
    });
    setDataEntryOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">گزارشات و تحلیل‌ها</h1>
                <p className="text-muted-foreground">مشاهده آمار و گزارشات سیستم</p>
              </div>
              <div className="flex gap-2">
                <Dialog open={dataEntryOpen} onOpenChange={setDataEntryOpen}>
                  <DialogTrigger asChild>
              <Button>
                      <Plus className="w-4 h-4 ml-2" />
                      ورود داده جدید
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>ورود داده‌های گزارش</DialogTitle>
                      <DialogDescription>
                        اطلاعات مورد نیاز برای گزارشات را وارد نمایید
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleDataEntry} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="report-type">نوع گزارش</Label>
                        <Select value={dataEntryType} onValueChange={setDataEntryType}>
                          <SelectTrigger id="report-type">
                            <SelectValue placeholder="انتخاب نوع گزارش" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="receivables">وصول مطالبات</SelectItem>
                            <SelectItem value="income-expense">درآمد و هزینه</SelectItem>
                            <SelectItem value="investment-commitment">تعهدات سرمایه‌گذاری</SelectItem>
                            <SelectItem value="default-rate">نرخ نکول</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {dataEntryType === "receivables" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="collected">مبلغ وصول شده</Label>
                            <Input id="collected" type="number" placeholder="مبلغ به ریال" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="pending">مبلغ در انتظار</Label>
                            <Input id="pending" type="number" placeholder="مبلغ به ریال" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="overdue">مبلغ معوق</Label>
                            <Input id="overdue" type="number" placeholder="مبلغ به ریال" />
                          </div>
                        </>
                      )}
                      
                      {dataEntryType === "income-expense" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="income">درآمد ماهانه</Label>
                            <Input id="income" type="number" placeholder="مبلغ به ریال" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="expense">هزینه ماهانه</Label>
                            <Input id="expense" type="number" placeholder="مبلغ به ریال" />
                          </div>
                        </>
                      )}
                      
                      {dataEntryType === "investment-commitment" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="committed">مبلغ تعهد شده</Label>
                            <Input id="committed" type="number" placeholder="مبلغ به ریال" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="invested">مبلغ سرمایه‌گذاری شده</Label>
                            <Input id="invested" type="number" placeholder="مبلغ به ریال" />
                          </div>
                        </>
                      )}
                      
                      {dataEntryType === "default-rate" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="rate">نرخ نکول (درصد)</Label>
                            <Input id="rate" type="number" step="0.1" placeholder="درصد" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="irr">میانگین IRR (درصد)</Label>
                            <Input id="irr" type="number" step="0.1" placeholder="درصد" />
                          </div>
                        </>
                      )}
                      
                      <Button type="submit" className="w-full">ذخیره اطلاعات</Button>
                    </form>
                  </DialogContent>
                </Dialog>
                
                <Button variant="outline">
                <Download className="w-4 h-4 ml-2" />
                دانلود گزارش جامع
              </Button>
              </div>
            </div>

            {stats.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <stat.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{
                        typeof stat.value === 'number' ? toPersianNumber(stat.value) : stat.value
                      }</div>
                      <p className="text-xs text-muted-foreground">
                        <span className={stat.change.startsWith('+') ? "text-green-600" : "text-red-600"}>
                          {stat.change}
                        </span> نسبت به ماه قبل
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="grid gap-4">
              <h2 className="text-xl font-semibold">گزارشات آماده</h2>
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{report.title}</CardTitle>
                        <CardDescription>{report.description}</CardDescription>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {report.date}
                          </span>
                          <Badge variant={
                            report.type === 'performance' ? 'default' :
                            report.type === 'financial' ? 'secondary' :
                            'outline'
                          }>
                            {report.type === 'performance' ? 'عملکردی' :
                             report.type === 'financial' ? 'مالی' :
                             'کیفیت'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setDataEntryType(report.category);
                            setDataEntryOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4 ml-2" />
                          ویرایش داده
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open(`/api/reports?type=${report.category}&format=pdf`, '_blank')}
                        >
                        <Download className="w-4 h-4 ml-2" />
                        دانلود
                      </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <Tabs value={selectedReport} onValueChange={setSelectedReport} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">عمومی</TabsTrigger>
                <TabsTrigger value="investment">سرمایه‌گذاری</TabsTrigger>
                <TabsTrigger value="administrative">اداری</TabsTrigger>
                <TabsTrigger value="fund">صندوق</TabsTrigger>
              </TabsList>
              
              <TabsContent value="general" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>آمار عمومی سیستم</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {generalReport.summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold">{toPersianNumber(generalReport.summary.totalCompanies || 0)}</p>
                            <p className="text-sm text-muted-foreground">کل شرکت‌ها</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{toPersianNumber(generalReport.summary.totalDocuments || 0)}</p>
                            <p className="text-sm text-muted-foreground">کل اسناد</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{toPersianNumber(generalReport.summary.totalUsers || 0)}</p>
                            <p className="text-sm text-muted-foreground">کل کاربران</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">{toPersianNumber(generalReport.summary.activeUsers || 0)}</p>
                            <p className="text-sm text-muted-foreground">کاربران فعال</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="investment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>گزارش واحد سرمایه‌گذاری</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {investmentStats.monthlyTrend && (
                      <div className="space-y-4">
                        <h3 className="font-medium">روند ماهانه سرمایه‌گذاری</h3>
                        {investmentStats.monthlyTrend.map((item: any) => (
                          <div key={item.month} className="flex justify-between items-center">
                            <span>{item.month}</span>
                            <div>
                              <span className="font-medium">{toPersianNumber(item.count)} شرکت - </span>
                              <span className="text-sm text-muted-foreground">{formatPersianCurrency(item.capital)}</span>
                            </div>
                          </div>
                        ))}
                </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="administrative" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>گزارش واحد اداری</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {administrativeStats.monthlyProcessing && (
                      <div className="space-y-4">
                        <h3 className="font-medium">پردازش ماهانه اسناد</h3>
                        {administrativeStats.monthlyProcessing.map((item: any) => (
                          <div key={item.month} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span>{item.month}</span>
                              <span className="text-sm">{toPersianNumber(item.total)} سند</span>
                            </div>
                            <div className="flex gap-1">
                              <div 
                                className="h-2 bg-green-500 rounded-r-full"
                                style={{ width: `${(item.approved / item.total) * 100}%` }}
                              />
                              <div 
                                className="h-2 bg-red-500 rounded-l-full"
                                style={{ width: `${(item.rejected / item.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="fund" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>گزارش وضعیت صندوق</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {fundOverview.receivables && (
                      <div className="space-y-4">
                        <h3 className="font-medium">وضعیت وصول مطالبات</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span>وصول شده</span>
                            <span className="font-medium text-green-600">{formatPersianCurrency(fundOverview.receivables.collected)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>در انتظار</span>
                            <span className="font-medium text-yellow-600">{formatPersianCurrency(fundOverview.receivables.pending)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>معوق</span>
                            <span className="font-medium text-red-600">{formatPersianCurrency(fundOverview.receivables.overdue)}</span>
                          </div>
                        </div>
                </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
