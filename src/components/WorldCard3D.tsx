import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { World } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import jdeLogo from '@/assets/JDE.png';
import jdmoLogo from '@/assets/JDMO.png';
import dbcsLogo from '@/assets/DBCS.png';

interface WorldCard3DProps {
  world: World;
}

const WorldCard3D = ({ world }: WorldCard3DProps) => {
  const navigate = useNavigate();
  const colors = world.theme_colors;

  const handleClick = () => {
    navigate(`/${world.code.toLowerCase()}/dossiers`);
  };

  const logoMap: Record<string, string> = {
    JDE: jdeLogo,
    JDMO: jdmoLogo,
    DBCS: dbcsLogo,
  };

  return (
    <motion.div
      className="perspective-1000"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -4 }}
    >
      <motion.div
        whileHover={{
          rotateY: 2,
          rotateX: -2,
        }}
        transition={{ 
          duration: 0.3,
          type: "spring",
          stiffness: 150,
          damping: 20
        }}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        <Card
          className="relative overflow-hidden shadow-3d hover:shadow-vuexy-xl transition-slow cursor-pointer backdrop-blur-sm"
          onClick={handleClick}
          style={{
            background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.accent}15 100%)`,
            borderColor: colors.primary,
            borderWidth: '2px',
            borderRadius: '1.5rem',
          }}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <img 
                src={logoMap[world.code]} 
                alt={`${world.name} logo`}
                className="h-16 w-auto object-contain"
                style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.1))' }}
              />
              <Badge
                className="shadow-md"
                style={{
                  backgroundColor: colors.primary,
                  color: 'white',
                }}
              >
                {world.code}
              </Badge>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold" style={{ color: colors.primary }}>
                {world.name}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{world.description}</p>
            </div>

            <div className="pt-4">
              <Button
                className="w-full group relative overflow-hidden text-white transition-all duration-300"
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: '0.875rem',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(0.85)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                <span className="relative z-10 flex items-center justify-center">
                  Entrer dans le Monde
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-all duration-300" />
                </span>
              </Button>
            </div>
          </div>

          {/* Decorative gradient overlays */}
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              background: `radial-gradient(circle at 100% 0%, ${colors.accent} 0%, transparent 50%)`,
            }}
          />
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 0.1 }}
            transition={{ duration: 0.4 }}
            style={{
              background: `linear-gradient(45deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            }}
          />
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default WorldCard3D;
