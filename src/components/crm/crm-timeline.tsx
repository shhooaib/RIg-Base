'use client'

import type { CrmInteraction } from '@/lib/types'

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function CrmTimeline({ items }: { items: CrmInteraction[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-text-tertiary py-6 text-center">No activity recorded yet.</p>
  }

  return (
    <ol className="space-y-0">
      {items.map((item, index) => (
        <li key={item.id} className="relative pl-6 pb-6 last:pb-0">
          {index < items.length - 1 && (
            <span className="absolute left-[7px] top-3 bottom-0 w-px bg-border-primary" aria-hidden />
          )}
          <span className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 border-accent bg-bg-primary" />
          <div>
            <p className="text-sm font-medium text-text-primary">{item.title}</p>
            {item.description ? (
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">{item.description}</p>
            ) : null}
            <p className="text-[11px] text-text-tertiary mt-1.5">{formatWhen(item.created_at)}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
