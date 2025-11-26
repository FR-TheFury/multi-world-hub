import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  ChevronLeft,
  ChevronRight,
  User,
  ArrowRight
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddTaskDialog } from "./AddTaskDialog";
import { AddAnnotationDialog } from "./AddAnnotationDialog";
import { AddCommentDialog } from "./AddCommentDialog";
import { MarkDocumentStatusDialog } from "./MarkDocumentStatusDialog";
import WorkflowStepDetails from "./WorkflowStepDetails";
import SideEventCard from "./SideEventCard";
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
  const [addCommentOpen, setAddCommentOpen] = useState(false);
  const [markDocumentOpen, setMarkDocumentOpen] = useState(false);
  const [selectedStepForAction, setSelectedStepForAction] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showLeftColumn, setShowLeftColumn] = useState(true);
  const [showRightColumn, setShowRightColumn] = useState(true);

  useEffect(() => {
    fetchTimelineEvents();

    // Subscribe to real-time updates for this dossier
    const channel = supabase
      .channel(`dossier-${dossierId}-updates`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dossier_comments',
          filter: `dossier_id=eq.${dossierId}`
        },
        () => {
          console.log('Nouveau commentaire détecté');
          fetchTimelineEvents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          const task = payload.new as any;
          // Check if task is for this dossier's workflow steps
          const isForThisDossier = steps.some(s => s.id === task.workflow_step_id);
          if (isForThisDossier) {
            console.log('Nouvelle tâche détectée');
            fetchTimelineEvents();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dossier_step_annotations',
          filter: `dossier_id=eq.${dossierId}`
        },
        () => {
          console.log('Nouvelle annotation détectée');
          fetchTimelineEvents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dossier_attachments',
          filter: `dossier_id=eq.${dossierId}`
        },
        () => {
          console.log('Nouveau document détecté');
          fetchTimelineEvents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dossier_workflow_progress',
          filter: `dossier_id=eq.${dossierId}`
        },
        () => {
          console.log('Progression workflow mise à jour');
          fetchTimelineEvents();
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dossierId, progress, steps]);

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

  // Group events chronologically between workflow steps
  const groupEventsBetweenSteps = () => {
    const stepEvents = events.filter(e => e.type === "step")
      .sort((a, b) => b.stepNumber! - a.stepNumber!); // Sort inverted: highest step number first
    const sideEvents = events.filter(e => e.type !== "step");
    
    const grouped: Array<{
      step: TimelineEvent;
      leftEvents: TimelineEvent[];
      rightEvents: TimelineEvent[];
      nextStep?: TimelineEvent;
    }> = [];

    stepEvents.forEach((step, index) => {
      const nextStep = stepEvents[index + 1]; // Next in inverted order (chronologically previous)
      
      // Get timestamps
      const stepTime = new Date(step.timestamp).getTime();
      const nextStepTime = nextStep ? new Date(nextStep.timestamp).getTime() : 0; // 0 = beginning of time
      
      // Get events that occurred chronologically BETWEEN this step and the next (previous in time)
      const eventsInRange = sideEvents.filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        
        // For the last step (first chronologically, bottom of display), include all events before it
        if (!nextStep) {
          return eventTime <= stepTime;
        }
        
        // Otherwise, include events between nextStep and current step
        return eventTime > nextStepTime && eventTime <= stepTime;
      });
      
      // Separate into left (documents, comments, annotations) and right (appointments, tasks)
      // Sort each side chronologically (reversed for display top to bottom)
      const leftEvents = eventsInRange
        .filter(e => e.type === "document" || e.type === "comment" || e.type === "annotation")
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
      const rightEvents = eventsInRange
        .filter(e => e.type === "appointment" || e.type === "task")
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      grouped.push({
        step,
        leftEvents,
        rightEvents,
        nextStep
      });
    });

    return grouped;
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

  const groupedEvents = groupEventsBetweenSteps();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Timeline du dossier</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAddCommentOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Commentaire
          </Button>
          <Button size="sm" variant="outline" onClick={() => openAddTask()}>
            <Plus className="h-4 w-4 mr-1" /> Tâche
          </Button>
          <Button size="sm" variant="outline" onClick={() => openAddAnnotation()}>
            <Plus className="h-4 w-4 mr-1" /> Note
          </Button>
        </div>
      </div>

      {/* 3-Column Timeline Layout with collapsible sides */}
      <div className="relative">
        <div className={cn(
          "grid gap-6 transition-all duration-300",
          !showLeftColumn && !showRightColumn && "grid-cols-[auto_1fr_auto]",
          showLeftColumn && !showRightColumn && "grid-cols-[220px_1fr_auto]",
          !showLeftColumn && showRightColumn && "grid-cols-[auto_1fr_220px]",
          showLeftColumn && showRightColumn && "grid-cols-[220px_1fr_220px]"
        )}>
          {/* LEFT COLUMN TOGGLE */}
          <div className="flex flex-col items-end pt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLeftColumn(!showLeftColumn)}
              className="sticky top-4 mb-2"
            >
              {showLeftColumn ? (
                <>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Masquer
                </>
              ) : (
                <>
                  <ChevronRight className="h-4 w-4 mr-1" />
                  {groupedEvents.reduce((sum, g) => sum + g.leftEvents.length, 0)}
                </>
              )}
            </Button>

            {/* LEFT COLUMN - Documents, Comments, Annotations */}
            {showLeftColumn && (
              <div className="space-y-2 w-full">
                {groupedEvents.map((group, groupIndex) => (
                  <div key={`left-${groupIndex}`} className="space-y-2 mb-4">
                    {group.leftEvents.map((event) => (
                      <SideEventCard
                        key={event.id}
                        event={event as any}
                        side="left"
                        onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CENTER COLUMN - Workflow Steps */}
          <div className="relative px-4">
            {/* Vertical continuous line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 via-primary/30 to-primary/50 -translate-x-1/2" />

            <div className="space-y-4 relative">
              {groupedEvents.map((group, groupIndex) => (
                 <div key={group.step.id} className="relative">
                  {/* Vertical connecting line from previous step */}
                  {groupIndex > 0 && (
                    <div className="w-0.5 h-4 bg-border mx-auto mb-2" />
                  )}

                  {/* Step Card - Full information card */}
                  <Card 
                    className={cn(
                      "w-full max-w-2xl mx-auto border-l-4 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer",
                      group.step.status === "completed" && "border-l-green-500 bg-green-50/30",
                      group.step.status === "in_progress" && "border-l-blue-500 bg-blue-50/30",
                      group.step.status === "pending" && "border-l-muted-foreground",
                      group.step.status === "blocked" && "border-l-red-500 bg-red-50/30",
                      selectedStep === group.step.workflowStepId && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => handleStepClick(group.step.workflowStepId!)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Circle with step number */}
                        <div
                          className={cn(
                            "flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg transition-all",
                            group.step.status === "completed" && "bg-green-500",
                            group.step.status === "in_progress" && "bg-blue-500 animate-pulse",
                            group.step.status === "pending" && "bg-gray-400",
                            group.step.status === "blocked" && "bg-red-500"
                          )}
                        >
                          {group.step.status === "completed" ? (
                            <CheckCircle2 className="h-8 w-8" />
                          ) : (
                            group.step.stepNumber
                          )}
                        </div>

                        {/* Step details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-bold text-lg line-clamp-2">
                              {group.step.title}
                            </h3>
                            <Badge
                              variant={
                                group.step.status === "completed"
                                  ? "default"
                                  : group.step.status === "in_progress"
                                  ? "secondary"
                                  : "outline"
                              }
                              className={cn(
                                "text-xs flex-shrink-0",
                                group.step.status === "completed" && "bg-green-500",
                                group.step.status === "in_progress" && "bg-blue-500",
                                group.step.status === "blocked" && "bg-red-500"
                              )}
                            >
                              {group.step.status === "completed" && "✓ Complété"}
                              {group.step.status === "in_progress" && "⏳ En cours"}
                              {group.step.status === "pending" && "⏸ En attente"}
                              {group.step.status === "blocked" && "⚠ Bloqué"}
                            </Badge>
                          </div>
                          
                          {group.step.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {group.step.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            {group.step.metadata?.progress?.completed_at && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  Complété le {format(new Date(group.step.metadata.progress.completed_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                                </span>
                              </div>
                            )}
                            
                            {group.step.metadata?.progress?.started_at && !group.step.metadata?.progress?.completed_at && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  Démarré le {format(new Date(group.step.metadata.progress.started_at), "dd MMM yyyy", { locale: fr })}
                                </span>
                              </div>
                            )}

                            {group.step.metadata?.progress?.assigned_to && (
                              <Badge variant="outline" className="text-xs">
                                <User className="h-3 w-3 mr-1" />
                                Assigné
                              </Badge>
                            )}
                          </div>

                          {group.step.metadata?.progress?.notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2 border-l-2 border-muted pl-2">
                              {group.step.metadata.progress.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Vertical line to next step */}
                  {group.nextStep && (
                    <div className="w-0.5 h-4 bg-border mx-auto mt-2" />
                  )}

                  {/* Step Details Panel (when selected) */}
                  {selectedStep === group.step.workflowStepId && (
                    <div className="mt-4 animate-fade-in">
                      <Card className="border-l-4 border-primary max-w-2xl mx-auto">
                        <CardContent className="p-6">
                          <WorkflowStepDetails
                            step={group.step.metadata.step}
                            progress={group.step.metadata.progress}
                            onComplete={(stepId, formData) => { handleCompleteStep(stepId, formData); }}
                            onDecision={(stepId, decision, notes, formData) => { handleDecision(stepId, decision, notes, formData); }}
                            isSubmitting={false}
                            nextSteps={getNextSteps(group.step.metadata.step)}
                            onClose={() => setSelectedStep(null)}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Expanded Event Details */}
                  {group.leftEvents.concat(group.rightEvents).map((event) => (
                    expandedEvent === event.id && (
                      <Card key={`expanded-${event.id}`} className="mt-4 border-l-4 border-primary animate-fade-in max-w-2xl mx-auto">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getEventIcon(event.type, event.status)}
                              <h4 className="font-semibold">{event.title}</h4>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedEvent(null)}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {event.description && (
                            <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{event.description}</p>
                          )}
                          
                          {/* User info */}
                          {(event.createdBy || event.assignedTo) && (
                            <div className="flex items-center gap-3 mb-2 text-sm">
                              {event.createdBy && (
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={event.createdBy.avatar_url || ""} />
                                    <AvatarFallback>
                                      <User className="h-3 w-3" />
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-muted-foreground">Créé par {event.createdBy.display_name}</span>
                                </div>
                              )}
                              {event.assignedTo && event.type === "task" && (
                                <>
                                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={event.assignedTo.avatar_url || ""} />
                                      <AvatarFallback>
                                        <User className="h-3 w-3" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">Assigné à {event.assignedTo.display_name}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                          
                          {/* Task metadata */}
                          {event.type === "task" && event.metadata && (
                            <div className="space-y-2 border-t pt-2 mt-2">
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
                          
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(event.timestamp), "PPP 'à' HH:mm", { locale: fr })}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN - Appointments, Tasks */}
          <div className="flex flex-col items-start pt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRightColumn(!showRightColumn)}
              className="sticky top-4 mb-2"
            >
              {showRightColumn ? (
                <>
                  Masquer
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  {groupedEvents.reduce((sum, g) => sum + g.rightEvents.length, 0)}
                  <ChevronLeft className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>

            {/* RIGHT COLUMN CONTENT */}
            {showRightColumn && (
              <div className="space-y-2 w-full">
                {groupedEvents.map((group, groupIndex) => (
                  <div key={`right-${groupIndex}`} className="space-y-2 mb-4">
                    {group.rightEvents.map((event) => (
                      <SideEventCard
                        key={event.id}
                        event={event as any}
                        side="right"
                        onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
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

      <AddCommentDialog
        open={addCommentOpen}
        onOpenChange={setAddCommentOpen}
        dossierId={dossierId}
        onCommentCreated={() => {
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
