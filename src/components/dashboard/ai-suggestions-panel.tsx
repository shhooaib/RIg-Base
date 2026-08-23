'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertCircle, Loader2 } from 'lucide-react'
import {
  ICON_SIZE_NAV,
  ICON_STROKE_NAV,
  INSIGHTS_ICON,
} from '@/lib/icons/lucide-nav'
import type { AiInsightSuggestion, AiInsightsResponse } from '@/lib/dashboard/ai-insights'
import type { TimePeriod } from '@/lib/types'

interface AiSuggestionsPanelProps {
  timePeriod: TimePeriod
}

type AiInsightsLookup = AiInsightsResponse | { cached: false; can_generate: true; insight_date: string }

const priorityStyles: Record<AiInsightSuggestion['priority'], string> = {
  high: 'border-danger/30 bg-danger/5 text-danger',
  medium: 'border-warning/30 bg-warning/5 text-warning',
  low: 'border-accent/30 bg-accent/5 text-accent',
}

const AI_INSIGHT_DISCLAIMER =
  'AI-generated insights may be inaccurate or incomplete. They are for informational purposes only and do not constitute professional, financial, or legal advice. Verify important decisions against your own data before acting on them.'

export function AiSuggestionsPanel({ timePeriod }: AiSuggestionsPanelProps) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['ai-insights', timePeriod],
    queryFn: async (): Promise<AiInsightsLookup> => {
      const res = await fetch(`/api/dashboard/ai-insights?period=${timePeriod}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to load AI insights')
      }
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const generate = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/dashboard/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: timePeriod }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const detail = typeof body.detail === 'string' ? body.detail : null
        const base = body.error ?? 'Failed to generate AI insights'
        throw new Error(detail ? `${base} (${detail})` : base)
      }
      return res.json() as Promise<AiInsightsResponse>
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['ai-insights', timePeriod], data)
    },
  })

  const insight = query.data && 'summary' in query.data && query.data.summary ? query.data : null
  const canGenerate = query.data && 'can_generate' in query.data && query.data.can_generate
  const isChecking = query.isLoading
  const isGenerating = generate.isPending
  const errorMessage =
    (generate.error instanceof Error ? generate.error.message : null) ??
    (query.error instanceof Error ? query.error.message : null)

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="ai-card border border-border-primary p-6 mb-8"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 border border-border-primary bg-bg-tertiary flex items-center justify-center flex-shrink-0">
          <INSIGHTS_ICON size={ICON_SIZE_NAV} strokeWidth={ICON_STROKE_NAV} className="text-text-tertiary" />
        </div>
        <div className="flex-1">
          <h2 className="font-serif font-medium text-base">Business insights</h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            Request one personalized analysis per day based on your dashboard metrics.
          </p>
        </div>
        {insight?.cached && (
          <span className="text-[10px] uppercase tracking-wide text-text-tertiary px-2 py-1 bg-bg-tertiary/70">
            Today&apos;s insight
          </span>
        )}
      </div>

      {errorMessage ? (
        <div className="flex items-start gap-2 text-sm text-danger bg-danger/5 border border-danger/20 px-4 py-3 mb-4">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {isChecking ? (
        <div className="flex items-center gap-3 py-6 justify-center text-sm text-text-secondary">
          <Loader2 size={18} strokeWidth={ICON_STROKE_NAV} className="animate-spin text-text-tertiary" />
          Checking for today&apos;s insight…
        </div>
      ) : isGenerating ? (
        <div className="flex items-center gap-3 py-8 justify-center text-sm text-text-secondary">
          <Loader2 size={18} strokeWidth={ICON_STROKE_NAV} className="animate-spin text-text-tertiary" />
          Analyzing your metrics…
        </div>
      ) : insight ? (
        <div>
          <p className="text-sm text-text-secondary leading-relaxed mb-5">{insight.summary}</p>
          <div className="space-y-3">
            {insight.suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.title}-${index}`}
                className="border border-border-primary/70 px-4 py-3 bg-bg-secondary/40"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${priorityStyles[suggestion.priority]}`}>
                    {suggestion.priority}
                  </span>
                  <h3 className="text-sm font-medium">{suggestion.title}</h3>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{suggestion.detail}</p>
                {suggestion.metric_ref && (
                  <p className="text-[10px] text-text-tertiary mt-2">Related metric: {suggestion.metric_ref}</p>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-text-tertiary mt-4">
            Next insight available{' '}
            {new Date(insight.next_available_at).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
      ) : canGenerate ? (
        <div className="py-4 text-center">
          <p className="text-sm text-text-secondary mb-4 max-w-md mx-auto">
            Generate today&apos;s AI recommendations from your current metrics and trends.
          </p>
          <button
            type="button"
            onClick={() => generate.mutate()}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 btn-primary disabled:opacity-50"
          >
            <INSIGHTS_ICON size={16} strokeWidth={ICON_STROKE_NAV} />
            Generate insight
          </button>
          <p className="text-[11px] text-text-tertiary mt-3">One request per day.</p>
        </div>
      ) : (
        <p className="text-sm text-text-secondary py-4">
          Add module data and metrics to unlock daily AI recommendations.
        </p>
      )}

      <p className="text-[11px] text-text-muted leading-relaxed mt-5 pt-4 border-t border-border-primary/60">
        {AI_INSIGHT_DISCLAIMER}
      </p>
    </motion.section>
  )
}
