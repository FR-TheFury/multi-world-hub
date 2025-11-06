import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import DashboardLayout from "./components/DashboardLayout";
import Users from "./pages/superadmin/Users";
import Administration from "./pages/superadmin/Administration";
import Analytics from "./pages/superadmin/Analytics";
import Dossiers from "./pages/world/Dossiers";
import AllDossiers from "./pages/AllDossiers";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Auth />} />
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/dossiers" element={<DashboardLayout><AllDossiers /></DashboardLayout>} />
          <Route path="/superadmin/users" element={<DashboardLayout><Users /></DashboardLayout>} />
          <Route path="/superadmin/administration" element={<DashboardLayout><Administration /></DashboardLayout>} />
          <Route path="/superadmin/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/:worldCode/dossiers" element={<DashboardLayout><Dossiers /></DashboardLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
