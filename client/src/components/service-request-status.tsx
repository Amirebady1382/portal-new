import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Shield,
  AlertCircle,
  FileText 
} from "lucide-react";

interface ServiceRequestStatusProps {
  stage: string;
  message: string;
  canFillForms: boolean;
  formsType?: "investment" | "administrative";
  serviceTitle?: string;
}

const STAGE_CONFIG = {
  investment_forms_pending: {
    icon: FileText,
    color: "bg-blue-100 text-blue-800 border-blue-200",
    iconColor: "text-blue-600",
    title: "پر کردن فرم‌های ارزیابی"
  },
  investment_review: {
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    iconColor: "text-yellow-600",
    title: "بررسی در واحد سرمایه‌گذاری"
  },
  administrative_forms_pending: {
    icon: FileText,
    color: "bg-purple-100 text-purple-800 border-purple-200",
    iconColor: "text-purple-600",
    title: "پر کردن فرم‌های اداری"
  },
  administrative_review: {
    icon: Clock,
    color: "bg-orange-100 text-orange-800 border-orange-200",
    iconColor: "text-orange-600",
    title: "بررسی در واحد اداری"
  },
  completed: {
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 border-green-200",
    iconColor: "text-green-600",
    title: "نهایی شده"
  }
};

export default function ServiceRequestStatus({
  stage,
  message,
  canFillForms,
  formsType,
  serviceTitle
}: ServiceRequestStatusProps) {
  
  const config = STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG] || {
    icon: AlertCircle,
    color: "bg-gray-100 text-gray-800 border-gray-200",
    iconColor: "text-gray-600",
    title: "در حال پردازش"
  };
  
  const Icon = config.icon;
  
  return (
    <Card className={`border-2 ${config.color}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full bg-white`}>
            <Icon className={`h-8 w-8 ${config.iconColor}`} />
          </div>
          <div className="flex-1">
            {serviceTitle && (
              <p className="text-sm text-muted-foreground mb-1">
                خدمت: {serviceTitle}
              </p>
            )}
            <CardTitle className="text-xl">{config.title}</CardTitle>
          </div>
          <Badge className={config.color}>
            {stage === "completed" ? "✅ تکمیل شده" : "🔄 در حال انجام"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className={`p-4 rounded-lg bg-white border ${config.color}`}>
          <p className="text-lg font-medium">{message}</p>
        </div>
        
        {/* Workflow stages visualization */}
        <div className="mt-6">
          <div className="flex items-center justify-between gap-2">
            {/* Stage 1: Investment Forms */}
            <div className="flex-1 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                ["investment_forms_pending", "investment_review", "administrative_forms_pending", "administrative_review", "completed"].includes(stage)
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-200 text-gray-400"
              }`}>
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-xs mt-2 text-center">فرم‌های ارزیابی</p>
            </div>
            
            {/* Connector */}
            <div className={`flex-1 h-1 ${
              ["investment_review", "administrative_forms_pending", "administrative_review", "completed"].includes(stage)
                ? "bg-blue-500" 
                : "bg-gray-200"
            }`} />
            
            {/* Stage 2: Investment Review */}
            <div className="flex-1 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                ["investment_review", "administrative_forms_pending", "administrative_review", "completed"].includes(stage)
                  ? "bg-yellow-500 text-white" 
                  : "bg-gray-200 text-gray-400"
              }`}>
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-xs mt-2 text-center">بررسی سرمایه‌گذاری</p>
            </div>
            
            {/* Connector */}
            <div className={`flex-1 h-1 ${
              ["administrative_forms_pending", "administrative_review", "completed"].includes(stage)
                ? "bg-purple-500" 
                : "bg-gray-200"
            }`} />
            
            {/* Stage 3: Administrative Forms */}
            <div className="flex-1 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                ["administrative_forms_pending", "administrative_review", "completed"].includes(stage)
                  ? "bg-purple-500 text-white" 
                  : "bg-gray-200 text-gray-400"
              }`}>
                <FileText className="h-5 w-5" />
              </div>
              <p className="text-xs mt-2 text-center">فرم‌های اداری</p>
            </div>
            
            {/* Connector */}
            <div className={`flex-1 h-1 ${
              ["administrative_review", "completed"].includes(stage)
                ? "bg-orange-500" 
                : "bg-gray-200"
            }`} />
            
            {/* Stage 4: Administrative Review */}
            <div className="flex-1 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                ["administrative_review", "completed"].includes(stage)
                  ? "bg-orange-500 text-white" 
                  : "bg-gray-200 text-gray-400"
              }`}>
                <Shield className="h-5 w-5" />
              </div>
              <p className="text-xs mt-2 text-center">بررسی اداری</p>
            </div>
            
            {/* Connector */}
            <div className={`flex-1 h-1 ${
              stage === "completed" ? "bg-green-500" : "bg-gray-200"
            }`} />
            
            {/* Stage 5: Completed */}
            <div className="flex-1 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                stage === "completed"
                  ? "bg-green-500 text-white" 
                  : "bg-gray-200 text-gray-400"
              }`}>
                <CheckCircle className="h-5 w-5" />
              </div>
              <p className="text-xs mt-2 text-center">نهایی شده</p>
            </div>
          </div>
        </div>
        
        {/* Additional info */}
        {canFillForms && formsType && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              💡 لطفاً فرم‌های {formsType === "investment" ? "ارزیابی" : "واحد اداری"} را در پایین صفحه تکمیل کنید
            </p>
          </div>
        )}
        
        {stage === "completed" && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              ✅ درخواست شما با موفقیت تکمیل شد. تیم ما در اسرع وقت با شما تماس خواهد گرفت.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

