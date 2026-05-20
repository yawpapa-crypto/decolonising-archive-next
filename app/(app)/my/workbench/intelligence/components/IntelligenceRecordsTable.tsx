"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown, ExternalLink, FileText } from "lucide-react";
import type { IntelligenceFilter, IntelligenceItem } from "@/lib/workbench-intelligence-types";
import { cn } from "@/lib/cn";

type Props = {
  items: IntelligenceItem[];
  globalSearch: string;
  onSearchChange: (value: string) => void;
  filter: IntelligenceFilter;
  onFilterChange: (value: IntelligenceFilter) => void;
  filterChips: Array<{ value: IntelligenceFilter; label: string }>;
};

const columnHelper = createColumnHelper<IntelligenceItem>();

const DEFAULT_VISIBILITY: VisibilityState = {
  institution: false,
  theme: false,
  confidence: false,
  lastSynced: false,
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("ri-badge", `ri-badge--${status.replace(/_/g, "-")}`)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <ChevronUp size={14} aria-hidden />;
  if (sorted === "desc") return <ChevronDown size={14} aria-hidden />;
  return <ChevronsUpDown size={14} className="ri-muted" aria-hidden />;
}

export default function IntelligenceRecordsTable({
  items,
  globalSearch,
  onSearchChange,
  filter,
  onFilterChange,
  filterChips,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_VISIBILITY);
  const [showColumns, setShowColumns] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const apply = () => {
      setPagination((current) => ({
        ...current,
        pageSize: query.matches ? 10 : 25,
        pageIndex: 0,
      }));
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Title",
        cell: (info) => (
          <div className="ri-table-title">
            <strong>{info.getValue()}</strong>
          </div>
        ),
        size: 200,
      }),
      columnHelper.accessor((row) => row.sourceLabel ?? row.source, {
        id: "source",
        header: "Source",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor((row) => row.country ?? row.region ?? "—", {
        id: "region",
        header: "Region",
        cell: (info) => {
          const row = info.row.original;
          return row.country ?? row.region ?? "—";
        },
      }),
      columnHelper.accessor("institution", {
        header: "Institution",
        cell: (info) => info.getValue() ?? "—",
      }),
      columnHelper.accessor("theme", {
        header: "Theme",
        cell: (info) => info.getValue() ?? "—",
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      columnHelper.accessor("confidence", {
        header: "Confidence",
        cell: (info) => info.getValue() ?? "—",
      }),
      columnHelper.accessor("openAccess", {
        header: "Access",
        cell: (info) => {
          const val = info.getValue();
          if (val == null) return <span className="ri-muted">—</span>;
          return (
            <span className={cn("ri-badge", val ? "ri-badge--open" : "ri-badge--closed")}>
              {val ? "Open" : "Closed"}
            </span>
          );
        },
      }),
      columnHelper.accessor("lastSynced", {
        header: "Synced",
        cell: (info) => {
          const val = info.getValue();
          return val ? new Date(val).toLocaleDateString() : "—";
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="ri-row-actions">
            {row.original.openHref ? (
              <Link href={row.original.openHref} className="ri-table-action">
                <ExternalLink size={14} aria-hidden />
              </Link>
            ) : null}
            {row.original.recordId ? (
              <Link href="/my/workbench/notes" className="ri-table-action">
                <FileText size={14} aria-hidden />
              </Link>
            ) : null}
          </div>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, globalFilter: globalSearch, pagination, columnVisibility },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
  });

  return (
    <div className="ri-records ri-dash-records">
      <div className="ri-records__toolbar ri-records__toolbar--unified">
        <label className="ri-search">
          <span className="sr-only">Search records</span>
          <input
            type="search"
            value={globalSearch}
            placeholder="Search title, country, creator…"
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>
        <div className="ri-chips" role="group" aria-label="Quick filters">
          {filterChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={cn("ri-chip", filter === chip.value && "is-active")}
              onClick={() => onFilterChange(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="ri-records__toolbar-meta">
          <button
            type="button"
            className="ri-btn ri-btn--ghost"
            onClick={() => setShowColumns((open) => !open)}
          >
            Columns
          </button>
          <span className="ri-records__count">
            {table.getFilteredRowModel().rows.length.toLocaleString()} records
          </span>
          <div className="ri-dash-pagination">
            <button
              type="button"
              className="ri-btn ri-btn--ghost"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Prev
            </button>
            <span>
              {table.getState().pagination.pageIndex + 1}/{table.getPageCount() || 1}
            </span>
            <button
              type="button"
              className="ri-btn ri-btn--ghost"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showColumns ? (
        <div className="ri-column-picker">
          {table.getAllLeafColumns().map((column) => {
            if (column.id === "title" || column.id === "actions") return null;
            return (
              <label key={column.id}>
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                />
                {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
              </label>
            );
          })}
        </div>
      ) : null}

      <div className="ri-table-wrap">
        <table className="ri-table ri-dash-table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} scope="col">
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className={cn("ri-table-sort", header.column.getCanSort() && "is-sortable")}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() ? (
                          <SortIcon sorted={header.column.getIsSorted()} />
                        ) : null}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} data-label={cell.column.columnDef.header as string}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>No records match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
