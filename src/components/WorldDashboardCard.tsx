import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { World } from '@/lib/store';
import { ArrowRight, FolderOpen, FileCheck, AlertTriangle, Mail, CheckSquare, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WorldDashboardCardProps {
  world: World;
}

interface WorldStats {
  chiffreAffaires: number;
  dossiersEnCours: number;
  dossiersClotures: number;
  dossiersUrgents: number;
}

interface Task {
  id: string;
  title: string;
  priority: string;
  due_date: string | null;
}

const WorldDashboardCard = ({ world }: WorldDashboardCardProps) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<WorldStats>({
    chiffreAffaires: 0,
    dossiersEnCours: 0,
    dossiersClotures: 0,
    dossiersUrgents: 0,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorldStats();
    fetchWorldTasks();
  }, [world.id]);

  const fetchWorldStats = async () => {
    try {
      // CA total du monde
      const { data: dossiersData } = await supabase
        .from('dossiers')
        .select('chiffre_affaires, status, is_important')
        .eq('world_id', world.id);

      if (dossiersData) {
        const ca = dossiersData.reduce((sum, d) => sum + (Number(d.chiffre_affaires) || 0), 0);
        const enCours = dossiersData.filter(d => d.status === 'en_cours').length;
        const clotures = dossiersData.filter(d => d.status === 'cloture').length;
        const urgents = dossiersData.filter(d => d.is_important).length;

        setStats({
          chiffreAffaires: ca,
          dossiersEnCours: enCours,
          dossiersClotures: clotures,
          dossiersUrgents: urgents,
        });
      }
    } catch (error) {
      console.error('Error fetching world stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorldTasks = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) return;

      const { data } = await supabase
        .from('tasks')
        .select('id, title, priority, due_date')
        .eq('world_id', world.id)
        .eq('assigned_to', userId)
        .eq('status', 'todo')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(3);

      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching world tasks:', error);
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
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card
      className="border-0 shadow-vuexy-lg hover:shadow-vuexy-xl transition-all duration-300"
      style={{ borderTop: `4px solid ${world.theme_colors.primary}` }}
    >
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: `${world.theme_colors.primary}15` }}
            >
              <img
                src={`/src/assets/${world.code}.svg`}
                alt={world.name}
                className="h-8 w-8"
                style={{ filter: `drop-shadow(0 0 8px ${world.theme_colors.primary}40)` }}
              />
            </div>
            <div>
              <h3 className="text-xl font-bold">{world.name}</h3>
              <p className="text-sm text-muted-foreground font-normal">{world.description}</p>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/${world.code.toLowerCase()}/dossiers`)}
            className="h-8"
          >
            Voir tout
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Statistiques */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <div
              className="w-1 h-4 rounded-full"
              style={{ backgroundColor: world.theme_colors.primary }}
            />
            Statistiques
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-1">
                <Euro className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Chiffre d'affaires</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(stats.chiffreAffaires)}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen className="h-4 w-4" style={{ color: world.theme_colors.primary }} />
                <span className="text-xs text-muted-foreground">En cours</span>
              </div>
              <p className="text-lg font-bold">{stats.dossiersEnCours}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-1">
                <FileCheck className="h-4 w-4 text-slate-600" />
                <span className="text-xs text-muted-foreground">Clôturés</span>
              </div>
              <p className="text-lg font-bold">{stats.dossiersClotures}</p>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-xs text-muted-foreground">Urgents</span>
              </div>
              <p className="text-lg font-bold">{stats.dossiersUrgents}</p>
            </div>
          </div>
        </div>

        {/* Emails */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <div
              className="w-1 h-4 rounded-full"
              style={{ backgroundColor: world.theme_colors.primary }}
            />
            <Mail className="h-4 w-4" />
            Emails récents
          </h4>
          <div className="space-y-2">
            <div className="p-3 rounded-lg border bg-muted/30 text-center text-sm text-muted-foreground">
              Fonctionnalité emails à venir
            </div>
          </div>
        </div>

        {/* Tâches */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <div
              className="w-1 h-4 rounded-full"
              style={{ backgroundColor: world.theme_colors.primary }}
            />
            <CheckSquare className="h-4 w-4" />
            Tâches en cours
          </h4>
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="p-3 rounded-lg border bg-card text-center text-sm text-muted-foreground">
                Aucune tâche en cours
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium flex-1">{task.title}</p>
                    <Badge className={getPriorityColor(task.priority)} variant="outline">
                      {task.priority}
                    </Badge>
                  </div>
                  {task.due_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      📅 {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorldDashboardCard;
