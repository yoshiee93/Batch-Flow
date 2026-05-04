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
        <Button
          size="icon"
          variant={isSidebar ? "ghost" : "default"}
          className={isSidebar
            ? "h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground"
            : "h-9 w-9 rounded-full shadow-md"
          }
          data-testid="button-quick-create"
          title="Quick create"
        >
          <Plus size={isSidebar ? 16 : 18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isSidebar ? "end" : "start"} sideOffset={8}>
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
