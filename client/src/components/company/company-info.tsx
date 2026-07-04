import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building, RefreshCw } from "lucide-react";
import { toPersianNumber } from "@/lib/persian-utils";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface CompanyInfoProps {
  company: any;
}

export default function CompanyInfo({ company }: CompanyInfoProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate cache and refetch enriched data
      await queryClient.invalidateQueries({ 
        queryKey: [`/api/companies/${company.id}/enrich`] 
      });
      
      await queryClient.refetchQueries({ 
        queryKey: [`/api/companies/${company.id}/enrich`] 
      });
      
      toast({
        title: "به‌روزرسانی موفق",
        description: "اطلاعات رسمیو با موفقیت به‌روزرسانی شد"
      });
      
      console.log("✅ اطلاعات رسمیو با موفقیت به‌روزرسانی شد");
    } catch (error) {
      toast({
        title: "خطا در به‌روزرسانی", 
        description: "مشکلی در به‌روزرسانی اطلاعات رخ داد",
        variant: "destructive"
      });
      
      console.error("❌ خطا در به‌روزرسانی اطلاعات رسمیو:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Mock Rasmio data - replace with actual API data
  const rasmioData = company.rasmioData || {
    registrationNumber: "654321",
    registrationDate: "1400/08/15",
    capital: "500,000,000 ریال",
    boardMembers: [
      "احمد احمدی (مدیرعامل)",
      "فاطمه محمدی (نائب رئیس)",
      "علی رضایی (عضو هیئت مدیره)"
    ],
    shareholders: [
      { name: "احمد احمدی", percentage: 60 },
      { name: "فاطمه محمدی", percentage: 30 },
      { name: "علی رضایی", percentage: 10 }
    ],
    activityStatus: "فعال",
    lastUpdate: "1402/09/20"
  };

  return (
    <Card className="shadow-sm border-0" dir="rtl">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-text-primary flex items-center">
          <Building className="h-5 w-5 ml-2 text-primary" />
          اطلاعات رسمی شرکت
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Information */}
        <div className="space-y-3">
          <div className="flex justify-between py-2">
            <span className="text-text-secondary">شماره ثبت:</span>
            <span className="text-text-primary number-font">
              {toPersianNumber(rasmioData.registrationNumber)}
            </span>
          </div>
          <Separator />
          
          <div className="flex justify-between py-2">
            <span className="text-text-secondary">تاریخ ثبت:</span>
            <span className="text-text-primary">
              {toPersianNumber(rasmioData.registrationDate)}
            </span>
          </div>
          <Separator />
          
          <div className="flex justify-between py-2">
            <span className="text-text-secondary">سرمایه:</span>
            <span className="text-text-primary">
              {toPersianNumber(rasmioData.capital)}
            </span>
          </div>
          <Separator />
          
          <div className="flex justify-between py-2">
            <span className="text-text-secondary">وضعیت فعالیت:</span>
            <span className="text-text-primary">
              {rasmioData.activityStatus}
            </span>
          </div>
          <Separator />
        </div>

        {/* Board Members */}
        <div className="py-2">
          <span className="text-text-secondary block mb-3 font-medium">
            اعضای هیئت مدیره:
          </span>
          <div className="space-y-2">
            {rasmioData.boardMembers.map((member: string, index: number) => (
              <p key={index} className="text-sm text-text-primary pr-2">
                • {member}
              </p>
            ))}
          </div>
        </div>

        {/* Shareholders */}
        {rasmioData.shareholders && (
          <>
            <Separator />
            <div className="py-2">
              <span className="text-text-secondary block mb-3 font-medium">
                ساختار سهامداری:
              </span>
              <div className="space-y-2">
                {rasmioData.shareholders.map((shareholder: any, index: number) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-text-primary">{shareholder.name}</span>
                    <span className="text-text-secondary number-font">
                      {toPersianNumber(shareholder.percentage)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Last Update */}
        <div className="pt-4 border-t">
          <div className="flex justify-between items-center text-xs text-text-secondary mb-3">
            <span>آخرین به‌روزرسانی:</span>
            <span>{toPersianNumber(rasmioData.lastUpdate)}</span>
          </div>
          
          <Button 
            onClick={handleRefreshData}
            className="w-full btn-hover"
            variant="outline"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ml-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی اطلاعات'}
          </Button>
        </div>

        {/* API Status Indicator */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">وضعیت اتصال Rasmio:</span>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
              <span className="text-sm text-green-700">متصل</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
