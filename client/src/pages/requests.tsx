import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toPersianNumber } from "@/lib/persian-utils";
import { 
  UserPlus, 
  CheckCircle, 
  X, 
  Clock,
  Building,
  User,
  FileText
} from "lucide-react";

export default function Requests() {
  const [selectedTab, setSelectedTab] = useState("companies");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all companies and filter pending ones
  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies"],
  });

  const pendingCompanies = companies.filter((company: any) => company.status === "pending");

  const { data: pendingDocuments = [] } = useQuery({
    queryKey: ["/api/documents", { status: "pending" }],
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ companyId, status }: { companyId: number; status: string }) => {
      return apiRequest("PATCH", `/api/companies/${companyId}`, { status });
    },
    onSuccess: () => {
      // Invalidate both general companies query and pending companies query
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "درخواست پردازش شد",
        description: "وضعیت شرکت تغییر کرد",
      });
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ documentId, status }: { documentId: number; status: string }) => {
      return apiRequest("PATCH", `/api/documents/${documentId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "درخواست پردازش شد",
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
              درخواست‌های جدید
            </h1>
            <p className="text-text-secondary">
              بررسی و تایید درخواست‌های در انتظار
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">شرکت‌های جدید</p>
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
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">اسناد جدید</p>
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
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-text-secondary">کل در انتظار</p>
                    <p className="text-2xl font-bold text-text-primary number-font">
                      {toPersianNumber(pendingCompanies.length + pendingDocuments.length)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="companies">شرکت‌های جدید</TabsTrigger>
              <TabsTrigger value="documents">اسناد جدید</TabsTrigger>
            </TabsList>

            <TabsContent value="companies">
              <Card>
                <CardHeader>
                  <CardTitle>شرکت‌های در انتظار تایید</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingCompanies.length === 0 ? (
                      <div className="text-center py-8">
                        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-text-secondary">شرکت جدیدی در انتظار تایید نیست</p>
                      </div>
                    ) : (
                      pendingCompanies.map((company: any) => (
                        <div key={company.id} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg mb-2">{company.name}</h3>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-text-secondary">شناسه ملی: </span>
                                  <span className="number-font font-medium">{company.nationalId}</span>
                                </div>
                                <div>
                                  <span className="text-text-secondary">نوع: </span>
                                  <span>{company.type}</span>
                                </div>
                                <div>
                                  <span className="text-text-secondary">شهر: </span>
                                  <span>{company.city}</span>
                                </div>
                                <div>
                                  <span className="text-text-secondary">تاریخ ثبت: </span>
                                  <span>{new Date(company.createdAt).toLocaleDateString('fa-IR')}</span>
                                </div>
                              </div>
                              {company.description && (
                                <p className="text-text-secondary text-sm mt-3">{company.description}</p>
                              )}
                            </div>
                            <div className="flex space-x-2 space-x-reverse">
                              <Button
                                size="sm"
                                onClick={() => updateCompanyMutation.mutate({ companyId: company.id, status: "approved" })}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4 ml-1" />
                                تایید
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => updateCompanyMutation.mutate({ companyId: company.id, status: "rejected" })}
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle>اسناد در انتظار بررسی</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingDocuments.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-text-secondary">سند جدیدی در انتظار بررسی نیست</p>
                      </div>
                    ) : (
                      pendingDocuments.map((document: any) => (
                        <div key={document.id} className="border rounded-lg p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg mb-2">{document.originalName}</h3>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-text-secondary">نوع: </span>
                                  <span>{document.category}</span>
                                </div>
                                <div>
                                  <span className="text-text-secondary">حجم: </span>
                                  <span>{Math.round(document.fileSize / 1024)} کیلوبایت</span>
                                </div>
                                <div>
                                  <span className="text-text-secondary">تاریخ آپلود: </span>
                                  <span>{new Date(document.createdAt).toLocaleDateString('fa-IR')}</span>
                                </div>
                                <div>
                                  <span className="text-text-secondary">فرمت: </span>
                                  <span>{document.mimeType}</span>
                                </div>
                              </div>
                              {document.description && (
                                <p className="text-text-secondary text-sm mt-3">{document.description}</p>
                              )}
                            </div>
                            <div className="flex space-x-2 space-x-reverse">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`/api/documents/${document.id}/download`, '_blank')}
                              >
                                مشاهده
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateDocumentMutation.mutate({ documentId: document.id, status: "approved" })}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4 ml-1" />
                                تایید
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => updateDocumentMutation.mutate({ documentId: document.id, status: "rejected" })}
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
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
