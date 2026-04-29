import React, { useState, useEffect } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building, Lock, User, Smartphone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const step1Schema = z.object({
  username: z.string().min(1, 'نام کاربری الزامی است'),
  password: z.string().min(1, 'رمز عبور الزامی است'),
});

const step2Schema = z.object({
  otp: z.string().length(6, 'کد تایید باید 6 رقم باشد'),
});

type Step1FormData = z.infer<typeof step1Schema>;
type Step2FormData = z.infer<typeof step2Schema>;

interface LoginStep1Response {
  step: 1;
  message: string;
  phone: string;
  expiresIn: number;
  userId: number;
  fullName: string;
  profileImage?: string | null;
}

interface LoginStep2Response {
  step: 2;
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
    fullName: string;
    department?: string;
  };
  message: string;
}

export default function TwoFactorLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState<LoginStep1Response | null>(null);
  const [countdown, setCountdown] = useState(0);

  const step1Form = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
  });

  const step2Form = useForm<Step2FormData>({
    resolver: zodResolver(step2Schema),
  });

  // تایمر برای ارسال مجدد
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleStep1Submit = async (data: Step1FormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.step === 1) {
        setLoginData(result);
        setStep(2);
        setCountdown(result.expiresIn || 120);
        toast({
          title: 'موفقیت',
          description: result.message,
        });
      } else {
        toast({
          title: 'خطا',
          description: result.message || 'خطا در ورود',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ارتباط با سرور',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Submit = async (data: Step2FormData) => {
    if (!loginData) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: loginData.userId,
          code: data.otp,
        }),
      });

      const result = await response.json();

      if (response.ok && result.step === 2) {
        // ذخیره token
        localStorage.setItem('auth_token', result.token);
        
        toast({
          title: 'ورود موفقیت‌آمیز',
          description: result.message,
        });

        // Redirect based on role
        const targetPath = result.user.role === "admin" ? "/admin" : 
                          result.user.role === "ceo" ? "/ceo" :
                          result.user.role === "employee" ? "/employee" : "/customer";
        
        setTimeout(() => {
          setLocation(targetPath);
          window.location.href = targetPath;
        }, 200);
      } else {
        toast({
          title: 'خطا',
          description: result.message || 'کد تایید نادرست',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ارتباط با سرور',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!loginData) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: loginData.userId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setCountdown(result.expiresIn || 120);
        toast({
          title: 'موفقیت',
          description: result.message,
        });
      } else {
        toast({
          title: 'خطا',
          description: result.message || 'خطا در ارسال مجدد کد',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ارتباط با سرور',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Header با لوگو و نام سامانه */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 ml-3">
              <img src="/Logo-Gfund_1750240015251.png" alt="لوگو صندوق گیلان" className="w-full h-full object-contain bg-white rounded-lg p-1 shadow-sm" />
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold text-foreground">
                صندوق پژوهش و فناوری گیلان
              </h1>
              <p className="text-sm text-muted-foreground">
                پورتال خدمات تخصصی صندوق پژوهش و فناوری گیلان
              </p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              ورود امن به سامانه
            </CardTitle>
            <CardDescription>
              {step === 1 
                ? 'نام کاربری و رمز عبور خود را وارد کنید'
                : 'کد تایید ارسال شده را وارد کنید'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center">
                    <User className="h-4 w-4 ml-2" />
                    نام کاربری / شناسه ملی شرکت
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="نام کاربری یا شناسه ۱۱ رقمی شرکت"
                    {...step1Form.register('username')}
                    className={step1Form.formState.errors.username ? "border-red-500" : ""}
                  />
                  {step1Form.formState.errors.username && (
                    <p className="text-sm text-red-500">
                      {step1Form.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center">
                    <Lock className="h-4 w-4 ml-2" />
                    رمز عبور
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="رمز عبور"
                    {...step1Form.register('password')}
                    className={step1Form.formState.errors.password ? "border-red-500" : ""}
                  />
                  {step1Form.formState.errors.password && (
                    <p className="text-sm text-red-500">
                      {step1Form.formState.errors.password.message}
                    </p>
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
                      در حال بررسی...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Smartphone className="h-4 w-4 ml-2" />
                      ادامه (ارسال کد تایید)
                    </div>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center text-green-600 mb-2">
                    <Smartphone className="h-5 w-5 ml-2" />
                    <span className="text-sm font-medium">کد تایید ارسال شد</span>
                  </div>
                  
                  {/* User Info with Avatar */}
                  <div className="flex items-center justify-center gap-3 bg-gray-50 rounded-lg p-4">
                    <Avatar className="h-12 w-12">
                      {loginData?.profileImage ? (
                        <AvatarImage 
                          src={loginData.profileImage} 
                          alt={loginData?.fullName || 'کاربر'} 
                          className="object-cover"
                        />
                      ) : (
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {loginData?.fullName?.split(' ').map(n => n?.[0]).filter(Boolean).join('') || 'ک'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">
                        {loginData?.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        کد تایید به شماره <span className="font-bold text-secondary inline-block" dir="ltr">{loginData?.phone}</span> ارسال شد
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <InputOTP 
                      maxLength={6} 
                      value={step2Form.watch('otp') || ''}
                      onChange={(value) => step2Form.setValue('otp', value)}
                      dir="rtl"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={5} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={0} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  
                  {step2Form.formState.errors.otp && (
                    <p className="text-sm text-red-500">
                      {step2Form.formState.errors.otp.message}
                    </p>
                  )}
                </div>

                <Button
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setLoginData(null);
                    step2Form.reset();
                  }}
                  className="w-full"
                  type="button"
                >
                  بازگشت و تغییر نام کاربری
                </Button>

                <Button
                  type="submit"
                  className="w-full btn-hover"
                  disabled={isLoading || !step2Form.watch('otp') || step2Form.watch('otp')?.length !== 6}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="loading-spinner h-4 w-4 border-2 border-white border-t-transparent rounded-full ml-2"></div>
                      در حال تایید...
                    </div>
                  ) : (
                    'تایید و ورود به سامانه'
                  )}
                </Button>

                <div className="text-center space-y-2">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      ارسال مجدد کد بعد از <span className="font-bold text-secondary">{countdown}</span> ثانیه
                    </p>
                  ) : (
                    <Button
                      variant="link"
                      onClick={handleResendOTP}
                      disabled={isLoading}
                      className="text-sm text-secondary hover:text-secondary/80"
                      type="button"
                    >
                      ارسال مجدد کد تایید
                    </Button>
                  )}
                </div>
              </form>
            )}

            {/* Register Link - فقط در مرحله اول */}
            {step === 1 && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  حساب کاربری ندارید؟{" "}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-secondary hover:text-secondary/80"
                    onClick={() => setLocation("/register")}
                  >
                    ثبت‌نام کنید
                  </Button>
                </p>
              </div>
            )}

            {/* Help Text */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p className="mb-2">راهنمای ورود:</p>
              <div className="text-xs space-y-1">
                <p><strong>مشتریان:</strong> شناسه ملی ۱۱ رقمی شرکت</p>
                <p><strong>کارشناسان:</strong> نام کاربری اختصاصی</p>
                <p><strong>مدیران:</strong> نام کاربری مدیریتی</p>
              </div>
              {step === 2 && (
                <div className="mt-4 p-3 bg-secondary/10 border border-secondary/20 rounded-lg">
                  <p className="text-xs text-secondary font-medium">
                    🔒 <strong>ورود امن:</strong> کد تایید فقط 2 دقیقه معتبر است
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>© ۱۴۰۴ صندوق پژوهش و فناوری گیلان</p>
          <p>تمامی حقوق محفوظ است</p>
        </div>
      </div>
    </div>
  );
} 