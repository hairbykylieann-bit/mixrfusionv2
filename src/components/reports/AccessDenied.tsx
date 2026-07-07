import { ShieldX } from "lucide-react";

interface AccessDeniedProps {
  title?: string;
  message?: string;
}

export function AccessDenied({ 
  title = "Access Denied",
  message = "You don't have permission to view this content."
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <ShieldX className="w-16 h-16 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground text-center max-w-md">{message}</p>
    </div>
  );
}
