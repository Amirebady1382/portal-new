import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, User, IdCard, Mail, Phone } from "lucide-react";

const registerSchema = z.object({
  username: z.string().min(1, "نام کاربری الزامی است"),
  password: z.string().min(6, "رمز عبور باید حداقل ۶ کاراکتر باشد"),
  confirmPassword: z.string(),
  fullName: z.string().min(1, "نام کامل الزامی است"),
  nationalId: z.string()
    .min(10, "شناسه ملی باید حداقل ۱۰ رقم باشد")
    .max(11, "شناسه ملی باید حداکثر ۱۱ رقم باشد")
    .regex(/^\d+$/, "شناسه ملی فقط باید شامل اعداد باشد"),
  email: z.string().email("فرمت ایمیل صحیح نیست").optional().or(z.literal("")),
  phone: z.string()
    .min(1, "شماره موبایل الزامی است")
    .regex(/^09\d{9}$/, "شماره موبایل باید به فرمت 09xxxxxxxxx باشد"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "رمز عبور و تکرار آن یکسان نیستند",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function CustomerRegister() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/register", data);

      toast({
        title: "ثبت‌نام موفقیت‌آمیز",
        description: "حساب کاربری شما ایجاد شد. لطفاً منتظر فعال‌سازی توسط مدیر باشید.",
      });

      // Redirect to login page
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
      
    } catch (error: any) {
      toast({
        title: "خطا در ثبت‌نام",
        description: error.message || "خطای سیستم رخ داده است",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 ml-3">
              <img src="/Logo-Gfund_1750240015251.png" alt="لوگو صندوق گیلان" className="w-full h-full object-contain bg-white rounded-lg p-1 shadow-sm" />
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold text-text-primary">
                صندوق پژوهش و فناوری گیلان
              </h1>
              <p className="text-sm text-text-secondary">
                پورتال خدمات تخصصی صندوق پژوهش و فناوری گیلان
              </p>
            </div>
          </div>
        </div>

        {/* Register Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">ثبت‌نام مشتری</CardTitle>
            <CardDescription>
              برای ایجاد حساب کاربری جدید اطلاعات زیر را تکمیل کنید
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* نام کامل */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center">
                  <User className="h-4 w-4 ml-2" />
                  نام کامل
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="نام و نام خانوادگی"
                  {...register("fullName")}
                  className={errors.fullName ? "border-red-500" : ""}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-500">{errors.fullName.message}</p>
                )}
              </div>

              {/* شناسه ملی */}
              <div className="space-y-2">
                <Label htmlFor="nationalId" className="flex items-center">
                  <IdCard className="h-4 w-4 ml-2" />
                  شناسه ملی (۱۰ یا ۱۱ رقم)
                </Label>
                <Input
                  id="nationalId"
                  type="text"
                  placeholder="کد ملی ۱۰ رقمی یا شناسه ملی شرکت ۱۱ رقمی"
                  {...register("nationalId")}
                  className={errors.nationalId ? "border-red-500" : ""}
                  maxLength={11}
                />
                {errors.nationalId && (
                  <p className="text-sm text-red-500">{errors.nationalId.message}</p>
                )}
              </div>

              {/* نام کاربری */}
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center">
                  <User className="h-4 w-4 ml-2" />
                  نام کاربری
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="نام کاربری دلخواه"
                  {...register("username")}
                  className={errors.username ? "border-red-500" : ""}
                />
                {errors.username && (
                  <p className="text-sm text-red-500">{errors.username.message}</p>
                )}
              </div>

              {/* رمز عبور */}
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center">
                  <Lock className="h-4 w-4 ml-2" />
                  رمز عبور
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="حداقل ۶ کاراکتر"
                  {...register("password")}
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              {/* تکرار رمز عبور */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center">
                  <Lock className="h-4 w-4 ml-2" />
                  تکرار رمز عبور
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="تکرار رمز عبور"
                  {...register("confirmPassword")}
                  className={errors.confirmPassword ? "border-red-500" : ""}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* ایمیل (اختیاری) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="h-4 w-4 ml-2" />
                  آدرس ایمیل (اختیاری)
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  {...register("email")}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* شماره تلفن */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center">
                  <Phone className="h-4 w-4 ml-2" />
                  شماره موبایل
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="09123456789 (الزامی)"
                  {...register("phone")}
                  className={errors.phone ? "border-red-500" : ""}
                  maxLength={11}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full btn-hover"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="loading-spinner h-4 w-4 border-2 border-white border-t-transparent rounded-full ml-2"></div>
                    در حال ثبت‌نام...
                  </div>
                ) : (
                  "ثبت‌نام"
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-text-secondary">
                قبلاً حساب کاربری دارید؟{" "}
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-blue-600"
                  onClick={() => setLocation("/login")}
                >
                  ورود به سامانه
                </Button>
              </p>
            </div>

            {/* Help Text */}
            <div className="mt-6 text-center text-xs text-text-secondary bg-blue-50 p-3 rounded-lg">
              <p className="mb-2"><strong>نکات مهم:</strong></p>
              <div className="space-y-1 text-right">
                <p>• شماره موبایل برای احراز هویت و دریافت کد تایید الزامی است</p>
                <p>• پس از ثبت‌نام، حساب شما در انتظار تأیید مدیر سیستم قرار می‌گیرد</p>
                <p>• پس از فعال‌سازی می‌توانید با کد تایید پیامکی وارد سیستم شوید</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-text-secondary">
          <p>© ۱۴۰۴ صندوق پژوهش و فناوری گیلان</p>
          <p>تمامی حقوق محفوظ است</p>
        </div>
      </div>
    </div>
  );
} 
