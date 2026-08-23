export function CrmStatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="ai-card border border-border-primary p-5">
      <p className="text-xs uppercase tracking-wide text-text-tertiary mb-2">{label}</p>
      <p className="font-serif text-2xl font-medium text-text-primary">{value}</p>
      {hint ? <p className="text-xs text-text-tertiary mt-1">{hint}</p> : null}
    </div>
  )
}
