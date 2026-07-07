// Normalize phone to digits only for comparison
export function normalizePhone(phone?: string | null): string {
  return phone?.replace(/\D/g, '') || '';
}

// Normalize name for comparison (lowercase, trimmed)
export function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

// Normalize email for comparison (lowercase, trimmed)
export function normalizeEmail(email?: string | null): string {
  return email?.toLowerCase().trim() || '';
}

// Check if two clients are duplicates (all fields must match)
export function isClientDuplicate(
  newClient: { name: string; email?: string | null; phone?: string | null },
  existingClient: { name: string; email?: string | null; phone?: string | null }
): boolean {
  return (
    normalizeName(newClient.name) === normalizeName(existingClient.name) &&
    normalizeEmail(newClient.email) === normalizeEmail(existingClient.email) &&
    normalizePhone(newClient.phone) === normalizePhone(existingClient.phone)
  );
}

// Find if a client exists in a list
export function findDuplicateClient(
  newClient: { name: string; email?: string | null; phone?: string | null },
  existingClients: Array<{ name: string; email?: string | null; phone?: string | null }>
): { name: string; email?: string | null; phone?: string | null } | undefined {
  return existingClients.find(existing => isClientDuplicate(newClient, existing));
}
