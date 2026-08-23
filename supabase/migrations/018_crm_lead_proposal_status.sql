-- Rename lead lifecycle stage: opportunity → proposal (New, Contacted, Qualified, Proposal, Won, Lost)

update public.leads set status = 'proposal' where status = 'opportunity';

alter table public.leads drop constraint if exists leads_status_check;

alter table public.leads
  add constraint leads_status_check
  check (status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost'));
