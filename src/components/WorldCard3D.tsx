import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { World } from '@/lib/store';
import { useNavigate } from 'react-router-dom';

interface WorldCard3DProps {
  world: World;
}

const WorldCard3D = ({ world }: WorldCard3DProps) => {
  const navigate = useNavigate();
  const colors = world.theme_colors;

  const handleClick = () => {
    navigate(`/${world.code.toLowerCase()}/dossiers`);
  };

  return (
    <motion.div
      className="perspective-1000"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.06, y: -8 }}
    >
      <motion.div
        whileHover={{
          rotateY: 6,
          rotateX: -6,
        }}
        transition={{ 
          duration: 0.4,
          type: "spring",
          stiffness: 200,
          damping: 15
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
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-2xl font-bold" style={{ color: colors.primary }}>
                  {world.name}
                </h3>
                <p className="text-sm text-muted-foreground">{world.description}</p>
              </div>
              <Badge
                className="shadow-sm"
                style={{
                  backgroundColor: colors.primary,
                  color: 'white',
                }}
              >
                {world.code}
              </Badge>
            </div>

            <div className="pt-4">
              <Button
                className="w-full group relative overflow-hidden"
                style={{
                  backgroundColor: colors.primary,
                  color: 'white',
                  borderRadius: '0.875rem',
                }}
              >
                <span className="relative z-10 flex items-center justify-center">
                  Entrer dans le Monde
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-2 transition-all duration-300" />
                </span>
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at center, ${colors.accent} 0%, transparent 70%)`,
                  }}
                />
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
