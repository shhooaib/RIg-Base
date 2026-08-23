'use client'

import { useCallback, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { TablePagination } from '@/components/ui/table-pagination'
import { TableToolbar } from '@/components/ui/table-toolbar'
import { compareSortValues } from '@/lib/crm/list-utils'
import { matchesFilter, matchesSearch, useTableControls, type SelectFilter } from '@/hooks/use-table-controls'

interface Column<T> {
  key: string
  header: string
  cellClass?: string
  sortable?: boolean
  sortValue?: (item: T) => string | number | null
  render?: (item: T) => React.ReactNode
}

interface FilterableDataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  getSearchText?: (item: T) => string
  filters?: SelectFilter[]
  customFilter?: (item: T, ctx: { search: string; filters: Record<string, string> }) => boolean
  pageSize?: number
  emptyFilteredMessage?: string
  rowKey?: (item: T) => string
  onRowClick?: (item: T) => void
}

export function FilterableDataTable<T>({
  columns,
  data,
  searchPlaceholder = 'Search records…',
  searchKeys = [],
  getSearchText,
  filters = [],
  customFilter,
  pageSize = 10,
  emptyFilteredMessage = 'No records match your search or filters.',
  rowKey,
  onRowClick,
}: FilterableDataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)

  const filterFn = useCallback(
    (item: T, ctx: { search: string; filters: Record<string, string> }) => {
      const record = item as Record<string, unknown>
      const searchText = getSearchText
        ? getSearchText(item)
        : searchKeys.map((key) => String(record[String(key)] ?? '')).join(' ')

      if (!matchesSearch(searchText, ctx.search)) return false

      if (customFilter) return customFilter(item, ctx)

      for (const filter of filters) {
        const selected = ctx.filters[filter.id] ?? 'all'
        if (selected === 'all') continue
        const fieldValue = String(record[filter.id] ?? '')
        if (!matchesFilter(fieldValue, selected)) return false
      }

      return true
    },
    [customFilter, filters, getSearchText, searchKeys]
  )

  const table = useTableControls(data, { pageSize, filters, filterFn })

  const sortedData = useMemo(() => {
    if (!sort) return table.filteredData
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return table.filteredData
    const getValue =
      col.sortValue ??
      ((item: T) => {
        const record = item as Record<string, unknown>
        const v = record[col.key]
        if (v == null) return null
        if (typeof v === 'number') return v
        return String(v)
      })
    return [...table.filteredData].sort((a, b) => compareSortValues(getValue(a), getValue(b), sort.dir))
  }, [table.filteredData, sort, columns])

  const safePage = Math.min(table.page, Math.max(1, Math.ceil(sortedData.length / pageSize) || 1))
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize))
  const rangeStart = sortedData.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, sortedData.length)

  const paginatedData = useMemo(
    () => sortedData.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sortedData, safePage, pageSize]
  )

  function toggleSort(key: string) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  const tableColumns = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        header: col.sortable ? (
          <button
            type="button"
            onClick={() => toggleSort(col.key)}
            className="inline-flex items-center gap-1 hover:text-text-primary transition-colors uppercase tracking-[0.12em] text-[10px] font-semibold"
          >
            {col.header}
            {sort?.key === col.key ? (
              sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
            ) : (
              <ArrowUpDown size={12} className="opacity-40" />
            )}
          </button>
        ) : (
          col.header
        ),
      })),
    [columns, sort]
  )

  const resolvedRowKey = useMemo(
    () => rowKey ?? ((item: T) => String((item as { id?: unknown }).id ?? JSON.stringify(item))),
    [rowKey]
  )

  return (
    <div className="relative z-0">
      <TableToolbar
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        filterValues={table.filterValues}
        onFilterChange={table.setFilter}
        onClear={table.clearFilters}
        hasActiveFilters={table.hasActiveFilters}
        filteredCount={sortedData.length}
        totalCount={table.totalCount}
      />

      {sortedData.length === 0 ? (
        <div className="ai-card border border-border-primary px-6 py-12 text-center">
          <p className="text-sm text-text-secondary">{emptyFilteredMessage}</p>
          {table.hasActiveFilters && (
            <button type="button" onClick={table.clearFilters} className="mt-3 text-xs text-accent hover:text-accent-hover">
              Clear search and filters
            </button>
          )}
        </div>
      ) : (
        <>
          <DataTable columns={tableColumns} data={paginatedData} onRowClick={onRowClick} rowKey={resolvedRowKey} />
          <TablePagination
            page={safePage}
            totalPages={totalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            filteredCount={sortedData.length}
            onPageChange={table.setPage}
          />
        </>
      )}
    </div>
  )
}
