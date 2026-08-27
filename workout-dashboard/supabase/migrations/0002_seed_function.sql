-- Seeds a user's standing weekly split + starting macro target the first
-- time they log in. Idempotent (ON CONFLICT DO NOTHING), safe to call on
-- every login — the app calls this once via a server action rather than
-- relying on a one-shot seed.sql, since Supabase doesn't know the auth
-- user's id at migration time.
create or replace function seed_default_plan(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into workout_templates (user_id, day_of_week, workout_type, label)
  values
    (p_user_id, 0, 'Rest', 'Rest day'),
    (p_user_id, 1, 'Push', 'Push (chest/shoulders/triceps)'),
    (p_user_id, 2, 'Solidcore', 'Solidcore'),
    (p_user_id, 3, 'Pull', 'Pull (back/biceps)'),
    (p_user_id, 4, 'Solidcore', 'Solidcore'),
    (p_user_id, 5, 'Legs', 'Legs'),
    (p_user_id, 6, 'Push', 'Push (2nd session)')
  on conflict (user_id, day_of_week) do nothing;

  insert into macro_targets (user_id, effective_date, protein_g, carb_g, fat_g, step_goal)
  values (p_user_id, current_date, 125, 160, 57, 12000)
  on conflict (user_id, effective_date) do nothing;
end;
$$;

grant execute on function seed_default_plan(uuid) to authenticated;
