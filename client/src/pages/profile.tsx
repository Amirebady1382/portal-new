import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  User,
  Save,
  Edit,
  X,
  Mail,
  Shield,
  Camera,
  Upload,
  Phone,
  MessageCircle
} from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Profile() {
  const { user, updateUserData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isPhoneDialogOpen, setIsPhoneDialogOpen] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    username: "",
    email: "",
  });

  const [phoneForm, setPhoneForm] = useState({
    newPhone: "",
    otpCode: "",
  });

  // Load existing user data
  useEffect(() => {
    if (user) {
      setProfileForm({
        fullName: user.fullName || "",
        username: user.username || "",
        email: user.email || "",
      });
    }
  }, [user]);

  // Show loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <Header />
        <div className="flex pt-16">
          <div className="hidden md:block">
            <Sidebar />
          </div>
          <MobileSidebar />
          <main className="flex-1 p-6 md:pr-64">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-text-secondary">در حال بارگذاری...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const response: any = await apiRequest("PUT", "/api/auth/user/profile", data);
      return response;
    },
    onSuccess: (data) => {
      updateUserData(data.user);
      setIsEditing(false);
      toast({
        title: "موفق",
        description: "اطلاعات پروفایل با موفقیت به‌روزرسانی شد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در به‌روزرسانی اطلاعات",
        variant: "destructive",
      });
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (phone: string) => {
      return await apiRequest("POST", "/api/auth/user/send-phone-otp", { phone });
    },
    onSuccess: (data) => {
      setIsOtpSent(true);
      setOtpCountdown(60);
      toast({
        title: "موفق",
        description: data.message || "کد تایید ارسال شد",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در ارسال کد تایید",
        variant: "destructive",
      });
    },
  });

  const updatePhoneMutation = useMutation({
    mutationFn: async (data: typeof phoneForm) => {
      return apiRequest("POST", "/api/auth/user/update-phone", data);
    },
    onSuccess: (data) => {
      updateUserData(data.user);
      setIsPhoneDialogOpen(false);
      setIsOtpSent(false);
      setPhoneForm({ newPhone: "", otpCode: "" });
      toast({
        title: "موفق",
        description: data.message || "شماره موبایل با موفقیت تغییر کرد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در تغییر شماره موبایل",
        variant: "destructive",
      });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);

      const response: any = await apiRequest("POST", "/api/auth/user/profile-image", formData);
      return response;
    },
    onSuccess: (data) => {
      updateUserData(data.user);
      toast({
        title: "موفق",
        description: "تصویر پروفایل با موفقیت به‌روزرسانی شد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error.message || "خطا در آپلود تصویر",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!profileForm.fullName.trim()) {
      toast({
        title: "خطا",
        description: "نام و نام خانوادگی الزامی است",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate(profileForm);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original values
    if (user) {
      setProfileForm({
        fullName: user.fullName || "",
        username: user.username || "",
        email: user.email || "",
      });
    }
  };

  const handleSendOtp = () => {
    if (!phoneForm.newPhone.trim()) {
      toast({
        title: "خطا",
        description: "شماره موبایل جدید را وارد کنید",
        variant: "destructive",
      });
      return;
    }

    if (!/^09\d{9}$/.test(phoneForm.newPhone)) {
      toast({
        title: "خطا",
        description: "شماره موبایل باید به فرمت 09xxxxxxxxx باشد",
        variant: "destructive",
      });
      return;
    }

    sendOtpMutation.mutate(phoneForm.newPhone);
  };

  const handleUpdatePhone = () => {
    if (!phoneForm.newPhone.trim() || !phoneForm.otpCode.trim()) {
      toast({
        title: "خطا",
        description: "شماره موبایل و کد تایید الزامی است",
        variant: "destructive",
      });
      return;
    }

    updatePhoneMutation.mutate(phoneForm);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "خطا",
        description: "فقط فایل‌های تصویری مجاز هستند",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "خطا",
        description: "حجم فایل نباید بیشتر از ۲ مگابایت باشد",
        variant: "destructive",
      });
      return;
    }

    uploadImageMutation.mutate(file);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "مدیر سیستم";
      case "employee":
        return "کارشناس";  
      case "customer":
        return "مشتری";
      default:
        return role;
    }
  };

  const handlePhoneDialogClose = () => {
    setIsPhoneDialogOpen(false);
    setIsOtpSent(false);
    setPhoneForm({ newPhone: "", otpCode: "" });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <div className="flex pt-16">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <MobileSidebar />
        
        <main className="flex-1 p-6 md:pr-64">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-text-primary">پروفایل کاربری</h1>
            </div>

            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    اطلاعات شخصی
                  </CardTitle>
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4 ml-2" />
                      ویرایش
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        disabled={updateProfileMutation.isPending}
                      >
                        <X className="h-4 w-4 ml-2" />
                        انصراف
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending}
                      >
                        <Save className="h-4 w-4 ml-2" />
                        {updateProfileMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture Section */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 cursor-pointer" onClick={handleImageClick}>
                      {user?.profileImage ? (
                        <AvatarImage 
                          src={user.profileImage} 
                          alt={user?.fullName || user?.username || 'User'} 
                          className="object-cover"
                        />
                      ) : (
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {user?.fullName?.split(' ').map(n => n?.[0]).filter(Boolean).join('') || user?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                      onClick={handleImageClick}
                      disabled={uploadImageMutation.isPending}
                    >
                      {uploadImageMutation.isPending ? (
                        <Upload className="h-3 w-3 animate-spin" />
                      ) : (
                        <Camera className="h-3 w-3" />
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-text-primary">
                      {user?.fullName || user?.username}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Shield className="h-4 w-4 text-text-secondary" />
                      <span className="text-sm text-text-secondary">
                        {getRoleText(user?.role || "")}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-1 h-auto p-0 text-xs text-primary hover:bg-transparent"
                      onClick={handleImageClick}
                      disabled={uploadImageMutation.isPending}
                    >
                      {uploadImageMutation.isPending ? "در حال آپلود..." : "تغییر تصویر پروفایل"}
                    </Button>
                  </div>
                </div>

                {/* Profile Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">نام و نام خانوادگی *</Label>
                    <Input
                      id="fullName"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="نام و نام خانوادگی خود را وارد کنید"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">نام کاربری</Label>
                    <Input
                      id="username"
                      value={profileForm.username}
                      disabled={true}
                      className="bg-gray-50"
                      placeholder="نام کاربری"
                    />
                    <p className="text-xs text-text-secondary">
                      نام کاربری قابل تغییر نیست
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">ایمیل</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-3 h-4 w-4 text-text-secondary" />
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditing}
                        className="pr-10"
                        placeholder="example@email.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">شماره موبایل (احراز هویت دو مرحله‌ای)</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute right-3 top-3 h-4 w-4 text-text-secondary" />
                        <Input
                          id="phone"
                          value={user?.phone || ""}
                          disabled={true}
                          className="pr-10 bg-gray-50"
                          placeholder="شماره موبایل"
                        />
                      </div>
                      <Dialog open={isPhoneDialogOpen} onOpenChange={setIsPhoneDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="whitespace-nowrap">
                            <MessageCircle className="h-4 w-4 ml-2" />
                            تغییر شماره
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md" dir="rtl">
                          <DialogHeader>
                            <DialogTitle>تغییر شماره موبایل</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="newPhone">شماره موبایل جدید</Label>
                              <Input
                                id="newPhone"
                                value={phoneForm.newPhone}
                                onChange={(e) => setPhoneForm(prev => ({ ...prev, newPhone: e.target.value }))}
                                placeholder="09xxxxxxxxx"
                                disabled={isOtpSent}
                              />
                            </div>

                            {!isOtpSent ? (
                              <Button
                                onClick={handleSendOtp}
                                disabled={sendOtpMutation.isPending}
                                className="w-full"
                              >
                                {sendOtpMutation.isPending ? "در حال ارسال..." : "ارسال کد تایید"}
                              </Button>
                            ) : (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>کد تایید</Label>
                                  <div className="flex justify-center">
                                    <InputOTP
                                      maxLength={6}
                                      value={phoneForm.otpCode}
                                      onChange={(value) => setPhoneForm(prev => ({ ...prev, otpCode: value }))}
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
                                  <p className="text-sm text-text-secondary text-center">
                                    کد تایید به شماره {phoneForm.newPhone} ارسال شد
                                  </p>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    onClick={handleUpdatePhone}
                                    disabled={updatePhoneMutation.isPending}
                                    className="flex-1"
                                  >
                                    {updatePhoneMutation.isPending ? "در حال تایید..." : "تایید و تغییر"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={handleSendOtp}
                                    disabled={sendOtpMutation.isPending || otpCountdown > 0}
                                    className="flex-1"
                                  >
                                    {otpCountdown > 0 
                                      ? `ارسال مجدد (${otpCountdown}s)` 
                                      : sendOtpMutation.isPending 
                                        ? "در حال ارسال..." 
                                        : "ارسال مجدد"
                                    }
                                  </Button>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={handlePhoneDialogClose}
                                className="flex-1"
                              >
                                انصراف
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <p className="text-xs text-text-secondary">
                      شماره موبایل برای احراز هویت دو مرحله‌ای استفاده می‌شود
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>نقش کاربری</Label>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                      <Shield className="h-4 w-4 text-text-secondary" />
                      <span className="text-sm text-text-primary">
                        {getRoleText(user?.role || "")}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      نقش کاربری توسط مدیر سیستم تعیین می‌شود
                    </p>
                  </div>
                </div>

                {/* Info Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="text-blue-800 font-medium mb-1">نکات مهم:</p>
                      <ul className="text-blue-700 space-y-1">
                        <li>• نام و نام خانوادگی در گزارش‌ها و مکاتبات نمایش داده می‌شود</li>
                        <li>• ایمیل برای ارسال اعلان‌ها استفاده می‌شود</li>
                        <li>• شماره موبایل برای احراز هویت دو مرحله‌ای ضروری است</li>
                        <li>• برای تغییر نام کاربری یا نقش با مدیر سیستم تماس بگیرید</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
} 
