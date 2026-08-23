/** Sidebar layout — widths in px */
export const SIDEBAR_WIDTH_COLLAPSED = 64
export const SIDEBAR_WIDTH_DEFAULT = 256
/** @deprecated Use SIDEBAR_WIDTH_DEFAULT or sidebarWidth from store */
export const SIDEBAR_WIDTH_EXPANDED = SIDEBAR_WIDTH_DEFAULT

export const SIDEBAR_WIDTH_MIN = 200
export const SIDEBAR_WIDTH_MAX = 420
export const SIDEBAR_STORAGE_KEY = 'rig-base-sidebar-width'

export function clampSidebarWidth(width: number): number {
  return Math.round(Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, width)))
}

export function readStoredSidebarWidth(): number {
  if (typeof window === 'undefined') return SIDEBAR_WIDTH_DEFAULT
  try {
    const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    const parsed = raw ? Number(raw) : NaN
    return Number.isFinite(parsed) ? clampSidebarWidth(parsed) : SIDEBAR_WIDTH_DEFAULT
  } catch {
    return SIDEBAR_WIDTH_DEFAULT
  }
}

export function persistSidebarWidth(width: number): number {
  const clamped = clampSidebarWidth(width)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(clamped))
    } catch {
      /* ignore quota / private mode */
    }
  }
  return clamped
}

/** Resolved width for layout given open state and stored expanded width */
export function resolveSidebarWidth(expanded: boolean, expandedWidth: number): number {
  return expanded ? clampSidebarWidth(expandedWidth) : SIDEBAR_WIDTH_COLLAPSED
}
