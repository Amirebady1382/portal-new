import { useState, useEffect } from "react";
import { Send, Eye, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, FileText, Package } from "lucide-react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { toPersianNumber, formatPersianDate } from "@/lib/persian-utils";
import { apiRequest } from "@/lib/queryClient";

const SERVICE_ICONS = {
  FileText: "📄",
  Shield: "🛡️", 
  TrendingUp: "📈",
  Edit: "✏️",
  Package: "📦",
  Users: "👥",
  Settings: "⚙️",
  CheckCircle: "✅"
};

const STATUS_CONFIG = {
  pending: {
    label: "در انتظار بررسی",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock
  },
  in_review: {
    label: "در حال بررسی",
    color: "bg-blue-100 text-blue-800 border-blue-200", 
    icon: Eye
  },
  approved: {
    label: "تایید شده",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: CheckCircle
  },
  completed: {
    label: "تکمیل شده",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle
  },
  rejected: {
    label: "رد شده",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle
  }
};

const PRIORITY_LABELS = {
  low: "کم",
  normal: "عادی", 
  high: "بالا",
  urgent: "فوری"
};

export default function CustomerServicesFixed() {
  const { toast } = useToast();
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [requestingService, setRequestingService] = useState<any>(null);
  const [viewingRequest, setViewingRequest] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [requestHistory, setRequestHistory] = useState<any[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchMyRequests();
    fetchCompanies();
  }, [selectedDepartment]);

  useEffect(() => {
    if (viewingRequest?.id) {
      fetchRequestHistory(viewingRequest.id);
      fetchWorkflowStatus(viewingRequest.id);
    }
  }, [viewingRequest?.id]);

  const fetchWorkflowStatus = async (requestId: number) => {
    try {
      const data = await apiRequest("GET", `/api/service-requests/${requestId}/workflow-status`);
      setWorkflowStatus(data);
    } catch (error) {
      console.error("Error fetching workflow:", error);
      setWorkflowStatus(null);
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.log("No auth token for services");
        setServices([]);
        return;
      }
      
      const params = new URLSearchParams();
      if (selectedDepartment !== "all") params.set('department', selectedDepartment);
      params.set('isActive', 'true');
      
      const servicesData = await apiRequest("GET", `/api/services?${params.toString()}`);
      setServices(Array.isArray(servicesData) ? servicesData : []);
    } catch (error: any) {
      console.error("Error fetching services:", error);
      setServices([]);
      if (error.message?.includes("401") || error.message?.includes("غیرمجاز")) {
        toast({
          title: "خطا",
          description: "لطفاً دوباره وارد سامانه شوید",
          variant: "destructive"
        });
      } else {
        toast({
          title: "خطا",
          description: "خطا در دریافت خدمات",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.log("No auth token for requests");
        setMyRequests([]);
        return;
      }
      
      const requestsData = await apiRequest("GET", "/api/service-requests");
      setMyRequests(requestsData?.requests || []);
    } catch (error: any) {
      console.error("Error fetching my requests:", error);
      setMyRequests([]);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.log("No auth token for companies");
        setCompanies([]);
        return;
      }
      
      const companiesData = await apiRequest("GET", "/api/companies");
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
    } catch (error: any) {
      console.error("Error fetching companies:", error);
      setCompanies([]);
    }
  };

  const fetchRequestHistory = async (requestId: number) => {
    try {
      const history = await apiRequest("GET", `/api/service-requests/${requestId}/history`);
      setRequestHistory(history || []);
    } catch (error: any) {
      console.error("Error fetching history:", error);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!requestingService) return;

    const formData = new FormData(e.currentTarget);
    
    const requestData = {
      serviceId: requestingService.id,
      companyId: parseInt(formData.get('companyId') as string),
      priority: formData.get('priority') as string || 'normal',
      notes: formData.get('notes') as string
    };

    try {
      await apiRequest("POST", "/api/service-requests", requestData);
      
      toast({
        title: "موفقیت",
        description: "درخواست شما با موفقیت ارسال شد"
      });
      
      setRequestingService(null);
      fetchMyRequests();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    if (!config) return <Badge variant="outline">{status}</Badge>;

    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              خدمات و درخواست‌ها (Fixed)
            </h1>
            <p className="text-text-secondary">
              درخواست خدمات جدید و پیگیری وضعیت درخواست‌های قبلی
            </p>
          </div>

          {/* My Requests Summary */}
          {myRequests.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  خلاصه درخواست‌های شما
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                    const count = myRequests.filter((r: any) => r.status === status).length;
                    const Icon = config.icon;
                    
                    return (
                      <div key={status} className="text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Icon className="h-6 w-6 text-gray-600" />
                        </div>
                        <p className="text-2xl font-bold text-primary">
                          {toPersianNumber(count)}
                        </p>
                        <p className="text-sm text-gray-600">{config.label}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Available Services */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">خدمات موجود</h2>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="فیلتر بخش" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه بخش‌ها</SelectItem>
                    <SelectItem value="investment">سرمایه‌گذاری</SelectItem>
                    <SelectItem value="administrative">اداری</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p>در حال بارگیری...</p>
                    </CardContent>
                  </Card>
                ) : services.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">هیچ خدمتی موجود نیست</p>
                    </CardContent>
                  </Card>
                ) : (
                  services.map((service: any) => (
                    <Card key={service.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">
                              {SERVICE_ICONS[service.icon as keyof typeof SERVICE_ICONS] || "📋"}
                            </span>
                            <div>
                              <h3 className="font-semibold text-lg">{service.title}</h3>
                              <p className="text-sm text-gray-600">
                                {service.department === "investment" ? "سرمایه‌گذاری" : "اداری"}
                              </p>
                            </div>
                          </div>
                          {service.estimatedDays && (
                            <Badge variant="outline" className="text-xs">
                              {toPersianNumber(service.estimatedDays)} روز
                            </Badge>
                          )}
                        </div>

                        {service.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                            {service.description}
                          </p>
                        )}

  const isServiceActive = (serviceId: number) => {
    return myRequests.some(r => r.serviceId === serviceId && r.status !== 'completed' && r.status !== 'rejected');
  };

  const handleRequestClick = (service: any) => {
    if (isServiceActive(service.id)) {
      toast({
        title: "خطا",
        description: "شما در حال حاضر یک درخواست فعال برای این خدمت دارید",
        variant: "destructive"
      });
      return;
    }
    setRequestingService(service);
  };

  // ... (inside the services.map)
                        <Button
                          className="w-full"
                          onClick={() => handleRequestClick(service)}
                          disabled={companies.length === 0 || isServiceActive(service.id)}
                        >
                          {isServiceActive(service.id) ? "درخواست فعال دارید" : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              درخواست خدمت
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* My Requests */}
            <div>
              <h2 className="text-2xl font-semibold mb-6">درخواست‌های شما</h2>
              
              <div className="space-y-6">
                {myRequests.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">هنوز درخواستی ثبت نکرده‌اید</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Active Requests */}
                    {myRequests.filter(r => r.status !== 'completed' && r.status !== 'rejected').length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-blue-800 mb-3 flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          درخواست‌های در حال انجام
                        </h3>
                        <div className="space-y-4">
                          {myRequests
                            .filter(r => r.status !== 'completed' && r.status !== 'rejected')
                            .map((request: any) => (
                              <Card key={request.id} className="border-blue-200 bg-blue-50/30 hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xl">
                                        {SERVICE_ICONS[request.serviceIcon as keyof typeof SERVICE_ICONS] || "📋"}
                                      </span>
                                      <div>
                                        <h3 className="font-semibold">{request.serviceTitle}</h3>
                                        <p className="text-sm text-gray-600">
                                          #{toPersianNumber(request.id)} - {request.companyName}
                                        </p>
                                      </div>
                                    </div>
                                    {getStatusBadge(request.status)}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setViewingRequest(request)}
                                    className="w-full bg-white"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    مشاهده جزئیات و پیشرفت
                                  </Button>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Request History */}
                    {myRequests.filter(r => r.status === 'completed' || r.status === 'rejected').length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          سوابق درخواست‌ها
                        </h3>
                        <div className="space-y-4">
                          {myRequests
                            .filter(r => r.status === 'completed' || r.status === 'rejected')
                            .map((request: any) => (
                              <Card key={request.id} className="opacity-75 hover:opacity-100 transition-opacity">
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-semibold">{request.serviceTitle}</h3>
                                    {getStatusBadge(request.status)}
                                  </div>
                                  <p className="text-sm text-gray-500 mb-4">
                                    {formatPersianDate(request.createdAt)}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewingRequest(request)}
                                    className="w-full text-xs"
                                  >
                                    مشاهده نتیجه
                                  </Button>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Request Service Dialog */}
      {requestingService && (
        <Dialog open={!!requestingService} onOpenChange={() => setRequestingService(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="text-2xl">
                  {SERVICE_ICONS[requestingService.icon as keyof typeof SERVICE_ICONS] || "📋"}
                </span>
                درخواست {requestingService.title}
              </DialogTitle>
              <DialogDescription>
                {requestingService.description}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <Label htmlFor="companyId">شرکت</Label>
                <Select name="companyId" required>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="انتخاب شرکت" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company: any) => (
                      <SelectItem key={company.id} value={company.id.toString()}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">اولویت درخواست</Label>
                <Select name="priority" defaultValue="normal">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">توضیحات اضافی (اختیاری)</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="توضیحات اضافی در مورد این درخواست..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {requestingService.estimatedDays && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      زمان تخمینی انجام: {toPersianNumber(requestingService.estimatedDays)} روز کاری
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setRequestingService(null)}
                >
                  انصراف
                </Button>
                <Button 
                  type="submit"
                  disabled={companies.length === 0}
                >
                  ارسال درخواست
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* View Request Details Dialog */}
      {viewingRequest && (
        <Dialog open={!!viewingRequest} onOpenChange={() => setViewingRequest(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="text-2xl">
                  {SERVICE_ICONS[viewingRequest.serviceIcon as keyof typeof SERVICE_ICONS] || "📋"}
                </span>
                {viewingRequest.serviceTitle}
              </DialogTitle>
              <DialogDescription>
                درخواست #{toPersianNumber(viewingRequest.id)} - {viewingRequest.companyName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Request Status & Workflow */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>وضعیت فعلی</Label>
                  <div className="mt-1">
                    {getStatusBadge(viewingRequest.status)}
                  </div>
                </div>
                {workflowStatus?.customerStatus && (
                   <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">{workflowStatus.customerStatus.message}</p>
                   </div>
                )}
                <div>
                  <Label>تاریخ ایجاد</Label>
                  <p className="text-sm mt-1">{formatPersianDate(viewingRequest.createdAt)}</p>
                </div>
              </div>

              {viewingRequest.notes && (
                <div>
                  <Label>توضیحات درخواست</Label>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm">{viewingRequest.notes}</p>
                  </div>
                </div>
              )}

              {viewingRequest.rejectionReason && (
                <div>
                  <Label>دلیل رد</Label>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{viewingRequest.rejectionReason}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Status History */}
              <div>
                <Label>تاریخچه پردازش</Label>
                <div className="mt-2 space-y-3">
                  {requestHistory.length === 0 ? (
                    <p className="text-sm text-gray-500">هنوز تغییری در وضعیت این درخواست ثبت نشده است.</p>
                  ) : (
                    requestHistory.map((history: any) => (
                      <div key={history.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {getStatusBadge(history.newStatus)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            {history.oldStatus && (
                              <span>وضعیت از "{STATUS_CONFIG[history.oldStatus as keyof typeof STATUS_CONFIG]?.label}" به "{STATUS_CONFIG[history.newStatus as keyof typeof STATUS_CONFIG]?.label}" تغییر کرد</span>
                            )}
                            {!history.oldStatus && (
                              <span>درخواست ایجاد شد</span>
                            )}
                          </p>
                          {history.notes && (
                            <p className="text-xs text-gray-600 mt-1">{history.notes}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {formatPersianDate(history.createdAt, true)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

