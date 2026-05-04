import { Sidebar, MobileNav } from './Sidebar';
import { CommandPalette } from '@/components/CommandPalette';
import { QuickCreate } from '@/components/QuickCreate';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background w-full overflow-hidden">
      <CommandPalette />
      <div className="hidden lg:block w-64 h-full">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="lg:hidden h-14 border-b bg-card flex items-center px-4 justify-between">
          <div className="font-mono font-bold text-lg">Clear<span className="text-primary">trace</span></div>
          <div className="flex items-center gap-2">
            <QuickCreate />
            <MobileNav />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
