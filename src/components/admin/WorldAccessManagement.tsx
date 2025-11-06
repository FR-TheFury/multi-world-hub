import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore, World } from '@/lib/store';

interface UserAccess {
  id: string;
  email: string;
  display_name: string | null;
  worlds: World[];
}

const WorldAccessManagement = () => {
  const { accessibleWorlds } = useAuthStore();
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserAccess | null>(null);
  const [selectedWorld, setSelectedWorld] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsersWithAccess();
  }, []);

  const fetchUsersWithAccess = async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        display_name,
        user_world_access(
          world:worlds(id, code, name, theme_colors)
        )
      `)
      .order('email');

    if (data) {
      setUsers(data.map(u => ({
        ...u,
        worlds: (u as any).user_world_access.map((uwa: any) => uwa.world)
      })));
    }
  };

  const addWorldAccess = async () => {
    if (!selectedUser || !selectedWorld) return;

    const world = accessibleWorlds.find(w => w.id === selectedWorld);
    if (!world) return;

    const { error } = await supabase
      .from('user_world_access')
      .insert({
        user_id: selectedUser.id,
        world_id: world.id
      });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter l\'accès',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Accès ajouté avec succès'
      });
      fetchUsersWithAccess();
      setDialogOpen(false);
      setSelectedUser(null);
      setSelectedWorld('');
    }
  };

  const removeWorldAccess = async (userId: string, worldId: string) => {
    const { error } = await supabase
      .from('user_world_access')
      .delete()
      .eq('user_id', userId)
      .eq('world_id', worldId);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer l\'accès',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Accès retiré avec succès'
      });
      fetchUsersWithAccess();
    }
  };

  return (
    <Card className="border-0 shadow-vuexy-md">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Gestion des Accès aux Mondes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Nom</TableHead>
              <TableHead className="font-semibold">Accès aux Mondes</TableHead>
              <TableHead className="font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="hover:bg-muted/30">
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.display_name || '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-2 flex-wrap">
                    {user.worlds.length === 0 ? (
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                        Aucun accès
                      </Badge>
                    ) : (
                      user.worlds.map((world) => (
                        <Badge
                          key={world.id}
                          style={{
                            backgroundColor: `${world.theme_colors.primary}15`,
                            color: world.theme_colors.primary,
                            borderColor: `${world.theme_colors.primary}30`
                          }}
                        >
                          {world.code}
                          <button
                            onClick={() => removeWorldAccess(user.id, world.id)}
                            className="ml-2 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Dialog open={dialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setSelectedUser(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter accès
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ajouter un accès pour {user.email}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Select value={selectedWorld} onValueChange={setSelectedWorld}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un monde" />
                          </SelectTrigger>
                          <SelectContent>
                            {accessibleWorlds.map((world) => (
                              <SelectItem key={world.id} value={world.id}>
                                {world.name} ({world.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={addWorldAccess} className="w-full">
                          Ajouter
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default WorldAccessManagement;
