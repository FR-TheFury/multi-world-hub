import { useMemo, useState, useEffect } from "react";
import {
  MessageCircle,
  FileText,
  CalendarClock,
  CheckSquare,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Loader2,
  MessageSquare,
  Calendar,
  ListTodo,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import WorkflowStepDetails from "./WorkflowStepDetails";
import { AddCommentDialog } from "./AddCommentDialog";
import { AddTaskDialog } from "./AddTaskDialog";
import { AddAppointmentDialog } from "./AddAppointmentDialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Étape principale de la timeline
 */
type StepStatus = "completed" | "in_progress" | "pending" | "blocked";

type Step = {
  id: string;
  order: number;
  name: string;
  description: string | null;
  step_type: string;
  status: StepStatus;
  completed_at: string | null;
  started_at: string | null;
};

/**
 * Élément intermédiaire entre deux étapes
 */
type TimelineItemType = "comment" | "document" | "task" | "appointment" | "annotation";

type TimelineItem = {
  id: string;
  type: TimelineItemType;
  title: string;
  content: string;
  createdAt: string;
  fromUser: string;
  toUser?: string;
  afterStepId: string;
  metadata?: any;
};

interface CaseTimelineProps {
  dossierId: string;
  steps: any[];
  progress: any[];
  onUpdate: () => void;
}

/**
 * Utils
 */
function formatDate(dateString: string) {
  const d = new Date(dateString);
  return format(d, "d MMM yyyy, HH:mm", { locale: fr });
}

function getStepColors(status: StepStatus) {
  switch (status) {
    case "completed":
      return {
        badgeBg: "bg-emerald-500",
        badgeRing: "ring-emerald-100",
        chipBg: "bg-emerald-50",
        chipText: "text-emerald-700",
      };
    case "in_progress":
      return {
        badgeBg: "bg-sky-500",
        badgeRing: "ring-sky-100",
        chipBg: "bg-sky-50",
        chipText: "text-sky-700",
      };
    case "blocked":
      return {
        badgeBg: "bg-red-500",
        badgeRing: "ring-red-100",
        chipBg: "bg-red-50",
        chipText: "text-red-700",
      };
    default:
      return {
        badgeBg: "bg-slate-300",
        badgeRing: "ring-slate-100",
        chipBg: "bg-slate-50",
        chipText: "text-slate-600",
      };
  }
}

function getItemIcon(type: TimelineItemType) {
  switch (type) {
    case "comment":
      return <MessageCircle className="w-4 h-4" />;
    case "document":
      return <FileText className="w-4 h-4" />;
    case "task":
      return <CheckSquare className="w-4 h-4" />;
    case "appointment":
      return <CalendarClock className="w-4 h-4" />;
    case "annotation":
      return <MessageCircle className="w-4 h-4" />;
    default:
      return <MessageCircle className="w-4 h-4" />;
  }
}

function getItemColors(type: TimelineItemType) {
  switch (type) {
    case "comment":
      return {
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-200",
      };
    case "document":
      return {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
      };
    case "task":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      };
    case "appointment":
      return {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
      };
    case "annotation":
      return {
        bg: "bg-pink-50",
        text: "text-pink-700",
        border: "border-pink-200",
      };
    default:
      return {
        bg: "bg-slate-50",
        text: "text-slate-700",
        border: "border-slate-200",
      };
  }
}

function getItemTypeLabel(type: TimelineItemType) {
  const labels: Record<TimelineItemType, string> = {
    comment: "Commentaire",
    document: "Document",
    task: "Tâche",
    appointment: "RDV",
    annotation: "Note",
  };
  return labels[type];
}

// -----------------
// Composants
// -----------------

export default function CaseTimeline({ dossierId, steps, progress, onUpdate }: CaseTimelineProps) {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStep, setSelectedStep] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStepForAction, setActiveStepForAction] = useState<string | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);

  // Fusionner steps et progress pour créer les étapes enrichies
  const enrichedSteps: Step[] = useMemo(() => {
    return steps.map((step) => {
      const prog = progress.find((p) => p.workflow_step_id === step.id);
      return {
        id: step.id,
        order: step.step_number,
        name: step.name,
        description: step.description,
        step_type: step.step_type,
        status: prog?.status || "pending",
        completed_at: prog?.completed_at || null,
        started_at: prog?.started_at || null,
      };
    }).sort((a, b) => a.order - b.order);
  }, [steps, progress]);

  useEffect(() => {
    fetchTimelineItems();

    // Abonnements en temps réel
    const commentsChannel = supabase
      .channel("timeline-comments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dossier_comments",
          filter: `dossier_id=eq.${dossierId}`,
        },
        () => fetchTimelineItems()
      )
      .subscribe();

    const attachmentsChannel = supabase
      .channel("timeline-attachments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dossier_attachments",
          filter: `dossier_id=eq.${dossierId}`,
        },
        () => fetchTimelineItems()
      )
      .subscribe();

    const tasksChannel = supabase
      .channel("timeline-tasks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => fetchTimelineItems()
      )
      .subscribe();

    const appointmentsChannel = supabase
      .channel("timeline-appointments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `dossier_id=eq.${dossierId}`,
        },
        () => fetchTimelineItems()
      )
      .subscribe();

    const annotationsChannel = supabase
      .channel("timeline-annotations")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dossier_step_annotations",
          filter: `dossier_id=eq.${dossierId}`,
        },
        () => fetchTimelineItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(attachmentsChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(annotationsChannel);
    };
  }, [dossierId]);

  const fetchTimelineItems = async () => {
    try {
      setLoading(true);

      // Fetch comments
      const { data: comments } = await supabase
        .from("dossier_comments")
        .select("*, profiles!dossier_comments_user_id_fkey(display_name)")
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: true });

      // Fetch documents
      const { data: documents } = await supabase
        .from("dossier_attachments")
        .select("*, profiles!dossier_attachments_uploaded_by_fkey(display_name)")
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: true });

      // Fetch tasks - filter by dossier_id and workflow_step_id
      const stepIds = enrichedSteps.map(s => s.id);
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("dossier_id", dossierId)
        .in("workflow_step_id", stepIds)
        .order("created_at", { ascending: true });

      // Fetch user profiles for tasks
      const taskCreatorIds = [...new Set(tasks?.map(t => t.created_by).filter(Boolean) || [])];
      const taskAssigneeIds = [...new Set(tasks?.map(t => t.assigned_to).filter(Boolean) || [])];
      const allTaskUserIds = [...new Set([...taskCreatorIds, ...taskAssigneeIds])];
      
      const { data: taskProfiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", allTaskUserIds);

      const taskProfilesMap = new Map(taskProfiles?.map(p => [p.id, p.display_name]) || []);

      // Fetch appointments
      const { data: appointments } = await supabase
        .from("appointments")
        .select("*")
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: true });

      // Fetch user profiles for appointments
      const appointmentUserIds = [...new Set(appointments?.map(a => a.user_id).filter(Boolean) || [])];
      const { data: appointmentProfiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", appointmentUserIds);

      const appointmentProfilesMap = new Map(appointmentProfiles?.map(p => [p.id, p.display_name]) || []);

      // Fetch annotations
      const { data: annotations } = await supabase
        .from("dossier_step_annotations")
        .select("*")
        .eq("dossier_id", dossierId)
        .order("created_at", { ascending: true });

      // Fetch user profiles for annotations
      const annotationUserIds = [...new Set(annotations?.map(a => a.created_by).filter(Boolean) || [])];
      const { data: annotationProfiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", annotationUserIds);

      const annotationProfilesMap = new Map(annotationProfiles?.map(p => [p.id, p.display_name]) || []);

      // Transform all to TimelineItem format
      const allItems: TimelineItem[] = [];

      comments?.forEach((c) => {
        allItems.push({
          id: c.id,
          type: "comment",
          title: c.comment_type === "comment" ? "Commentaire" : "Note système",
          content: c.content,
          createdAt: c.created_at!,
          fromUser: c.profiles?.display_name || "Utilisateur",
          afterStepId: findAfterStepId(c.created_at!, enrichedSteps),
        });
      });

      documents?.forEach((d) => {
        allItems.push({
          id: d.id,
          type: "document",
          title: d.file_name,
          content: `Document ajouté (${d.document_type || "non spécifié"})`,
          createdAt: d.created_at!,
          fromUser: d.profiles?.display_name || "Utilisateur",
          afterStepId: findAfterStepId(d.created_at!, enrichedSteps),
        });
      });

      tasks?.forEach((t) => {
        allItems.push({
          id: t.id,
          type: "task",
          title: t.title,
          content: t.description || "Aucune description",
          createdAt: t.created_at!,
          fromUser: taskProfilesMap.get(t.created_by) || "Système",
          toUser: t.assigned_to ? taskProfilesMap.get(t.assigned_to) : undefined,
          afterStepId: findAfterStepId(t.created_at!, enrichedSteps),
        });
      });

      appointments?.forEach((a) => {
        allItems.push({
          id: a.id,
          type: "appointment",
          title: a.title,
          content: a.description || `RDV le ${format(new Date(a.start_time), "dd/MM à HH:mm", { locale: fr })}`,
          createdAt: a.created_at!,
          fromUser: appointmentProfilesMap.get(a.user_id) || "Système",
          afterStepId: findAfterStepId(a.created_at!, enrichedSteps),
        });
      });

      annotations?.forEach((a) => {
        allItems.push({
          id: a.id,
          type: "annotation",
          title: a.title,
          content: a.content,
          createdAt: a.created_at!,
          fromUser: annotationProfilesMap.get(a.created_by) || "Utilisateur",
          afterStepId: findAfterStepId(a.created_at!, enrichedSteps),
        });
      });

      // Sort chronologically
      allItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      setTimelineItems(allItems);
    } catch (error) {
      console.error("Error fetching timeline items:", error);
    } finally {
      setLoading(false);
    }
  };

  // Déterminer après quelle étape un événement doit être affiché
  const findAfterStepId = (eventDate: string, steps: Step[]): string => {
    const eventTime = new Date(eventDate).getTime();
    
    // Trouver la dernière étape complétée avant cet événement
    let afterStepId = steps[0]?.id || "";
    
    for (const step of steps) {
      if (step.started_at) {
        const stepTime = new Date(step.started_at).getTime();
        if (stepTime <= eventTime) {
          afterStepId = step.id;
        }
      }
    }
    
    return afterStepId;
  };

  /**
   * Regrouper les items par afterStepId
   */
  const itemsByStep = useMemo(() => {
    const map: Record<string, TimelineItem[]> = {};
    for (const item of timelineItems) {
      if (!map[item.afterStepId]) {
        map[item.afterStepId] = [];
      }
      map[item.afterStepId].push(item);
    }
    return map;
  }, [timelineItems]);

  const handleStepComplete = async (stepId: string, formData?: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("workflow-engine", {
        body: {
          dossierId,
          stepId,
          action: "complete_step",
          formData,
        },
      });

      if (error) throw error;

      toast.success("Étape complétée avec succès");
      setSelectedStep(null);
      onUpdate();
    } catch (error: any) {
      console.error("Error completing step:", error);
      toast.error(error.message || "Erreur lors de la validation de l'étape");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStepDecision = async (
    stepId: string,
    decision: boolean,
    notes: string,
    formData?: Record<string, any>
  ) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("workflow-engine", {
        body: {
          dossierId,
          stepId,
          action: "complete_step",
          decision,
          notes,
          formData,
        },
      });

      if (error) throw error;

      toast.success(`Décision "${decision ? "Oui" : "Non"}" enregistrée avec succès`);
      setSelectedStep(null);
      onUpdate();
    } catch (error: any) {
      console.error("Error processing decision:", error);
      toast.error(error.message || "Erreur lors de la prise de décision");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Trouver les informations complètes de l'étape sélectionnée
  const selectedStepFull = selectedStep
    ? steps.find((s) => s.id === selectedStep.id)
    : null;
  const selectedProgress = selectedStep
    ? progress.find((p) => p.workflow_step_id === selectedStep.id)
    : null;

  // Déterminer les étapes suivantes
  const nextSteps = selectedStepFull
    ? {
        next: selectedStepFull.next_step_id
          ? steps.find((s) => s.id === selectedStepFull.next_step_id)
          : null,
        yes: selectedStepFull.decision_yes_next_step_id
          ? steps.find((s) => s.id === selectedStepFull.decision_yes_next_step_id)
          : null,
        no: selectedStepFull.decision_no_next_step_id
          ? steps.find((s) => s.id === selectedStepFull.decision_no_next_step_id)
          : null,
      }
    : { next: null, yes: null, no: null };

  const handleOpenCommentDialog = (stepId: string) => {
    setActiveStepForAction(stepId);
    setShowCommentDialog(true);
  };

  const handleOpenTaskDialog = (stepId: string) => {
    setActiveStepForAction(stepId);
    setShowTaskDialog(true);
  };

  const handleOpenAppointmentDialog = (stepId: string) => {
    setActiveStepForAction(stepId);
    setShowAppointmentDialog(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 md:py-8">
      <AddCommentDialog
        open={showCommentDialog}
        onOpenChange={setShowCommentDialog}
        dossierId={dossierId}
        onCommentCreated={() => {
          fetchTimelineItems();
          onUpdate();
        }}
      />

      <AddTaskDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        dossierId={dossierId}
        workflowStepId={activeStepForAction || undefined}
        onTaskCreated={() => {
          fetchTimelineItems();
          onUpdate();
        }}
      />

      <AddAppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={setShowAppointmentDialog}
        dossierId={dossierId}
        workflowStepId={activeStepForAction || undefined}
        onAppointmentCreated={() => {
          fetchTimelineItems();
          onUpdate();
        }}
      />

      {selectedStep && selectedStepFull && (
        <div className="mb-6">
          <WorkflowStepDetails
            step={selectedStepFull}
            progress={selectedProgress}
            onComplete={handleStepComplete}
            onDecision={handleStepDecision}
            isSubmitting={isSubmitting}
            nextSteps={nextSteps}
            onClose={() => setSelectedStep(null)}
          />
        </div>
      )}

      <div className="relative">
        {/* Ligne verticale principale */}
        <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2">
          <div className="w-px h-full bg-gradient-to-b from-primary/30 via-slate-200 to-primary/30" />
        </div>

        <div className="space-y-10">
          {enrichedSteps.map((step, index) => {
            const stepItems = itemsByStep[step.id] || [];
            const hasNextStep = index < enrichedSteps.length - 1;

            return (
              <div key={step.id} className="space-y-6">
                {/* Étape principale */}
                <StepCard 
                  step={step} 
                  onClick={() => setSelectedStep(step)}
                  onAddComment={() => handleOpenCommentDialog(step.id)}
                  onAddTask={() => handleOpenTaskDialog(step.id)}
                  onAddAppointment={() => handleOpenAppointmentDialog(step.id)}
                />

                {/* Segment intermédiaire entre cette étape et la suivante */}
                {hasNextStep && stepItems.length > 0 && (
                  <BetweenSegment items={stepItems} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Card d'une étape principale
 */
function StepCard({ 
  step, 
  onClick, 
  onAddComment, 
  onAddTask, 
  onAddAppointment 
}: { 
  step: Step; 
  onClick: () => void;
  onAddComment: () => void;
  onAddTask: () => void;
  onAddAppointment: () => void;
}) {
  const colors = getStepColors(step.status);

  const getStatusLabel = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return "Étape complétée";
      case "in_progress":
        return "En cours";
      case "blocked":
        return "Bloquée";
      default:
        return "À venir";
    }
  };

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "in_progress":
        return <Clock className="w-3.5 h-3.5" />;
      case "blocked":
        return <Clock className="w-3.5 h-3.5" />;
      default:
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="relative flex justify-center">
      {/* pastille numérotée */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full ${colors.badgeBg} text-white shadow-lg ring-4 ${colors.badgeRing} z-10`}
      >
        <span className="text-sm font-semibold">{step.order}</span>
      </div>

      <div className="w-full md:w-3/4">
        <button
          onClick={onClick}
          className="w-full bg-card border border-border rounded-2xl shadow-sm px-4 py-4 md:px-6 md:py-5 hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer text-left"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h3 className="text-sm md:text-base font-semibold text-card-foreground">
                {step.name}
              </h3>
              {step.description && (
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
              )}
            </div>
            <div className="flex flex-col items-start md:items-end gap-1">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${colors.chipBg} ${colors.chipText}`}
              >
                {getStatusIcon(step.status)}
                {getStatusLabel(step.status)}
              </span>
              {(step.completed_at || step.started_at) && (
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(step.completed_at || step.started_at!)}
                </p>
              )}
            </div>
          </div>
        </button>

        {/* Boutons d'action */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onAddComment();
            }}
            className="text-xs h-8"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Commentaire
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onAddAppointment();
            }}
            className="text-xs h-8"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            RDV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onAddTask();
            }}
            className="text-xs h-8"
          >
            <ListTodo className="w-3.5 h-3.5 mr-1.5" />
            Tâche
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Segment intermédiaire entre deux étapes :
 * Affiche les événements en escalier selon leur timestamp
 */
function BetweenSegment({ items }: { items: TimelineItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const MAX_VISIBLE = 6;

  // Trier tous les items par date
  const sortedItems = [...items].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const visibleItems = expanded || sortedItems.length <= MAX_VISIBLE
    ? sortedItems
    : sortedItems.slice(0, MAX_VISIBLE);

  const hiddenCount = sortedItems.length > MAX_VISIBLE ? sortedItems.length - MAX_VISIBLE : 0;

  // Calculer l'espacement vertical en fonction du temps écoulé
  const getVerticalSpacing = (currentItem: TimelineItem, previousItem?: TimelineItem) => {
    if (!previousItem) return 0;
    
    const currentTime = new Date(currentItem.createdAt).getTime();
    const previousTime = new Date(previousItem.createdAt).getTime();
    const timeDiff = currentTime - previousTime;
    
    // Convert time difference to hours
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // Min spacing: 12px, Max spacing: 80px
    // Scale based on time difference (0-24 hours range)
    const minSpacing = 12;
    const maxSpacing = 80;
    const spacing = Math.min(maxSpacing, minSpacing + (hoursDiff * 2));
    
    return spacing;
  };

  return (
    <div className="relative min-h-[80px]">
      {/* Ligne verticale centrale entre les étapes */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 z-0">
        <div className="w-px h-full border-l border-dashed border-slate-300" />
      </div>

      <div className="relative z-10">
        {visibleItems.map((item, idx) => {
          const side = idx % 2 === 0 ? "left" : "right";
          const previousItem = idx > 0 ? visibleItems[idx - 1] : undefined;
          const marginTop = getVerticalSpacing(item, previousItem);

          return (
            <div 
              key={item.id} 
              style={{ marginTop: idx === 0 ? '8px' : `${marginTop}px` }}
            >
              <SideItemCard
                item={item}
                positionIndex={idx}
                side={side}
              />
            </div>
          );
        })}

        {hiddenCount > 0 && (
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {expanded
                ? "Masquer les éléments"
                : `Afficher ${hiddenCount} élément(s) de plus`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Card latérale reliée à la timeline (gauche ou droite)
 */
function SideItemCard({
  item,
  positionIndex,
  side,
}: {
  item: TimelineItem;
  positionIndex: number;
  side: "left" | "right";
}) {
  const colors = getItemColors(item.type);

  if (side === "left") {
    return (
      <div className="flex justify-end">
        <div className="relative pr-8 md:pr-10 max-w-md w-full md:w-[calc(50%-2rem)]">
          {/* Point sur la ligne + branche horizontale vers la droite */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:flex items-center z-20">
            <div className={`w-6 border-t-2 border-dashed ${colors.border}`} />
            <div className={`w-2 h-2 rounded-full ${colors.border.replace('border', 'bg')}`} />
          </div>

          <div className={`bg-card border ${colors.border} rounded-xl shadow-sm px-3 py-2.5 md:px-4 md:py-3 hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} text-[11px] font-medium`}>
                  {getItemIcon(item.type)}
                  <span>{getItemTypeLabel(item.type)}</span>
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {formatDate(item.createdAt)}
              </span>
            </div>

            <h4 className="text-xs md:text-sm font-bold text-card-foreground mb-1">
              {item.title}
            </h4>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {item.content}
            </p>

            {(item.fromUser || item.toUser) && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {item.fromUser}
                  {item.toUser ? ` → ${item.toUser}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="relative pl-8 md:pl-10 max-w-md w-full md:w-[calc(50%-2rem)]">
        {/* Point sur la ligne + branche horizontale vers la gauche */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden md:flex items-center z-20">
          <div className={`w-2 h-2 rounded-full ${colors.border.replace('border', 'bg')}`} />
          <div className={`w-6 border-t-2 border-dashed ${colors.border}`} />
        </div>

        <div className={`bg-card border ${colors.border} rounded-xl shadow-sm px-3 py-2.5 md:px-4 md:py-3 hover:shadow-md transition-shadow`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} text-[11px] font-medium`}>
                {getItemIcon(item.type)}
                <span>{getItemTypeLabel(item.type)}</span>
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {formatDate(item.createdAt)}
            </span>
          </div>

          <h4 className="text-xs md:text-sm font-bold text-card-foreground mb-1">
            {item.title}
          </h4>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            {item.content}
          </p>

          {(item.fromUser || item.toUser) && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="font-medium">
                {item.fromUser}
                {item.toUser ? ` → ${item.toUser}` : ""}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
