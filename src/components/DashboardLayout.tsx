import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import UserProfileMenu from '@/components/UserProfileMenu';
import { useAuthStore } from '@/lib/store';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { session } = useAuthStore();
  const navigate = useNavigate();
  

  useEffect(() => {
    if (!session) {
      navigate('/auth');
    }
  }, [session, navigate]);

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card flex items-center justify-between px-6 shadow-vuexy-sm sticky top-0 z-10">
            <div className="flex items-center">
              <SidebarTrigger />
              <h1 className="ml-4 text-xl font-bold text-foreground">Multi-World Dashboard</h1>
            </div>
            <UserProfileMenu />
          </header>

          <main className="flex-1 p-6 lg:p-8 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
