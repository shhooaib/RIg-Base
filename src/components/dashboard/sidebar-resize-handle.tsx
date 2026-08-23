'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useWorkspaceStore } from '@/store/workspace'
import { clampSidebarWidth } from '@/lib/sidebar-layout'

export function SidebarResizeHandle() {
  const { sidebarOpen, setSidebarWidth, setSidebarResizing } = useWorkspaceStore()
  const dragging = useRef(false)

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragging.current) return
      setSidebarWidth(event.clientX)
    },
    [setSidebarWidth]
  )

  const stopDragging = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    setSidebarResizing(false)
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', stopDragging)
    window.removeEventListener('pointercancel', stopDragging)
  }, [onPointerMove, setSidebarResizing])

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!sidebarOpen) return
      event.preventDefault()
      dragging.current = true
      setSidebarResizing(true)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      setSidebarWidth(clampSidebarWidth(event.clientX))
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', stopDragging)
      window.addEventListener('pointercancel', stopDragging)
    },
    [sidebarOpen, onPointerMove, setSidebarResizing, setSidebarWidth, stopDragging]
  )

  useEffect(() => () => stopDragging(), [stopDragging])

  if (!sidebarOpen) return null

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onPointerDown={onPointerDown}
      className="absolute top-0 right-0 z-30 h-full w-1.5 -mr-px cursor-col-resize touch-none group"
    >
      <div className="absolute inset-y-0 right-0 w-px bg-border-primary group-hover:bg-accent/60 group-active:bg-accent transition-colors" />
    </div>
  )
}
