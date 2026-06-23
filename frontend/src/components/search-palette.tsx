"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, Users, Layers, CheckSquare, UserCircle2, LayoutDashboard, CreditCard, Settings, Navigation, FileText, Receipt } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";

import { searchCrm } from "@/lib/api";
import { formatINR, toNumber } from "@/lib/utils";

const quickLinks = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", path: "/leads", icon: Users },
  { label: "Customers", path: "/customers", icon: UserCircle2 },
  { label: "Deals", path: "/deals", icon: Layers },
  { label: "Tasks", path: "/tasks", icon: CheckSquare },
  { label: "Billing", path: "/billing", icon: CreditCard },
  { label: "Settings", path: "/settings", icon: Settings },
];

export function SearchPalette({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchCrm(debouncedQuery),
    enabled: debouncedQuery.length > 1,
  });

  if (!open) return null;

  const navigateTo = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const matchingLinks = debouncedQuery.length > 1 
    ? quickLinks.filter(link => link.label.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : [];

  const hasResults =
    matchingLinks.length > 0 ||
    (data &&
      (data.leads.length > 0 ||
        data.customers.length > 0 ||
        data.deals.length > 0 ||
        data.tasks.length > 0 ||
        data.quotes.length > 0 ||
        data.invoices.length > 0));

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 sm:px-0">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="relative bg-paper w-full max-w-xl rounded-xl shadow-2xl border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 border-b border-line">
          <Search className="w-4 h-4 text-muted mr-3" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent py-4 text-[14px] outline-none placeholder:text-muted/70"
            placeholder="Search leads, deals, customers, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && debouncedQuery.length > 1 && (
            <Loader2 className="w-4 h-4 text-muted animate-spin mr-3" />
          )}
          <button
            onClick={() => setOpen(false)}
            className="text-muted hover:text-ink transition-colors p-1"
          >
            <span className="sr-only">Close</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {debouncedQuery.length <= 1 ? (
            <div className="py-12 text-center text-[13px] text-muted">
              Type at least 2 characters to search.
            </div>
          ) : isLoading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-[13px] text-muted">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching...
            </div>
          ) : isError ? (
            <div className="py-12 text-center text-[13px] text-red-500">
              An error occurred while searching. Please try again.
            </div>
          ) : !hasResults ? (
            <div className="py-12 text-center text-[13px] text-muted">
              No results found for "{debouncedQuery}".
            </div>
          ) : (
            <div className="space-y-4 pb-2">
              {matchingLinks.length > 0 && (
                <div>
                  <div className="px-3 pb-2 pt-2 text-[10px] uppercase tracking-wider text-muted font-medium flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5" /> Quick Links
                  </div>
                  {matchingLinks.map((link) => (
                    <button
                      key={link.path}
                      onClick={() => navigateTo(link.path)}
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-bone-2 rounded-md transition-colors flex items-center gap-3 group"
                    >
                      <link.icon className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
                      <span className="font-medium text-ink group-hover:text-accent transition-colors">
                        {link.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {data?.leads && data.leads.length > 0 && (
                <div>
                  <div className="px-3 pb-2 pt-2 text-[10px] uppercase tracking-wider text-muted font-medium flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> Leads
                  </div>
                  {data.leads.map((item) => (
                    <button
                      key={`lead-${item.id}`}
                      onClick={() => navigateTo(`/leads/${item.id}`)}
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-bone-2 rounded-md transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-medium text-ink group-hover:text-accent transition-colors">
                          {item.name}
                        </div>
                        <div className="text-muted text-[11px] mt-0.5">
                          {item.email}
                        </div>
                      </div>
                      <span className="text-[11px] capitalize text-muted">{item.status}</span>
                    </button>
                  ))}
                </div>
              )}

              {data?.customers && data.customers.length > 0 && (
                <div>
                  <div className="px-3 pb-2 pt-2 text-[10px] uppercase tracking-wider text-muted font-medium flex items-center gap-2">
                    <UserCircle2 className="w-3.5 h-3.5" /> Customers
                  </div>
                  {data.customers.map((item) => (
                    <button
                      key={`customer-${item.id}`}
                      onClick={() => navigateTo(`/customers/${item.id}`)}
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-bone-2 rounded-md transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-medium text-ink group-hover:text-accent transition-colors">
                          {item.name}
                        </div>
                        <div className="text-muted text-[11px] mt-0.5">
                          {item.email}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {data?.deals && data.deals.length > 0 && (
                <div>
                  <div className="px-3 pb-2 pt-2 text-[10px] uppercase tracking-wider text-muted font-medium flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" /> Deals
                  </div>
                  {data.deals.map((item) => (
                    <button
                      key={`deal-${item.id}`}
                      onClick={() => navigateTo(`/deals/${item.id}`)}
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-bone-2 rounded-md transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-medium text-ink group-hover:text-accent transition-colors">
                          {item.title}
                        </div>
                        <div className="text-muted text-[11px] mt-0.5">
                          {item.customer_name} • {formatINR(toNumber(item.amount))}
                        </div>
                      </div>
                      <span className="text-[11px] capitalize text-muted">{item.stage}</span>
                    </button>
                  ))}
                </div>
              )}

              {data?.tasks && data.tasks.length > 0 && (
                <div>
                  <div className="px-3 pb-2 pt-2 text-[10px] uppercase tracking-wider text-muted font-medium flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5" /> Tasks
                  </div>
                  {data.tasks.map((item) => (
                    <button
                      key={`task-${item.id}`}
                      onClick={() => navigateTo(`/tasks`)}
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-bone-2 rounded-md transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-medium text-ink group-hover:text-accent transition-colors">
                          {item.title}
                        </div>
                        {item.due_date && (
                          <div className="text-muted text-[11px] mt-0.5">
                            Due: {item.due_date}
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] capitalize text-muted">{item.status}</span>
                    </button>
                  ))}
                </div>
              )}

              {data?.quotes && data.quotes.length > 0 && (
                <div>
                  <div className="px-3 pb-2 pt-2 text-[10px] uppercase tracking-wider text-muted font-medium flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" /> Quotes
                  </div>
                  {data.quotes.map((item) => (
                    <button
                      key={`quote-${item.id}`}
                      onClick={() => navigateTo(`/quotes`)}
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-bone-2 rounded-md transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-medium text-ink group-hover:text-accent transition-colors">
                          {item.title || "Untitled Quote"}
                        </div>
                        <div className="text-muted text-[11px] mt-0.5">
                          {item.quote_number} • {formatINR(toNumber(item.total))}
                        </div>
                      </div>
                      <span className="text-[11px] capitalize text-muted">{item.status}</span>
                    </button>
                  ))}
                </div>
              )}

              {data?.invoices && data.invoices.length > 0 && (
                <div>
                  <div className="px-3 pb-2 pt-2 text-[10px] uppercase tracking-wider text-muted font-medium flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5" /> Invoices
                  </div>
                  {data.invoices.map((item) => (
                    <button
                      key={`invoice-${item.id}`}
                      onClick={() => navigateTo(`/invoices`)}
                      className="w-full text-left px-3 py-2 text-[13px] hover:bg-bone-2 rounded-md transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-medium text-ink group-hover:text-accent transition-colors">
                          Invoice {item.invoice_number}
                        </div>
                        <div className="text-muted text-[11px] mt-0.5">
                          Due: {item.due_date || "On receipt"} • {formatINR(toNumber(item.total))}
                        </div>
                      </div>
                      <span className="text-[11px] capitalize text-muted">{item.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
