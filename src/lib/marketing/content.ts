import {
  Boxes,
  ContactRound,
  LayoutDashboard,
  Truck,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'

export const MODULE_ORDER = [
  'dashboard',
  'finance',
  'crm',
  'hr',
  'inventory',
  'supply_chain',
] as const

export type MarketingModuleId = (typeof MODULE_ORDER)[number]

export type MarketingModule = {
  id: MarketingModuleId
  label: string
  icon: LucideIcon
  tagline: string
  summary: string
  capabilities: string[]
  preview: {
    headline: string
    metrics: { label: string; value: string; note: string }[]
    footnote: string
  }
}

export const MARKETING_MODULES: MarketingModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    tagline: 'Executive view',
    summary: 'Configurable KPIs filtered by time period and the modules your workspace actually runs.',
    capabilities: ['Module-aware metrics', 'Period comparisons', 'On-demand AI insights'],
    preview: {
      headline: 'Performance at a glance',
      metrics: [
        { label: 'Revenue MTD', value: '$284K', note: 'vs prior month' },
        { label: 'Open POs', value: '18', note: '3 awaiting receipt' },
      ],
      footnote: 'Metrics respect enabled modules and reporting period',
    },
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: WalletCards,
    tagline: 'Ledger & payables',
    summary: 'Receivables, expenses, invoices, cash flow, and payment integrations — with procurement payables tied to purchase orders.',
    capabilities: ['Expenses & payables', 'Invoices & receivables', 'Razorpay / Stripe sync'],
    preview: {
      headline: 'Cash position & obligations',
      metrics: [
        { label: 'Payables', value: '$42K', note: '2 linked to POs' },
        { label: 'Net margin', value: '32%', note: 'Month to date' },
      ],
      footnote: 'Purchase order approval creates tracked payables',
    },
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: ContactRound,
    tagline: 'Pipeline & accounts',
    summary: 'Customers, leads, deals, and activities — with optional GoHighLevel sync for teams that run outbound.',
    capabilities: ['Lead & deal pipeline', 'Customer profiles', 'Activity history'],
    preview: {
      headline: 'Revenue relationships',
      metrics: [
        { label: 'Open deals', value: '12', note: '$890K pipeline' },
        { label: 'Accounts', value: '156', note: '4 follow-ups today' },
      ],
      footnote: 'Shared workspace permissions across CRM roles',
    },
  },
  {
    id: 'hr',
    label: 'Human Resources',
    icon: UsersRound,
    tagline: 'Workforce operations',
    summary: 'Employee records, departments, attendance, leave, lifecycle stages, and role-based access — in one HR core.',
    capabilities: ['Org structure', 'Attendance & leave', 'Roles & invitations'],
    preview: {
      headline: 'People & access',
      metrics: [
        { label: 'Active staff', value: '47', note: '6 departments' },
        { label: 'Leave pending', value: '3', note: 'Marked today' },
      ],
      footnote: 'HR stats roll into dashboard when module is enabled',
    },
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Boxes,
    tagline: 'Stock control',
    summary: 'Product catalog, stock movements, adjustments, low-stock alerts, valuation, and movement history.',
    capabilities: ['Stock in / out / adjust', 'Reorder levels', 'Valuation reports'],
    preview: {
      headline: 'Stock on hand',
      metrics: [
        { label: 'Stock value', value: '$1.2M', note: 'Cost basis' },
        { label: 'Low stock', value: '8', note: 'SKUs below reorder' },
      ],
      footnote: 'Goods receipt from POs updates quantity automatically',
    },
  },
  {
    id: 'supply_chain',
    label: 'Supply Chain',
    icon: Truck,
    tagline: 'Procurement',
    summary: 'Supplier profiles, purchase orders with line items, partial receiving, returns, and supplier performance tracking.',
    capabilities: ['PO lifecycle', 'Goods receiving', 'Finance linkage'],
    preview: {
      headline: 'Procurement pipeline',
      metrics: [
        { label: 'Open orders', value: '7', note: '2 partial delivery' },
        { label: 'Suppliers', value: '24', note: 'Active vendors' },
      ],
      footnote: 'Approve PO → payable · Receive → inventory update',
    },
  },
]

export const MARKETING_MODULE_MAP = Object.fromEntries(
  MARKETING_MODULES.map((m) => [m.id, m])
) as Record<MarketingModuleId, MarketingModule>

export const PLATFORM_PILLARS = [
  {
    title: 'One workspace, clear boundaries',
    body: 'Each organization runs in an isolated workspace. Switch between businesses without mixing data.',
  },
  {
    title: 'Permissions that match roles',
    body: 'Module-level access with view, create, edit, approve, and import controls — not all-or-nothing admin.',
  },
  {
    title: 'Operations that connect',
    body: 'Purchase orders flow into payables and inventory. HR, finance, and CRM share the same permission model.',
  },
  {
    title: 'Setup with structure',
    body: 'Onboarding captures industry, departments, modules, and KPIs — then you import or load demo data to start.',
  },
] as const

export const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Configure the workspace',
    body: 'Select modules, define departments, assign roles, and set the metrics you track from day one.',
  },
  {
    step: '02',
    title: 'Run daily operations',
    body: 'Finance, CRM, HR, inventory, and procurement workflows share filters, imports, and audit-friendly history.',
  },
  {
    step: '03',
    title: 'Review and decide',
    body: 'Dashboard reporting by period, module reports, and optional AI analysis grounded in your live data.',
  },
] as const

export const TRUST_LABELS = ['Finance', 'CRM', 'HR', 'Inventory', 'Supply Chain'] as const
