'use client'

interface Column<T> {
  key: string
  header: React.ReactNode
  cellClass?: string
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (item: T) => void
  rowKey?: (item: T) => string
  emptyMessage?: string
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  rowKey,
  emptyMessage = 'No records to display.',
}: DataTableProps<T>) {
  return (
    <div className="border border-border-primary overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border-primary">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.12em] px-4 py-3"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-text-tertiary">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={rowKey ? rowKey(item) : JSON.stringify(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`border-b border-border-primary last:border-0 ${
                    onRowClick ? 'cursor-pointer hover:bg-bg-tertiary/40' : ''
                  } transition-colors`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3.5 ${col.cellClass ?? 'table-cell-primary'}`}
                    >
                      {col.render
                        ? col.render(item)
                        : String((item as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
