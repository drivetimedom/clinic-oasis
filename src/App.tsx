import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { ClinicProvider, useClinic } from "@/contexts/ClinicContext";
import { AppLayout } from "@/components/AppLayout";
import { SuperAdminLayout } from "@/components/SuperAdminLayout";
import Auth from "@/pages/Auth";
import ClinicSetup from "@/pages/ClinicSetup";
import Dashboard from "@/pages/Dashboard";
import Receivables from "@/pages/Receivables";
import Payables from "@/pages/Payables";
import CashFlow from "@/pages/CashFlow";
import Patients from "@/pages/Patients";
import PatientProfile from "@/pages/PatientProfile";
import Agenda from "@/pages/Agenda";
import Doctors from "@/pages/Doctors";
import Availability from "@/pages/Availability";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import ResetPassword from "@/pages/ResetPassword";
import ProcedureCategories from "@/pages/ProcedureCategories";
import ProceduresPage from "@/pages/Procedures";
import Protocols from "@/pages/Protocols";
import StockProducts from "@/pages/StockProducts";
import StockMovements from "@/pages/StockMovements";
import StockBatches from "@/pages/StockBatches";
import Billing from "@/pages/Billing";
import BillingPayments from "@/pages/BillingPayments";
import Commissions from "@/pages/Commissions";
import FinancialReports from "@/pages/FinancialReports";
import ConsentTemplates from "@/pages/ConsentTemplates";
import ConsentRequests from "@/pages/ConsentRequests";
import ConsentSignatures from "@/pages/ConsentSignatures";
import ConsentSign from "@/pages/ConsentSign";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminClinics from "@/pages/admin/AdminClinics";
import AdminUsers from "@/pages/admin/AdminUsers";
import ActivityLog from "@/pages/admin/ActivityLog";
const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 rounded-lg bg-primary animate-pulse" />
    </div>
  );
}

function ProtectedApp() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <ClinicProvider>
      <Outlet />
    </ClinicProvider>
  );
}

function SuperAdminGuard() {
  const { isSuperAdmin, isLoading } = useSuperAdmin();
  if (isLoading) return <LoadingScreen />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return <SuperAdminLayout />;
}

function ClinicBlockedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <span className="text-destructive text-2xl">⚠</span>
        </div>
        <h1 className="text-2xl font-bold">Clínica Suspensa</h1>
        <p className="text-muted-foreground">
          O acesso a esta clínica foi suspenso. Entre em contato com o suporte da plataforma para mais informações.
        </p>
      </div>
    </div>
  );
}

function ClinicGuard() {
  const { currentClinic, isLoading, clinics, isSuperAdminMode } = useClinic();
  const { isSuperAdmin, isLoading: saLoading } = useSuperAdmin();
  if (isLoading || saLoading) return <LoadingScreen />;
  if (clinics.length === 0) {
    if (isSuperAdmin) return <Navigate to="/admin" replace />;
    return <Navigate to="/clinic-setup" replace />;
  }
  if (!currentClinic) return <LoadingScreen />;
  // Block access if clinic is suspended/blocked (unless super admin mode)
  if (currentClinic.status !== "active" && !isSuperAdminMode) {
    return <ClinicBlockedScreen />;
  }
  return <AppLayout />;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthRoute />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<ProtectedApp />}>
            <Route path="/clinic-setup" element={<ClinicSetup />} />
            {/* Super Admin Routes */}
            <Route element={<SuperAdminGuard />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/clinics" element={<AdminClinics />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/activity" element={<ActivityLog />} />
            </Route>
            {/* Clinic Routes */}
            <Route element={<ClinicGuard />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/receivables" element={<Receivables />} />
              <Route path="/payables" element={<Payables />} />
              <Route path="/cash-flow" element={<CashFlow />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/billing/payments" element={<BillingPayments />} />
              <Route path="/billing/commissions" element={<Commissions />} />
              <Route path="/billing/reports" element={<FinancialReports />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/patients/:id" element={<PatientProfile />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/doctors" element={<Doctors />} />
              <Route path="/availability" element={<Availability />} />
              <Route path="/procedures/categories" element={<ProcedureCategories />} />
              <Route path="/procedures" element={<ProceduresPage />} />
              <Route path="/procedures/protocols" element={<Protocols />} />
              <Route path="/stock/products" element={<StockProducts />} />
              <Route path="/stock/movements" element={<StockMovements />} />
              <Route path="/stock/batches" element={<StockBatches />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
