'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useWorkspaceStore } from '@/store/workspace'
import { FINANCE_QUERY_KEYS } from '@/lib/finance/constants'
import type { FinanceExpense, FinanceInvoice, FinancePayment, FinanceRefund, FinanceReconciliation, FinanceVendor } from '@/lib/finance/types'
import type { Customer, Transaction } from '@/lib/types'

export function useFinanceInvoices() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.invoices,
    queryFn: async () => {
      const { data } = await supabase
        .from('finance_invoices')
        .select('*, customers(name)')
        .eq('workspace_id', workspace!.id)
        .order('issue_date', { ascending: false })
      return (data ?? []) as (FinanceInvoice & { customers?: { name: string } | null })[]
    },
    enabled: !!workspace?.id,
  })
}

export function useFinancePayments() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.payments,
    queryFn: async () => {
      const { data } = await supabase
        .from('finance_payments')
        .select('*, customers(name)')
        .eq('workspace_id', workspace!.id)
        .order('created_at', { ascending: false })
      return (data ?? []) as (FinancePayment & { customers?: { name: string } | null })[]
    },
    enabled: !!workspace?.id,
  })
}

export function useFinanceExpenses() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.expenses,
    queryFn: async () => {
      const { data } = await supabase
        .from('finance_expenses')
        .select('*, finance_vendors(name)')
        .eq('workspace_id', workspace!.id)
        .order('expense_date', { ascending: false })
      return (data ?? []) as (FinanceExpense & { finance_vendors?: { name: string } | null })[]
    },
    enabled: !!workspace?.id,
  })
}

export function useFinanceRefunds() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.refunds,
    queryFn: async () => {
      const { data } = await supabase
        .from('finance_refunds')
        .select('*, finance_payments(provider, provider_payment_id, amount, currency)')
        .eq('workspace_id', workspace!.id)
        .order('created_at', { ascending: false })
      return data ?? []
    },
    enabled: !!workspace?.id,
  })
}

export function useFinanceReconciliations() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.reconciliations,
    queryFn: async () => {
      const { data } = await supabase
        .from('finance_reconciliations')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .order('period_end', { ascending: false })
      return (data ?? []) as FinanceReconciliation[]
    },
    enabled: !!workspace?.id,
  })
}

export function useFinanceVendors() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.vendors,
    queryFn: async () => {
      const { data } = await supabase.from('finance_vendors').select('*').eq('workspace_id', workspace!.id).order('name')
      return (data ?? []) as FinanceVendor[]
    },
    enabled: !!workspace?.id,
  })
}

export function useFinanceCustomers() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.customers,
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name, email').eq('workspace_id', workspace!.id).order('name')
      return (data ?? []) as Pick<Customer, 'id' | 'name' | 'email'>[]
    },
    enabled: !!workspace?.id,
  })
}

export function useFinanceTransactions() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.transactions,
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('workspace_id', workspace!.id)
        .order('date', { ascending: false })
      return (data ?? []) as Transaction[]
    },
    enabled: !!workspace?.id,
  })
}

export function useFinanceReportData() {
  const { workspace } = useWorkspaceStore()
  const supabase = createClient()
  return useQuery({
    queryKey: FINANCE_QUERY_KEYS.reports,
    queryFn: async () => {
      const wsId = workspace!.id
      const [tx, invoices, expenses, payments, refunds] = await Promise.all([
        supabase.from('transactions').select('*').eq('workspace_id', wsId),
        supabase.from('finance_invoices').select('*').eq('workspace_id', wsId),
        supabase.from('finance_expenses').select('*').eq('workspace_id', wsId),
        supabase.from('finance_payments').select('*').eq('workspace_id', wsId),
        supabase.from('finance_refunds').select('*').eq('workspace_id', wsId),
      ])
      return {
        transactions: (tx.data ?? []) as Transaction[],
        invoices: (invoices.data ?? []) as FinanceInvoice[],
        expenses: (expenses.data ?? []) as FinanceExpense[],
        payments: (payments.data ?? []) as FinancePayment[],
        refunds: (refunds.data ?? []) as FinanceRefund[],
      }
    },
    enabled: !!workspace?.id,
  })
}
