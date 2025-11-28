import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const [clientMode, setClientMode] = useState<'none' | 'new' | 'existing'>('none');
  const [existingClients, setExistingClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    tags: '',
  });
  const [clientInfo, setClientInfo] = useState({
    client_type: 'locataire',
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse_sinistre: '',
    type_sinistre: '',
    date_sinistre: '',
    compagnie_assurance: '',
    numero_police: '',
    proprietaire_nom: '',
    proprietaire_prenom: '',
    proprietaire_telephone: '',
    proprietaire_email: '',
    proprietaire_adresse: '',
  });

  // Fetch existing clients when dialog opens
  useEffect(() => {
    if (open && worldId) {
      fetchExistingClients();
    }
  }, [open, worldId]);

  const fetchExistingClients = async () => {
    try {
      // Récupérer les clients avec primary_world_id = worldId
      const { data: primaryClients } = await supabase
        .from('dossier_client_info')
        .select('id, nom, prenom, email, telephone, dossier_id, primary_world_id')
        .eq('primary_world_id', worldId)
        .is('dossier_id', null)
        .order('nom');

      // Récupérer les clients associés via client_world_associations
      const { data: associatedClients } = await supabase
        .from('client_world_associations')
        .select(`
          client_id,
          dossier_client_info!inner(id, nom, prenom, email, telephone, dossier_id)
        `)
        .eq('world_id', worldId);

      // Fusionner et dédupliquer les résultats
      const associatedClientData = associatedClients?.map(a => a.dossier_client_info).filter(Boolean) || [];
      const allClients = [
        ...(primaryClients || []),
        ...associatedClientData
      ];

      // Dédupliquer par ID et filtrer les fiches sans dossier_id (fiches client indépendantes)
      const uniqueClients = allClients.reduce((acc: any[], client: any) => {
        if (!acc.find(c => c.id === client.id) && !client.dossier_id) {
          acc.push(client);
        }
        return acc;
      }, []);

      setExistingClients(uniqueClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

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
          const progressRecords = stepsData.map((step, index) => ({
            dossier_id: dossierData.id,
            workflow_step_id: step.id,
            status: index === 0 ? ('in_progress' as const) : ('pending' as const),
            started_at: index === 0 ? new Date().toISOString() : null,
          }));

          await supabase.from('dossier_workflow_progress').insert(progressRecords);
        }
      }

      // Handle client info based on mode
      if (clientMode === 'new') {
        await supabase.from('dossier_client_info').insert({
          dossier_id: dossierData.id,
          client_type: clientInfo.client_type as any,
          nom: clientInfo.nom || null,
          prenom: clientInfo.prenom || null,
          telephone: clientInfo.telephone || null,
          email: clientInfo.email || null,
          adresse_sinistre: clientInfo.adresse_sinistre || null,
          type_sinistre: clientInfo.type_sinistre || null,
          date_sinistre: clientInfo.date_sinistre || null,
          compagnie_assurance: clientInfo.compagnie_assurance || null,
          numero_police: clientInfo.numero_police || null,
          proprietaire_nom: clientInfo.client_type === 'locataire' ? clientInfo.proprietaire_nom || null : null,
          proprietaire_prenom: clientInfo.client_type === 'locataire' ? clientInfo.proprietaire_prenom || null : null,
          proprietaire_telephone: clientInfo.client_type === 'locataire' ? clientInfo.proprietaire_telephone || null : null,
          proprietaire_email: clientInfo.client_type === 'locataire' ? clientInfo.proprietaire_email || null : null,
          proprietaire_adresse: clientInfo.client_type === 'locataire' ? clientInfo.proprietaire_adresse || null : null,
        });
      } else if (clientMode === 'existing' && selectedClientId) {
        // Copy existing client info to new dossier
        const { data: existingClient } = await supabase
          .from('dossier_client_info')
          .select('*')
          .eq('id', selectedClientId)
          .single();
        
        if (existingClient) {
          await supabase.from('dossier_client_info').insert({
            dossier_id: dossierData.id,
            client_type: existingClient.client_type,
            nom: existingClient.nom,
            prenom: existingClient.prenom,
            telephone: existingClient.telephone,
            email: existingClient.email,
            adresse_sinistre: existingClient.adresse_sinistre,
            type_sinistre: existingClient.type_sinistre,
            date_sinistre: existingClient.date_sinistre,
            compagnie_assurance: existingClient.compagnie_assurance,
            numero_police: existingClient.numero_police,
          });
        }
      }

      toast.success('Dossier créé avec succès');
      setFormData({ title: '', tags: '' });
      setClientMode('none');
      setSelectedClientId('');
      setClientInfo({
        client_type: 'locataire',
        nom: '',
        prenom: '',
        telephone: '',
        email: '',
        adresse_sinistre: '',
        type_sinistre: '',
        date_sinistre: '',
        compagnie_assurance: '',
        numero_police: '',
        proprietaire_nom: '',
        proprietaire_prenom: '',
        proprietaire_telephone: '',
        proprietaire_email: '',
        proprietaire_adresse: '',
      });
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
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl">Créer un nouveau dossier</DialogTitle>
          <DialogDescription className="text-base">
            Remplissez les informations pour créer un nouveau dossier
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 p-6 max-h-[75vh] overflow-y-auto">
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

            {/* Client Mode Selection */}
            <div className="space-y-4 p-5 border rounded-lg bg-muted/30">
              <Label className="text-base font-semibold">Fiche Client</Label>
              <p className="text-sm text-muted-foreground">
                Choisissez comment associer un client à ce dossier
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  variant={clientMode === 'none' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setClientMode('none')}
                  disabled={loading}
                >
                  Passer cette étape
                </Button>
                <Button
                  type="button"
                  variant={clientMode === 'new' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setClientMode('new')}
                  disabled={loading}
                >
                  Créer une nouvelle fiche client
                </Button>
                <Button
                  type="button"
                  variant={clientMode === 'existing' ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setClientMode('existing')}
                  disabled={loading}
                >
                  Associer une fiche existante
                </Button>
              </div>
            </div>

            {/* Select Existing Client */}
            {clientMode === 'existing' && (
              <div className="space-y-3 p-4 border rounded-lg bg-accent/5">
                <Label htmlFor="existing-client">Sélectionner un client existant</Label>
                {existingClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Aucune fiche client associée à ce monde. Créez d'abord une fiche dans "Fiches Clients".
                  </p>
                ) : (
                  <Select
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                    disabled={loading}
                  >
                    <SelectTrigger id="existing-client">
                      <SelectValue placeholder="Choisir un client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.prenom} {client.nom} {client.email && `(${client.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Client Info Form */}
            {clientMode === 'new' && (
              <div className="space-y-5 p-5 border rounded-lg bg-accent/5">
                <h4 className="font-semibold text-base">Informations Client</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client_type">Type de client</Label>
                    <Select
                      value={clientInfo.client_type}
                      onValueChange={(value) => setClientInfo({ ...clientInfo, client_type: value })}
                      disabled={loading}
                    >
                      <SelectTrigger id="client_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="locataire">Locataire</SelectItem>
                        <SelectItem value="proprietaire">Propriétaire</SelectItem>
                        <SelectItem value="proprietaire_non_occupant">Propriétaire non occupant</SelectItem>
                        <SelectItem value="professionnel">Professionnel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom</Label>
                    <Input
                      id="nom"
                      value={clientInfo.nom}
                      onChange={(e) => setClientInfo({ ...clientInfo, nom: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom</Label>
                    <Input
                      id="prenom"
                      value={clientInfo.prenom}
                      onChange={(e) => setClientInfo({ ...clientInfo, prenom: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      type="tel"
                      value={clientInfo.telephone}
                      onChange={(e) => setClientInfo({ ...clientInfo, telephone: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={clientInfo.email}
                      onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adresse_sinistre">Adresse du sinistre</Label>
                    <Input
                      id="adresse_sinistre"
                      value={clientInfo.adresse_sinistre}
                      onChange={(e) => setClientInfo({ ...clientInfo, adresse_sinistre: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type_sinistre">Type de sinistre</Label>
                    <Input
                      id="type_sinistre"
                      value={clientInfo.type_sinistre}
                      onChange={(e) => setClientInfo({ ...clientInfo, type_sinistre: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date_sinistre">Date du sinistre</Label>
                    <Input
                      id="date_sinistre"
                      type="date"
                      value={clientInfo.date_sinistre}
                      onChange={(e) => setClientInfo({ ...clientInfo, date_sinistre: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compagnie_assurance">Compagnie d'assurance</Label>
                    <Input
                      id="compagnie_assurance"
                      value={clientInfo.compagnie_assurance}
                      onChange={(e) => setClientInfo({ ...clientInfo, compagnie_assurance: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero_police">N° de police</Label>
                    <Input
                      id="numero_police"
                      value={clientInfo.numero_police}
                      onChange={(e) => setClientInfo({ ...clientInfo, numero_police: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Landlord Info - Only for Tenants */}
                {clientInfo.client_type === 'locataire' && (
                  <div className="border-t pt-4 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-lg mt-4">
                    <h4 className="font-semibold text-base mb-4">Coordonnées du propriétaire</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="proprietaire_nom">Nom</Label>
                        <Input
                          id="proprietaire_nom"
                          value={clientInfo.proprietaire_nom}
                          onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_nom: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proprietaire_prenom">Prénom</Label>
                        <Input
                          id="proprietaire_prenom"
                          value={clientInfo.proprietaire_prenom}
                          onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_prenom: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="proprietaire_telephone">Téléphone</Label>
                        <Input
                          id="proprietaire_telephone"
                          type="tel"
                          value={clientInfo.proprietaire_telephone}
                          onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_telephone: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="proprietaire_email">Email</Label>
                        <Input
                          id="proprietaire_email"
                          type="email"
                          value={clientInfo.proprietaire_email}
                          onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_email: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="proprietaire_adresse">Adresse</Label>
                        <Input
                          id="proprietaire_adresse"
                          value={clientInfo.proprietaire_adresse}
                          onChange={(e) => setClientInfo({ ...clientInfo, proprietaire_adresse: e.target.value })}
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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
            <Button type="submit" disabled={loading || !formData.title.trim()} className="bg-primary hover:bg-primary/90">
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
