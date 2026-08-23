import type { SupabaseClient } from '@supabase/supabase-js'
import type { ImportEntity, ImportModule, ImportResult, ImportSchema, WorkspaceImportContext } from '@/lib/import/types'
import { EMPLOYEES_QUERY_ROOT } from '@/lib/hr/employees-data'
import { normalizeRow } from '@/lib/import/validate'

function productStatus(quantity: number, minStock: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (quantity === 0) return 'out_of_stock'
  if (quantity <= minStock) return 'low_stock'
  return 'in_stock'
}

async function executeEmployees(
  supabase: SupabaseClient,
  ctx: WorkspaceImportContext,
  rows: Record<string, string>[]
): Promise<ImportResult> {
  const errors: ImportResult['errors'] = []
  let imported = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    const roleId = ctx.roleNameToId[(row.role_name ?? '').trim().toLowerCase()]

    if (!roleId) {
      errors.push({ row: rowNum, field: 'role_name', message: `Unknown role: ${row.role_name}` })
      continue
    }

    const { error } = await supabase.from('employees').insert({
      workspace_id: ctx.workspaceId,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone || null,
      department: row.department,
      role_id: roleId,
      hire_date: row.hire_date,
      salary: row.salary ? Number(row.salary) : null,
      status: row.status || 'active',
    })

    if (error) {
      errors.push({ row: rowNum, message: error.message })
    } else {
      imported++
    }
  }

  return { success: imported > 0 && errors.length === 0, imported, failed: errors.length, errors }
}

async function executeProducts(
  supabase: SupabaseClient,
  ctx: WorkspaceImportContext,
  rows: Record<string, string>[]
): Promise<ImportResult> {
  const errors: ImportResult['errors'] = []
  let imported = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    const quantity = Number(row.quantity)
    const minStock = row.min_stock_level ? Number(row.min_stock_level) : 10
    const status = row.status || productStatus(quantity, minStock)

    const { error } = await supabase.from('products').insert({
      workspace_id: ctx.workspaceId,
      name: row.name,
      sku: row.sku,
      category: row.category,
      quantity,
      unit_price: Number(row.unit_price),
      cost_price: Number(row.cost_price),
      min_stock_level: minStock,
      status,
    })

    if (error) {
      errors.push({ row: rowNum, message: error.message })
    } else {
      imported++
    }
  }

  return { success: imported > 0 && errors.length === 0, imported, failed: errors.length, errors }
}

async function executeTransactions(
  supabase: SupabaseClient,
  ctx: WorkspaceImportContext,
  rows: Record<string, string>[]
): Promise<ImportResult> {
  const errors: ImportResult['errors'] = []
  let imported = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    const { error } = await supabase.from('transactions').insert({
      workspace_id: ctx.workspaceId,
      type: row.type,
      category: row.category,
      amount: Number(row.amount),
      description: row.description,
      date: row.date,
      reference: row.reference || null,
    })

    if (error) {
      errors.push({ row: rowNum, message: error.message })
    } else {
      imported++
    }
  }

  return { success: imported > 0 && errors.length === 0, imported, failed: errors.length, errors }
}

async function executeSuppliers(
  supabase: SupabaseClient,
  ctx: WorkspaceImportContext,
  rows: Record<string, string>[]
): Promise<ImportResult> {
  const errors: ImportResult['errors'] = []
  let imported = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    const { error } = await supabase.from('suppliers').insert({
      workspace_id: ctx.workspaceId,
      name: row.name,
      contact_person: row.contact_person,
      email: row.email,
      phone: row.phone,
      address: row.address || null,
      status: row.status || 'active',
    })

    if (error) {
      errors.push({ row: rowNum, message: error.message })
    } else {
      imported++
    }
  }

  return { success: imported > 0 && errors.length === 0, imported, failed: errors.length, errors }
}

async function executePurchaseOrders(
  supabase: SupabaseClient,
  ctx: WorkspaceImportContext,
  rows: Record<string, string>[]
): Promise<ImportResult> {
  const errors: ImportResult['errors'] = []
  let imported = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    const supplierId = ctx.supplierNameToId[(row.supplier_name ?? '').trim().toLowerCase()]

    if (!supplierId) {
      errors.push({ row: rowNum, field: 'supplier_name', message: `Unknown supplier: ${row.supplier_name}` })
      continue
    }

    const { error } = await supabase.from('purchase_orders').insert({
      workspace_id: ctx.workspaceId,
      supplier_id: supplierId,
      order_number: row.order_number,
      total_amount: Number(row.total_amount),
      order_date: row.order_date,
      expected_delivery: row.expected_delivery || null,
      status: row.status || 'pending',
      items: [],
    })

    if (error) {
      errors.push({ row: rowNum, message: error.message })
    } else {
      imported++
    }
  }

  return { success: imported > 0 && errors.length === 0, imported, failed: errors.length, errors }
}

async function executeCustomers(
  supabase: SupabaseClient,
  ctx: WorkspaceImportContext,
  rows: Record<string, string>[]
): Promise<ImportResult> {
  const errors: ImportResult['errors'] = []
  let imported = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    let notes = row.notes || ''
    if (row.service_type) {
      notes = notes ? `${notes} | Service: ${row.service_type}` : `Service: ${row.service_type}`
    }

    const { error } = await supabase.from('customers').insert({
      workspace_id: ctx.workspaceId,
      name: row.name,
      email: row.email,
      phone: row.phone || null,
      company: row.company || null,
      status: row.status || 'active',
      total_spent: row.total_spent ? Number(row.total_spent) : 0,
      notes: notes || null,
    })

    if (error) {
      errors.push({ row: rowNum, message: error.message })
    } else {
      imported++
    }
  }

  return { success: imported > 0 && errors.length === 0, imported, failed: errors.length, errors }
}

export async function executeImport(
  supabase: SupabaseClient,
  module: ImportModule,
  entity: ImportEntity,
  ctx: WorkspaceImportContext,
  schema: ImportSchema,
  rows: Record<string, string>[]
): Promise<ImportResult> {
  const normalizedRows = rows.map((row) => normalizeRow(row, schema))

  switch (entity) {
    case 'employees':
      return executeEmployees(supabase, ctx, normalizedRows)
    case 'products':
      return executeProducts(supabase, ctx, normalizedRows)
    case 'transactions':
      return executeTransactions(supabase, ctx, normalizedRows)
    case 'suppliers':
      return executeSuppliers(supabase, ctx, normalizedRows)
    case 'purchase_orders':
      return executePurchaseOrders(supabase, ctx, normalizedRows)
    case 'customers':
      return executeCustomers(supabase, ctx, normalizedRows)
    default:
      return { success: false, imported: 0, failed: rows.length, errors: [{ row: 0, message: 'Unsupported entity.' }] }
  }
}

export function queryKeysForEntity(entity: ImportEntity): string[] {
  switch (entity) {
    case 'employees':
      return [EMPLOYEES_QUERY_ROOT]
    case 'products':
      return ['products']
    case 'transactions':
      return ['transactions']
    case 'suppliers':
      return ['suppliers']
    case 'purchase_orders':
      return ['purchase-orders']
    case 'customers':
      return ['customers']
    default:
      return []
  }
}
