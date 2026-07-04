import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { toPersianNumber } from "@/lib/persian-utils";
import { 
  CloudUpload, 
  File, 
  X, 
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText
} from "lucide-react";

interface DocumentUploadProps {
  /** شناسه شرکت؛ در صورت عدم وجود، فایل به صورت عمومی آپلود می‌شود */
  companyId?: number;
  /** مقدار پیش‌فرض دسته‌بندی؛ در این حالت انتخاب دسته‌بندی قفل می‌شود */
  category?: string;
  /** عنوان دلخواه برای سند؛ اختیاری */
  title?: string;
  /** توضیحات اولیه */
  description?: string;
  /** تابع فراخوانی بعد از اتمام موفقیت‌آمیز */
  onUploadComplete?: () => void;
}

export default function DocumentUpload({ companyId, category: defaultCategory = "", title = "", description: defaultDescription = "", onUploadComplete }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState(defaultCategory);
  const [description, setDescription] = useState(defaultDescription);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setProcessingStatus('uploading');
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`خطا ${xhr.status}: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error("خطا در آپلود فایل"));

        // Get auth token from localStorage
        const token = localStorage.getItem("auth_token");
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }

        const endpoint = companyId ? `/api/companies/${companyId}/documents` : "/api/documents";
        xhr.open("POST", endpoint);
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      // Simulate processing/OCR step
      setProcessingStatus('processing');
      setUploadProgress(100);
      
      setTimeout(() => {
        setProcessingStatus('success');
        toast({
          title: "آپلود موفقیت‌آمیز",
          description: "فایل با موفقیت آپلود و پردازش شد",
        });

        // Reset form after a delay
        setTimeout(() => {
          setSelectedFile(null);
          setCategory(defaultCategory); // Keep default category if set
          setDescription(defaultDescription); // Keep default description if set
          setUploadProgress(0);
          setProcessingStatus('idle');

          // Invalidate queries
          if (companyId) {
            queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/documents`] });
          } else {
            queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
          }

          onUploadComplete?.();
        }, 2000);
      }, 1500);
    },
    onError: (error: any) => {
      setProcessingStatus('error');
      toast({
        title: "خطا در آپلود",
        description: error.message || "خطا در آپلود فایل",
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadProgress(0);
    setProcessingStatus('idle');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (processingStatus === 'uploading' || processingStatus === 'processing') return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (processingStatus === 'uploading' || processingStatus === 'processing') return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast({
        title: "فایل انتخاب نشده",
        description: "لطفاً ابتدا فایل مورد نظر را انتخاب کنید",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "دسته‌بندی انتخاب نشده",
        description: "لطفاً دسته‌بندی فایل را انتخاب کنید",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("category", category);
    if (title) formData.append("title", title);
    formData.append("description", description);

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 بایت";
    const k = 1024;
    const sizes = ["بایت", "کیلوبایت", "مگابایت", "گیگابایت"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${toPersianNumber((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getFileIcon = (file: File) => {
    if (file.type.includes("pdf")) {
      return <File className="h-8 w-8 text-red-500" />;
    } else if (file.type.includes("excel") || file.type.includes("spreadsheet")) {
      return <File className="h-8 w-8 text-green-500" />;
    } else if (file.type.includes("word") || file.type.includes("document")) {
      return <File className="h-8 w-8 text-blue-500" />;
    } else if (file.type.includes("image")) {
      return <File className="h-8 w-8 text-purple-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`upload-area p-8 text-center rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer relative overflow-hidden ${
          isDragOver
            ? "border-primary bg-blue-50 scale-[1.02]"
            : processingStatus === 'success'
            ? "border-green-500 bg-green-50"
            : processingStatus === 'error'
            ? "border-red-500 bg-red-50"
            : "border-gray-300 hover:border-primary hover:bg-gray-50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => {
          if (processingStatus !== 'uploading' && processingStatus !== 'processing') {
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileInputChange}
          accept="*/*"
          disabled={processingStatus === 'uploading' || processingStatus === 'processing'}
        />
        
        {processingStatus === 'success' ? (
          <div className="space-y-4 animate-in fade-in zoom-in duration-300">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <p className="text-green-800 font-medium text-lg">آپلود با موفقیت انجام شد</p>
          </div>
        ) : processingStatus === 'processing' ? (
          <div className="space-y-4 animate-pulse">
            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
            <p className="text-primary font-medium">در حال پردازش فایل...</p>
          </div>
        ) : selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              {getFileIcon(selectedFile)}
            </div>
            <div>
              <p className="font-medium text-text-primary">{selectedFile.name}</p>
              <p className="text-sm text-text-secondary">
                {formatFileSize(selectedFile.size)} • {selectedFile.type || "نوع نامشخص"}
              </p>
            </div>
            {processingStatus === 'idle' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setUploadProgress(0);
                }}
                className="text-text-secondary hover:text-destructive"
              >
                <X className="h-4 w-4 ml-1" />
                حذف فایل
              </Button>
            )}
          </div>
        ) : (
          <div>
            <CloudUpload className={`h-12 w-12 mx-auto mb-4 transition-colors ${isDragOver ? "text-primary" : "text-text-secondary"}`} />
            <p className="text-text-primary font-medium mb-2">
              فایل‌های خود را اینجا بکشید یا کلیک کنید
            </p>
            <p className="text-sm text-text-secondary mb-4">
              پشتیبانی از تمامی فرمت‌های فایل
            </p>
            <Button className="btn-hover" variant={isDragOver ? "secondary" : "default"}>
              انتخاب فایل
            </Button>
          </div>
        )}

        {/* Progress Overlay */}
        {processingStatus === 'uploading' && (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center backdrop-blur-sm z-10">
            <div className="w-64 space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-medium text-primary">در حال آپلود...</span>
                <span className="text-sm font-bold text-primary number-font">
                  {toPersianNumber(uploadProgress)}%
                </span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          </div>
        )}
      </div>

      {/* Form Fields - Only show when idle or error */}
      {(processingStatus === 'idle' || processingStatus === 'error') && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div>
            <Label htmlFor="category" className="text-sm font-medium text-text-primary">
              دسته‌بندی *
            </Label>
            <Select value={category} onValueChange={setCategory} disabled={!!defaultCategory}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب دسته‌بندی" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="اظهارنامه مالیاتی">⭐ اظهارنامه مالیاتی (الزامی)</SelectItem>
                <SelectItem value="business-plan">طرح کسب و کار</SelectItem>
                <SelectItem value="financial-statements">صورت‌های مالی</SelectItem>
                <SelectItem value="identity-documents">مدارک هویتی</SelectItem>
                <SelectItem value="certificates">گواهی‌نامه‌ها</SelectItem>
                <SelectItem value="legal-documents">مدارک حقوقی</SelectItem>
                <SelectItem value="technical-documents">مدارک فنی</SelectItem>
                <SelectItem value="other">سایر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-text-primary">
              توضیحات
            </Label>
            <Textarea
              id="description"
              placeholder="توضیحات اضافی در مورد فایل..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Upload Status Messages */}
      {processingStatus === 'error' && (
        <div className="flex items-center space-x-2 space-x-reverse p-3 bg-red-50 border border-red-200 rounded-lg animate-in shake">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700">
            خطا در آپلود فایل. لطفاً دوباره تلاش کنید.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 space-x-reverse">
        <Button 
          variant="outline" 
          onClick={() => {
            setSelectedFile(null);
            setCategory(defaultCategory);
            setDescription(defaultDescription);
            setUploadProgress(0);
            setProcessingStatus('idle');
          }}
          disabled={processingStatus !== 'idle' && processingStatus !== 'error'}
        >
          پاک کردن
        </Button>
        <Button 
          onClick={handleUpload}
          disabled={processingStatus !== 'idle' && processingStatus !== 'error' || !selectedFile}
          className="btn-hover min-w-[120px]"
        >
          {processingStatus === 'uploading' ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
              در حال آپلود
            </div>
          ) : processingStatus === 'processing' ? (
             <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
              پردازش
            </div>
          ) : (
            <>
              <CloudUpload className="h-4 w-4 ml-1" />
              آپلود فایل
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
