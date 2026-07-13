import { useState, useEffect } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

export default function TestServices() {
  const [serviceStatus, setServiceStatus] = useState<Record<string, any>>({});
  const [loadingServices, setLoadingServices] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const services = [
    { id: 'rasmio', name: 'Rasmio', type: 'rasmio' },
    { id: 'claude', name: 'Claude', type: 'ai' },
    { id: 'gapgpt', name: 'GapGPT', type: 'ai' },
    { id: 'perplexity', name: 'Perplexity', type: 'ai' },
    { id: 'gemini', name: 'Google Gemini', type: 'ai' },
    { id: 'sms', name: 'SMS.ir', type: 'sms' },
    { id: 'bale', name: 'Bale Bot', type: 'bale' }
  ];

  const testSingleService = async (id: string, type: string) => {
    setLoadingServices(prev => ({ ...prev, [id]: true }));
    try {
      let endpoint = `/api/admin/test-services/${type}`;
      if (type === 'ai') {
        endpoint = `/api/admin/test-services/ai/${id.toLowerCase()}`;
      }
      
      const data = await apiRequest("GET", endpoint);
      
      setServiceStatus(prev => ({
        ...prev,
        [id]: data
      }));
    } catch (error) {
      setServiceStatus(prev => ({
        ...prev,
        [id]: { isOnline: false, error: 'خطای ارتباط با سرور', responseTime: 0 }
      }));
      toast({ title: `خطا در بررسی ${id}`, variant: "destructive" });
    } finally {
      setLoadingServices(prev => ({ ...prev, [id]: false }));
    }
  };

  const testAllServices = async () => {
    services.forEach(s => testSingleService(s.id, s.type));
  };

  useEffect(() => { testAllServices(); }, []);

  const isAnyLoading = Object.values(loadingServices).some(Boolean);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 md:mr-72 p-4 md:p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">تست وضعیت سرویس‌ها</h1>
            <Button onClick={testAllServices} disabled={isAnyLoading}>
              {isAnyLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              <span className="mr-2">بررسی همه</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(s => {
              const status = serviceStatus[s.id];
              const isLoading = loadingServices[s.id];

              return (
                <Card key={s.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{s.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {isLoading ? 'در حال بررسی...' : (status ? (status.isOnline ? 'آنلاین' : 'آفلاین') : 'وضعیت نامشخص')}
                        </CardDescription>
                      </div>
                      {!isLoading && status && (
                        status.isOnline ? 
                          <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : 
                          <XCircle className="h-6 w-6 text-rose-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : status ? (
                      <div className="space-y-3">
                        <div className={`text-sm font-medium ${status.isOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                           وضعیت: {status.isOnline ? 'فعال و در دسترس' : 'غیرفعال / قطع'}
                        </div>
                        {status.responseTime !== undefined && (
                          <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                            زمان پاسخ‌دهی: {status.responseTime} میلی‌ثانیه
                          </div>
                        )}
                        {status.error && (
                          <div className="text-xs text-rose-500 bg-rose-50 p-2 rounded border border-rose-100">
                            خطا: {status.error}
                          </div>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => testSingleService(s.id, s.type)}
                        >
                          <RefreshCw className="h-3 w-3 ml-2" />
                          تست مجدد
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center text-sm text-gray-400 p-4">
                        در انتظار بررسی
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
