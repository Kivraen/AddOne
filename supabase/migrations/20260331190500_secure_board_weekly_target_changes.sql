begin;

alter table public.board_weekly_target_changes enable row level security;

revoke all on table public.board_weekly_target_changes from anon;
revoke all on table public.board_weekly_target_changes from authenticated;

commit;
