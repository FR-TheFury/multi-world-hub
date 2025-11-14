import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Euro, AlertTriangle, CheckCircle2, Clock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Dossier {
  id: string;
  title: string;
  status: string;
  created_at: string;
  owner: { display_name: string | null };
  tags: string[] | null;
  world_code: string;
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

const Dashboard = () => {
  const { accessibleWorlds: unsortedWorlds, profile } = useAuthStore();
  
  const accessibleWorlds = useMemo(() => {
    return [...unsortedWorlds].sort((a, b) => {
      const order = { 'JDE': 1, 'JDMO': 2, 'DBCS': 3 };
      return order[a.code] - order[b.code];
    });
  }, [unsortedWorlds]);

  const [importantDossiers, setImportantDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    caTotal: 0,
    caJDE: 0,
    caJDMO: 0,
    caDBCS: 0,
  });
  const [worldStats, setWorldStats] = useState<Record<string, WorldStats>>({});
  const [worldTasks, setWorldTasks] = useState<Record<string, Task[]>>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (accessibleWorlds.length > 0) {
      fetchImportantDossiers();
      fetchGlobalStats();
      fetchWorldStats();
      fetchWorldTasks();
    }
  }, [accessibleWorlds.length]);

  const fetchImportantDossiers = async () => {
    try {
      const { data } = await supabase
        .from('dossiers')
        .select(`
          id,
          title,
          status,
          created_at,
          tags,
          owner:profiles(display_name),
          world:worlds(code, name, theme_colors)
        `)
        .eq('is_important', true)
        .in('world_id', accessibleWorlds.map(w => w.id))
        .order('created_at', { ascending: false })
        .limit(6);

      if (data) {
        setImportantDossiers(data.map(d => ({
          ...d,
          owner: (d as any).owner,
          world_code: (d as any).world.code,
        })));
      }
    } catch (error) {
      console.error('Error fetching important dossiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalStats = async () => {
    try {
      const { data: allDossiers } = await supabase
        .from('dossiers')
        .select('chiffre_affaires, world:worlds(code)')
        .in('world_id', accessibleWorlds.map(w => w.id));

      if (allDossiers) {
        const caTotal = allDossiers.reduce((sum, d) => sum + (Number(d.chiffre_affaires) || 0), 0);
        const caJDE = allDossiers
          .filter(d => (d.world as any)?.code === 'JDE')
          .reduce((sum, d) => sum + (Number(d.chiffre_affaires) || 0), 0);
        const caJDMO = allDossiers
          .filter(d => (d.world as any)?.code === 'JDMO')
          .reduce((sum, d) => sum + (Number(d.chiffre_affaires) || 0), 0);
        const caDBCS = allDossiers
          .filter(d => (d.world as any)?.code === 'DBCS')
          .reduce((sum, d) => sum + (Number(d.chiffre_affaires) || 0), 0);

        setGlobalStats({ caTotal, caJDE, caJDMO, caDBCS });
      }
    } catch (error) {
      console.error('Error fetching global stats:', error);
    }
  };

  const fetchWorldStats = async () => {
    const stats: Record<string, WorldStats> = {};
    
    for (const world of accessibleWorlds) {
      try {
        const { data: dossiers } = await supabase
          .from('dossiers')
          .select('id, status, chiffre_affaires, tags')
          .eq('world_id', world.id);

        if (dossiers) {
          stats[world.id] = {
            chiffreAffaires: dossiers.reduce((sum, d) => sum + (Number(d.chiffre_affaires) || 0), 0),
            dossiersEnCours: dossiers.filter(d => d.status === 'en_cours').length,
            dossiersClotures: dossiers.filter(d => d.status === 'cloture').length,
            dossiersUrgents: dossiers.filter(d => d.tags?.includes('urgent')).length,
          };
        }
      } catch (error) {
        console.error(`Error fetching stats for world ${world.code}:`, error);
      }
    }
    
    setWorldStats(stats);
  };

  const fetchWorldTasks = async () => {
    const tasks: Record<string, Task[]> = {};
    
    for (const world of accessibleWorlds) {
      try {
        const { data } = await supabase
          .from('tasks')
          .select('id, title, priority, due_date')
          .eq('world_id', world.id)
          .eq('assigned_to', (await supabase.auth.getUser()).data.user?.id)
          .eq('status', 'todo')
          .order('due_date', { ascending: true })
          .limit(3);

        if (data) {
          tasks[world.id] = data;
        }
      } catch (error) {
        console.error(`Error fetching tasks for world ${world.code}:`, error);
      }
    }
    
    setWorldTasks(tasks);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'nouveau':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'en_cours':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cloture':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'nouveau':
        return 'Nouveau';
      case 'en_cours':
        return 'En cours';
      case 'cloture':
        return 'Clôturé';
      default:
        return status;
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
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-1 text-foreground">
          Bienvenue{profile?.display_name ? `, ${profile.display_name}` : ''}
        </h2>
        <p className="text-sm text-muted-foreground">
          {profile?.email}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Accédez à vos espaces de travail et consultez vos statistiques
        </p>
      </div>

      {/* Statistiques Globales */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-foreground">Statistiques Globales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-vuexy-md hover:shadow-vuexy-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">CA Total</CardTitle>
              <div className="p-2 rounded-lg bg-green-50">
                <Euro className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(globalStats.caTotal)}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-vuexy-md hover:shadow-vuexy-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">CA JDE</CardTitle>
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#ef444415' }}>
                <Euro className="h-4 w-4" style={{ color: '#ef4444' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(globalStats.caJDE)}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-vuexy-md hover:shadow-vuexy-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">CA JDMO</CardTitle>
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#f9731615' }}>
                <Euro className="h-4 w-4" style={{ color: '#f97316' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(globalStats.caJDMO)}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-vuexy-md hover:shadow-vuexy-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">CA DBCS</CardTitle>
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#10b98115' }}>
                <Euro className="h-4 w-4" style={{ color: '#10b981' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(globalStats.caDBCS)}</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* World Cards with Tasks and Emails */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {accessibleWorlds.map((world) => (
          <div key={world.id} className="space-y-4">
            {/* World Stats Card */}
            <Card className="border-0 shadow-vuexy-md hover:shadow-vuexy-lg transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg"
                      style={{ 
                        backgroundColor: `${world.theme_colors.primary}15`,
                        color: world.theme_colors.primary 
                      }}
                    >
                      {world.code}
                    </div>
                    <div>
                      <CardTitle className="text-base">{world.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{world.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/${world.code.toLowerCase()}/dossiers`)}
                  >
                    Voir tout
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Euro className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs text-muted-foreground">CA</span>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatCurrency(worldStats[world.id]?.chiffreAffaires || 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs text-muted-foreground">En cours</span>
                    </div>
                    <p className="text-sm font-semibold">{worldStats[world.id]?.dossiersEnCours || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-slate-600" />
                      <span className="text-xs text-muted-foreground">Clôturés</span>
                    </div>
                    <p className="text-sm font-semibold">{worldStats[world.id]?.dossiersClotures || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      <span className="text-xs text-muted-foreground">Urgents</span>
                    </div>
                    <p className="text-sm font-semibold">{worldStats[world.id]?.dossiersUrgents || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Card */}
            <Card className="border-0 shadow-vuexy-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Tâches à venir</CardTitle>
              </CardHeader>
              <CardContent>
                {worldTasks[world.id] && worldTasks[world.id].length > 0 ? (
                  <div className="space-y-2">
                    {worldTasks[world.id].map((task) => (
                      <div key={task.id} className="p-2 rounded-lg bg-secondary/30 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{task.title}</p>
                          {task.due_date && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(task.due_date), 'dd MMM yyyy', { locale: fr })}
                            </p>
                          )}
                        </div>
                        <Badge variant={getPriorityColor(task.priority)} className="ml-2 text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">Aucune tâche à venir</p>
                )}
              </CardContent>
            </Card>

            {/* Emails Card */}
            <Card className="border-0 shadow-vuexy-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Emails
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground text-center py-2">Fonctionnalité à venir</p>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Dossiers Importants */}
      {!loading && importantDossiers.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-foreground">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Dossiers Importants
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {importantDossiers.map((dossier) => (
              <Card
                key={dossier.id}
                className="border-0 shadow-vuexy-md hover:shadow-vuexy-lg transition-all cursor-pointer group"
                onClick={() => navigate(`/dossier/${dossier.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                      {dossier.title}
                    </CardTitle>
                    <Badge className={cn('text-xs whitespace-nowrap', getStatusBadgeColor(dossier.status))}>
                      {getStatusLabel(dossier.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      <span>{format(new Date(dossier.created_at), 'dd MMMM yyyy', { locale: fr })}</span>
                    </div>
                    {dossier.owner?.display_name && (
                      <p className="truncate">Par: {dossier.owner.display_name}</p>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {dossier.world_code}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
