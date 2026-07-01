import { ChevronLeft, ChevronRight, ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  sortable?: boolean;
  render: (item: T) => React.ReactNode;
}

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  variant?: "danger" | "primary" | "secondary";
  onClick: (selectedIds: string[]) => void;
}

interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  count: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  // Sorting
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (columnKey: string, direction: "asc" | "desc") => void;
  // Row click
  onRowClick?: (item: T) => void;
  // Bulk actions
  idAccessor?: (item: T) => string;
  bulkActions?: BulkAction[];
}

export function DataTable<T>({
  columns,
  rows,
  count,
  page,
  pageSize,
  onPageChange,
  sortColumn,
  sortDirection,
  onSortChange,
  onRowClick,
  idAccessor = (item: any) => item.id?.toString(),
  bulkActions,
}: DataTableProps<T>) {
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const pageStart = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(count, page * pageSize);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const hasSelection = bulkActions && bulkActions.length > 0;
  
  const allRowIds = rows.map(idAccessor);
  const isAllSelected = allRowIds.length > 0 && allRowIds.every(id => selectedIds.has(id));
  const isSomeSelected = allRowIds.some(id => selectedIds.has(id)) && !isAllSelected;

  const toggleAll = () => {
    const next = new Set(selectedIds);
    if (isAllSelected) {
      allRowIds.forEach(id => next.delete(id));
    } else {
      allRowIds.forEach(id => next.add(id));
    }
    setSelectedIds(next);
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSort = (key: string) => {
    if (!onSortChange) return;
    if (sortColumn === key) {
      onSortChange(key, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSortChange(key, "asc");
    }
  };

  return (
    <>
      <div className="overflow-x-auto max-h-[calc(100vh-280px)] custom-scrollbar">
        <table className="w-full min-w-[720px] relative">
          <thead className="sticky top-0 z-10">
            <tr className="text-left bg-bone/80 backdrop-blur-md shadow-[0_1px_0_0_var(--color-line-2)]">
              {hasSelection && (
                <th className="px-5 py-2.5 w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-line text-ink focus:ring-ink/20 cursor-pointer accent-ink"
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isSomeSelected;
                    }}
                    onChange={toggleAll}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-5 py-2.5 text-[11px] uppercase tracking-[0.12em] text-muted font-medium select-none ${
                    column.className ?? ""
                  } ${column.sortable ? "cursor-pointer hover:text-ink transition-colors group" : ""}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1.5">
                    {column.header}
                    {column.sortable && (
                      <span className={`flex flex-col text-[10px] ${sortColumn === column.key ? "opacity-100 text-ink" : "opacity-0 group-hover:opacity-40"}`}>
                        {sortColumn === column.key ? (
                          sortDirection === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <div className="flex flex-col -space-y-1">
                            <ArrowUp className="w-2.5 h-2.5" />
                            <ArrowDown className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const id = idAccessor(row);
              const isSelected = selectedIds.has(id);
              
              return (
                <tr
                  key={id || index}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-line-2 last:border-b-0 transition-colors group ${
                    onRowClick ? "cursor-pointer" : ""
                  } ${
                    isSelected ? "bg-bone-2/80" : "hover:bg-bone-2/40"
                  }`}
                >
                  {hasSelection && (
                    <td className="px-5 py-3 w-10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-line text-ink focus:ring-ink/20 cursor-pointer accent-ink"
                        checked={isSelected}
                        onChange={() => toggleRow(id)}
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-5 py-3 align-top text-[13px] text-ink-2 ${column.className ?? ""}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-line-2 text-[12px] text-muted">
        <div>
          Showing {pageStart}-{pageEnd} of {count}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="btn px-2.5 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-ink">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            className="btn px-2.5 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Action Bar for Bulk Actions */}
      {hasSelection && selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="bg-ink text-paper px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-4 border border-line-2/20">
            <div className="flex items-center gap-2 pl-2">
              <div className="w-5 h-5 rounded-full bg-paper text-ink flex items-center justify-center text-[11px] font-bold">
                {selectedIds.size}
              </div>
              <span className="text-[13px] font-medium mr-1">selected</span>
            </div>
            
            <div className="w-px h-5 bg-paper/20" />
            
            <div className="flex items-center gap-1.5 pr-1">
              {bulkActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    action.onClick(Array.from(selectedIds));
                    clearSelection();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
                    action.variant === 'danger' 
                      ? 'bg-red-500/20 text-red-100 hover:bg-red-500/30' 
                      : 'bg-paper/10 text-paper hover:bg-paper/20'
                  }`}
                >
                  {action.icon && <span className="w-3.5 h-3.5">{action.icon}</span>}
                  {action.label}
                </button>
              ))}
              <button
                onClick={clearSelection}
                className="ml-2 px-3 py-1.5 rounded-full text-[12px] font-medium bg-transparent hover:bg-paper/10 text-paper/70 hover:text-paper transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
