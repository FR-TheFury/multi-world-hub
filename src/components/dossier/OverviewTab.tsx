import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, MessageSquare, TrendingUp, User, MapPin, DollarSign, Clock, AlertCircle, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EnrichedDossierTimeline } from './EnrichedDossierTimeline';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface OverviewTabProps {
  dossierId: string;
  worldId: string;
}

interface ClientInfo {
  client_type: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse_sinistre: string;
  type_sinistre: string;
  date_sinistre: string;
  compagnie_assurance: string;
  numero_police: string;
}

const OverviewTab = ({ dossierId, worldId }: OverviewTabProps) => {
  const [stats, setStats] = useState({
    totalSteps: 0,
    completedSteps: 0,
    documentsCount: 0,
    commentsCount: 0,
    appointmentsCount: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [workflowSteps, setWorkflowSteps] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [dossierDetails, setDossierDetails] = useState<any>(null);

  useEffect(() => {
    fetchOverviewData();
    fetchWorkflowData();
  }, [dossierId]);

  const fetchOverviewData = async () => {
    try {
      // Fetch dossier details
      const { data: dossier } = await supabase
        .from('dossiers')
        .select('*, worlds(name)')
        .eq('id', dossierId)
        .single();
      
      setDossierDetails(dossier);

      // Fetch client info
      const { data: client } = await supabase
        .from('dossier_client_info')
        .select('*')
        .eq('dossier_id', dossierId)
        .maybeSingle();
      
      setClientInfo(client);

      // Fetch workflow progress
      const { data: workflowData } = await supabase
        .from('dossier_workflow_progress')
        .select('status, workflow_step_id')
        .eq('dossier_id', dossierId);

      // Fetch documents count
      const { count: docsCount } = await supabase
        .from('dossier_attachments')
        .select('*', { count: 'exact', head: true })
        .eq('dossier_id', dossierId);

      // Fetch comments count
      const { count: commentsCount } = await supabase
        .from('dossier_comments')
        .select('*', { count: 'exact', head: true })
        .eq('dossier_id', dossierId);

      // Fetch appointments count
      const { count: appointmentsCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('dossier_id', dossierId);

      // Fetch recent comments for activity
      const { data: recentComments } = await supabase
        .from('dossier_comments')
        .select(`
          *,
          user:profiles(display_name)
        `)
        .eq('dossier_id', dossierId)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalSteps: workflowData?.length || 0,
        completedSteps: workflowData?.filter((s) => s.status === 'completed').length || 0,
        documentsCount: docsCount || 0,
        commentsCount: commentsCount || 0,
        appointmentsCount: appointmentsCount || 0,
      });

      setRecentActivity(recentComments || []);
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowData = async () => {
    setWorkflowLoading(true);
    try {
      // Fetch workflow template
      const { data: template } = await supabase
        .from('workflow_templates')
        .select('id')
        .eq('world_id', worldId)
        .eq('is_active', true)
        .single();

      if (!template) {
        setWorkflowLoading(false);
        return;
      }

      // Fetch workflow steps
      const { data: steps } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('workflow_template_id', template.id)
        .order('step_number');

      // Fetch dossier progress
      const { data: progressData } = await supabase
        .from('dossier_workflow_progress')
        .select('*')
        .eq('dossier_id', dossierId);

      setWorkflowSteps(steps || []);
      setProgress(progressData || []);
    } catch (error) {
      console.error('Error fetching workflow data:', error);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const progressPercentage = stats.totalSteps > 0
    ? Math.round((stats.completedSteps / stats.totalSteps) * 100)
    : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getClientTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      locataire: 'Locataire',
      proprietaire: 'Propriétaire',
      proprietaire_non_occupant: 'Propriétaire non occupant',
      professionnel: 'Professionnel',
    };
    return labels[type] || type;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6 p-6">
      {/* COLONNE GAUCHE - Informations détaillées */}
      <div className="space-y-6">
        
        {/* En-tête du dossier */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-1">{dossierDetails?.reference || 'Chargement...'}</CardTitle>
                <CardDescription className="text-sm">
                  {clientInfo ? `${clientInfo.prenom} ${clientInfo.nom}` : 'Aucune information client'}
                </CardDescription>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Dossier {dossierDetails?.worlds?.name || worldId} • Type: {clientInfo ? getClientTypeLabel(clientInfo.client_type) : '-'}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Informations Client */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base mb-1">Informations Client</CardTitle>
                <CardDescription className="text-xs">
                  Détails du sinistré et coordonnées
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Téléphone</p>
                <p className="font-medium">{clientInfo?.telephone || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium truncate">{clientInfo?.email || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Adresse du sinistre</p>
                <p className="font-medium">{clientInfo?.adresse_sinistre || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations Sinistre */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base mb-1">Détails du Sinistre</CardTitle>
                <CardDescription className="text-xs">
                  Nature et date de l'événement
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Type de sinistre</p>
                <p className="font-medium">{clientInfo?.type_sinistre || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date du sinistre</p>
                <p className="font-medium">
                  {clientInfo?.date_sinistre ? format(new Date(clientInfo.date_sinistre), 'dd/MM/yyyy') : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progression Globale */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base mb-1">Progression Globale</CardTitle>
                    <CardDescription className="text-xs">
                      {stats.completedSteps} étapes terminées sur {stats.totalSteps}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-500">{progressPercentage}%</div>
                    <Badge variant="secondary" className="mt-1">En cours</Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="h-2" />
          </CardContent>
        </Card>

        {/* Statistiques */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base mb-1">Statistiques</CardTitle>
                <CardDescription className="text-xs">
                  Documents, rendez-vous et commentaires
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">{stats.documentsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Documents</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">{stats.appointmentsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Rendez-vous</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-500">{stats.commentsCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Commentaires</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations Assurance */}
        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-cyan-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base mb-1">Assurance</CardTitle>
                <CardDescription className="text-xs">
                  Compagnie et numéro de police
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Compagnie</p>
                <p className="font-medium">{clientInfo?.compagnie_assurance || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">N° de police</p>
                <p className="font-medium">{clientInfo?.numero_police || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informations Générales */}
        <Card className="border-l-4 border-l-pink-500">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-pink-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base mb-1">Informations Générales</CardTitle>
                <CardDescription className="text-xs">
                  Dates et durées importantes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Créé le</p>
                <p className="font-medium">
                  {dossierDetails?.created_at ? format(new Date(dossierDetails.created_at), 'dd/MM/yy') : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Durée</p>
                <p className="font-medium">
                  {dossierDetails?.created_at
                    ? `${Math.floor((new Date().getTime() - new Date(dossierDetails.created_at).getTime()) / (1000 * 60 * 60 * 24))} j`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Statut</p>
                <Badge variant="secondary" className="text-xs">Actif</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* COLONNE DROITE - Timeline du workflow */}
      <div className="space-y-4">
        <div className="sticky top-6">
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                Timeline Enrichie
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workflowLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : workflowSteps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun workflow configuré pour ce monde
                </p>
              ) : (
                <EnrichedDossierTimeline
                  dossierId={dossierId}
                  steps={workflowSteps}
                  progress={progress}
                  onUpdate={() => {
                    fetchOverviewData();
                    fetchWorkflowData();
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
