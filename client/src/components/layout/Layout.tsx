import { Sidebar, MobileNav } from './Sidebar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background w-full overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 h-full">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 border-b bg-card flex items-center px-4 justify-between">
          <div className="font-mono font-bold text-lg">BATCH<span className="text-primary">MASTER</span></div>
          <MobileNav />
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
