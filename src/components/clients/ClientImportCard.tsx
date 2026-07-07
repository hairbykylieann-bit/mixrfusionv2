import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Upload, 
  FileText, 
  Download, 
  Check, 
  AlertCircle, 
  X,
  Loader2,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClients } from "@/hooks/useClients";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { useStaff } from "@/hooks/useStaff";
import { toast } from "sonner";
import { findDuplicateClient } from "@/lib/clientUtils";
import { supabase } from "@/integrations/supabase/client";

interface ParsedClient {
  name: string;
  email?: string;
  phone?: string;
  preferences?: string;
  client_since?: string;
  stylist?: string; // Optional stylist name from CSV
}

interface ParseResult {
  valid: ParsedClient[];
  invalid: { row: number; reason: string }[];
}

export function ClientImportCard() {
  const { createManyClients, clients, currentStaff } = useClients();
  const { settings } = useSalonSettings();
  const { staff } = useStaff();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const parseCSV = useCallback((content: string): ParseResult => {
    const requireEmail = settings?.require_client_email ?? false;
    const requirePhone = settings?.require_client_phone ?? false;

    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      return { valid: [], invalid: [{ row: 1, reason: "File is empty or has no data rows" }] };
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIndex = headers.findIndex(h => h === 'name');
    const emailIndex = headers.findIndex(h => h === 'email');
    const phoneIndex = headers.findIndex(h => h === 'phone');
    const preferencesIndex = headers.findIndex(h => h === 'preferences');
    const clientSinceIndex = headers.findIndex(h => h === 'client_since' || h === 'clientsince');
    const stylistIndex = headers.findIndex(h => h === 'stylist' || h === 'staff' || h === 'provider');

    if (nameIndex === -1) {
      return { valid: [], invalid: [{ row: 1, reason: "Missing required 'name' column in header" }] };
    }

    const valid: ParsedClient[] = [];
    const invalid: { row: number; reason: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const name = values[nameIndex]?.trim();
      const email = emailIndex !== -1 ? values[emailIndex]?.trim() : undefined;
      const phone = phoneIndex !== -1 ? values[phoneIndex]?.trim() : undefined;

      if (!name) {
        invalid.push({ row: i + 1, reason: "Missing required name" });
        continue;
      }

      if (requireEmail && !email) {
        invalid.push({ row: i + 1, reason: "Missing required email" });
        continue;
      }

      if (requirePhone && !phone) {
        invalid.push({ row: i + 1, reason: "Missing required phone" });
        continue;
      }

      const client: ParsedClient = { name };
      
      if (email) {
        client.email = email;
      }
      if (phone) {
        client.phone = phone;
      }
      if (preferencesIndex !== -1 && values[preferencesIndex]?.trim()) {
        client.preferences = values[preferencesIndex].trim();
      }
      if (clientSinceIndex !== -1 && values[clientSinceIndex]?.trim()) {
        const dateStr = values[clientSinceIndex].trim();
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
        client.client_since = date.toISOString().split('T')[0];
        }
      }
      
      // Handle stylist column
      if (stylistIndex !== -1 && values[stylistIndex]?.trim()) {
        client.stylist = values[stylistIndex].trim();
      }

      // Check for duplicate against existing clients in database
      const existingDuplicate = findDuplicateClient(client, clients);
      if (existingDuplicate) {
        invalid.push({ row: i + 1, reason: `Duplicate of existing client "${existingDuplicate.name}"` });
        continue;
      }

      // Check for duplicate within this CSV import
      const csvDuplicate = findDuplicateClient(client, valid);
      if (csvDuplicate) {
        invalid.push({ row: i + 1, reason: `Duplicate of another row (same as "${csvDuplicate.name}")` });
        continue;
      }

      valid.push(client);
    }

    return { valid, invalid };
  }, [settings?.require_client_email, settings?.require_client_phone, clients]);

  // Parse CSV line handling quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseCSV(content);
      setParseResult(result);
    };
    reader.readAsText(file);
  }, [parseCSV]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  };

  const handleImport = async () => {
    if (!parseResult?.valid.length) return;

    setIsImporting(true);
    try {
      // Extract stylist names for relationship creation
      const clientsWithStylists = parseResult.valid.map(c => ({
        ...c,
        stylistName: c.stylist,
      }));

      // Create clients without stylist field (not in DB schema)
      const clientsToInsert = parseResult.valid.map(({ stylist, ...rest }) => rest);
      const createdClients = await createManyClients.mutateAsync(clientsToInsert);

      // Create relationships for imported clients
      if (createdClients && createdClients.length > 0) {
        const relationships: { client_id: string; staff_id: string; relationship_type: string }[] = [];
        
        // Build a map of staff names to IDs for matching
        const staffNameMap = new Map(
          staff?.map(s => [s.name.toLowerCase(), s.id]) || []
        );

        createdClients.forEach((newClient, index) => {
          const originalData = clientsWithStylists[index];
          
          // If CSV specified a stylist and we can match them, create that relationship
          if (originalData?.stylistName) {
            const matchedStaffId = staffNameMap.get(originalData.stylistName.toLowerCase());
            if (matchedStaffId) {
              relationships.push({
                client_id: newClient.id,
                staff_id: matchedStaffId,
                relationship_type: 'imported',
              });
            }
          }
          
          // Also create relationship for the importing staff (if different from matched stylist)
          if (currentStaff?.id) {
            const alreadyAdded = relationships.some(
              r => r.client_id === newClient.id && r.staff_id === currentStaff.id
            );
            if (!alreadyAdded) {
              relationships.push({
                client_id: newClient.id,
                staff_id: currentStaff.id,
                relationship_type: 'imported',
              });
            }
          }
        });

        // Insert all relationships
        if (relationships.length > 0) {
          await supabase
            .from("client_staff_relationships")
            .insert(relationships);
        }
      }

      setImportResult({ success: parseResult.valid.length, failed: parseResult.invalid.length });
      toast.success(`Successfully imported ${parseResult.valid.length} clients`);
      setFile(null);
      setParseResult(null);
    } catch (error) {
      toast.error("Failed to import clients");
      setImportResult({ success: 0, failed: parseResult.valid.length });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParseResult(null);
    setImportResult(null);
  };

  const downloadTemplate = () => {
    const requireEmail = settings?.require_client_email ?? false;
    const requirePhone = settings?.require_client_phone ?? false;
    
    const template = `name,email,phone,preferences,client_since,stylist
Jane Doe,jane@email.com,555-1234,Prefers balayage,2023-01-15,Sarah Smith
John Smith,${requireEmail ? 'john@email.com' : ''},${requirePhone ? '555-5678' : ''},Sensitive scalp,2022-06-20,`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'client_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const requireEmail = settings?.require_client_email ?? false;
  const requirePhone = settings?.require_client_phone ?? false;

  return (
    <div className="space-y-6">
      {/* Import Card */}
      <motion.div
        className="stat-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 pb-4 border-b border-border/50 mb-6">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Upload className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Import Clients</h3>
            <p className="text-sm text-muted-foreground">Bulk import your existing clients from a CSV file</p>
          </div>
        </div>

        {/* Drop Zone */}
        {!file && !importResult && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-secondary/50'
            }`}
            onClick={() => document.getElementById('csv-input')?.click()}
          >
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-foreground font-medium">Drag & drop your CSV file here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
          </div>
        )}

        {/* Preview */}
        {parseResult && !importResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-foreground">{file?.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Preview Table */}
            {parseResult.valid.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-secondary px-4 py-2 text-sm font-medium text-foreground">
                  Preview ({parseResult.valid.length} clients ready to import)
                </div>
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-muted-foreground">Name</th>
                        <th className="px-4 py-2 text-left text-muted-foreground">Email</th>
                        <th className="px-4 py-2 text-left text-muted-foreground">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.valid.slice(0, 5).map((client, i) => (
                        <tr key={i} className="border-t border-border/50">
                          <td className="px-4 py-2 text-foreground">{client.name}</td>
                          <td className="px-4 py-2 text-muted-foreground">{client.email || '-'}</td>
                          <td className="px-4 py-2 text-muted-foreground">{client.phone || '-'}</td>
                        </tr>
                      ))}
                      {parseResult.valid.length > 5 && (
                        <tr className="border-t border-border/50">
                          <td colSpan={3} className="px-4 py-2 text-center text-muted-foreground">
                            ... and {parseResult.valid.length - 5} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Validation Warnings */}
            {parseResult.invalid.length > 0 && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-warning mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">{parseResult.invalid.length} rows will be skipped</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {parseResult.invalid.slice(0, 3).map((err, i) => (
                    <li key={i}>Row {err.row}: {err.reason}</li>
                  ))}
                  {parseResult.invalid.length > 3 && (
                    <li>... and {parseResult.invalid.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}

            {/* Import Button */}
            <div className="flex gap-3">
              <Button
                onClick={handleImport}
                disabled={!parseResult.valid.length || isImporting}
                className="flex-1"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {parseResult.valid.length} Clients
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Import Result */}
        {importResult && (
          <div className="space-y-4">
            <div className="bg-success/10 border border-success/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-success mb-2">
                <Check className="w-5 h-5" />
                <span className="font-medium">Import Complete</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Successfully imported {importResult.success} clients
                {importResult.failed > 0 && ` (${importResult.failed} rows skipped)`}
              </p>
            </div>
            <Button variant="outline" onClick={handleReset} className="w-full">
              Import More Clients
            </Button>
          </div>
        )}

        {/* Template Download */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span>Required: </span>
              <span className="text-foreground">name</span>
              {requireEmail && <span className="text-foreground">, email</span>}
              {requirePhone && <span className="text-foreground">, phone</span>}
            </div>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Client Stats Card */}
      <motion.div
        className="stat-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">Client Statistics</h3>
            <p className="text-sm text-muted-foreground">Total Clients: {clients.length}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
