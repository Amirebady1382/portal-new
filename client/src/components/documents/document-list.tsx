import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toPersianNumber } from "@/lib/persian-utils";
import { 
  FolderOpen, 
  FileText, 
  Download, 
  Eye, 
  CheckSquare,
  Package,
  Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface DocumentType {
  id: number;
  companyId: number;
  uploadedById: number;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  description?: string;
  status: string;
  filePath: string;
  version: number;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentListProps {
  companyId: number;
}

export default function DocumentList({ companyId }: DocumentListProps) {
  const { user } = useAuth();
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery<DocumentType[]>({
    queryKey: [`/api/companies/${companyId}/documents`],
    enabled: !!companyId,
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      return apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      toast({
        title: "حذف موفقیت‌آمیز",
        description: "سند با موفقیت حذف شد",
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/documents`] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا در حذف",
        description: error.message || "خطا در حذف سند",
        variant: "destructive",
      });
    },
  });

  const bulkDownloadMutation = useMutation({
    mutationFn: async (documentIds: number[]) => {
      const response = await apiRequest("POST", `/api/companies/${companyId}/documents/download-zip`, {
        documentIds,
      }, { rawResponse: true });
      return (response as Response).blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Company_${companyId}_Documents.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "دانلود موفقیت‌آمیز",
        description: "فایل ZIP با موفقیت دانلود شد",
      });
      
      setSelectedDocuments([]);
    },
    onError: (error: any) => {
      toast({
        title: "خطا در دانلود",
        description: error.message || "خطا در ایجاد فایل ZIP",
        variant: "destructive",
      });
    },
  });

  const handleDocumentDownload = async (documentId: number) => {
    try {
      const response = await apiRequest("GET", `/api/documents/${documentId}/download`, undefined, { rawResponse: true });
      
      if (!(response as Response).ok) {
        throw new Error("خطا در دانلود فایل");
      }
      
      const blob = await (response as Response).blob();
      const contentDisposition = (response as Response).headers.get("Content-Disposition");
      const filename = contentDisposition?.split("filename=")[1]?.replace(/"/g, "") || "document";
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "دانلود موفقیت‌آمیز",
        description: "فایل با موفقیت دانلود شد",
      });
    } catch (error: any) {
      toast({
        title: "خطا در دانلود",
        description: error.message || "خطا در دانلود فایل",
        variant: "destructive",
      });
    }
  };

  const handleBulkDownload = () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "هیچ فایلی انتخاب نشده",
        description: "لطفاً حداقل یک فایل برای دانلود انتخاب کنید",
        variant: "destructive",
      });
      return;
    }
    
    bulkDownloadMutation.mutate(selectedDocuments);
  };

  const handleDownloadAll = () => {
    const allDocumentIds = documents.map((doc) => doc.id);
    bulkDownloadMutation.mutate(allDocumentIds);
  };

  const toggleDocumentSelection = (documentId: number) => {
    setSelectedDocuments(prev =>
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map((doc) => doc.id));
    }
  };

  const getFileIcon = (mimeType: string | undefined) => {
    if (!mimeType) {
      return <FileText className="h-5 w-5 text-gray-600" />;
    }
    
    const lowerMimeType = mimeType.toLowerCase();
    
    if (lowerMimeType.includes("pdf")) {
      return <FileText className="h-5 w-5 text-red-600" />;
    } else if (lowerMimeType.includes("excel") || lowerMimeType.includes("spreadsheet")) {
      return <FileText className="h-5 w-5 text-green-600" />;
    } else if (lowerMimeType.includes("word") || lowerMimeType.includes("document")) {
      return <FileText className="h-5 w-5 text-blue-600" />;
    } else if (lowerMimeType.includes("image")) {
      return <FileText className="h-5 w-5 text-purple-600" />;
    }
    return <FileText className="h-5 w-5 text-gray-600" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 بایت";
    const k = 1024;
    const sizes = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${toPersianNumber((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <Card className="shadow-sm border-0">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold text-text-primary flex items-center">
            <FolderOpen className="h-5 w-5 ml-2 text-primary" />
            اسناد آپلود شده
          </CardTitle>
          <Badge variant="secondary" className="number-font">
            {toPersianNumber(documents.length)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="loading-spinner h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-text-secondary">در حال بارگذاری اسناد...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>هیچ سندی آپلود نشده است</p>
          </div>
        ) : (
          <>
            {/* Selection Controls */}
            {documents.length > 0 && (
              <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <Checkbox
                    checked={selectedDocuments.length === documents.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm text-text-primary">
                    انتخاب همه ({toPersianNumber(documents.length)} سند)
                  </span>
                </div>
                {selectedDocuments.length > 0 && (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <span className="text-sm text-text-secondary">
                      {toPersianNumber(selectedDocuments.length)} مورد انتخاب شده
                    </span>
                    <Button
                      size="sm"
                      onClick={handleBulkDownload}
                      disabled={bulkDownloadMutation.isPending}
                    >
                      <Package className="h-4 w-4 ml-1" />
                      دانلود انتخابی
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Document List */}
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {documents.map((document) => (
                <div 
                  key={document.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                >
                  <Checkbox
                    checked={selectedDocuments.includes(document.id)}
                    onCheckedChange={() => toggleDocumentSelection(document.id)}
                    className="ml-3"
                  />
                  
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center ml-3">
                    {getFileIcon(document.mimeType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {document.originalName}
                    </p>
                    <div className="flex items-center space-x-4 space-x-reverse mt-1">
                      <p className="text-xs text-text-secondary">
                        {new Date(document.createdAt).toLocaleDateString("fa-IR")}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatFileSize(document.fileSize)}
                      </p>
                      {document.category && (
                        <Badge variant="outline" className="text-xs">
                          {document.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDocumentDownload(document.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDocumentDownload(document.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {user?.role === "customer" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm("آیا از حذف این سند اطمینان دارید؟")) {
                            deleteDocumentMutation.mutate(document.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bulk Actions */}
            {documents.length > 0 && (
              <div className="mt-6 flex space-x-3 space-x-reverse">
                <Button 
                  onClick={handleDownloadAll}
                  disabled={bulkDownloadMutation.isPending}
                  className="flex-1 btn-hover"
                >
                  {bulkDownloadMutation.isPending ? (
                    <div className="loading-spinner h-4 w-4 border-2 border-white border-t-transparent rounded-full ml-1"></div>
                  ) : (
                    <Download className="h-4 w-4 ml-1" />
                  )}
                  دانلود همه (ZIP)
                </Button>
                <Button 
                  variant="outline"
                  onClick={toggleSelectAll}
                  className="btn-hover"
                >
                  <CheckSquare className="h-4 w-4 ml-1" />
                  انتخاب چندگانه
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
