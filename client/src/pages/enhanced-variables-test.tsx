import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import MobileSidebar from '@/components/layout/mobile-sidebar';
import EnhancedVariableExtractor from '@/components/enhanced-variable-extractor';
import { FileText, TestTube, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContractTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  variables: string[];
  is_active: boolean;
}

export default function EnhancedVariablesTestPage() {
  const { toast } = useToast();
  
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contract-templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        console.log('📋 Templates loaded:', data.templates?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "خطا",
        description: "خطا در بارگذاری قالب‌ها",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVariablesExtracted = (variables: any[]) => {
    console.log('✅ Variables extracted successfully:', variables.length);
    toast({
      title: "موفق",
      description: `${variables.length} متغیر استخراج شد`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="flex">
        <Sidebar />
        <MobileSidebar />
        <main className="flex-1 mr-0 md:mr-64 p-6">
          <div className="container mx-auto py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <TestTube className="h-8 w-8 text-blue-600" />
                تست سیستم استخراج پیشرفته متغیرها
              </h1>
              <p className="text-gray-600">
                تست و بررسی عملکرد سیستم جدید استخراج متغیر از قالب‌های قرارداد
              </p>
            </div>

            {/* Template Selection */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  انتخاب قالب قرارداد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Select
                      value={selectedTemplate?.id.toString() || ""}
                      onValueChange={(value) => {
                        const template = templates.find(t => t.id.toString() === value);
                        setSelectedTemplate(template || null);
                        console.log('📋 Template selected:', template?.name);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loading ? "در حال بارگذاری..." : "انتخاب قالب"} />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id.toString()}>
                            <div className="flex items-center justify-between w-full">
                              <span>{template.name}</span>
                              <span className="text-xs text-gray-500 mr-2">
                                ({template.category})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    onClick={fetchTemplates}
                    variant="outline"
                    disabled={loading}
                    className="gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    بروزرسانی
                  </Button>
                </div>

                {selectedTemplate && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>نام:</strong> {selectedTemplate.name}
                      </div>
                      <div>
                        <strong>دسته‌بندی:</strong> {selectedTemplate.category}
                      </div>
                      <div>
                        <strong>توضیحات:</strong> {selectedTemplate.description}
                      </div>
                      <div>
                        <strong>متغیرهای فعلی:</strong> {selectedTemplate.variables?.length || 0}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enhanced Variable Extractor */}
            {selectedTemplate && (
              <EnhancedVariableExtractor
                templateId={selectedTemplate.id}
                templateName={selectedTemplate.name}
                onVariablesExtracted={handleVariablesExtracted}
              />
            )}

            {!selectedTemplate && !loading && (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <div className="text-center text-gray-500">
                    <TestTube className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-medium mb-2">قالبی انتخاب نشده</h3>
                    <p>برای شروع تست، ابتدا یک قالب قرارداد را انتخاب کنید</p>
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
