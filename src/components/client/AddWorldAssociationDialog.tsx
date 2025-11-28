import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface World {
  id: string;
  code: string;
  name: string;
}

interface AddWorldAssociationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  currentWorldIds: string[];
  onSuccess?: () => void;
}

const AddWorldAssociationDialog = ({
  open,
  onOpenChange,
  clientId,
  currentWorldIds,
  onSuccess,
}: AddWorldAssociationDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [availableWorlds, setAvailableWorlds] = useState<World[]>([]);
  const [selectedWorldId, setSelectedWorldId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      fetchAvailableWorlds();
    }
  }, [open, currentWorldIds]);

  const fetchAvailableWorlds = async () => {
    try {
      const { data: userWorlds, error } = await supabase
        .from('user_world_access')
        .select('world_id, worlds(id, code, name)')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;

      // Filter out worlds already associated with this client
      const available = userWorlds
        ?.map((uw: any) => uw.worlds)
        .filter((w: World) => !currentWorldIds.includes(w.id)) || [];

      setAvailableWorlds(available);
    } catch (error) {
      console.error('Error fetching worlds:', error);
      toast.error('Erreur lors du chargement des mondes');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !selectedWorldId) return;

    try {
      setLoading(true);

      const { error } = await supabase.from('client_world_associations').insert({
        client_id: clientId,
        world_id: selectedWorldId,
        association_reason: reason || null,
      });

      if (error) throw error;

      toast.success('Monde associé avec succès');
      setSelectedWorldId('');
      setReason('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding world association:', error);
      toast.error(error.message || 'Erreur lors de l\'association du monde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Associer un monde supplémentaire</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="world">Monde *</Label>
            <Select value={selectedWorldId} onValueChange={setSelectedWorldId} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un monde" />
              </SelectTrigger>
              <SelectContent>
                {availableWorlds.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Tous les mondes sont déjà associés
                  </div>
                ) : (
                  availableWorlds.map((world) => (
                    <SelectItem key={world.id} value={world.id}>
                      {world.name} ({world.code})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Raison de l'association (optionnel)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Transfert dossier, Continuité..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !selectedWorldId || availableWorlds.length === 0}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Associer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddWorldAssociationDialog;
