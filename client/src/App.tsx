import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout/Layout";
import Dashboard from "@/pages/Dashboard";
import Orders from "@/pages/Orders";
import Customers from "@/pages/Customers";
import Production from "@/pages/Production";
import Inventory from "@/pages/Inventory";
import Traceability from "@/pages/Traceability";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

// Placeholder pages for routes that aren't built yet
const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
    <h2 className="text-2xl font-mono font-bold mb-2">{title}</h2>
    <p>This module is under construction.</p>
  </div>
);

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/orders" component={Orders} />
        <Route path="/customers" component={Customers} />
        <Route path="/production" component={Production} />
        <Route path="/inventory" component={Inventory} />
        <Route path="/products"><Redirect to="/inventory" /></Route>
        <Route path="/traceability" component={Traceability} />
        <Route path="/quality">
          <Placeholder title="Quality Control" />
        </Route>
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
