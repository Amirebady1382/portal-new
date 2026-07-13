import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toPersianNumber } from "@/lib/persian-utils";
import TaxDeclarationModal from "@/components/tax-declaration-modal";
import { useTaxDeclarationStatus } from "@/hooks/use-tax-declaration-status";
import {
  ArrowLeft,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Calendar
} from "lucide-react";

export default function TaxDeclarationManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Get user's company
  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies"],
  });

  const companiesArray = companies as any[];
  const userCompany = companiesArray.length > 0 ? companiesArray[0] : null;

  // Get tax declaration status
  const { data: taxStatus, refetch } = useTaxDeclarationStatus(userCompany?.id);

  // Financial summary removed - only for employees/admins

  const handleReprocess = async () => {
    if (!userCompany?.id) return;
    
    try {
      await apiRequest("POST", `/api/companies/${userCompany.id}/reprocess-tax-declaration`);
      toast({
        title: "پردازش مجدد شروع شد",
        description: "لطفاً چند لحظه صبر کنید...",
      });
      
      setTimeout(() => {
        refetch();
      }, 3000);
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در شروع پردازش مجدد",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    if (!taxStatus) return null;

    switch (taxStatus.status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">✅ پردازش موفق</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">
          <Clock className="h-3 w-3 ml-1 animate-spin" />
          در حال پردازش...
        </Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">❌ خطا در پردازش</Badge>;
      default:
        return <Badge variant="outline">در انتظار پردازش</Badge>;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'نامشخص';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${toPersianNumber((bytes / 1024).toFixed(1))} KB`;
    return `${toPersianNumber((bytes / (1024 * 1024)).toFixed(1))} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/customer")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              بازگشت به داشبورد
            </Button>
            
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              مدیریت اظهارنامه مالیاتی یا گزارش حسابرسی
            </h1>
            <p className="text-text-secondary">
              مشاهده و بروزرسانی اظهارنامه مالیاتی یا گزارش حسابرسی شرکت
            </p>
          </div>

          {/* Current Tax Declaration Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="h-5 w-5 ml-2 text-blue-600" />
                  وضعیت اظهارنامه یا گزارش حسابرسی فعلی
                </span>
                {getStatusBadge()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!taxStatus?.hasTaxDeclaration ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">اظهارنامه یا گزارش حسابرسی آپلود نشده</h3>
                  <p className="text-gray-600 mb-4">
                    لطفاً اظهارنامه مالیاتی یا گزارش حسابرسی شرکت خود را آپلود کنید
                  </p>
                  <Button onClick={() => setShowUploadModal(true)}>
                    <Upload className="h-4 w-4 ml-2" />
                      آپلود اظهارنامه یا گزارش حسابرسی
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">نام فایل</p>
                      <p className="font-semibold flex items-center">
                        <FileText className="h-4 w-4 ml-2 text-blue-600" />
                        {taxStatus.document?.filename}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">حجم فایل</p>
                      <p className="font-semibold number-font">
                        {formatFileSize(taxStatus.document?.fileSize)}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">تاریخ آپلود</p>
                      <p className="font-semibold flex items-center">
                        <Calendar className="h-4 w-4 ml-2 text-gray-600" />
                        {taxStatus.document?.uploadedAt 
                          ? new Date(taxStatus.document.uploadedAt).toLocaleDateString('fa-IR')
                          : 'نامشخص'
                        }
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">آخرین پردازش</p>
                      <p className="font-semibold flex items-center">
                        <Clock className="h-4 w-4 ml-2 text-gray-600" />
                        {taxStatus.lastUpdated 
                          ? new Date(taxStatus.lastUpdated).toLocaleDateString('fa-IR')
                          : 'هنوز پردازش نشده'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Error Message */}
                  {taxStatus.status === 'error' && taxStatus.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-red-600 ml-2 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-red-900 mb-1">خطا در پردازش</h4>
                          <p className="text-sm text-red-800">{taxStatus.error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2 space-x-reverse pt-4 border-t">
                    <Button 
                      onClick={() => setShowUploadModal(true)}
                      variant="outline"
                    >
                      <Upload className="h-4 w-4 ml-2" />
                      تغییر اظهارنامه یا گزارش حسابرسی
                    </Button>
                    
                    {taxStatus.status === 'error' && (
                      <Button onClick={handleReprocess} variant="outline">
                        <RefreshCw className="h-4 w-4 ml-2" />
                        پردازش مجدد
                      </Button>
                    )}
                    
                    {taxStatus.status === 'completed' && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm text-blue-800 flex items-center">
                          <CheckCircle className="h-4 w-4 ml-2" />
                          اظهارنامه با موفقیت پردازش شد و برای کارشناسان قابل مشاهده است
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary - فقط کارشناسان می‌توانند ببینند */}
        </main>
      </div>

      {/* Upload Modal */}
      <TaxDeclarationModal
        open={showUploadModal}
        companyId={userCompany?.id}
        onComplete={() => {
          setShowUploadModal(false);
          refetch();
          queryClient.invalidateQueries({ queryKey: [`/api/companies/${userCompany?.id}/financial-summary`] });
        }}
      />
    </div>
  );
}


