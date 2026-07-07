import { useState } from "react";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ClientOption {
  id: string;
  name: string;
}

interface ClientComboboxProps {
  clients: ClientOption[];
  value: string;
  onValueChange: (value: string) => void;
  isLoading?: boolean;
  onAddNew?: (searchText: string) => void;
  placeholder?: string;
}

export function ClientCombobox({ 
  clients, 
  value, 
  onValueChange,
  isLoading,
  onAddNew,
  placeholder = "Search clients..."
}: ClientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const selectedClient = clients.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="text-muted-foreground">Loading...</span>
          ) : selectedClient ? (
            <span className="flex items-center gap-2 truncate">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{selectedClient.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name..." onValueChange={setSearchText} />
          <CommandList>
            <CommandEmpty>
              <div className="py-2 text-center">
                <p className="text-sm text-muted-foreground mb-2">No clients found.</p>
                {onAddNew && searchText.trim() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-primary"
                    onClick={() => {
                      onAddNew(searchText.trim());
                      setOpen(false);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add "{searchText.trim()}" as new client
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => {
                    onValueChange(client.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{client.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {onAddNew && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onAddNew(searchText.trim());
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add new client</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
