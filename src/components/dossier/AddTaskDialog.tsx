import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "lucide-react";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  workflowStepId?: string;
  onTaskCreated?: () => void;
}

export function AddTaskDialog({ open, onOpenChange, dossierId, workflowStepId, onTaskCreated }: AddTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [createAppointment, setCreateAppointment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; display_name: string; avatar_url: string | null; email: string }>>([]);

  useEffect(() => {
    if (open) {
      fetchAvailableUsers();
    }
  }, [open, dossierId]);

  const fetchAvailableUsers = async () => {
    try {
      // Get dossier world_id
      const { data: dossier } = await supabase
        .from("dossiers")
        .select("world_id")
        .eq("id", dossierId)
        .single();

      if (!dossier) return;

      // Get users with access to this world
      const { data: worldAccess } = await supabase
        .from("user_world_access")
        .select("user_id")
        .eq("world_id", dossier.world_id);

      if (!worldAccess || worldAccess.length === 0) return;

      const userIds = worldAccess.map(ua => ua.user_id);

      // Get profiles for these users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, email")
        .in("id", userIds);

      if (profiles) {
        setUsers(profiles);
      }
    } catch (error) {
      console.error("Erreur chargement utilisateurs:", error);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Le titre de la tâche est requis");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Get dossier world_id
      const { data: dossier } = await supabase
        .from("dossiers")
        .select("world_id")
        .eq("id", dossierId)
        .single();

      if (!dossier) throw new Error("Dossier non trouvé");

      // Create task
      const taskData: any = {
        title,
        description: description || null,
        priority,
        status: "todo",
        world_id: dossier.world_id,
        created_by: user.id,
        assigned_to: assignedTo || user.id,
        due_date: dueDate || null,
        workflow_step_id: workflowStepId || null,
      };

      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert(taskData)
        .select()
        .single();

      if (taskError) throw taskError;

      // Create appointment if requested
      if (createAppointment && dueDate && task) {
        const appointmentDate = new Date(dueDate);
        const endDate = new Date(appointmentDate);
        endDate.setHours(endDate.getHours() + 1);

        const { error: appointmentError } = await supabase
          .from("appointments")
          .insert({
            title: title,
            description: description || null,
            start_time: appointmentDate.toISOString(),
            end_time: endDate.toISOString(),
            dossier_id: dossierId,
            user_id: assignedTo || user.id,
            world_id: dossier.world_id,
            workflow_step_id: workflowStepId || null,
            status: "scheduled",
          });

        if (appointmentError) throw appointmentError;
      }

      // Create system comment
      await supabase.from("dossier_comments").insert({
        dossier_id: dossierId,
        user_id: user.id,
        content: `Tâche créée : "${title}"${createAppointment ? " avec rendez-vous automatique" : ""}`,
        comment_type: "comment",
      });

      // Send notification
      if (assignedTo && assignedTo !== user.id) {
        await supabase.from("notifications").insert({
          user_id: assignedTo,
          type: "task_assigned",
          title: "Nouvelle tâche assignée",
          message: `La tâche "${title}" vous a été assignée`,
          related_id: task.id,
        });
      }

      toast.success(`Tâche créée${createAppointment ? " avec rendez-vous" : ""}`);
      setTitle("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setAssignedTo("");
      setCreateAppointment(false);
      onOpenChange(false);
      onTaskCreated?.();
    } catch (error: any) {
      console.error("Erreur création tâche:", error);
      toast.error(error.message || "Erreur lors de la création de la tâche");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une tâche</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la tâche"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de la tâche"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="priority">Priorité</Label>
            <Select value={priority} onValueChange={setPriority}>
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

          <div>
            <Label htmlFor="assignedTo">Assigner à</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un utilisateur" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar_url || ""} />
                        <AvatarFallback className="text-xs">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.display_name || user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dueDate">Date d'échéance</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {dueDate && (
            <div className="flex items-center space-x-2">
              <Switch
                id="createAppointment"
                checked={createAppointment}
                onCheckedChange={setCreateAppointment}
              />
              <Label htmlFor="createAppointment" className="cursor-pointer">
                Créer un rendez-vous automatique
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Création..." : "Créer la tâche"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
