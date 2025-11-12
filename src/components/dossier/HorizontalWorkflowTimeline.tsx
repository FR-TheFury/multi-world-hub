import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import WorkflowStepCircle from './WorkflowStepCircle';
import WorkflowStepDetails from './WorkflowStepDetails';

interface HorizontalWorkflowTimelineProps {
  steps: any[];
  progress: any[];
  dossierId: string;
  onUpdate: () => void;
}

const HorizontalWorkflowTimeline = ({ steps, progress, dossierId, onUpdate }: HorizontalWorkflowTimelineProps) => {
  const { user } = useAuthStore();
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStepProgress = (stepId: string) => {
    return progress.find((p) => p.workflow_step_id === stepId);
  };

  const getSelectedStepData = () => {
    return steps.find(s => s.id === selectedStep);
  };

  const getNextStepInfo = (step: any) => {
    if (step.requires_decision) {
      return {
        yes: steps.find(s => s.id === step.decision_yes_next_step_id),
        no: steps.find(s => s.id === step.decision_no_next_step_id)
      };
    }
    return {
      next: steps.find(s => s.id === step.next_step_id)
    };
  };

  const handleStepClick = (stepId: string) => {
    const progressRecord = getStepProgress(stepId);
    if (progressRecord?.status === 'completed') {
      // Allow viewing completed steps
      setSelectedStep(selectedStep === stepId ? null : stepId);
    } else {
      setSelectedStep(selectedStep === stepId ? null : stepId);
    }
  };

  const handleCompleteStep = async (stepId: string, stepFormData?: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Non authentifié');
        return;
      }

      const response = await supabase.functions.invoke('workflow-engine', {
        body: {
          action: 'complete_step',
          dossierId,
          stepId,
          notes: null,
          formData: stepFormData || {}
        }
      });

      if (response.error) throw response.error;

      toast.success('Étape complétée avec succès');
      setSelectedStep(null);
      onUpdate();
    } catch (error: any) {
      console.error('Error completing step:', error);
      toast.error('Erreur lors de la complétion de l\'étape');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecision = async (stepId: string, decision: boolean, notes: string, stepFormData?: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Non authentifié');
        return;
      }

      const response = await supabase.functions.invoke('workflow-engine', {
        body: {
          action: 'complete_step',
          dossierId,
          stepId,
          decision,
          notes: notes || null,
          formData: stepFormData || {}
        }
      });

      if (response.error) throw response.error;

      toast.success(`Décision "${decision ? 'OUI' : 'NON'}" enregistrée`);
      setSelectedStep(null);
      onUpdate();
    } catch (error: any) {
      console.error('Error recording decision:', error);
      toast.error('Erreur lors de l\'enregistrement de la décision');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStepData = getSelectedStepData();
  const selectedStepProgress = selectedStep ? getStepProgress(selectedStep) : null;

  return (
    <div className="space-y-6 relative">
      {/* Horizontal Timeline */}
      <div className="relative w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        <div className="flex items-center gap-4 px-4 py-2">
          {steps.map((step, index) => {
            const progressRecord = getStepProgress(step.id);
            const isActive = selectedStep === step.id;
            const isLast = index === steps.length - 1;

            return (
              <WorkflowStepCircle
                key={step.id}
                step={step}
                progress={progressRecord}
                isActive={isActive}
                onClick={() => handleStepClick(step.id)}
                isLast={isLast}
              />
            );
          })}
        </div>
      </div>

      {/* Details Panel */}
      {selectedStep && selectedStepData && (
        <WorkflowStepDetails
          step={selectedStepData}
          progress={selectedStepProgress}
          onComplete={handleCompleteStep}
          onDecision={handleDecision}
          isSubmitting={isSubmitting}
          nextSteps={getNextStepInfo(selectedStepData)}
          onClose={() => setSelectedStep(null)}
        />
      )}
    </div>
  );
};

export default HorizontalWorkflowTimeline;
