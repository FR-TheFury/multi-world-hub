import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, CheckCircle2, Clock, AlertCircle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { format, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TaskDetailDialog } from './TaskDetailDialog';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string;
  world?: { code: string; name: string; theme_colors: any };
}

const TasksPanel = () => {
  const { isSuperAdmin } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const baseSelect = 'id,title,description,status,priority,due_date,assigned_to,world_id';

      const today = new Date();
      const startDate = startOfDay(today).toISOString();
      const endDate = endOfDay(today).toISOString();

      // Base query for today tasks
      let todayQuery = supabase
        .from('tasks')
        .select(baseSelect)
        .eq('status', 'todo')
        .gte('due_date', startDate)
        .lte('due_date', endDate)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (!isSuperAdmin() && userId) {
        todayQuery = todayQuery.eq('assigned_to', userId);
      }

      let { data: todayTasks, error: todayError } = await todayQuery;
      if (todayError) {
        console.error('Error fetching tasks:', todayError);
        return;
      }

      let rows = todayTasks ?? [];

      // If none today, fetch next upcoming tasks
      if (rows.length === 0) {
        let nextQuery = supabase
          .from('tasks')
          .select(baseSelect)
          .eq('status', 'todo')
          .gt('due_date', endDate)
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(5);

        if (!isSuperAdmin() && userId) {
          nextQuery = nextQuery.eq('assigned_to', userId);
        }

        const { data: nextTasks, error: nextError } = await nextQuery;
        if (nextError) {
          console.error('Error fetching next tasks:', nextError);
          return;
        }
        rows = nextTasks ?? [];
      }

      // Enrich with worlds info via separate query
      if (rows.length > 0) {
        const worldIds = Array.from(new Set(rows.map(t => t.world_id).filter(Boolean)));
        let worldMap: Record<string, any> = {};
        if (worldIds.length > 0) {
          const { data: worldsData } = await supabase
            .from('worlds')
            .select('id, code, name, theme_colors')
            .in('id', worldIds);

          if (worldsData) {
            worldMap = Object.fromEntries(worldsData.map(w => [w.id, w]));
          }
        }

        setTasks(rows.map(t => ({ ...t, world: t.world_id ? worldMap[t.world_id] : undefined })));
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);
    
    fetchTasks();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'low':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return <AlertCircle className="h-3 w-3" />;
      case 'medium':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Card className="border-0 shadow-vuexy-md">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Mes Tâches
          </CardTitle>
          <Button size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-1" />
            Nouvelle tâche
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune tâche assignée
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group"
              >
                <Checkbox
                  checked={task.status === 'done'}
                  onCheckedChange={(checked) => 
                    updateTaskStatus(task.id, checked ? 'done' : 'todo')
                  }
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={cn(
                      "font-medium text-sm",
                      task.status === 'done' && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </h4>
                    <Badge 
                      className={cn("text-xs", getPriorityColor(task.priority))}
                    >
                      <span className="flex items-center gap-1">
                        {getPriorityIcon(task.priority)}
                        {task.priority}
                      </span>
                    </Badge>
                    {task.world && (
                      <Badge 
                        style={{ 
                          backgroundColor: `${task.world.theme_colors.primary}15`,
                          color: task.world.theme_colors.primary,
                          borderColor: `${task.world.theme_colors.primary}30`
                        }}
                        className="text-xs"
                      >
                        {task.world.code}
                      </Badge>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground">{task.description}</p>
                  )}
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Échéance: {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => {
                    setSelectedTask(task);
                    setDialogOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Détails
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <TaskDetailDialog
        task={selectedTask}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onTaskUpdated={fetchTasks}
      />
    </Card>
  );
};

export default TasksPanel;
