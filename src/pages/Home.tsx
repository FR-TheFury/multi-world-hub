import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, FolderOpen, Clock, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { supabase } from '@/integrations/supabase/client';
import jdeLogo from '@/assets/JDE.png';
import jdmoLogo from '@/assets/JDMO.png';
import dbcsLogo from '@/assets/DBCS.png';

interface WorldStats {
  total: number;
  en_cours: number;
  en_attente: number;
}

const Home = () => {
  const navigate = useNavigate();
  const { session, accessibleWorlds } = useAuthStore();
  const [worldStats, setWorldStats] = useState<Record<string, WorldStats>>({});

  useEffect(() => {
    if (!session) {
      navigate('/auth');
    }
  }, [session, navigate]);

  useEffect(() => {
    if (session && accessibleWorlds.length > 0) {
      fetchWorldStats();
    }
  }, [session, accessibleWorlds.length]);

  const fetchWorldStats = async () => {
    try {
      const statsMap: Record<string, WorldStats> = {};

      for (const world of accessibleWorlds) {
        const { count: total } = await supabase
          .from('dossiers')
          .select('*', { count: 'exact', head: true })
          .eq('world_id', world.id);

        const { count: en_cours } = await supabase
          .from('dossiers')
          .select('*', { count: 'exact', head: true })
          .eq('world_id', world.id)
          .eq('status', 'en_cours');

        const { count: nouveau } = await supabase
          .from('dossiers')
          .select('*', { count: 'exact', head: true })
          .eq('world_id', world.id)
          .eq('status', 'nouveau');

        statsMap[world.code] = {
          total: total || 0,
          en_cours: en_cours || 0,
          en_attente: nouveau || 0,
        };
      }

      setWorldStats(statsMap);
    } catch (error) {
      console.error('Error fetching world stats:', error);
    }
  };

  if (!session) return null;

  // Mapping des logos par code de monde
  const logoMap: Record<string, string> = {
    JDE: jdeLogo,
    JDMO: jdmoLogo,
    DBCS: dbcsLogo,
  };

  // Mapping des couleurs par code de monde (pour corriger les couleurs des noms)
  const colorMap: Record<string, string> = {
    JDE: 'hsl(0, 85%, 58%)',     // Rouge
    JDMO: 'hsl(25, 95%, 60%)',   // Orange
    DBCS: 'hsl(145, 65%, 48%)',  // Vert
  };

  // Mapping des gradients par code de monde
  const gradientMap: Record<string, string> = {
    JDE: 'from-red-500/20 to-rose-600/10',
    JDMO: 'from-orange-500/20 to-amber-600/10',
    DBCS: 'from-emerald-500/20 to-green-600/10',
  };

  // Créer la liste des mondes à partir des mondes accessibles et les trier dans l'ordre souhaité
  const worldsMap = accessibleWorlds.reduce((acc, world) => {
    acc[world.code] = {
      name: world.code,
      fullName: world.name,
      logo: logoMap[world.code],
      color: colorMap[world.code] || world.theme_colors.primary,
      gradient: gradientMap[world.code] || 'from-primary/20 to-accent/10',
    };
    return acc;
  }, {} as Record<string, any>);

  // Ordre souhaité: JDE, JDMO, DBCS
  const orderedCodes = ['JDE', 'JDMO', 'DBCS'];
  const worlds = orderedCodes
    .filter(code => worldsMap[code])
    .map(code => worldsMap[code]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/10 to-accent/10 p-4 relative overflow-hidden">
      {/* Theme toggle */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Animated background circles */}
      <motion.div
        className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <div className="relative z-10 max-w-7xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-6 mb-6">
            <img src={jdeLogo} alt="JDE" className="h-16 w-auto" />
            <img src={jdmoLogo} alt="JDMO" className="h-16 w-auto" />
            <img src={dbcsLogo} alt="DBCS" className="h-16 w-auto" />
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Accédez à vos espaces de travail et gérez vos projets en toute simplicité
          </p>
        </motion.div>

        {/* World cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {worlds.map((world, index) => {
            const worldData = accessibleWorlds.find(w => w.code === world.name);
            const stats = worldData ? worldStats[worldData.code] : null;
            
            return (
              <div key={world.name} className="space-y-4">
                {/* Stats au-dessus de la carte */}
                {stats && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.2,
                    }}
                    className="grid grid-cols-3 gap-2"
                  >
                    <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
                      <CardContent className="p-3 flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FolderOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-lg font-bold">{stats.total}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
                      <CardContent className="p-3 flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <Clock className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">En cours</p>
                          <p className="text-lg font-bold">{stats.en_cours}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
                      <CardContent className="p-3 flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <AlertCircle className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">En attente</p>
                          <p className="text-lg font-bold">{stats.en_attente}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
                
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.2 + 0.1,
                  }}
                  whileHover={{ scale: 1.05, y: -10 }}
                  className={`relative p-8 rounded-3xl bg-gradient-to-br ${world.gradient} backdrop-blur-sm border-2 border-white/20 shadow-2xl overflow-hidden group`}
                >
                  {/* Glow effect */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${world.color}20 0%, transparent 70%)`,
                    }}
                  />

                  <div className="relative z-10">
                    <motion.img
                      src={world.logo}
                      alt={world.name}
                      className="h-24 w-auto mx-auto mb-6"
                      whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.5 }}
                    />
                    <h3 className="text-2xl font-bold text-center mb-6" style={{ color: world.color }}>
                      {world.name}
                    </h3>
                    
                    <Button
                      onClick={() => navigate(`/${world.name.toLowerCase()}/dossiers`)}
                      className={`w-full ${
                        world.name === 'JDE' 
                          ? 'bg-red-600 hover:bg-red-800' 
                          : world.name === 'JDMO'
                          ? 'bg-orange-600 hover:bg-orange-800'
                          : 'bg-green-600 hover:bg-green-800'
                      } text-white shadow-md transition-colors`}
                    >
                      Entrer dans le Monde
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  {/* Decorative corner */}
                  <div
                    className="absolute top-0 right-0 w-32 h-32 opacity-10"
                    style={{
                      background: `radial-gradient(circle at 100% 0%, ${world.color} 0%, transparent 70%)`,
                    }}
                  />
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center"
        >
          <Button
            size="lg"
            onClick={() => navigate('/dashboard')}
            className="group px-8 py-6 text-lg"
          >
            Accéder au Dashboard
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-2 transition-transform" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
