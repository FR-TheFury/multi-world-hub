import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import WorldCard3D from '@/components/WorldCard3D';
import StatsCard from '@/components/StatsCard';
import TasksPanel from '@/components/TasksPanel';
import AppointmentsPanel from '@/components/AppointmentsPanel';
import EmailsPanel from '@/components/EmailsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, FolderOpen, CheckSquare, Mail } from 'lucide-react';
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

const Dashboard = () => {
  const { accessibleWorlds: unsortedWorlds, profile } = useAuthStore();
  
  // Sort worlds in the correct order: JDE, JDMO, DBCS - MEMOIZED to prevent infinite loops
  const accessibleWorlds = useMemo(() => {
    return [...unsortedWorlds].sort((a, b) => {
      const order = { 'JDE': 1, 'JDMO': 2, 'DBCS': 3 };
      return order[a.code] - order[b.code];
    });
  }, [unsortedWorlds]);

  const [dossiersByWorld, setDossiersByWorld] = useState<Record<string, Dossier[]>>({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInProgress: 0,
    totalTasks: 0,
    newEmails: 2, // Demo data
    byWorld: {} as Record<string, number>
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (accessibleWorlds.length > 0) {
      fetchRecentDossiers();
      fetchStats();
    }
  }, [accessibleWorlds.length]);

  const fetchRecentDossiers = async () => {
    try {
      const worldMap: Record<string, Dossier[]> = {};

      for (const world of accessibleWorlds) {
        const { data } = await supabase
          .from('dossiers')
          .select(`
            id,
            title,
            status,
            created_at,
            tags,
            owner:profiles(display_name),
            world:worlds(code)
          `)
          .eq('world_id', world.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (data) {
          worldMap[world.code] = data.map(d => ({
            ...d,
            owner: (d as any).owner,
            world_code: (d as any).world.code,
          }));
        }
      }

      setDossiersByWorld(worldMap);
    } catch (error) {
      console.error('Error fetching dossiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Total dossiers en cours
      const { count: totalInProgress } = await supabase
        .from('dossiers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'en_cours')
        .in('world_id', accessibleWorlds.map(w => w.id));

      // Total tâches
      const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true });

      // Dossiers en cours par monde
      const byWorld: Record<string, number> = {};
      for (const world of accessibleWorlds) {
        const { count } = await supabase
          .from('dossiers')
          .select('*', { count: 'exact', head: true })
          .eq('world_id', world.id)
          .eq('status', 'en_cours');
        
        byWorld[world.code] = count || 0;
      }

      setStats({
        totalInProgress: totalInProgress || 0,
        totalTasks: totalTasks || 0,
        newEmails: 2, // Demo data
        byWorld
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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
        return 'bg-slate-100 text-slate-700 border-slate-200';
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
          Accédez à vos espaces de travail et consultez vos derniers dossiers
        </p>
      </div>

      {/* Statistics Cards */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-foreground">Statistiques</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Dossiers en cours"
            value={stats.totalInProgress}
            icon={FolderOpen}
            iconColor="#7c3aed"
            iconBg="#7c3aed15"
          />
          <StatsCard
            title="Tâches assignées"
            value={stats.totalTasks}
            icon={CheckSquare}
            iconColor="#2563eb"
            iconBg="#2563eb15"
          />
          <StatsCard
            title="Nouveaux emails"
            value={stats.newEmails}
            icon={Mail}
            iconColor="#10b981"
            iconBg="#10b98115"
          />
          {accessibleWorlds.slice(0, 1).map((world) => (
            <StatsCard
              key={world.id}
              title={`${world.name} - En cours`}
              value={stats.byWorld[world.code] || 0}
              icon={FileText}
              iconColor={world.theme_colors.primary}
              iconBg={`${world.theme_colors.primary}15`}
            />
          ))}
        </div>
      </section>

      {/* Tasks, Appointments and Emails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TasksPanel />
        <AppointmentsPanel />
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <EmailsPanel />
      </div>

      {/* 3D World Cards */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-foreground">Vos Mondes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accessibleWorlds.map((world) => (
            <WorldCard3D key={world.id} world={world} />
          ))}
        </div>
      </section>

      {/* Recent Dossiers by World */}
      {!loading && Object.keys(dossiersByWorld).length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Derniers Dossiers</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dossiers')}
              className="h-9"
            >
              <FileText className="h-4 w-4 mr-2" />
              Voir tous les dossiers
            </Button>
          </div>

          {Object.entries(dossiersByWorld).map(([worldCode, dossiers]) => {
            const world = accessibleWorlds.find(w => w.code === worldCode);
            if (!world || dossiers.length === 0) return null;

            return (
              <Card key={worldCode} className="shadow-vuexy-md border-0">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${world.theme_colors.primary}15` }}>
                        <FileText className="h-5 w-5" style={{ color: world.theme_colors.primary }} />
                      </div>
                      <span>{world.name}</span>
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/${worldCode.toLowerCase()}/dossiers`)}
                      className="h-8"
                    >
                      Voir tout
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dossiers.map((dossier) => (
                      <div
                        key={dossier.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/${worldCode.toLowerCase()}/dossiers/${dossier.id}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{dossier.title}</h4>
                            <Badge className={cn("text-xs", getStatusBadgeColor(dossier.status))}>
                              {getStatusLabel(dossier.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {format(new Date(dossier.created_at), 'dd MMM yyyy', { locale: fr })}
                            </span>
                            <span>{dossier.owner?.display_name || 'Inconnu'}</span>
                            {dossier.tags && dossier.tags.length > 0 && (
                              <span className="text-xs">
                                {dossier.tags.slice(0, 2).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {!loading && accessibleWorlds.length === 0 && (
        <Card className="text-center py-12 shadow-vuexy-md border-0">
          <div className="p-4 rounded-full bg-muted/50 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <FileText className="h-10 w-10 opacity-40" />
          </div>
          <p className="text-muted-foreground">
            Vous n'avez accès à aucun monde pour le moment.
          </p>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
