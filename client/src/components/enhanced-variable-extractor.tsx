import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wand2, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Code,
  Info,
  ChevronRight,
  Database,
  Brain,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { logger } from '@/lib/logger';

interface EnhancedVariableExtractorProps {
  templateId: number;
  templateName: string;
  onVariablesExtracted?: (variables: string[]) => void;
}

interface ExtractionResult {
  variables: string[];
  stats: {
    total: number;
    rasmio: number;
    form: number;
    calculated: number;
  };
  details: Record<string, {
    label: string;
    source: string;
    description: string;
  }>;
}

export default function EnhancedVariableExtractor({ 
  templateId, 
  templateName, 
  onVariablesExtracted 
}: EnhancedVariableExtractorProps) {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'variables' | 'analysis'>('overview');

  const extractVariables = async (useCache: boolean = true) => {
    setLoading(true);
    try {
      logger.info(`🔍 Starting enhanced variable extraction for template ${templateId}`);

      const result: any = await apiRequest("POST", `/api/enhanced-variables/extract/${templateId}`, { useCache });

      logger.info('✅ Extraction successful:', result);
      
      setExtractionResult(result.data);
      onVariablesExtracted?.(result.data.variables);
      
      toast({
        title: "موفق",
        description: result.message,
      });

      // Automatically analyze after extraction
      if (result.data.variables.length > 0) {
        analyzeVariables();
      }
    } catch (error: any) {
      logger.error('Extraction error', error);
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در استخراج متغیرها",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeVariables = async () => {
    if (!extractionResult) return;
    
    setAnalyzing(true);
    try {
      logger.info(`🧠 Starting AI analysis for template ${templateId}`);
      
      const result: any = await apiRequest("POST", `/api/enhanced-variables/analyze/${templateId}`, {
        variables: extractionResult.variables
      });
      
      setAnalysis(result.data);
      
      toast({
        title: "تحلیل هوشمند",
        description: "تحلیل متغیرها توسط هوش مصنوعی با موفقیت انجام شد",
      });
    } catch (error) {
      logger.error('Analysis error', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getSourceBadge = (source: string) => {
    const styles: Record<string, string> = {
      rasmio: 'bg-green-100 text-green-800',
      form: 'bg-blue-100 text-blue-800',
      calculated: 'bg-purple-100 text-purple-800',
      manual: 'bg-yellow-100 text-yellow-800'
    };
    
    const labels: Record<string, string> = {
      rasmio: 'رسمیو',
      form: 'فرم ورودی',
      calculated: 'محاسباتی',
      manual: 'دستی'
    };
    
    return (
      <Badge variant="secondary" className={styles[source] || ''}>
        {labels[source] || source}
      </Badge>
    );
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            <CardTitle>استخراج هوشمند متغیرها</CardTitle>
          </div>
          <Button 
            onClick={() => extractVariables(false)} 
            disabled={loading}
            size="sm"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 ml-2" />}
            {extractionResult ? 'بروزرسانی' : 'شروع استخراج'}
          </Button>
        </div>
        <CardDescription>
          تحلیل قالب {templateName} و شناسایی خودکار متغیرها
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!extractionResult ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              برای شناسایی متغیرهای موجود در فایل Word کلیک کنید
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="overview">خلاصه</TabsTrigger>
              <TabsTrigger value="variables">لیست متغیرها</TabsTrigger>
              <TabsTrigger value="analysis">تحلیل هوشمند</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white border rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary">{extractionResult.stats.total}</p>
                  <p className="text-xs text-gray-500">کل متغیرها</p>
                </div>
                <div className="p-3 bg-white border rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{extractionResult.stats.rasmio}</p>
                  <p className="text-xs text-gray-500">از رسمیو</p>
                </div>
                <div className="p-3 bg-white border rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{extractionResult.stats.form}</p>
                  <p className="text-xs text-gray-500">از فرم</p>
                </div>
                <div className="p-3 bg-white border rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{extractionResult.stats.calculated}</p>
                  <p className="text-xs text-gray-500">محاسباتی</p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-800">آماده استفاده</p>
                </div>
                <p className="text-xs text-blue-700">
                  متغیرهای شناسایی شده آماده استفاده در فرآیند تولید سند هستند.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="variables">
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                {extractionResult.variables.map((variable) => (
                  <div key={variable} className="flex items-center justify-between p-2 bg-white border rounded text-sm">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-blue-700">
                        {`{{${variable}}}`}
                      </code>
                      <span className="text-gray-600 text-xs truncate max-w-[150px]">
                        {extractionResult.details[variable]?.label}
                      </span>
                    </div>
                    {getSourceBadge(extractionResult.details[variable]?.source)}
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="analysis">
              {analyzing ? (
                <div className="text-center py-6">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                  <p className="text-xs text-gray-500">در حال تحلیل متغیرها توسط هوش مصنوعی...</p>
                </div>
              ) : analysis ? (
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <p className="text-sm font-medium text-purple-800">توصیه‌های هوشمند</p>
                    </div>
                    <ul className="text-xs space-y-2 text-purple-700">
                      {analysis.recommendations?.map((rec: string, i: number) => (
                        <li key={i} className="flex gap-2">
                          <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {analysis.missingVariables?.length > 0 && (
                    <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <p className="text-sm font-medium text-orange-800">متغیرهای پیشنهادی (غایب)</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.missingVariables.map((v: string) => (
                          <Badge key={v} variant="outline" className="text-[10px] bg-white border-orange-200 text-orange-700">
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Button variant="outline" size="sm" onClick={analyzeVariables}>
                    شروع تحلیل هوشمند
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
