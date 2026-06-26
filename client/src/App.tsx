import { Switch, Route, Redirect, Link } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { SettingsProvider } from "@/hooks/use-settings";
import { AuthProvider, useAuth, usePermissions } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/features/dashboard/pages/Dashboard";
import Orders from "@/features/customers/pages/Orders";
import Forecast from "@/features/forecast/pages/Forecast";
import ProductionYtd from "@/features/reports/pages/ProductionYtd";
import Customers from "@/features/customers/pages/Customers";
import Production from "@/features/production/pages/Production";
import Inventory from "@/features/inventory/pages/Inventory";
import Traceability from "@/features/traceability/pages/Traceability";
import Settings from "@/features/catalog/pages/Settings";
import Calculator from "@/pages/Calculator";
import NotFound from "@/pages/not-found";
import BatchDetail from "@/features/production/pages/BatchDetail";
import BatchTimeline from "@/features/production/pages/BatchTimeline";
import LotDetail from "@/features/inventory/pages/LotDetail";
import Login from "@/pages/Login";
import { Loader2, ShieldOff } from "lucide-react";
import type { ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldOff className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground max-w-sm">
          You don't have permission to view this page. Contact your administrator if you believe this is an error.
        </p>
      </div>
      <Link href="/">
        <Button variant="outline">← Back to Dashboard</Button>
      </Link>
    </div>
  );
}

function RequirePermission({ perm, children }: { perm: string; children: ReactNode }) {
  const { hasPermission } = usePermissions();
  if (!hasPermission(perm)) return <AccessDenied />;
  return <>{children}</>;
}

function ForbiddenToastBridge() {
  const { toast } = useToast();
  useEffect(() => {
    let lastShownAt = 0;
    function onForbidden() {
      const now = Date.now();
      if (now - lastShownAt < 1500) return;
      lastShownAt = now;
      toast({
        title: "Permission denied",
        description: "You don't have permission to do this.",
        variant: "destructive",
      });
    }
    window.addEventListener("api:forbidden", onForbidden);
    return () => window.removeEventListener("api:forbidden", onForbidden);
  }, [toast]);
  return null;
}

function PermissionsChangedBridge() {
  const { toast } = useToast();
  useEffect(() => {
    function onPermissionsChanged() {
      toast({
        title: "Session expired",
        description: "Your permissions changed. Please log in again.",
        variant: "destructive",
      });
    }
    window.addEventListener("api:permissions_changed", onPermissionsChanged);
    return () => window.removeEventListener("api:permissions_changed", onPermissionsChanged);
  }, [toast]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <ProtectedRoute>
          <Layout>
            <Switch>
              <Route path="/">
                <RequirePermission perm="dashboard.view"><Dashboard /></RequirePermission>
              </Route>
              <Route path="/orders">
                <RequirePermission perm="orders.view"><Orders /></RequirePermission>
              </Route>
              <Route path="/forecast">
                <RequirePermission perm="orders.view"><Forecast /></RequirePermission>
              </Route>
              <Route path="/reports/production">
                <RequirePermission perm="reports.view"><ProductionYtd /></RequirePermission>
              </Route>
              <Route path="/customers">
                <RequirePermission perm="customers.view"><Customers /></RequirePermission>
              </Route>
              <Route path="/production">
                <RequirePermission perm="production.view"><Production /></RequirePermission>
              </Route>
              <Route path="/batches/:id/timeline">
                <RequirePermission perm="production.view"><BatchTimeline /></RequirePermission>
              </Route>
              <Route path="/batches/:id">
                <RequirePermission perm="production.view"><BatchDetail /></RequirePermission>
              </Route>
              <Route path="/lots/:id">
                <RequirePermission perm="inventory.view"><LotDetail /></RequirePermission>
              </Route>
              <Route path="/inventory">
                <RequirePermission perm="inventory.view"><Inventory /></RequirePermission>
              </Route>
              <Route path="/products"><Redirect to="/inventory" /></Route>
              <Route path="/traceability">
                <RequirePermission perm="traceability.view"><Traceability /></RequirePermission>
              </Route>
              <Route path="/calculator" component={Calculator} />
              <Route path="/settings">
                <RequirePermission perm="settings.view"><Settings /></RequirePermission>
              </Route>
              <Route path="/labels"><Redirect to="/settings?tab=labels" /></Route>
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SettingsProvider>
          <TooltipProvider>
            <Toaster />
            <ForbiddenToastBridge />
            <PermissionsChangedBridge />
            <Router />
          </TooltipProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
