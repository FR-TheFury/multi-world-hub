import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  FileText, 
  MessageSquare, 
  Calendar, 
  ListTodo,
  StickyNote,
  Plus,
  XCircle,
  AlertCircle
} from "lucide-react";
import { AddTaskDialog } from "./AddTaskDialog";
import { AddAnnotationDialog } from "./AddAnnotationDialog";
import { MarkDocumentStatusDialog } from "./MarkDocumentStatusDialog";
import WorkflowStepDetails from "./WorkflowStepDetails";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface TimelineEvent {
  id: string;
  type: "step" | "document" | "comment" | "task" | "appointment" | "annotation";
  timestamp: string;
  title: string;
  description?: string;
  status?: string;
  metadata?: any;
  stepNumber?: number;
  workflowStepId?: string;
}

interface EnrichedDossierTimelineProps {
  dossierId: string;
  steps: any[];
  progress: any[];
  onUpdate: () => void;
}

export function EnrichedDossierTimeline({ dossierId, steps, progress, onUpdate }: EnrichedDossierTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addAnnotationOpen, setAddAnnotationOpen] = useState(false);
  const [markDocumentOpen, setMarkDocumentOpen] = useState(false);
  const [selectedStepForAction, setSelectedStepForAction] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimelineEvents();
  }, [dossierId, progress]);

  const fetchTimelineEvents = async () => {
    try {
      setLoading(true);
      const timelineEvents: TimelineEvent[] = [];

      // Add workflow steps
      steps.forEach((step, index) => {
        const stepProgress = progress.find(p => p.workflow_step_id === step.id);
        timelineEvents.push({
          id: `step-${step.id}`,
          type: "step",
          timestamp: stepProgress?.completed_at || stepProgress?.started_at || new Date().toISOString(),
          title: step.name,
          description: step.description,
          status: stepProgress?.status || "pending",
          stepNumber: step.step_number,
          workflowStepId: step.id,
          metadata: { step, progress: stepProgress },
        });
      });

      // Fetch documents
      const { data: documents } = await supabase
        .from("dossier_attachments")
        .select("*")
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: false });

      documents?.forEach(doc => {
        timelineEvents.push({
          id: `doc-${doc.id}`,
          type: "document",
          timestamp: doc.created_at,
          title: doc.file_name,
          description: doc.document_type || "Document",
          metadata: doc,
        });
      });

      // Fetch comments
      const { data: comments } = await supabase
        .from("dossier_comments")
        .select("*, profiles(display_name)")
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: false });

      comments?.forEach(comment => {
        timelineEvents.push({
          id: `comment-${comment.id}`,
          type: "comment",
          timestamp: comment.created_at,
          title: "Commentaire",
          description: comment.content,
          metadata: comment,
        });
      });

      // Fetch tasks linked to this dossier's workflow steps
      const workflowStepIds = steps.map(s => s.id);
      const { data: tasks } = workflowStepIds.length > 0 ? await supabase
        .from("tasks")
        .select("id, title, description, status, created_at, workflow_step_id")
        .in("workflow_step_id", workflowStepIds)
        .order("created_at", { ascending: false }) : { data: [] };

      tasks?.forEach(task => {
        timelineEvents.push({
          id: `task-${task.id}`,
          type: "task",
          timestamp: task.created_at,
          title: task.title,
          description: task.description || undefined,
          status: task.status,
          workflowStepId: task.workflow_step_id,
          metadata: task,
        });
      });

      // Fetch appointments linked to this dossier
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, title, description, status, start_time, workflow_step_id")
        .eq("dossier_id", dossierId)
        .order("start_time", { ascending: false });

      appointments?.forEach(appt => {
        timelineEvents.push({
          id: `appt-${appt.id}`,
          type: "appointment",
          timestamp: appt.start_time,
          title: appt.title,
          description: appt.description || undefined,
          status: appt.status,
          workflowStepId: appt.workflow_step_id,
          metadata: appt,
        });
      });

      // Fetch annotations
      const { data: annotations } = await supabase
        .from("dossier_step_annotations")
        .select("id, title, content, created_at, workflow_step_id, annotation_type")
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: false });

      annotations?.forEach(annotation => {
        timelineEvents.push({
          id: `annotation-${annotation.id}`,
          type: "annotation",
          timestamp: annotation.created_at,
          title: annotation.title,
          description: annotation.content,
          workflowStepId: annotation.workflow_step_id,
          metadata: annotation,
        });
      });

      // Sort by timestamp
      timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setEvents(timelineEvents);
    } catch (error) {
      console.error("Erreur chargement timeline:", error);
      toast.error("Erreur lors du chargement de la timeline");
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string, status?: string) => {
    switch (type) {
      case "step":
        if (status === "completed") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
        if (status === "in_progress") return <Clock className="h-5 w-5 text-blue-500" />;
        if (status === "blocked") return <XCircle className="h-5 w-5 text-red-500" />;
        return <Circle className="h-5 w-5 text-muted-foreground" />;
      case "document":
        return <FileText className="h-5 w-5 text-purple-500" />;
      case "comment":
        return <MessageSquare className="h-5 w-5 text-orange-500" />;
      case "task":
        return <ListTodo className="h-5 w-5 text-blue-500" />;
      case "appointment":
        return <Calendar className="h-5 w-5 text-green-500" />;
      case "annotation":
        return <StickyNote className="h-5 w-5 text-yellow-500" />;
      default:
        return <Circle className="h-5 w-5" />;
    }
  };

  const getEventColor = (type: string, status?: string) => {
    if (type === "step") {
      if (status === "completed") return "border-green-500";
      if (status === "in_progress") return "border-blue-500";
      if (status === "blocked") return "border-red-500";
      return "border-muted";
    }
    return "border-muted";
  };

  const handleStepClick = (stepId: string) => {
    setSelectedStep(selectedStep === stepId ? null : stepId);
  };

  const getNextSteps = (step: any) => {
    const nextSteps: any = {};
    if (step.requires_decision) {
      if (step.decision_yes_next_step_id) {
        nextSteps.yes = steps.find(s => s.id === step.decision_yes_next_step_id);
      }
      if (step.decision_no_next_step_id) {
        nextSteps.no = steps.find(s => s.id === step.decision_no_next_step_id);
      }
    } else if (step.next_step_id) {
      nextSteps.next = steps.find(s => s.id === step.next_step_id);
    }
    return nextSteps;
  };

  const openAddTask = (stepId?: string) => {
    setSelectedStepForAction(stepId);
    setAddTaskOpen(true);
  };

  const openAddAnnotation = (stepId?: string) => {
    setSelectedStepForAction(stepId);
    setAddAnnotationOpen(true);
  };

  const openMarkDocument = (stepId?: string) => {
    setSelectedStepForAction(stepId);
    setMarkDocumentOpen(true);
  };

  const handleCompleteStep = async (stepId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.functions.invoke("workflow-engine", {
        body: {
          action: "complete_step",
          dossierId,
          stepId,
          userId: user.id,
        },
      });

      if (error) throw error;

      toast.success("Étape complétée");
      onUpdate();
      fetchTimelineEvents();
    } catch (error: any) {
      console.error("Erreur complétion étape:", error);
      toast.error(error.message || "Erreur lors de la complétion de l'étape");
    }
  };

  const handleDecision = async (stepId: string, decision: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.functions.invoke("workflow-engine", {
        body: {
          action: "make_decision",
          dossierId,
          stepId,
          decision,
          userId: user.id,
        },
      });

      if (error) throw error;

      toast.success(decision ? "Décision: Oui" : "Décision: Non");
      onUpdate();
      fetchTimelineEvents();
    } catch (error: any) {
      console.error("Erreur décision:", error);
      toast.error(error.message || "Erreur lors de la prise de décision");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement de la timeline...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Timeline du dossier</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openAddTask()}>
            <Plus className="h-4 w-4 mr-1" /> Tâche
          </Button>
          <Button size="sm" variant="outline" onClick={() => openAddAnnotation()}>
            <Plus className="h-4 w-4 mr-1" /> Note
          </Button>
        </div>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        {/* Events */}
        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={event.id} className="relative pl-14">
              {/* Icon */}
              <div className="absolute left-0 top-1 bg-background p-1 rounded-full border-2 border-border">
                {getEventIcon(event.type, event.status)}
              </div>

              <Card className={`border-l-4 ${getEventColor(event.type, event.status)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {event.stepNumber && (
                          <Badge variant="outline" className="text-xs">
                            Étape {event.stepNumber}
                          </Badge>
                        )}
                        <h4 className="font-semibold">{event.title}</h4>
                        {event.status && (
                          <Badge variant={
                            event.status === "completed" ? "default" :
                            event.status === "in_progress" ? "secondary" :
                            event.status === "blocked" ? "destructive" :
                            "outline"
                          }>
                            {event.status}
                          </Badge>
                        )}
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.timestamp), "PPP 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>

                    {event.type === "step" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStepClick(event.workflowStepId!)}
                        >
                          {selectedStep === event.workflowStepId ? "Masquer" : "Détails"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddTask(event.workflowStepId)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddAnnotation(event.workflowStepId)}
                        >
                          <StickyNote className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Step details */}
                  {event.type === "step" && selectedStep === event.workflowStepId && (
                    <div className="mt-4 border-t pt-4">
                      <WorkflowStepDetails
                        step={event.metadata.step}
                        progress={event.metadata.progress}
                        onComplete={(stepId, formData) => handleCompleteStep(stepId)}
                        onDecision={handleDecision}
                        isSubmitting={false}
                        nextSteps={getNextSteps(event.metadata.step)}
                        onClose={() => setSelectedStep(null)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <AddTaskDialog
        open={addTaskOpen}
        onOpenChange={setAddTaskOpen}
        dossierId={dossierId}
        workflowStepId={selectedStepForAction}
        onTaskCreated={() => {
          fetchTimelineEvents();
          onUpdate();
        }}
      />

      <AddAnnotationDialog
        open={addAnnotationOpen}
        onOpenChange={setAddAnnotationOpen}
        dossierId={dossierId}
        workflowStepId={selectedStepForAction}
        onAnnotationCreated={() => {
          fetchTimelineEvents();
          onUpdate();
        }}
      />

      <MarkDocumentStatusDialog
        open={markDocumentOpen}
        onOpenChange={setMarkDocumentOpen}
        dossierId={dossierId}
        workflowStepId={selectedStepForAction}
        onStatusMarked={() => {
          fetchTimelineEvents();
        }}
      />
    </div>
  );
}
