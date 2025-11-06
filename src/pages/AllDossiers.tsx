import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DossierFilters from '@/components/DossierFilters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Dossier {
  id: string;
  title: string;
  status: string;
  created_at: string;
  owner: { display_name: string | null };
  tags: string[] | null;
  world: {
    code: string;
    name: string;
    theme_colors: {
      primary: string;
      accent: string;
      neutral: string;
    };
  };
}

const AllDossiers = () => {
  const { accessibleWorlds } = useAuthStore();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorlds, setSelectedWorlds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllDossiers();
  }, [accessibleWorlds]);

  const fetchAllDossiers = async () => {
    if (accessibleWorlds.length === 0) return;

    try {
      const worldIds = accessibleWorlds.map((w) => w.id);

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
        .in('world_id', worldIds)
        .order('created_at', { ascending: false });

      if (data) {
        setDossiers(
          data.map((d) => ({
            ...d,
            owner: (d as any).owner,
            world: (d as any).world,
          }))
        );
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

  const filteredDossiers = dossiers.filter((dossier) => {
    // Filter by world
    if (selectedWorlds.length > 0 && !selectedWorlds.includes(dossier.world.code)) {
      return false;
    }

    // Filter by status
    if (selectedStatus !== 'all' && dossier.status !== selectedStatus) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = dossier.title.toLowerCase().includes(query);
      const matchesTags = dossier.tags?.some((tag) => tag.toLowerCase().includes(query));
      return matchesTitle || matchesTags;
    }

    return true;
  });

  const handleReset = () => {
    setSelectedWorlds([]);
    setSelectedStatus('all');
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement des dossiers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Tous les Dossiers</h2>
        <p className="text-muted-foreground">
          Gérez et consultez tous vos dossiers de tous les mondes
        </p>
      </div>

      <Card className="shadow-vuexy-md">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Liste des dossiers
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <DossierFilters
            worlds={accessibleWorlds}
            selectedWorlds={selectedWorlds}
            selectedStatus={selectedStatus}
            searchQuery={searchQuery}
            onWorldsChange={setSelectedWorlds}
            onStatusChange={setSelectedStatus}
            onSearchChange={setSearchQuery}
            onReset={handleReset}
            resultCount={filteredDossiers.length}
          />

          <div className="mt-6">
            {filteredDossiers.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Monde</TableHead>
                      <TableHead>Titre</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date de création</TableHead>
                      <TableHead>Propriétaire</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDossiers.map((dossier) => (
                      <TableRow
                        key={dossier.id}
                        className="cursor-pointer hover:bg-accent/50"
                      >
                        <TableCell>
                          <Badge
                            style={{
                              backgroundColor: dossier.world.theme_colors.primary,
                              color: 'white',
                            }}
                          >
                            {dossier.world.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{dossier.title}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(dossier.status)}>
                            {getStatusLabel(dossier.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(dossier.created_at), 'dd MMM yyyy', {
                            locale: fr,
                          })}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {dossier.owner?.display_name || 'Inconnu'}
                        </TableCell>
                        <TableCell>
                          {dossier.tags && dossier.tags.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {dossier.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-muted px-2 py-1 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun dossier trouvé</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllDossiers;
