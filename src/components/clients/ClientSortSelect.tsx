import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SortOption = 
  | "name-asc" 
  | "name-desc" 
  | "visit-recent" 
  | "visit-oldest" 
  | "visits-most" 
  | "added-recent";

interface ClientSortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Name (A → Z)" },
  { value: "name-desc", label: "Name (Z → A)" },
  { value: "visit-recent", label: "Last Visit (Recent)" },
  { value: "visit-oldest", label: "Last Visit (Oldest)" },
  { value: "visits-most", label: "Most Visits" },
  { value: "added-recent", label: "Recently Added" },
];

export function ClientSortSelect({ value, onChange }: ClientSortSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by..." />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
