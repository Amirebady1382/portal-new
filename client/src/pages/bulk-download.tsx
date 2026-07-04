import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { toPersianNumber } from "@/lib/persian-utils";
import { 
  Download, 
  FileText,
  Archive,
  CheckCircle,
  X,
  Filter
} from "lucide-react";

export default function BulkDownload() {
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState("approved");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  const { toast } = useToast();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/documents", { status: statusFilter, category: categoryFilter }],
  });

  const handleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map((doc: any) => doc.id));
    }
  };

  const handleSelectDocument = (documentId: number) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleBulkDownload = async () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "خطا",
        description: "لطفاً حداقل یک سند انتخاب کنید",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/documents/bulk-download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ documentIds: selectedDocuments }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `documents-${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "دانلود موفق",
          description: `${toPersianNumber(selectedDocuments.length)} سند با موفقیت دانلود شد`,
        });
      } else {
        throw new Error("خطا در دانلود");
      }
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در دانلود فایل‌ها",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes('pdf')) {
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

  const totalSize = selectedDocuments.reduce((sum, docId) => {
    const doc = documents.find((d: any) => d.id === docId);
    return sum + (doc?.fileSize || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              دانلود گروهی اسناد
            </h1>
            <p className="text-text-secondary">
              انتخاب و دانلود چندین سند به صورت یکجا
            </p>
          </div>

          {/* Controls */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">تنظیمات دانلود</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="وضعیت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">تایید شده</SelectItem>
                    <SelectItem value="pending">در انتظار</SelectItem>
                    <SelectItem value="rejected">رد شده</SelectItem>
                    <SelectItem value="all">همه</SelectItem>
                  </SelectContent>
                </Select>

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
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={handleSelectAll}>
                  {selectedDocuments.length === documents.length ? "لغو انتخاب همه" : "انتخاب همه"}
                </Button>

                <Button 
                  onClick={handleBulkDownload}
                  disabled={selectedDocuments.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="h-4 w-4 ml-1" />
                  دانلود انتخاب شده ({toPersianNumber(selectedDocuments.length)})
                </Button>
              </div>

              {selectedDocuments.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>{toPersianNumber(selectedDocuments.length)}</strong> سند انتخاب شده
                    - حجم کل: <strong>{formatFileSize(totalSize)}</strong>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle>اسناد قابل دانلود</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="grid gap-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-text-secondary">سندی برای دانلود یافت نشد</p>
                  </div>
                ) : (
                  documents.map((document: any) => (
                    <div key={document.id} className="flex items-center space-x-3 space-x-reverse p-4 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        checked={selectedDocuments.includes(document.id)}
                        onCheckedChange={() => handleSelectDocument(document.id)}
                      />
                      
                      <div className="flex items-center space-x-2 space-x-reverse">
                        {getFileIcon(document.mimeType)}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-medium">{document.originalName}</h3>
                        <div className="flex items-center space-x-4 space-x-reverse text-sm text-text-secondary">
                          <span>دسته: {document.category}</span>
                          <span>حجم: {formatFileSize(document.fileSize)}</span>
                          <span>تاریخ: {new Date(document.createdAt).toLocaleDateString('fa-IR')}</span>
                        </div>
                      </div>

                      <Badge 
                        className={
                          document.status === "approved" ? "bg-green-100 text-green-800" :
                          document.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }
                      >
                        {document.status === "approved" ? "تایید شده" : 
                         document.status === "pending" ? "در انتظار" : "رد شده"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
