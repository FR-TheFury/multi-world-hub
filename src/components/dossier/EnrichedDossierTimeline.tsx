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
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  ArrowRight
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  createdBy?: { display_name: string; avatar_url: string | null; email: string };
  assignedTo?: { display_name: string; avatar_url: string | null; email: string };
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
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
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

      // Fetch comments with user profiles
      const { data: comments } = await supabase
        .from("dossier_comments")
        .select("*, profiles:user_id(display_name, avatar_url, email)")
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
          createdBy: comment.profiles ? {
            display_name: comment.profiles.display_name,
            avatar_url: comment.profiles.avatar_url,
            email: comment.profiles.email
          } : undefined,
        });
      });

      // Fetch tasks linked to this dossier's workflow steps
      const workflowStepIds = steps.map(s => s.id);
      const { data: tasks } = workflowStepIds.length > 0 ? await supabase
        .from("tasks")
        .select("id, title, description, status, created_at, workflow_step_id, priority, due_date, created_by, assigned_to")
        .in("workflow_step_id", workflowStepIds)
        .order("created_at", { ascending: false }) : { data: [] };

      // Fetch profiles for task users
      const taskUserIds = new Set<string>();
      tasks?.forEach(task => {
        if (task.created_by) taskUserIds.add(task.created_by);
        if (task.assigned_to) taskUserIds.add(task.assigned_to);
      });

      let taskProfiles: Record<string, any> = {};
      if (taskUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, email")
          .in("id", Array.from(taskUserIds));
        
        if (profiles) {
          taskProfiles = Object.fromEntries(profiles.map(p => [p.id, p]));
        }
      }

      tasks?.forEach(task => {
        const creator = task.created_by ? taskProfiles[task.created_by] : undefined;
        const assignee = task.assigned_to ? taskProfiles[task.assigned_to] : undefined;

        timelineEvents.push({
          id: `task-${task.id}`,
          type: "task",
          timestamp: task.created_at,
          title: task.title,
          description: task.description || undefined,
          status: task.status,
          workflowStepId: task.workflow_step_id,
          metadata: task,
          createdBy: creator ? {
            display_name: creator.display_name,
            avatar_url: creator.avatar_url,
            email: creator.email
          } : undefined,
          assignedTo: assignee ? {
            display_name: assignee.display_name,
            avatar_url: assignee.avatar_url,
            email: assignee.email
          } : undefined,
        });
      });

      // Fetch appointments linked to this dossier
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, title, description, status, start_time, workflow_step_id, user_id")
        .eq("dossier_id", dossierId)
        .order("start_time", { ascending: false });

      // Fetch profiles for appointment users
      const apptUserIds = new Set<string>();
      appointments?.forEach(appt => {
        if (appt.user_id) apptUserIds.add(appt.user_id);
      });

      let apptProfiles: Record<string, any> = {};
      if (apptUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, email")
          .in("id", Array.from(apptUserIds));
        
        if (profiles) {
          apptProfiles = Object.fromEntries(profiles.map(p => [p.id, p]));
        }
      }

      appointments?.forEach(appt => {
        const user = appt.user_id ? apptProfiles[appt.user_id] : undefined;

        timelineEvents.push({
          id: `appt-${appt.id}`,
          type: "appointment",
          timestamp: appt.start_time,
          title: appt.title,
          description: appt.description || undefined,
          status: appt.status,
          workflowStepId: appt.workflow_step_id,
          metadata: appt,
          assignedTo: user ? {
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            email: user.email
          } : undefined,
        });
      });

      // Fetch annotations
      const { data: annotations } = await supabase
        .from("dossier_step_annotations")
        .select("id, title, content, created_at, workflow_step_id, annotation_type, created_by")
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: false });

      // Fetch profiles for annotation users
      const annotationUserIds = new Set<string>();
      annotations?.forEach(annotation => {
        if (annotation.created_by) annotationUserIds.add(annotation.created_by);
      });

      let annotationProfiles: Record<string, any> = {};
      if (annotationUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, email")
          .in("id", Array.from(annotationUserIds));
        
        if (profiles) {
          annotationProfiles = Object.fromEntries(profiles.map(p => [p.id, p]));
        }
      }

      annotations?.forEach(annotation => {
        const creator = annotation.created_by ? annotationProfiles[annotation.created_by] : undefined;

        timelineEvents.push({
          id: `annotation-${annotation.id}`,
          type: "annotation",
          timestamp: annotation.created_at,
          title: annotation.title,
          description: annotation.content,
          workflowStepId: annotation.workflow_step_id,
          metadata: annotation,
          createdBy: creator ? {
            display_name: creator.display_name,
            avatar_url: creator.avatar_url,
            email: creator.email
          } : undefined,
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

  const handleCompleteStep = async (stepId: string, formData?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Optimistic update
      setEvents(prev => prev.map(e => 
        e.workflowStepId === stepId && e.type === "step"
          ? { ...e, status: "completed" }
          : e
      ));

      const { error } = await supabase.functions.invoke("workflow-engine", {
        body: {
          action: "complete_step",
          dossierId,
          stepId,
          userId: user.id,
          formData: formData || {},
        },
      });

      if (error) throw error;

      toast.success("Étape complétée avec succès");
      await onUpdate();
      await fetchTimelineEvents();
    } catch (error: any) {
      console.error("Erreur complétion étape:", error);
      toast.error(error.message || "Erreur lors de la complétion de l'étape");
      // Revert optimistic update on error
      await fetchTimelineEvents();
    }
  };

  const handleDecision = async (stepId: string, decision: boolean, notes: string, formData?: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Optimistic update
      setEvents(prev => prev.map(e => 
        e.workflowStepId === stepId && e.type === "step"
          ? { ...e, status: "completed" }
          : e
      ));

      const { error } = await supabase.functions.invoke("workflow-engine", {
        body: {
          action: "complete_step",
          dossierId,
          stepId,
          userId: user.id,
          decision,
          notes,
          formData: formData || {},
        },
      });

      if (error) throw error;

      toast.success(decision ? "Décision validée: Oui" : "Décision validée: Non");
      await onUpdate();
      await fetchTimelineEvents();
    } catch (error: any) {
      console.error("Erreur décision:", error);
      toast.error(error.message || "Erreur lors de la prise de décision");
      // Revert optimistic update on error
      await fetchTimelineEvents();
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
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {event.stepNumber && (
                          <Badge variant="outline" className="text-xs">
                            Étape {event.stepNumber}
                          </Badge>
                        )}
                        <h4 className="font-semibold">{event.title}</h4>
                        {event.status && (
                          <Badge variant={
                            event.status === "completed" || event.status === "done" ? "default" :
                            event.status === "in_progress" || event.status === "todo" ? "secondary" :
                            event.status === "blocked" ? "destructive" :
                            "outline"
                          }>
                            {event.status === "todo" ? "À faire" : 
                             event.status === "done" ? "Terminée" :
                             event.status}
                          </Badge>
                        )}
                      </div>

                      {/* User info for tasks, comments, annotations, appointments */}
                      {(event.createdBy || event.assignedTo) && (
                        <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
                          {event.createdBy && (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={event.createdBy.avatar_url || ""} />
                                <AvatarFallback className="text-[10px]">
                                  <User className="h-3 w-3" />
                                </AvatarFallback>
                              </Avatar>
                              <span>{event.createdBy.display_name || event.createdBy.email}</span>
                            </div>
                          )}
                          {event.assignedTo && event.type === "task" && (
                            <>
                              <ArrowRight className="h-3 w-3" />
                              <div className="flex items-center gap-1.5">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={event.assignedTo.avatar_url || ""} />
                                  <AvatarFallback className="text-[10px]">
                                    <User className="h-3 w-3" />
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{event.assignedTo.display_name || event.assignedTo.email}</span>
                              </div>
                            </>
                          )}
                          {event.assignedTo && event.type === "appointment" && (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={event.assignedTo.avatar_url || ""} />
                                <AvatarFallback className="text-[10px]">
                                  <User className="h-3 w-3" />
                                </AvatarFallback>
                              </Avatar>
                              <span>{event.assignedTo.display_name || event.assignedTo.email}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {event.description && expandedEvent !== event.id && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{event.description}</p>
                      )}
                      {event.description && expandedEvent === event.id && (
                        <p className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">{event.description}</p>
                      )}

                      {/* Expanded details for tasks */}
                      {expandedEvent === event.id && event.type === "task" && event.metadata && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {event.metadata.priority && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">Priorité:</span>
                              <Badge variant="outline" className="text-xs">
                                {event.metadata.priority === "high" ? "Haute" :
                                 event.metadata.priority === "medium" ? "Moyenne" : "Basse"}
                              </Badge>
                            </div>
                          )}
                          {event.metadata.due_date && (
                            <div className="flex items-center gap-2 text-xs">
                              <Clock className="h-3 w-3" />
                              <span>Échéance: {format(new Date(event.metadata.due_date), "PPP 'à' HH:mm", { locale: fr })}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.timestamp), "PPP 'à' HH:mm", { locale: fr })}
                        </p>
                        {(event.description || (event.type === "task" && event.metadata)) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                          >
                            {expandedEvent === event.id ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                Réduire
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                Voir plus
                              </>
                            )}
                          </Button>
                        )}
                      </div>
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
                        onComplete={(stepId, formData) => { handleCompleteStep(stepId, formData); }}
                        onDecision={(stepId, decision, notes, formData) => { handleDecision(stepId, decision, notes, formData); }}
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
