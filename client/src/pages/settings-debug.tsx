import { useState, useEffect } from "react";
import { Settings, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function SettingsDebug() {
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const testSettingsAPI = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("🔍 Testing settings API...");
      
      const token = localStorage.getItem('auth_token');
      console.log("Auth token:", token ? "موجود" : "ندارد");
      
      // Test settings endpoint
      const response = await fetch('/api/settings', {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      
      console.log("Settings status:", response.status);
      
      let data;
      try {
        data = await response.json();
        console.log("Settings data:", data);
      } catch (e) {
        data = { error: "Could not parse JSON" };
      }
      
      setDebugInfo({
        status: response.status,
        data: data,
        hasToken: !!token,
        timestamp: new Date().toISOString()
      });
      
    } catch (err: any) {
      console.error("❌ Settings debug error:", err);
      setError(err.message || "خطای نامشخص");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testSettingsAPI();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-64 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              تشخیص عیب تنظیمات سیستم
            </h1>
            <p className="text-text-secondary">
              بررسی و تشخیص مشکلات API تنظیمات
            </p>
          </div>

          <div className="space-y-6">
            {/* Test Button */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    تست API تنظیمات
                  </CardTitle>
                  <Button 
                    onClick={testSettingsAPI}
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
                              <span>HTTP Status:</span>
                              <span className={debugInfo.status === 200 ? "text-green-600" : "text-red-600"}>
                                {debugInfo.status}
                              </span>
                            </div>
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

            {/* Auth Test */}
            <Card>
              <CardHeader>
                <CardTitle>تست احراز هویت</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('auth_token');
                        const response = await fetch('/api/auth/me', {
                          headers: token ? {
                            'Authorization': `Bearer ${token}`
                          } : {}
                        });
                        
                        const data = await response.json();
                        
                        toast({
                          title: response.ok ? "لاگین موفق" : "خطا در لاگین",
                          description: response.ok ? `${data.fullName} (${data.role})` : data.message,
                          variant: response.ok ? "default" : "destructive"
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
                    <p className="font-medium mb-2">برای تست تنظیمات باید به عنوان مدیر لاگین کنید:</p>
                    <p>• Username: amir.e</p>
                    <p>• Password: 123456</p>
                    <p>• Phone: 09919252110</p>
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
