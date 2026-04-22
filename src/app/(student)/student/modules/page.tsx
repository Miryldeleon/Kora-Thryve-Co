import Link from 'next/link'
import { requireApprovedStudent } from '@/lib/auth/student'
import { TEACHER_MODULES_BUCKET } from '@/lib/modules/config'

type StudentModule = {
  id: string
  folder_id: string | null
  title: string
  description: string | null
  teacher_name: string | null
  created_at: string
  storage_path: string
}

type StudentModuleWithUrl = StudentModule & {
  signedUrl: string | null
}

type ModuleFolder = {
  id: string
  name: string
  created_by: string
  parent_folder_id: string | null
  created_at: string
}

function StudentModuleCard({ module, index }: { module: StudentModuleWithUrl; index: number }) {
  const progress = Math.max(10, 100 - index * 18)
  const statusLabel = progress >= 90 ? 'Completed' : progress >= 35 ? 'In Progress' : 'Not Started'
  const statusClass =
    progress >= 90
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : progress >= 35
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-100 text-slate-700'

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{module.title}</h3>
          <p className="mt-2 text-sm text-slate-600">{module.description?.trim() || 'No description provided.'}</p>
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
              <div className="h-2 rounded-full bg-[#9cae82]" style={{ width: `${Math.min(progress, 100)}%` }} />
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
}

export default async function StudentModulesPage() {
  const { supabase } = await requireApprovedStudent()

  const { data, error } = await supabase
    .from('modules')
    .select('id, folder_id, title, description, teacher_name, created_at, storage_path')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const { data: folderData, error: foldersError } = await supabase
    .from('module_folders')
    .select('id, name, created_by, parent_folder_id, created_at')
    .order('created_at', { ascending: true })

  if (foldersError) throw new Error(foldersError.message)

  const modules = (data ?? []) as StudentModule[]
  const folders = (folderData ?? []) as ModuleFolder[]
  const folderIdSet = new Set(folders.map((folder) => folder.id))

  const modulesWithSignedUrls: StudentModuleWithUrl[] = await Promise.all(
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

  const moduleIndexById = new Map(modulesWithSignedUrls.map((module, index) => [module.id, index] as const))
  const folderModuleCount = new Map<string, number>()
  const ungroupedModules: StudentModuleWithUrl[] = []

  modulesWithSignedUrls.forEach((module) => {
    if (!module.folder_id || !folderIdSet.has(module.folder_id)) {
      ungroupedModules.push(module)
      return
    }
    folderModuleCount.set(module.folder_id, (folderModuleCount.get(module.folder_id) ?? 0) + 1)
  })

  const visibleFolders = folders

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

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Folders</h2>
          <span className="text-xs uppercase tracking-[0.12em] text-slate-500">{visibleFolders.length} folders</span>
        </div>
        {visibleFolders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No folders available yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleFolders.map((folder) => {
              const moduleCount = folderModuleCount.get(folder.id) ?? 0
              return (
                <Link
                  key={folder.id}
                  href={`/student/modules/folders/${folder.id}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="h-24 bg-gradient-to-br from-[#e4ead2] via-[#d8e0bf] to-[#c1cd9d]" />
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Folder</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{folder.name}</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {moduleCount} module{moduleCount === 1 ? '' : 's'}
                    </p>
                    {moduleCount === 0 && (
                      <p className="mt-2 text-sm text-slate-500">No materials in this folder yet.</p>
                    )}
                    <p className="mt-3 text-sm font-medium text-[#7f8c5b] group-hover:underline">Open folder</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Section</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Ungrouped</h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            {ungroupedModules.length} module{ungroupedModules.length === 1 ? '' : 's'}
          </span>
        </div>

        {ungroupedModules.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No ungrouped modules available.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {ungroupedModules.map((module) => (
              <StudentModuleCard key={module.id} module={module} index={moduleIndexById.get(module.id) ?? 0} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
