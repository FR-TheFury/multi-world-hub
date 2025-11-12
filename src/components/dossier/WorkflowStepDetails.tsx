import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  ArrowRight,
  FileText,
  Upload,
  X,
} from 'lucide-react';
import WorkflowStepForm from './WorkflowStepForm';
import { DecisionStepForm } from './DecisionStepForm';

interface WorkflowStepDetailsProps {
  step: any;
  progress: any;
  onComplete: (stepId: string, formData?: Record<string, any>) => void;
  onDecision: (stepId: string, decision: boolean, notes: string, formData?: Record<string, any>) => void;
  isSubmitting: boolean;
  nextSteps: any;
  onClose: () => void;
}

const WorkflowStepDetails = ({
  step,
  progress,
  onComplete,
  onDecision,
  isSubmitting,
  nextSteps,
  onClose,
}: WorkflowStepDetailsProps) => {
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const canInteract = progress?.status !== 'completed';

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      completed: { variant: 'default', label: 'Complété' },
      in_progress: { variant: 'secondary', label: 'En cours' },
      pending: { variant: 'outline', label: 'En attente' },
      blocked: { variant: 'destructive', label: 'Bloqué' },
    };
    return statusMap[status] || statusMap.pending;
  };

  const statusInfo = getStatusInfo(progress?.status || 'pending');

  return (
    <div className="animate-slide-in-up">
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Étape {step.step_number}
                </span>
                <CardTitle className="text-2xl">{step.name}</CardTitle>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
              {step.description && (
                <p className="text-muted-foreground">{step.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Détails</TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="history">Historique</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              {/* Show branches if decision step */}
              {step.requires_decision && (nextSteps.yes || nextSteps.no) && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-semibold">Chemins possibles :</p>
                  {nextSteps.yes && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <ArrowRight className="h-4 w-4" />
                      <span className="text-sm">Si Oui → {nextSteps.yes.name}</span>
                    </div>
                  )}
                  {nextSteps.no && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <ArrowRight className="h-4 w-4" />
                      <span className="text-sm">Si Non → {nextSteps.no.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Show next step if linear */}
              {!step.requires_decision && nextSteps.next && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowRight className="h-4 w-4" />
                    <span>Étape suivante : <span className="font-semibold">{nextSteps.next.name}</span></span>
                  </div>
                </div>
              )}

              {canInteract ? (
                <div className="space-y-4">
                  {/* Form Fields */}
                  {step.form_fields && Array.isArray(step.form_fields) && step.form_fields.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="font-semibold">Formulaire de l'étape</h4>
                      <WorkflowStepForm
                        formFields={step.form_fields}
                        initialData={progress?.form_data || {}}
                        onSubmit={(data) => {
                          if (step.requires_decision) {
                            // Save form data and open decision
                            return;
                          }
                          onComplete(step.id, data);
                        }}
                        submitLabel={step.requires_decision ? "Sauvegarder les données" : "Compléter l'étape"}
                        isLoading={isSubmitting}
                      />
                      
                      {/* Decision Step */}
                      {step.requires_decision && progress?.form_data && Object.keys(progress.form_data).length > 0 && (
                        <DecisionStepForm
                          stepName="Prendre une décision"
                          stepDescription="Sélectionnez votre décision et ajoutez des notes"
                          onSubmit={async (decision, decisionNotes) => {
                            await onDecision(step.id, decision, decisionNotes, progress.form_data);
                          }}
                          isSubmitting={isSubmitting}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Simple Decision Step */}
                      {step.requires_decision ? (
                        <DecisionStepForm
                          stepName={step.name}
                          stepDescription={step.description || ''}
                          onSubmit={async (decision, decisionNotes) => {
                            await onDecision(step.id, decision, decisionNotes);
                          }}
                          isSubmitting={isSubmitting}
                        />
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label>Notes (optionnel)</Label>
                            <Textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Ajouter des notes..."
                              className="min-h-[100px]"
                            />
                          </div>
                          <Button
                            onClick={() => {
                              onComplete(step.id);
                            }}
                            className="w-full"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? 'En cours...' : "Marquer comme complété"}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Cette étape a déjà été complétée.
                  </p>
                  {progress?.completed_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Complété le {format(new Date(progress.completed_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      {progress.decision_taken !== null && (
                        <span className="ml-2 font-medium">
                          • Décision: {progress.decision_taken ? 'Oui' : 'Non'}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Documents liés à cette étape</h4>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Ajouter un document
                  </Button>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucun document pour cette étape</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4 mt-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Historique des modifications</h4>
                {progress?.notes && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground">{progress.notes}</p>
                  </div>
                )}
                {!progress?.notes && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun historique disponible
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowStepDetails;
