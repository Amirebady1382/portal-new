import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toPersianNumber } from "@/lib/persian-utils";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loading } from "@/components/ui/loading";
import { motion } from "framer-motion";
import { 
  Building, 
  Search, 
  Filter,
  Eye,
  CheckCircle,
  X,
  Clock,
  ExternalLink,
  Trash2,
  BarChart3
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Company {
  id: number;
  name: string;
  nationalId: string;
  type: string;
  city: string;
  status: string;
  description?: string;
  createdAt: string;
  financialSummaryStatus?: string;
}

export default function Companies() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  // Read URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    if (statusParam) {
      setStatusFilter(statusParam);
    }
  }, [location]);

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies", { search: searchTerm, status: statusFilter, type: typeFilter, department: departmentFilter }],
  });

  const updateCompanyMutation = useMutation({
    mutationFn: async ({ companyId, status }: { companyId: number; status: string }) => {
      return apiRequest("PATCH", `/api/companies/${companyId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "وضعیت تغییر کرد",
        description: "وضعیت شرکت با موفقیت تغییر کرد",
      });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: number) => {
      return await apiRequest("DELETE", `/api/admin/companies/${companyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "موفقیت",
        description: "شرکت با موفقیت حذف شد",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">فعال</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">در انتظار</Badge>;
      case "suspended":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">تعلیق</Badge>;
      case "rejected":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">رد شده</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "private": return "خصوصی";
      case "public": return "دولتی";
      case "cooperative": return "تعاونی";
      case "mixed": return "مختلط";
      default: return type;
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 text-right"
      >
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              لیست شرکت‌ها
            </h1>
            <p className="text-muted-foreground">
              مدیریت و نظارت بر تمامی شرکت‌های ثبت شده
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-6 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">فیلترها</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="جستجوی نام یا کد ملی..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 text-right"
                    dir="rtl"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="وضعیت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                    <SelectItem value="pending">در انتظار</SelectItem>
                    <SelectItem value="active">فعال</SelectItem>
                    <SelectItem value="suspended">تعلیق</SelectItem>
                    <SelectItem value="rejected">رد شده</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="نوع شرکت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه انواع</SelectItem>
                    <SelectItem value="private">خصوصی</SelectItem>
                    <SelectItem value="public">دولتی</SelectItem>
                    <SelectItem value="cooperative">تعاونی</SelectItem>
                    <SelectItem value="mixed">مختلط</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setDepartmentFilter("all");
                }}>
                  <Filter className="h-4 w-4 ml-1 rtl:ml-1 ltr:mr-1" />
                  پاک کردن فیلترها
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Companies List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="grid gap-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="h-32">
                    <CardContent className="h-full flex items-center justify-center">
                        <Loading variant="pulse" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : companies.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">شرکتی یافت نشد</h3>
                  <p className="text-muted-foreground">هیچ شرکتی با معیارهای جستجو یافت نشد</p>
                </CardContent>
              </Card>
            ) : (
              companies.map((company: any) => (
                <Card key={company.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-foreground">{company.name}</h3>
                          {getStatusBadge(company.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">شناسه ملی: </span>
                            <span className="number-font font-medium">{company.nationalId}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">نوع: </span>
                            <span>{getTypeText(company.type)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">شهر: </span>
                            <span>{company.city}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">تاریخ ثبت: </span>
                            <span>{new Date(company.createdAt).toLocaleDateString('fa-IR')}</span>
                          </div>
                        </div>

                        {company.description && (
                          <p className="text-muted-foreground text-sm mt-3 line-clamp-2">
                            {company.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="btn-hover"
                          onClick={() => {
                            const basePath = user?.role === "admin" ? "/admin" : 
                                           user?.role === "ceo" ? "/ceo" : "/employee";
                            setLocation(`${basePath}/companies/${company.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 ml-1 rtl:ml-1 ltr:mr-1" />
                          مشاهده
                        </Button>

                        {/* Financial Summary Button */}
                        {company.financialSummaryStatus === 'completed' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="btn-hover bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800"
                            onClick={() => {
                              const basePath = user?.role === "admin" ? "/admin" : 
                                             user?.role === "ceo" ? "/ceo" : "/employee";
                              setLocation(`${basePath}/companies/${company.id}/financial-summary`);
                            }}
                          >
                            <BarChart3 className="h-4 w-4 ml-1 rtl:ml-1 ltr:mr-1" />
                            خلاصه مالی
                          </Button>
                        ) : company.financialSummaryStatus === 'processing' ? (
                          <Badge variant="secondary" className="text-xs py-1">
                            <Clock className="h-3 w-3 ml-1 rtl:ml-1 ltr:mr-1 animate-spin" />
                            در حال پردازش...
                          </Badge>
                        ) : company.financialSummaryStatus === 'error' ? (
                          <Badge variant="destructive" className="text-xs py-1">
                            <X className="h-3 w-3 ml-1 rtl:ml-1 ltr:mr-1" />
                            خطا در پردازش
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs py-1 text-muted-foreground">
                            نیاز به اظهارنامه
                          </Badge>
                        )}
                        
                        {company.status === "pending" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => updateCompanyMutation.mutate({ companyId: company.id, status: "active" })}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateCompanyMutation.mutate({ companyId: company.id, status: "rejected" })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {company.status === "active" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateCompanyMutation.mutate({ companyId: company.id, status: "suspended" })}
                          >
                            <Clock className="h-4 w-4 ml-1 rtl:ml-1 ltr:mr-1" />
                            تعلیق
                          </Button>
                        )}

                        {/* Delete button for admins */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="bg-red-700 hover:bg-red-800"
                            >
                              <Trash2 className="h-4 w-4 ml-1 rtl:ml-1 ltr:mr-1" />
                              حذف
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف شرکت</AlertDialogTitle>
                              <AlertDialogDescription>
                                آیا مطمئن هستید که می‌خواهید شرکت "{company.name}" را حذف کنید؟
                                این عمل تمام اطلاعات مربوط به شرکت را نیز حذف خواهد کرد و قابل بازگشت نیست.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>انصراف</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteCompanyMutation.mutate(company.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                حذف کامل
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Stats Summary */}
          <Card className="mt-8 shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 number-font">
                    {toPersianNumber(companies.length)}
                  </p>
                  <p className="text-sm text-muted-foreground">کل شرکت‌ها</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 number-font">
                    {toPersianNumber(companies.filter((c: any) => c.status === "active").length)}
                  </p>
                  <p className="text-sm text-muted-foreground">فعال</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 number-font">
                    {toPersianNumber(companies.filter((c: any) => c.status === "pending").length)}
                  </p>
                  <p className="text-sm text-muted-foreground">در انتظار</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 number-font">
                    {toPersianNumber(companies.filter((c: any) => c.status === "suspended").length)}
                  </p>
                  <p className="text-sm text-muted-foreground">تعلیق</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </DashboardLayout>
    );
  }

