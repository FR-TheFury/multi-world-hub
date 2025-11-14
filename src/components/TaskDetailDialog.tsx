import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string;
  world?: { code: string; name: string; theme_colors: any };
}

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  email: string;
}

export const TaskDetailDialog = ({ task, open, onOpenChange, onTaskUpdated }: TaskDetailDialogProps) => {
  const { isSuperAdmin, user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [assignedTo, setAssignedTo] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setAssignedTo(task.assigned_to);
    }
  }, [task]);

  useEffect(() => {
    if (isSuperAdmin() && open) {
      fetchUsers();
    }
  }, [isSuperAdmin, open]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .order('display_name');
    
    if (data) {
      setUsers(data);
    }
  };

  const handleValidate = async () => {
    if (!task) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', task.id);

    if (error) {
      toast.error('Erreur lors de la validation de la tâche');
    } else {
      toast.success('Tâche validée');
      onTaskUpdated();
      onOpenChange(false);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!task) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('tasks')
      .update({
        title,
        description,
        priority,
        due_date: dueDate?.toISOString() || null,
        assigned_to: assignedTo
      })
      .eq('id', task.id);

    if (error) {
      toast.error('Erreur lors de la modification de la tâche');
    } else {
      toast.success('Tâche modifiée');
      setIsEditing(false);
      onTaskUpdated();
    }
    setLoading(false);
  };

  if (!task) return null;

  const getPriorityLabel = (priority: string) => {
    const labels = { urgent: 'Urgent', high: 'Élevée', medium: 'Moyenne', low: 'Basse' };
    return labels[priority as keyof typeof labels] || priority;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const canEdit = isSuperAdmin() || user?.id === task.assigned_to;
  const isOwner = user?.id === task.assigned_to;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Détails de la tâche
            {task.world && (
              <Badge style={{ backgroundColor: task.world.theme_colors?.primary }}>
                {task.world.code}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isEditing && isSuperAdmin() ? (
            <>
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priorité</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">Élevée</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="low">Basse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date d'échéance</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, 'PPP', { locale: fr }) : 'Sélectionner une date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={fr} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assigné à</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.display_name || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-muted-foreground">Titre</Label>
                <p className="text-lg font-semibold">{task.title}</p>
              </div>

              {task.description && (
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Priorité</Label>
                  <div className="mt-1">
                    <Badge variant={getPriorityColor(task.priority)}>
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  </div>
                </div>

                {task.due_date && (
                  <div>
                    <Label className="text-muted-foreground">Date d'échéance</Label>
                    <p className="text-sm mt-1">
                      {format(new Date(task.due_date), 'PPP', { locale: fr })}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-muted-foreground">Statut</Label>
                <div className="mt-1">
                  <Badge variant={task.status === 'done' ? 'default' : 'secondary'}>
                    {task.status === 'done' ? 'Terminée' : 'À faire'}
                  </Badge>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          {isEditing && isSuperAdmin() ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                Enregistrer
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              {isOwner && task.status !== 'done' && (
                <Button onClick={handleValidate} disabled={loading} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Valider la tâche
                </Button>
              )}
              {isSuperAdmin() && (
                <Button onClick={() => setIsEditing(true)} disabled={loading}>
                  Modifier
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
