'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Database } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { DEMO_SEED_QUERY_KEYS, type SeedDemoSummary } from '@/lib/inventory-supply-chain/seed-demo-data'

export function SeedDemoDataButton() {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<SeedDemoSummary | null>(null)
  const queryClient = useQueryClient()

  const { data: status } = useQuery({
    queryKey: ['inventory-supply-chain-demo-status'],
    queryFn: async () => {
      const res = await fetch('/api/inventory-supply-chain/seed-demo')
      if (!res.ok) return { loaded: false }
      return res.json() as Promise<{ loaded: boolean }>
    },
    staleTime: 30_000,
  })

  async function loadDemo() {
    setLoading(true)
    try {
      const res = await fetch('/api/inventory-supply-chain/seed-demo', { method: 'POST' })
      const payload = (await res.json()) as SeedDemoSummary & { error?: string }

      if (!res.ok) {
        toast.error(payload.error ?? 'Failed to load demo data')
        return
      }

      for (const key of DEMO_SEED_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
      queryClient.invalidateQueries({ queryKey: ['inventory-supply-chain-demo-status'] })

      setSummary(payload)
      toast.success(payload.alreadyExists ? 'Demo data is already loaded' : 'Linked demo data loaded')
    } catch {
      toast.error('Failed to load demo data')
    } finally {
      setLoading(false)
    }
  }

  const label = loading ? 'Loading…' : status?.loaded ? 'Demo data loaded' : 'Load demo data'

  return (
    <>
      <button
        type="button"
        disabled={loading}
        onClick={() => void loadDemo()}
        className="text-xs text-text-tertiary hover:text-accent transition-colors px-1 disabled:opacity-50"
        title="Creates sample products, suppliers, purchase orders, Finance payables, and inventory receipts"
      >
        {label}
      </button>

      <Modal open={!!summary} onClose={() => setSummary(null)} title="Inventory & Supply Chain demo">
        {summary && (
          <div className="space-y-4 text-sm">
            <p className="text-text-secondary">{summary.message}</p>

            <div>
              <p className="font-medium text-text-primary mb-2">Products ({summary.products.length})</p>
              <ul className="space-y-1 text-text-secondary">
                {summary.products.map((p) => (
                  <li key={p.id}>
                    <Link href={`/dashboard/inventory/products/${p.id}`} className="text-accent hover:underline">
                      {p.name}
                    </Link>
                    <span className="text-text-tertiary"> · {p.sku}</span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/inventory/products" className="text-xs text-accent mt-2 inline-block hover:underline">
                View all products →
              </Link>
            </div>

            <div>
              <p className="font-medium text-text-primary mb-2">Suppliers ({summary.suppliers.length})</p>
              <ul className="space-y-1 text-text-secondary">
                {summary.suppliers.map((s) => (
                  <li key={s.id}>
                    <Link href={`/dashboard/supply-chain/suppliers/${s.id}`} className="text-accent hover:underline">
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-medium text-text-primary mb-2">Purchase orders & links</p>
              <ul className="space-y-2">
                {summary.purchaseOrders.map((o) => (
                  <li key={o.id} className="rounded-lg border border-border-primary bg-bg-secondary/40 px-3 py-2">
                    <Link href={o.link} className="font-medium text-accent hover:underline">{o.order_number}</Link>
                    <span className="text-text-tertiary ml-2 capitalize">{o.status.replace(/_/g, ' ')}</span>
                    {o.expense_id && (
                      <p className="text-xs text-text-tertiary mt-1 flex items-center gap-1">
                        <Database size={12} /> Finance payable created
                        <Link href="/dashboard/finance/expenses" className="text-accent hover:underline ml-1">View expenses →</Link>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-text-tertiary mt-2">
                DEMO-PO-001 is partially received (stock updated). DEMO-PO-002 is pending — approve it to create another payable. DEMO-PO-003 is approved and awaiting receipt.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/dashboard/inventory/movements" className="btn-secondary text-xs">Stock movements</Link>
              <Link href="/dashboard/supply-chain/receiving" className="btn-secondary text-xs">Goods receiving</Link>
              <Link href="/dashboard/finance/expenses" className="btn-secondary text-xs">Finance payables</Link>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
