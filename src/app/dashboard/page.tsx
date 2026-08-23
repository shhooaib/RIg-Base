'use client'

import { useMemo } from 'react'
import { useWorkspaceStore } from '@/store/workspace'
import { TimeFilter } from '@/components/dashboard/time-filter'
import { MetricCard } from '@/components/dashboard/metric-card'
import { AiSuggestionsPanel } from '@/components/dashboard/ai-suggestions-panel'
import { SetupChecklistButton } from '@/components/dashboard/setup-checklist-button'
import { useDashboardMetrics } from '@/hooks/use-dashboard-metrics'
import { filterDashboardMetrics, getMetricPeriodHint } from '@/lib/dashboard/metric-filter'
import { getComparisonLabel } from '@/lib/dashboard/date-ranges'
import { LayoutDashboard } from 'lucide-react'
import { ICON_STROKE_NAV } from '@/lib/icons/lucide-nav'
import { ModuleAccessGuard } from '@/components/rbac/module-access-guard'
import { PermissionGate } from '@/components/rbac/permission-gate'

export default function DashboardPage() {
  const { workspace, profile, timePeriod } = useWorkspaceStore()
  const { getMetricResolution, data: dashboardData, isLoading } = useDashboardMetrics(workspace?.id, timePeriod)

  const visibleMetrics = useMemo(
    () => filterDashboardMetrics(workspace?.dashboard_metrics, workspace?.modules, timePeriod),
    [workspace?.dashboard_metrics, workspace?.modules, timePeriod]
  )

  const setupCounts = useMemo(
    () => ({
      employees: dashboardData?.employees.length ?? 0,
      products: dashboardData?.products.length ?? 0,
      transactions: dashboardData?.transactions.length ?? 0,
      suppliers: dashboardData?.suppliers?.length ?? 0,
      customers: dashboardData?.customers.length ?? 0,
      purchaseOrders: dashboardData?.purchaseOrders.length ?? 0,
    }),
    [dashboardData]
  )

  if (!workspace) return null

  const comparisonLabel = getComparisonLabel(timePeriod)

  return (
    <ModuleAccessGuard module="dashboard" label="Dashboard">
    <div className="max-w-7xl mx-auto pb-24">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
          </h1>
          <p className="page-subtitle">
            {workspace.business_type} — {comparisonLabel.toLowerCase()}
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            Showing {visibleMetrics.length} metrics for your active modules
          </p>
        </div>
        <TimeFilter />
      </div>

      {visibleMetrics.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
          {visibleMetrics.map((metric, index) => {
            const resolution = dashboardData ? getMetricResolution(metric) : undefined
            return (
              <MetricCard
                key={metric.id}
                metric={metric}
                index={index}
                value={resolution?.value ?? 0}
                chartData={resolution?.chartData}
                changePercent={resolution?.changePercent}
                periodHint={
                  resolution
                    ? getMetricPeriodHint(metric, timePeriod, resolution.isSnapshot)
                    : comparisonLabel
                }
                loading={isLoading}
              />
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 mb-8 border border-border-primary">
          <div className="w-14 h-14 border border-border-primary flex items-center justify-center mx-auto mb-4">
            <LayoutDashboard size={22} strokeWidth={ICON_STROKE_NAV} className="text-text-tertiary" />
          </div>
          <h2 className="font-serif text-xl font-medium mb-2">No metrics for this view</h2>
          <p className="text-text-secondary text-sm max-w-md mx-auto">
            Metrics are filtered to match your enabled modules. Enable more modules or import data to populate your dashboard.
          </p>
        </div>
      )}

      <PermissionGate module="dashboard" permission="view_reports">
        <AiSuggestionsPanel timePeriod={timePeriod} />
      </PermissionGate>

      <SetupChecklistButton workspace={workspace} counts={setupCounts} />
    </div>
    </ModuleAccessGuard>
  )
}
