import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Factory, 
  Settings, 
  Box,
  Menu,
  ShoppingCart,
  Users,
  Calculator,
  ScanSearch,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Orders', icon: ShoppingCart, href: '/orders' },
  { label: 'Customers', icon: Users, href: '/customers' },
  { label: 'Production', icon: Factory, href: '/production' },
  { label: 'Inventory', icon: Box, href: '/inventory' },
  { label: 'Tracking', icon: ScanSearch, href: '/traceability' },
  { label: 'Calculator', icon: Calculator, href: '/calculator' },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  production: 'Production',
  inventory: 'Inventory',
  readonly: 'View Only',
};

export function Sidebar({ className }: { className?: string }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const initials = user
    ? user.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  async function handleLogout() {
    await logout();
    setLocation('/login');
  }

  return (
    <div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border", className)}>
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="font-mono text-xl font-bold tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
            <Factory size={18} />
          </div>
          Clear<span className="text-sidebar-primary">trace</span>
        </h1>
        <p className="text-xs text-sidebar-foreground/60 mt-1 font-mono">v2.5</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}>
                <item.icon size={18} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold">{initials}</span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate" data-testid="text-user-name">{user?.fullName ?? '—'}</span>
            <span className="text-xs text-sidebar-foreground/60" data-testid="text-user-role">
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? ''}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="text-sidebar-foreground/60 hover:text-sidebar-foreground" data-testid="button-settings">
                <Settings size={16} />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
              onClick={handleLogout}
              data-testid="button-logout"
              title="Sign out"
            >
              <LogOut size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden">
          <Menu size={20} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
}
