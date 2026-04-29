import { useState, useEffect } from "react";
import { Package, CheckCircle, Clock, ArrowRight, FileText } from "lucide-react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { toPersianNumber } from "@/lib/persian-utils";
import { apiRequest } from "@/lib/queryClient";

export default function TestServiceFlow() {
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch services
      const servicesData = await apiRequest("GET", "/api/services?isActive=true");
      setServices(Array.isArray(servicesData) ? servicesData : []);
      
      // Fetch my service requests
      const requestsData = await apiRequest("GET", "/api/service-requests") as any;
      setMyRequests(Array.isArray(requestsData?.requests) ? requestsData.requests : []);
      
      // Fetch companies
      const companiesData = await apiRequest("GET", "/api/companies");
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "خطا",
        description: "خطا در دریافت اطلاعات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const requestService = async (serviceId: number) => {
    try {
      if (companies.length === 0) {
        toast({
          title: "خطا",
          description: "ابتدا باید شرکت خود را ثبت کنید",
          variant: "destructive"
        });
        return;
      }

      await apiRequest("POST", "/api/service-requests", {
        serviceId,
        companyId: companies[0].id,
        priority: "normal",
        notes: "درخواست تست از صفحه تست فلوی خدمات"
      });

      toast({
        title: "موفق",
        description: "درخواست خدمت ارسال شد"
      });

      fetchData(); // Refresh data
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "خطا در ارسال درخواست",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { label: "در انتظار", color: "bg-yellow-100 text-yellow-800" },
      in_review: { label: "در حال بررسی", color: "bg-blue-100 text-blue-800" },
      approved: { label: "تایید شده", color: "bg-green-100 text-green-800" },
      completed: { label: "تکمیل شده", color: "bg-purple-100 text-purple-800" },
      rejected: { label: "رد شده", color: "bg-red-100 text-red-800" }
    };

    const config = configs[status as keyof typeof configs];
    if (!config) return <Badge variant="outline">{status}</Badge>;

    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-64 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              تست فلوی خدمات و فرم‌ها
            </h1>
            <p className="text-text-secondary">
              تست کامل جریان درخواست خدمت → تایید → نمایش فرم‌ها
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Available Services */}
            <div>
              <h2 className="text-xl font-semibold mb-4">خدمات موجود</h2>
              
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p>در حال بارگیری...</p>
                  </div>
                ) : services.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">هیچ خدمتی موجود نیست</p>
                    </CardContent>
                  </Card>
                ) : (
                  services.map((service: any) => {
                    const myRequest = myRequests.find(req => req.serviceId === service.id);
                    
                    return (
                      <Card key={service.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">{service.title}</h3>
                              <p className="text-sm text-gray-600">
                                {service.department === "investment" ? "سرمایه‌گذاری" : "اداری"}
                              </p>
                            </div>
                            {myRequest && getStatusBadge(myRequest.status)}
                          </div>

                          {service.description && (
                            <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                          )}

                          {!myRequest ? (
                            <Button
                              size="sm"
                              onClick={() => requestService(service.id)}
                              className="w-full"
                            >
                              درخواست خدمت
                            </Button>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-xs text-gray-500">
                                درخواست #{toPersianNumber(myRequest.id)} ارسال شده
                              </div>
                              {myRequest.status === 'approved' && (
                                <div className="bg-green-50 p-2 rounded text-xs text-green-700">
                                  ✅ تایید شده - فرم‌ها در صفحات امور فعال شدند
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>

            {/* My Requests Status */}
            <div>
              <h2 className="text-xl font-semibold mb-4">وضعیت درخواست‌های من</h2>
              
              <div className="space-y-4">
                {myRequests.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">هنوز درخواستی ندارید</p>
                    </CardContent>
                  </Card>
                ) : (
                  myRequests.map((request: any) => (
                    <Card key={request.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold">{request.serviceTitle}</h3>
                            <p className="text-sm text-gray-600">
                              درخواست #{toPersianNumber(request.id)}
                            </p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>

                        {request.status === 'approved' && (
                          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                            <div className="flex items-center gap-2 text-green-800 mb-2">
                              <CheckCircle className="h-4 w-4" />
                              <span className="font-medium">فرم‌ها فعال شدند!</span>
                            </div>
                            <p className="text-sm text-green-700 mb-3">
                              حالا می‌تونید به صفحات امور {request.serviceDepartment === "investment" ? "سرمایه‌گذاری" : "اداری"} برید و فرم‌های مربوطه رو پر کنید.
                            </p>
                            <Button 
                              size="sm"
                              onClick={() => {
                                const path = request.serviceDepartment === "investment" ? 
                                  "/customer/investment" : "/customer/administrative";
                                window.location.href = path;
                              }}
                            >
                              <ArrowRight className="h-4 w-4 mr-2" />
                              رفتن به فرم‌ها
                            </Button>
                          </div>
                        )}

                        {request.status === 'pending' && (
                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                            <div className="flex items-center gap-2 text-yellow-800">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm">در انتظار بررسی کارشناس</span>
                            </div>
                          </div>
                        )}

                        {request.rejectionReason && (
                          <div className="bg-red-50 border border-red-200 p-3 rounded-lg mt-3">
                            <p className="text-sm text-red-700">
                              <strong>دلیل رد:</strong> {request.rejectionReason}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>راهنمای تست فلوی خدمات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>ابتدا یک خدمت درخواست کنید</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>کارشناس درخواست را بررسی و تایید می‌کند</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>فرم‌های مربوط به آن خدمت در صفحات امور فعال می‌شوند</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>شما فرم‌ها را پر می‌کنید و کارشناس پیگیری می‌کند</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
