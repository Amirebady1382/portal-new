import { apiRequest } from "@/lib/queryClient";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import DynamicForm from "@/components/dynamic-form";
import DocumentUpload from "@/components/documents/document-upload";
import DocumentList from "@/components/documents/document-list";
import { 
  Package, 
  FileText, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Send,
  User
} from "lucide-react";
import { toPersianNumber, formatPersianDate } from "@/lib/persian-utils";

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

interface ServicesBasedFormsProps {
  department: "investment" | "administrative";
  companyId: string;
}

export default function ServicesBasedForms({ department, companyId }: ServicesBasedFormsProps) {
  const [selectedService, setSelectedService] = useState<any>(null);
  const [viewingRequest, setViewingRequest] = useState<any>(null);

  // Get services for this department
  const { data: services = [] } = useQuery({
    queryKey: ["/api/services", { department }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/services?department=${department}&isActive=true`);
      
      if (!response.ok) throw new Error('خطا در دریافت خدمات');
      return response.json();
    }
  });

  // Get document requirements grouped by service
  const { data: serviceRequirements = [] } = useQuery({
    queryKey: ["/api/document-requirements", { department, companyId, groupByService: true }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/document-requirements?department=${department}&companyId=${companyId}`);
      
      if (!response.ok) throw new Error('خطا در دریافت فرم‌ها');
      return response.json();
    },
    enabled: !!companyId,
  });

  // Get user's service requests for this department
  const { data: serviceRequestsData } = useQuery({
    queryKey: ["/api/service-requests", { department, companyId }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/service-requests?department=${department}&companyId=${companyId}`);
      
      if (!response.ok) throw new Error('خطا در دریافت درخواست‌ها');
      return response.json();
    },
    enabled: !!companyId,
  });

  // Get form submissions for this department
  const { data: formSubmissions = [] } = useQuery<any[]>({
    queryKey: ["/api/form-submissions", { companyId, department }],
    enabled: !!companyId,
  });

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
  const serviceRequests = serviceRequestsData?.requests || [];
  const serviceRequestsMap = serviceRequests.reduce((acc: any, req: any) => {
    if (!acc[req.serviceId]) acc[req.serviceId] = [];
    acc[req.serviceId].push(req);
    return acc;
  }, {});

  // Get document status for requirement
  const getDocumentStatus = (requirement: any) => {
    console.log('DEBUG: formSubmissions type:', typeof formSubmissions, 'value:', formSubmissions);
    const hasSubmission = Array.isArray(formSubmissions) && formSubmissions.some(
      (sub: any) => sub.requirementId === requirement.id
    );
    
    if (hasSubmission) return "completed";
    return "pending";
  };

  // Render requirement card
  const renderRequirementCard = (requirement: any, serviceId: any) => {
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
        <div key={requirement.id} className="mb-6">
          <DynamicForm 
            requirement={requirement}
            companyId={companyId}
          />
        </div>
      );
    }
    
    // Fallback to old document upload system
    return (
      <Card key={requirement.id} className="mb-4">
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
              companyId={Number(companyId)}
              category={requirement.category || department}
              title={requirement.title}
              description={`بارگذاری ${requirement.title}`}
              onUploadComplete={() => {
                window.location.reload();
              }}
            />
            
            <DocumentList 
              companyId={Number(companyId)}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {/* Service-based organization */}
      {services.map((service: any) => {
        const requirements = serviceRequirementsMap[service.id] || [];
        const requests = serviceRequestsMap[service.id] || [];
        
        if (requirements.length === 0 && requests.length === 0) {
          return null; // Don't show services without requirements or requests
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
                  
                  {requests.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedService({ service, requests })}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      مشاهده درخواست‌ها ({toPersianNumber(requests.length)})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Show service requests status */}
              {requests.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">
                    وضعیت درخواست‌های این خدمت:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {requests.map((request: any) => (
                      <div key={request.id} className="flex items-center gap-2 text-sm">
                        <span>#{toPersianNumber(request.id)}</span>
                        {getStatusBadge(request.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <CardContent>
                {/* Show related forms/requirements */}
                {requirements.length > 0 ? (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">
                      فرم‌ها و مدارک مورد نیاز
                    </h4>
                    {requirements.map((requirement: any) => renderRequirementCard(requirement, service.id))}
                  </div>
                ) : (
              
              {requirements.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>هنوز فرم یا مدرکی برای این خدمت تعریف نشده است</p>
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
            {serviceRequirementsMap.general.map((requirement: any) => renderRequirementCard(requirement, "general"))}
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
                      {getStatusBadge(request.status)}
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
