import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PreRegistroWizard } from "@/components/form/PreRegistroWizard";
import { BrandMark } from "@/components/common/BrandMark";
import LoginPage from "@/pages/LoginPage";
import ConsolaPage from "@/pages/ConsolaPage";
import PreRegistroDetallePage from "@/pages/PreRegistroDetallePage";

function PatientLayout() {
  return (
    <div className="bg-app-gradient flex min-h-screen flex-col">
      <header className="px-4 pt-6 sm:pt-8">
        <div className="mx-auto flex max-w-md items-center justify-center">
          <BrandMark />
        </div>
      </header>

      <main className="flex-1">
        <PreRegistroWizard />
      </main>

      <footer className="px-4 pb-8">
        <p className="mx-auto flex max-w-md items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0 text-brand-700" aria-hidden="true" />
          Tus datos se resguardan de forma confidencial y solo se usan para tu atención médica.
        </p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PatientLayout />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/consola" element={<ConsolaPage />} />
            <Route path="/consola/:id" element={<PreRegistroDetallePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
