import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import UserProfileMenu from '@/components/UserProfileMenu';
import NotificationBell from '@/components/NotificationBell';
import AnimatedBackground from '@/components/AnimatedBackground';
import { ThemeToggle } from '@/components/ThemeToggle';
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
      <div className="flex min-h-screen w-full relative">
        <AnimatedBackground />
        <AppSidebar />

        <div className="flex-1 flex flex-col relative z-10">
          <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 shadow-sm sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="ml-2 text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Multi-World Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <NotificationBell />
              <UserProfileMenu />
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
