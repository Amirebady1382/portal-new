import { useState, useEffect } from "react";
import { ClipboardList, Eye, Calendar, User, Building, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { toPersianNumber, formatPersianDate } from "@/lib/persian-utils";
import { apiRequest } from "@/lib/queryClient";

const STATUS_CONFIG = {
  pending: { label: "در انتظار", color: "bg-yellow-100 text-yellow-800" },
  in_review: { label: "در حال بررسی", color: "bg-blue-100 text-blue-800" },
  approved: { label: "تایید شده", color: "bg-purple-100 text-purple-800" },
  completed: { label: "تکمیل شده", color: "bg-green-100 text-green-800" },
  rejected: { label: "رد شده", color: "bg-red-100 text-red-800" }
};

export default function ServiceRequestsSimpleClean() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [viewingRequest, setViewingRequest] = useState<any>(null);
  const [editingRequest, setEditingRequest] = useState<any>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      
      if (!token) {
        toast({
          title: "خطا",
          description: "لطفاً ابتدا وارد سامانه شوید",
          variant: "destructive"
        });
        return;
      }
      
      console.log("🔍 Fetching service requests...");
      const data = await apiRequest("GET", "/api/service-requests");
      console.log("✅ Service requests data:", data);
      
      setRequests(data?.requests || []);
      
      toast({
        title: "موفق",
        description: `${data?.requests?.length || 0} درخواست بارگیری شد`,
      });
      
    } catch (error: any) {
      console.error("❌ Error fetching requests:", error);
      toast({
        title: "خطا",
        description: error.message || "خطا در دریافت درخواست‌ها",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) return;
      
      const userData = await apiRequest("GET", "/api/auth/me");
      setUser(userData);
    } catch (error: any) {
      console.error("Error fetching user:", error);
    }
  };

  const handleUpdateStatus = async (requestId: number, newStatus: string) => {
    try {
      await apiRequest("PUT", `/api/service-requests/${requestId}`, {
        status: newStatus,
        notes: `وضعیت به ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label} تغییر کرد`
      });
      
      toast({
        title: "موفق",
        description: "وضعیت درخواست بروزرسانی شد"
      });
      
      fetchRequests(); // Refresh list
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "خطا در بروزرسانی وضعیت",
        variant: "destructive"
      });
    }
  };

  const handleDetailedUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
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
        title: "موفق",
        description: "درخواست با موفقیت بروزرسانی شد"
      });
      
      setEditingRequest(null);
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error.message || "خطا در بروزرسانی درخواست",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchUser();
    fetchRequests();
  }, []);

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    if (!config) return <Badge variant="outline">{status}</Badge>;
    
    return <Badge className={config.color}>{config.label}</Badge>;
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
              درخواست‌های خدمات
            </h1>
            <p className="text-text-secondary">
              مشاهده و مدیریت درخواست‌های خدمات
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mb-6">
            <Button onClick={fetchRequests} disabled={loading}>
              {loading ? "در حال بارگیری..." : "بروزرسانی"}
            </Button>
            
            <div className="text-sm text-gray-600">
              تعداد درخواست‌ها: {toPersianNumber(requests.length)}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const count = requests.filter((r: any) => r.status === status).length;
              
              return (
                <Card key={status}>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-primary">
                      {toPersianNumber(count)}
                    </p>
                    <p className="text-sm text-gray-600">{config.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Requests List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p>در حال بارگیری...</p>
              </div>
            ) : requests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">هیچ درخواستی یافت نشد</p>
                  <Button onClick={fetchRequests} className="mt-4">
                    تلاش مجدد
                  </Button>
                </CardContent>
              </Card>
            ) : (
              requests.map((request: any) => (
                <Card key={request.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <ClipboardList className="h-6 w-6 text-primary" />
                        <div>
                          <h3 className="font-semibold text-lg">
                            {request.serviceTitle || "خدمت نامشخص"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            درخواست #{toPersianNumber(request.id)}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building className="h-4 w-4" />
                        <span>{request.companyName || "شرکت نامشخص"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{request.userName || "کاربر نامشخص"}</span>
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

                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setViewingRequest(request)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        مشاهده
                      </Button>
                      
                      {!['completed', 'rejected'].includes(request.status) && (
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdateStatus(request.id, 'in_review')}
                            disabled={request.status === 'in_review'}
                          >
                            بررسی
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdateStatus(request.id, 'approved')}
                            disabled={request.status === 'approved'}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            تایید
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleUpdateStatus(request.id, 'rejected')}
                          >
                            رد
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingRequest(request)}
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            تفصیلی
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* View Request Dialog */}
          {viewingRequest && (
            <Dialog open={!!viewingRequest} onOpenChange={() => setViewingRequest(null)}>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>جزئیات درخواست</DialogTitle>
                  <DialogDescription>
                    درخواست #{toPersianNumber(viewingRequest.id)} - {viewingRequest.serviceTitle}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>شرکت</Label>
                      <p className="text-sm mt-1">{viewingRequest.companyName}</p>
                    </div>
                    <div>
                      <Label>درخواست‌کننده</Label>
                      <p className="text-sm mt-1">{viewingRequest.userName}</p>
                    </div>
                    <div>
                      <Label>وضعیت</Label>
                      <div className="mt-1">{getStatusBadge(viewingRequest.status)}</div>
                    </div>
                    <div>
                      <Label>تاریخ ایجاد</Label>
                      <p className="text-sm mt-1">{formatPersianDate(viewingRequest.createdAt)}</p>
                    </div>
                  </div>

                  {viewingRequest.notes && (
                    <div>
                      <Label>یادداشت‌ها</Label>
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">{viewingRequest.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Edit Request Dialog */}
          {editingRequest && (
            <Dialog open={!!editingRequest} onOpenChange={() => setEditingRequest(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>پردازش تفصیلی درخواست</DialogTitle>
                  <DialogDescription>
                    درخواست #{toPersianNumber(editingRequest.id)} - {editingRequest.serviceTitle}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleDetailedUpdate} className="space-y-4">
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
                      <Select name="priority" defaultValue={editingRequest.priority || 'normal'} required>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">کم</SelectItem>
                          <SelectItem value="normal">عادی</SelectItem>
                          <SelectItem value="high">بالا</SelectItem>
                          <SelectItem value="urgent">فوری</SelectItem>
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
        </main>
      </div>
    </div>
  );
}

