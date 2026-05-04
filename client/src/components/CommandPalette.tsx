import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Factory, Package, Box, Users, Tag, Loader2 } from "lucide-react";
import { fetchApi } from "@/lib/fetchApi";

interface SearchResult {
  id: string;
  label: string;
  sub?: string;
  href: string;
}

interface SearchResponse {
  batches: SearchResult[];
  products: SearchResult[];
  materials: SearchResult[];
  customers: SearchResult[];
  lots: SearchResult[];
}

const GROUPS: { key: keyof SearchResponse; label: string; icon: typeof Factory }[] = [
  { key: "batches", label: "Batches", icon: Factory },
  { key: "products", label: "Products", icon: Package },
  { key: "materials", label: "Materials", icon: Box },
  { key: "customers", label: "Customers", icon: Users },
  { key: "lots", label: "Lots", icon: Tag },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await fetchApi<SearchResponse>(`/search?q=${encodeURIComponent(q.trim())}`);
        setResults(data);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    search(value);
  }

  function handleSelect(href: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    navigate(href);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults(null);
    }
  }

  const hasResults = results && GROUPS.some((g) => results[g.key].length > 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-lg" data-testid="dialog-command-palette">
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput
            placeholder="Search batches, products, customers, lots..."
            value={query}
            onValueChange={handleInputChange}
            data-testid="input-command-search"
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && query.trim().length >= 2 && !hasResults && (
              <CommandEmpty data-testid="text-no-results">No results found.</CommandEmpty>
            )}
            {!loading && query.trim().length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}
            {!loading && results && GROUPS.map((g) => {
              const items = results[g.key];
              if (items.length === 0) return null;
              const Icon = g.icon;
              return (
                <CommandGroup key={g.key} heading={g.label}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${g.key}-${item.id}`}
                      onSelect={() => handleSelect(item.href)}
                      className="cursor-pointer"
                      data-testid={`search-result-${g.key}-${item.id}`}
                    >
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.label}</span>
                      {item.sub && <span className="ml-2 text-xs text-muted-foreground">{item.sub}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
