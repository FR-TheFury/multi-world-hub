import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const navigate = useNavigate();
  const { setUser, setSession, setProfile, setRoles, setAccessibleWorlds } = useAuthStore();

  useEffect(() => {
    // Realtime channels for instant updates
    let rolesChannel: any | null = null;
    let worldAccessChannel: any | null = null;

    const subscribeRealtime = (userId: string) => {
      // Roles changes
      rolesChannel = supabase
        .channel(`roles-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_roles', filter: `user_id=eq.${userId}` },
          () => {
            // Refetch roles & worlds instantly
            fetchUserData(userId);
          }
        )
        .subscribe();

      // World access changes
      worldAccessChannel = supabase
        .channel(`world-access-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_world_access', filter: `user_id=eq.${userId}` },
          () => {
            fetchUserData(userId);
          }
        )
        .subscribe();
    };

    const cleanupRealtime = () => {
      if (rolesChannel) supabase.removeChannel(rolesChannel);
      if (worldAccessChannel) supabase.removeChannel(worldAccessChannel);
      rolesChannel = null;
      worldAccessChannel = null;
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
            // Subscribe to realtime updates for current user
            cleanupRealtime();
            subscribeRealtime(session.user.id);
          }, 0);
        } else {
          cleanupRealtime();
          setProfile(null);
          setRoles([]);
          setAccessibleWorlds([]);
        }
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
        // Ensure realtime is active on refresh
        cleanupRealtime();
        subscribeRealtime(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
      cleanupRealtime();
    };
  }, [setUser, setSession]);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        setProfile(profile);
      }

      // Fetch roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', userId);

      if (userRoles) {
        setRoles(userRoles.map(ur => ({ role: (ur as any).roles.name })));
      }

      // Fetch accessible worlds
      const { data: worldAccess } = await supabase
        .from('user_world_access')
        .select('worlds(*)')
        .eq('user_id', userId);

      if (worldAccess) {
        setAccessibleWorlds(worldAccess.map(wa => (wa as any).worlds));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  return { fetchUserData };
};
