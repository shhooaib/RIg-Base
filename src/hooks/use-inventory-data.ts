'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { INVENTORY_QUERY_KEYS } from '@/lib/inventory/constants'
import type { InventoryDashboardStats, InventoryProduct, StockMovement } from '@/lib/inventory/types'

export function useInventoryDashboard() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [INVENTORY_QUERY_KEYS.dashboard, workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inventory_dashboard_stats', {
        p_workspace_id: workspace!.id,
      })
      if (error) throw error
      return data as InventoryDashboardStats
    },
    enabled: !!workspace?.id,
  })
}

export function useProducts() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [INVENTORY_QUERY_KEYS.products, workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as InventoryProduct[]
    },
    enabled: !!workspace?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useProduct(id: string | undefined) {
  const { data: products = [], ...rest } = useProducts()
  return {
    ...rest,
    data: products.find((p) => p.id === id),
  }
}

export function useStockMovements(productId?: string) {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [INVENTORY_QUERY_KEYS.movements, workspace?.id, productId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('inventory_stock_movements')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .order('created_at', { ascending: false })
        .limit(200)

      if (productId) q = q.eq('product_id', productId)

      const { data: movements, error } = await q
      if (error) throw error
      if (!movements?.length) return [] as StockMovement[]

      const productIds = [...new Set(movements.map((m) => m.product_id))]
      const { data: products } = await supabase
        .from('products')
        .select('id, name, sku')
        .in('id', productIds)

      const productMap = new Map((products ?? []).map((p) => [p.id, p]))

      return movements.map((m) => ({
        ...m,
        product: productMap.get(m.product_id) ?? null,
      })) as StockMovement[]
    },
    enabled: !!workspace?.id,
  })
}
