import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SettingsProvider } from "@/hooks/use-settings";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/features/dashboard/pages/Dashboard";
import Orders from "@/features/customers/pages/Orders";
import Customers from "@/features/customers/pages/Customers";
import Production from "@/features/production/pages/Production";
import Inventory from "@/features/inventory/pages/Inventory";
import Traceability from "@/features/traceability/pages/Traceability";
import Settings from "@/features/catalog/pages/Settings";
import Calculator from "@/pages/Calculator";
import NotFound from "@/pages/not-found";
import BatchDetail from "@/features/production/pages/BatchDetail";
import LotDetail from "@/features/inventory/pages/LotDetail";
import Login from "@/pages/Login";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
    <h2 className="text-2xl font-mono font-bold mb-2">{title}</h2>
    <p>This module is under construction.</p>
  </div>
);

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    setLocation('/login');
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route>
        <ProtectedRoute>
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/orders" component={Orders} />
              <Route path="/customers" component={Customers} />
              <Route path="/production" component={Production} />
              <Route path="/batches/:id" component={BatchDetail} />
              <Route path="/lots/:id" component={LotDetail} />
              <Route path="/inventory" component={Inventory} />
              <Route path="/products"><Redirect to="/inventory" /></Route>
              <Route path="/traceability" component={Traceability} />
              <Route path="/quality">
                <Placeholder title="Quality Control" />
              </Route>
              <Route path="/calculator" component={Calculator} />
              <Route path="/settings" component={Settings} />
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
            <Router />
          </TooltipProvider>
        </SettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
