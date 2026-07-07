import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MoreHorizontal, Shield, Crown, User, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StaffWithStats } from "@/hooks/useStaff";

const roleConfig = {
  admin: { label: "Admin", icon: Shield, variant: "destructive" as const },
  owner: { label: "Owner", icon: Crown, variant: "default" as const },
  manager: { label: "Manager", icon: Shield, variant: "default" as const },
  stylist: { label: "Stylist", icon: User, variant: "secondary" as const },
  assistant: { label: "Assistant", icon: Shield, variant: "outline" as const },
  front_desk: { label: "Front Desk", icon: User, variant: "outline" as const },
};

interface StaffCardProps {
  member: StaffWithStats;
  index: number;
  isOwnerViewing: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
}

export function StaffCard({
  member,
  index,
  isOwnerViewing,
  onEdit,
  onToggleActive,
}: StaffCardProps) {
  const navigate = useNavigate();
  const role = roleConfig[member.role] || roleConfig.stylist;
  const RoleIcon = role.icon;

  const handleCardClick = () => {
    navigate(`/staff/${member.id}/reports`);
  };

  return (
    <motion.div
      className={`stat-card cursor-pointer hover:border-primary/50 transition-colors ${!member.is_active ? "opacity-60" : ""}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <span className="font-medium text-foreground">
              {member.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-foreground">{member.name}</h3>
            <p className="text-sm text-muted-foreground">
              {member.email || "No email"}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background border">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/staff/${member.id}/reports`); }}>
              <BarChart3 className="w-4 h-4 mr-2" />
              View Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              Edit
            </DropdownMenuItem>
            {member.role !== "owner" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleActive(); }}>
                  {member.is_active ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Badge variant={role.variant} className="gap-1">
          <RoleIcon className="w-3 h-3" />
          {role.label}
        </Badge>
        {!member.is_active && (
          <Badge variant="outline" className="text-muted-foreground">
            Inactive
          </Badge>
        )}
      </div>

      {isOwnerViewing && (
        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold text-foreground">
                {member.servicesRecent}
              </p>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{member.totalServices} total</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">
                ${member.revenueRecent.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Revenue (30 days)</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
