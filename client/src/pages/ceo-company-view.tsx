import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { toPersianNumber } from "@/lib/persian-utils";
import { 
  Building, 
  FileText, 
  TrendingUp,
  Download,
  Eye,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
  DollarSign,
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  FileCheck,
  Briefcase,
  BarChart3,
  ArrowLeft,
  Activity,
  Target,
  Package
} from "lucide-react";

interface CompanyService {
  id: number;
  serviceId: number;
  companyId: number;
  serviceTitle: string;
  serviceDescription: string | null;
  serviceDepartment: 'investment' | 'administrative';
  serviceIcon: string | null;
  estimatedDays: number | null;
  isActive: boolean;
  activatedAt: string;
  activatedBy: number | null;
  activatedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: number;
  originalName: string;
  category: string;
  status: string;
  createdAt: string;
  mimeType?: string;
}

interface Company {
  id: number;
  name: string;
  nationalId: string;
  type: string;
  status: string;
  registrationNumber?: string;
  registrationDate?: string;
  capital?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  employeeCount?: number;
  description?: string;
}

export default function CeoCompanyView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  // دریافت اطلاعات شرکت
  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: [`/api/companies/${id}`],
    enabled: !!id,
  });

  // دریافت اسناد شرکت
  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: [`/api/companies/${id}/documents`],
    enabled: !!id,
  });

  // دریافت فرم‌های ارسالی
  const { data: formSubmissions = [] } = useQuery({
    queryKey: [`/api/companies/${id}/form-submissions`],
    enabled: !!id,
  });

  // دریافت گفتگوها
  const { data: conversations = [] } = useQuery({
    queryKey: [`/api/companies/${id}/conversations`],
    enabled: !!id,
  });

  // دریافت خدمات اختصاص یافته به شرکت
  const { data: companyServicesData } = useQuery({
    queryKey: [`/api/companies/${id}/services`],
    queryFn: async () => {
      if (!id) return { services: [] };
      const response = await apiRequest("GET", `/api/companies/${id}/services?isActive=true`);
      return response.json();
    },
    enabled: !!id
  });

  const services = (companyServicesData?.services || []) as CompanyService[];
  
  // دسته‌بندی خدمات بر اساس وضعیت
  const completedServices = services.filter(s => s.isActive && s.activatedAt);
  const inProgressServices = services.filter(s => s.isActive && !s.activatedAt);
  const requestedServices = services.filter(s => !s.isActive);

  // محاسبه مجموع مالی (در حال حاضر API فیلد amount ندارد، پس 0 می‌ماند)
  const totalInvestment = 0;
  const totalAdministrative = 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return <Badge className="bg-green-500">فعال</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">در انتظار</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500">معلق</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getServiceStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 ml-1" />تکمیل شده</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 ml-1" />در حال انجام</Badge>;
      case 'requested':
        return <Badge className="bg-orange-500"><AlertCircle className="w-3 h-3 ml-1" />درخواست شده</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleViewDocument = (doc: any) => {
    window.open(`/api/documents/${doc.id}/download`, '_blank');
  };

  if (companyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 border-4 mx-auto mb-4"></div>
          <p>در حال بارگذاری اطلاعات شرکت...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>شرکت مورد نظر یافت نشد</p>
          <Button onClick={() => setLocation("/ceo/companies")} className="mt-4">
            بازگشت به لیست شرکت‌ها
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/ceo/companies")}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  بازگشت
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Building className="w-6 h-6" />
                    {company.name}
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    شناسه ملی: {toPersianNumber(company.nationalId)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(company.status)}
                <Badge variant="outline">
                  {company.type}
                </Badge>
              </div>
            </div>

            {/* آمار کلیدی */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    کل خدمات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{toPersianNumber(services.length)}</div>
                  <Progress value={services.length > 0 ? (completedServices.length / services.length) * 100 : 0} className="mt-2" />
                  <p className="text-xs text-gray-600 mt-1">
                    {toPersianNumber(completedServices.length)} تکمیل شده
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    سرمایه‌گذاری
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {toPersianNumber(Math.floor(totalInvestment / 1000000))} میلیون
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {toPersianNumber(services.filter((s: CompanyService) => s.serviceDepartment === 'investment').length)} خدمت
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    امور اداری
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {toPersianNumber(Math.floor(totalAdministrative / 1000000))} میلیون
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {toPersianNumber(services.filter((s: CompanyService) => s.serviceDepartment === 'administrative').length)} خدمت
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-600" />
                    اسناد
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{toPersianNumber(documents.length)}</div>
                  <p className="text-xs text-gray-600 mt-1">
                    {toPersianNumber(documents.filter((d: Document) => d.status === 'approved').length)} تأیید شده
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* تب‌ها */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">اطلاعات شرکت</TabsTrigger>
                <TabsTrigger value="services">خدمات</TabsTrigger>
                <TabsTrigger value="documents">مدارک</TabsTrigger>
                <TabsTrigger value="reports">گزارشات</TabsTrigger>
              </TabsList>

              {/* تب اطلاعات شرکت */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>اطلاعات پایه</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">نام شرکت:</span>
                        <span className="font-medium">{company.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">شماره ثبت:</span>
                        <span className="font-medium">{toPersianNumber(company.registrationNumber || '-')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">تاریخ ثبت:</span>
                        <span className="font-medium">{company.registrationDate || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">سرمایه ثبتی:</span>
                        <span className="font-medium">{company.capital || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">تعداد کارکنان:</span>
                        <span className="font-medium">{toPersianNumber(company.employeeCount || 0)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>اطلاعات تماس</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{company.address || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{toPersianNumber(company.phone || '-')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{company.email || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{company.website || '-'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* تب خدمات */}
              <TabsContent value="services" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <Card className="bg-green-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">خدمات تکمیل شده</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {toPersianNumber(completedServices.length)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">در حال انجام</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">
                        {toPersianNumber(inProgressServices.length)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">درخواست‌های جدید</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-orange-600">
                        {toPersianNumber(requestedServices.length)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>لیست خدمات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {services.map((service: CompanyService) => (
                        <div key={service.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{service.serviceTitle}</h4>
                                {service.isActive ? (
                                  <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 ml-1" />فعال</Badge>
                                ) : (
                                  <Badge className="bg-gray-500"><Clock className="w-3 h-3 ml-1" />غیرفعال</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{service.serviceDescription}</p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {service.activatedAt ? new Date(service.activatedAt).toLocaleDateString('fa-IR') : '-'}
                                </span>
                                <span className="flex items-center gap-1">
                                  {service.serviceDepartment === 'investment' ? (
                                    <TrendingUp className="w-3 h-3" />
                                  ) : (
                                    <Shield className="w-3 h-3" />
                                  )}
                                  {service.serviceDepartment === 'investment' ? 'سرمایه‌گذاری' : 'اداری'}
                                </span>
                                {service.estimatedDays && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {toPersianNumber(service.estimatedDays)} روز
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* تب مدارک */}
              <TabsContent value="documents" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>اسناد و مدارک</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {documents.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents.map((doc: Document) => (
                          <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-2">
                              <FileText className="w-5 h-5 text-blue-600" />
                              <Badge variant={doc.status === 'approved' ? 'default' : 'secondary'}>
                                {doc.status === 'approved' ? 'تأیید شده' : 'در انتظار'}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-sm mb-1">{doc.originalName}</h4>
                            <p className="text-xs text-gray-600 mb-2">{doc.category}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">
                                {new Date(doc.createdAt).toLocaleDateString('fa-IR')}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewDocument(doc)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-8">هیچ سندی آپلود نشده است</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* تب گزارشات */}
              <TabsContent value="reports" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        خلاصه عملکرد
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>مجموع خدمات دریافتی</span>
                        <span className="font-bold">{toPersianNumber(services.length)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>نرخ تکمیل خدمات</span>
                        <div className="flex items-center gap-2">
                          <Progress value={services.length > 0 ? (completedServices.length / services.length) * 100 : 0} className="w-20" />
                          <span className="font-bold">%{toPersianNumber(services.length > 0 ? Math.round((completedServices.length / services.length) * 100) : 0)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>میانگین زمان پاسخ</span>
                        <span className="font-bold">{toPersianNumber(2)} روز</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        آمار مالی
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>کل سرمایه‌گذاری</span>
                        <span className="font-bold text-green-600">
                          {toPersianNumber(Math.floor(totalInvestment / 1000000))} میلیون تومان
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>خدمات اداری</span>
                        <span className="font-bold text-blue-600">
                          {toPersianNumber(Math.floor(totalAdministrative / 1000000))} میلیون تومان
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>مجموع</span>
                        <span className="font-bold text-purple-600">
                          {toPersianNumber(Math.floor((totalInvestment + totalAdministrative) / 1000000))} میلیون تومان
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>توصیه‌های مدیریتی</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium mb-1 flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-600" />
                          فرصت‌های رشد
                        </h4>
                        <p className="text-sm text-gray-700">
                          این شرکت پتانسیل دریافت تسهیلات بیشتر در حوزه توسعه محصول را دارد.
                        </p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <h4 className="font-medium mb-1 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          نقاط قوت
                        </h4>
                        <p className="text-sm text-gray-700">
                          سابقه عملکرد عالی در بازپرداخت تسهیلات و اجرای پروژه‌ها
                        </p>
                      </div>
                    </div>
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

