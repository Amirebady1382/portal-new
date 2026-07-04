import { apiRequest } from "@/lib/queryClient";
import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2
} from "lucide-react";
import { toPersianNumber } from "@/lib/persian-utils";

interface TaxDeclarationModalProps {
  open: boolean;
  companyId?: number;
  onComplete?: () => void;
}

export default function TaxDeclarationModal({ open, companyId, onComplete }: TaxDeclarationModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setUploadProgress(0);
      setIsUploading(false);
      setIsProcessing(false);
      setProcessingComplete(false);
      setProcessingError(null);
    }
  }, [open]);

  // Poll for processing status
  useEffect(() => {
    if (!isProcessing || !companyId) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await apiRequest("GET", `/api/companies/${companyId}/financial-summary`);
        
        if (result.status === 'completed' && result.success) {
          setIsProcessing(false);
          setProcessingComplete(true);
          clearInterval(pollInterval);
          
          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/financial-summary`] });
          queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/tax-declaration-status`] });
          
          // Auto refresh after a short delay to allow the user to see the success message
          toast({
            title: "✅ پردازش تکمیل شد",
            description: "صفحه در حال بروزرسانی است...",
          });
          
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else if (result.status === 'error') {
          setIsProcessing(false);
          setProcessingError(result.error || 'خطای نامشخص در پردازش');
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [isProcessing, companyId, queryClient]);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      toast({
        title: "فرمت نامعتبر",
        description: "فقط فایل‌های PDF قابل قبول هستند",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (32MB)
    if (file.size > 32 * 1024 * 1024) {
      toast({
        title: "فایل بیش از حد بزرگ",
        description: "حجم فایل باید کمتر از 32 مگابایت باشد",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !companyId) {
      toast({
        title: "خطا",
        description: "لطفاً فایل را انتخاب کنید",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', 'اظهارنامه مالیاتی');
      formData.append('description', 'اظهارنامه مالیاتی - آپلود اولیه');

      await new Promise((resolve, reject) => {
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

        // باز کردن connection
        xhr.open("POST", `/api/companies/${companyId}/documents`);
        
        // بعد از open، حالا می‌تونیم header بذاریم
        const token = localStorage.getItem("auth_token");
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }

        xhr.send(formData);
      });

      toast({
        title: "✅ آپلود موفقیت‌آمیز",
        description: "اظهارنامه مالیاتی با موفقیت آپلود شد"
      });

      // شروع پردازش
      setIsUploading(false);
      setIsProcessing(true);

    } catch (error: any) {
      console.error('Upload error:', error);
      setIsUploading(false);
      toast({
        title: "خطا در آپلود",
        description: error.message || "خطا در آپلود فایل",
        variant: "destructive"
      });
    }
  };

  const handleComplete = () => {
    onComplete?.();
    setLocation("/customer");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatNumber = (num: number) => {
    if (num === 0) return '0';
    if (Math.abs(num) >= 1_000_000_000) {
      return `${toPersianNumber((num / 1_000_000_000).toFixed(1))} میلیارد`;
    }
    if (Math.abs(num) >= 1_000_000) {
      return `${toPersianNumber((num / 1_000_000).toFixed(1))} میلیون`;
    }
    return toPersianNumber(num.toLocaleString());
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-2xl" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center">
            <FileText className="h-6 w-6 ml-2 text-red-600" />
            {processingComplete ? "✅ پردازش موفقیت‌آمیز!" : "⚠️ آپلود اظهارنامه مالیاتی یا گزارش حسابرسی الزامی است"}
          </DialogTitle>
          <DialogDescription>
            {processingComplete 
              ? "اطلاعات مالی شرکت شما با موفقیت استخراج شد"
              : "برای استفاده از خدمات، لطفاً اظهارنامه مالیاتی یا گزارش حسابرسی خود را آپلود کنید"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Processing Complete State */}
          {processingComplete ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-900 mb-2">✅ آپلود و پردازش موفق!</h3>
                <p className="text-green-800">
                  اظهارنامه مالیاتی یا گزارش حسابرسی شما با موفقیت آپلود و پردازش شد.
                </p>
                <p className="text-sm text-green-700 mt-2">
                  کارشناسان ارزیابی می‌توانند خلاصه مالی شما را مشاهده کنند.
                </p>
              </div>

              <Button onClick={handleComplete} className="w-full" size="lg">
                ادامه به داشبورد
              </Button>
            </div>
          ) : isProcessing ? (
            /* Processing State */
            <div className="text-center py-8">
              <Loader2 className="h-16 w-16 text-blue-600 mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-bold mb-2">⏳ در حال پردازش...</h3>
              <p className="text-gray-600 mb-4">
                اظهارنامه شما در حال تحلیل توسط هوش مصنوعی است
              </p>
              <div className="max-w-md mx-auto">
                <Progress value={66} className="mb-2" />
                <p className="text-sm text-gray-500">
                  این فرآیند 30-60 ثانیه طول می‌کشد. لطفاً صبر کنید...
                </p>
              </div>
            </div>
          ) : processingError ? (
            /* Error State */
            <div className="text-center py-8">
              <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">❌ خطا در پردازش</h3>
              <p className="text-gray-600 mb-4">{processingError}</p>
              <Button onClick={() => {
                setProcessingError(null);
                setSelectedFile(null);
              }}>
                تلاش مجدد
              </Button>
            </div>
          ) : (
            /* Upload State */
            <>
              {/* Drag & Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50"
                    : selectedFile
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 bg-gray-50 hover:border-gray-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !selectedFile && fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="application/pdf"
                  onChange={handleFileInputChange}
                />

                {selectedFile ? (
                  <div className="space-y-3">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                    <div>
                      <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                    >
                      انتخاب فایل دیگر
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        فایل PDF اظهارنامه یا گزارش حسابرسی را اینجا رها کنید
                      </p>
                      <p className="text-sm text-gray-600">
                        یا کلیک کنید تا فایل را انتخاب کنید
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>در حال آپلود...</span>
                    <span className="number-font">{toPersianNumber(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {/* File Requirements */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 ml-2" />
                  الزامات فایل
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ فرمت: PDF</li>
                  <li>✓ حداکثر حجم: 32 مگابایت</li>
                  <li>✓ حداکثر تعداد صفحات: 100</li>
                  <li>✓ فایل نباید رمزگذاری شده باشد</li>
                </ul>
              </div>

              {/* Action Button */}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full h-12 text-lg"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                    در حال آپلود... {toPersianNumber(uploadProgress)}%
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 ml-2" />
                    آپلود و پردازش اظهارنامه
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

