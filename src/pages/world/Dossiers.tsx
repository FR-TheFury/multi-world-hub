import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Dossier {
  id: string;
  title: string;
  status: string;
  created_at: string;
  owner: { display_name: string | null };
  tags: string[] | null;
}

const Dossiers = () => {
  const { worldCode } = useParams<{ worldCode: string }>();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDossiers();
  }, [worldCode]);

  const fetchDossiers = async () => {
    if (!worldCode) return;

    try {
      // Get world ID from code
      const upperCode = worldCode.toUpperCase() as 'JDE' | 'JDMO' | 'DBCS';
      const { data: worldData } = await supabase
        .from('worlds')
        .select('id')
        .eq('code', upperCode)
        .single();

      if (!worldData) return;

      const { data } = await supabase
        .from('dossiers')
        .select(`
          id,
          title,
          status,
          created_at,
          tags,
          owner:profiles(display_name)
        `)
        .eq('world_id', worldData.id)
        .order('created_at', { ascending: false });

      if (data) {
        setDossiers(data.map(d => ({
          ...d,
          owner: (d as any).owner,
        })));
      }
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

  const filteredDossiers = dossiers.filter((dossier) =>
    dossier.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Dossiers {worldCode?.toUpperCase()}</h2>
        <p className="text-muted-foreground">
          Gérez et consultez tous vos dossiers
        </p>
      </div>

      <Card className="shadow-vuexy-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tous les dossiers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un dossier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredDossiers.map((dossier) => (
              <div
                key={dossier.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-smooth cursor-pointer"
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
                        {dossier.tags.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredDossiers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Aucun dossier trouvé
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dossiers;
