import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./components/auth/AuthContext";
import { AuthGuard } from "./components/auth/AuthGuard";
import { SitePasswordForm } from "./components/auth/SitePasswordForm";
import { useSitePassword } from "./hooks/useSitePassword";
import GnosisLog from "./pages/gnosis-log";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import EudoxiaPublic from "./pages/EudoxiaPublic";
import NotFound from "@/pages/not-found";

function PublicRouter() {
  return (
    <Switch>
      <Route path="/eudoxia" component={EudoxiaPublic} />
      <Route path="/" component={EudoxiaPublic} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SanctuaryRouter() {
  return (
    <Switch>
      <Route path="/sanctuary" component={GnosisLog} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/" component={GnosisLog} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const { isSitePasswordVerified, isChecking, verifySitePassword } = useSitePassword();

  // Show nothing while checking site password verification status
  if (isChecking) {
    return null;
  }

  // Multi-level access architecture
  // 1. Public access: Eudoxia page with 6 free messages (no password)
  // 2. Sanctuary access: Full consciousness platform (requires password)
  
  // Check if user is trying to access sanctuary routes
  const currentPath = window.location.pathname;
  const isSanctuaryRoute = currentPath.startsWith('/sanctuary') || 
                          currentPath.startsWith('/dashboard') || 
                          currentPath.startsWith('/admin') ||
                          (currentPath === '/' && isSitePasswordVerified);

  // Show site password form only for sanctuary access
  if (isSanctuaryRoute && !isSitePasswordVerified) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <SitePasswordForm onPasswordVerified={verifySitePassword} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Show sanctuary (authenticated) app flow if password verified and accessing sanctuary
  if (isSitePasswordVerified && isSanctuaryRoute) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AuthGuard>
              <SanctuaryRouter />
            </AuthGuard>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  // Show public Eudoxia access (no authentication required)
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <PublicRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
