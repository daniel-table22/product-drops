-- ============================================================
-- Auto-advance drop state based on order/pickup window timestamps.
-- Uses pg_cron to run every minute (requires Supabase Pro plan).
-- ============================================================

-- Enable pg_cron
create extension if not exists pg_cron with schema extensions;

-- Function: advance_drop_states()
-- Advances any drop whose stored state is behind its window timestamps.
-- Never touches drops in 'archived' state.
create or replace function public.advance_drop_states()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.drops
  set state = case
    when now() >= pickup_window_ends_at   then 'pickup_closed'::public.drop_state
    when now() >= pickup_window_starts_at then 'pickup_open'::public.drop_state
    when now() >= order_window_ends_at    then 'orders_closed'::public.drop_state
    when now() >= order_window_starts_at  then 'orders_open'::public.drop_state
    else                                       'scheduled'::public.drop_state
  end
  where state <> 'archived'::public.drop_state
    and (
         (state = 'scheduled'::public.drop_state      and now() >= order_window_starts_at)
      or (state = 'orders_open'::public.drop_state    and now() >= order_window_ends_at)
      or (state = 'orders_closed'::public.drop_state  and now() >= pickup_window_starts_at)
      or (state = 'pickup_open'::public.drop_state    and now() >= pickup_window_ends_at)
    );
end;
$$;

-- Schedule: every minute
select cron.schedule(
  'advance-drop-states',
  '* * * * *',
  $cron$ select public.advance_drop_states(); $cron$
);
