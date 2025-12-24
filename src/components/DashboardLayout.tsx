import { ReactNode, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardLayoutProps {
  children: ReactNode;
  userName?: string;
  companyName?: string;
}

export function DashboardLayout({ children, userName, companyName }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <AppSidebar userName={userName} companyName={companyName} />
      )}

      {/* Mobile Header & Sidebar */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-b border-border z-50 flex items-center justify-between px-4">
          <span className="text-lg font-display font-bold text-foreground">Fusion AI</span>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <AppSidebar 
                userName={userName} 
                companyName={companyName} 
                onNavigate={() => setSidebarOpen(false)}
                isMobile
              />
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${isMobile ? 'pt-14 px-4 pb-6' : 'ml-64 p-8'}`}>
        {children}
      </main>
    </div>
  );
}
