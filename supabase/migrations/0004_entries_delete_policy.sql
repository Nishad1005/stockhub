-- Entries DELETE policy.
-- 0001 enabled RLS on `entries` but defined only select/insert/update policies,
-- so DELETE matched no policy and was denied for everyone. v0.1 supports
-- deleting a captured entry (deleteCurrentEntry), so grant DELETE to the row
-- owner or a manager/admin — mirroring the existing UPDATE policy's roles.
--
-- Edit-lock is deliberately NOT enforced here: the lock is a client-side UX gate
-- with a per-device manager override (CLAUDE.md §5.3 / §11.4), so it cannot live
-- in RLS. The app gates delete/edit via isEntryLocked() before calling the API.
create policy "Entries delete by manager or owner" on entries for delete
  using (
    current_user_role() in ('manager', 'admin')
    or created_by = auth.uid()
  );
