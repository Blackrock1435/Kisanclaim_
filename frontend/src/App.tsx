import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Spinner } from "./components/ui";
import PublicLayout from "./layouts/PublicLayout";
import AppLayout from "./layouts/AppLayout";
import Landing from "./pages/Landing";
import { Forgot, Login, Register, OfficerLogin } from "./pages/Auth";
import { Privacy, Terms, Verify } from "./pages/Legal";
import Dashboard from "./pages/Dashboard";
import Fields from "./pages/Fields";
import ClaimWizard from "./pages/ClaimWizard";
import ClaimsList from "./pages/ClaimsList";
import ClaimDetail from "./pages/ClaimDetail";
import { AdminAudit, AdminUsers } from "./pages/Admin";
import AdminIntegrations from "./pages/AdminIntegrations";
import InsurerDashboard from "./pages/InsurerDashboard";
import DigipinExplorer from "./pages/DigipinExplorer";

import LiveGeoCamera from "./pages/LiveGeoCamera";
import SentinelTwin from "./pages/SentinelTwin";
import AgentAnalysis from "./pages/AgentAnalysis";
import EvidenceGraphPage from "./pages/EvidenceGraphPage";
import DisasterMap from "./pages/DisasterMap";
import InsuranceAssessmentList from "./pages/InsuranceAssessmentList";
import ClaimAssessmentDetail from "./pages/ClaimAssessmentDetail";
import AdminInsuranceApproval from "./pages/AdminInsuranceApproval";

function Protected({ roles }: { roles?: string[] }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="flex h-screen items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />; // UI guard only; the API enforces roles too
  return <Outlet />;
}
const NotFound = () => <div className="mx-auto max-w-lg px-4 py-24 text-center"><h1 className="text-4xl font-extrabold text-forest-deep">Page not found</h1><p className="mt-2 text-muted">Check the address or go back to the home page.</p></div>;

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="officer-login" element={<OfficerLogin />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<Forgot />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="verify/:code" element={<Verify />} />
        <Route path="verify-report/:token" element={<Verify />} />
        <Route path="digipin-demo" element={<DigipinExplorer />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="app" element={<Protected />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="claims" element={<ClaimsList />} />
          <Route path="claims/:id" element={<ClaimDetail />} />
          <Route path="disaster-map" element={<DisasterMap />} />
          <Route path="insurance" element={<InsurerDashboard />} />
          <Route path="digipin" element={<DigipinExplorer />} />
          <Route path="geocamera" element={<LiveGeoCamera />} />
          <Route path="satellite-twin" element={<SentinelTwin />} />
          <Route path="agent-analysis" element={<AgentAnalysis />} />
          <Route path="evidence-graph" element={<EvidenceGraphPage />} />
          <Route element={<Protected roles={["officer", "admin"]} />}>
            <Route path="insurance-assessment" element={<InsuranceAssessmentList />} />
            <Route path="insurance-assessment/:claimId" element={<ClaimAssessmentDetail />} />
          </Route>
          <Route element={<Protected roles={["farmer"]} />}>
            <Route path="fields" element={<Fields />} />
            <Route path="claims/new" element={<ClaimWizard />} />
            <Route path="claims/:id/edit" element={<ClaimWizard />} />
          </Route>
          <Route element={<Protected roles={["admin"]} />}>
            <Route path="admin/insurance-approval" element={<AdminInsuranceApproval />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/integrations" element={<AdminIntegrations />} />
            <Route path="admin/audit" element={<AdminAudit />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
