import type { InventoryProduct, StockMovement } from './types'

export function productStockValue(product: InventoryProduct): number {
  return product.quantity * Number(product.cost_price)
}

export function totalStockValue(products: InventoryProduct[]): number {
  return products.reduce((sum, p) => sum + productStockValue(p), 0)
}

export function lowStockProducts(products: InventoryProduct[]): InventoryProduct[] {
  return products.filter((p) => p.status === 'low_stock' || p.status === 'out_of_stock')
}

export function movementsByType(movements: StockMovement[]): Record<string, number> {
  return movements.reduce<Record<string, number>>((acc, m) => {
    acc[m.movement_type] = (acc[m.movement_type] ?? 0) + 1
    return acc
  }, {})
}

export function stockValueByCategory(products: InventoryProduct[]): { category: string; value: number; units: number }[] {
  const map = new Map<string, { value: number; units: number }>()
  for (const p of products) {
    const cur = map.get(p.category) ?? { value: 0, units: 0 }
    cur.value += productStockValue(p)
    cur.units += p.quantity
    map.set(p.category, cur)
  }
  return [...map.entries()]
    .map(([category, { value, units }]) => ({ category, value, units }))
    .sort((a, b) => b.value - a.value)
}
