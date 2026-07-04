import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, FileText, TrendingUp, Shield, Send, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ServicesBasedFormsFixed from "@/components/services-based-forms-fixed";
import ServiceRequestStatus from "@/components/service-request-status";
import { useTaxDeclarationStatus } from "@/hooks/use-tax-declaration-status";

interface ServicesResponse {
  services: any[];
}

interface ServiceRequestResponse {
  serviceRequest: any;
  workflow: any;
  message?: string;
}

export default function CustomerServicesDynamic() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedServiceRequest, setSelectedServiceRequest] = useState<any>(null);
  const [workflowStatus, setWorkflowStatus] = useState<any>(null);

  // Fetch workflow status for selected request
  const { data: currentWorkflowStatus, refetch: refetchWorkflowStatus } = useQuery({
    queryKey: ["/api/service-requests", selectedServiceRequest?.id, "workflow-status"],
    queryFn: async () => {
      if (!selectedServiceRequest?.id) return null;
      const data = await apiRequest("GET", `/api/service-requests/${selectedServiceRequest.id}/workflow-status`);
      return data;
    },
    enabled: !!selectedServiceRequest?.id,
  });

  // Use currentWorkflowStatus or the one from initial creation
  const effectiveWorkflowStatus = currentWorkflowStatus?.workflow || workflowStatus;
  const effectiveCustomerStatus = currentWorkflowStatus?.customerStatus;

  // Get current user's company
  const { data: currentUser } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const data = await apiRequest("GET", '/api/auth/me');
      console.log('👤 Current user data:', data);
      return data;
    },
  });

  const companyId = currentUser?.companyId;
  console.log('🏢 Company ID:', companyId);

  // Check tax declaration status
  const { data: taxStatus, refetch: refetchTaxStatus } = useTaxDeclarationStatus(companyId);

  // Fetch assigned services for the company
  const { data: servicesData, isLoading, error } = useQuery<ServicesResponse>({
    queryKey: ["/api/companies", companyId, "services"],
    queryFn: async (): Promise<ServicesResponse> => {
      if (!companyId) {
        console.log('❌ No companyId available');
        return { services: [] };
      }
      console.log(`🔍 Fetching services for company ${companyId}`);
      const result = await apiRequest("GET", `/api/companies/${companyId}/services`);
      console.log('✅ Services data:', result);
      return result as ServicesResponse;
    },
    enabled: !!companyId,
  });

  const services = servicesData?.services || [];

  // Fetch user's existing service requests
  const { data: myRequestsData } = useQuery({
    queryKey: ["/api/service-requests"],
    queryFn: async () => {
      return await apiRequest("GET", "/api/service-requests");
    },
  });
  const myRequests = myRequestsData?.requests || [];

  const handleResumeRequest = (request: any) => {
    const service = services.find(s => s.serviceId === request.serviceId);
    setSelectedService(service || { 
      serviceTitle: request.serviceTitle, 
      serviceId: request.serviceId, 
      serviceDepartment: request.serviceDepartment 
    });
    setSelectedServiceRequest(request);
    setWorkflowStatus(null); // Will be refetched
  };
  
  console.log('📊 Current state:', { companyId, servicesCount: services.length, isLoading, error });

  // Create service request mutation
  const createRequestMutation = useMutation<ServiceRequestResponse, Error, number>({
    mutationFn: async (serviceId: number) => {
      return await apiRequest("POST", "/api/service-requests", {
        serviceId,
        companyId,
        priority: "normal",
        notes: "درخواست جدید"
      }) as ServiceRequestResponse;
    },
    onSuccess: (data) => {
      console.log("✅ Service request created:", data);
      setSelectedServiceRequest(data.serviceRequest);
      setWorkflowStatus(data.workflow);
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      toast({
        title: "موفق",
        description: "درخواست با موفقیت ثبت شد",
      });
    },
    onError: (error: any) => {
      console.error("❌ Error creating request:", error);
      toast({
        title: "خطا",
        description: error.message || "خطا در ثبت درخواست",
        variant: "destructive",
      });
    },
  });

  const handleRequestService = (service: any) => {
    setSelectedService(service);
    createRequestMutation.mutate(service.serviceId);
  };

  const handleBackToServices = () => {
    setSelectedService(null);
    setSelectedServiceRequest(null);
    setWorkflowStatus(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <MobileSidebar />
        
        <div className="flex pt-16">
          <Sidebar />
          
          <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
            <div>
              <div className="text-center py-8">در حال بارگذاری...</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // If a service request is selected, show workflow status and forms
  if (selectedService && selectedServiceRequest && companyId) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <MobileSidebar />
        
        <div className="flex pt-16">
          <Sidebar />
          
          <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={handleBackToServices}
                >
                  ← بازگشت به خدمات
                </Button>
              </div>

              {/* Show workflow status */}
              {effectiveWorkflowStatus && (
                <ServiceRequestStatus
                  stage={effectiveWorkflowStatus.currentStage}
                  message={
                    effectiveCustomerStatus?.message ||
                    (effectiveWorkflowStatus.currentStage === "investment_forms_pending"
                      ? "لطفاً فرم‌های ارزیابی را تکمیل کنید"
                      : effectiveWorkflowStatus.currentStage === "investment_review"
                      ? "درخواست شما در حال بررسی در واحد سرمایه‌گذاری است"
                      : effectiveWorkflowStatus.currentStage === "administrative_forms_pending"
                      ? "لطفاً فرم‌های واحد اداری را تکمیل کنید"
                      : effectiveWorkflowStatus.currentStage === "administrative_review"
                      ? "درخواست شما در حال بررسی در واحد اداری است"
                      : "درخواست شما نهایی شد ✅")
                  }
                  canFillForms={
                    effectiveWorkflowStatus.currentStage === "investment_forms_pending" ||
                    effectiveWorkflowStatus.currentStage === "administrative_forms_pending"
                  }
                  formsType={
                    effectiveWorkflowStatus.currentStage === "investment_forms_pending"
                      ? "investment"
                      : effectiveWorkflowStatus.currentStage === "administrative_forms_pending"
                      ? "administrative"
                      : undefined
                  }
                  serviceTitle={selectedService.serviceTitle}
                />
              )}

              {/* Show forms based on workflow stage */}
              {effectiveWorkflowStatus && 
               (effectiveWorkflowStatus.currentStage === "investment_forms_pending" || 
                effectiveWorkflowStatus.currentStage === "administrative_forms_pending") && (
                <ServicesBasedFormsFixed
                  department={
                    effectiveWorkflowStatus.currentStage === "investment_forms_pending"
                      ? "investment"
                      : "administrative"
                  }
                  companyId={companyId.toString()}
                  serviceRequestId={selectedServiceRequest.id}
                  onFormsCompleted={() => {
                    // Refresh workflow status
                    refetchWorkflowStatus();
                    toast({
                      title: "موفق",
                      description: "فرم‌ها با موفقیت ثبت و به مرحله بعد ارجاع شد",
                    });
                  }}
                />
              )}
            </div>
          </main>
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
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">خدمات من</h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                خدمات اختصاص یافته به شرکت شما
              </p>
            </div>

            {/* Warning if Tax Declaration Missing (Optional, non-blocking) */}
            {companyId && !taxStatus?.hasTaxDeclaration && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-orange-800">توجه: اظهارنامه مالیاتی آپلود نشده است</h4>
                        <p className="text-sm text-orange-700 mt-1">
                            برخی خدمات ممکن است بدون اظهارنامه مالیاتی قابل انجام نباشند. لطفاً در اسرع وقت اقدام کنید.
                        </p>
                    </div>
                </div>
            )}

            {/* Services */}
            {services.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    هیچ خدمتی به شرکت شما اختصاص نیافته است
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    لطفاً با کارمندان صندوق تماس بگیرید
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {services.map((service: any) => (
                  <Card key={service.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          <CardTitle className="text-lg">{service.serviceTitle}</CardTitle>
                        </div>
                        <Badge variant="default">
                          {service.serviceDepartment === "investment" ? "سرمایه‌گذاری" : "اداری"}
                        </Badge>
                      </div>
                      <CardDescription>
                        {service.serviceDescription || "بدون توضیحات"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {service.estimatedDays && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">زمان تخمینی:</span>
                          <span className="font-medium">{service.estimatedDays} روز</span>
                        </div>
                      )}

                      <Button
                        onClick={() => {
                          const activeRequest = myRequests.find((r: any) => r.serviceId === service.serviceId && r.status !== 'completed' && r.status !== 'rejected');
                          if (activeRequest) {
                            handleResumeRequest(activeRequest);
                          } else {
                            handleRequestService(service);
                          }
                        }}
                        disabled={createRequestMutation.isPending}
                        className="w-full"
                        size="lg"
                      >
                        {createRequestMutation.isPending ? (
                          "در حال پردازش..."
                        ) : myRequests.some((r: any) => r.serviceId === service.serviceId && r.status !== 'completed' && r.status !== 'rejected') ? (
                          <>
                            <FileText className="ml-2 h-4 w-4" />
                            ادامه درخواست فعال
                          </>
                        ) : (
                          <>
                            <Send className="ml-2 h-4 w-4" />
                            ثبت درخواست خدمت جدید
                          </>
                        )}
                      </Button>

                      <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground">
                          فعال شده در: {new Date(service.activatedAt).toLocaleDateString("fa-IR")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* My Requests Section */}
            {myRequests.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl md:text-2xl font-bold mb-4">درخواست‌های فعال و گذشته شما</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myRequests.map((request: any) => (
                    <Card key={request.id} className="hover:shadow-lg transition-shadow border-blue-100">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <CardTitle className="text-lg">{request.serviceTitle}</CardTitle>
                          </div>
                          <Badge variant={request.status === 'completed' ? 'secondary' : 'default'} className={request.status !== 'completed' && request.status !== 'rejected' ? 'bg-blue-500' : ''}>
                            {request.status === 'completed' ? 'پایان یافته' : 
                             request.status === 'rejected' ? 'رد شده' : 'در جریان'}
                          </Badge>
                        </div>
                        <CardDescription>
                          ثبت شده در: {new Date(request.createdAt).toLocaleDateString("fa-IR")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={() => handleResumeRequest(request)}
                          className="w-full"
                          variant={request.status === 'completed' || request.status === 'rejected' ? "outline" : "default"}
                        >
                          مشاهده و پیگیری
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

