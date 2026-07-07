import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface NavigationTileProps {
  to: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  index: number;
}

export function NavigationTile({ to, icon: Icon, label, description, index }: NavigationTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
    >
      <Link to={to} className="block">
        <div className="nav-tile group">
          <div className="nav-tile-icon group-hover:bg-foreground group-hover:text-background transition-colors duration-200">
            <Icon className="w-6 h-6" />
          </div>
          <div className="text-center">
            <h3 className="font-medium text-foreground">{label}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
