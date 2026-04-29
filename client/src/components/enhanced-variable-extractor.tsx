import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loading, LoadingSkeleton } from '@/components/ui/loading';
import { logger } from '@/lib/logger';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  Wrench,
  Brain,
  Target,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExtractedVariable {
  name: string;
  originalText: string;
  context: string;
  position: {
    xmlFile: string;
    line: number;
  };
  confidence: number;
  source: 'rasmio' | 'form' | 'calculated' | 'system';
  type: 'text' | 'number' | 'date' | 'currency' | 'email' | 'phone';
  required: boolean;
}

interface ExtractionStats {
  totalVariables: number;
  bySource: Record<string, number>;
  byType: Record<string, number>;
  fixedBrokenVariables: number;
}

interface ExtractionResult {
  variables: ExtractedVariable[];
  stats: ExtractionStats;
  warnings: string[];
  errors: string[];
}

interface EnhancedVariableExtractorProps {
  templateId: number;
  templateName: string;
  onVariablesExtracted?: (variables: ExtractedVariable[]) => void;
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

      const response = await fetch(`/api/enhanced-variables/extract/${templateId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ useCache })
      });

      if (response.ok) {
        const result = await response.json();
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
      } else {
        const error = await response.json();
        throw new Error(error.message || 'خطا در استخراج متغیرها');
      }
    } catch (error) {
      logger.debugError('Extraction error', error);
      toast({
        title: "خطا",
        description: error instanceof Error ? error.message : "خطا در استخراج متغیرها",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeVariables = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(`/api/enhanced-variables/analyze/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysis(result.data);
        logger.info('📊 Analysis completed:', result.data);
      } else {
        logger.warn('Analysis failed, but continuing...');
      }
    } catch (error) {
      logger.warn('Analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch('/api/enhanced-variables/cache', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        toast({
          title: "موفق",
          description: "Cache پاکسازی شد",
        });
      }
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در پاکسازی cache",
        variant: "destructive"
      });
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'rasmio': return 'bg-green-100 text-green-800';
      case 'form': return 'bg-blue-100 text-blue-800';
      case 'calculated': return 'bg-purple-100 text-purple-800';
      case 'system': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'rasmio': return <Zap className="h-3 w-3" />;
      case 'form': return <FileText className="h-3 w-3" />;
      case 'calculated': return <Brain className="h-3 w-3" />;
      case 'system': return <Target className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="w-full space-y-6" dir="rtl">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            استخراج پیشرفته متغیرها
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium">{templateName}</h3>
              <p className="text-sm text-gray-500">شناسه قالب: {templateId}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => clearCache()} 
                variant="outline" 
                size="sm"
                className="gap-1"
              >
                <RefreshCw className="h-4 w-4" />
                پاکسازی Cache
              </Button>
              <Button 
                onClick={() => extractVariables(false)} 
                disabled={loading}
                size="sm"
                className="gap-1"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                استخراج جدید
              </Button>
              <Button 
                onClick={() => extractVariables(true)} 
                disabled={loading}
                variant="default"
                className="gap-1"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                شروع استخراج
              </Button>
            </div>
          </div>

          {loading && (
            <div className="space-y-4">
              <Loading 
                variant="spinner" 
                size="lg" 
                text="در حال استخراج و تحلیل متغیرها..." 
                className="py-8"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LoadingSkeleton className="h-32" />
                <LoadingSkeleton className="h-32" />
              </div>
              <Progress value={loading ? 50 : 0} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {extractionResult && (
        <>
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'overview' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              خلاصه
            </button>
            <button
              onClick={() => setActiveTab('variables')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'variables' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              متغیرها ({extractionResult.variables.length})
            </button>
            {analysis && (
              <button
                onClick={() => setActiveTab('analysis')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'analysis' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                تحلیل
              </button>
            )}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Stats Cards */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">کل متغیرها</p>
                      <p className="text-2xl font-bold text-blue-600">{extractionResult.stats.totalVariables}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">تعمیر شده</p>
                      <p className="text-2xl font-bold text-green-600">{extractionResult.stats.fixedBrokenVariables}</p>
                    </div>
                    <Wrench className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">رسمیو</p>
                      <p className="text-2xl font-bold text-green-600">{extractionResult.stats.bySource.rasmio || 0}</p>
                    </div>
                    <Zap className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">فرم</p>
                      <p className="text-2xl font-bold text-blue-600">{extractionResult.stats.bySource.form || 0}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Variables Tab */}
          {activeTab === 'variables' && (
            <Card>
              <CardHeader>
                <CardTitle>متغیرهای استخراج شده</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {extractionResult.variables.map((variable, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">
                            {variable.name}
                          </code>
                          {variable.required && (
                            <Badge variant="destructive" className="text-xs">اجباری</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getSourceBadgeColor(variable.source)} text-xs gap-1`}>
                            {getSourceIcon(variable.source)}
                            {variable.source}
                          </Badge>
                          <span className={`text-xs font-medium ${getConfidenceColor(variable.confidence)}`}>
                            {Math.round(variable.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 grid grid-cols-2 gap-4">
                        <div>
                          <strong>نوع:</strong> {variable.type}
                        </div>
                        <div>
                          <strong>موقعیت:</strong> {variable.position.xmlFile}:{variable.position.line}
                        </div>
                      </div>
                      
                      {variable.context && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>متن اصلی:</strong> {variable.originalText}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && analysis && (
            <div className="space-y-4">
              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <strong>توصیه‌ها:</strong>
                      {analysis.recommendations.map((rec: string, index: number) => (
                        <div key={index} className="text-sm">• {rec}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Issues */}
              {analysis.potentialIssues && analysis.potentialIssues.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <strong>مشکلات احتمالی:</strong>
                      {analysis.potentialIssues.map((issue: string, index: number) => (
                        <div key={index} className="text-sm">• {issue}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>توزیع متغیرها</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">بر اساس منبع</h4>
                      <div className="space-y-2">
                        {Object.entries(analysis.distribution.bySource).map(([source, count]) => (
                          <div key={source} className="flex items-center justify-between">
                            <Badge className={`${getSourceBadgeColor(source)} gap-1`}>
                              {getSourceIcon(source)}
                              {source}
                            </Badge>
                            <span>{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">بر اساس نوع</h4>
                      <div className="space-y-2">
                        {Object.entries(analysis.distribution.byType).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between">
                            <span className="text-sm">{type}</span>
                            <span>{count as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Warnings and Errors */}
          {(extractionResult.warnings.length > 0 || extractionResult.errors.length > 0) && (
            <div className="space-y-2">
              {extractionResult.warnings.map((warning, index) => (
                <Alert key={`warning-${index}`}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}
              
              {extractionResult.errors.map((error, index) => (
                <Alert key={`error-${index}`} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </>
      )}

      {/* Loading Analysis */}
      {analyzing && (
        <Loading 
          variant="dots" 
          size="md" 
          text="در حال تحلیل متغیرها..." 
          className="py-4"
        />
      )}
    </div>
  );
}
