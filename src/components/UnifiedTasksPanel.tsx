import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Plus, CheckCircle2, Clock, AlertCircle, Eye, MoreVertical, UserCog, Check, Mail, Paperclip, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore, World } from '@/lib/store';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TaskDetailDialog } from './TaskDetailDialog';
import CreateTaskDialog from './CreateTaskDialog';
import { toast } from 'sonner';
import { DEMO_EMAILS } from '@/data/emails';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  assigned_to: string | null;
  created_by: string;
  world_id: string;
  created_at: string;
}

interface Appointment {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  world_id: string;
}

interface UnifiedTasksPanelProps {
  accessibleWorlds: World[];
}

const UnifiedTasksPanel = ({ accessibleWorlds }: UnifiedTasksPanelProps) => {
  const { isSuperAdmin, user, roles } = useAuthStore();
  const navigate = useNavigate();
  const [tasksByWorld, setTasksByWorld] = useState<Record<string, Task[]>>({});
  const [appointmentsByWorld, setAppointmentsByWorld] = useState<Record<string, Appointment[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [selectedWorldForTask, setSelectedWorldForTask] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  useEffect(() => {
    fetchAllTasks();
    fetchAllAppointments();
    
    const tasksChannel = supabase
      .channel('unified-tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchAllTasks();
      })
      .subscribe();

    const appointmentsChannel = supabase
      .channel('unified-appointments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchAllAppointments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(appointmentsChannel);
    };
  }, [accessibleWorlds, priorityFilter]);

  const fetchAllTasks = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('tasks')
        .select('*')
        .in('world_id', accessibleWorlds.map(w => w.id));

      if (!isSuperAdmin()) {
        // Les utilisateurs non super admin voient les tâches assignées à eux OU non assignées
        query = query.or(`assigned_to.eq.${user?.id},assigned_to.is.null`);
      }

      if (priorityFilter) {
        query = query.eq('priority', priorityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Grouper et trier les tâches par monde
      const grouped: Record<string, Task[]> = {};
      accessibleWorlds.forEach(world => {
        grouped[world.id] = [];
      });

      data?.forEach(task => {
        if (grouped[task.world_id]) {
          grouped[task.world_id].push(task);
        }
      });

      // Trier les tâches par date d'échéance dans chaque monde
      Object.keys(grouped).forEach(worldId => {
        grouped[worldId].sort((a, b) => {
          if (!a.due_date && !b.due_date) return 0;
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
      });

      setTasksByWorld(grouped);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Erreur lors du chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAppointments = async () => {
    try {
      const worldIds = accessibleWorlds.map(w => w.id);
      if (worldIds.length === 0) return;

      const now = new Date().toISOString();
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, title, start_time, end_time, world_id')
        .in('world_id', worldIds)
        .gte('start_time', now)
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true })
        .limit(15);

      if (error) throw error;

      // Group appointments by world and limit to 3 per world
      const grouped = appointments?.reduce((acc, appointment) => {
        if (!acc[appointment.world_id]) {
          acc[appointment.world_id] = [];
        }
        if (acc[appointment.world_id].length < 3) {
          acc[appointment.world_id].push(appointment);
        }
        return acc;
      }, {} as Record<string, Appointment[]>) || {};

      setAppointmentsByWorld(grouped);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);
    
    if (error) {
      toast.error('Erreur lors de la mise à jour de la tâche');
      return;
    }
    
    toast.success(newStatus === 'done' ? 'Tâche validée' : 'Tâche réactivée');
    fetchAllTasks();
  };

  const handleQuickValidate = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateTaskStatus(taskId, 'done');
  };

  const handleQuickReassign = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTask(task);
    setDialogOpen(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/15 text-destructive border-destructive/30';
      case 'medium':
        return 'bg-primary/15 text-primary border-primary/30';
      case 'low':
        return 'bg-muted text-muted-foreground border-muted-foreground/30';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/30';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-3 w-3" />;
      case 'medium':
        return <Clock className="h-3 w-3" />;
      case 'low':
        return <CheckCircle2 className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Élevée';
      case 'medium':
        return 'Moyenne';
      case 'low':
        return 'Basse';
      default:
        return priority;
    }
  };

  const getWorldIcon = (worldCode: string) => {
    try {
      return `/src/assets/${worldCode}.svg`;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accessibleWorlds.map(world => (
          <Card key={world.id} className="animate-pulse">
            <CardHeader className="h-20 bg-muted/50" />
            <CardContent className="h-64 bg-muted/20" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accessibleWorlds.map(world => {
          const worldTasks = tasksByWorld[world.id] || [];
          const incompleteTasks = worldTasks.filter(t => t.status !== 'done');
          const worldAppointments = appointmentsByWorld[world.id] || [];

          return (
            <Card 
              key={world.id} 
              className="flex flex-col transition-all"
              style={{
                borderColor: world.theme_colors.primary,
                borderWidth: '2px',
              }}
            >
              <CardHeader 
                className="pb-4 space-y-4"
                style={{
                  background: `linear-gradient(135deg, ${world.theme_colors.primary}08 0%, ${world.theme_colors.accent}05 100%)`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center" 
                      style={{ backgroundColor: `${world.theme_colors.primary}20` }}
                    >
                      <img 
                        src={getWorldIcon(world.code)} 
                        alt={world.code}
                        className="w-6 h-6"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <h3 
                        className="font-semibold"
                        style={{ color: world.theme_colors.primary }}
                      >
                        {world.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {incompleteTasks.length} tâche{incompleteTasks.length !== 1 ? 's' : ''} active{incompleteTasks.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  {isSuperAdmin() && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedWorldForTask(world.id);
                        setCreateTaskDialogOpen(true);
                      }}
                      style={{
                        borderColor: world.theme_colors.primary,
                        color: world.theme_colors.primary,
                        backgroundColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = world.theme_colors.primary;
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = world.theme_colors.primary;
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Nouvelle
                    </Button>
                  )}
                </div>
                
                {/* Priority Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground mr-1">Filtrer:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs transition-all"
                    style={priorityFilter === 'high' ? {
                      backgroundColor: world.theme_colors.primary,
                      color: 'white',
                      borderColor: world.theme_colors.primary,
                    } : {
                      borderColor: world.theme_colors.primary,
                      color: world.theme_colors.primary,
                      backgroundColor: 'transparent',
                    }}
                    onClick={() => setPriorityFilter(priorityFilter === 'high' ? null : 'high')}
                    onMouseEnter={(e) => {
                      if (priorityFilter !== 'high') {
                        e.currentTarget.style.backgroundColor = world.theme_colors.primary;
                        e.currentTarget.style.color = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (priorityFilter !== 'high') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = world.theme_colors.primary;
                      }
                    }}
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Urgent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs transition-all"
                    style={priorityFilter === 'medium' ? {
                      backgroundColor: world.theme_colors.primary,
                      color: 'white',
                      borderColor: world.theme_colors.primary,
                    } : {
                      borderColor: world.theme_colors.primary,
                      color: world.theme_colors.primary,
                      backgroundColor: 'transparent',
                    }}
                    onClick={() => setPriorityFilter(priorityFilter === 'medium' ? null : 'medium')}
                    onMouseEnter={(e) => {
                      if (priorityFilter !== 'medium') {
                        e.currentTarget.style.backgroundColor = world.theme_colors.primary;
                        e.currentTarget.style.color = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (priorityFilter !== 'medium') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = world.theme_colors.primary;
                      }
                    }}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Moyen
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs transition-all"
                    style={priorityFilter === 'low' ? {
                      backgroundColor: world.theme_colors.primary,
                      color: 'white',
                      borderColor: world.theme_colors.primary,
                    } : {
                      borderColor: world.theme_colors.primary,
                      color: world.theme_colors.primary,
                      backgroundColor: 'transparent',
                    }}
                    onClick={() => setPriorityFilter(priorityFilter === 'low' ? null : 'low')}
                    onMouseEnter={(e) => {
                      if (priorityFilter !== 'low') {
                        e.currentTarget.style.backgroundColor = world.theme_colors.primary;
                        e.currentTarget.style.color = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (priorityFilter !== 'low') {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = world.theme_colors.primary;
                      }
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Bas
                  </Button>
                  {priorityFilter && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs transition-all"
                      style={{ 
                        color: world.theme_colors.primary,
                        borderColor: world.theme_colors.primary,
                        backgroundColor: 'transparent',
                      }}
                      onClick={() => setPriorityFilter(null)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = world.theme_colors.primary;
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = world.theme_colors.primary;
                      }}
                    >
                      Réinitialiser
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4">
                {/* Tasks Section */}
                <div className="space-y-3 flex-1">
                  {worldTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground">Aucune tâche assignée</p>
                    </div>
                  ) : (
                    worldTasks.map(task => (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border transition-all hover:shadow-md",
                            task.status === 'done' && 'bg-muted/30 border-border/50 opacity-60'
                          )}
                          style={task.status !== 'done' ? {
                            borderColor: `${world.theme_colors.primary}30`,
                          } : undefined}
                        >
                        <Checkbox
                          checked={task.status === 'done'}
                          onCheckedChange={(checked) => 
                            updateTaskStatus(task.id, checked ? 'done' : 'todo')
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start gap-2 flex-wrap">
                            <h4 className={cn(
                              "text-sm font-medium flex-1 min-w-0",
                              task.status === 'done' && 'line-through text-muted-foreground'
                            )}>
                              {task.title}
                            </h4>
                            <div className="flex items-center gap-1.5">
                              {!task.assigned_to && (
                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                  Non assignée
                                </Badge>
                              )}
                              <Badge variant="outline" className={cn("text-xs", getPriorityColor(task.priority))}>
                                {getPriorityIcon(task.priority)}
                                <span className="ml-1">{getPriorityLabel(task.priority)}</span>
                              </Badge>
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {task.description}
                            </p>
                          )}
                          {task.due_date && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedTask(task);
                              setDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {user?.id === task.assigned_to && task.status !== 'done' && (
                                <DropdownMenuItem onClick={(e) => handleQuickValidate(task.id, e)}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Valider la tâche
                                </DropdownMenuItem>
                              )}
                              {isSuperAdmin() && (
                                <>
                                  {user?.id === task.assigned_to && task.status !== 'done' && (
                                    <DropdownMenuSeparator />
                                  )}
                                  <DropdownMenuItem onClick={(e) => handleQuickReassign(task, e)}>
                                    <UserCog className="h-4 w-4 mr-2" />
                                    Modifier / Réassigner
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Emails Section */}
                <div className="pt-4 border-t border-border space-y-3">
                  {(() => {
                    const worldEmails = DEMO_EMAILS.filter(email => email.labels.includes(world.code));
                    const unreadEmails = worldEmails.filter(e => e.unread);
                    const recentUnreadEmails = unreadEmails.slice(0, 3);

                    if (unreadEmails.length === 0) {
                      return (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <p className="text-xs">Aucun email non lu</p>
                        </div>
                      );
                    }

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-foreground" />
                            <p className="text-sm font-medium text-foreground">
                              Emails ({unreadEmails.length} non lu{unreadEmails.length !== 1 ? 's' : ''})
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {recentUnreadEmails.map(email => (
                            <div
                              key={email.id}
                              className="flex items-start gap-3 p-2 rounded-lg border transition-colors cursor-pointer"
                              style={{
                                borderColor: `${world.theme_colors.primary}30`,
                                backgroundColor: `${world.theme_colors.primary}08`,
                              }}
                              onClick={() => navigate('/mailbox')}
                            >
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback 
                                  className="text-xs font-semibold"
                                  style={{
                                    backgroundColor: `${world.theme_colors.primary}20`,
                                    color: world.theme_colors.primary,
                                  }}
                                >
                                  {email.senderAvatar}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {email.sender}
                                  </p>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {email.priority === 'high' && (
                                      <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                                        Urgent
                                      </Badge>
                                    )}
                                    {email.hasAttachment && (
                                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-foreground truncate mb-0.5">
                                  {email.subject}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {email.time}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => navigate('/mailbox')}
                        >
                          → Voir tous les emails
                        </Button>
                      </>
                    );
                  })()}
                </div>

                {/* Appointments Section */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-foreground" />
                      <p className="text-sm font-medium text-foreground">
                        Rendez-vous à venir
                      </p>
                    </div>
                  </div>

                  {worldAppointments.length === 0 ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <p className="text-xs">Aucun rendez-vous planifié</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {worldAppointments.map(appointment => (
                          <div
                            key={appointment.id}
                            className="flex items-start gap-3 p-2 rounded-lg border transition-colors"
                            style={{
                              borderColor: `${world.theme_colors.primary}30`,
                              backgroundColor: `${world.theme_colors.primary}05`,
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate mb-1">
                                {appointment.title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(appointment.start_time), 'dd MMM yyyy', { locale: fr })} à{' '}
                                {format(new Date(appointment.start_time), 'HH:mm', { locale: fr })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                      >
                        → Voir tous les rendez-vous
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setSelectedTask(null);
            }
          }}
          onTaskUpdated={fetchAllTasks}
        />
      )}

      <CreateTaskDialog
        open={createTaskDialogOpen}
        onOpenChange={setCreateTaskDialogOpen}
        worldId={selectedWorldForTask}
        onTaskCreated={fetchAllTasks}
      />
    </>
  );
};

export default UnifiedTasksPanel;
