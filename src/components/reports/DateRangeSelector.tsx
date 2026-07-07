import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DatePreset = 'today' | 'last7days' | 'last30days' | 'last90days' | 'thisMonth' | 'lastMonth' | 'custom';

interface DateRange {
  from: Date;
  to: Date;
}

interface PresetOption {
  value: DatePreset;
  label: string;
}

const presetOptions: PresetOption[] = [
  { value: 'today', label: 'Today' },
  { value: 'last7days', label: 'Last 7 days' },
  { value: 'last30days', label: 'Last 30 days' },
  { value: 'last90days', label: 'Last 90 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'lastMonth', label: 'Last month' },
  { value: 'custom', label: 'Custom range' },
];

function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const today = new Date();
  
  switch (preset) {
    case 'today':
      return { from: startOfDay(today), to: endOfDay(today) };
    case 'last7days':
      return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
    case 'last30days':
      return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
    case 'last90days':
      return { from: startOfDay(subDays(today, 89)), to: endOfDay(today) };
    case 'thisMonth':
      return { from: startOfMonth(today), to: endOfDay(today) };
    case 'lastMonth':
      const lastMonth = subMonths(today, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    default:
      return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
  }
}

interface DateRangeSelectorProps {
  onDateRangeChange?: (range: DateRange) => void;
}

export function DateRangeSelector({ onDateRangeChange }: DateRangeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('last30days');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeFromPreset('last30days'));
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const handlePresetSelect = (preset: DatePreset) => {
    if (preset === 'custom') {
      setShowCustomPicker(true);
      setCustomFrom(dateRange.from);
      setCustomTo(dateRange.to);
    } else {
      const newRange = getDateRangeFromPreset(preset);
      setSelectedPreset(preset);
      setDateRange(newRange);
      setShowCustomPicker(false);
      onDateRangeChange?.(newRange);
      setOpen(false);
    }
  };

  const handleCustomRangeApply = () => {
    if (customFrom && customTo) {
      const newRange = { from: startOfDay(customFrom), to: endOfDay(customTo) };
      setSelectedPreset('custom');
      setDateRange(newRange);
      onDateRangeChange?.(newRange);
      setOpen(false);
      setShowCustomPicker(false);
    }
  };

  const selectedLabel = presetOptions.find(opt => opt.value === selectedPreset)?.label || 'Select range';
  const dateRangeText = `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 min-w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            <span>{selectedLabel}</span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Preset options */}
          <div className="border-r border-border p-2 min-w-[160px]">
            <div className="text-xs text-muted-foreground px-2 py-1.5 font-medium">
              Select range
            </div>
            {presetOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePresetSelect(option.value)}
                className={cn(
                  "w-full flex items-center justify-between px-2 py-1.5 text-sm rounded-md transition-colors",
                  "hover:bg-secondary",
                  selectedPreset === option.value && option.value !== 'custom' 
                    ? "bg-secondary text-foreground" 
                    : "text-foreground"
                )}
              >
                {option.label}
                {selectedPreset === option.value && option.value !== 'custom' && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
            
            {/* Date range display */}
            <div className="mt-3 pt-3 border-t border-border px-2">
              <div className="text-xs text-muted-foreground">Date range</div>
              <div className="text-sm font-medium text-foreground mt-1">
                {dateRangeText}
              </div>
            </div>
          </div>

          {/* Custom date picker */}
          {showCustomPicker && (
            <div className="p-3">
              <div className="flex gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-2">From</div>
                  <Calendar
                    mode="single"
                    selected={customFrom}
                    onSelect={setCustomFrom}
                    disabled={(date) => date > new Date() || (customTo ? date > customTo : false)}
                    className="rounded-md border border-border pointer-events-auto"
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">To</div>
                  <Calendar
                    mode="single"
                    selected={customTo}
                    onSelect={setCustomTo}
                    disabled={(date) => date > new Date() || (customFrom ? date < customFrom : false)}
                    className="rounded-md border border-border pointer-events-auto"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCustomPicker(false)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleCustomRangeApply}
                  disabled={!customFrom || !customTo}
                >
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { getDateRangeFromPreset };
export type { DateRange };
