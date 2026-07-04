import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChartContainer, ChartTooltipContent, ChartLegendContent } from "@/components/ui/chart";
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart as ReAreaChart,
  Area,
} from "recharts";
import { DollarSign, TrendingUp, CheckCircle, BarChart as BarChartIcon, Plus, Edit } from "lucide-react";
import { formatPersianCurrency, toPersianNumber } from "@/lib/persian-utils";
import { useToast } from "@/hooks/use-toast";

export default function CompanyStatus() {
  const { toast } = useToast();
  const [dataEntryOpen, setDataEntryOpen] = useState(false);
  const [dataEntryType, setDataEntryType] = useState<string>("");
  
  // Fetch real data from API
  const { data } = useQuery({
    queryKey: ["/api/fund/overview"],
  });
  
  const fundData: any = data || {};

  // Extract data from API response
  const kpis = fundData.kpis || {};
  const receivablesData = fundData.receivables ? [
    { name: "وصول شده", value: fundData.receivables.collected },
    { name: "در انتظار", value: fundData.receivables.pending },
    { name: "معوق", value: fundData.receivables.overdue },
  ] : [];
  
  const resourcesOverTime = fundData.resourcesOverTime || [];
  const cumulativeCash = fundData.cashFlowTrend || [];
  const industryDistribution = fundData.industryDistribution || [];
  const overallFundStatus = fundData.fundStatus || [];

  const pieColors = ["#4ade80", "#fb923c", "#f87171"];

  // KPI cards data
  const kpiCards = [
    { id: 1, label: "مبلغ تعهد شده", value: kpis.totalCommitted || 0, icon: DollarSign, isCurrency: true },
    { id: 2, label: "مبلغ سرمایه‌گذاری شده", value: kpis.totalInvested || 0, icon: TrendingUp, isCurrency: true },
    { id: 3, label: "نرخ نکول", value: kpis.defaultRate || 0, icon: CheckCircle, unit: "%" },
    { id: 4, label: "میانگین IRR پیش‌بینی", value: kpis.averageIRR || 0, icon: TrendingUp, unit: "%" },
    { id: 5, label: "شرکت‌های فعال", value: kpis.activeCompanies || 0, icon: CheckCircle },
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
      <div className="flex pt-16">
        <Sidebar />
        <MobileSidebar />

        <main className="flex-1 mr-0 md:mr-72 p-4 lg:p-6 fade-in">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">
                وضعیت شرکت / صندوق
              </h1>
              <p className="text-text-secondary">
                گزارش لحظه‌ای از وضعیت وصول مطالبات، منابع و وضعیت کلی صندوق
              </p>
            </div>
            
            <Dialog open={dataEntryOpen} onOpenChange={setDataEntryOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 ml-2" />
                  ورود داده جدید
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>ورود داده‌های صندوق</DialogTitle>
                  <DialogDescription>
                    اطلاعات مورد نیاز برای گزارش وضعیت صندوق را وارد نمایید
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleDataEntry} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={dataEntryType === "kpi" ? "default" : "outline"}
                      onClick={() => setDataEntryType("kpi")}
                      className="w-full"
                    >
                      شاخص‌های کلیدی
                    </Button>
                    <Button
                      type="button"
                      variant={dataEntryType === "receivables" ? "default" : "outline"}
                      onClick={() => setDataEntryType("receivables")}
                      className="w-full"
                    >
                      وصول مطالبات
                    </Button>
                    <Button
                      type="button"
                      variant={dataEntryType === "cashflow" ? "default" : "outline"}
                      onClick={() => setDataEntryType("cashflow")}
                      className="w-full"
                    >
                      جریان نقدی
                    </Button>
                    <Button
                      type="button"
                      variant={dataEntryType === "income-expense" ? "default" : "outline"}
                      onClick={() => setDataEntryType("income-expense")}
                      className="w-full"
                    >
                      درآمد و هزینه
                    </Button>
                  </div>
                  
                  {dataEntryType === "kpi" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="committed">مبلغ تعهد شده (ریال)</Label>
                        <Input id="committed" type="number" placeholder="مبلغ به ریال" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="invested">مبلغ سرمایه‌گذاری شده (ریال)</Label>
                        <Input id="invested" type="number" placeholder="مبلغ به ریال" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="default-rate">نرخ نکول (درصد)</Label>
                        <Input id="default-rate" type="number" step="0.1" placeholder="درصد" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="irr">میانگین IRR (درصد)</Label>
                        <Input id="irr" type="number" step="0.1" placeholder="درصد" />
                      </div>
                    </>
                  )}
                  
                  {dataEntryType === "receivables" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="collected">مبلغ وصول شده (ریال)</Label>
                        <Input id="collected" type="number" placeholder="مبلغ به ریال" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pending">مبلغ در انتظار (ریال)</Label>
                        <Input id="pending" type="number" placeholder="مبلغ به ریال" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="overdue">مبلغ معوق (ریال)</Label>
                        <Input id="overdue" type="number" placeholder="مبلغ به ریال" />
                      </div>
                    </>
                  )}
                  
                  {dataEntryType === "cashflow" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="month">ماه</Label>
                        <Input id="month" type="text" placeholder="نام ماه" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cash">جریان نقد (میلیارد ریال)</Label>
                        <Input id="cash" type="number" step="0.1" placeholder="مبلغ به میلیارد ریال" />
                      </div>
                    </>
                  )}
                  
                  {dataEntryType === "income-expense" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="month-ie">ماه</Label>
                        <Input id="month-ie" type="text" placeholder="نام ماه" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="income">درآمد (میلیارد ریال)</Label>
                        <Input id="income" type="number" step="0.1" placeholder="مبلغ به میلیارد ریال" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expense">هزینه (میلیارد ریال)</Label>
                        <Input id="expense" type="number" step="0.1" placeholder="مبلغ به میلیارد ریال" />
                      </div>
                    </>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={!dataEntryType}>
                    ذخیره اطلاعات
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {kpiCards.map((k) => (
              <Card key={k.id} className="card-hover">
                <CardContent className="p-4 flex items-center gap-4">
                  <k.icon className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{k.label}</p>
                    <p className="font-bold text-lg">
                      {k.isCurrency ? formatPersianCurrency(k.value) :
                       k.unit ? `${toPersianNumber(k.value)}${k.unit}` : 
                       toPersianNumber(k.value)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Top charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Receivables Pie Chart */}
            <Card className="col-span-1">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" /> وضعیت وصول مطالبات
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDataEntryType("receivables");
                      setDataEntryOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {receivablesData.length > 0 ? (
                  <ChartContainer
                    config={{}}
                    className="h-64"
                  >
                    <PieChart>
                      <Pie
                        data={receivablesData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {receivablesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                        ))}
                      </Pie>
                      <ChartTooltipContent />
                      <ChartLegendContent payload={receivablesData.map((item, idx) => ({
                        value: item.name,
                        color: pieColors[idx % pieColors.length],
                      }))} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-text-secondary">
                    داده‌ای برای نمایش وجود ندارد
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resources Over Time */}
            <Card className="col-span-1 lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> رشد منابع در طول سال
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resourcesOverTime.length > 0 ? (
                  <ChartContainer config={{}} className="h-64">
                    <LineChart data={resourcesOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltipContent />
                      <Line type="monotone" dataKey="resources" stroke="#3182ce" strokeWidth={2} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-text-secondary">
                    داده‌ای برای نمایش وجود ندارد
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cumulative Cash Flow */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" /> جریان نقد تجمعی صندوق
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDataEntryType("cashflow");
                    setDataEntryOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {cumulativeCash.length > 0 ? (
                <ChartContainer config={{}} className="h-72">
                  <ReAreaChart data={cumulativeCash} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltipContent />
                    <Area type="monotone" dataKey="cash" stroke="#3b82f6" fill="#dbeafe" name="جریان نقد تجمعی (میلیارد ریال)" />
                  </ReAreaChart>
                </ChartContainer>
              ) : (
                <div className="h-72 flex items-center justify-center text-text-secondary">
                  داده‌ای برای نمایش وجود ندارد
                </div>
              )}
            </CardContent>
          </Card>

          {/* Industry Distribution */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChartIcon className="h-5 w-5" /> توزیع پرتفو به تفکیک صنعت و مرحله
              </CardTitle>
            </CardHeader>
            <CardContent>
              {industryDistribution.length > 0 ? (
                <ChartContainer config={{}} className="h-72">
                  <ReBarChart data={industryDistribution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="industry" />
                    <YAxis />
                    <ChartTooltipContent />
                    <Bar dataKey="seed" stackId="a" fill="#fcd34d" name="مرحله بذری" />
                    <Bar dataKey="growth" stackId="a" fill="#60a5fa" name="مرحله رشد" />
                    <ChartLegendContent />
                  </ReBarChart>
                </ChartContainer>
              ) : (
                <div className="h-72 flex items-center justify-center text-text-secondary">
                  داده‌ای برای نمایش وجود ندارد
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overall Fund Status */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" /> وضعیت درآمد و هزینه صندوق
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDataEntryType("income-expense");
                    setDataEntryOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {overallFundStatus.length > 0 ? (
                <ChartContainer config={{}} className="h-72">
                  <ReBarChart
                    data={overallFundStatus}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltipContent />
                    <Bar dataKey="income" fill="#4ade80" name="درآمد (میلیارد ریال)" />
                    <Bar dataKey="expense" fill="#f87171" name="هزینه (میلیارد ریال)" />
                    <ChartLegendContent verticalAlign="top" />
                  </ReBarChart>
                </ChartContainer>
              ) : (
                <div className="h-72 flex items-center justify-center text-text-secondary">
                  داده‌ای برای نمایش وجود ندارد
                </div>
              )}
            </CardContent>
          </Card>

          {/* Last Update */}
          {fundData.lastUpdate && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-text-secondary">
                آخرین بروزرسانی: {new Date(fundData.lastUpdate).toLocaleDateString('fa-IR')}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
} 
