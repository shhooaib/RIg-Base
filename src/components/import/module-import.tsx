'use client'

import { useCallback, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Info, Loader2, Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import type { ImportEntity, ImportModule, ImportResult, ImportSchema } from '@/lib/import/types'
import { queryKeysForEntity } from '@/lib/import/execute'
import { SeedDemoDataButton } from '@/components/inventory-supply-chain/seed-demo-data-button'

type ModuleImportProps = {
  module: ImportModule
  entity: ImportEntity
  label?: string
}

export function ModuleImport({ module, entity, label = 'Import data' }: ModuleImportProps) {
  const [showInfo, setShowInfo] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data: schema, isLoading: schemaLoading } = useQuery({
    queryKey: ['import-schema', module, entity],
    queryFn: async () => {
      const res = await fetch(`/api/import/schema?module=${module}&entity=${entity}`)
      if (!res.ok) throw new Error('Failed to load import schema')
      return res.json() as Promise<ImportSchema>
    },
  })

  const downloadSample = useCallback(
    (sampleFormat: 'csv' | 'json') => {
      window.open(`/api/import/sample?module=${module}&entity=${entity}&format=${sampleFormat}`, '_blank')
    },
    [module, entity]
  )

  async function handleFileSelect(file: File) {
    setUploading(true)
    setResult(null)

    const ext = file.name.toLowerCase()
    const detectedFormat: 'csv' | 'json' = ext.endsWith('.json') ? 'json' : 'csv'
    setFormat(detectedFormat)

    const formData = new FormData()
    formData.append('module', module)
    formData.append('entity', entity)
    formData.append('format', detectedFormat)
    formData.append('file', file)

    try {
      const res = await fetch('/api/import', { method: 'POST', body: formData })
      const payload = (await res.json()) as ImportResult & { error?: string }

      if (!res.ok && payload.error) {
        toast.error(payload.error)
        setUploading(false)
        return
      }

      setResult(payload)
      setShowResult(true)

      if (payload.imported > 0) {
        for (const key of queryKeysForEntity(entity)) {
          queryClient.invalidateQueries({ queryKey: [key] })
        }
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
        toast.success(`Imported ${payload.imported} record${payload.imported === 1 ? '' : 's'}`)
      } else {
        toast.error('No records were imported')
      }
    } catch {
      toast.error('Import failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="relative z-30 flex flex-col items-end gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json,text/csv,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFileSelect(file)
        }}
      />

      <button
        type="button"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 btn-ghost disabled:opacity-50"
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {label}
      </button>

      <div
        className="relative"
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
      >
        <button
          type="button"
          aria-label="Import format help"
          aria-expanded={showInfo}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-accent transition-colors px-1"
        >
          <Info size={14} />
          Format guide
        </button>

        {showInfo && (
          <div className="absolute right-0 top-full z-[200] w-[min(420px,calc(100vw-2rem))] pt-2">
            <div className="ai-panel border border-border-primary p-4 shadow-2xl max-h-[70vh] overflow-y-auto">
            <div className="mb-3">
              <p className="text-sm font-semibold">{schema?.title ?? 'Import format'}</p>
              <p className="text-xs text-text-secondary mt-0.5">
                {schema?.description ?? 'Loading schema from your workspace...'}
              </p>
            </div>

            {schemaLoading && (
              <div className="flex items-center gap-2 text-xs text-text-secondary py-4">
                <Loader2 size={14} className="animate-spin" />
                Loading your workspace import schema...
              </div>
            )}

            {schema && (
              <>
                <div className="mb-4">
                  <p className="text-xs font-medium text-text-secondary mb-2">Supported formats</p>
                  <p className="text-xs text-text-tertiary">CSV (header row) or JSON (array or &#123; &quot;records&quot;: [...] &#125;)</p>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-medium text-text-secondary mb-2">Fields</p>
                  <div className="space-y-2">
                    {schema.fields.map((field) => (
                      <div key={field.key} className="border border-border-primary bg-bg-secondary/60 px-3 py-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs text-cyan-glow">{field.key}</code>
                          <span className="text-[10px] uppercase tracking-wide text-text-tertiary">{field.type}</span>
                          {field.required ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent">required</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-tertiary text-text-tertiary">optional</span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary mt-1">{field.description}</p>
                        {field.allowedValues && field.allowedValues.length > 0 && (
                          <p className="text-[11px] text-text-tertiary mt-1">
                            Allowed: {field.allowedValues.slice(0, 8).join(', ')}
                            {field.allowedValues.length > 8 ? '…' : ''}
                          </p>
                        )}
                        {field.example && (
                          <p className="text-[11px] text-text-tertiary mt-0.5">Example: {field.example}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-medium text-text-secondary mb-2">Validation rules</p>
                  <ul className="space-y-1">
                    {schema.rules.map((rule) => (
                      <li key={rule} className="text-xs text-text-tertiary flex gap-2">
                        <span className="text-accent">•</span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => downloadSample('csv')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-border-primary bg-bg-tertiary hover:bg-bg-elevated"
                  >
                    <Download size={14} />
                    Sample CSV (100 rows)
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadSample('json')}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-border-primary bg-bg-tertiary hover:bg-bg-elevated"
                  >
                    <Download size={14} />
                    Sample JSON (100 rows)
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        )}
      </div>

      {(module === 'inventory' || module === 'supply_chain') && <SeedDemoDataButton />}

      <Modal open={showResult} onClose={() => setShowResult(false)} title="Import results">
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3">
                <p className="text-xs text-text-tertiary">Imported</p>
                <p className="text-lg font-semibold text-success flex items-center gap-1">
                  <CheckCircle2 size={16} />
                  {result.imported}
                </p>
              </div>
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
                <p className="text-xs text-text-tertiary">Failed</p>
                <p className="text-lg font-semibold text-danger flex items-center gap-1">
                  <AlertCircle size={16} />
                  {result.failed}
                </p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Errors</p>
                <ul className="max-h-48 overflow-y-auto space-y-2">
                  {result.errors.slice(0, 20).map((err, index) => (
                    <li key={`${err.row}-${index}`} className="text-xs text-text-secondary rounded-lg bg-bg-tertiary px-3 py-2">
                      Row {err.row}{err.field ? ` (${err.field})` : ''}: {err.message}
                    </li>
                  ))}
                </ul>
                {result.errors.length > 20 && (
                  <p className="text-xs text-text-tertiary mt-2">+ {result.errors.length - 20} more errors</p>
                )}
              </div>
            )}

            <p className="text-xs text-text-tertiary">
              Format used: {format.toUpperCase()}. Dashboard metrics refresh when finance, inventory, or CRM data changes.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
