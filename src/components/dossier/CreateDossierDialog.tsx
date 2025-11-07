import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateDossierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worldId: string;
  onSuccess: () => void;
}

const CreateDossierDialog = ({ open, onOpenChange, worldId, onSuccess }: CreateDossierDialogProps) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    tags: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !user) return;

    setLoading(true);
    try {
      // Create dossier
      const { data: dossierData, error: dossierError } = await supabase
        .from('dossiers')
        .insert({
          title: formData.title.trim(),
          world_id: worldId,
          owner_id: user.id,
          status: 'nouveau',
          tags: formData.tags
            ? formData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
            : [],
        })
        .select()
        .single();

      if (dossierError) throw dossierError;

      // Initialize workflow progress
      const { data: templateData } = await supabase
        .from('workflow_templates')
        .select('id')
        .eq('world_id', worldId)
        .eq('is_active', true)
        .single();

      if (templateData) {
        const { data: stepsData } = await supabase
          .from('workflow_steps')
          .select('id')
          .eq('workflow_template_id', templateData.id)
          .order('step_number', { ascending: true });

        if (stepsData && stepsData.length > 0) {
          const progressRecords = stepsData.map((step) => ({
            dossier_id: dossierData.id,
            workflow_step_id: step.id,
            status: 'pending' as const,
          }));

          await supabase.from('dossier_workflow_progress').insert(progressRecords);
        }
      }

      // Add creation comment
      await supabase.from('dossier_comments').insert({
        dossier_id: dossierData.id,
        user_id: user.id,
        comment_type: 'status_change',
        content: `Dossier créé`,
        metadata: { status: 'nouveau' },
      });

      toast.success('Dossier créé avec succès');
      setFormData({ title: '', tags: '' });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating dossier:', error);
      toast.error('Erreur lors de la création du dossier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau dossier</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour créer un nouveau dossier
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Titre du dossier <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ex: Sinistre Incendie - Dupont"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">
                Tags <span className="text-muted-foreground text-xs">(optionnel, séparés par des virgules)</span>
              </Label>
              <Input
                id="tags"
                placeholder="Ex: urgent, incendie, particulier"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !formData.title.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer le dossier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDossierDialog;
