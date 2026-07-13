import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { ClipboardList, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ServiceRequestsDebug() {
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const testAPI = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("🔍 Testing service requests API...");
      
      const token = localStorage.getItem('auth_token');
      console.log("Auth token:", token ? "موجود" : "ندارد");
      
      // Test service requests endpoint
      const data = await apiRequest("GET", '/api/service-requests');
      console.log("Service requests data:", data);
      
      setDebugInfo({
        data: data,
        hasToken: !!token,
        timestamp: new Date().toISOString()
      });
      
    } catch (err: any) {
      console.error("❌ Debug error:", err);
      setError(err.message || "خطای نامشخص");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testAPI();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              تشخیص عیب درخواست‌های خدمات
            </h1>
            <p className="text-text-secondary">
              بررسی و تشخیص مشکلات API درخواست‌های خدمات
            </p>
          </div>

          <div className="space-y-6">
            {/* Test Button */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    تست API درخواست‌های خدمات
                  </CardTitle>
                  <Button 
                    onClick={testAPI}
                    disabled={loading}
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    تست مجدد
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p>در حال بررسی...</p>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 text-red-700 bg-red-50 p-4 rounded-lg">
                    <AlertTriangle className="h-5 w-5" />
                    <div>
                      <p className="font-medium">خطا در اتصال به API</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {debugInfo && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-lg">
                      <CheckCircle className="h-5 w-5" />
                      <div>
                        <p className="font-medium">تست API انجام شد</p>
                        <p className="text-sm">تاریخ: {debugInfo.timestamp}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-2">وضعیت درخواست</h3>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Auth Token:</span>
                              <span className={debugInfo.hasToken ? "text-green-600" : "text-red-600"}>
                                {debugInfo.hasToken ? "موجود" : "ندارد"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">پاسخ API</h3>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <pre className="text-xs overflow-auto max-h-40">
                            {JSON.stringify(debugInfo.data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auth Status */}
            <Card>
              <CardHeader>
                <CardTitle>وضعیت احراز هویت</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={async () => {
                      try {
                        const data: any = await apiRequest('GET', '/api/auth/me');
                        
                        toast({
                          title: "لاگین موفق",
                          description: `${data.fullName} (${data.role})`,
                          variant: "default"
                        });
                      } catch (err: any) {
                        toast({
                          title: "خطا",
                          description: err.message,
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    بررسی وضعیت لاگین
                  </Button>

                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium mb-2">اطلاعات ورود:</p>
                    <p>• مدیر: amir.e / 123456</p>
                    <p>• کارمند: mohammadreza / 123456</p>
                    <p>• کارمند: felora / 123456</p>
                    <p>• مشتری: samet / 123456</p>
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
