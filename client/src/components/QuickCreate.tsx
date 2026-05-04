import { useLocation } from "wouter";
import { Plus, Factory, Package, ShoppingCart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/contexts/AuthContext";

const ACTIONS = [
  { label: "New Batch", icon: Factory, href: "/production?action=create", roles: ["admin", "production"] },
  { label: "Receive Stock", icon: Package, href: "/inventory?action=receive", roles: ["admin", "inventory"] },
  { label: "New Order", icon: ShoppingCart, href: "/orders?action=create", roles: ["admin"] },
  { label: "New Customer", icon: Users, href: "/customers?action=create", roles: ["admin"] },
] as const;

export function QuickCreate({ variant = "default" }: { variant?: "default" | "sidebar" }) {
  const [, navigate] = useLocation();
  const { role } = useRole();

  const visible = ACTIONS.filter(a => (a.roles as readonly string[]).includes(role));
  if (visible.length === 0) return null;

  const isSidebar = variant === "sidebar";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isSidebar ? (
          <Button
            variant="default"
            className="w-full justify-start gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            data-testid="button-quick-create"
          >
            <Plus size={16} />
            Quick Create
          </Button>
        ) : (
          <Button
            size="icon"
            variant="default"
            className="h-9 w-9 rounded-full shadow-md"
            data-testid="button-quick-create"
            title="Quick create"
          >
            <Plus size={18} />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8}>
        {visible.map((action) => (
          <DropdownMenuItem
            key={action.href}
            onClick={() => navigate(action.href)}
            className="cursor-pointer gap-2"
            data-testid={`quick-create-${action.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <action.icon size={16} className="text-muted-foreground" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
