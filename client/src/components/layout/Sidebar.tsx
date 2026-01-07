import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Package, 
  Factory, 
  ClipboardCheck, 
  History, 
  Settings, 
  Box,
  Menu,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { label: 'Orders', icon: ShoppingCart, href: '/orders' },
  { label: 'Production', icon: Factory, href: '/production' },
  { label: 'Inventory', icon: Box, href: '/inventory' },
  { label: 'Products & BOM', icon: Package, href: '/products' },
  { label: 'Traceability', icon: History, href: '/traceability' },
  { label: 'Quality Control', icon: ClipboardCheck, href: '/quality' },
];

export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();

  return (
    <div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border", className)}>
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="font-mono text-xl font-bold tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
            <Factory size={18} />
          </div>
          BATCH<span className="text-sidebar-primary">MASTER</span>
        </h1>
        <p className="text-xs text-sidebar-foreground/60 mt-1 font-mono">v1.0.0-PROD</p>
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
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-xs font-bold">JD</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">John Doe</span>
            <span className="text-xs text-sidebar-foreground/60">Prod. Manager</span>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <Settings size={16} />
          </Button>
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
