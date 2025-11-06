import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatsCard from '@/components/StatsCard';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Users, FolderOpen, CheckSquare, Activity } from 'lucide-react';

interface WorldStats {
  worldCode: string;
  worldName: string;
  color: string;
  totalDossiers: number;
  nouveauDossiers: number;
  enCoursDossiers: number;
  clotureDossiers: number;
  totalTasks: number;
  todotasks: number;
  inProgressTasks: number;
  doneTasks: number;
  activeUsers: number;
}

const Analytics = () => {
  const { accessibleWorlds, isSuperAdmin } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDossiers: 0,
    totalTasks: 0,
    activeUsers: 0
  });
  const [worldStats, setWorldStats] = useState<WorldStats[]>([]);

  useEffect(() => {
    if (!isSuperAdmin()) {
      navigate('/dashboard');
      return;
    }
    fetchAnalytics();
  }, [isSuperAdmin, navigate, accessibleWorlds]);

  const fetchAnalytics = async () => {
    try {
      // Fetch ALL data in parallel with optimized queries
      const [
        profilesCount,
        dossiersData,
        tasksData,
        worldAccessData
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('dossiers').select('world_id, status'),
        supabase.from('tasks').select('world_id, status'),
        supabase.from('user_world_access').select('user_id, world_id')
      ]);

      // Process global stats
      setStats({
        totalUsers: profilesCount.count || 0,
        totalDossiers: dossiersData.data?.length || 0,
        totalTasks: tasksData.data?.length || 0,
        activeUsers: new Set(worldAccessData.data?.map(wa => wa.user_id)).size
      });

      // Process stats per world
      const worldStatsData: WorldStats[] = accessibleWorlds.map(world => {
        const worldDossiers = dossiersData.data?.filter(d => d.world_id === world.id) || [];
        const worldTasks = tasksData.data?.filter(t => t.world_id === world.id) || [];
        const worldUsers = worldAccessData.data?.filter(wa => wa.world_id === world.id) || [];

        return {
          worldCode: world.code,
          worldName: world.name,
          color: world.theme_colors.primary,
          totalDossiers: worldDossiers.length,
          nouveauDossiers: worldDossiers.filter(d => d.status === 'nouveau').length,
          enCoursDossiers: worldDossiers.filter(d => d.status === 'en_cours').length,
          clotureDossiers: worldDossiers.filter(d => d.status === 'cloture').length,
          totalTasks: worldTasks.length,
          todotasks: worldTasks.filter(t => t.status === 'todo').length,
          inProgressTasks: worldTasks.filter(t => t.status === 'in_progress').length,
          doneTasks: worldTasks.filter(t => t.status === 'done').length,
          activeUsers: worldUsers.length
        };
      });

      setWorldStats(worldStatsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin()) {
    return null;
  }

  const dossiersByWorld = worldStats.map(ws => ({
    name: ws.worldCode,
    total: ws.totalDossiers,
    nouveau: ws.nouveauDossiers,
    enCours: ws.enCoursDossiers,
    cloture: ws.clotureDossiers
  }));

  const tasksByWorld = worldStats.map(ws => ({
    name: ws.worldCode,
    total: ws.totalTasks,
    todo: ws.todotasks,
    enCours: ws.inProgressTasks,
    termine: ws.doneTasks
  }));

  const usersByWorld = worldStats.map(ws => ({
    name: ws.worldName,
    value: ws.activeUsers,
    color: ws.color
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1 text-foreground">Analytiques</h2>
        <p className="text-sm text-muted-foreground">
          Vue d'ensemble des activités et statistiques globales
        </p>
      </div>

      {/* Global Stats */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-foreground">Statistiques Globales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Utilisateurs Total"
            value={stats.totalUsers}
            icon={Users}
            iconColor="#7c3aed"
            iconBg="#7c3aed15"
          />
          <StatsCard
            title="Utilisateurs Actifs"
            value={stats.activeUsers}
            icon={Activity}
            iconColor="#2563eb"
            iconBg="#2563eb15"
          />
          <StatsCard
            title="Dossiers Total"
            value={stats.totalDossiers}
            icon={FolderOpen}
            iconColor="#059669"
            iconBg="#05966915"
          />
          <StatsCard
            title="Tâches Total"
            value={stats.totalTasks}
            icon={CheckSquare}
            iconColor="#dc2626"
            iconBg="#dc262615"
          />
        </div>
      </section>

      {/* Charts */}
      {!loading && worldStats.length > 0 && (
        <>
          {/* Dossiers par Monde */}
          <Card className="border-0 shadow-vuexy-md">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                Dossiers par Monde et Statut
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dossiersByWorld}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="nouveau" fill="#3b82f6" name="Nouveau" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="enCours" fill="#f59e0b" name="En cours" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cloture" fill="#64748b" name="Clôturé" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tâches par Monde */}
          <Card className="border-0 shadow-vuexy-md">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                Tâches par Monde et Statut
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={tasksByWorld}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="todo" stroke="#3b82f6" strokeWidth={2} name="À faire" />
                  <Line type="monotone" dataKey="enCours" stroke="#f59e0b" strokeWidth={2} name="En cours" />
                  <Line type="monotone" dataKey="termine" stroke="#10b981" strokeWidth={2} name="Terminé" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Utilisateurs Actifs par Monde */}
          <Card className="border-0 shadow-vuexy-md">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Utilisateurs Actifs par Monde
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={usersByWorld}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {usersByWorld.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Stats Table */}
          <Card className="border-0 shadow-vuexy-md">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Statistiques Détaillées par Monde
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {worldStats.map((ws) => (
                  <div key={ws.worldCode} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${ws.color}15` }}
                      >
                        <Activity className="h-5 w-5" style={{ color: ws.color }} />
                      </div>
                      <div>
                        <h4 className="font-semibold">{ws.worldName}</h4>
                        <p className="text-sm text-muted-foreground">{ws.worldCode}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Dossiers</p>
                        <p className="text-lg font-semibold">{ws.totalDossiers}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tâches</p>
                        <p className="text-lg font-semibold">{ws.totalTasks}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">En cours</p>
                        <p className="text-lg font-semibold text-amber-600">{ws.enCoursDossiers}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Utilisateurs</p>
                        <p className="text-lg font-semibold">{ws.activeUsers}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {loading && (
        <div className="text-center py-12 text-muted-foreground">
          Chargement des statistiques...
        </div>
      )}
    </div>
  );
};

export default Analytics;
