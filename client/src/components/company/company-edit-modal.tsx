import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PersianCalendar } from "@/components/ui/persian-calendar";

interface Company {
  id: number;
  nationalId: string;
  name: string;
  type: string;
  status: string;
  primaryUnit: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  capital?: string;
  registrationNumber?: string;
  registrationDate?: string;
}

interface CompanyEditModalProps {
  company: Company;
}

export default function CompanyEditModal({ company }: CompanyEditModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    nationalId: company.nationalId || "",
    name: company.name || "",
    type: company.type || "",
    status: company.status || "",
    primaryUnit: company.primaryUnit || "",
    city: company.city || "",
    address: company.address || "",
    phone: company.phone || "",
    email: company.email || "",
    website: company.website || "",
    description: company.description || "",
    capital: company.capital || "",
    registrationNumber: company.registrationNumber || "",
    registrationDate: company.registrationDate || "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("PUT", `/api/companies/${company.id}`, data);
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${company.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${company.id}/enrich`] });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      
      toast({
        title: "موفقیت",
        description: "اطلاعات شرکت با موفقیت بروزرسانی شد",
      });
      setOpen(false);
      
      // Force refetch to ensure fresh data
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: [`/api/companies/${company.id}`] });
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در بروزرسانی اطلاعات شرکت",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyMutation.mutate(formData);
  };

  const resetForm = () => {
    setFormData({
      nationalId: company.nationalId || "",
      name: company.name || "",
      type: company.type || "",
      status: company.status || "",
      primaryUnit: company.primaryUnit || "",
      city: company.city || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      description: company.description || "",
      capital: company.capital || "",
      registrationNumber: company.registrationNumber || "",
      registrationDate: company.registrationDate || "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="whitespace-nowrap">
          <Edit className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">ویرایش اطلاعات</span>
          <span className="sm:hidden">ویرایش</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            ویرایش اطلاعات شرکت
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* اطلاعات پایه */}
            <div>
              <Label htmlFor="nationalId">شناسه ملی *</Label>
              <Input
                id="nationalId"
                value={formData.nationalId}
                onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                placeholder="14009396050"
                maxLength={11}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                برای دریافت اطلاعات رسمیو ضروری است
              </p>
            </div>

            <div>
              <Label htmlFor="name">نام شرکت *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="type">نوع شرکت</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب نوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">خصوصی</SelectItem>
                  <SelectItem value="public">دولتی</SelectItem>
                  <SelectItem value="semi-private">نیمه خصوصی</SelectItem>
                  <SelectItem value="cooperative">تعاونی</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">وضعیت</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">در انتظار بررسی</SelectItem>
                  <SelectItem value="approved">تایید شده</SelectItem>
                  <SelectItem value="rejected">رد شده</SelectItem>
                  <SelectItem value="suspended">تعلیق شده</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="city">شهر</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="تهران"
              />
            </div>

            <div>
              <Label htmlFor="phone">تلفن</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="021-12345678"
              />
            </div>

            <div>
              <Label htmlFor="email">ایمیل</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="info@company.com"
              />
            </div>

            <div>
              <Label htmlFor="website">وب‌سایت</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://company.com"
              />
            </div>

            <div>
              <Label htmlFor="capital">سرمایه (ریال)</Label>
              <Input
                id="capital"
                value={formData.capital}
                onChange={(e) => setFormData({ ...formData, capital: e.target.value })}
                placeholder="1000000000"
              />
            </div>

            <div>
              <Label htmlFor="registrationNumber">شماره ثبت</Label>
              <Input
                id="registrationNumber"
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                placeholder="564196"
              />
            </div>

            <div>
              <Label htmlFor="registrationDate">تاریخ ثبت</Label>
              <PersianCalendar
                value={formData.registrationDate}
                onSelect={(date) => setFormData({ ...formData, registrationDate: date?.toISOString() || "" })}
                placeholder="انتخاب تاریخ ثبت"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">آدرس</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="آدرس کامل شرکت..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="description">توضیحات</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="توضیحات کوتاه درباره شرکت..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4 mr-2" />
              انصراف
            </Button>
            <Button
              type="submit"
              disabled={updateCompanyMutation.isPending}
            >
              {updateCompanyMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>در حال ذخیره...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  <span>ذخیره تغییرات</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 