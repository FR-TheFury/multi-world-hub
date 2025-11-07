import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Mail, TrendingUp, Search, Plus, Archive, Eye, MoreVertical, Calendar as CalendarIcon, Send, Download } from "lucide-react";
import CreateDossierDialog from "@/components/dossier/CreateDossierDialog";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DBCSLogo from "@/assets/DBCS.svg";

interface Dossier {
  id: string;
  title: string;
  status: string;
  created_at: string;
  owner_id: string;
  tags: string[] | null;
}

interface World {
  id: string;
  code: string;
  name: string;
  description: string | null;
  theme_colors: any;
}

export default function DossiersDBCS() {
  const navigate = useNavigate();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [world, setWorld] = useState<World | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchWorldAndDossiers();
  }, []);

  const fetchWorldAndDossiers = async () => {
    try {
      setLoading(true);
      
      // Fetch DBCS world
      const { data: worldData, error: worldError } = await supabase
        .from("worlds")
        .select("*")
        .eq("code", "DBCS")
        .single();

      if (worldError) throw worldError;
      setWorld(worldData);

      // Fetch dossiers for DBCS world
      const { data: dossiersData, error: dossiersError } = await supabase
        .from("dossiers")
        .select(`
          id,
          title,
          status,
          created_at,
          owner_id,
          tags
        `)
        .eq("world_id", worldData.id)
        .order("created_at", { ascending: false });

      if (dossiersError) throw dossiersError;
      setDossiers(dossiersData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors du chargement des dossiers");
    } finally {
      setLoading(false);
    }
  };

  const handlePrefetchDossier = async (dossierId: string) => {
    try {
      const { data, error } = await supabase
        .from("dossiers")
        .select(`
          *,
          worlds (
            id,
            code,
            name
          )
        `)
        .eq("id", dossierId)
        .single();

      if (error) throw error;
      
      sessionStorage.setItem(`dossier_${dossierId}`, JSON.stringify(data));
    } catch (error) {
      console.error("Error prefetching dossier:", error);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const statusMap: Record<string, string> = {
      nouveau: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
      en_cours: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
      archive: "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30",
      cloture: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
    };
    return statusMap[status] || "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30";
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      nouveau: "Nouveau",
      en_cours: "En cours",
      archive: "Archivé",
      cloture: "Clôturé",
    };
    return statusLabels[status] || status;
  };

  const filteredDossiers = dossiers.filter((dossier) => {
    const matchesSearch = dossier.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || dossier.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: dossiers.length,
    nouveau: dossiers.filter((d) => d.status === "nouveau").length,
    archive: dossiers.filter((d) => d.status === "archive").length,
    cloture: dossiers.filter((d) => d.status === "cloture").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={DBCSLogo} alt="DBCS" className="h-16 w-16" />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              DBCS - Base de Connaissance et Statistiques
            </h1>
            <p className="text-muted-foreground">
              Archivage et analyse des dossiers clôturés
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Mail className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Calendar className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <TrendingUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dossiers</CardTitle>
            <Archive className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux</CardTitle>
            <Archive className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.nouveau}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-500/20 bg-gradient-to-br from-gray-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archivés</CardTitle>
            <Archive className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.archive}</div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clôturés</CardTitle>
            <Archive className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cloture}</div>
          </CardContent>
        </Card>
      </div>

      {/* Dossiers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dossiers Archivés</CardTitle>
              <CardDescription>
                Gestion et consultation des dossiers archivés
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Dossier
            </Button>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un dossier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDossiers.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Aucun dossier trouvé</h3>
                <p className="text-muted-foreground mb-4">
                  Commencez par créer votre premier dossier d'archivage
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un dossier
                </Button>
              </div>
            ) : (
              filteredDossiers.map((dossier) => (
                <div
                  key={dossier.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onMouseEnter={() => handlePrefetchDossier(dossier.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{dossier.title}</h3>
                      <Badge variant="outline" className={getStatusBadgeColor(dossier.status)}>
                        {getStatusLabel(dossier.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Créé le {new Date(dossier.created_at).toLocaleDateString("fr-FR")}
                      </span>
                      {dossier.tags && dossier.tags.length > 0 && (
                        <div className="flex gap-1">
                          {dossier.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/dossier/${dossier.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir le détail
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          Planifier
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Send className="h-4 w-4 mr-2" />
                          Envoyer
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {world && (
        <CreateDossierDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          worldId={world.id}
          onSuccess={fetchWorldAndDossiers}
        />
      )}
    </div>
  );
}
