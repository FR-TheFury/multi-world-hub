import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string;
  world: { code: string; name: string; theme_colors: any };
}

const TasksPanel = () => {
  const { isSuperAdmin } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const query = supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          assigned_to,
          world:worlds(code, name, theme_colors)
        `)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (!isSuperAdmin()) {
        query.eq('assigned_to', (await supabase.auth.getUser()).data.user?.id);
      }

      const { data } = await query;

      if (data) {
        setTasks(data.map(t => ({ ...t, world: (t as any).world })));
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
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TasksPanel;
