import { useState } from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Business } from "@shared/schema";

interface BusinessSwitcherProps {
  businesses: Business[];
  selectedBusinessId: string | null;
  onBusinessChange: (businessId: string) => void;
}

export function BusinessSwitcher({
  businesses,
  selectedBusinessId,
  onBusinessChange,
}: BusinessSwitcherProps) {
  const [open, setOpen] = useState(false);

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
          data-testid="button-business-switcher"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {selectedBusiness?.name || "Select business..."}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search business..." />
          <CommandList>
            <CommandEmpty>No business found.</CommandEmpty>
            <CommandGroup>
              {businesses.map((business) => (
                <CommandItem
                  key={business.id}
                  value={business.name}
                  onSelect={() => {
                    onBusinessChange(business.id);
                    setOpen(false);
                  }}
                  data-testid={`option-business-${business.slug}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedBusinessId === business.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {business.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
