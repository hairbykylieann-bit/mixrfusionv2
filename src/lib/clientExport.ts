import type { Client } from "@/hooks/useClients";

function escapeCSVField(field: string | undefined | null): string {
  if (!field) return "";
  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function exportClientsToCSV(clients: Client[]): void {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Preferences",
    "Client Since",
    "Total Visits",
    "Last Visit"
  ];

  const rows = clients.map(client => [
    escapeCSVField(client.name),
    escapeCSVField(client.email),
    escapeCSVField(client.phone),
    escapeCSVField(client.preferences),
    escapeCSVField(client.clientSince),
    client.totalVisits.toString(),
    escapeCSVField(client.lastVisit)
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const today = new Date().toISOString().split("T")[0];
  const filename = `clients_export_${today}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
