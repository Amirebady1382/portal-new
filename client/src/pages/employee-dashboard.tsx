import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toPersianNumber } from "@/lib/persian-utils";
import { 
  Clock, 
  FileText, 
  CheckCircle, 
  X, 
  Download, 
  Building,
  AlertTriangle
} from "lucide-react";

interface Company {
  id: number;
  name: string;
  description?: string;
  status: string;
  nationalId: string;
  type: string;
  city?: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentItem {
  id: number;
  companyId?: number;
  company_id?: number;
  originalName?: string;
  original_name?: string;
  category?: string;
  description?: string;
  status: string;
  fileSize?: number;
  file_size?: number;
  createdAt?: string;
  created_at?: string;
}

export default function EmployeeDashboard() {
  const [selectedTab, setSelectedTab] = useState("pending");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: documents = [] } = useQuery<DocumentItem[]>({
    queryKey: ["/api/documents"],
  });

  // Debug log
  console.log("Documents from API:", documents);

  const pendingCompanies = companies.filter(c => c.status === "pending");
  const pendingDocuments = documents.filter(d => d.status === "pending");
  console.log("Pending documents:", pendingDocuments);
  
  const approvedToday = companies.filter(c => 
    c.status === "approved" && 
    new Date(c.updatedAt).toDateString() === new Date().toDateString()
  );

  const handleCompanyAction = useMutation({
    mutationFn: async ({ companyId, action }: { companyId: number; action: string }) => {
      return apiRequest("PATCH", `/api/companies/${companyId}`, { status: action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "عملیات موفق",
        description: "وضعیت شرکت به‌روزرسانی شد",
      });
    },
  });

  const handleDocumentAction = useMutation({
    mutationFn: async ({ documentId, action }: { documentId: number; action: string }) => {
      return apiRequest("PATCH", `/api/documents/${documentId}`, { status: action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "عملیات موفق",
        description: "وضعیت سند تغییر کرد",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              پنل کارشناس
            </h1>
            <p className="text-text-secondary">
              بررسی و تایید شرکت‌ها و اسناد
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">شرکت‌های در انتظار</p>
                    <p className="text-2xl font-bold text-text-primary number-font">
                      {toPersianNumber(pendingCompanies.length)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">اسناد در انتظار</p>
                    <p className="text-2xl font-bold text-text-primary number-font">
                      {toPersianNumber(pendingDocuments.length)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">تایید امروز</p>
                    <p className="text-2xl font-bold text-text-primary number-font">
                      {toPersianNumber(approvedToday.length)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card className="shadow-sm border-0">
            <CardHeader>
              <div className="flex space-x-1 space-x-reverse">
                <Button
                  variant={selectedTab === "pending" ? "default" : "outline"}
                  onClick={() => setSelectedTab("pending")}
                  className="btn-hover"
                >
                  <Clock className="h-4 w-4 ml-1" />
                  در انتظار بررسی
                </Button>
                <Button
                  variant={selectedTab === "documents" ? "default" : "outline"}
                  onClick={() => setSelectedTab("documents")}
                  className="btn-hover"
                >
                  <FileText className="h-4 w-4 ml-1" />
                  اسناد
                </Button>
                <Button
                  variant={selectedTab === "recent" ? "default" : "outline"}
                  onClick={() => setSelectedTab("recent")}
                  className="btn-hover"
                >
                  <CheckCircle className="h-4 w-4 ml-1" />
                  تایید شده‌ها
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedTab === "pending" && (
                <div className="space-y-4">
                  {pendingCompanies.length === 0 ? (
                    <div className="text-center py-8">
                      <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-text-secondary">شرکت جدیدی در انتظار بررسی نیست</p>
                    </div>
                  ) : (
                    pendingCompanies.map((company) => (
                      <div key={company.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{company.name}</h3>
                            <p className="text-text-secondary mb-2">{company.description}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-text-secondary">شناسه ملی: </span>
                                <span className="number-font">{company.nationalId}</span>
                              </div>
                              <div>
                                <span className="text-text-secondary">نوع: </span>
                                <span>{company.type}</span>
                              </div>
                              <div>
                                <span className="text-text-secondary">تاریخ ثبت: </span>
                                <span>{new Date(company.createdAt).toLocaleDateString('fa-IR')}</span>
                              </div>
                              <div>
                                <span className="text-text-secondary">شهر: </span>
                                <span>{company.city}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2 space-x-reverse">
                            <Button
                              size="sm"
                              onClick={() => handleCompanyAction.mutate({ companyId: company.id, action: "approved" })}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4 ml-1" />
                              تایید
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleCompanyAction.mutate({ companyId: company.id, action: "rejected" })}
                            >
                              <X className="h-4 w-4 ml-1" />
                              رد
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedTab === "documents" && (
                <div className="space-y-4">
                  {pendingDocuments.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-text-secondary">سند جدیدی در انتظار بررسی نیست</p>
                    </div>
                  ) : (
                    pendingDocuments.map((document: DocumentItem) => {
                      // Handle both camelCase and snake_case
                      const docId = document.id;
                      const originalName = document.originalName || document.original_name || 'سند بدون نام';
                      const category = document.category || 'other';
                      const description = document.description || '';
                      const createdAt = document.createdAt || document.created_at;
                      const fileSize = document.fileSize || document.file_size;
                      const companyId = document.companyId || document.company_id;
                      
                      // Find company name
                      const company = companies.find((c: Company) => c.id === companyId);
                      const companyName = company?.name || 'نامشخص';
                      
                      return (
                        <div key={docId} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg">{originalName}</h3>
                              {description && (
                                <p className="text-text-secondary mb-2">{description}</p>
                              )}
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-text-secondary">شرکت: </span>
                                  <span className="font-medium">{companyName}</span>
                                </div>
                                <div>
                                  <span className="text-text-secondary">دسته‌بندی: </span>
                                  <span>{category}</span>
                                </div>
                                <div>
                                  <span className="text-text-secondary">تاریخ آپلود: </span>
                                  <span>{createdAt ? new Date(createdAt).toLocaleDateString('fa-IR') : 'نامشخص'}</span>
                                </div>
                                {fileSize && (
                                  <div>
                                    <span className="text-text-secondary">حجم: </span>
                                    <span className="number-font">
                                      {toPersianNumber(Math.round(fileSize / 1024))} کیلوبایت
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2 space-x-reverse">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    const response = await apiRequest("GET", `/api/documents/${docId}/download`, undefined, { rawResponse: true });
                                    
                                    if (!(response as Response).ok) {
                                      throw new Error('خطا در دانلود فایل');
                                    }
                                    
                                    const blob = await (response as Response).blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const link = window.document.createElement('a');
                                    link.href = url;
                                    link.download = originalName;
                                    window.document.body.appendChild(link);
                                    link.click();
                                    window.document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                  } catch (error) {
                                    toast({
                                      title: "خطا در دانلود",
                                      description: "فایل قابل دانلود نیست",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Download className="h-4 w-4 ml-1" />
                                دانلود
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleDocumentAction.mutate({ documentId: docId, action: "approved" })}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4 ml-1" />
                                تایید
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDocumentAction.mutate({ documentId: docId, action: "rejected" })}
                              >
                                <X className="h-4 w-4 ml-1" />
                                رد
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {selectedTab === "recent" && (
                <div className="space-y-4">
                  {approvedToday.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-text-secondary">امروز شرکتی تایید نشده است</p>
                    </div>
                  ) : (
                    approvedToday.map((company) => (
                      <div key={company.id} className="border rounded-lg p-4 bg-green-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg">{company.name}</h3>
                            <p className="text-text-secondary mb-2">{company.description}</p>
                            <Badge className="bg-green-100 text-green-800">تایید شده</Badge>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
