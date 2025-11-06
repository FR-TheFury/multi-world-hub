import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import WorldCard3D from '@/components/WorldCard3D';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const { accessibleWorlds } = useAuthStore();
  const [dossiersByWorld, setDossiersByWorld] = useState<Record<string, Dossier[]>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentDossiers();
  }, [accessibleWorlds]);

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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'nouveau':
        return 'bg-blue-500 text-white';
      case 'en_cours':
        return 'bg-yellow-500 text-white';
      case 'cloture':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
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
        <h2 className="text-3xl font-bold mb-2">Bienvenue</h2>
        <p className="text-muted-foreground">
          Accédez à vos espaces de travail et consultez vos derniers dossiers
        </p>
      </div>

      {/* 3D World Cards */}
      <section>
        <h3 className="text-xl font-semibold mb-4">Vos Mondes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accessibleWorlds.map((world) => (
            <WorldCard3D key={world.id} world={world} />
          ))}
        </div>
      </section>

      {/* Recent Dossiers by World */}
      {!loading && Object.keys(dossiersByWorld).length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Derniers Dossiers</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dossiers')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Voir tous les dossiers
            </Button>
          </div>

          {Object.entries(dossiersByWorld).map(([worldCode, dossiers]) => {
            const world = accessibleWorlds.find(w => w.code === worldCode);
            if (!world || dossiers.length === 0) return null;

            return (
              <Card key={worldCode} className="shadow-vuexy-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" style={{ color: world.theme_colors.primary }} />
                      {world.name}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/${worldCode.toLowerCase()}/dossiers`)}
                    >
                      Voir tout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dossiers.map((dossier) => (
                      <div
                        key={dossier.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-smooth cursor-pointer"
                        onClick={() => navigate(`/${worldCode.toLowerCase()}/dossiers/${dossier.id}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{dossier.title}</h4>
                            <Badge className={getStatusBadgeColor(dossier.status)}>
                              {getStatusLabel(dossier.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
        <Card className="text-center p-8">
          <p className="text-muted-foreground">
            Vous n'avez accès à aucun monde pour le moment.
          </p>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
