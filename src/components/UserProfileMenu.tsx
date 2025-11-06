import { useState, useEffect } from 'react';
import { Bell, Calendar, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const UserProfileMenu = () => {
  const { profile, logout } = useAuthStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    
    fetchNotifications();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate('/auth');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Calendar Button */}
      <Button variant="ghost" size="icon" className="relative">
        <Calendar className="h-5 w-5" />
      </Button>

      {/* Notifications */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-2">
            <h4 className="font-semibold">Notifications</h4>
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune notification
                </p>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors ${
                        !notif.read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notif.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(notif.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>

      {/* User Profile Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div>
              <p className="font-medium">{profile?.display_name || 'Utilisateur'}</p>
              <p className="text-xs text-muted-foreground font-normal">{profile?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UserProfileMenu;
