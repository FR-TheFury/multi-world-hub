import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  Phone,
  User,
  FileText,
  Send,
  HelpCircle,
  Calendar,
  Clipboard,
  GitBranch,
  ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WorkflowTimelineProps {
  steps: any[];
  progress: any[];
  dossierId: string;
  onUpdate: () => void;
}

const WorkflowTimeline = ({ steps, progress, dossierId, onUpdate }: WorkflowTimelineProps) => {
  const { user } = useAuthStore();
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const getStepProgress = (stepId: string) => {
    return progress.find((p) => p.workflow_step_id === stepId);
  };

  const getStepIcon = (stepType: string, status: string) => {
    const iconClass = "h-5 w-5";
    
    if (status === 'completed') {
      return <CheckCircle2 className={`${iconClass} text-green-500`} />;
    }
    if (status === 'in_progress') {
      return <Clock className={`${iconClass} text-blue-500`} />;
    }
    if (status === 'blocked') {
      return <XCircle className={`${iconClass} text-red-500`} />;
    }

    const icons: Record<string, any> = {
      action: Clipboard,
      decision: HelpCircle,
      document: FileText,
      meeting: Calendar,
      notification: Send,
    };

    const Icon = icons[stepType] || Circle;
    return <Icon className={`${iconClass} text-muted-foreground`} />;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      completed: { variant: 'default', label: 'Complété' },
      in_progress: { variant: 'secondary', label: 'En cours' },
      pending: { variant: 'outline', label: 'En attente' },
      skipped: { variant: 'outline', label: 'Ignoré' },
      blocked: { variant: 'destructive', label: 'Bloqué' },
    };

    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleStepClick = (stepId: string) => {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  };

  const handleCompleteStep = async (step: any, progressRecord: any) => {
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
          stepId: step.id,
          notes: formData[step.id]?.notes || null,
          formData: formData[step.id] || {}
        }
      });

      if (response.error) throw response.error;

      toast.success('Étape complétée');
      setExpandedStep(null);
      setFormData({});
      onUpdate();
    } catch (error: any) {
      console.error('Error completing step:', error);
      toast.error('Erreur lors de la complétion de l\'étape');
    }
  };

  const handleDecision = async (step: any, progressRecord: any, decision: boolean) => {
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
          stepId: step.id,
          decision,
          notes: formData[step.id]?.notes || null,
          formData: formData[step.id] || {}
        }
      });

      if (response.error) throw response.error;

      toast.success(`Décision enregistrée: ${decision ? 'Oui' : 'Non'}`);
      setExpandedStep(null);
      setFormData({});
      onUpdate();
    } catch (error: any) {
      console.error('Error recording decision:', error);
      toast.error('Erreur lors de l\'enregistrement de la décision');
    }
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

  const renderFormField = (field: any, stepId: string) => {
    const fieldId = `${stepId}_${field.name}`;
    if (!field || !field.type) return null;

    switch (field.type) {
      case 'textarea':
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId}>{field.label}</Label>
            <Textarea
              id={fieldId}
              required={field.required}
              value={formData[stepId]?.[field.name] || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  [stepId]: { ...formData[stepId], [field.name]: e.target.value },
                })
              }
            />
          </div>
        );
      
      case 'select':
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId}>{field.label}</Label>
            <Select
              value={formData[stepId]?.[field.name] || ''}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  [stepId]: { ...formData[stepId], [field.name]: value },
                })
              }
            >
              <SelectTrigger id={fieldId}>
                <SelectValue placeholder="Sélectionnez..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return (
          <div key={fieldId} className="space-y-2">
            <Label htmlFor={fieldId}>{field.label}</Label>
            <Input
              id={fieldId}
              type={field.type}
              required={field.required}
              value={formData[stepId]?.[field.name] || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  [stepId]: { ...formData[stepId], [field.name]: e.target.value },
                })
              }
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const progressRecord = getStepProgress(step.id);
        const isExpanded = expandedStep === step.id;
        const canInteract = progressRecord?.status !== 'completed';
        const nextSteps = getNextStepInfo(step);

        return (
          <Card
            key={step.id}
            className={`cursor-pointer transition-all ${
              isExpanded ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => canInteract && handleStepClick(step.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  {getStepIcon(step.step_type, progressRecord?.status)}
                  {index < steps.length - 1 && (
                    <div className="w-0.5 h-12 bg-muted mt-2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Étape {step.step_number}
                      </span>
                      <h4 className="font-semibold">{step.name}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {progressRecord && getStatusBadge(progressRecord.status)}
                      {step.is_optional && (
                        <Badge variant="outline" className="text-xs">Optionnel</Badge>
                      )}
                      {step.requires_decision && (
                        <Badge variant="secondary" className="text-xs">
                          <GitBranch className="h-3 w-3 mr-1" />
                          Décision
                        </Badge>
                      )}
                    </div>
                  </div>

                  {step.description && (
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  )}

                  {/* Show branches if decision step */}
                  {step.requires_decision && (nextSteps.yes || nextSteps.no) && (
                    <div className="mt-3 space-y-2 text-xs">
                      {nextSteps.yes && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <ArrowRight className="h-3 w-3" />
                          <span>Si Oui → {nextSteps.yes.name}</span>
                        </div>
                      )}
                      {nextSteps.no && (
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <ArrowRight className="h-3 w-3" />
                          <span>Si Non → {nextSteps.no.name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show next step if linear */}
                  {!step.requires_decision && nextSteps.next && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      <span>Ensuite → {nextSteps.next.name}</span>
                    </div>
                  )}

                  {/* Show parallel steps if any */}
                  {step.parallel_steps && step.parallel_steps.length > 0 && (
                    <div className="mt-3 text-xs">
                      <Badge variant="outline" className="text-xs">
                        {step.parallel_steps.length} étapes parallèles
                      </Badge>
                    </div>
                  )}

                  {progressRecord?.completed_at && (
                    <p className="text-xs text-muted-foreground">
                      Complété le {format(new Date(progressRecord.completed_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      {progressRecord.decision_taken !== null && (
                        <span className="ml-2 font-medium">
                          • Décision: {progressRecord.decision_taken ? 'Oui' : 'Non'}
                        </span>
                      )}
                    </p>
                  )}

                  {/* Expanded form */}
                  {isExpanded && canInteract && (
                    <div className="mt-4 space-y-4 pt-4 border-t" onClick={(e) => e.stopPropagation()}>
                      {step.form_fields && Array.isArray(step.form_fields) && step.form_fields.length > 0 && (
                        <div className="space-y-4">
                          {step.form_fields.map((field: any, idx: number) => (
                            <div key={`${step.id}_${idx}`}>
                              {renderFormField(field, step.id)}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor={`notes_${step.id}`}>Notes (optionnel)</Label>
                        <Textarea
                          id={`notes_${step.id}`}
                          placeholder="Ajoutez des notes..."
                          value={formData[step.id]?.notes || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [step.id]: { ...formData[step.id], notes: e.target.value },
                            })
                          }
                        />
                      </div>

                      <div className="flex gap-2">
                        {step.requires_decision ? (
                          <>
                            <Button
                              onClick={() => handleDecision(step, progressRecord, true)}
                              className="flex-1"
                            >
                              Oui
                            </Button>
                            <Button
                              onClick={() => handleDecision(step, progressRecord, false)}
                              variant="outline"
                              className="flex-1"
                            >
                              Non
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => handleCompleteStep(step, progressRecord)}
                            className="flex-1"
                          >
                            Marquer comme complété
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default WorkflowTimeline;
