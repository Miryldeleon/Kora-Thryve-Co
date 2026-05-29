import Link from 'next/link'
import { requireApprovedStudent } from '@/lib/auth/student'
import { createModuleSignedUrls } from '@/lib/data/module-queries'
import { StudentModuleCard } from '@/components/modules/module-library-cards'

type StudentModule = {
  id: string
  folder_id: string | null
  title: string
  teacher_name: string | null
  file_name: string | null
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

export default async function StudentModulesPage() {
  const { supabase } = await requireApprovedStudent()

  const { data, error } = await supabase
    .from('modules')
    .select('id, folder_id, title, teacher_name, file_name, created_at, storage_path')
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

  const modulesWithSignedUrls = (await createModuleSignedUrls(
    supabase,
    modules
  )) as StudentModuleWithUrl[]

  const inProgressCount = modulesWithSignedUrls.length > 1 ? Math.min(2, modulesWithSignedUrls.length - 1) : 0
  const completedCount = modulesWithSignedUrls.length > 2 ? 1 : 0

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
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ungroupedModules.map((module) => (
              <StudentModuleCard key={module.id} module={module} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
