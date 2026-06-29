-- Aksure attachments — Storage RLS policies for the `aksure-attachments` bucket.
--
-- The bucket itself must be created MANUALLY in Supabase Storage before this runs.
-- Supabase doesn't let migrations create buckets safely — file-size limit and the
-- public/private flag live in dashboard config, and SQL-created buckets drift. This
-- migration installs ONLY the four policies on storage.objects, scoped to
-- bucket_id = 'aksure-attachments'.
--
-- These policies were already applied by hand in production on 2026-06-28; this file
-- captures them so fresh environments (staging, future customers) reproduce them
-- without manual SQL. drop-then-create makes re-applying safe where they already exist.
--
-- (storage.objects already has RLS enabled by Supabase — we only add policies.)

-- Insert: any non-pending authenticated user may upload into the bucket.
drop policy if exists "aksure_attachments_insert" on storage.objects;
create policy "aksure_attachments_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'aksure-attachments'
    and public.current_user_role()::text <> 'pending'
  );

-- Select: any authenticated user may read objects in the bucket.
drop policy if exists "aksure_attachments_select" on storage.objects;
create policy "aksure_attachments_select" on storage.objects for select to authenticated
  using (bucket_id = 'aksure-attachments');

-- Update: the uploader (owner) or a manager/admin.
drop policy if exists "aksure_attachments_update" on storage.objects;
create policy "aksure_attachments_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'aksure-attachments'
    and (owner = auth.uid() or public.current_user_role() in ('manager','admin'))
  );

-- Delete: same as update — the uploader (owner) or a manager/admin.
drop policy if exists "aksure_attachments_delete" on storage.objects;
create policy "aksure_attachments_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'aksure-attachments'
    and (owner = auth.uid() or public.current_user_role() in ('manager','admin'))
  );
