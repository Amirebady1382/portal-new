import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { toPersianNumber, formatPersianDate } from "@/lib/persian-utils";
import { 
  Send,
  CheckCircle,
  Clock,
  ArrowLeft,
  Building,
  User,
  FileText,
  TrendingUp,
  Shield
} from "lucide-react";

const STAGE_CONFIG = {
  investment_forms_pending: {
    label: "فرم‌های سرمایه‌گذاری",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: FileText
  },
  investment_review: {
    label: "بررسی سرمایه‌گذاری",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock
  },
  administrative_forms_pending: {
    label: "فرم‌های اداری",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: FileText
  },
  administrative_review: {
    label: "بررسی اداری",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: Clock
  },
  completed: {
    label: "تکمیل شده",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle
  }
};

export default function ServiceRequestsWorkflow() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");

  // Fetch service requests based on user department
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["/api/service-requests", { department: user?.department }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/service-requests?department=${user?.department}`);
      return response;
    },
    enabled: !!user?.department
  });

  const requests = requestsData?.requests || [];

  // Transfer to administrative mutation
  const transferMutation = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: number; notes: string }) => {
      return await apiRequest("POST", `/api/service-requests/${requestId}/transfer-to-administrative`, {
        notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      setTransferDialogOpen(false);
      setNotes("");
      toast({
        title: "موفق",
        description: "درخواست به واحد اداری ارجاع شد",
      });
    },
    onError: (error: any) => {
      // Build a descriptive message including any details from the server
      const baseMsg = error.message || "خطا در ارجاع درخواست";
      const detailsMsg = error.details ? `\n${typeof error.details === 'string' ? error.details : JSON.stringify(error.details)}` : "";
      toast({
        title: "خطا در ارجاع درخواست",
        description: `${baseMsg}${detailsMsg}`,
        variant: "destructive",
      });
    },
  });

  // Complete request mutation
  const completeMutation = useMutation({
    mutationFn: async ({ requestId, notes }: { requestId: number; notes: string }) => {
      return await apiRequest("POST", `/api/service-requests/${requestId}/complete`, {
        notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests"] });
      setCompleteDialogOpen(false);
      setNotes("");
      toast({
        title: "موفق",
        description: "درخواست با موفقیت نهایی شد",
      });
    },
    onError: (error: any) => {
      // Build a descriptive message including any details from the server
      const baseMsg = error.message || "خطا در تکمیل درخواست";
      const detailsMsg = error.details ? `\n${typeof error.details === 'string' ? error.details : JSON.stringify(error.details)}` : "";
      toast({
        title: "خطا در تکمیل نهایی",
        description: `${baseMsg}${detailsMsg}`,
        variant: "destructive",
      });
    },
  });

  const handleTransferClick = (request: any) => {
    setSelectedRequest(request);
    setTransferDialogOpen(true);
  };

  const handleCompleteClick = (request: any) => {
    setSelectedRequest(request);
    setCompleteDialogOpen(true);
  };

  const handleTransfer = () => {
    if (selectedRequest) {
      transferMutation.mutate({
        requestId: selectedRequest.id,
        notes
      });
    }
  };

  const handleComplete = () => {
    if (selectedRequest) {
      completeMutation.mutate({
        requestId: selectedRequest.id,
        notes
      });
    }
  };

  // Group requests by workflow stage reliably without duplicates
  const requestsByStage = {
    completed: requests.filter((r: any) => 
      r.workflowStage === "completed" || r.status === "completed"
    ),
    investment: requests.filter((r: any) => {
      if (r.workflowStage === "completed" || r.status === "completed") return false;
      if (r.workflowStage === "investment_forms_pending" || r.workflowStage === "investment_review") return true;
      if (!r.workflowStage && r.serviceDepartment !== "administrative") return true;
      return false;
    }),
    administrative: requests.filter((r: any) => {
      if (r.workflowStage === "completed" || r.status === "completed") return false;
      if (r.workflowStage === "administrative_forms_pending" || r.workflowStage === "administrative_review") return true;
      if (!r.workflowStage && r.serviceDepartment === "administrative") return true;
      return false;
    })
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <MobileSidebar />
        
        <div className="flex pt-16">
          <Sidebar />
          
          <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
            <div className="text-center py-8">در حال بارگذاری...</div>
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
              <h1 className="text-2xl md:text-3xl font-bold">مدیریت درخواست‌های خدمات</h1>
              <p className="text-muted-foreground mt-1">
                بررسی و ارجاع درخواست‌های خدمات به مراحل بعدی
              </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue={user?.department === "investment" ? "investment" : "administrative"}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="investment">
                  <TrendingUp className="h-4 w-4 ml-2" />
                  واحد سرمایه‌گذاری ({toPersianNumber(requestsByStage.investment.length)})
                </TabsTrigger>
                <TabsTrigger value="administrative">
                  <Shield className="h-4 w-4 ml-2" />
                  واحد اداری ({toPersianNumber(requestsByStage.administrative.length)})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  <CheckCircle className="h-4 w-4 ml-2" />
                  تکمیل شده ({toPersianNumber(requestsByStage.completed.length)})
                </TabsTrigger>
              </TabsList>

              {/* Investment Tab */}
              <TabsContent value="investment" className="space-y-4">
                {requestsByStage.investment.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      هیچ درخواستی برای واحد سرمایه‌گذاری وجود ندارد
                    </CardContent>
                  </Card>
                ) : (
                  requestsByStage.investment.map((request: any) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      userDepartment={user?.department}
                      onTransfer={handleTransferClick}
                      onComplete={handleCompleteClick}
                    />
                  ))
                )}
              </TabsContent>

              {/* Administrative Tab */}
              <TabsContent value="administrative" className="space-y-4">
                {requestsByStage.administrative.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      هیچ درخواستی برای واحد اداری وجود ندارد
                    </CardContent>
                  </Card>
                ) : (
                  requestsByStage.administrative.map((request: any) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      userDepartment={user?.department}
                      onTransfer={handleTransferClick}
                      onComplete={handleCompleteClick}
                    />
                  ))
                )}
              </TabsContent>

              {/* Completed Tab */}
              <TabsContent value="completed" className="space-y-4">
                {requestsByStage.completed.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      هیچ درخواست تکمیل شده‌ای وجود ندارد
                    </CardContent>
                  </Card>
                ) : (
                  requestsByStage.completed.map((request: any) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      userDepartment={user?.department}
                      onTransfer={handleTransferClick}
                      onComplete={handleCompleteClick}
                    />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ارجاع به واحد اداری</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>یادداشت (اختیاری)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات برای واحد اداری..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={handleTransfer} disabled={transferMutation.isPending}>
              {transferMutation.isPending ? "در حال ارجاع..." : "ارجاع به اداری"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تکمیل نهایی درخواست</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>یادداشت نهایی (اختیاری)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="توضیحات نهایی..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              انصراف
            </Button>
            <Button onClick={handleComplete} disabled={completeMutation.isPending}>
              {completeMutation.isPending ? "در حال تکمیل..." : "تکمیل نهایی"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Request Card Component
function RequestCard({ 
  request, 
  userDepartment,
  onTransfer,
  onComplete 
}: { 
  request: any; 
  userDepartment?: string;
  onTransfer: (request: any) => void;
  onComplete: (request: any) => void;
}) {
  const stageConfig = STAGE_CONFIG[request.workflowStage as keyof typeof STAGE_CONFIG];
  const Icon = stageConfig?.icon || Clock;

  // Ensure employees in the correct department or admins can see actions
  const isInvestment = userDepartment === "investment" || userDepartment === "admin" || !userDepartment;
  const isAdministrative = userDepartment === "administrative" || userDepartment === "admin" || !userDepartment;

  const isCompleted = request.workflowStage === "completed" || request.status === "completed";

  // Determine if actions are available
  const canTransfer = isInvestment && request.workflowStage === "investment_review" && !isCompleted;
  const canComplete = isAdministrative && request.workflowStage === "administrative_review" && !isCompleted;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              درخواست #{toPersianNumber(request.id)}
            </CardTitle>
            <CardDescription>
              {request.serviceTitle || "خدمت نامشخص"}
            </CardDescription>
          </div>
          <Badge className={isCompleted ? STAGE_CONFIG.completed.color : (stageConfig?.color || "bg-gray-100")}>
            <Icon className="h-3 w-3 ml-1" />
            {isCompleted ? STAGE_CONFIG.completed.label : (stageConfig?.label || request.workflowStage)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Company Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span>{request.companyName || "شرکت نامشخص"}</span>
          </div>
          <a href={`/employee/companies/${request.companyId}`} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
            <User className="h-4 w-4" />
            مشاهده پروفایل و فرم‌ها
          </a>
        </div>

        {/* Request Date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>تاریخ درخواست: {formatPersianDate(request.createdAt)}</span>
        </div>

        {/* Priority */}
        {request.priority && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">اولویت:</span>
            <Badge variant={request.priority === "urgent" ? "destructive" : "outline"}>
              {request.priority === "urgent" ? "فوری" : 
               request.priority === "high" ? "بالا" : 
               request.priority === "normal" ? "عادی" : "کم"}
            </Badge>
          </div>
        )}

        {/* Notes */}
        {request.notes && (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="text-muted-foreground mb-1">یادداشت:</p>
            <p>{request.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {canTransfer && (
            <Button 
              onClick={() => onTransfer(request)}
              className="flex-1"
            >
              <Send className="h-4 w-4 ml-2" />
              تایید و ارجاع به اداری
            </Button>
          )}
          
          {canComplete && (
            <Button 
              onClick={() => onComplete(request)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 ml-2" />
              تایید و تکمیل نهایی
            </Button>
          )}

          {isCompleted && (
            <Badge className="bg-green-100 text-green-800 px-4 py-2 w-full justify-center">
              <CheckCircle className="h-4 w-4 ml-2" />
              این درخواست با موفقیت تکمیل شده است
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


