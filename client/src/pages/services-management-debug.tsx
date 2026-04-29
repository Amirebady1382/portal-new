import { useState, useEffect } from "react";
import { Package, AlertTriangle, CheckCircle } from "lucide-react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ServicesManagementDebug() {
  const { toast } = useToast();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const testAPI = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("🔍 Testing services API...");
      
      // Test health first
      const healthResponse = await fetch('/api/health');
      console.log("Health status:", healthResponse.status);
      
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }
      
      const healthData = await healthResponse.json();
      console.log("Health data:", healthData);
      
      // Test services endpoint (without auth)
      const servicesResponse = await fetch('/api/services');
      console.log("Services status:", servicesResponse.status);
      
      let servicesData;
      try {
        servicesData = await servicesResponse.json();
        console.log("Services response:", servicesData);
      } catch (e) {
        servicesData = { error: "Could not parse JSON" };
      }
      
      setDebugInfo({
        health: healthData,
        services: servicesData,
        servicesStatus: servicesResponse.status,
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
        
        <main className="flex-1 md:mr-64 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              تشخیص عیب مدیریت خدمات
            </h1>
            <p className="text-text-secondary">
              بررسی و تشخیص مشکلات API و صفحه
            </p>
          </div>

          <div className="space-y-6">
            {/* Test Button */}
            <Card>
              <CardHeader>
                <CardTitle>تست API</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={testAPI}
                  disabled={loading}
                  className="mb-4"
                >
                  {loading ? "در حال تست..." : "تست مجدد API"}
                </Button>
                
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
                        <h3 className="font-medium mb-2">Health Check</h3>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(debugInfo.health, null, 2)}
                          </pre>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">Services API Response</h3>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm mb-2">Status: {debugInfo.servicesStatus}</p>
                          <pre className="text-xs overflow-auto max-h-40">
                            {JSON.stringify(debugInfo.services, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Tests */}
            <Card>
              <CardHeader>
                <CardTitle>تست‌های دستی</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('auth_token');
                        console.log("Token:", token ? "موجود" : "ندارد");
                        
                        const response = await fetch('/api/auth/me', {
                          headers: token ? {
                            'Authorization': `Bearer ${token}`
                          } : {}
                        });
                        
                        console.log("Auth me status:", response.status);
                        const data = await response.json();
                        console.log("Auth me data:", data);
                        
                        toast({
                          title: response.ok ? "موفق" : "خطا",
                          description: response.ok ? `کاربر: ${data.fullName}` : data.message,
                          variant: response.ok ? "default" : "destructive"
                        });
                      } catch (err: any) {
                        console.error("Auth test error:", err);
                        toast({
                          title: "خطا",
                          description: err.message,
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    تست Authentication
                  </Button>

                  <Button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('auth_token');
                        const response = await fetch('/api/services', {
                          headers: token ? {
                            'Authorization': `Bearer ${token}`
                          } : {}
                        });
                        
                        console.log("Services test status:", response.status);
                        const data = await response.json();
                        console.log("Services test data:", data);
                        
                        toast({
                          title: response.ok ? "موفق" : "خطا",
                          description: response.ok ? `${data.length || 0} خدمت یافت شد` : data.message,
                          variant: response.ok ? "default" : "destructive"
                        });
                      } catch (err: any) {
                        console.error("Services test error:", err);
                        toast({
                          title: "خطا",
                          description: err.message,
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    تست Services API
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
