import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { World } from '@/lib/store';

interface DossierFiltersProps {
  worlds: World[];
  selectedWorlds: string[];
  selectedStatus: string;
  searchQuery: string;
  onWorldsChange: (worldCodes: string[]) => void;
  onStatusChange: (status: string) => void;
  onSearchChange: (query: string) => void;
  onReset: () => void;
  resultCount: number;
}

const DossierFilters = ({
  worlds,
  selectedWorlds,
  selectedStatus,
  searchQuery,
  onWorldsChange,
  onStatusChange,
  onSearchChange,
  onReset,
  resultCount,
}: DossierFiltersProps) => {
  const toggleWorld = (worldCode: string) => {
    if (selectedWorlds.includes(worldCode)) {
      onWorldsChange(selectedWorlds.filter((w) => w !== worldCode));
    } else {
      onWorldsChange([...selectedWorlds, worldCode]);
    }
  };

  const hasActiveFilters = selectedWorlds.length > 0 || selectedStatus !== 'all' || searchQuery !== '';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Filtres</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            <X className="h-4 w-4 mr-1" />
            Réinitialiser
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* World Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Mondes</label>
          <div className="flex flex-wrap gap-2">
            {worlds.map((world) => {
              const isSelected = selectedWorlds.includes(world.code);
              return (
                <Badge
                  key={world.id}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer transition-all hover:scale-105"
                  style={
                    isSelected
                      ? {
                          backgroundColor: world.theme_colors.primary,
                          color: 'white',
                        }
                      : {
                          borderColor: world.theme_colors.primary,
                          color: world.theme_colors.primary,
                        }
                  }
                  onClick={() => toggleWorld(world.code)}
                >
                  {world.code}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Statut</label>
          <Select value={selectedStatus} onValueChange={onStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="nouveau">Nouveau</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="cloture">Clôturé</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Recherche</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Titre ou tags..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {resultCount} dossier{resultCount !== 1 ? 's' : ''} trouvé{resultCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default DossierFilters;
