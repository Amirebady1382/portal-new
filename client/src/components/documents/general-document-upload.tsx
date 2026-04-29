import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, File, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GeneralDocumentUploadProps {
  companyId?: number;
}

const GENERAL_DOCUMENT_CATEGORIES = [
  { value: "national_id", label: "کارت ملی" },
  { value: "birth_certificate", label: "شناسنامه" },
  { value: "business_license", label: "جواز کسب" },
  { value: "tax_certificate", label: "گواهی مالیاتی" },
  { value: "insurance_certificate", label: "گواهی بیمه" },
  { value: "bank_account", label: "تصویر حساب بانکی" },
  { value: "other", label: "سایر اسناد" }
];

export default function GeneralDocumentUpload({ companyId }: GeneralDocumentUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const endpoint = companyId ? `/api/companies/${companyId}/documents` : "/api/documents";
      return fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: data,
      });
    },
    onSuccess: async (response) => {
      if (response.ok) {
        toast({
          title: "موفقیت",
          description: "فایل‌ها با موفقیت آپلود شدند",
        });
        setSelectedFile(null);
        setCategory("");
        setTitle("");
        setDescription("");
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        if (companyId) {
          queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/documents`] });
        } else {
          queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || "خطا در آپلود فایل");
      }
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در آپلود فایل",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!category || !selectedFile) {
      toast({
        title: "خطا",
        description: "لطفاً دسته‌بندی و یک فایل انتخاب کنید",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("category", category);
    formData.append("description", description || title || GENERAL_DOCUMENT_CATEGORIES.find(cat => cat.value === category)?.label || "");

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 بایت';
    const k = 1024;
    const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          آپلود اسناد عمومی
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          آپلود اسناد عمومی مثل کارت ملی، شناسنامه و سایر مدارک بدون نیاز به تکمیل فرم
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="category">نوع سند *</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="انتخاب نوع سند" />
            </SelectTrigger>
            <SelectContent>
              {GENERAL_DOCUMENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="title">عنوان (اختیاری)</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان دلخواه برای سند"
          />
        </div>

        <div>
          <Label htmlFor="description">توضیحات (اختیاری)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="توضیحات اضافی در مورد این سند..."
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="file-upload">فایل‌ها *</Label>
          <div className="mt-1">
            <Input
              id="file-upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById("file-upload")?.click()}
              className="w-full h-20 border-dashed"
            >
              <div className="text-center">
                <Upload className="mx-auto h-6 w-6 mb-2" />
                <span>کلیک کنید یا فایل‌ها را اینجا بکشید</span>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, PNG, DOC, DOCX (حداکثر 10 مگابایت)
                </p>
              </div>
            </Button>
          </div>
        </div>

        {selectedFile && (
          <div className="space-y-2">
            <Label>فایل‌های انتخاب شده:</Label>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={uploadMutation.isPending || !category || !selectedFile}
          className="w-full"
        >
          {uploadMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              در حال آپلود...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              آپلود فایل
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}