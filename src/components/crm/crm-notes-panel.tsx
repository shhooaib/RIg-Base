'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { CRM_QUERY_KEYS } from '@/lib/crm/constants'
import { logCrmInteraction, touchCustomerInteraction, touchLeadContact } from '@/lib/crm/interactions'
import type { CrmNote } from '@/lib/types'
import { toast } from 'sonner'

type NoteScope = {
  workspaceId: string
  customerId?: string
  leadId?: string
  dealId?: string
}

export function CrmNotesPanel({
  notes,
  scope,
  canCreate,
}: {
  notes: CrmNote[]
  scope: NoteScope
  canCreate: boolean
}) {
  const [noteText, setNoteText] = useState('')
  const supabase = createClient()
  const queryClient = useQueryClient()

  const entityKey = scope.customerId
    ? CRM_QUERY_KEYS.notes('customer', scope.customerId)
    : scope.leadId
      ? CRM_QUERY_KEYS.notes('lead', scope.leadId)
      : CRM_QUERY_KEYS.notes('deal', scope.dealId!)

  const interactionsKey = scope.customerId
    ? CRM_QUERY_KEYS.interactions('customer', scope.customerId)
    : scope.leadId
      ? CRM_QUERY_KEYS.interactions('lead', scope.leadId)
      : null

  const addNote = useMutation({
    mutationFn: async (content: string) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('crm_notes').insert({
        workspace_id: scope.workspaceId,
        customer_id: scope.customerId ?? null,
        lead_id: scope.leadId ?? null,
        deal_id: scope.dealId ?? null,
        content,
        created_by: userData.user?.id ?? null,
      })
      if (error) throw error

      await logCrmInteraction(supabase, {
        workspaceId: scope.workspaceId,
        eventType: 'note_added',
        title: 'Note added',
        description: content.slice(0, 120),
        customerId: scope.customerId ?? null,
        leadId: scope.leadId ?? null,
        dealId: scope.dealId ?? null,
        createdBy: userData.user?.id,
      })

      if (scope.customerId) await touchCustomerInteraction(supabase, scope.customerId, scope.workspaceId)
      if (scope.leadId) await touchLeadContact(supabase, scope.leadId, scope.workspaceId)
    },
    onSuccess: () => {
      setNoteText('')
      queryClient.invalidateQueries({ queryKey: entityKey })
      if (interactionsKey) queryClient.invalidateQueries({ queryKey: interactionsKey })
      toast.success('Note added')
    },
    onError: () => toast.error('Failed to add note'),
  })

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_notes').delete().eq('id', id).eq('workspace_id', scope.workspaceId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entityKey })
      toast.success('Note removed')
    },
    onError: () => toast.error('Failed to delete note'),
  })

  return (
    <div className="ai-card border border-border-primary p-5 space-y-4">
      {canCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (noteText.trim()) addNote.mutate(noteText.trim())
          }}
          className="space-y-2"
        >
          <textarea
            className="form-field resize-none"
            rows={3}
            placeholder="Add an internal note…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <button type="submit" disabled={addNote.isPending || !noteText.trim()} className="btn-primary text-sm">
            Add note
          </button>
        </form>
      )}
      {notes.map((note) => (
        <div key={note.id} className="border border-border-primary/70 p-4 text-sm group">
          <p className="text-text-secondary leading-relaxed whitespace-pre-wrap">{note.content}</p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[11px] text-text-tertiary">{new Date(note.created_at).toLocaleString()}</p>
            {canCreate && (
              <button
                type="button"
                onClick={() => deleteNote.mutate(note.id)}
                className="text-[11px] text-danger opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
      {notes.length === 0 && <p className="text-sm text-text-tertiary">No internal notes yet.</p>}
    </div>
  )
}
