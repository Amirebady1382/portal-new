import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toPersianNumber } from "@/lib/persian-utils";
import { 
  FolderOpen, 
  Search, 
  Filter,
  Download,
  Eye,
  FileText,
  Image,
  Archive,
  CheckCircle,
  Clock,
  X
} from "lucide-react";

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documentsData = [], isLoading } = useQuery({
    queryKey: ["/api/documents", { search: searchTerm, category: categoryFilter, status: statusFilter }],
  });

  // Type cast the documents data
  const documents = documentsData as any[];

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ documentId, status }: { documentId: number; status: string }) => {
      return apiRequest("PATCH", `/api/documents/${documentId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "وضعیت به‌روزرسانی شد",
        description: "وضعیت سند با موفقیت تغییر کرد",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در به‌روزرسانی وضعیت",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">تایید شده</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">در انتظار</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">رد شده</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-600" />;
    } else if (mimeType?.includes('pdf')) {
      return <FileText className="h-4 w-4 text-red-600" />;
    } else if (mimeType?.includes('zip') || mimeType?.includes('rar')) {
      return <Archive className="h-4 w-4 text-purple-600" />;
    } else {
      return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} بایت`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} کیلوبایت`;
    return `${Math.round(bytes / (1024 * 1024))} مگابایت`;
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-64 p-4 md:p-6 fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              تمامی اسناد
            </h1>
            <p className="text-text-secondary">
              مدیریت و مشاهده تمامی اسناد آپلود شده در سیستم
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">فیلترها و جستجو</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="جستجوی نام فایل یا دسته..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="دسته‌بندی" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه دسته‌ها</SelectItem>
                    <SelectItem value="identity">اسناد هویتی</SelectItem>
                    <SelectItem value="financial">اسناد مالی</SelectItem>
                    <SelectItem value="technical">اسناد فنی</SelectItem>
                    <SelectItem value="legal">اسناد حقوقی</SelectItem>
                    <SelectItem value="other">سایر</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="وضعیت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                    <SelectItem value="pending">در انتظار</SelectItem>
                    <SelectItem value="approved">تایید شده</SelectItem>
                    <SelectItem value="rejected">رد شده</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                }}>
                  <Filter className="h-4 w-4 ml-1" />
                  پاک کردن فیلترها
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="grid gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">سندی یافت نشد</h3>
                  <p className="text-gray-600">هیچ سندی با معیارهای جستجو یافت نشد</p>
                </CardContent>
              </Card>
            ) : (
              documents.map((document: any) => (
                <Card key={document.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 space-x-reverse mb-3">
                          {getFileIcon(document.mimeType)}
                          <h3 className="text-lg font-bold text-text-primary">{document.originalName}</h3>
                          {getStatusBadge(document.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-text-secondary">دسته: </span>
                            <span className="font-medium">{document.category}</span>
                          </div>
                          <div>
                            <span className="text-text-secondary">حجم: </span>
                            <span className="number-font">{formatFileSize(document.fileSize)}</span>
                          </div>
                          <div>
                            <span className="text-text-secondary">تاریخ آپلود: </span>
                            <span>{new Date(document.createdAt).toLocaleDateString('fa-IR')}</span>
                          </div>
                          <div>
                            <span className="text-text-secondary">نوع فایل: </span>
                            <span>{document.mimeType}</span>
                          </div>
                        </div>

                        {document.description && (
                          <p className="text-text-secondary text-sm mt-3 line-clamp-2">
                            {document.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2 mr-4">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/documents/${document.id}/download`, {
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                                }
                              });
                              if (!response.ok) throw new Error('خطا در دانلود فایل');
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              window.open(url, '_blank');
                            } catch (error) {
                              alert('خطا در نمایش فایل');
                            }
                          }}
                          className="btn-hover"
                        >
                          <Eye className="h-4 w-4 ml-1" />
                          مشاهده
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/documents/${document.id}/download`, {
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                                }
                              });
                              if (!response.ok) throw new Error('خطا در دانلود فایل');
                              const blob = await response.blob();
                              const contentDisposition = response.headers.get('Content-Disposition');
                              const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 'document';
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = filename;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              alert('خطا در دانلود فایل');
                            }
                          }}
                        >
                          <Download className="h-4 w-4 ml-1" />
                          دانلود
                        </Button>
                        
                        {document.status === "pending" && (
                          <div className="flex space-x-1 space-x-reverse">
                            <Button
                              size="sm"
                              onClick={() => updateDocumentMutation.mutate({ documentId: document.id, status: "approved" })}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateDocumentMutation.mutate({ documentId: document.id, status: "rejected" })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Stats Summary */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600 number-font">
                    {toPersianNumber(documents.length)}
                  </p>
                  <p className="text-sm text-text-secondary">کل اسناد</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600 number-font">
                    {toPersianNumber(documents.filter((d: any) => d.status === "approved").length)}
                  </p>
                  <p className="text-sm text-text-secondary">تایید شده</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600 number-font">
                    {toPersianNumber(documents.filter((d: any) => d.status === "pending").length)}
                  </p>
                  <p className="text-sm text-text-secondary">در انتظار</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600 number-font">
                    {toPersianNumber(documents.filter((d: any) => d.status === "rejected").length)}
                  </p>
                  <p className="text-sm text-text-secondary">رد شده</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}