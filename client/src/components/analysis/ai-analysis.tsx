import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, TrendingUp, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { toPersianNumber } from "@/lib/persian-utils";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AIAnalysisProps {
  companyId: number;
}

export default function AIAnalysis({ companyId }: AIAnalysisProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch AI analysis data from API
  const { data: aiAnalysis, isLoading, error, refetch } = useQuery({
    queryKey: [`/api/companies/${companyId}/ai-analysis`],
    queryFn: async () => {
      console.log('🔄 Fetching AI Analysis for company:', companyId);
      
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Token exists:', !!token);
      console.log('🔑 Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
      
      const response = await fetch(`/api/companies/${companyId}/ai-analysis`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📡 AI Analysis Response:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('🚨 Error Response Body:', errorData);
        throw new Error(`خطا در دریافت تحلیل هوش مصنوعی: ${response.status} - ${response.statusText}`);
      }
      
      return response.json();
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes in React Query
    retry: 1
  });

  const handleRegenerateAnalysis = async () => {
    setIsRefreshing(true);
    
    try {
      console.log('🔄 Force refreshing AI analysis...');
      
      toast({
        title: "🤖 تولید تحلیل جدید",
        description: "در حال تولید تحلیل جدید... لطفاً صبر کنید",
      });
      
      // Fetch with forceRefresh=true to bypass backend cache
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Regenerate - Token exists:', !!token);
      
      const response = await fetch(`/api/companies/${companyId}/ai-analysis?forceRefresh=true`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('خطا در تولید تحلیل جدید');
      }
      
      const freshAnalysis = await response.json();
      
      // Update the React Query cache with fresh data
      queryClient.setQueryData([`/api/companies/${companyId}/ai-analysis`], freshAnalysis);
      
      console.log('✅ Fresh AI analysis completed');
      
      toast({
        title: "✅ تحلیل جدید آماده شد",
        description: "تحلیل هوش مصنوعی با موفقیت بروزرسانی شد",
      });
      
    } catch (error) {
      console.error('Error regenerating analysis:', error);
      
      toast({
        title: "❌ خطا در تولید تحلیل",
        description: "متأسفانه در تولید تحلیل جدید خطایی رخ داد. لطفاً دوباره تلاش کنید",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewDetails = (analysisId: string) => {
    console.log("View details for:", analysisId);
    // Future: Open analysis details modal
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 8) return "bg-green-100 text-green-800";
    if (score >= 6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      excellent: "عالی",
      good: "خوب", 
      moderate: "متوسط",
      poor: "ضعیف"
    };
    return statusMap[status] || "نامشخص";
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            تحلیل هوش مصنوعی
          </CardTitle>
          <CardDescription className="text-xs">
            تحلیل جامع شرکت با هوش مصنوعی
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-2 w-full" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            تحلیل هوش مصنوعی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              خطا در دریافت تحلیل هوش مصنوعی. لطفاً دوباره تلاش کنید.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleRegenerateAnalysis}
            disabled={isRefreshing}
            className="w-full mt-3"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ml-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!aiAnalysis) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            تحلیل هوش مصنوعی
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">هنوز تحلیلی انجام نشده است</p>
            <Button 
              onClick={handleRegenerateAnalysis}
              disabled={isRefreshing}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              <RefreshCw className={`h-4 w-4 ml-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              شروع تحلیل
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare analysis data for display
  const analyses = [
    {
      id: "team",
      title: "تحلیل تیم",
      score: aiAnalysis.teamAnalysis?.score || 0,
      summary: aiAnalysis.teamAnalysis?.summary || "اطلاعات تیم در دسترس نیست",
      strengths: aiAnalysis.teamAnalysis?.strengths || [],
      weaknesses: aiAnalysis.teamAnalysis?.weaknesses || []
    },
    {
      id: "product", 
      title: "تحلیل محصول",
      score: aiAnalysis.productAnalysis?.score || 0,
      summary: aiAnalysis.productAnalysis?.summary || "اطلاعات محصول در دسترس نیست",
      marketPotential: aiAnalysis.productAnalysis?.marketPotential,
      competitiveAdvantage: aiAnalysis.productAnalysis?.competitiveAdvantage
    },
    {
      id: "market",
      title: "تحلیل بازار", 
      score: aiAnalysis.marketAnalysis?.score || 0,
      summary: aiAnalysis.marketAnalysis?.summary || "اطلاعات بازار در دسترس نیست",
      marketSize: aiAnalysis.marketAnalysis?.marketSize,
      competition: aiAnalysis.marketAnalysis?.competition,
      trends: aiAnalysis.marketAnalysis?.trends
    },
    {
      id: "financial",
      title: "تحلیل مالی",
      score: aiAnalysis.financialAnalysis?.score || 0,
      summary: aiAnalysis.financialAnalysis?.summary || "اطلاعات مالی در دسترس نیست",
      capitalStructure: aiAnalysis.financialAnalysis?.capitalStructure,
      growthPotential: aiAnalysis.financialAnalysis?.growthPotential
    },
    {
      id: "risk",
      title: "تحلیل ریسک",
      score: aiAnalysis.riskAnalysis?.score || 0,
      summary: aiAnalysis.riskAnalysis?.summary || "اطلاعات ریسک در دسترس نیست",
      mainRisks: aiAnalysis.riskAnalysis?.mainRisks || [],
      mitigationStrategies: aiAnalysis.riskAnalysis?.mitigationStrategies || []
    }
  ];

  // Calculate overall score
  const overallScore = aiAnalysis.overallRecommendation?.score || 
    analyses.reduce((sum, analysis) => sum + analysis.score, 0) / analyses.length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          تحلیل هوش مصنوعی
        </CardTitle>
        <CardDescription className="text-xs">
          تحلیل جامع شرکت با هوش مصنوعی
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {/* Overall Score */}
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-text-primary">امتیاز کلی</span>
            <span className={`text-lg font-bold ${getScoreColor(overallScore)}`}>
              <span className="number-font">{toPersianNumber(overallScore.toFixed(1))}/۱۰</span>
            </span>
          </div>

          <Progress 
            value={overallScore * 10} 
            className="h-2"
          />
          
          {/* Cache Status & Overview */}
          <div className="mt-2 space-y-1">
            {aiAnalysis.fromCache && (
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <CheckCircle className="h-3 w-3" />
                <span>تحلیل ذخیره شده</span>
                {aiAnalysis.cacheTimestamp && (
                  <span className="text-text-secondary">
                    • {new Date(aiAnalysis.cacheTimestamp).toLocaleString('fa-IR')}
                  </span>
                )}
              </div>
            )}
            
            {!aiAnalysis.fromCache && (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <RefreshCw className="h-3 w-3" />
                <span>تحلیل جدید</span>
                {aiAnalysis.analysisTimestamp && (
                  <span className="text-text-secondary">
                    • {new Date(aiAnalysis.analysisTimestamp).toLocaleString('fa-IR')}
                  </span>
                )}
              </div>
            )}
            
            {aiAnalysis.companyOverview && (
              <p className="text-xs text-text-secondary leading-relaxed">
                {aiAnalysis.companyOverview.substring(0, 120)}...
              </p>
            )}
          </div>
        </div>

        {/* Individual Analyses */}
        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
          {analyses.map((analysis) => (
            <div 
              key={analysis.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-all cursor-pointer"
              onClick={() => handleViewDetails(analysis.id)}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-text-primary">
                  {analysis.title}
                </span>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className="text-sm text-text-secondary">امتیاز:</span>
                  <Badge className={getScoreBadgeClass(analysis.score)}>
                    <span className="number-font">{toPersianNumber(analysis.score.toFixed(1))}/۱۰</span>
                  </Badge>
                </div>
              </div>
              
              <p className="text-sm text-text-secondary mb-3 leading-relaxed">
                {analysis.summary}
              </p>
              
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="text-xs">
                  {analysis.score >= 8 ? "عالی" : analysis.score >= 6 ? "خوب" : analysis.score >= 4 ? "متوسط" : "ضعیف"}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-primary hover:text-primary-dark text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(analysis.id);
                  }}
                >
                  <FileText className="h-3 w-3 ml-1" />
                  جزئیات
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Analysis Actions */}
        <div className="space-y-3 pt-4 border-t flex-shrink-0">
          <Button 
            onClick={handleRegenerateAnalysis}
            disabled={isRefreshing}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white btn-hover disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ml-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'در حال تولید تحلیل جدید...' : 'تحلیل مجدد (جدید)'}
          </Button>
          
          {/* Cache info and recommendation */}
          <div className="space-y-2">
            {aiAnalysis.fromCache && (
              <div className="text-xs text-center text-blue-600 p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                <strong>💾 تحلیل ذخیره شده:</strong> برای تحلیل جدید، روی دکمه "تحلیل مجدد" کلیک کنید
        </div>
            )}
            
            {aiAnalysis.overallRecommendation && (
              <div className="text-xs text-center text-text-secondary p-2 bg-gray-50 rounded">
                <strong>توصیه:</strong> {aiAnalysis.overallRecommendation.reasoning}
            </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
