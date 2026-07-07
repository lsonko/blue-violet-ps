-- Track the first month where the automatic Solo 401(k) setting applies.
-- Existing users start from the current month so prior YTD months are not filled
-- or rewritten by the Settings value.

alter table public.settings
  add column if not exists solo401k_effective_from date
  not null default date_trunc('month', current_date)::date;
