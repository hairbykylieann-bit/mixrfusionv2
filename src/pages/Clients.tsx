import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  Search,
  User,
  Clock,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
  Download
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientDetailSheet } from "@/components/clients/ClientDetailSheet";
import { AddClientDialog } from "@/components/clients/AddClientDialog";
import { ClientsSetupOptions } from "@/components/clients/ClientsSetupOptions";
import { ClientImportCard } from "@/components/clients/ClientImportCard";
import { ClientQuickActions } from "@/components/clients/ClientQuickActions";
import { ClientSortSelect, SortOption } from "@/components/clients/ClientSortSelect";
import { toast } from "sonner";
import { useClients, Client, FormulaRecord, FormulaComponent } from "@/hooks/useClients";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { exportClientsToCSV } from "@/lib/clientExport";
import { convertToGrams } from "@/lib/unitConversion";

interface ClientCardProps {
  client: Client;
  index: number;
  onClick: () => void;
  onStartSession: (client: Client) => void;
  canViewContactInfo: boolean;
}

function ClientCard({ client, index, onClick, onStartSession, canViewContactInfo }: ClientCardProps) {
  return (
    <motion.div
      className="stat-card flex items-center gap-4 cursor-pointer hover:shadow-tile-hover transition-all duration-200 group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
    >
      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
        <User className="w-6 h-6 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground truncate">{client.name}</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{client.lastVisit}</span>
          <span className="text-border">•</span>
          <span>{client.totalVisits} visits</span>
        </div>
      </div>

      <ClientQuickActions 
        client={client} 
        onStartSession={onStartSession}
        canViewContactInfo={canViewContactInfo}
      />
      
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
    </motion.div>
  );
}

// Enhanced search: matches name, email, and phone
function filterClients(clients: Client[], search: string): Client[] {
  if (!search.trim()) return clients;
  
  const query = search.toLowerCase();
  const phoneDigits = search.replace(/\D/g, "");
  
  return clients.filter(c => 
    c.name.toLowerCase().includes(query) ||
    c.email?.toLowerCase().includes(query) ||
    (phoneDigits && c.phone?.replace(/\D/g, "").includes(phoneDigits))
  );
}

// Sort clients based on selected option
function sortClients(clients: Client[], sortBy: SortOption): Client[] {
  const sorted = [...clients];
  
  switch (sortBy) {
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "visit-recent":
      return sorted.sort((a, b) => {
        if (a.lastVisit === "No visits yet") return 1;
        if (b.lastVisit === "No visits yet") return -1;
        return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
      });
    case "visit-oldest":
      return sorted.sort((a, b) => {
        if (a.lastVisit === "No visits yet") return 1;
        if (b.lastVisit === "No visits yet") return -1;
        return new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime();
      });
    case "visits-most":
      return sorted.sort((a, b) => b.totalVisits - a.totalVisits);
    case "added-recent":
      return sorted.sort((a, b) => {
        const aDate = a.clientSince ? new Date(a.clientSince) : new Date(0);
        const bDate = b.clientSince ? new Date(b.clientSince) : new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
    default:
      return sorted;
  }
}

export default function Clients() {
  const navigate = useNavigate();
  const { clients, isLoading, createClient, updateClient, deleteClient, currentStaff } = useClients();
  const { isSetupComplete, isLoading: setupLoading } = useSetupProgress();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Apply filtering and sorting
  const filteredClients = sortClients(filterClients(clients, search), sortBy);

  // Permission checks
  const canAddClients = (currentStaff?.permissions.can_manage_clients || currentStaff?.permissions.can_manage_own_clients || currentStaff?.role === "manager" || currentStaff?.role === "owner") ?? false;
  const canViewContactInfo = currentStaff?.permissions.can_view_basic_client_info ?? false;
  const isOwner = currentStaff?.role === "owner";
  const isManagerOrOwner = currentStaff?.role === "owner" || currentStaff?.role === "manager";
  
  const canManageClient = (client: Client) => {
    if (!currentStaff) return false;
    if (currentStaff.permissions.can_manage_clients) return true;
    if (currentStaff.permissions.can_manage_own_clients && client.workedWithCurrentStaff) return true;
    return false;
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setSheetOpen(true);
  };

  const handleStartSession = (client: Client) => {
    navigate("/new-bowl", { state: { client } });
  };

  const handleAddClient = async (data: { name: string; email?: string; phone?: string; preferences?: string }) => {
    await createClient.mutateAsync({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      preferences: data.preferences || null,
    });
  };

  const handleUseFormula = (record: FormulaRecord) => {
    toast.success(`Loading formula: ${record.formula}`);
    setSheetOpen(false);
    navigate("/new-bowl", { state: { formula: record, client: selectedClient } });
  };

  const handleUseOptimized = (
    record: FormulaRecord,
    optimizedComponents: FormulaComponent[],
    optimizedDeveloper: { productId: string; name: string; amount: number; unit?: string } | null
  ) => {
    const recordUnit = record.unit || 'g';
    const amountMixedG = optimizedComponents.reduce((sum, c) => sum + convertToGrams(c.amount, c.unit || recordUnit), 0)
      + (optimizedDeveloper ? convertToGrams(optimizedDeveloper.amount, optimizedDeveloper.unit || recordUnit) : 0);
    const optimizedRecord: FormulaRecord = {
      ...record,
      components: optimizedComponents,
      developer: optimizedDeveloper || undefined,
      amountMixed: amountMixedG
    };
    toast.success(`Loading optimized formula`);
    setSheetOpen(false);
    navigate("/new-bowl", { state: { formula: optimizedRecord, client: selectedClient, isOptimized: true } });
  };

  const handleStartNewSession = (client: Client) => {
    setSheetOpen(false);
    navigate("/new-bowl", { state: { client } });
  };

  const handleContinueSession = (record: FormulaRecord, client: Client) => {
    setSheetOpen(false);
    navigate("/new-bowl", { state: { 
      client, 
      existingSessionId: record.id,
      existingServiceId: record.serviceId,
    } });
  };

  const handleUpdatePreferences = async (clientId: string, preferences: string) => {
    await updateClient.mutateAsync({
      id: clientId,
      updates: { preferences }
    });
    if (selectedClient?.id === clientId) {
      setSelectedClient({ ...selectedClient, preferences });
    }
    toast.success("Client notes updated");
  };

  const handleExport = () => {
    exportClientsToCSV(clients);
    toast.success("Clients exported successfully");
  };

  const handleEditClient = async (id: string, updates: { name: string; email?: string | null; phone?: string | null; preferences?: string | null }) => {
    await updateClient.mutateAsync({ id, updates });
    if (selectedClient?.id === id) {
      setSelectedClient({
        ...selectedClient,
        name: updates.name,
        email: updates.email ?? undefined,
        phone: updates.phone ?? undefined,
        preferences: updates.preferences ?? undefined,
      });
    }
  };

  const handleDeleteClient = async (id: string) => {
    await deleteClient.mutateAsync(id);
    setSheetOpen(false);
    setSelectedClient(null);
    toast.success("Client deleted");
  };

  if (isLoading || setupLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const showSetupOptions = !isSetupComplete && clients.length === 0;

  const subtitle = currentStaff?.permissions.can_view_all_clients 
    ? `${clients.length} clients with formula history`
    : `${clients.length} of your clients`;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <PageLayout
        title="Clients"
        subtitle={showSetupOptions ? "Get started by importing your clients" : subtitle}
        action={
          !showSetupOptions && canAddClients ? (
            <div className="flex gap-2">
              {isOwner && (
                <Button variant="outline" className="gap-2" onClick={handleExport}>
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              )}
              <Button variant="outline" className="gap-2" onClick={() => setShowImport(true)}>
                <FileSpreadsheet className="w-4 h-4" />
                Import
              </Button>
              <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                Add Client
              </Button>
            </div>
          ) : null
        }
      >
        {showImport ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Import Clients</h2>
                <p className="text-muted-foreground">Upload your client list from a CSV file</p>
              </div>
              <Button variant="ghost" onClick={() => setShowImport(false)}>
                Back to clients
              </Button>
            </div>
            <ClientImportCard />
          </div>
        ) : showSetupOptions ? (
          <ClientsSetupOptions onAddManually={() => setAddDialogOpen(true)} />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, email, or phone..." 
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <ClientSortSelect value={sortBy} onChange={setSortBy} />
            </div>

            <div className="space-y-3">
              {filteredClients.map((client, index) => (
                <ClientCard 
                  key={client.id} 
                  client={client} 
                  index={index}
                  onClick={() => handleClientClick(client)}
                  onStartSession={handleStartSession}
                  canViewContactInfo={canViewContactInfo}
                />
              ))}
            </div>

            {filteredClients.length === 0 && !isLoading && (
              <motion.div
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {search ? "No clients found" : "No clients yet. Add your first client!"}
                </p>
              </motion.div>
            )}
          </>
        )}
      </PageLayout>

      <ClientDetailSheet
        client={selectedClient}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onUseFormula={handleUseFormula}
        onUseOptimized={handleUseOptimized}
        onStartNewSession={handleStartNewSession}
        onUpdatePreferences={handleUpdatePreferences}
        canManage={selectedClient ? canManageClient(selectedClient) : false}
        canDelete={isManagerOrOwner}
        canViewContactInfo={canViewContactInfo}
        canEditFormulas={isOwner || (currentStaff?.permissions.can_edit_formulas ?? false)}
        canDeleteSessions={isOwner || ((currentStaff?.permissions as any)?.can_delete_sessions ?? false)}
        onContinueSession={handleContinueSession}
        onEditClient={handleEditClient}
        onDeleteClient={handleDeleteClient}
      />

      <AddClientDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddClient}
        existingClients={clients}
      />
    </div>
  );
}
