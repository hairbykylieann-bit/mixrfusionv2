import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Plus, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientImportCard } from "./ClientImportCard";

interface ClientsSetupOptionsProps {
  onAddManually: () => void;
}

export function ClientsSetupOptions({ onAddManually }: ClientsSetupOptionsProps) {
  const [showImport, setShowImport] = useState(false);

  if (showImport) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Import Clients</h2>
            <p className="text-muted-foreground">Upload your client list from a CSV file</p>
          </div>
          <Button variant="ghost" onClick={() => setShowImport(false)}>
            Back to options
          </Button>
        </div>
        <ClientImportCard />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Import Your Clients</h2>
        <p className="text-muted-foreground">Get your client list set up quickly</p>
      </motion.div>

      <motion.div
        className="stat-card cursor-pointer hover:shadow-tile-hover transition-all duration-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onClick={() => setShowImport(true)}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">Import from CSV</h3>
            <p className="text-sm text-muted-foreground">
              Upload a spreadsheet with your existing client list
            </p>
          </div>
        </div>
      </motion.div>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-4 text-sm text-muted-foreground">or</span>
        </div>
      </div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Button variant="outline" className="gap-2" onClick={onAddManually}>
          <Plus className="w-4 h-4" />
          Add Clients Manually
        </Button>
      </motion.div>
    </div>
  );
}
