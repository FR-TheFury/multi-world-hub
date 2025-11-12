import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, MessageSquare, TrendingUp, User, MapPin, DollarSign, Clock, AlertCircle, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import VerticalWorkflowTimeline from './VerticalWorkflowTimeline';
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
    <div className="space-y-6">
      {/* En-tête du dossier avec infos client */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl">{dossierDetails?.reference || 'Chargement...'}</CardTitle>
              <CardDescription>
                {clientInfo ? `${clientInfo.prenom} ${clientInfo.nom}` : 'Aucune information client'}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">
              {dossierDetails?.worlds?.name || worldId}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Type client</p>
                <p className="text-xs text-muted-foreground">
                  {clientInfo ? getClientTypeLabel(clientInfo.client_type) : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Adresse sinistre</p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {clientInfo?.adresse_sinistre || '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Type sinistre</p>
                <p className="text-xs text-muted-foreground">
                  {clientInfo?.type_sinistre || '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Date sinistre</p>
                <p className="text-xs text-muted-foreground">
                  {clientInfo?.date_sinistre ? format(new Date(clientInfo.date_sinistre), 'dd/MM/yyyy') : '-'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progression du workflow avec barres détaillées */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progression du workflow
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{progressPercentage}%</span>
              <Badge variant="secondary">
                {stats.completedSteps} / {stats.totalSteps} étapes
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Barres de progression par étape */}
          {workflowLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {workflowSteps.slice(0, 5).map((step) => {
                const stepProgress = progress.find((p) => p.workflow_step_id === step.id);
                const isCompleted = stepProgress?.status === 'completed';
                const isInProgress = stepProgress?.status === 'in_progress';
                const progressValue = isCompleted ? 100 : isInProgress ? 50 : 0;
                
                return (
                  <div key={step.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{step.step_name}</span>
                      <Badge variant={isCompleted ? 'default' : isInProgress ? 'secondary' : 'outline'} className="text-xs">
                        {isCompleted ? 'Terminée' : isInProgress ? 'En cours' : 'En attente'}
                      </Badge>
                    </div>
                    <Progress value={progressValue} className="h-2" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Timeline verticale détaillée */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-4">Détails des étapes</h4>
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
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun workflow configuré pour ce monde
              </p>
            ) : (
              <VerticalWorkflowTimeline
                steps={workflowSteps}
                progress={progress}
                dossierId={dossierId}
                onUpdate={() => {
                  fetchOverviewData();
                  fetchWorkflowData();
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grille de résumé avec cartes d'information */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Documents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.documentsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Pièces jointes au dossier</p>
          </CardContent>
        </Card>

        {/* Rendez-vous */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Rendez-vous
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.appointmentsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Planifiés et réalisés</p>
          </CardContent>
        </Card>

        {/* Commentaires */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Commentaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.commentsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Activités et notes</p>
          </CardContent>
        </Card>

        {/* Informations assurance */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Informations assurance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Compagnie</p>
                <p className="text-sm font-medium">{clientInfo?.compagnie_assurance || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Numéro de police</p>
                <p className="text-sm font-medium">{clientInfo?.numero_police || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Durée du dossier */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Durée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {dossierDetails?.created_at
                ? Math.floor((new Date().getTime() - new Date(dossierDetails.created_at).getTime()) / (1000 * 60 * 60 * 24))
                : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Jours depuis création</p>
          </CardContent>
        </Card>
      </div>

      {/* Activité récente */}
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité récente</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.user?.display_name}</p>
                    <p className="text-sm text-muted-foreground">{activity.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <Badge variant="outline">{activity.comment_type}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewTab;
