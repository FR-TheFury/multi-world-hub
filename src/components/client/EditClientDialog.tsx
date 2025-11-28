import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, X } from 'lucide-react';
import AddWorldAssociationDialog from './AddWorldAssociationDialog';

import JDELogo from '@/assets/JDE.png';
import JDMOLogo from '@/assets/JDMO.png';
import DBCSLogo from '@/assets/DBCS.png';

interface ClientInfo {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  client_type: 'locataire' | 'proprietaire' | 'proprietaire_non_occupant' | 'professionnel';
  adresse_client: string | null;
  adresse_sinistre: string | null;
  adresse_identique_sinistre: boolean | null;
  type_sinistre: string | null;
  date_sinistre: string | null;
  compagnie_assurance: string | null;
  numero_police: string | null;
  montant_dommage_batiment: number | null;
  montant_demolition_deblayage: number | null;
  montant_mise_conformite: number | null;
  primary_world_id: string | null;
  // Coordonnées du propriétaire (pour locataires uniquement)
  proprietaire_nom: string | null;
  proprietaire_prenom: string | null;
  proprietaire_telephone: string | null;
  proprietaire_email: string | null;
  proprietaire_adresse: string | null;
}

interface World {
  id: string;
  code: string;
  name: string;
}

interface WorldAssociation {
  id: string;
  world_id: string;
  association_reason: string | null;
  worlds: World;
}

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string | null;
  onSuccess?: () => void;
}

const EditClientDialog = ({ open, onOpenChange, clientId, onSuccess }: EditClientDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [formData, setFormData] = useState<Partial<ClientInfo>>({
    client_type: 'locataire',
    adresse_identique_sinistre: false,
  });
  const [primaryWorld, setPrimaryWorld] = useState<World | null>(null);
  const [associatedWorlds, setAssociatedWorlds] = useState<WorldAssociation[]>([]);
  const [showAddWorldDialog, setShowAddWorldDialog] = useState(false);
  const [worlds, setWorlds] = useState<World[]>([]);

  useEffect(() => {
    if (open && clientId) {
      fetchClientData();
      fetchWorlds();
    }
  }, [open, clientId]);

  const fetchWorlds = async () => {
    try {
      const { data, error } = await supabase
        .from('worlds')
        .select('id, code, name')
        .order('code');

      if (error) throw error;
      setWorlds(data || []);
    } catch (error) {
      console.error('Error fetching worlds:', error);
    }
  };

  const fetchClientData = async () => {
    if (!clientId) return;

    try {
      setFetching(true);
      const { data, error } = await supabase
        .from('dossier_client_info')
        .select('*, primary_world:worlds!primary_world_id(id, code, name)')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      setFormData(data);
      setPrimaryWorld(data.primary_world);

      // Fetch associated worlds
      const { data: associations, error: assocError } = await supabase
        .from('client_world_associations')
        .select('id, world_id, association_reason, worlds(id, code, name)')
        .eq('client_id', clientId);

      if (assocError) throw assocError;
      setAssociatedWorlds(associations || []);
    } catch (error) {
      console.error('Error fetching client:', error);
      toast.error('Erreur lors du chargement des données client');
    } finally {
      setFetching(false);
    }
  };

  const handlePrimaryWorldChange = async (newWorldId: string) => {
    if (!clientId || !newWorldId) return;

    try {
      const { error } = await supabase
        .from('dossier_client_info')
        .update({ primary_world_id: newWorldId })
        .eq('id', clientId);

      if (error) throw error;

      toast.success('Monde principal mis à jour');
      fetchClientData();
    } catch (error) {
      console.error('Error updating primary world:', error);
      toast.error('Erreur lors de la mise à jour du monde principal');
    }
  };

  const removeWorldAssociation = async (associationId: string) => {
    try {
      const { error } = await supabase
        .from('client_world_associations')
        .delete()
        .eq('id', associationId);

      if (error) throw error;

      toast.success('Monde dissocié avec succès');
      fetchClientData();
    } catch (error) {
      console.error('Error removing world association:', error);
      toast.error('Erreur lors de la dissociation du monde');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('dossier_client_info')
        .update(formData)
        .eq('id', clientId);

      if (error) throw error;

      toast.success('Fiche client mise à jour avec succès');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erreur lors de la mise à jour de la fiche client');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ClientInfo, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (fetching) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la fiche client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type de client */}
          <div className="space-y-2">
            <Label htmlFor="client_type">Type de client *</Label>
            <Select
              value={formData.client_type}
              onValueChange={(value) => handleInputChange('client_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="locataire">Locataire</SelectItem>
                <SelectItem value="proprietaire">Propriétaire</SelectItem>
                <SelectItem value="proprietaire_non_occupant">Propriétaire non occupant</SelectItem>
                <SelectItem value="professionnel">Professionnel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Informations personnelles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={formData.nom || ''}
                onChange={(e) => handleInputChange('nom', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input
                id="prenom"
                value={formData.prenom || ''}
                onChange={(e) => handleInputChange('prenom', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                value={formData.telephone || ''}
                onChange={(e) => handleInputChange('telephone', e.target.value)}
              />
            </div>
          </div>

          {/* Adresse client */}
          <div className="space-y-2">
            <Label htmlFor="adresse_client">Adresse du client</Label>
            <Input
              id="adresse_client"
              value={formData.adresse_client || ''}
              onChange={(e) => handleInputChange('adresse_client', e.target.value)}
            />
          </div>

          {/* Coordonnées du propriétaire (pour locataires uniquement) */}
          {formData.client_type === 'locataire' && (
            <div className="space-y-4 pt-4 border-t bg-amber-50/50 p-4 rounded-lg">
              <h3 className="font-semibold flex items-center gap-2">
                🏠 Coordonnées du propriétaire
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proprietaire_nom">Nom</Label>
                  <Input
                    id="proprietaire_nom"
                    value={formData.proprietaire_nom || ''}
                    onChange={(e) => handleInputChange('proprietaire_nom', e.target.value)}
                    placeholder="Nom du propriétaire"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proprietaire_prenom">Prénom</Label>
                  <Input
                    id="proprietaire_prenom"
                    value={formData.proprietaire_prenom || ''}
                    onChange={(e) => handleInputChange('proprietaire_prenom', e.target.value)}
                    placeholder="Prénom du propriétaire"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proprietaire_telephone">Téléphone</Label>
                  <Input
                    id="proprietaire_telephone"
                    value={formData.proprietaire_telephone || ''}
                    onChange={(e) => handleInputChange('proprietaire_telephone', e.target.value)}
                    placeholder="Téléphone du propriétaire"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proprietaire_email">Email</Label>
                  <Input
                    id="proprietaire_email"
                    type="email"
                    value={formData.proprietaire_email || ''}
                    onChange={(e) => handleInputChange('proprietaire_email', e.target.value)}
                    placeholder="Email du propriétaire"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proprietaire_adresse">Adresse</Label>
                <Input
                  id="proprietaire_adresse"
                  value={formData.proprietaire_adresse || ''}
                  onChange={(e) => handleInputChange('proprietaire_adresse', e.target.value)}
                  placeholder="Adresse du propriétaire"
                />
              </div>
            </div>
          )}

          {/* Informations sinistre */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Informations du sinistre</h3>

            <div className="space-y-2">
              <Label htmlFor="adresse_sinistre">Adresse du sinistre</Label>
              <Input
                id="adresse_sinistre"
                value={formData.adresse_sinistre || ''}
                onChange={(e) => handleInputChange('adresse_sinistre', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type_sinistre">Type de sinistre</Label>
                <Input
                  id="type_sinistre"
                  value={formData.type_sinistre || ''}
                  onChange={(e) => handleInputChange('type_sinistre', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_sinistre">Date du sinistre</Label>
                <Input
                  id="date_sinistre"
                  type="date"
                  value={formData.date_sinistre || ''}
                  onChange={(e) => handleInputChange('date_sinistre', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="compagnie_assurance">Compagnie d'assurance</Label>
                <Input
                  id="compagnie_assurance"
                  value={formData.compagnie_assurance || ''}
                  onChange={(e) => handleInputChange('compagnie_assurance', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero_police">Numéro de police</Label>
                <Input
                  id="numero_police"
                  value={formData.numero_police || ''}
                  onChange={(e) => handleInputChange('numero_police', e.target.value)}
                />
              </div>
            </div>

            {/* Montants */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold text-sm">Montants estimés</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="montant_dommage_batiment">Dommage bâtiment (€)</Label>
                  <Input
                    id="montant_dommage_batiment"
                    type="number"
                    step="0.01"
                    value={formData.montant_dommage_batiment || ''}
                    onChange={(e) =>
                      handleInputChange('montant_dommage_batiment', parseFloat(e.target.value) || null)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="montant_demolition_deblayage">Démolition/Déblayage (€)</Label>
                  <Input
                    id="montant_demolition_deblayage"
                    type="number"
                    step="0.01"
                    value={formData.montant_demolition_deblayage || ''}
                    onChange={(e) =>
                      handleInputChange('montant_demolition_deblayage', parseFloat(e.target.value) || null)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="montant_mise_conformite">Mise en conformité (€)</Label>
                  <Input
                    id="montant_mise_conformite"
                    type="number"
                    step="0.01"
                    value={formData.montant_mise_conformite || ''}
                    onChange={(e) =>
                      handleInputChange('montant_mise_conformite', parseFloat(e.target.value) || null)
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mondes associés */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Mondes associés</h3>
            
            <div className="space-y-2">
              <Label>Monde principal</Label>
              <div className="flex gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => handlePrimaryWorldChange(worlds.find(w => w.code === 'JDE')?.id || '')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    formData.primary_world_id === worlds.find(w => w.code === 'JDE')?.id
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 grayscale opacity-50 hover:opacity-75'
                  }`}
                >
                  <img src={JDELogo} alt="JDE" className="w-16 h-16 object-contain" />
                  <span className="text-sm font-medium">JDE</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrimaryWorldChange(worlds.find(w => w.code === 'JDMO')?.id || '')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    formData.primary_world_id === worlds.find(w => w.code === 'JDMO')?.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 grayscale opacity-50 hover:opacity-75'
                  }`}
                >
                  <img src={JDMOLogo} alt="JDMO" className="w-16 h-16 object-contain" />
                  <span className="text-sm font-medium">JDMO</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrimaryWorldChange(worlds.find(w => w.code === 'DBCS')?.id || '')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    formData.primary_world_id === worlds.find(w => w.code === 'DBCS')?.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 grayscale opacity-50 hover:opacity-75'
                  }`}
                >
                  <img src={DBCSLogo} alt="DBCS" className="w-16 h-16 object-contain" />
                  <span className="text-sm font-medium">DBCS</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mondes additionnels</Label>
              <div className="flex flex-wrap gap-2">
                {associatedWorlds.map((assoc) => (
                  <Badge key={assoc.id} variant="secondary" className="pr-1">
                    {assoc.worlds.name}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-transparent"
                      onClick={() => removeWorldAssociation(assoc.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
                {associatedWorlds.length === 0 && (
                  <span className="text-sm text-muted-foreground">Aucun monde additionnel</span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddWorldDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un monde
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>

        <AddWorldAssociationDialog
          open={showAddWorldDialog}
          onOpenChange={setShowAddWorldDialog}
          clientId={clientId}
          currentWorldIds={[
            primaryWorld?.id,
            ...associatedWorlds.map((a) => a.world_id),
          ].filter(Boolean) as string[]}
          onSuccess={fetchClientData}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditClientDialog;
