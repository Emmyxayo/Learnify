"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Cell,
  type ColumnFiltersState,
  type Row,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Button } from "@ui/ui/button";
import { Select } from "@ui/ui/input";
import { StatusBanner } from "@ui/ui/status-banner";

/* ============================================================
   One table for students, certificates and transactions.

   The part worth getting right once is the phone. A table at 360px
   is four columns of ellipsis and a horizontal scrollbar nobody
   finds, so below sm this renders the same rows as cards instead.

   Both layouts are driven by the same column definitions — a column
   declares where it belongs on a card through `meta.mobile`, so
   there is one source for what a row says and no second markup to
   keep in step.
   ============================================================ */

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /**
     * Where this column goes when the table becomes cards.
     *  primary   — the card's heading. Exactly one.
     *  secondary — a line under the heading.
     *  meta      — the small footer row, wrapped.
     *  hidden    — table only.
     * Omitted behaves as "meta".
     */
    mobile?: "primary" | "secondary" | "meta" | "hidden";
    align?: "start" | "end";
  }
}

/** A select above the table, wired to a column's filter. */
export interface DataTableFilter {
  columnId: string;
  label: string;
  /** "All" is added automatically. */
  options: { value: string; label: string }[];
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  /** Stable row identity. Also the React key. */
  getRowId: (row: T) => string;
  /** Makes the whole row and the whole card a link. */
  getRowHref?: (row: T) => string;

  filters?: DataTableFilter[];
  /** Turns on the search box and searches this column. */
  searchColumnId?: string;
  searchPlaceholder?: string;

  initialSorting?: SortingState;

  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** Shown when there is no data at all. Callers write their own. */
  empty?: ReactNode;
  /** Shown when filters exclude everything. Defaults to a generic line. */
  emptyFiltered?: ReactNode;

  /** Describes the table for screen readers. */
  caption: string;
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  getRowHref,
  filters = [],
  searchColumnId,
  searchPlaceholder = "Search",
  initialSorting = [],
  isLoading,
  isError,
  onRetry,
  empty,
  emptyFiltered,
  caption,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [search, setSearch] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getRowId: (row) => getRowId(row),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  /* Search is a filter on one column rather than a global fuzzy
     match: a creator typing a name wants the name column, and
     matching a phone fragment against a course title is noise. */
  const searchColumn = searchColumnId ? table.getColumn(searchColumnId) : undefined;

  const rows = table.getRowModel().rows;

  const toolbar = (filters.length > 0 || searchColumn) && (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {searchColumn && (
        <input
          type="search"
          value={search}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          onChange={(e) => {
            setSearch(e.target.value);
            searchColumn.setFilterValue(e.target.value || undefined);
          }}
          className="h-10 w-full rounded-control border border-border-strong bg-surface-raised px-3 text-sm text-ink placeholder:text-faint sm:w-56"
        />
      )}

      {filters.map((filter) => {
        const column = table.getColumn(filter.columnId);
        if (!column) return null;
        return (
          <Select
            key={filter.columnId}
            aria-label={filter.label}
            value={(column.getFilterValue() as string) ?? ""}
            onChange={(e) => column.setFilterValue(e.target.value || undefined)}
            className="h-10 w-full text-sm sm:w-auto"
          >
            <option value="">{filter.label}: all</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        );
      })}
    </div>
  );

  if (isError) {
    return (
      <StatusBanner
        tone="danger"
        title="Could not load this list"
        action={
          onRetry && (
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          )
        }
      >
        The network did not respond. Nothing is lost — try again.
      </StatusBanner>
    );
  }

  if (isLoading) return <TableSkeleton />;

  /* No data at all is the caller's empty state. No data after
     filtering is a different sentence, and telling someone to create
     their first student when they have forty and a bad filter is the
     classic version of getting this wrong. */
  if (data.length === 0) return <>{empty}</>;

  return (
    <div className="space-y-3">
      {toolbar}

      {rows.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-strong p-6 text-center text-sm text-muted">
          {emptyFiltered ?? "Nothing matches those filters."}
        </p>
      ) : (
        <>
          {/* Cards below sm. */}
          <ul className="space-y-2 sm:hidden">
            {rows.map((row) => (
              <MobileCard key={row.id} row={row} href={getRowHref?.(row.original)} />
            ))}
          </ul>

          {/* Table from sm up. */}
          <div className="hidden overflow-hidden rounded-card border border-border bg-surface-raised sm:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id} className="border-b border-border bg-surface-sunken/60">
                    {group.headers.map((header) => {
                      const sortable = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      const align = header.column.columnDef.meta?.align ?? "start";

                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={
                            sorted === "asc"
                              ? "ascending"
                              : sorted === "desc"
                                ? "descending"
                                : sortable
                                  ? "none"
                                  : undefined
                          }
                          className={cn(
                            "px-3 py-2.5 text-xs font-semibold text-muted",
                            align === "end" ? "text-right" : "text-left"
                          )}
                        >
                          {sortable ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-control hover:text-ink",
                                align === "end" && "flex-row-reverse"
                              )}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {sorted === "asc" ? (
                                <ArrowUp className="size-3" aria-hidden />
                              ) : sorted === "desc" ? (
                                <ArrowDown className="size-3" aria-hidden />
                              ) : (
                                <ChevronsUpDown className="size-3 opacity-40" aria-hidden />
                              )}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>

              <tbody>
                {rows.map((row) => {
                  const href = getRowHref?.(row.original);
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-border last:border-0",
                        href && "cursor-pointer hover:bg-surface-sunken"
                      )}
                    >
                      {row.getVisibleCells().map((cell, index) => {
                        const align = cell.column.columnDef.meta?.align ?? "start";
                        const content = flexRender(cell.column.columnDef.cell, cell.getContext());

                        return (
                          <td
                            key={cell.id}
                            className={cn(
                              "px-3 py-3 text-body",
                              align === "end" && "text-right tabular-nums"
                            )}
                          >
                            {/* The link wraps the first cell's content and
                                stretches over the row, so the whole row is
                                clickable without nesting a link per cell. */}
                            {href && index === 0 ? (
                              <Link href={href} className="after:absolute after:inset-0">
                                <span className="relative">{content}</span>
                              </Link>
                            ) : (
                              content
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   The phone layout
   ============================================================ */

/**
 * A card label is plain text, so a column that appears in the `meta`
 * slot needs a string header. A function header renders against a
 * HeaderContext the cell cannot produce, so those fall back to the
 * column id rather than crash.
 */
function headerLabel<T>(cell: Cell<T, unknown>): string {
  const header = cell.column.columnDef.header;
  return typeof header === "string" ? header : cell.column.id;
}

function MobileCard<T>({ row, href }: { row: Row<T>; href?: string }) {
  const cells = row.getVisibleCells();
  const slot = (cell: (typeof cells)[number]) => cell.column.columnDef.meta?.mobile ?? "meta";

  const primary = cells.find((c) => slot(c) === "primary") ?? cells[0];
  const secondary = cells.filter((c) => slot(c) === "secondary");
  const meta = cells.filter((c) => slot(c) === "meta" && c.id !== primary?.id);

  const body = (
    <>
      {primary && (
        <p className="text-sm font-semibold text-ink">
          {flexRender(primary.column.columnDef.cell, primary.getContext())}
        </p>
      )}

      {secondary.map((cell) => (
        <p key={cell.id} className="mt-0.5 text-sm text-muted">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </p>
      ))}

      {meta.length > 0 && (
        <dl className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
          {meta.map((cell) => (
            <div key={cell.id} className="min-w-0">
              {/* The header doubles as the card's label — one column
                  definition, two layouts, no second set of strings. */}
              <dt className="text-[0.625rem] font-semibold uppercase tracking-wide text-faint">
                {headerLabel(cell)}
              </dt>
              <dd className="text-xs text-body">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );

  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="block rounded-card border border-border bg-surface-raised p-3.5 active:bg-surface-sunken"
        >
          {body}
        </Link>
      ) : (
        <div className="rounded-card border border-border bg-surface-raised p-3.5">{body}</div>
      )}
    </li>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2" aria-busy>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-card bg-surface-sunken sm:h-12" />
      ))}
    </div>
  );
}
