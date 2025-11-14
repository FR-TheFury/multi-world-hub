import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import WorldDashboardCard from '@/components/WorldDashboardCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Euro, AlertTriangle } from 'lucide-react';
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

  const [importantDossiers, setImportantDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    caTotal: 0,
    caJDE: 0,
    caJDMO: 0,
    caDBCS: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (accessibleWorlds.length > 0) {
      fetchImportantDossiers();
      fetchGlobalStats();
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

      {/* Dossiers Importants */}
      {!loading && importantDossiers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Dossiers Importants
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {importantDossiers.map((dossier) => (
              <Card
                key={dossier.id}
                className="border-0 shadow-vuexy-md hover:shadow-vuexy-lg transition-all cursor-pointer"
                onClick={() => navigate(`/${dossier.world_code.toLowerCase()}/dossiers/${dossier.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-red-50 text-red-700 border-red-200">Urgent</Badge>
                    <Badge className={cn("text-xs", getStatusBadgeColor(dossier.status))}>
                      {getStatusLabel(dossier.status)}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{dossier.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(dossier.created_at), 'dd MMM yyyy', { locale: fr })}
                    </span>
                    <span>{dossier.owner?.display_name || 'Inconnu'}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* World Cards Verticales */}
      <section>
        <h3 className="text-lg font-semibold mb-4 text-foreground">Vos Mondes</h3>
        <div className="space-y-6">
          {accessibleWorlds.map((world) => (
            <WorldDashboardCard key={world.id} world={world} />
          ))}
        </div>
      </section>


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
