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

interface Service {
  id: string;
  name: string;
  status: 'completed' | 'in_progress' | 'requested';
  date: string;
  department: 'investment' | 'administrative';
  amount?: number;
  description?: string;
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

export default function AdminCompanyView() {
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
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
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
    queryKey: [`/api/conversations/company/${id}`],
    enabled: !!id,
  });

  // دریافت خدمات اختصاص یافته به شرکت
  const { data: companyServicesData } = useQuery({
    queryKey: [`/api/companies/${id}/services`],
    queryFn: async () => {
      if (!id) return { services: [] };
      const response = await apiRequest("GET", `/api/companies/${id}/services`);
      return response.json();
    },
    enabled: !!id
  });

  const services = companyServicesData?.services || [];
  const completedServices = services.filter((s: any) => s.status === 'completed').length;
  const inProgressServices = services.filter((s: any) => s.status === 'in_progress' || s.status === 'pending').length;
  const requestedServices = services.filter((s: any) => s.status === 'requested').length;
  const totalServices = services.length;
  const progressPercentage = totalServices > 0 ? (completedServices / totalServices) * 100 : 0;

  const investmentServices = services.filter((s: any) => s.serviceDepartment === 'investment');
  const administrativeServices = services.filter((s: any) => s.serviceDepartment === 'administrative');

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
      case 'pending':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 ml-1" />در حال انجام</Badge>;
      case 'requested':
        return <Badge className="bg-orange-500"><AlertCircle className="w-3 h-3 ml-1" />درخواست شده</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <Card className="p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">شرکت یافت نشد</h2>
          <p className="text-gray-600 mb-4">اطلاعات شرکت مورد نظر در دسترس نیست.</p>
          <Button onClick={() => setLocation('/admin/companies')}>
            بازگشت به لیست شرکت‌ها
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          {/* Header Section */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/admin/companies')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                بازگشت
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                  <Building className="h-8 w-8 text-primary" />
                  {company.name}
                </h1>
                <p className="text-gray-600 mt-1">کد ملی: {toPersianNumber(company.nationalId)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(company.status)}
              <Badge variant="outline" className="text-sm">
                <Shield className="w-3 h-3 ml-1" />
                پنل ادمین
              </Badge>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">کل خدمات</p>
                    <p className="text-3xl font-bold text-gray-900">{toPersianNumber(totalServices)}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Briefcase className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">تکمیل شده</p>
                    <p className="text-3xl font-bold text-green-600">{toPersianNumber(completedServices)}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">در حال انجام</p>
                    <p className="text-3xl font-bold text-blue-600">{toPersianNumber(inProgressServices)}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">پیشرفت کلی</p>
                    <p className="text-3xl font-bold text-purple-600">{toPersianNumber(Math.round(progressPercentage))}%</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <Progress value={progressPercentage} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">اطلاعات کلی</TabsTrigger>
              <TabsTrigger value="services">خدمات</TabsTrigger>
              <TabsTrigger value="documents">اسناد</TabsTrigger>
              <TabsTrigger value="communications">ارتباطات</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Company Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      اطلاعات شرکت
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">نوع شرکت</p>
                        <p className="font-medium">{company.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">شماره ثبت</p>
                        <p className="font-medium">{company.registrationNumber || 'نامشخص'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">تاریخ ثبت</p>
                        <p className="font-medium">{company.registrationDate || 'نامشخص'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">سرمایه</p>
                        <p className="font-medium">{company.capital || 'نامشخص'}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      {company.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-500 mt-1 flex-shrink-0" />
                          <p className="text-sm">{company.address}</p>
                        </div>
                      )}
                      {company.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <p className="text-sm">{toPersianNumber(company.phone)}</p>
                        </div>
                      )}
                      {company.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <p className="text-sm">{company.email}</p>
                        </div>
                      )}
                      {company.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-500" />
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                            {company.website}
                          </a>
                        </div>
                      )}
                    </div>

                    {company.description && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm text-gray-600 mb-2">توضیحات</p>
                          <p className="text-sm">{company.description}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Financial Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      خلاصه مالی
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-center mb-2">
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-600">سرمایه‌گذاری</p>
                        <p className="text-lg font-bold text-green-600">
                          {totalInvestment.toLocaleString('fa-IR')} ریال
                        </p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-center mb-2">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-600">خدمات اداری</p>
                        <p className="text-lg font-bold text-blue-600">
                          {totalAdministrative.toLocaleString('fa-IR')} ریال
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">خدمات سرمایه‌گذاری</span>
                        <span className="font-medium">{toPersianNumber(investmentServices.length)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">خدمات اداری</span>
                        <span className="font-medium">{toPersianNumber(administrativeServices.length)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-medium">کل خدمات</span>
                        <span className="font-bold">{toPersianNumber(totalServices)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    لیست خدمات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {services.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        هیچ خدمتی به این شرکت اختصاص نیافته است
                      </div>
                    ) : (
                      services.map((service: any) => (
                        <div key={service.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-medium">{service.serviceTitle}</h3>
                              {getServiceStatusBadge(service.status)}
                            </div>
                            <Badge variant="outline">
                              {service.serviceDepartment === 'investment' ? 'سرمایه‌گذاری' : 'اداری'}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {service.serviceDescription || 'بدون توضیحات'}
                          </div>
                          {service.estimatedDays && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                              <Calendar className="h-4 w-4" />
                              <span>زمان تخمینی: {service.estimatedDays} روز</span>
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-2">
                            فعال شده در: {new Date(service.activatedAt).toLocaleDateString('fa-IR')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    اسناد و مدارک ({toPersianNumber((documents as any[]).length)})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documentsLoading ? (
                    <div className="text-center py-8">
                      <div className="loading-spinner h-8 w-8 border-4 mx-auto mb-4"></div>
                      <p>در حال بارگذاری اسناد...</p>
                    </div>
                  ) : (documents as any[]).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>هیچ سندی یافت نشد</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(documents as any[]).map((doc: any) => (
                        <div key={doc.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-medium text-sm truncate" title={doc.original_name}>
                                {doc.original_name}
                              </h3>
                              <p className="text-xs text-gray-500 mt-1">{doc.category}</p>
                            </div>
                            <Badge variant={doc.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                              {doc.status === 'approved' ? 'تایید شده' : 
                               doc.status === 'pending' ? 'در انتظار' : 
                               doc.status === 'rejected' ? 'رد شده' : doc.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {new Date(doc.created_at).toLocaleDateString('fa-IR')}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewDocument(doc)}
                                className="h-8 px-2"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleViewDocument(doc)}
                                className="h-8 px-2"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Communications Tab */}
            <TabsContent value="communications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    تاریخچه ارتباطات ({toPersianNumber(conversations.length)})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {conversations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>هیچ گفتگویی یافت نشد</p>
                      <p className="text-sm mt-2">ارتباطات با این شرکت در اینجا نمایش داده خواهد شد</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conversations.map((conv: any) => (
                        <div key={conv.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">{conv.subject || 'بدون موضوع'}</h3>
                            <Badge variant={conv.status === 'active' ? 'default' : 'secondary'}>
                              {conv.status === 'active' ? 'فعال' : 'بسته شده'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>آخرین پیام: {new Date(conv.last_message_at || conv.updated_at).toLocaleDateString('fa-IR')}</span>
                            <span>دپارتمان: {conv.department === 'investment' ? 'سرمایه‌گذاری' : conv.department === 'administrative' ? 'اداری' : 'عمومی'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

