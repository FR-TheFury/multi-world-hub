import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

interface World {
  id: string;
  code: string;
  name: string;
}

interface UserWorldAccess {
  user_id: string;
  world_id: string;
}

const Users = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [userWorldAccess, setUserWorldAccess] = useState<UserWorldAccess[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profilesRes, worldsRes, accessRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('worlds').select('*'),
        supabase.from('user_world_access').select('user_id, world_id'),
      ]);

      if (profilesRes.data) setProfiles(profilesRes.data);
      if (worldsRes.data) setWorlds(worldsRes.data);
      if (accessRes.data) setUserWorldAccess(accessRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const hasWorldAccess = (userId: string, worldId: string) => {
    return userWorldAccess.some(
      (access) => access.user_id === userId && access.world_id === worldId
    );
  };

  const toggleWorldAccess = async (userId: string, worldId: string) => {
    const hasAccess = hasWorldAccess(userId, worldId);

    try {
      if (hasAccess) {
        await supabase
          .from('user_world_access')
          .delete()
          .eq('user_id', userId)
          .eq('world_id', worldId);
      } else {
        await supabase
          .from('user_world_access')
          .insert({ user_id: userId, world_id: worldId });
      }

      // Refresh data
      const { data } = await supabase
        .from('user_world_access')
        .select('user_id, world_id');
      if (data) setUserWorldAccess(data);

      toast({
        title: 'Succès',
        description: `Accès ${hasAccess ? 'révoqué' : 'accordé'}`,
      });
    } catch (error) {
      console.error('Error toggling access:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier l\'accès',
        variant: 'destructive',
      });
    }
  };

  const filteredProfiles = profiles.filter((profile) =>
    profile.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (profile.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Gestion des Utilisateurs</h2>
        <p className="text-sm text-muted-foreground">
          Gérez les accès des utilisateurs aux différents Mondes
        </p>
      </div>

      <Card className="shadow-vuexy-md border-0">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Utilisateurs</CardTitle>
            <Button className="h-9">
              <UserPlus className="mr-2 h-4 w-4" />
              Inviter un utilisateur
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par email ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                  <TableRow>
                  <TableHead className="font-semibold">Utilisateur</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  {worlds.map((world) => (
                    <TableHead key={world.id} className="text-center font-semibold">
                      <Badge variant="outline">{world.code}</Badge>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">
                      {profile.display_name || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{profile.email}</TableCell>
                    {worlds.map((world) => (
                      <TableCell key={world.id} className="text-center">
                        <Switch
                          checked={hasWorldAccess(profile.id, world.id)}
                          onCheckedChange={() => toggleWorldAccess(profile.id, world.id)}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;
