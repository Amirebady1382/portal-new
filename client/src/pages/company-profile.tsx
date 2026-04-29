import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toPersianNumber, formatPersianCurrency } from "@/lib/persian-utils";
import DocumentUpload from "@/components/documents/document-upload";
import DocumentList from "@/components/documents/document-list";
import AIAnalysis from "@/components/analysis/ai-analysis";
import CompanyInfo from "@/components/company/company-info";
import CompanyInfoPanels from "@/components/company-info-panels";
import { 
  Building, 
  FileText, 
  TrendingUp,
  Users,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  DollarSign,
  Eye,
  Edit,
  Download,
  BarChart3
} from "lucide-react";

export default function CompanyProfile() {
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("overview");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams();

  // Get company ID from URL params
  const companyId = params.id ? parseInt(params.id) : 1;

  const { data: company, error } = useQuery({
    queryKey: ["/api/companies", companyId],
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["/api/companies", companyId, "documents"],
  });

  const { data: analysis } = useQuery({
    queryKey: ["/api/companies", companyId, "ai-analysis"],
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async (updateData: any) => {
      return apiRequest("PATCH", `/api/companies/${companyId}`, updateData);
    },
    onSuccess: () => {
      toast({
        title: "اطلاعات به‌روزرسانی شد",
        description: "اطلاعات شرکت با موفقیت به‌روزرسانی شد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا در به‌روزرسانی",
        description: error.message || "خطا در به‌روزرسانی اطلاعات",
        variant: "destructive",
      });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/companies/${companyId}/report`);
    },
    onSuccess: (data: any) => {
      // Create download link
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `company-${companyId}-report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "موفقیت",
        description: "گزارش با موفقیت تولید شد",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در تولید گزارش",
        variant: "destructive",
      });
    },
  });

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <MobileSidebar />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 md:mr-64 p-4 md:p-6">
            <div className="text-center py-12">
              <p className="text-red-600">خطا در بارگذاری اطلاعات: {(error as Error).message || 'خطای نامشخص'}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <MobileSidebar />
        
        <div className="flex pt-16">
          <Sidebar />
          
          <main className="flex-1 md:mr-64 p-4 md:p-6">
            <div className="flex items-center justify-center min-h-[400px]">
              <Button
                variant="outline"
                onClick={() => setLocation("/companies")}
                className="btn-hover"
              >
                بازگشت به فهرست شرکت‌ها
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">فعال</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">در انتظار تایید</Badge>;
      case "suspended":
        return <Badge className="bg-red-100 text-red-800">تعلیق</Badge>;
      case "rejected":
        return <Badge className="bg-gray-100 text-gray-800">رد شده</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const approvedDocs = (documents as any[]).filter((doc: any) => doc.status === "approved").length;
  const pendingDocs = (documents as any[]).filter((doc: any) => doc.status === "pending").length;
  const totalDocs = (documents as any[]).length;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-64 p-4 md:p-6 fade-in">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-text-primary mb-2">
                  {(company as any).name}
                </h1>
                <div className="flex items-center space-x-4 space-x-reverse">
                  {getStatusBadge((company as any).status)}
                  <span className="text-text-secondary">
                    شناسه ملی: <span className="number-font font-medium">{(company as any).nationalId}</span>
                  </span>
                </div>
              </div>
              <div className="flex space-x-2 space-x-reverse">
                <Button
                  variant="outline"
                  onClick={() => generateReportMutation.mutate()}
                  disabled={generateReportMutation.isPending}
                  className="btn-hover"
                >
                  <Download className="h-4 w-4 ml-1" />
                  {generateReportMutation.isPending ? "در حال تولید..." : "دانلود گزارش"}
                </Button>
                <Button className="btn-hover">
                  <Edit className="h-4 w-4 ml-1" />
                  ویرایش
                </Button>
              </div>
            </div>
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
                      {toPersianNumber(totalDocs)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">تایید شده</p>
                    <p className="text-2xl font-bold text-text-primary number-font">
                      {toPersianNumber(approvedDocs)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Eye className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">در انتظار</p>
                    <p className="text-2xl font-bold text-text-primary number-font">
                      {toPersianNumber(pendingDocs)}
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
                    <p className="text-sm text-text-secondary">امتیاز AI</p>
                    <p className="text-2xl font-bold text-text-primary number-font">
                      {(analysis as any)?.score ? toPersianNumber((analysis as any).score) : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">اطلاعات کلی</TabsTrigger>
              <TabsTrigger value="documents">اسناد</TabsTrigger>
              <TabsTrigger value="analysis">تحلیل هوشمند</TabsTrigger>
              <TabsTrigger value="financial">مالی</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                                  <CompanyInfo company={company as any} />
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">اطلاعات تماس</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(company as any).phone && (
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="number-font">{(company as any).phone}</span>
                      </div>
                    )}
                    {(company as any).email && (
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span>{(company as any).email}</span>
                      </div>
                    )}
                    {(company as any).website && (
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <Globe className="h-4 w-4 text-gray-500" />
                        <a href={(company as any).website} target="_blank" rel="noopener noreferrer" 
                           className="text-primary hover:underline">
                          {(company as any).website}
                        </a>
                      </div>
                    )}
                    {(company as any).address && (
                      <div className="flex items-start space-x-3 space-x-reverse">
                        <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                        <span className="text-sm">{(company as any).address}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">آمار سازمانی</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(company as any).establishedYear && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary">سال تاسیس:</span>
                        <span className="number-font font-medium">{(company as any).establishedYear}</span>
                      </div>
                    )}
                    {(company as any).employeeCount && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary">تعداد کارمند:</span>
                        <span className="number-font font-medium">{toPersianNumber((company as any).employeeCount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-text-secondary">نوع شرکت:</span>
                      <span className="font-medium">{(company as any).type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">تاریخ ثبت:</span>
                      <span className="number-font">{new Date((company as any).createdAt).toLocaleDateString('fa-IR')}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Company Info Panels */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-6">پنل‌های اطلاعاتی</h3>
              <CompanyInfoPanels company={company as any} companyId={companyId} />
            </div>
            </TabsContent>

            <TabsContent value="documents">
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>آپلود سند جدید</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DocumentUpload companyId={companyId} />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>وضعیت اسناد</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>تایید شده</span>
                        <Badge className="bg-green-100 text-green-800">
                          {toPersianNumber(approvedDocs)}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>در انتظار بررسی</span>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          {toPersianNumber(pendingDocs)}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>کل اسناد</span>
                        <Badge variant="outline">
                          {toPersianNumber(totalDocs)}
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${totalDocs > 0 ? (approvedDocs / totalDocs) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-text-secondary text-center">
                        {totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0}% تایید شده
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle>فهرست اسناد</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DocumentList companyId={companyId} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analysis">
              <AIAnalysis companyId={companyId} />
            </TabsContent>

            <TabsContent value="financial">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>اطلاعات مالی</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(company as any).capital && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary">سرمایه:</span>
                        <span className="number-font font-medium">
                          {formatPersianCurrency((company as any).capital)} ریال
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-text-secondary">وضعیت مالی:</span>
                      <Badge className="bg-blue-100 text-blue-800">قابل قبول</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">اعتبار:</span>
                      <span className="font-medium text-green-600">A+</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>نمودار عملکرد مالی</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-text-secondary">نمودار در دست توسعه</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}