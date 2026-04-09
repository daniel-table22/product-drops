-- Create partner-assets storage bucket (public)
insert into storage.buckets (id, name, public)
values ('partner-assets', 'partner-assets', true)
on conflict (id) do update set public = true;

-- Allow authenticated users to upload into their own folder
create policy "Authenticated upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'partner-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read
create policy "Public read"
on storage.objects for select
to public
using (bucket_id = 'partner-assets');

-- Allow authenticated users to update their own files
create policy "Authenticated update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'partner-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
create policy "Authenticated delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'partner-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);
