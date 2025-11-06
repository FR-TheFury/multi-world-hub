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
import { Users, Shield, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  display_name: string | null;
  roles: { role: string }[];
}

interface Role {
  id: string;
  name: string;
  label: string;
}

const UserRoleManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        display_name,
        user_roles(
          role:roles(name, label)
        )
      `)
      .order('email');

    if (data) {
      setUsers(data.map(u => ({
        ...u,
        roles: (u as any).user_roles.map((ur: any) => ({ role: ur.role.name }))
      })));
    }
  };

  const fetchRoles = async () => {
    const { data } = await supabase
      .from('roles')
      .select('*');

    if (data) setRoles(data);
  };

  const addRoleToUser = async () => {
    if (!selectedUser || !selectedRole) return;

    const role = roles.find(r => r.name === selectedRole);
    if (!role) return;

    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: selectedUser.id,
        role_id: role.id
      });

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le rôle',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Rôle ajouté avec succès'
      });
      fetchUsers();
      setDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole('');
    }
  };

  const removeRoleFromUser = async (userId: string, roleName: string) => {
    const role = roles.find(r => r.name === roleName);
    if (!role) return;

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', role.id);

    if (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer le rôle',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Succès',
        description: 'Rôle retiré avec succès'
      });
      fetchUsers();
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'admin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'editor':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'viewer':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <Card className="border-0 shadow-vuexy-md">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Gestion des Utilisateurs et Rôles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Nom</TableHead>
              <TableHead className="font-semibold">Rôles</TableHead>
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
                    {user.roles.length === 0 ? (
                      <Badge className="bg-slate-100 text-slate-700 border-slate-200">
                        Aucun rôle
                      </Badge>
                    ) : (
                      user.roles.map((r, i) => (
                        <Badge
                          key={i}
                          className={getRoleBadgeColor(r.role)}
                        >
                          {r.role}
                          <button
                            onClick={() => removeRoleFromUser(user.id, r.role)}
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
                        Ajouter rôle
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ajouter un rôle à {user.email}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un rôle" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.name}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={addRoleToUser} className="w-full">
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

export default UserRoleManagement;
