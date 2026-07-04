import { useState, useEffect } from "react";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import ServicesBasedForms from "@/components/services-based-forms-fixed";
import { AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function CustomerInvestmentFixed() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const companiesData = await apiRequest("GET", "/api/companies");
      setCompanies((companiesData as any[]) || []);
    } catch (error: any) {
      console.error("Error fetching companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const companyId = companies[0]?.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <MobileSidebar />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>در حال بارگیری...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <MobileSidebar />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 md:mr-72 p-4 md:p-6 fade-in">
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">ابتدا باید شرکت خود را ثبت کنید</p>
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              امور سرمایه‌گذاری (Fixed)
            </h1>
            <p className="text-text-secondary">
              خدمات و مدارک مربوط به سرمایه‌گذاری
            </p>
          </div>

          <ServicesBasedForms 
            department="investment" 
            companyId={companyId.toString()}
          />
        </main>
      </div>
    </div>
  );
}

