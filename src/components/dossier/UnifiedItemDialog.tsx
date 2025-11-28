import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Save, X, FileText, MessageSquare, CheckSquare, Calendar, StickyNote, FileImage } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TimelineItem {
  id: string;
  type: "comment" | "document" | "task" | "appointment" | "annotation" | "photo";
  title: string;
  content?: string;
  fromUser: string;
  fromUserAvatar?: string;
  createdAt: string;
  metadata?: any;
  status?: string;
  priority?: string;
  dueDate?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  annotationType?: string;
  storagePath?: string;
  createdById?: string;
  uploadedById?: string;
  userId?: string;
  assignedToId?: string;
  toUser?: string;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  email: string;
}

interface UnifiedItemDialogProps {
  item: TimelineItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdated: () => void;
  currentUserId?: string;
  isSuperAdmin?: boolean;
}

export function UnifiedItemDialog({ 
  item, 
  open, 
  onOpenChange, 
  onItemUpdated,
  currentUserId,
  isSuperAdmin = false
}: UnifiedItemDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // États pour l'édition
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedStatus, setEditedStatus] = useState("");
  const [editedPriority, setEditedPriority] = useState("");
  const [editedDueDate, setEditedDueDate] = useState("");
  const [editedStartTime, setEditedStartTime] = useState("");
  const [editedEndTime, setEditedEndTime] = useState("");
  const [editedAssignedTo, setEditedAssignedTo] = useState("");

  // Initialiser les valeurs quand l'item change
  useMemo(() => {
    if (item) {
      setEditedTitle(item.title || "");
      setEditedContent(item.content || "");
      setEditedDescription(item.description || "");
      setEditedStatus(item.status || "");
      setEditedPriority(item.priority || "");
      setEditedDueDate(item.dueDate || "");
      setEditedStartTime(item.startTime || "");
      setEditedEndTime(item.endTime || "");
      setEditedAssignedTo(item.assignedToId || "");
    }
  }, [item]);

  // Charger les utilisateurs si c'est une tâche
  useMemo(() => {
    if (open && item?.type === "task") {
      fetchUsers();
    }
  }, [open, item]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .order('display_name');
    
    if (data) {
      setUsers(data);
    }
  };

  // Vérifier les permissions
  const canEdit = useMemo(() => {
    if (!item || !currentUserId) return false;
    if (isSuperAdmin) return true;

    switch (item.type) {
      case "comment":
      case "annotation":
        return item.createdById === currentUserId;
      case "task":
        return item.createdById === currentUserId || item.assignedToId === currentUserId;
      case "appointment":
        return item.userId === currentUserId;
      case "document":
      case "photo":
        return false; // Non éditables
      default:
        return false;
    }
  }, [item, currentUserId, isSuperAdmin]);

  const canDelete = useMemo(() => {
    if (!item || !currentUserId) return false;
    if (isSuperAdmin) return true;

    switch (item.type) {
      case "comment":
      case "annotation":
        return item.createdById === currentUserId;
      case "task":
        return item.createdById === currentUserId;
      case "appointment":
        return item.userId === currentUserId;
      case "document":
      case "photo":
        return item.uploadedById === currentUserId;
      default:
        return false;
    }
  }, [item, currentUserId, isSuperAdmin]);

  const getTableName = (type: string): "dossier_comments" | "tasks" | "dossier_step_annotations" | "appointments" | "dossier_attachments" | "dossier_photos" => {
    switch (type) {
      case "comment": return "dossier_comments";
      case "task": return "tasks";
      case "annotation": return "dossier_step_annotations";
      case "appointment": return "appointments";
      case "document": return "dossier_attachments";
      case "photo": return "dossier_photos";
      default: return "dossier_comments"; // Fallback safe
    }
  };

  const handleUpdate = async () => {
    if (!item) return;
    
    setIsLoading(true);
    try {
      let updateData: any = {};

      switch (item.type) {
        case "comment":
          updateData = { content: editedContent };
          break;
        case "task":
          updateData = { 
            title: editedTitle, 
            description: editedDescription,
            status: editedStatus,
            priority: editedPriority,
            due_date: editedDueDate || null,
            assigned_to: editedAssignedTo || null
          };
          break;
        case "annotation":
          updateData = { 
            title: editedTitle, 
            content: editedContent 
          };
          break;
        case "appointment":
          updateData = { 
            title: editedTitle, 
            description: editedDescription,
            start_time: editedStartTime,
            end_time: editedEndTime
          };
          break;
      }

      const { error } = await supabase
        .from(getTableName(item.type))
        .update(updateData)
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Modifié avec succès",
        description: "L'élément a été mis à jour."
      });
      
      onItemUpdated();
      setIsEditing(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de modifier l'élément"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    setIsLoading(true);
    try {
      // Supprimer du storage si c'est un document ou photo
      if ((item.type === "document" || item.type === "photo") && item.storagePath) {
        const bucketName = item.type === "document" ? "dossier-attachments" : "dossier-photos";
        const { error: storageError } = await supabase.storage
          .from(bucketName)
          .remove([item.storagePath]);
        
        if (storageError) console.error("Erreur suppression storage:", storageError);
      }

      // Supprimer de la base de données
      const { error } = await supabase
        .from(getTableName(item.type))
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Supprimé avec succès",
        description: "L'élément a été supprimé définitivement."
      });
      
      onItemUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'élément"
      });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const getIcon = () => {
    switch (item?.type) {
      case "comment": return <MessageSquare className="h-5 w-5" />;
      case "task": return <CheckSquare className="h-5 w-5" />;
      case "annotation": return <StickyNote className="h-5 w-5" />;
      case "appointment": return <Calendar className="h-5 w-5" />;
      case "document": return <FileText className="h-5 w-5" />;
      case "photo": return <FileImage className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  if (!item) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {getIcon()}
              <DialogTitle>
                {isEditing && item.type !== "comment" ? (
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-lg font-semibold"
                  />
                ) : (
                  item.title
                )}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informations de base */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Créé par {item.fromUser}</span>
              <span>•</span>
              <span>{format(new Date(item.createdAt), "PPP 'à' HH:mm", { locale: fr })}</span>
            </div>

            {/* Contenu selon le type */}
            {(item.type === "comment" || item.type === "annotation") && (
              <div className="space-y-2">
                <Label>Contenu</Label>
                {isEditing ? (
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={6}
                  />
                ) : (
                  <div className="p-3 rounded-md bg-muted">
                    {item.content}
                  </div>
                )}
              </div>
            )}

            {item.type === "task" && (
              <>
                <div className="space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={4}
                    />
                  ) : (
                    <div className="p-3 rounded-md bg-muted">
                      {item.description || "Aucune description"}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    {isEditing ? (
                      <Select value={editedStatus} onValueChange={setEditedStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">À faire</SelectItem>
                          <SelectItem value="in_progress">En cours</SelectItem>
                          <SelectItem value="done">Terminé</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-2 rounded-md bg-muted text-sm">{item.status}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    {isEditing ? (
                      <Select value={editedPriority} onValueChange={setEditedPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Basse</SelectItem>
                          <SelectItem value="medium">Moyenne</SelectItem>
                          <SelectItem value="high">Haute</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-2 rounded-md bg-muted text-sm">{item.priority}</div>
                    )}
                  </div>
                </div>

                {(item.dueDate || isEditing) && (
                  <div className="space-y-2">
                    <Label>Date d'échéance</Label>
                    {isEditing ? (
                      <Input
                        type="datetime-local"
                        value={editedDueDate}
                        onChange={(e) => setEditedDueDate(e.target.value)}
                      />
                    ) : (
                      <div className="p-2 rounded-md bg-muted text-sm">
                        {item.dueDate ? format(new Date(item.dueDate), "PPP 'à' HH:mm", { locale: fr }) : "Non définie"}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Assigné à</Label>
                  {isEditing ? (
                    <Select value={editedAssignedTo} onValueChange={setEditedAssignedTo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un utilisateur" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.display_name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-2 rounded-md bg-muted text-sm">
                      {item.toUser || "Non assignée"}
                    </div>
                  )}
                </div>
              </>
            )}

            {item.type === "appointment" && (
              <>
                <div className="space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={4}
                    />
                  ) : (
                    <div className="p-3 rounded-md bg-muted">
                      {item.description || "Aucune description"}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Début</Label>
                    {isEditing ? (
                      <Input
                        type="datetime-local"
                        value={editedStartTime}
                        onChange={(e) => setEditedStartTime(e.target.value)}
                      />
                    ) : (
                      <div className="p-2 rounded-md bg-muted text-sm">
                        {item.startTime ? format(new Date(item.startTime), "PPP 'à' HH:mm", { locale: fr }) : "Non défini"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Fin</Label>
                    {isEditing ? (
                      <Input
                        type="datetime-local"
                        value={editedEndTime}
                        onChange={(e) => setEditedEndTime(e.target.value)}
                      />
                    ) : (
                      <div className="p-2 rounded-md bg-muted text-sm">
                        {item.endTime ? format(new Date(item.endTime), "PPP 'à' HH:mm", { locale: fr }) : "Non défini"}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {(item.type === "document" || item.type === "photo") && (
              <div className="p-3 rounded-md bg-muted text-sm">
                <p><strong>Type de fichier :</strong> {item.type === "document" ? "Document" : "Photo"}</p>
                {item.metadata && (
                  <p><strong>Taille :</strong> {(item.metadata.size / 1024).toFixed(2)} KB</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {!isEditing ? (
              <>
                {canEdit && (
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                )}
                {canDelete && (
                  <Button onClick={() => setShowDeleteConfirm(true)} variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                )}
                <Button onClick={() => onOpenChange(false)} variant="secondary">
                  Fermer
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setIsEditing(false)} variant="outline" disabled={isLoading}>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
                <Button onClick={handleUpdate} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
