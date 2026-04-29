import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, FileText, CheckCircle, Clock, AlertTriangle, Download, Eye, File, ExternalLink } from "lucide-react";

interface FormContentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  submission: any;
}

export default function FormContentViewer({ isOpen, onClose, submission }: FormContentViewerProps) {
  // Parse form data safely
  const parsedFormData = React.useMemo(() => {
    try {
      console.log("📝 Raw form data:", submission.formData);
      const parsed = JSON.parse(submission.formData);
      console.log("✅ Parsed form data:", parsed);
      return parsed;
    } catch (error) {
      console.error("❌ Error parsing form data:", error);
      console.error("Raw data was:", submission.formData);
      return {};
    }
  }, [submission.formData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "rejected":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved":
        return "تایید شده";
      case "rejected":
        return "رد شده";
      case "pending":
        return "در انتظار بررسی";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderFieldValue = (key: string, value: any) => {
    // Check if value is a file object (supports both fileUrl and fileId)
    if (value && typeof value === 'object' && value.fileName && (value.fileUrl || value.fileId)) {
      const downloadUrl = value.fileUrl || `/api/documents/${value.fileId}/download`;
      
      return (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <File className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">{value.fileName}</span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch(downloadUrl, {
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
                className="text-xs bg-white hover:bg-blue-50"
              >
                <Eye className="h-3 w-3 ml-1" />
                مشاهده
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch(downloadUrl, {
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                      }
                    });
                    if (!response.ok) throw new Error('خطا در دانلود فایل');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = value.fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (error) {
                    alert('خطا در دانلود فایل');
                  }
                }}
                className="text-xs bg-white hover:bg-blue-50"
              >
                <Download className="h-3 w-3 ml-1" />
                دانلود
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Check if it's an array
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc list-inside space-y-1">
          {value.map((item, index) => (
            <li key={index} className="text-gray-700">{String(item)}</li>
          ))}
        </ul>
      );
    }

    // Check if it's an object (but not a file object)
    if (typeof value === 'object' && value !== null) {
      return (
        <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    // For simple values
    return (
      <div className="p-2 bg-white border rounded">
        <span className="text-gray-800">{String(value) || "خالی"}</span>
      </div>
    );
  };

  if (!submission) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            مشاهده محتوای فرم
          </DialogTitle>
          <DialogDescription>
            جزئیات و محتوای فرم ارسال شده
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4" style={{minHeight: 0}}>
          <div className="space-y-6">
            {/* Form metadata */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">اطلاعات کلی</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-gray-500">ارسال‌کننده</p>
                      <p className="font-medium">کاربر #{submission.userId}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-gray-500">تاریخ ارسال</p>
                      <p className="font-medium">
                        {new Date(submission.createdAt).toLocaleDateString('fa-IR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(submission.status)}
                    <div>
                      <p className="text-gray-500">وضعیت</p>
                      <Badge className={getStatusColor(submission.status)}>
                        {getStatusLabel(submission.status)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-gray-500">نوع فرم</p>
                      <p className="font-medium">{submission.requirement?.title || 'فرم'}</p>
                    </div>
                  </div>
                </div>
                
                {submission.reviewNotes && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 mb-1">نظرات بررسی:</p>
                    <p className="text-sm text-yellow-700">{submission.reviewNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Form content */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">محتوای فرم</CardTitle>
              </CardHeader>
              <CardContent>
                {!parsedFormData || Object.keys(parsedFormData).length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>محتوای فرم خالی است یا قابل نمایش نیست</p>
                    <p className="text-xs mt-2">Raw data: {submission.formData}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">
                        تعداد فیلدهای پر شده: {Object.keys(parsedFormData).length}
                      </p>
                    </div>
                    
                    {Object.entries(parsedFormData).map(([key, value]) => (
                      <div key={key} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col space-y-2">
                          <label className="font-medium text-sm text-gray-700 border-b border-gray-200 pb-1">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </label>
                          <div className="text-sm text-gray-900">
                            {renderFieldValue(key, value)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex-shrink-0">
        <Separator />
          <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            بستن
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 