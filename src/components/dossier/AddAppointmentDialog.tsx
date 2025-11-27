import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  workflowStepId?: string;
  onAppointmentCreated?: () => void;
}

export function AddAppointmentDialog({ 
  open, 
  onOpenChange, 
  dossierId, 
  workflowStepId, 
  onAppointmentCreated 
}: AddAppointmentDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; display_name: string; avatar_url: string | null; email: string }>>([]);

  useEffect(() => {
    if (open) {
      fetchAvailableUsers();
    }
  }, [open, dossierId]);

  const fetchAvailableUsers = async () => {
    try {
      const { data: dossier } = await supabase
        .from("dossiers")
        .select("world_id")
        .eq("id", dossierId)
        .single();

      if (!dossier) return;

      const { data: worldAccess } = await supabase
        .from("user_world_access")
        .select("user_id")
        .eq("world_id", dossier.world_id);

      if (!worldAccess || worldAccess.length === 0) return;

      const userIds = worldAccess.map(ua => ua.user_id);

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
      toast.error("Le titre du rendez-vous est requis");
      return;
    }

    if (!startTime || !endTime) {
      toast.error("Les dates de début et fin sont requises");
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      toast.error("La date de fin doit être après la date de début");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: dossier } = await supabase
        .from("dossiers")
        .select("world_id")
        .eq("id", dossierId)
        .single();

      if (!dossier) throw new Error("Dossier non trouvé");

      const appointmentData: any = {
        title,
        description: description || null,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        dossier_id: dossierId,
        user_id: assignedTo || user.id,
        world_id: dossier.world_id,
        workflow_step_id: workflowStepId || null,
        status: "scheduled",
      };

      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert(appointmentData)
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Send notification to assigned user
      if (assignedTo && assignedTo !== user.id) {
        const { data: assigneeProfile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", assignedTo)
          .single();

        await supabase.from("notifications").insert({
          user_id: assignedTo,
          type: "appointment_created",
          title: "Nouveau rendez-vous",
          message: `${assigneeProfile?.display_name || "Quelqu'un"} a créé un rendez-vous "${title}"`,
          related_id: appointment.id,
        });
      }

      toast.success("Rendez-vous créé");
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setAssignedTo("");
      onOpenChange(false);
      onAppointmentCreated?.();
    } catch (error: any) {
      console.error("Erreur création rendez-vous:", error);
      toast.error(error.message || "Erreur lors de la création du rendez-vous");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un rendez-vous</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du rendez-vous"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du rendez-vous"
              rows={3}
            />
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
            <Label htmlFor="startTime">Date et heure de début *</Label>
            <Input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="endTime">Date et heure de fin *</Label>
            <Input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Création..." : "Créer le rendez-vous"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
