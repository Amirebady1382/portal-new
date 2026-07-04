import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Activity, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";

export default function SystemHealthDebug() {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  const testHealthAPI = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("🔍 Testing health API...");
      
      // Test basic health endpoint
      const basicHealthData = await apiRequest("GET", '/api/health');
      console.log("Basic health data:", basicHealthData);
      
      // Test detailed health endpoint with auth
      const token = localStorage.getItem('auth_token');
      console.log("Auth token:", token ? "موجود" : "ندارد");
      
      const detailedHealthData = await apiRequest("GET", '/api/health/detailed');
      console.log("Detailed health data:", detailedHealthData);
      
      setHealthData({
        basic: basicHealthData,
        detailed: detailedHealthData,
        timestamp: new Date().toISOString()
      });
      
    } catch (err: any) {
      console.error("❌ Health test error:", err);
      setError(err.message || "خطای نامشخص");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testHealthAPI();
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
              تشخیص عیب وضعیت سلامت سیستم
            </h1>
            <p className="text-text-secondary">
              بررسی و تشخیص مشکلات API سلامت سیستم
            </p>
          </div>

          <div className="space-y-6">
            {/* Test Button */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    تست API سلامت سیستم
                  </CardTitle>
                  <Button 
                    onClick={testHealthAPI}
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

                {healthData && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-lg">
                      <CheckCircle className="h-5 w-5" />
                      <div>
                        <p className="font-medium">تست API موفق</p>
                        <p className="text-sm">تاریخ: {healthData.timestamp}</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-2">Basic Health Check</h3>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>وضعیت:</span>
                              <Badge className="bg-green-100 text-green-800">
                                {healthData.basic.status}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Uptime:</span>
                              <span>{Math.floor(healthData.basic.uptime)} ثانیه</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Environment:</span>
                              <span>{healthData.basic.environment}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">Detailed Health Check</h3>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <pre className="text-xs overflow-auto max-h-40">
                            {JSON.stringify(healthData.detailed, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manual Auth Test */}
            <Card>
              <CardHeader>
                <CardTitle>تست Authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('auth_token');
                        console.log("Current token:", token ? "موجود" : "ندارد");
                        
                        const data = await apiRequest("GET", '/api/auth/me');
                        console.log("Auth me data:", data);
                        
                        toast({
                          title: "موفق",
                          description: `کاربر: ${data.fullName} (${data.role})`,
                          variant: "default"
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
                    تست وضعیت لاگین
                  </Button>

                  <div className="text-sm text-gray-600">
                    <p>اگر لاگین نیستید، ابتدا وارد سامانه شوید:</p>
                    <p>مدیر: amir.e / 123456</p>
                    <p>کارمند: mohammadreza / 123456</p>
                    <p>مشتری: samet / 123456</p>
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
