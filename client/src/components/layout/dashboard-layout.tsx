import Header from "./header";
import Sidebar from "./sidebar";
import MobileSidebar from "./mobile-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50/50" dir="rtl">
      <Header />
      <MobileSidebar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 min-w-0 md:mr-72 p-4 pt-4 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
