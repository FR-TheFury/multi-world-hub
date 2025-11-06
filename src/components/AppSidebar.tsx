import { Home, FolderOpen, Settings, Shield, LogOut, TrendingUp, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const AppSidebar = () => {
  const { state } = useSidebar();
  const { accessibleWorlds, isSuperAdmin, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/auth');
  };

  const isCollapsed = state === 'collapsed';
  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={isCollapsed ? 'w-14' : 'w-60'} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {!isCollapsed && <span>Navigation</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/dashboard')}
                  className={`relative transition-all duration-200 ${
                    isActive('/dashboard') 
                      ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold border-l-4 border-primary shadow-md' 
                      : 'hover:bg-accent hover:translate-x-1'
                  }`}
                >
                  <Home className={`h-5 w-5 ${isActive('/dashboard') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Accueil</span>}
                  {isActive('/dashboard') && (
                    <div className="absolute right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/dossiers')}
                  className={`relative transition-all duration-200 ${
                    isActive('/dossiers') 
                      ? 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold border-l-4 border-primary shadow-md' 
                      : 'hover:bg-accent hover:translate-x-1'
                  }`}
                >
                  <FolderOpen className={`h-5 w-5 ${isActive('/dossiers') ? 'text-primary' : ''}`} />
                  {!isCollapsed && <span>Dossiers</span>}
                  {isActive('/dossiers') && (
                    <div className="absolute right-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin() && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-destructive font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {!isCollapsed && <span>Superadmin</span>}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate('/superadmin/administration')}
                    className={`relative transition-all duration-200 ${
                      isActive('/superadmin/administration') 
                        ? 'bg-gradient-to-r from-destructive/15 to-destructive/5 text-destructive font-semibold border-l-4 border-destructive shadow-md' 
                        : 'hover:bg-accent hover:translate-x-1'
                    }`}
                  >
                    <Shield className={`h-5 w-5 ${isActive('/superadmin/administration') ? 'text-destructive' : ''}`} />
                    {!isCollapsed && <span>Administration</span>}
                    {isActive('/superadmin/administration') && (
                      <div className="absolute right-2 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate('/superadmin/analytics')}
                    className={`relative transition-all duration-200 ${
                      isActive('/superadmin/analytics') 
                        ? 'bg-gradient-to-r from-destructive/15 to-destructive/5 text-destructive font-semibold border-l-4 border-destructive shadow-md' 
                        : 'hover:bg-accent hover:translate-x-1'
                    }`}
                  >
                    <TrendingUp className={`h-5 w-5 ${isActive('/superadmin/analytics') ? 'text-destructive' : ''}`} />
                    {!isCollapsed && <span>Analytiques</span>}
                    {isActive('/superadmin/analytics') && (
                      <div className="absolute right-2 w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="hover:bg-destructive/10 hover:text-destructive transition-all duration-200 hover:translate-x-1"
            >
              <LogOut className="h-5 w-5" />
              {!isCollapsed && <span>Déconnexion</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
