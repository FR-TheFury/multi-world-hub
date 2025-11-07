import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WorkflowTimeline from './WorkflowTimeline';

interface WorkflowTabProps {
  dossierId: string;
  worldId: string;
}

interface WorkflowStep {
  id: string;
  step_number: number;
  name: string;
  description: string;
  step_type: string;
  requires_decision: boolean;
  form_fields: any;
  metadata: any;
}

interface WorkflowProgress {
  id: string;
  workflow_step_id: string;
  status: string;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  decision_taken: boolean | null;
}

const WorkflowTab = ({ dossierId, worldId }: WorkflowTabProps) => {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [progress, setProgress] = useState<WorkflowProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflowData();
  }, [dossierId, worldId]);

  const fetchWorkflowData = async () => {
    try {
      // Get workflow template for this world
      const { data: templateData } = await supabase
        .from('workflow_templates')
        .select('id')
        .eq('world_id', worldId)
        .eq('is_active', true)
        .single();

      if (!templateData) {
        console.error('No active workflow template found for this world');
        setLoading(false);
        return;
      }

      // Get workflow steps
      const { data: stepsData, error: stepsError } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('workflow_template_id', templateData.id)
        .order('step_number', { ascending: true });

      if (stepsError) throw stepsError;

      // Get progress for this dossier
      const { data: progressData, error: progressError } = await supabase
        .from('dossier_workflow_progress')
        .select('*')
        .eq('dossier_id', dossierId);

      if (progressError) throw progressError;

      setWorkflowSteps(stepsData || []);
      setProgress(progressData || []);

      // If no progress exists, initialize it
      if (!progressData || progressData.length === 0) {
        await initializeWorkflowProgress(dossierId, stepsData || []);
      }
    } catch (error) {
      console.error('Error fetching workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeWorkflowProgress = async (dossierId: string, steps: WorkflowStep[]) => {
    try {
      const progressRecords = steps.map((step) => ({
        dossier_id: dossierId,
        workflow_step_id: step.id,
        status: 'pending' as const,
      }));

      const { error } = await supabase
        .from('dossier_workflow_progress')
        .insert(progressRecords);

      if (error) throw error;

      // Refetch progress after initialization
      const { data: newProgressData } = await supabase
        .from('dossier_workflow_progress')
        .select('*')
        .eq('dossier_id', dossierId);

      setProgress(newProgressData || []);
    } catch (error) {
      console.error('Error initializing workflow progress:', error);
    }
  };

  const handleProgressUpdate = () => {
    fetchWorkflowData();
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

  if (workflowSteps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aucun workflow configuré pour ce monde.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Suivi du workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkflowTimeline
            steps={workflowSteps}
            progress={progress}
            dossierId={dossierId}
            onUpdate={handleProgressUpdate}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowTab;
