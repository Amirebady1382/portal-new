import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SocketProvider } from "@/hooks/use-socket";
import ProtectedRoute from "@/components/layout/protected-route";
import Login from "@/pages/login";
import CustomerRegister from "@/pages/customer-register";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminCompanyView from "@/pages/admin-company-view";
import CeoDashboard from "@/pages/ceo-dashboard";
import CeoCompanyView from "@/pages/ceo-company-view";
import EmployeeDashboard from "@/pages/employee-dashboard";
import CustomerDashboard from "@/pages/customer-dashboard";
import CustomerProfile from "@/pages/customer-profile";
import CustomerInvestment from "@/pages/customer-investment-fixed";
import CustomerAdministrative from "@/pages/customer-administrative-fixed";
import CustomerServices from "@/pages/customer-services-dynamic";
import ServicesManagement from "@/pages/services-management-enhanced";
import ServiceRequestsManagement from "@/pages/service-requests-simple-clean";
import CompanyProfile from "@/pages/company-profile";
import FinancialSummary from "@/pages/financial-summary";
import InvestmentFinancialSummary from "@/pages/investment-financial-summary";
import TaxDeclarationManagement from "@/pages/tax-declaration-management";
import Profile from "@/pages/profile";
import EmployeeCompanyView from "@/pages/employee-company-view";
import Messages from "@/pages/messages";
import Companies from "@/pages/companies";
import Requests from "@/pages/requests";
import Investment from "@/pages/investment";
import Administrative from "@/pages/administrative";
import Documents from "@/pages/documents";
import BulkDownload from "@/pages/bulk-download";
import NotFound from "@/pages/not-found";
import Notifications from "@/pages/notifications";
import Reports from "@/pages/reports";
import AIAnalysis from "@/pages/ai-analysis-with-history";
import UsersPage from "@/pages/users";
import SettingsPage from "@/pages/settings";
import DocumentRequirements from "@/pages/document-requirements";
import ContractGenerator from "@/pages/contract-generator";
import ContractTemplates from "@/pages/template-manager";
import FlexibleContractGenerator from "@/pages/flexible-contract-generator";
import AIVariableManagerAdvanced from "@/pages/admin-ai-variable-manager-advanced";
import ContractVariablesManagement from "@/pages/contract-variables-management";
import InvestmentReportGeneratorEnhanced from "@/pages/investment-report-generator-enhanced";
import CompanyStatus from "@/pages/company-status";
import BaleChatPage from "@/pages/bale-chat";
import AdminContractManagement from "@/pages/admin-template-management";
import SystemHealth from "@/pages/system-health";
import ServiceRequestsWorkflow from "@/pages/service-requests-workflow";

// Debug/Test pages — routes only rendered in development mode
import TestServices from "@/pages/test-services";
import DebugServices from "@/pages/debug-services";
import TestServiceFlow from "@/pages/test-service-flow";
import DebugCreateRequirement from "@/pages/debug-create-requirement";

const isDev = import.meta.env.DEV;

function DashboardRedirect() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      switch (user.role) {
        case "admin":
          setLocation("/admin");
          break;
        case "ceo":
          setLocation("/ceo");
          break;
        case "employee":
          setLocation("/employee");
          break;
        case "customer":
          setLocation("/customer");
          break;
        default:
          setLocation("/login");
      }
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          پورتال خدمات تخصصی صندوق پژوهش و فناوری گیلان
        </h1>
        <p className="text-gray-600">در حال هدایت به داشبورد مناسب...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={CustomerRegister} />

      {/* Admin Routes */}
      <Route path="/admin">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/companies">
        <ProtectedRoute allowedRoles={["admin"]}>
          <Companies />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/requests">
        <ProtectedRoute allowedRoles={["admin"]}>
          <Requests />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/investment">
        <ProtectedRoute allowedRoles={["admin"]}>
          <Investment />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/administrative">
        <ProtectedRoute allowedRoles={["admin"]}>
          <Administrative />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/documents">
        <ProtectedRoute allowedRoles={["admin"]}>
          <Documents />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/bulk-download">
        <ProtectedRoute allowedRoles={["admin"]}>
          <BulkDownload />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/messages">
        <ProtectedRoute allowedRoles={["admin"]}>
          <Messages />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/bale-chat">
        <ProtectedRoute allowedRoles={["admin"]}>
          <BaleChatPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/notifications">
        <ProtectedRoute allowedRoles={["admin"]}>
          <Notifications />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/reports">
        <ProtectedRoute allowedRoles={["admin"]}>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/ai-analysis">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AIAnalysis />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/investment-report-generator">
        <ProtectedRoute allowedRoles={["admin", "employee", "ceo"]}>
          <InvestmentReportGeneratorEnhanced />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute allowedRoles={["admin"]}>
          <UsersPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute allowedRoles={["admin"]}>
          <SettingsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/system-health">
        <ProtectedRoute allowedRoles={["admin"]}>
          <SystemHealth />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/contract-management">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminContractManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/profile">
        <ProtectedRoute allowedRoles={["admin"]}>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/contract-generator">
        <ProtectedRoute allowedRoles={["admin"]}>
          <ContractGenerator />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/contract-templates">
        <ProtectedRoute allowedRoles={["admin"]}>
          <ContractTemplates />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/flexible-contract-generator">
        <ProtectedRoute allowedRoles={["admin"]}>
          <FlexibleContractGenerator />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/ai-variable-manager">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AIVariableManagerAdvanced />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/contract-variables">
        <ProtectedRoute allowedRoles={["admin"]}>
          <ContractVariablesManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/companies/:id/financial-summary">
        <ProtectedRoute allowedRoles={["admin"]}>
          <FinancialSummary />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/companies/:id">
        <ProtectedRoute allowedRoles={["admin"]}>
          <AdminCompanyView />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/services-management">
        <ProtectedRoute allowedRoles={["admin"]}>
          <ServicesManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/service-requests-management">
        <ProtectedRoute allowedRoles={["admin"]}>
          <ServiceRequestsManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/service-requests-workflow">
        <ProtectedRoute allowedRoles={["admin", "employee", "ceo"]}>
          <ServiceRequestsWorkflow />
        </ProtectedRoute>
      </Route>
      {/* Debug/Test routes — only available in development mode */}
      <Route path="/admin/test-services">
        <ProtectedRoute allowedRoles={["admin"]}>
          <TestServices />
        </ProtectedRoute>
      </Route>
      {isDev && (
        <Route path="/admin/debug-services">
          <ProtectedRoute allowedRoles={["admin"]}>
            <DebugServices />
          </ProtectedRoute>
        </Route>
      )}
      {isDev && (
        <Route path="/admin/test-service-flow">
          <ProtectedRoute allowedRoles={["admin", "customer"]}>
            <TestServiceFlow />
          </ProtectedRoute>
        </Route>
      )}
      {isDev && (
        <Route path="/admin/debug-create-requirement">
          <ProtectedRoute allowedRoles={["admin", "employee"]}>
            <DebugCreateRequirement />
          </ProtectedRoute>
        </Route>
      )}

      {/* CEO Routes */}
      <Route path="/ceo">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <CeoDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/companies">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <Companies />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/requests">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <Requests />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/investment">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <Investment />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/administrative">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <Administrative />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/documents">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <Documents />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/bulk-download">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <BulkDownload />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/messages">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <Messages />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/bale-chat">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <BaleChatPage />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/reports">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/ai-analysis">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <AIAnalysis />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/profile">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/investment-overview">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <Investment />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/pending-approvals">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <Requests />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/performance">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/strategic-planning">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/companies/:id/financial-summary">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <FinancialSummary />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/companies/:id">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <CeoCompanyView />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/notifications">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <Notifications />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/company-status">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <CompanyStatus />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/investment-report-generator">
        <ProtectedRoute allowedRoles={["admin", "employee", "ceo"]}>
          <InvestmentReportGeneratorEnhanced />
        </ProtectedRoute>
      </Route>

      {/* Employee Routes */}
      <Route path="/employee">
        <ProtectedRoute allowedRoles={["employee"]}>
          <EmployeeDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/companies">
        <ProtectedRoute allowedRoles={["employee"]}>
          <Companies />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/requests">
        <ProtectedRoute allowedRoles={["employee"]}>
          <Requests />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/investment">
        <ProtectedRoute allowedRoles={["employee"]}>
          <Investment />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/administrative">
        <ProtectedRoute allowedRoles={["employee"]}>
          <Administrative />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/documents">
        <ProtectedRoute allowedRoles={["employee"]}>
          <Documents />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/document-requirements">
        <ProtectedRoute allowedRoles={["admin", "employee"]}>
          <DocumentRequirements />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/document-requirements">
        <ProtectedRoute allowedRoles={["employee"]}>
          <DocumentRequirements />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/services-management">
        <ProtectedRoute allowedRoles={["admin", "employee"]}>
          <ServicesManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/service-requests-management">
        <ProtectedRoute allowedRoles={["admin", "employee"]}>
          <ServiceRequestsManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/service-requests-workflow">
        <ProtectedRoute allowedRoles={["admin", "employee", "ceo"]}>
          <ServiceRequestsWorkflow />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/contract-generator">
        <ProtectedRoute allowedRoles={["employee"]}>
          <ContractGenerator />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/contract-templates">
        <ProtectedRoute allowedRoles={["employee"]}>
          <ContractTemplates />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/flexible-contract-generator">
        <ProtectedRoute allowedRoles={["employee"]}>
          <FlexibleContractGenerator />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/bulk-download">
        <ProtectedRoute allowedRoles={["employee"]}>
          <BulkDownload />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/messages">
        <ProtectedRoute allowedRoles={["employee"]}>
          <Messages />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/bale-chat">
        <ProtectedRoute allowedRoles={["employee"]}>
          <BaleChatPage />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/notifications">
        <ProtectedRoute allowedRoles={["employee"]}>
          <Notifications />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/reports">
        <ProtectedRoute allowedRoles={["employee"]}>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/company-status">
        <ProtectedRoute allowedRoles={["employee"]}>
          <CompanyStatus />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/ai-analysis">
        <ProtectedRoute allowedRoles={["employee"]}>
          <AIAnalysis />
        </ProtectedRoute>
      </Route>
      {/* Settings route حذف شده برای جلوگیری از دسترسی عمومی */}
      <Route path="/employee/profile">
        <ProtectedRoute allowedRoles={["employee"]}>
          <Profile />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/financial-summary">
        <ProtectedRoute allowedRoles={["employee", "admin"]}>
          <InvestmentFinancialSummary />
        </ProtectedRoute>
      </Route>
      <Route path="/admin/financial-summary">
        <ProtectedRoute allowedRoles={["admin"]}>
          <InvestmentFinancialSummary />
        </ProtectedRoute>
      </Route>
      <Route path="/ceo/financial-summary">
        <ProtectedRoute allowedRoles={["ceo"]}>
          <InvestmentFinancialSummary />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/companies/:id/old-financial-summary">
        <ProtectedRoute allowedRoles={["employee"]}>
          <FinancialSummary />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/companies/:id/financial-summary">
        <ProtectedRoute allowedRoles={["employee"]}>
          <FinancialSummary />
        </ProtectedRoute>
      </Route>
      <Route path="/employee/companies/:id">
        <ProtectedRoute allowedRoles={["employee"]}>
          <EmployeeCompanyView />
        </ProtectedRoute>
      </Route>      <Route path="/employee/investment-report-generator">
        <ProtectedRoute allowedRoles={["admin", "employee", "ceo"]}>
          <InvestmentReportGeneratorEnhanced />
        </ProtectedRoute>
      </Route>

      {/* Customer Routes */}
      <Route path="/customer">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/customer/services">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerServices />
        </ProtectedRoute>
      </Route>
      {isDev && (
        <Route path="/customer/test-service-flow">
          <ProtectedRoute allowedRoles={["customer"]}>
            <TestServiceFlow />
          </ProtectedRoute>
        </Route>
      )}
      <Route path="/customer/tax-declaration">
        <ProtectedRoute allowedRoles={["customer"]}>
          <TaxDeclarationManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/customer/profile">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerProfile />
        </ProtectedRoute>
      </Route>
      <Route path="/customer/investment">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerInvestment />
        </ProtectedRoute>
      </Route>
      <Route path="/customer/administrative">
        <ProtectedRoute allowedRoles={["customer"]}>
          <CustomerAdministrative />
        </ProtectedRoute>
      </Route>
      <Route path="/customer/messages">
        <ProtectedRoute allowedRoles={["customer"]}>
          <Messages />
        </ProtectedRoute>
      </Route>
      <Route path="/customer/bale-chat">
        <ProtectedRoute allowedRoles={["customer"]}>
          <BaleChatPage />
        </ProtectedRoute>
      </Route>
      {/* Settings route حذف شده برای جلوگیری از دسترسی عمومی */}

      <Route path="/">
        <ProtectedRoute allowedRoles={["admin", "employee", "customer"]}>
          <DashboardRedirect />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;