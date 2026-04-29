import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import DynamicForm from "@/components/dynamic-form";
import DocumentUpload from "@/components/documents/document-upload";
import DocumentList from "@/components/documents/document-list";
import { Stepper } from "@/components/ui/stepper";
import { 
  Package, 
  FileText, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { toPersianNumber, formatPersianDate } from "@/lib/persian-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
    icon: AlertTriangle
  }
};

interface ServicesBasedFormsFixedProps {
  department: "investment" | "administrative";
  companyId: string | number;
  serviceRequestId?: number; // Optional: if provided, forms are part of workflow
  onFormsCompleted?: () => void; // Callback when all forms are completed
}

export default function ServicesBasedFormsFixed({ 
  department, 
  companyId, 
  serviceRequestId,
  onFormsCompleted 
}: ServicesBasedFormsFixedProps) {
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<any>(null);
  const [viewingRequest, setViewingRequest] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [serviceRequirements, setServiceRequirements] = useState<any[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Track current step for each service
  const [serviceSteps, setServiceSteps] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, [department, companyId, serviceRequestId]);

  const fetchData = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      
      // تبدیل companyId به number
      const companyIdNum = typeof companyId === 'string' ? parseInt(companyId) : companyId;
      
      // اگر serviceRequestId داده شده، فقط فرم‌های آن service request را بگیریم
      if (serviceRequestId) {
        // Get the specific service request
        const requestData = await apiRequest<any>("GET", `/api/service-requests/${serviceRequestId}`);
        const serviceData = await apiRequest<any>("GET", `/api/services/${requestData.serviceId}`);
        
        setServices([serviceData]);
        
        // Fetch forms for this specific service
        const formsData = await apiRequest<any>("GET", `/api/services/${requestData.serviceId}/forms?department=${department}`);
        const requirements = (formsData?.forms || []).map((f: any) => ({
          id: f.documentRequirementId,
          title: f.formTitle,
          description: f.formDescription,
          department: f.department,
          fields: f.formFields,
          serviceId: requestData.serviceId,
          isRequired: f.isRequired
        }));
        
        setServiceRequirements(requirements);
        setServiceRequests([requestData]);
        
        console.log("📊 Workflow mode - Single service data fetched:", {
          serviceId: requestData.serviceId,
          serviceTitle: serviceData.title,
          formsCount: requirements.length,
          department
        });
      } else {
        // حالت قدیمی - تمام services و فرم‌ها
        const servicesData = await apiRequest<any[]>("GET", `/api/services?department=${department}&isActive=true`);
        setServices(servicesData || []);
        
        const requirementsData = await apiRequest<any[]>("GET", `/api/document-requirements?department=${department}&companyId=${companyId}`);
        setServiceRequirements(requirementsData || []);
        
        const requestsData = await apiRequest<any>("GET", `/api/service-requests?department=${department}&companyId=${companyId}`);
        setServiceRequests(requestsData?.requests || []);
        
        console.log("📊 Normal mode - All services data fetched:", {
          services: servicesData?.length,
          requirements: requirementsData?.length,
          requests: requestsData?.requests?.length
        });
      }
      
      // Fetch form submissions (در هر دو حالت)
      const submissionsData = await apiRequest<any[]>("GET", `/api/form-submissions?companyId=${companyId}`);
      setFormSubmissions(submissionsData || []);
      
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

  // Group requirements by service
  const serviceRequirementsMap = serviceRequirements.reduce((acc: any, req: any) => {
    const serviceId = req.serviceId || 'general';
    if (!acc[serviceId]) acc[serviceId] = [];
    acc[serviceId].push(req);
    return acc;
  }, {});

  // Get requests for each service
  const serviceRequestsMap = serviceRequests.reduce((acc: any, req: any) => {
    if (!acc[req.serviceId]) acc[req.serviceId] = [];
    acc[req.serviceId].push(req);
    return acc;
  }, {});

  // Get document status for requirement
  const getDocumentStatus = (requirement: any) => {
    const hasSubmission = formSubmissions.some(
      (sub: any) => sub.requirementId === requirement.id
    );
    
    if (hasSubmission) return "completed";
    return "pending";
  };

  // Render requirement card
  const RequirementCard = ({ requirement, serviceId }: { requirement: any; serviceId: any }) => {
    const status = getDocumentStatus(requirement);
    
    let parsedFields = [];
    try {
      parsedFields = typeof requirement.fields === 'string' 
        ? JSON.parse(requirement.fields) 
        : requirement.fields || [];
    } catch (e) {
      parsedFields = [];
    }
    
    // If requirement has fields defined, use dynamic form
    if (parsedFields && Array.isArray(parsedFields) && parsedFields.length > 0) {
      return (
        <div className="mb-6">
          <DynamicForm 
            requirement={requirement}
            companyId={String(companyId)}
          />
        </div>
      );
    }
    
    // Fallback to old document upload system
    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{requirement.title}</CardTitle>
              {requirement.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {requirement.description}
                </p>
              )}
            </div>
            {status === "completed" ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                تکمیل شده
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800">
                <Clock className="h-3 w-3 mr-1" />
                در انتظار
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <DocumentUpload 
              companyId={typeof companyId === 'string' ? parseInt(companyId) : companyId}
              category={requirement.category || department}
              title={requirement.title}
              description={`بارگذاری ${requirement.title}`}
              onUploadComplete={() => {
                fetchData(); // Refresh data instead of page reload
              }}
            />
            
            <DocumentList 
              companyId={typeof companyId === 'string' ? parseInt(companyId) : companyId}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p>در حال بارگیری...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Service-based organization */}
      {services.map((service: any) => {
        const requirements = serviceRequirementsMap[service.id] || [];
        const requests = serviceRequestsMap[service.id] || [];
        const currentStep = serviceSteps[service.id] || 0;

        const incompleteRequiredForms = requirements.filter((req: any) =>
          req.isRequired && getDocumentStatus(req) !== 'completed'
        );
        
        console.log(`🔍 Service ${service.title}:`, {
          requirements: requirements.length,
          requests: requests.length,
          serviceRequestId: serviceRequestId,
          workflowMode: !!serviceRequestId,
          currentStep
        });
        
        // در حالت workflow، همیشه فرم‌ها را نشان بده
        // در حالت عادی، فقط اگر requirement داشت نشان بده
        if (!serviceRequestId && requirements.length === 0) {
          return null;
        }

        return (
          <Card key={service.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {SERVICE_ICONS[service.icon as keyof typeof SERVICE_ICONS] || "📋"}
                  </span>
                  <div>
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {service.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {service.estimatedDays && (
                    <Badge variant="outline" className="text-xs">
                      {toPersianNumber(service.estimatedDays)} روز
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Show related forms/requirements */}
              {requirements.length > 0 ? (
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">
                    مدارک و فرم‌های مورد نیاز:
                  </h4>

                  {requirements.length > 1 ? (
                    // Use Stepper for multiple requirements
                    <div className="space-y-6">
                      <Stepper
                        steps={requirements.map((r: any) => ({
                          title: r.title,
                          description: r.description ? r.description.substring(0, 30) + '...' : undefined
                        }))}
                        currentStep={currentStep}
                      />

                      <div className="mt-4">
                        <RequirementCard
                          requirement={requirements[currentStep]}
                          serviceId={service.id}
                        />
                      </div>

                      <div className="flex justify-between mt-6 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setServiceSteps(prev => ({ ...prev, [service.id]: Math.max(0, currentStep - 1) }))}
                          disabled={currentStep === 0}
                        >
                          <ArrowRight className="h-4 w-4 ml-2" />
                          مرحله قبل
                        </Button>

                        {currentStep < requirements.length - 1 ? (
                          <Button
                            onClick={() => setServiceSteps(prev => ({ ...prev, [service.id]: Math.min(requirements.length - 1, currentStep + 1) }))}
                          >
                            مرحله بعد
                            <ArrowLeft className="h-4 w-4 mr-2" />
                          </Button>
                        ) : (
                          <div className="flex flex-col items-end gap-2">
                            <Button
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                if (incompleteRequiredForms.length > 0) {
                                  toast({
                                    title: "خطا",
                                    description: "لطفاً تمام فرم‌های اجباری را تکمیل کنید.",
                                    variant: "destructive"
                                  });
                                  return;
                                }
                                toast({
                                  title: "تبریک",
                                  description: "تمام مراحل با موفقیت تکمیل شد.",
                                });
                                if (onFormsCompleted) onFormsCompleted();
                              }}
                              disabled={incompleteRequiredForms.length > 0}
                            >
                              تکمیل نهایی
                              <CheckCircle className="h-4 w-4 mr-2" />
                            </Button>
                            {incompleteRequiredForms.length > 0 && (
                              <p className="text-xs text-red-500 text-right">
                                تکمیل فرم‌های زیر الزامی است:
                                <br/>
                                {incompleteRequiredForms.map((f: any) => f.title).join('، ')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Single requirement view
                    requirements.map((requirement: any) => (
                      <RequirementCard
                        key={requirement.id}
                        requirement={requirement}
                        serviceId={service.id}
                      />
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>هنوز فرم یا مدرکی برای این خدمت تعریف نشده است</p>
                  <p className="text-sm mt-2">کارشناسان به زودی فرم‌های مورد نیاز را تعریف خواهند کرد.</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* General requirements (not associated with any service) */}
      {serviceRequirementsMap.general && serviceRequirementsMap.general.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Package className="h-6 w-6" />
              مدارک عمومی
            </CardTitle>
          </CardHeader>
          <CardContent>
            {serviceRequirementsMap.general.map((requirement: any) => (
              <RequirementCard 
                key={requirement.id} 
                requirement={requirement}
                serviceId="general"
              />
            ))}
          </CardContent>
        </Card>
      )}

      {services.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              هیچ خدمتی برای بخش {department === "investment" ? "سرمایه‌گذاری" : "اداری"} تعریف نشده است
            </p>
          </CardContent>
        </Card>
      )}

      {/* Service Requests Detail Dialog */}
      {selectedService && (
        <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="text-2xl">
                  {SERVICE_ICONS[selectedService.service.icon as keyof typeof SERVICE_ICONS] || "📋"}
                </span>
                درخواست‌های {selectedService.service.title}
              </DialogTitle>
              <DialogDescription>
                لیست درخواست‌های ارسال شده برای این خدمت
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {selectedService.requests.map((request: any) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">
                          درخواست #{toPersianNumber(request.id)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          تاریخ ایجاد: {formatPersianDate(request.createdAt)}
                        </p>
                      </div>
                      <Badge className={STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG]?.color || "bg-gray-100 text-gray-800"}>
                        {STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG]?.label || request.status}
                      </Badge>
                    </div>

                    {request.notes && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">{request.notes}</p>
                      </div>
                    )}

                    {request.rejectionReason && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">دلیل رد:</span>
                        </div>
                        <p className="text-sm text-red-600 mt-1">{request.rejectionReason}</p>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingRequest(request)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      جزئیات بیشتر
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
