import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worldId: string;
  onTaskCreated?: () => void;
}

interface User {
  id: string;
  display_name: string | null;
  email: string;
}

const CreateTaskDialog = ({ open, onOpenChange, worldId, onTaskCreated }: CreateTaskDialogProps) => {
  console.log('CreateTaskDialog rendered with worldId:', worldId, 'open:', open);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState<Date>();
  const [assignedTo, setAssignedTo] = useState<string>('unassigned');
  const [createAppointment, setCreateAppointment] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<Date>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('useEffect triggered, open:', open);
    if (open) {
      fetchUsers();
    }
  }, [open, worldId]);

  const fetchUsers = async () => {
    try {
      console.log('Fetching users for worldId:', worldId);
      const { data, error } = await supabase
        .from('user_world_access')
        .select('user_id, profiles(id, display_name, email)')
        .eq('world_id', worldId);

      console.log('Fetch users result:', { data, error });
      if (error) throw error;

      const usersList = data
        .map((item: any) => item.profiles)
        .filter(Boolean) as User[];

      console.log('Users list:', usersList);
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Le titre est obligatoire');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Créer la tâche
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          priority,
          due_date: dueDate?.toISOString() || null,
          assigned_to: assignedTo === 'unassigned' ? null : (assignedTo || null),
          world_id: worldId,
          created_by: user.id,
          status: 'todo'
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Créer le RDV si demandé
      if (createAppointment && appointmentDate) {
        const startDateTime = new Date(appointmentDate);
        const [startHour, startMinute] = startTime.split(':');
        startDateTime.setHours(parseInt(startHour), parseInt(startMinute));

        const endDateTime = new Date(appointmentDate);
        const [endHour, endMinute] = endTime.split(':');
        endDateTime.setHours(parseInt(endHour), parseInt(endMinute));

        const { error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            title: title.trim(),
            description: description.trim() || null,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            user_id: assignedTo || user.id,
            world_id: worldId,
            status: 'scheduled'
          });

        if (appointmentError) throw appointmentError;
      }

      // Créer une notification pour l'assigné
      if (assignedTo) {
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();

        await supabase.from('notifications').insert({
          user_id: assignedTo,
          title: 'Nouvelle tâche assignée',
          message: `${creatorProfile?.display_name || 'Un utilisateur'} vous a assigné la tâche: ${title}`,
          type: 'task',
          related_id: task.id
        });
      }

      toast.success(createAppointment ? 'Tâche et rendez-vous créés avec succès' : 'Tâche créée avec succès');
      onTaskCreated?.();
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Erreur lors de la création de la tâche');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate(undefined);
    setAssignedTo('unassigned');
    setCreateAppointment(false);
    setAppointmentDate(undefined);
    setStartTime('09:00');
    setEndTime('10:00');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle tâche</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Titre */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entrez le titre de la tâche"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ajoutez une description (optionnel)"
              rows={3}
            />
          </div>

          {/* Priorité */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priorité</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Basse</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="high">Haute</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date limite */}
          <div className="space-y-2">
            <Label>Date limite (optionnel)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'dd MMMM yyyy', { locale: fr }) : 'Sélectionner une date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Assigner à */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigner à (optionnel)</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Non assignée (visible par tous)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Non assignée (visible par tous)</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.display_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Créer un RDV */}
          <div className="flex items-center space-x-2 pt-4 border-t">
            <Switch
              id="create-appointment"
              checked={createAppointment}
              onCheckedChange={setCreateAppointment}
            />
            <Label htmlFor="create-appointment">Créer un rendez-vous associé</Label>
          </div>

          {/* Section RDV */}
          {createAppointment && (
            <div className="space-y-4 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label>Date du rendez-vous</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appointmentDate ? format(appointmentDate, 'dd MMMM yyyy', { locale: fr }) : 'Sélectionner une date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={appointmentDate}
                      onSelect={setAppointmentDate}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Heure de début</Label>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-time">Heure de fin</Label>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Création...' : 'Créer la tâche'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
