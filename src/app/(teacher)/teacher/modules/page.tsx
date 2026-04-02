import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { TEACHER_MODULES_BUCKET } from '@/lib/modules/config'
import { deleteModule, updateModuleMetadata, uploadModule } from './actions'

type TeacherModulesPageProps = {
  searchParams: Promise<{
    success?: string
    error?: string
    q?: string
  }>
}

type TeacherModule = {
  id: string
  title: string
  description: string | null
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  created_at: string
}

function formatFileSize(bytes: number) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

export default async function TeacherModulesPage({
  searchParams,
}: TeacherModulesPageProps) {
  const { supabase, user } = await requireApprovedTeacher()
  const { success, error, q } = await searchParams

  const { data, error: modulesError } = await supabase
    .from('modules')
    .select('id, title, description, file_name, file_type, file_size, storage_path, created_at')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false })

  if (modulesError) {
    throw new Error(modulesError.message)
  }

  const modules = (data ?? []) as TeacherModule[]

  const modulesWithLinks = await Promise.all(
    modules.map(async (module) => {
      const { data: signedUrlData } = await supabase.storage
        .from(TEACHER_MODULES_BUCKET)
        .createSignedUrl(module.storage_path, 60 * 10)

      return {
        ...module,
        signedUrl: signedUrlData?.signedUrl ?? null,
      }
    })
  )
  const query = (q ?? '').trim().toLowerCase()
  const visibleModules = modulesWithLinks.filter((module) => {
    if (!query) return true
    const title = module.title.toLowerCase()
    const description = (module.description ?? '').toLowerCase()
    const filename = module.file_name.toLowerCase()
    return title.includes(query) || description.includes(query) || filename.includes(query)
  })

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Kora Thryve</p>
        <h1 className="mt-2 text-3xl font-semibold">Teacher Modules</h1>
        <p className="mt-2 text-sm text-slate-600">Upload and manage your PDF learning modules.</p>
      </div>

      {success && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <section className="mt-6 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form className="w-full max-w-md">
          <label className="text-xs uppercase tracking-[0.14em] text-slate-500">Search modules</label>
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by title or file..."
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#cfb083]"
          />
        </form>
        <a href="#upload-module" className="rounded-xl bg-[#cfb083] px-5 py-3 text-sm font-semibold text-white">
          Upload Module
        </a>
      </section>

      <section id="upload-module" className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Upload New Module</h2>
        <form action={uploadModule} className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            name="title"
            type="text"
            placeholder="Module title"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            required
          />
          <input
            name="file"
            type="file"
            accept="application/pdf,.pdf"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none transition focus:border-slate-400"
            required
          />
          <textarea
            name="description"
            placeholder="Module description"
            className="md:col-span-2 min-h-24 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
          />
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-[#cfb083] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#c2a372]"
            >
              Upload PDF module
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleModules.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            {modulesWithLinks.length === 0 ? 'No modules uploaded yet.' : 'No modules match your search.'}
          </div>
        )}

        {visibleModules.map((module) => (
          <article key={module.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex rounded-full border border-[#d9ccb9] bg-[#f7f3ed] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#8b7758]">
                PDF Module
              </span>
              <div className="flex gap-2">
                {module.signedUrl && (
                  <a
                    className="rounded-lg border border-[#d9ccb9] bg-white px-3 py-1.5 text-xs font-medium text-[#8b7758]"
                    href={module.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                )}
                <form action={deleteModule}>
                  <input type="hidden" name="module_id" value={module.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700"
                    aria-label={`Delete ${module.title}`}
                    title="Delete"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>

            <h3 className="mt-4 text-lg font-semibold text-slate-900">{module.title}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {module.file_name} | {formatFileSize(module.file_size)}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
              {new Date(module.created_at).toLocaleDateString()}
            </p>

            <form action={updateModuleMetadata} className="mt-4 grid gap-2">
              <input type="hidden" name="module_id" value={module.id} />
              <input
                name="title"
                defaultValue={module.title}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                required
              />
              <input
                name="description"
                defaultValue={module.description ?? ''}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="rounded-xl bg-[#9cae82] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8fa173]"
                >
                  Edit Details
                </button>
              </div>
            </form>
          </article>
        ))}
      </section>
    </div>
  )
}
