import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, RefreshCw } from "lucide-react";

interface Setting {
  id: number;
  key: string;
  value: string;
  category: string;
  description: string | null;
  dataType: string;
  isEditable: boolean;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, Setting[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const categoryLabels: Record<string, string> = {
    fund_info: "اطلاعات صندوق",
    contract_defaults: "تنظیمات پیش‌فرض قرارداد",
    financial_settings: "تنظیمات مالی",
    system_config: "پیکربندی سیستم"
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        toast({
          title: "خطا",
          description: "لطفاً ابتدا وارد سیستم شوید",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const data: any = await apiRequest("GET", "/api/settings");

      setSettings(data.data || {});
      
      // Set default selected category
      const categories = Object.keys(data.data || {});
      if (categories.length > 0 && !selectedCategory) {
        setSelectedCategory(categories[0]);
      }
    } catch (error: any) {
      console.error("Fetch settings error:", error);
      let errorMessage = "خطا در دریافت تنظیمات";
      
      if (error.status === 401) {
        errorMessage = "دسترسی غیرمجاز - لطفاً دوباره وارد شوید";
      } else if (error.status === 403) {
        errorMessage = "شما مجوز دسترسی به این صفحه را ندارید";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "خطا",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setEditedSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = async () => {
    if (Object.keys(editedSettings).length === 0) {
      toast({
        title: "اطلاع",
        description: "تغییری برای ذخیره وجود ندارد",
      });
      return;
    }

    setSaving(true);
    try {
      const data: any = await apiRequest('PUT', "/api/settings", { settings: editedSettings });

      toast({
        title: "موفق",
        description: data.message || "تنظیمات با موفقیت ذخیره شد",
      });
      setEditedSettings({});
      await fetchSettings(); // Refresh data
    } catch (error: any) {
      console.error("Save settings error:", error);
      let errorMessage = "خطا در ذخیره تنظیمات";
      
      if (error.status === 401) {
        errorMessage = "دسترسی غیرمجاز - لطفاً دوباره وارد شوید";
      } else if (error.status === 403) {
        errorMessage = "شما مجوز ذخیره تنظیمات را ندارید";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "خطا",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    setEditedSettings({});
    toast({
      title: "اطلاع",
      description: "تغییرات لغو شد",
    });
  };

  const renderSettingInput = (setting: Setting) => {
    const currentValue = editedSettings[setting.key] || setting.value;
    const hasChanged = editedSettings[setting.key] !== undefined;

    if (!setting.isEditable) {
      return (
        <div className="space-y-2">
          <div className="p-3 bg-gray-50 rounded-md">
            <span className="text-sm text-gray-600">{currentValue}</span>
            <Badge variant="secondary" className="mr-2">فقط خواندنی</Badge>
          </div>
        </div>
      );
    }

    if (setting.description && setting.description.length > 100) {
      return (
        <div className="space-y-2">
          <Textarea
            value={currentValue}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className={hasChanged ? "border-orange-300 bg-orange-50" : ""}
            rows={3}
          />
          {hasChanged && (
            <Badge variant="outline" className="text-orange-600">
              تغییر کرده
            </Badge>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Input
          type={setting.dataType === 'number' ? 'number' : 'text'}
          value={currentValue}
          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          className={hasChanged ? "border-orange-300 bg-orange-50" : ""}
        />
        {hasChanged && (
          <Badge variant="outline" className="text-orange-600">
            تغییر کرده
          </Badge>
        )}
      </div>
    );
  };

  const categories = Object.keys(settings);
  const hasChanges = Object.keys(editedSettings).length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <MobileSidebar />
        
        <div className="flex pt-16">
          <Sidebar />
          
          <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="mr-2">در حال بارگذاری...</span>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 space-x-reverse">
                <Settings className="h-8 w-8" />
                <div>
                  <h1 className="text-3xl font-bold">مدیریت تنظیمات سیستم</h1>
                  <p className="text-gray-600">
                    مدیریت اطلاعات صندوق و تنظیمات پیش‌فرض قراردادها
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                {hasChanges && (
                  <Button variant="outline" onClick={resetChanges}>
                    لغو تغییرات
                  </Button>
                )}
                <Button 
                  onClick={saveSettings} 
                  disabled={!hasChanges || saving}
                  className="flex items-center space-x-2 space-x-reverse"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>ذخیره تغییرات</span>
                  {hasChanges && (
                    <Badge variant="secondary" className="mr-2">
                      {Object.keys(editedSettings).length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                {categories.map((category) => (
                  <TabsTrigger key={category} value={category}>
                    {categoryLabels[category] || category}
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map((category) => (
                <TabsContent key={category} value={category} className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{categoryLabels[category] || category}</CardTitle>
                      <CardDescription>
                        {settings[category]?.length || 0} تنظیم در این دسته
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {settings[category]?.map((setting) => (
                        <div key={setting.id} className="space-y-2 border-b pb-4 last:border-b-0">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <Label htmlFor={setting.key} className="text-base font-medium">
                                {setting.key}
                              </Label>
                              {setting.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {setting.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <Badge variant="outline">
                                {setting.dataType}
                              </Badge>
                            </div>
                          </div>
                          {renderSettingInput(setting)}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>

            {hasChanges && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">
                        {Object.keys(editedSettings).length} تنظیم تغییر کرده و منتظر ذخیره است
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Button variant="outline" size="sm" onClick={resetChanges}>
                        لغو
                      </Button>
                      <Button size="sm" onClick={saveSettings} disabled={saving}>
                        ذخیره همه
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
