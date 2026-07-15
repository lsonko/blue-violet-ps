-- Repair Solo 401(k) attribution.
--
-- Manually entered deductions categorized "Retirement — Solo 401(k)" were
-- saved with k401 = false (the app only set the flag on auto-generated
-- monthly rows), so they were treated as ordinary business deductions:
-- excluded from the 401(k) totals and wrongly reducing the SE-tax base.
-- The app now derives the flag from the category on every save; this
-- backfills rows created before that fix. `edited = true` keeps the monthly
-- auto-sync from overwriting their amounts.

update public.deductions
set k401 = true, edited = true
where category = 'Retirement — Solo 401(k)'
  and k401 = false;
