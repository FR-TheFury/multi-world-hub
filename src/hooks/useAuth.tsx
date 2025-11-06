import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const navigate = useNavigate();
  const { setUser, setSession, setProfile, setRoles, setAccessibleWorlds } = useAuthStore();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch user data with setTimeout to avoid deadlock
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setAccessibleWorlds([]);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
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
