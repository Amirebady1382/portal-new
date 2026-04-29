import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toPersianNumber } from "@/lib/persian-utils";
import { motion } from "framer-motion";
import { 
  Building, 
  FileText, 
  User,
  MapPin,
  Edit,
  Clock,
  X,
  Upload,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

import GeneralDocumentUpload from "@/components/documents/general-document-upload";
import { useTaxDeclarationStatus, type TaxDeclarationStatus } from "@/hooks/use-tax-declaration-status";

export default function CustomerDashboard() {
  const [, setLocation] = useLocation();

  // Get user's company data
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ["/api/companies"],
  });

  // Get user's documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ["/api/documents"],
  });

  const companiesArray = companies as any[];
  const documentsArray = documents as any[];
  const userCompany = companiesArray.length > 0 ? companiesArray[0] : null;
  
  // Check tax declaration status
  const { data: taxStatus } = useTaxDeclarationStatus(userCompany?.id) as {
    data: TaxDeclarationStatus | undefined;
    refetch: () => void;
  };

  if (companiesLoading || documentsLoading) {
    return <DashboardSkeleton />;
  }

  // If no company is registered
  if (!userCompany) {
    return <EmptyState />;
  }

  const isProfileIncomplete = !userCompany.name || !userCompany.nationalId;
  const isTaxDeclarationMissing = !taxStatus?.hasTaxDeclaration;
  const hasActionRequired = isProfileIncomplete || isTaxDeclarationMissing;

  return (
    <div className="min-h-screen bg-gray-50/50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <motion.main
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 md:mr-72 p-4 md:p-8 max-w-7xl mx-auto space-y-8"
        >
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">داشبورد شرکت</h1>
            <p className="text-muted-foreground mt-1">نمای کلی وضعیت شرکت و مدارک شما</p>
          </div>

          {/* Action Required Section */}
          {hasActionRequired && (
             <div className="grid gap-4">
                {isProfileIncomplete && (
                    <ActionCard
                        title="تکمیل پروفایل شرکت"
                        description="اطلاعات پایه شرکت شما ناقص است. لطفاً برای دسترسی به خدمات، پروفایل را تکمیل کنید."
                        buttonText="تکمیل پروفایل"
                        onClick={() => setLocation("/customer/profile")}
                        variant="warning"
                        icon={User}
                    />
                )}
                {isTaxDeclarationMissing && (
                    <ActionCard
                        title="آپلود اظهارنامه مالیاتی"
                        description="جهت بررسی درخواست‌های سرمایه‌گذاری، آپلود اظهارنامه مالیاتی الزامی است."
                        buttonText="آپلود مدرک"
                        onClick={() => setLocation("/customer/tax-declaration")}
                        variant="info"
                        icon={FileText}
                    />
                )}
             </div>
          )}

          {/* Company Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <StatusCard
                title="وضعیت شرکت"
                status={userCompany.status}
                icon={Building}
             />
             <DocumentSummaryCard
                documents={documentsArray}
             />
             <Card className="md:col-span-1 bg-gradient-to-br from-primary/5 to-primary/0 border-primary/10">
                 <CardHeader>
                     <CardTitle className="text-lg flex items-center gap-2">
                         <ShieldCheck className="h-5 w-5 text-primary" />
                         اعتبار سنجی
                     </CardTitle>
                 </CardHeader>
                 <CardContent>
                     <div className="space-y-4">
                         <div className="flex justify-between items-center text-sm">
                             <span className="text-muted-foreground">شناسه ملی</span>
                             <span className="font-mono font-medium">{toPersianNumber(userCompany.nationalId || "-")}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                             <span className="text-muted-foreground">شماره ثبت</span>
                             <span className="font-mono font-medium">{toPersianNumber(userCompany.registrationNumber || "-")}</span>
                         </div>
                         <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setLocation("/customer/profile")}>
                             مشاهده جزئیات
                         </Button>
                     </div>
                 </CardContent>
             </Card>
          </div>

          {/* Upload Section */}
          <Card className="shadow-sm border-border/60">
              <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg">
                        <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">مدارک پایه</CardTitle>
                        <CardDescription>بارگذاری و مدیریت مدارک رسمی شرکت</CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent>
                <GeneralDocumentUpload companyId={userCompany.id} />
              </CardContent>
            </Card>
        </motion.main>
      </div>
    </div>
  );
}

// Sub-components
function ActionCard({ title, description, buttonText, onClick, variant, icon: Icon }: any) {
    const styles = variant === 'warning'
        ? "bg-amber-50 border-amber-200 text-amber-900"
        : "bg-blue-50 border-blue-200 text-blue-900";

    const buttonStyles = variant === 'warning'
        ? "bg-amber-600 hover:bg-amber-700 text-white"
        : "bg-blue-600 hover:bg-blue-700 text-white";

    return (
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 ${styles}`}>
            <div className="flex items-center gap-4">
                <div className="bg-white p-2.5 rounded-full shadow-sm shrink-0">
                    <Icon className={`h-6 w-6 ${variant === 'warning' ? 'text-amber-600' : 'text-blue-600'}`} />
                </div>
                <div>
                    <h3 className="font-bold text-lg">{title}</h3>
                    <p className="text-sm opacity-90">{description}</p>
                </div>
            </div>
            <Button className={`${buttonStyles} shrink-0`} onClick={onClick}>
                {buttonText}
                <ArrowRight className="mr-2 h-4 w-4" />
            </Button>
        </div>
    )
}

function StatusCard({ title, status, icon: Icon }: any) {
    const getStatusInfo = (s: string) => {
        switch (s) {
            case "active": return { label: "فعال", color: "text-emerald-600", bg: "bg-emerald-100", border: "border-emerald-200" };
            case "pending": return { label: "در انتظار بررسی", color: "text-amber-600", bg: "bg-amber-100", border: "border-amber-200" };
            case "rejected": return { label: "رد شده", color: "text-rose-600", bg: "bg-rose-100", border: "border-rose-200" };
            default: return { label: "نامشخص", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" };
        }
    };

    const info = getStatusInfo(status);

    return (
        <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-3 mb-2">
                    <Icon className="h-8 w-8 text-primary/80" />
                    <span className="text-2xl font-bold">{info.label}</span>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full inline-block ${info.bg} ${info.color}`}>
                    وضعیت فعلی
                </div>
            </CardContent>
        </Card>
    );
}

function DocumentSummaryCard({ documents }: { documents: any[] }) {
    const approved = documents.filter(d => d.status === 'approved').length;
    const pending = documents.filter(d => d.status === 'pending').length;

    return (
        <Card className="shadow-sm border-border/60">
             <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">وضعیت مدارک</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <span className="text-2xl font-bold">{toPersianNumber(documents.length)}</span>
                        <span className="text-xs text-muted-foreground mr-1">مدرک کل</span>
                    </div>
                    <FileText className="h-8 w-8 text-primary/40" />
                </div>
                <div className="flex gap-2 text-xs">
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                        {toPersianNumber(approved)} تایید شده
                    </span>
                    <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                        {toPersianNumber(pending)} در انتظار
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}

function DashboardSkeleton() {
    return (
      <div className="min-h-screen bg-gray-50/50" dir="rtl">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 md:mr-72 p-8 space-y-8">
            <div className="space-y-2">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-5 w-96" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-40 rounded-xl" />
                <Skeleton className="h-40 rounded-xl" />
                <Skeleton className="h-40 rounded-xl" />
            </div>
            <Skeleton className="h-96 rounded-xl" />
          </main>
        </div>
      </div>
    );
}

function EmptyState() {
    const [, setLocation] = useLocation();
    return (
        <div className="min-h-screen bg-gray-50/50" dir="rtl">
        <Header />
        <MobileSidebar />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 md:mr-72 p-8 flex items-center justify-center min-h-[80vh]">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Building className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">خوش آمدید!</h2>
                <p className="text-muted-foreground">برای شروع استفاده از خدمات، لطفاً ابتدا پروفایل شرکت خود را تکمیل کنید.</p>
                <Button size="lg" className="w-full" onClick={() => setLocation("/customer/profile")}>
                    تکمیل پروفایل شرکت
                    <ArrowRight className="mr-2 h-4 w-4" />
                </Button>
            </div>
          </main>
        </div>
      </div>
    )
}
