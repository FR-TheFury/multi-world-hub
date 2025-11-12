import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  onCommentCreated?: () => void;
}

export function AddCommentDialog({ open, onOpenChange, dossierId, onCommentCreated }: AddCommentDialogProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Le commentaire ne peut pas être vide");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Create comment
      const { error: commentError } = await supabase
        .from("dossier_comments")
        .insert({
          dossier_id: dossierId,
          user_id: user.id,
          content,
          comment_type: "comment",
        });

      if (commentError) throw commentError;

      // Get dossier owner to send notification
      const { data: dossier } = await supabase
        .from("dossiers")
        .select("owner_id, title")
        .eq("id", dossierId)
        .single();

      if (dossier && dossier.owner_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: dossier.owner_id,
          type: "comment_added",
          title: "Nouveau commentaire",
          message: `Un commentaire a été ajouté à votre dossier "${dossier.title}"`,
          related_id: dossierId,
        });
      }

      toast.success("Commentaire ajouté");
      setContent("");
      onOpenChange(false);
      onCommentCreated?.();
    } catch (error: any) {
      console.error("Erreur création commentaire:", error);
      toast.error(error.message || "Erreur lors de la création du commentaire");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un commentaire</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="content">Commentaire *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Votre commentaire..."
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Ajout..." : "Ajouter le commentaire"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
