update storage.buckets
set
  file_size_limit = 104857600,
  allowed_mime_types = array['application/pdf']
where id = 'teacher-modules';
