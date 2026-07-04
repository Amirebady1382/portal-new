import { useState, useEffect } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function DebugServices() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("🔍 Fetching debug info...");
      const data = await apiRequest("GET", "/api/debug/services");
      console.log("✅ Debug data received:", data);
      setDebugInfo(data);
      
    } catch (err: any) {
      console.error("❌ Debug error:", err);
      setError(err.message || "خطای نامشخص");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
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
              تشخیص عیب سیستم خدمات
            </h1>
            <p className="text-text-secondary">
              بررسی و تشخیص مشکلات API خدمات
            </p>
          </div>

          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>وضعیت API خدمات</CardTitle>
                  <Button 
                    onClick={fetchDebugInfo}
                    disabled={loading}
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    بروزرسانی
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
                        <p className="font-medium">اتصال موفق به API</p>
                        <p className="text-sm">تاریخ: {debugInfo.timestamp}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-2">آمار کلی</h3>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p>تعداد خدمات: <Badge variant="outline">{debugInfo.servicesCount}</Badge></p>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">نمونه خدمات</h3>
                        <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                          <pre className="text-xs">
                            {JSON.stringify(debugInfo.sampleServices, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual API Test */}
            <Card>
              <CardHeader>
                <CardTitle>تست دستی API</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const data: any = await apiRequest("GET", '/api/services');
                        
                        console.log("Manual API test data:", data);
                        alert(`موفق: ${data.length} خدمت دریافت شد`);
                      } catch (err: any) {
                        console.error("Manual test error:", err);
                        alert(`خطا: ${err.message}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    تست مستقیم API خدمات
                  </Button>

                  <Button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        const data: any = await apiRequest("GET", '/api/service-requests');
                        
                        console.log("Service requests test data:", data);
                        alert(`موفق: ${data.requests?.length || 0} درخواست دریافت شد`);
                      } catch (err: any) {
                        console.error("Service requests test error:", err);
                        alert(`خطا: ${err.message}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    تست API درخواست‌های خدمات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

