import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, RefreshCw, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";

export default function InvestmentReportGenerator() {
  const { toast } = useToast();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const { register, handleSubmit, reset } = useForm();

  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      return await apiRequest('GET', "/api/companies");
    }
  });

  const { data: companyRequests = [] } = useQuery({
    queryKey: ["/api/service-requests", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const res = await apiRequest("GET", `/api/service-requests?companyId=${selectedCompanyId}`);
      return res.json();
    },
    enabled: !!selectedCompanyId
  });

  const aggregateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/investment-reports/aggregate/${selectedCompanyId}/${selectedRequestId}`);
      if (!res.ok) throw new Error("خطا در دریافت اطلاعات");
      return res.json();
    },
    onSuccess: (data) => {
      setReportData(data);
      reset(data); // Populate form
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: any) => {
    setReportData(data);
    setShowPreview(true);
  };

  const handleDownloadExcel = () => {
    toast({ title: "در حال آماده‌سازی اکسل...", description: "این قابلیت به زودی در نسخه بعدی با استفاده از کتابخانه xlsx پیاده‌سازی کامل می‌شود." });

    // Fallback simple CSV export for MVP
    if (!reportData) return;

    let csvContent = "data:text/csv;charset=utf-8,\\uFEFF";
    csvContent += "شاخص,مقدار\\n";
    csvContent += `نام شرکت,${reportData.companyName || ''}\n`;
    csvContent += `شناسه ملی,${reportData.nationalId || ''}\n`;
    csvContent += `مبلغ درخواستی,${reportData.requestedAmount || ''}\n`;
    csvContent += `نوع خدمت,${reportData.serviceType || ''}\n`;
    csvContent += `ارزیاب,${reportData.evaluatorName || ''}\n`;
    csvContent += `ضامن,${reportData.guarantor || ''}\n`;
    csvContent += `سود خالص (۱۴۰۲),${reportData.netProfit_1402 || ''}\n`;
    csvContent += `فروش (۱۴۰۲),${reportData.sales_1402 || ''}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `report_${reportData.companyName || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    toast({ title: "آماده‌سازی برای چاپ...", description: "لطفاً از قابلیت Print مرورگر (Save as PDF) استفاده کنید." });
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="flex pt-16">
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          <div className="space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <FileText className="h-6 md:h-8 w-6 md:w-8" />
              پنل گزارش‌ساز سرمایه‌گذاری
            </h1>

            {!showPreview ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>انتخاب مورد</CardTitle>
                      <CardDescription>شرکت و درخواست را انتخاب کنید</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>شرکت</Label>
                        <Select
                          value={selectedCompanyId?.toString()}
                          onValueChange={(val) => {
                            setSelectedCompanyId(parseInt(val));
                            setSelectedRequestId(null);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="انتخاب شرکت..." />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((c: any) => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedCompanyId && (
                        <div>
                          <Label>درخواست/خدمت</Label>
                          <Select
                            value={selectedRequestId?.toString()}
                            onValueChange={(val) => setSelectedRequestId(parseInt(val))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="انتخاب درخواست..." />
                            </SelectTrigger>
                            <SelectContent>
                              {companyRequests.map((req: any) => (
                                <SelectItem key={req.id} value={req.id.toString()}>درخواست #{req.id} - {req.serviceName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button
                        onClick={() => aggregateMutation.mutate()}
                        disabled={!selectedCompanyId || !selectedRequestId || aggregateMutation.isPending}
                        className="w-full"
                      >
                        {aggregateMutation.isPending ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Zap className="ml-2 h-4 w-4" />}
                        تجمیع داده‌ها
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-2">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>فرم هوشمند گزارش</CardTitle>
                      <CardDescription>داده‌های استخراج شده را بررسی و تکمیل کنید</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {reportData ? (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>نام شرکت</Label>
                              <Input {...register("companyName")} />
                            </div>
                            <div>
                              <Label>شناسه ملی</Label>
                              <Input {...register("nationalId")} />
                            </div>
                            <div>
                              <Label>مبلغ درخواستی</Label>
                              <Input type="number" {...register("requestedAmount")} />
                            </div>
                            <div>
                              <Label>نوع خدمت</Label>
                              <Input {...register("serviceType")} />
                            </div>
                            {/* AI Extracted Fields Example */}
                            <div>
                              <Label>سود خالص (۱۴۰۲)</Label>
                              <Input type="number" {...register("netProfit_1402")} />
                            </div>
                            <div>
                              <Label>فروش (۱۴۰۲)</Label>
                              <Input type="number" {...register("sales_1402")} />
                            </div>
                            {/* Manual Fields */}
                            <div>
                              <Label>نام ارزیاب</Label>
                              <Input {...register("evaluatorName")} placeholder="وارد کنید..." />
                            </div>
                            <div>
                              <Label>ضامن</Label>
                              <Input {...register("guarantor")} placeholder="وارد کنید..." />
                            </div>
                          </div>
                          <Button type="submit" className="w-full">مشاهده پیش‌نمایش HTML</Button>
                        </form>
                      ) : (
                        <div className="text-center text-gray-500 py-10">ابتدا داده‌ها را تجمیع کنید.</div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>پیش‌نمایش گزارش ارزیابی</CardTitle>
                      <CardDescription>مشاهده قالب نهایی شبیه به اکسل</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setShowPreview(false)} variant="outline">بازگشت</Button>
                      <Button onClick={handleDownloadExcel} variant="default"><Download className="mr-2 h-4 w-4"/> دانلود اکسل</Button>
                      <Button onClick={handleDownloadPDF} variant="destructive"><Download className="mr-2 h-4 w-4"/> دانلود PDF</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto bg-white p-4 border rounded-md">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <tbody>
                        <tr className="bg-gray-100">
                          <td className="border border-gray-300 p-2 font-bold w-1/4">نام شرکت</td>
                          <td className="border border-gray-300 p-2">{reportData?.companyName}</td>
                          <td className="border border-gray-300 p-2 font-bold w-1/4">شناسه ملی</td>
                          <td className="border border-gray-300 p-2">{reportData?.nationalId}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2 font-bold">مبلغ درخواستی</td>
                          <td className="border border-gray-300 p-2">{reportData?.requestedAmount}</td>
                          <td className="border border-gray-300 p-2 font-bold">نوع خدمت</td>
                          <td className="border border-gray-300 p-2">{reportData?.serviceType}</td>
                        </tr>
                        <tr className="bg-gray-100">
                          <td className="border border-gray-300 p-2 font-bold">ارزیاب</td>
                          <td className="border border-gray-300 p-2">{reportData?.evaluatorName}</td>
                          <td className="border border-gray-300 p-2 font-bold">ضامن</td>
                          <td className="border border-gray-300 p-2">{reportData?.guarantor}</td>
                        </tr>
                      </tbody>
                    </table>

                    <h3 className="font-bold mt-6 mb-2">اطلاعات مالی استخراج شده</h3>
                    <table className="w-full border-collapse border border-gray-300 text-sm text-center">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border border-gray-300 p-2">شاخص</th>
                          <th className="border border-gray-300 p-2">۱۴۰۲</th>
                          <th className="border border-gray-300 p-2">۱۴۰۳</th>
                          <th className="border border-gray-300 p-2">۱۴۰۴ (پیش‌بینی)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 p-2 font-bold">سود خالص</td>
                          <td className="border border-gray-300 p-2">{reportData?.netProfit_1402}</td>
                          <td className="border border-gray-300 p-2">{reportData?.netProfit_1403}</td>
                          <td className="border border-gray-300 p-2">{reportData?.netProfit_1404}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 p-2 font-bold">فروش</td>
                          <td className="border border-gray-300 p-2">{reportData?.sales_1402}</td>
                          <td className="border border-gray-300 p-2">{reportData?.sales_1403}</td>
                          <td className="border border-gray-300 p-2">{reportData?.sales_1404}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

