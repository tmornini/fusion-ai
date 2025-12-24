import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';

interface DashboardLayoutProps {
  children: ReactNode;
  userName?: string;
  companyName?: string;
}

export function DashboardLayout({ children, userName, companyName }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar userName={userName} companyName={companyName} />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
