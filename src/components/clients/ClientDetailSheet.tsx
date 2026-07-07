import { useState, useEffect } from "react";
import { Mail, Phone, Calendar, User, Plus, Pencil, Check, Lock, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FormulaHistoryCard, FormulaRecord, FormulaComponent } from "./FormulaHistoryCard";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClientDetail } from "@/hooks/useClientDetail";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { useServiceMenu } from "@/hooks/useServiceMenu";
import { EditClientDialog } from "./EditClientDialog";
import { DeleteClientDialog } from "./DeleteClientDialog";

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  clientSince?: string;
  lastVisit: string;
  totalVisits: number;
  lastFormula: string;
  formulaHistory: FormulaRecord[];
  preferences?: string;
  workedWithCurrentStaff?: boolean;
}

interface ClientDetailSheetProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseFormula?: (record: FormulaRecord) => void;
  onUseOptimized?: (record: FormulaRecord, optimizedComponents: FormulaComponent[], optimizedDeveloper: { productId: string; name: string; amount: number; unit?: string } | null) => void;
  onStartNewSession?: (client: Client) => void;
  onUpdatePreferences?: (clientId: string, preferences: string) => void;
  onContinueSession?: (record: FormulaRecord, client: Client) => void;
  onEditClient?: (id: string, updates: { name: string; email?: string | null; phone?: string | null; preferences?: string | null }) => Promise<void>;
  onDeleteClient?: (id: string) => Promise<void>;
  canManage?: boolean;
  canDelete?: boolean;
  canViewContactInfo?: boolean;
  canEditFormulas?: boolean;
  canDeleteSessions?: boolean;
}

export function ClientDetailSheet({ 
  client, 
  open, 
  onOpenChange,
  onUseFormula,
  onUseOptimized,
  onStartNewSession,
  onUpdatePreferences,
  onContinueSession,
  onEditClient,
  onDeleteClient,
  canManage = true,
  canDelete = false,
  canViewContactInfo = true,
  canEditFormulas = false,
  canDeleteSessions = false,
}: ClientDetailSheetProps) {
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [editedPreferences, setEditedPreferences] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Lazy-load formula history only when sheet is open
  const { data: formulaHistory, isLoading: historyLoading, updateSessionNotes, deleteSession, reweighSession, reweighBowl } = useClientDetail(
    open && client ? client.id : null
  );
  const { settings } = useSalonSettings();
  const { services } = useServiceMenu();
  // Reset editing state when client changes
  useEffect(() => {
    if (!open) {
      setIsEditingPreferences(false);
      setEditedPreferences("");
    }
  }, [open]);

  if (!client) return null;

  const handleEditPreferences = () => {
    setEditedPreferences(client.preferences || "");
    setIsEditingPreferences(true);
  };

  const handleSavePreferences = () => {
    onUpdatePreferences?.(client.id, editedPreferences);
    setIsEditingPreferences(false);
  };

  const handleCancelEdit = () => {
    setIsEditingPreferences(false);
    setEditedPreferences("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-xl">{client.name}</SheetTitle>
                {canManage && onEditClient && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditDialogOpen(true)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {canDelete && onDeleteClient && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              {canViewContactInfo ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                  {client.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {client.email}
                    </span>
                  )}
                  {client.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {client.phone}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Contact info hidden</span>
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex gap-4 text-sm py-4">
          {client.clientSince && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Client since {client.clientSince}</span>
            </div>
          )}
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">{client.totalVisits}</span> visits
          </div>
        </div>

        {/* Editable Preferences Section */}
        {canManage && (
          <div className="py-4 px-4 rounded-lg bg-secondary/50 mb-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Pencil className="w-3.5 h-3.5" />
                Client Notes & Preferences
              </Label>
              {!isEditingPreferences && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditPreferences}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  {client.preferences ? "Edit" : "Add Notes"}
                </Button>
              )}
            </div>
            
            {isEditingPreferences ? (
              <div className="space-y-3">
                <Textarea
                  value={editedPreferences}
                  onChange={(e) => setEditedPreferences(e.target.value)}
                  placeholder="Add notes about hair type, color history, sensitivities, preferences..."
                  className="min-h-[100px] text-sm"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePreferences}
                    className="h-8 gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {client.preferences || "No notes yet. Click 'Add Notes' to add preferences, hair history, or special considerations."}
              </p>
            )}
          </div>
        )}

        <Separator className="my-4" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Formula History</h3>
            {onStartNewSession && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onStartNewSession(client)}
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                New Session
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : formulaHistory && formulaHistory.length > 0 ? (
              formulaHistory.map((record, index) => (
                <FormulaHistoryCard
                  key={record.id}
                  record={record}
                  wasteTargetPercent={settings?.waste_factor_percent ?? 5}
                  index={index}
                  onUseAgain={onUseFormula}
                  onUseOptimized={onUseOptimized}
                  canEditFormulas={canEditFormulas}
                  canDeleteSessions={canDeleteSessions}
                  onContinueSession={onContinueSession ? (r) => onContinueSession(r, client) : undefined}
                  salonSettings={settings}
                  services={services}
                  onEditNotes={(sessionId, notes) => {
                    updateSessionNotes.mutate({ sessionId, notes });
                  }}
                  onDeleteSession={(sessionId) => {
                    deleteSession.mutate(sessionId);
                  }}
                  onReweigh={(sessionId, leftoverAmount, leftoverUnit) => {
                    reweighSession.mutate({ sessionId, leftoverAmount, leftoverUnit });
                  }}
                  onReweighBowl={(sessionId, bowlId, leftoverAmount, leftoverUnit) => {
                    reweighBowl.mutate({ sessionId, bowlId, leftoverAmount, leftoverUnit });
                  }}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No formula history yet</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>

      {canManage && onEditClient && (
        <EditClientDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          client={client}
          onSubmit={async (id, updates) => {
            await onEditClient(id, updates);
          }}
        />
      )}

      {canDelete && onDeleteClient && (
        <DeleteClientDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          clientName={client.name}
          onConfirm={async () => {
            await onDeleteClient(client.id);
          }}
        />
      )}
    </Sheet>
  );
}
