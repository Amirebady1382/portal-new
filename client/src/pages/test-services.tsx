import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileSidebar from "@/components/layout/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestServices() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <MobileSidebar />
      
      <div className="flex pt-16">
        <Sidebar />
        
        <main className="flex-1 md:mr-64 p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle>تست صفحه خدمات</CardTitle>
            </CardHeader>
            <CardContent>
              <p>این یک صفحه تست است</p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
