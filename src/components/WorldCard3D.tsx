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
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        whileHover={{
          rotateY: 5,
          rotateX: -5,
        }}
        transition={{ duration: 0.3 }}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        <Card
          className="relative overflow-hidden shadow-vuexy-lg hover:shadow-vuexy-xl transition-smooth cursor-pointer"
          onClick={handleClick}
          style={{
            background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.accent}10 100%)`,
            borderColor: colors.primary,
            borderWidth: '1px',
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
                className="w-full group"
                style={{
                  backgroundColor: colors.primary,
                  color: 'white',
                }}
              >
                Entrer dans le Monde
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Decorative gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              background: `radial-gradient(circle at 100% 0%, ${colors.accent} 0%, transparent 50%)`,
            }}
          />
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default WorldCard3D;
