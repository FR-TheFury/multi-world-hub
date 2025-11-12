import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, MessageSquare, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import HorizontalWorkflowTimeline from './HorizontalWorkflowTimeline';
import { Skeleton } from '@/components/ui/skeleton';

interface OverviewTabProps {
  dossierId: string;
  worldId: string;
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

  useEffect(() => {
    fetchOverviewData();
    fetchWorkflowData();
  }, [dossierId]);

  const fetchOverviewData = async () => {
    try {
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

  return (
    <div className="space-y-6">
      {/* Progress Card with Horizontal Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Progression globale
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{progressPercentage}%</span>
              <Badge variant="secondary">
                {stats.completedSteps} / {stats.totalSteps} étapes
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {workflowLoading ? (
            <div className="flex items-center gap-4 overflow-x-auto pb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  {i < 5 && <div className="w-16 h-0.5 bg-muted" />}
                </div>
              ))}
            </div>
          ) : workflowSteps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun workflow configuré pour ce monde
            </p>
          ) : (
            <HorizontalWorkflowTimeline
              steps={workflowSteps}
              progress={progress}
              dossierId={dossierId}
              onUpdate={() => {
                fetchOverviewData();
                fetchWorkflowData();
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documentsCount}</div>
            <p className="text-xs text-muted-foreground">Pièces jointes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rendez-vous</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.appointmentsCount}</div>
            <p className="text-xs text-muted-foreground">Planifiés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commentaires</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.commentsCount}</div>
            <p className="text-xs text-muted-foreground">Activités</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
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
