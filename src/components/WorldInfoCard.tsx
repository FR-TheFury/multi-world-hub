import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { World } from '@/lib/store';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface WorldInfoCardProps {
  world: World;
}

interface Task {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
}

interface Email {
  id: string;
  sender: string;
  subject: string;
  unread: boolean;
}

const WorldInfoCard = ({ world }: WorldInfoCardProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorldData();
  }, [world.id]);

  const fetchWorldData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Fetch tasks for this world
      let tasksQuery = supabase
        .from('tasks')
        .select('id, title, priority, due_date')
        .eq('world_id', world.id)
        .eq('status', 'todo')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(3);

      if (userId) {
        tasksQuery = tasksQuery.eq('assigned_to', userId);
      }

      const { data: tasksData } = await tasksQuery;
      setTasks(tasksData || []);

      // For now, emails are demo data - you can implement real email fetching later
      setEmails([]);
    } catch (error) {
      console.error('Error fetching world data:', error);
    } finally {
      setLoading(false);
    }
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
        return 'bg-slate-50 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Urgent';
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

  if (loading) {
    return (
      <Card 
        className="border-2"
        style={{
          borderColor: `${world.theme_colors.primary}40`,
          background: `linear-gradient(135deg, ${world.theme_colors.primary}08 0%, ${world.theme_colors.accent}05 100%)`,
        }}
      >
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="border-2 shadow-md"
      style={{
        borderColor: `${world.theme_colors.primary}40`,
        background: `linear-gradient(135deg, ${world.theme_colors.primary}08 0%, ${world.theme_colors.accent}05 100%)`,
      }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" style={{ color: world.theme_colors.primary }} />
          Tâches à faire
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Aucune tâche en cours</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-lg bg-card border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{task.title}</p>
                    {task.due_date && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={cn('text-xs whitespace-nowrap', getPriorityColor(task.priority))}
                  >
                    {getPriorityLabel(task.priority)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Section Emails */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-5 w-5" style={{ color: world.theme_colors.primary }} />
            <h4 className="font-semibold text-sm">Emails</h4>
          </div>
          {emails.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucun email non lu</p>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="p-3 rounded-lg bg-card border hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{email.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1">{email.sender}</p>
                    </div>
                    {email.unread && (
                      <Badge variant="default" className="text-xs">Nouveau</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorldInfoCard;
