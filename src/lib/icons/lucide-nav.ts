import {
  Boxes,
  ChartNoAxesCombined,
  ContactRound,
  LayoutDashboard,
  Settings2,
  Truck,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleKey } from '@/lib/rbac/types'

/** Consistent Lucide outline sizing for sidebar / primary nav */
export const NAV_ICON_SIZE = 18
export const NAV_ICON_STROKE = 1.75

/** @alias NAV_ICON_SIZE */
export const ICON_SIZE_NAV = NAV_ICON_SIZE
/** @alias NAV_ICON_STROKE */
export const ICON_STROKE_NAV = NAV_ICON_STROKE

export const MODULE_NAV_ICONS: Record<ModuleKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  finance: WalletCards,
  crm: ContactRound,
  hr: UsersRound,
  inventory: Boxes,
  supply_chain: Truck,
  settings: Settings2,
}

export const INSIGHTS_ICON = ChartNoAxesCombined

export function navIconClassName(isActive: boolean): string {
  return isActive ? 'text-accent' : 'text-text-tertiary group-hover:text-text-secondary'
}

export function mergeNavIconClass(isActive: boolean, className?: string): string {
  return [navIconClassName(isActive), 'flex-shrink-0', className].filter(Boolean).join(' ')
}
