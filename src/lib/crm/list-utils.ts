import type { Employee } from '@/lib/types'

export function buildOwnerFilterOptions(employees: Employee[]) {
  return [
    { value: 'unassigned', label: 'Unassigned' },
    ...employees.map((e) => ({ value: e.id, label: e.full_name })),
  ]
}

export function matchesOwnerFilter(assignedTo: string | null | undefined, filterValue: string): boolean {
  if (filterValue === 'all') return true
  if (filterValue === 'unassigned') return !assignedTo
  return assignedTo === filterValue
}

export function compareSortValues(a: string | number | null, b: string | number | null, dir: 'asc' | 'desc'): number {
  const av = a ?? ''
  const bv = b ?? ''
  let cmp = 0
  if (typeof av === 'number' && typeof bv === 'number') {
    cmp = av - bv
  } else {
    cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' })
  }
  return dir === 'asc' ? cmp : -cmp
}
