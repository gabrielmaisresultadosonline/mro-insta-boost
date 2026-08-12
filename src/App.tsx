import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import CRM from "./pages/CRM";
import CRMLogin from "./pages/CRMLogin";
import AdminCentral from "./pages/AdminCentral";
import AccessGate from "./components/crm/AccessGate";
 import GoogleContactsCallback from "./pages/GoogleContactsCallback";
 import Sales from "./pages/Sales";
import SalesTutoriais from "./pages/SalesTutoriais";
import PortfolioVerification from "./pages/PortfolioVerification";
 import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ConverterVideo from "./pages/ConverterVideo";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
         <Routes>
           <Route path="/" element={<Navigate to="/vendas" replace />} />
           <Route path="/crm" element={<AccessGate><CRM /></AccessGate>} />
           <Route path="/crm/login" element={<CRMLogin />} />
           <Route path="/admincentral" element={<AdminCentral />} />
           <Route path="/administracao" element={<AdminCentral />} />
           <Route path="/vendas" element={<Sales />} />
          <Route path="/vendas/tutoriais" element={<SalesTutoriais />} />
          <Route path="/vendas/verificar-portfolio" element={<PortfolioVerification />} />
           <Route path="/google-callback" element={<GoogleContactsCallback />} />
            <Route path="/google-callback2" element={<GoogleContactsCallback />} />
            <Route path="/br/politicadeprivacidade" element={<PrivacyPolicy />} />
            <Route path="/br/termosdoservico" element={<TermsOfService />} />
          <Route path="/converter-video" element={<ConverterVideo />} />
           <Route path="*" element={<Sales />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
