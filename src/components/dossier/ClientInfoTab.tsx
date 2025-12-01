import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { User, Edit2, Save, X } from 'lucide-react';

interface ClientInfoTabProps {
  dossierId: string;
}

interface ClientInfo {
  id?: string;
  client_type: 'locataire' | 'proprietaire' | 'proprietaire_non_occupant' | 'professionnel';
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse_sinistre: string;
  type_sinistre: string;
  date_sinistre: string;
  compagnie_assurance: string;
  numero_police: string;
  proprietaire_nom?: string;
  proprietaire_prenom?: string;
  proprietaire_telephone?: string;
  proprietaire_email?: string;
  proprietaire_adresse?: string;
}

const ClientInfoTab = ({ dossierId }: ClientInfoTabProps) => {
  const { user } = useAuthStore();
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClientInfo();
  }, [dossierId]);

  const fetchClientInfo = async () => {
    try {
      // First, get dossier to check if it has a client_info_id reference
      const { data: dossier } = await supabase
        .from('dossiers')
        .select('client_info_id')
        .eq('id', dossierId)
        .single();

      let clientData = null;

      if (dossier?.client_info_id) {
        // Use the referenced client file
        const { data } = await supabase
          .from('dossier_client_info')
          .select('*')
          .eq('id', dossier.client_info_id)
          .single();
        clientData = data;
      } else {
        // Fallback to old method (for existing dossiers created before migration)
        const { data } = await supabase
          .from('dossier_client_info')
          .select('*')
          .eq('dossier_id', dossierId)
          .maybeSingle();
        clientData = data;
      }
      
      if (clientData) {
        setClientInfo(clientData);
      } else {
        // Initialize empty form
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
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error fetching client info:', error);
      toast.error('Erreur lors du chargement des informations client');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clientInfo) return;

    setSaving(true);
    try {
      if (clientInfo.id) {
        // Update existing
        const { error } = await supabase
          .from('dossier_client_info')
          .update(clientInfo)
          .eq('id', clientInfo.id);

        if (error) throw error;
      } else {
        // Create new
        const insertData: any = {
          ...clientInfo,
          dossier_id: dossierId,
        };
        delete insertData.id;
        
        const { error } = await supabase
          .from('dossier_client_info')
          .insert(insertData);

        if (error) throw error;
      }

      toast.success('Informations client enregistrées');
      setIsEditing(false);
      fetchClientInfo();
    } catch (error: any) {
      console.error('Error saving client info:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    fetchClientInfo();
  };

  const getClientTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      locataire: 'Locataire',
      proprietaire: 'Propriétaire',
      proprietaire_non_occupant: 'Propriétaire non occupant',
      professionnel: 'Professionnel',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!clientInfo) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Aucune information client disponible</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations du client
            </CardTitle>
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Client Type */}
            <div className="space-y-2">
              <Label htmlFor="client_type">Type de client</Label>
              {isEditing ? (
                <Select
                  value={clientInfo.client_type}
                  onValueChange={(value) =>
                    setClientInfo({ ...clientInfo, client_type: value as any })
                  }
                >
                  <SelectTrigger id="client_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="locataire">Locataire</SelectItem>
                    <SelectItem value="proprietaire">Propriétaire</SelectItem>
                    <SelectItem value="proprietaire_non_occupant">
                      Propriétaire non occupant
                    </SelectItem>
                    <SelectItem value="professionnel">Professionnel</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary">{getClientTypeLabel(clientInfo.client_type)}</Badge>
              )}
            </div>

            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                value={clientInfo.nom}
                onChange={(e) => setClientInfo({ ...clientInfo, nom: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {/* Prénom */}
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom</Label>
              <Input
                id="prenom"
                value={clientInfo.prenom}
                onChange={(e) => setClientInfo({ ...clientInfo, prenom: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                type="tel"
                value={clientInfo.telephone}
                onChange={(e) => setClientInfo({ ...clientInfo, telephone: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {/* Email */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={clientInfo.email}
                onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {/* Adresse sinistre */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="adresse_sinistre">Adresse du sinistre</Label>
              <Input
                id="adresse_sinistre"
                value={clientInfo.adresse_sinistre}
                onChange={(e) =>
                  setClientInfo({ ...clientInfo, adresse_sinistre: e.target.value })
                }
                disabled={!isEditing}
              />
            </div>

            {/* Type sinistre */}
            <div className="space-y-2">
              <Label htmlFor="type_sinistre">Type de sinistre</Label>
              <Input
                id="type_sinistre"
                value={clientInfo.type_sinistre}
                onChange={(e) =>
                  setClientInfo({ ...clientInfo, type_sinistre: e.target.value })
                }
                disabled={!isEditing}
              />
            </div>

            {/* Date sinistre */}
            <div className="space-y-2">
              <Label htmlFor="date_sinistre">Date du sinistre</Label>
              <Input
                id="date_sinistre"
                type="date"
                value={clientInfo.date_sinistre}
                onChange={(e) =>
                  setClientInfo({ ...clientInfo, date_sinistre: e.target.value })
                }
                disabled={!isEditing}
              />
            </div>

            {/* Compagnie assurance */}
            <div className="space-y-2">
              <Label htmlFor="compagnie_assurance">Compagnie d'assurance</Label>
              <Input
                id="compagnie_assurance"
                value={clientInfo.compagnie_assurance}
                onChange={(e) =>
                  setClientInfo({ ...clientInfo, compagnie_assurance: e.target.value })
                }
                disabled={!isEditing}
              />
            </div>

            {/* Numéro police */}
            <div className="space-y-2">
              <Label htmlFor="numero_police">Numéro de police</Label>
              <Input
                id="numero_police"
                value={clientInfo.numero_police}
                onChange={(e) =>
                  setClientInfo({ ...clientInfo, numero_police: e.target.value })
                }
                disabled={!isEditing}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Landlord Information - Only for Tenants */}
      {clientInfo.client_type === 'locataire' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Coordonnées du propriétaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="proprietaire_nom">Nom</Label>
                <Input
                  id="proprietaire_nom"
                  value={clientInfo.proprietaire_nom || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, proprietaire_nom: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proprietaire_prenom">Prénom</Label>
                <Input
                  id="proprietaire_prenom"
                  value={clientInfo.proprietaire_prenom || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, proprietaire_prenom: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proprietaire_telephone">Téléphone</Label>
                <Input
                  id="proprietaire_telephone"
                  type="tel"
                  value={clientInfo.proprietaire_telephone || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, proprietaire_telephone: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proprietaire_email">Email</Label>
                <Input
                  id="proprietaire_email"
                  type="email"
                  value={clientInfo.proprietaire_email || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, proprietaire_email: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="proprietaire_adresse">Adresse</Label>
                <Input
                  id="proprietaire_adresse"
                  value={clientInfo.proprietaire_adresse || ''}
                  onChange={(e) =>
                    setClientInfo({ ...clientInfo, proprietaire_adresse: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClientInfoTab;
