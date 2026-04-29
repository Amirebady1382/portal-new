import { useState, useEffect } from "react";
import { Eye, User, Building, Calendar, Clock, CheckCircle, XCircle, AlertTriangle, ArrowRight } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { toPersianNumber, formatPersianDate } from "@/lib/persian-utils";
import { apiRequest } from "@/lib/queryClient";

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

const PRIORITY_CONFIG = {
  low: { label: "کم", color: "bg-gray-100 text-gray-800" },
  normal: { label: "عادی", color: "bg-blue-100 text-blue-800" },
  high: { label: "بالا", color: "bg-orange-100 text-orange-800" },
  urgent: { label: "فوری", color: "bg-red-100 text-red-800" }
};

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

export default function ServiceRequestsManagementFixed() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [viewingRequest, setViewingRequest] = useState<any>(null);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [requests, setRequests] = useState<any[]>([]);
  const [requestHistory, setRequestHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 12 });

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [selectedStatus, selectedDepartment, currentPage]);

  useEffect(() => {
    if (viewingRequest?.id) {
      fetchRequestHistory(viewingRequest.id);
    }
  }, [viewingRequest?.id]);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.log("No auth token found");
        return;
      }
      
      const userData = await apiRequest("GET", "/api/auth/me");
      setUser(userData);
    } catch (error: any) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.log("No auth token for requests");
        setRequests([]);
        return;
      }
      
      const params = new URLSearchParams();
      if (selectedStatus && selectedStatus !== "all") params.set('status', selectedStatus);
      if (selectedDepartment && selectedDepartment !== "all") params.set('department', selectedDepartment);
      params.set('page', currentPage.toString());
      params.set('limit', '12');
      
      const data = await apiRequest("GET", `/api/service-requests?${params.toString()}`);
      setRequests(data?.requests || []);
      setPagination({ total: data?.total || 0, limit: data?.limit || 12 });
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      setRequests([]);
      if (error.message?.includes("401") || error.message?.includes("غیرمجاز")) {
        toast({
          title: "خطا",
          description: "لطفاً دوباره وارد سامانه شوید",
          variant: "destructive"
        });
      } else {
        toast({
          title: "خطا",
          description: "خطا در دریافت درخواست‌ها",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
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

  const handleUpdateRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRequest) return;

    const formData = new FormData(e.currentTarget);
    
    const updateData = {
      status: formData.get('status') as string,
      priority: formData.get('priority') as string,
      notes: formData.get('notes') as string,
      rejectionReason: formData.get('status') === 'rejected' ? 
        formData.get('rejectionReason') as string : undefined
    };

    try {
      await apiRequest("PUT", `/api/service-requests/${editingRequest.id}`, updateData);
      
      toast({
        title: "موفقیت",
        description: "درخواست با موفقیت بروزرسانی شد"
      });
      
      setEditingRequest(null);
      fetchRequests();
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

  const getPriorityBadge = (priority: string) => {
    const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
    if (!config) return <Badge variant="outline">{priority}</Badge>;

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-64 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              مدیریت درخواست‌های خدمات (Fixed)
            </h1>
            <p className="text-text-secondary">
              بررسی و پردازش درخواست‌های ارسالی توسط مشتریان
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = requests.filter((r: any) => r.status === status).length;
              const Icon = config.icon;
              
              return (
                <Card key={status} className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedStatus(selectedStatus === status ? "all" : status)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">{config.label}</p>
                        <p className="text-2xl font-bold text-primary">
                          {toPersianNumber(count)}
                        </p>
                      </div>
                      <Icon className="h-6 w-6 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="فیلتر وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="فیلتر واحد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه واحدها</SelectItem>
                <SelectItem value="investment">سرمایه‌گذاری</SelectItem>
                <SelectItem value="administrative">اداری</SelectItem>
              </SelectContent>
            </Select>

            {(selectedStatus && selectedStatus !== "all") || (selectedDepartment && selectedDepartment !== "all") ? (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedStatus("all");
                  setSelectedDepartment("all");
                }}
              >
                پاک کردن فیلترها
              </Button>
            ) : null}
          </div>

          {/* Requests List */}
          <div className="grid gap-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p>در حال بارگیری...</p>
              </div>
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">هیچ درخواستی یافت نشد</p>
                </CardContent>
              </Card>
            ) : (
              requests.map((request: any) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {SERVICE_ICONS[request.serviceIcon as keyof typeof SERVICE_ICONS] || "📋"}
                        </span>
                        <div>
                          <h3 className="font-semibold text-lg">{request.serviceTitle}</h3>
                          <p className="text-sm text-gray-600">
                            درخواست #{toPersianNumber(request.id)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {getStatusBadge(request.status)}
                        {getPriorityBadge(request.priority)}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building className="h-4 w-4" />
                        <span>{request.companyName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{request.userName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{formatPersianDate(request.createdAt)}</span>
                      </div>
                    </div>

                    {request.notes && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <p className="text-sm">{request.notes}</p>
                      </div>
                    )}

                    {request.dueDate && new Date(request.dueDate) < new Date() && 
                     !['completed', 'rejected'].includes(request.status) && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            سررسید گذشته: {formatPersianDate(request.dueDate)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setViewingRequest(request)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        مشاهده جزئیات
                      </Button>

                      {!['completed', 'rejected'].includes(request.status) && (
                        <Button
                          size="sm"
                          onClick={() => setEditingRequest(request)}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          پردازش درخواست
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                قبلی
              </Button>
              
              <span className="flex items-center px-4 text-sm">
                صفحه {toPersianNumber(currentPage)} از {toPersianNumber(totalPages)}
              </span>
              
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                بعدی
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* View Request Dialog */}
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
              {/* Request Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>وضعیت فعلی</Label>
                  <div className="mt-1">
                    {getStatusBadge(viewingRequest.status)}
                  </div>
                </div>
                <div>
                  <Label>اولویت</Label>
                  <div className="mt-1">
                    {getPriorityBadge(viewingRequest.priority)}
                  </div>
                </div>
                <div>
                  <Label>تاریخ ایجاد</Label>
                  <p className="text-sm mt-1">{formatPersianDate(viewingRequest.createdAt)}</p>
                </div>
                {viewingRequest.dueDate && (
                  <div>
                    <Label>سررسید</Label>
                    <p className="text-sm mt-1">{formatPersianDate(viewingRequest.dueDate)}</p>
                  </div>
                )}
              </div>

              {viewingRequest.notes && (
                <div>
                  <Label>یادداشت‌ها</Label>
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

              {/* Status History */}
              <div>
                <Label>تاریخچه تغییرات</Label>
                <div className="mt-2 space-y-3">
                  {requestHistory.map((history: any) => (
                    <div key={history.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        {getStatusBadge(history.newStatus)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{history.changerName}</span>
                          {history.oldStatus && (
                            <span> وضعیت را از "{STATUS_CONFIG[history.oldStatus as keyof typeof STATUS_CONFIG]?.label}" به "{STATUS_CONFIG[history.newStatus as keyof typeof STATUS_CONFIG]?.label}" تغییر داد</span>
                          )}
                        </p>
                        {history.notes && (
                          <p className="text-xs text-gray-600 mt-1">{history.notes}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatPersianDate(history.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Request Dialog */}
      {editingRequest && (
        <Dialog open={!!editingRequest} onOpenChange={() => setEditingRequest(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>پردازش درخواست</DialogTitle>
              <DialogDescription>
                درخواست #{toPersianNumber(editingRequest.id)} - {editingRequest.serviceTitle}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateRequest} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">وضعیت جدید</Label>
                  <Select name="status" defaultValue={editingRequest.status} required>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                        <SelectItem key={status} value={status}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">اولویت</Label>
                  <Select name="priority" defaultValue={editingRequest.priority} required>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => (
                        <SelectItem key={priority} value={priority}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">یادداشت‌ها</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  defaultValue={editingRequest.notes || ''}
                  placeholder="یادداشت‌های مربوط به این درخواست..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="rejectionReason">دلیل رد (در صورت رد درخواست)</Label>
                <Textarea
                  id="rejectionReason"
                  name="rejectionReason"
                  defaultValue={editingRequest.rejectionReason || ''}
                  placeholder="دلیل رد این درخواست..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setEditingRequest(null)}
                >
                  انصراف
                </Button>
                <Button type="submit">
                  بروزرسانی درخواست
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
