import { useState, useEffect } from "react";
import { FileText, AlertTriangle, CheckCircle, Package } from "lucide-react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function DebugCreateRequirement() {
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: "تست فرم مدارک",
    description: "این یک فرم تست است",
    department: "investment",
    serviceId: null as number | null,
    fields: JSON.stringify([
      {
        id: "test_field_1",
        name: "company_name",
        label: "نام شرکت",
        type: "text",
        required: true,
        placeholder: "نام شرکت خود را وارد کنید"
      }
    ])
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const servicesData = await apiRequest("GET", "/api/services?isActive=true");
      setServices(Array.isArray(servicesData) ? servicesData : []);
    } catch (error: any) {
      console.error("Error fetching services:", error);
    }
  };

  const testCreateRequirement = async () => {
    try {
      setLoading(true);
      setDebugResult(null);
      
      console.log("🔍 Testing requirement creation...");
      console.log("Form data:", formData);
      
      // First test debug endpoint
      const debugResponse = await apiRequest("POST", "/api/debug/create-requirement", formData);
      console.log("Debug response:", debugResponse);
      
      // Then try actual creation
      const createResponse = await apiRequest("POST", "/api/document-requirements", formData);
      console.log("Create response:", createResponse);
      
      setDebugResult({
        debug: debugResponse,
        create: createResponse,
        success: true
      });
      
      toast({
        title: "موفق",
        description: "فرم مدارک با موفقیت ایجاد شد"
      });
      
    } catch (error: any) {
      console.error("❌ Test error:", error);
      setDebugResult({
        error: error.message,
        success: false
      });
      
      toast({
        title: "خطا",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-64 p-4 md:p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              تشخیص عیب ایجاد فرم مدارک
            </h1>
            <p className="text-text-secondary">
              تست ایجاد فرم مدارک و وصل کردن به خدمت
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Test Form */}
            <Card>
              <CardHeader>
                <CardTitle>فرم تست</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">عنوان فرم</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="description">توضیحات</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="department">واحد</Label>
                  <Select 
                    value={formData.department} 
                    onValueChange={(value) => setFormData({...formData, department: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="investment">سرمایه‌گذاری</SelectItem>
                      <SelectItem value="administrative">اداری</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="serviceId">خدمت مرتبط</Label>
                  <Select 
                    value={formData.serviceId?.toString() || "none"} 
                    onValueChange={(value) => setFormData({
                      ...formData, 
                      serviceId: value === "none" ? null : parseInt(value)
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="انتخاب خدمت" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون خدمت</SelectItem>
                      {services
                        .filter(service => service.department === formData.department)
                        .map(service => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            {service.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={testCreateRequirement}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "در حال تست..." : "تست ایجاد فرم"}
                </Button>
              </CardContent>
            </Card>

            {/* Debug Results */}
            <Card>
              <CardHeader>
                <CardTitle>نتایج تست</CardTitle>
              </CardHeader>
              <CardContent>
                {loading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p>در حال تست...</p>
                  </div>
                )}

                {debugResult && (
                  <div className="space-y-4">
                    {debugResult.success ? (
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 p-4 rounded-lg">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">تست موفق!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-700 bg-red-50 p-4 rounded-lg">
                        <AlertTriangle className="h-5 w-5" />
                        <div>
                          <p className="font-medium">خطا در تست</p>
                          <p className="text-sm">{debugResult.error}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="font-medium mb-2">جزئیات تست</h3>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <pre className="text-xs overflow-auto max-h-60">
                          {JSON.stringify(debugResult, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {!debugResult && !loading && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>روی دکمه تست کلیک کنید</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>راهنمای تست</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p>• ابتدا یک خدمت از لیست انتخاب کنید</p>
                <p>• سپس روی "تست ایجاد فرم" کلیک کنید</p>
                <p>• اگر خطا داد، جزئیات خطا در قسمت نتایج نمایش داده می‌شود</p>
                <p>• اگر موفق بود، فرم جدید ایجاد شده و به خدمت وصل شده است</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
