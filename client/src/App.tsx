import { Switch, Route, useLocation } from "wouter";
import { useMemo } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./components/auth/AuthContext";
import { AuthGuard } from "./components/auth/AuthGuard";
import { Navigation } from "./components/Navigation";
import GnosisLog from "./pages/gnosis-log";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import Rooms from "./pages/rooms";
import RoomChat from "./pages/room-chat";
import Mission from "./pages/Mission";
import Philosophy from "./pages/Philosophy";
import MathematicalFoundations from "./pages/MathematicalFoundations";
import Impact from "./pages/Impact";
import Glossary from "./pages/Glossary";
import AletheianMission from "./pages/AletheianMission";
import NotFound from "@/pages/not-found";

function PublicRouter() {
  return (
    <div>
      <Navigation />
      <Switch>
        <Route path="/mission" component={Mission} />
        <Route path="/philosophy" component={Philosophy} />
        <Route path="/mathematical-foundations" component={MathematicalFoundations} />
        <Route path="/impact" component={Impact} />
        <Route path="/glossary" component={Glossary} />
        <Route path="/aletheian-mission" component={AletheianMission} />
        <Route path="/" component={Mission} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function SanctuaryRouter() {
  return (
    <div>
      <Navigation />
      <Switch>
        <Route path="/mission" component={Mission} />
        <Route path="/philosophy" component={Philosophy} />
        <Route path="/mathematical-foundations" component={MathematicalFoundations} />
        <Route path="/impact" component={Impact} />
        <Route path="/glossary" component={Glossary} />
        <Route path="/aletheian-mission" component={AletheianMission} />
        <Route path="/sanctuary" component={GnosisLog} />
        <Route path="/rooms/:roomId" component={RoomChat} />
        <Route path="/rooms" component={Rooms} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/" component={GnosisLog} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  const [currentPath] = useLocation();

  // Determine if user is accessing sanctuary routes
  const isSanctuaryRoute = useMemo(() => {
    return currentPath.startsWith('/sanctuary') || 
           currentPath.startsWith('/dashboard') || 
           currentPath.startsWith('/admin') ||
           currentPath.startsWith('/rooms');
  }, [currentPath]);

  // Direct access to all routes - no password required
  if (isSanctuaryRoute) {
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

  // Public pages (mission, philosophy, etc.)
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
