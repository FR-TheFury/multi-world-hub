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
      const { error } = await supabase
        .from('dossier_workflow_progress')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
          notes: formData[step.id]?.notes || null,
        })
        .eq('id', progressRecord.id);

      if (error) throw error;

      // Add comment
      await supabase.from('dossier_comments').insert({
        dossier_id: dossierId,
        user_id: user?.id,
        comment_type: 'step_completed',
        content: `Étape "${step.name}" complétée`,
        metadata: { step_id: step.id, step_number: step.step_number },
      });

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
      const { error } = await supabase
        .from('dossier_workflow_progress')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: user?.id,
          decision_taken: decision,
          notes: formData[step.id]?.notes || null,
        })
        .eq('id', progressRecord.id);

      if (error) throw error;

      // Add comment
      await supabase.from('dossier_comments').insert({
        dossier_id: dossierId,
        user_id: user?.id,
        comment_type: 'decision_made',
        content: `Décision pour "${step.name}": ${decision ? 'Oui' : 'Non'}`,
        metadata: { step_id: step.id, decision },
      });

      toast.success('Décision enregistrée');
      setExpandedStep(null);
      setFormData({});
      onUpdate();
    } catch (error: any) {
      console.error('Error recording decision:', error);
      toast.error('Erreur lors de l\'enregistrement de la décision');
    }
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
                    {progressRecord && getStatusBadge(progressRecord.status)}
                  </div>

                  {step.description && (
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  )}

                  {progressRecord?.completed_at && (
                    <p className="text-xs text-muted-foreground">
                      Complété le {format(new Date(progressRecord.completed_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
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
