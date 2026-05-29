-- ─────────────────────────────────────────────
-- Profiles: allow users to insert own row
-- (handles edge case where trigger hasn't fired yet)
-- ─────────────────────────────────────────────
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- ─────────────────────────────────────────────
-- Storage: activity photos bucket
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('activity-photos', 'activity-photos', true)
  on conflict do nothing;

create policy "Anyone can view activity photos" on storage.objects
  for select using (bucket_id = 'activity-photos');

create policy "Users can upload own activity photos" on storage.objects
  for insert with check (
    bucket_id = 'activity-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own activity photos" on storage.objects
  for delete using (
    bucket_id = 'activity-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─────────────────────────────────────────────
-- Activity equipment requirements (seed)
-- Activities with no entry here require no equipment
-- ─────────────────────────────────────────────
insert into activity_equipment (activity_id, equipment_id)
select a.id, e.id
from activities a, equipment e
where
  (a.name = 'Cold Plunge'    and e.name = 'Cold Plunge / Ice Bath')
  or (a.name = 'Sauna Session'  and e.name = 'Sauna')
  or (a.name = '100 Pull-ups'   and e.name = 'Pull-up Bar');
