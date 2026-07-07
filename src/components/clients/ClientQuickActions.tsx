import { Phone, Mail, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Client } from "@/hooks/useClients";

interface ClientQuickActionsProps {
  client: Client;
  onStartSession: (client: Client) => void;
  canViewContactInfo: boolean;
}

export function ClientQuickActions({ 
  client, 
  onStartSession, 
  canViewContactInfo 
}: ClientQuickActionsProps) {
  return (
    <div 
      className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={(e) => e.stopPropagation()}
    >
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={() => onStartSession(client)}
        className="h-8 w-8 p-0"
        title="Start Session"
      >
        <Palette className="w-4 h-4" />
      </Button>
      {canViewContactInfo && client.phone && (
        <Button size="sm" variant="ghost" asChild className="h-8 w-8 p-0">
          <a href={`tel:${client.phone}`} title="Call">
            <Phone className="w-4 h-4" />
          </a>
        </Button>
      )}
      {canViewContactInfo && client.email && (
        <Button size="sm" variant="ghost" asChild className="h-8 w-8 p-0">
          <a href={`mailto:${client.email}`} title="Email">
            <Mail className="w-4 h-4" />
          </a>
        </Button>
      )}
    </div>
  );
}
