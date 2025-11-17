import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { BusinessSwitcher } from "@/components/business-switcher";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Customers from "@/pages/customers";
import Conversations from "@/pages/conversations";
import Products from "@/pages/products";
import Orders from "@/pages/orders";
import Automations from "@/pages/automations";
import Templates from "@/pages/templates";
import Broadcasts from "@/pages/broadcasts";
import Analytics from "@/pages/analytics";
import WhatsAppTesting from "@/pages/whatsapp-testing";
import WorkflowBuilder from "@/pages/workflow-builder";
import CustomerJourney from "@/pages/customer-journey";
import type { Business } from "@shared/schema";

function Router({ businessId }: { businessId: string }) {
  return (
    <Switch>
      <Route path="/">
        <Dashboard businessId={businessId} />
      </Route>
      <Route path="/customers">
        <Customers businessId={businessId} />
      </Route>
      <Route path="/conversations">
        <Conversations businessId={businessId} />
      </Route>
      <Route path="/whatsapp-testing">
        <WhatsAppTesting businessId={businessId} />
      </Route>
      <Route path="/products">
        <Products businessId={businessId} />
      </Route>
      <Route path="/orders">
        <Orders businessId={businessId} />
      </Route>
      <Route path="/automations">
        <Automations businessId={businessId} />
      </Route>
      <Route path="/templates">
        <Templates businessId={businessId} />
      </Route>
      <Route path="/broadcasts">
        <Broadcasts businessId={businessId} />
      </Route>
      <Route path="/analytics">
        <Analytics businessId={businessId} />
      </Route>
      <Route path="/workflow-builder/:id?">
        <WorkflowBuilder businessId={businessId} />
      </Route>
      <Route path="/customer-journey/:customerId">
        <CustomerJourney businessId={businessId} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  const { data: businesses } = useQuery<Business[]>({
    queryKey: ["/api/businesses"],
  });

  useEffect(() => {
    if (businesses && businesses.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between gap-4 p-4 border-b bg-background">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              {businesses && businesses.length > 0 && (
                <BusinessSwitcher
                  businesses={businesses}
                  selectedBusinessId={selectedBusinessId}
                  onBusinessChange={setSelectedBusinessId}
                />
              )}
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6 bg-background">
            <Router businessId={selectedBusinessId || ""} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
