import type { Customer, Lead } from '@/lib/types'

export type LeadFormDraft = {
  name: string
  email: string
  phone: string
  company: string
  source: string
  status: Lead['status']
  lead_score: string
  estimated_value: string
  assigned_to: string
  notes: string
  next_follow_up_at: string
}

export type DealFormDraft = {
  name: string
  customer_id: string
  lead_id: string
  value: string
  stage_id: string
  probability: string
  expected_close_date: string
  assigned_to: string
  notes: string
}

export function emptyLeadDraft(status: Lead['status'] = 'new'): LeadFormDraft {
  return {
    name: '',
    email: '',
    phone: '',
    company: '',
    source: '',
    status,
    lead_score: '0',
    estimated_value: '0',
    assigned_to: '',
    notes: '',
    next_follow_up_at: '',
  }
}

export function customerToLeadDraft(customer: Customer): LeadFormDraft {
  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone ?? '',
    company: customer.company ?? '',
    source: customer.source ?? 'Existing customer',
    status: 'new',
    lead_score: customer.status === 'lead' ? '40' : '25',
    estimated_value: String(customer.total_spent > 0 ? customer.total_spent : 0),
    assigned_to: customer.assigned_to ?? '',
    notes: customer.notes ?? '',
    next_follow_up_at: customer.next_follow_up?.slice(0, 16) ?? '',
  }
}

export function leadToLeadDraft(lead: Lead): LeadFormDraft {
  return {
    name: lead.name,
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    company: lead.company ?? '',
    source: lead.source ?? '',
    status: lead.status,
    lead_score: String(lead.lead_score),
    estimated_value: String(lead.estimated_value),
    assigned_to: lead.assigned_to ?? '',
    notes: lead.notes ?? '',
    next_follow_up_at: lead.next_follow_up_at?.slice(0, 16) ?? '',
  }
}

export function customerToDealDraft(
  customer: Customer,
  defaultStageId: string,
  defaultProbability: number
): DealFormDraft {
  return {
    name: `${customer.company ?? customer.name} — Opportunity`,
    customer_id: customer.id,
    lead_id: '',
    value: String(customer.total_spent > 0 ? customer.total_spent : 0),
    stage_id: defaultStageId,
    probability: String(defaultProbability),
    expected_close_date: '',
    assigned_to: customer.assigned_to ?? '',
    notes: customer.notes ?? '',
  }
}

export function leadToDealDraft(
  lead: Lead,
  defaultStageId: string,
  defaultProbability: number
): DealFormDraft {
  return {
    name: `${lead.company ?? lead.name} — Opportunity`,
    customer_id: lead.converted_customer_id ?? '',
    lead_id: lead.id,
    value: String(lead.estimated_value > 0 ? lead.estimated_value : 0),
    stage_id: defaultStageId,
    probability: String(defaultProbability),
    expected_close_date: '',
    assigned_to: lead.assigned_to ?? '',
    notes: lead.notes ?? '',
  }
}

export function emptyDealDraft(stageId: string, probability: number): DealFormDraft {
  return {
    name: '',
    customer_id: '',
    lead_id: '',
    value: '0',
    stage_id: stageId,
    probability: String(probability),
    expected_close_date: '',
    assigned_to: '',
    notes: '',
  }
}

export function customerPickerLabel(customer: Customer) {
  const parts = [customer.name]
  if (customer.company) parts.push(customer.company)
  if (customer.email) parts.push(customer.email)
  return parts.join(' · ')
}

export function leadPickerLabel(lead: Lead) {
  const parts = [lead.name]
  if (lead.company) parts.push(lead.company)
  if (lead.status) parts.push(lead.status)
  return parts.join(' · ')
}
