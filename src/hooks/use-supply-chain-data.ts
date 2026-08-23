'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { SUPPLY_CHAIN_QUERY_KEYS } from '@/lib/supply-chain/constants'
import { fetchPurchaseOrder, fetchPurchaseOrders } from '@/lib/supply-chain/purchase-orders-data'
import type {
  GoodsReceipt,
  SupplyChainDashboardStats,
  SupplyChainSupplier,
  SupplierReturn,
} from '@/lib/supply-chain/types'

export function useSupplyChainDashboard() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [SUPPLY_CHAIN_QUERY_KEYS.dashboard, workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_supply_chain_dashboard_stats', {
        p_workspace_id: workspace!.id,
      })
      if (error) throw error
      return data as SupplyChainDashboardStats
    },
    enabled: !!workspace?.id,
  })
}

export function useSuppliers() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [SUPPLY_CHAIN_QUERY_KEYS.suppliers, workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as SupplyChainSupplier[]
    },
    enabled: !!workspace?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useSupplier(id: string | undefined) {
  const { data: suppliers = [], ...rest } = useSuppliers()
  return { ...rest, data: suppliers.find((s) => s.id === id) }
}

export function usePurchaseOrders() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [SUPPLY_CHAIN_QUERY_KEYS.purchaseOrders, workspace?.id],
    queryFn: () => fetchPurchaseOrders(supabase, workspace!.id),
    enabled: !!workspace?.id,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function usePurchaseOrder(id: string | undefined) {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [SUPPLY_CHAIN_QUERY_KEYS.purchaseOrders, workspace?.id, id],
    queryFn: () => fetchPurchaseOrder(supabase, workspace!.id, id!),
    enabled: !!workspace?.id && !!id,
  })
}

export function useGoodsReceipts(purchaseOrderId?: string) {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [SUPPLY_CHAIN_QUERY_KEYS.goodsReceipts, workspace?.id, purchaseOrderId ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('goods_receipts')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .order('received_at', { ascending: false })

      if (purchaseOrderId) q = q.eq('purchase_order_id', purchaseOrderId)

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as GoodsReceipt[]
    },
    enabled: !!workspace?.id,
  })
}

export function useSupplierReturns() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()

  return useQuery({
    queryKey: [SUPPLY_CHAIN_QUERY_KEYS.supplierReturns, workspace?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_returns')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as SupplierReturn[]
    },
    enabled: !!workspace?.id,
  })
}
