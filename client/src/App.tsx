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
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
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

  // Show site password form if not verified
  if (!isSitePasswordVerified) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <SitePasswordForm onPasswordVerified={verifySitePassword} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Show normal app flow if site password is verified
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AuthGuard>
            <Router />
          </AuthGuard>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
