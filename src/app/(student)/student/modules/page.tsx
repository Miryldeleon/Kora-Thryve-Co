import { requireApprovedStudent } from '@/lib/auth/student'
import { TEACHER_MODULES_BUCKET } from '@/lib/modules/config'

type StudentModule = {
  id: string
  title: string
  description: string | null
  teacher_name: string | null
  created_at: string
  storage_path: string
}

export default async function StudentModulesPage() {
  const { supabase } = await requireApprovedStudent()

  const { data, error } = await supabase
    .from('modules')
    .select('id, title, description, teacher_name, created_at, storage_path')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const modules = (data ?? []) as StudentModule[]

  const modulesWithSignedUrls = await Promise.all(
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

  const inProgressCount = modulesWithSignedUrls.length > 1 ? Math.min(2, modulesWithSignedUrls.length - 1) : 0
  const completedCount = modulesWithSignedUrls.length > 2 ? 1 : 0

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Kora Thryve</p>
        <h1 className="mt-2 text-3xl font-semibold">My Modules</h1>
        <p className="mt-2 text-sm text-slate-600">Browse learning modules shared by approved teachers.</p>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Total Modules</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{modulesWithSignedUrls.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">In Progress</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{inProgressCount}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{completedCount}</p>
        </article>
      </section>

      <section className="mt-6 grid gap-4">
        {modulesWithSignedUrls.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No modules available yet.
          </div>
        )}

        {modulesWithSignedUrls.map((module, index) => {
          const progress = Math.max(10, 100 - index * 18)
          const statusLabel = progress >= 90 ? 'Completed' : progress >= 35 ? 'In Progress' : 'Not Started'
          const statusClass =
            progress >= 90
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : progress >= 35
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-slate-100 text-slate-700'

          return (
          <article key={module.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{module.title}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {module.description?.trim() || 'No description provided.'}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                  Teacher: {module.teacher_name || 'Not specified'}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                  Uploaded: {new Date(module.created_at).toLocaleDateString()}
                </p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-[#9cae82]"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <span
                    className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${statusClass}`}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
              {module.signedUrl && (
                <div className="flex gap-2 self-end">
                  <a
                    href={module.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-[#d9ccb9] bg-white px-4 py-2 text-sm text-[#8b7758] transition hover:bg-[#f7f3ed]"
                  >
                    Open PDF
                  </a>
                  <a
                    href={module.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-[#cfb083] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c2a372]"
                  >
                    Preview
                  </a>
                </div>
              )}
            </div>
          </article>
          )
        })}
      </section>
    </div>
  )
}
