import { Home, FolderOpen, Settings, Shield, LogOut } from 'lucide-react';
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
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => navigate('/dashboard')}
                  className={isActive('/dashboard') ? 'bg-sidebar-accent font-medium' : ''}
                >
                  <Home className="h-4 w-4" />
                  {!isCollapsed && <span>Accueil</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {accessibleWorlds.map((world) => (
          <SidebarGroup key={world.id}>
            <SidebarGroupLabel>{world.name}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate(`/${world.code.toLowerCase()}/dossiers`)}
                    className={isActive(`/${world.code.toLowerCase()}/dossiers`) ? 'bg-sidebar-accent font-medium' : ''}
                  >
                    <FolderOpen className="h-4 w-4" />
                    {!isCollapsed && <span>Dossiers</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {isSuperAdmin() && (
          <SidebarGroup>
            <SidebarGroupLabel>Superadmin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => navigate('/superadmin/users')}
                    className={isActive('/superadmin/users') ? 'bg-sidebar-accent font-medium' : ''}
                  >
                    <Shield className="h-4 w-4" />
                    {!isCollapsed && <span>Gestion</span>}
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
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>Déconnexion</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
