import { requireAdminAccess } from '@/lib/auth/admin'
import { TEACHER_MODULES_BUCKET } from '@/lib/modules/config'
import { adminSignOut, deleteModuleAsAdmin, deleteModuleFolderAsAdmin } from '../actions'

type AdminModulesPageProps = {
  searchParams: Promise<{
    success?: string
    error?: string
  }>
}

type ModuleFolder = {
  id: string
  name: string
  created_by: string
  parent_folder_id: string | null
  created_at: string
}

type AdminModule = {
  id: string
  teacher_id: string
  teacher_name: string | null
  folder_id: string | null
  title: string
  description: string | null
  file_name: string
  file_size: number
  storage_path: string
  created_at: string
}

type AdminModuleWithUrl = AdminModule & {
  signedUrl: string | null
}

function formatFileSize(bytes: number) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

export default async function AdminModulesPage({ searchParams }: AdminModulesPageProps) {
  const { supabase } = await requireAdminAccess()
  const { success, error } = await searchParams

  const { data: folderData, error: folderError } = await supabase
    .from('module_folders')
    .select('id, name, created_by, parent_folder_id, created_at')
    .order('created_at', { ascending: true })

  if (folderError) {
    throw new Error(folderError.message)
  }

  const { data: moduleData, error: moduleError } = await supabase
    .from('modules')
    .select(
      'id, teacher_id, teacher_name, folder_id, title, description, file_name, file_size, storage_path, created_at'
    )
    .order('created_at', { ascending: false })

  if (moduleError) {
    throw new Error(moduleError.message)
  }

  const folders = (folderData ?? []) as ModuleFolder[]
  const modules = (moduleData ?? []) as AdminModule[]
  const folderIdSet = new Set(folders.map((folder) => folder.id))

  const modulesWithLinks: AdminModuleWithUrl[] = await Promise.all(
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

  const folderModuleCount = new Map<string, number>()
  const ungroupedModules: AdminModuleWithUrl[] = []

  modulesWithLinks.forEach((module) => {
    if (!module.folder_id || !folderIdSet.has(module.folder_id)) {
      ungroupedModules.push(module)
      return
    }
    folderModuleCount.set(module.folder_id, (folderModuleCount.get(module.folder_id) ?? 0) + 1)
  })

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Kora Thryve</p>
            <h1 className="mt-2 text-3xl font-semibold">Admin Modules</h1>
            <p className="mt-2 text-sm text-slate-600">Manage shared library folders and modules.</p>
          </div>
          <div className="flex gap-2">
            <a
              href="/admin/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              Dashboard
            </a>
            <a
              href="/admin/approvals"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              Approvals
            </a>
            <a
              href="/admin/group-classes"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              Group Classes
            </a>
            <form action={adminSignOut}>
              <button
                type="submit"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {success && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Folders</h2>
            <span className="text-xs uppercase tracking-[0.12em] text-slate-500">{folders.length} folders</span>
          </div>
          {folders.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              No folders created yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {folders.map((folder) => {
                const moduleCount = folderModuleCount.get(folder.id) ?? 0
                return (
                  <article key={folder.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-20 bg-gradient-to-br from-[#e4e7ef] via-[#d5dce8] to-[#bcc8dc]" />
                    <div className="p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Folder</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">{folder.name}</h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.1em] text-slate-500">{moduleCount} modules</p>
                      <form action={deleteModuleFolderAsAdmin} className="mt-4">
                        <input type="hidden" name="folder_id" value={folder.id} />
                        <input type="hidden" name="return_to" value="/admin/modules" />
                        <button
                          type="submit"
                          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                        >
                          Delete Folder
                        </button>
                      </form>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900">Ungrouped Modules</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              {ungroupedModules.length} module{ungroupedModules.length === 1 ? '' : 's'}
            </span>
          </div>

          {ungroupedModules.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No ungrouped modules.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ungroupedModules.map((module) => (
                <article key={module.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    Uploaded by {module.teacher_name || module.teacher_id}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{module.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{module.file_name} | {formatFileSize(module.file_size)}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-slate-500">
                    {new Date(module.created_at).toLocaleDateString()}
                  </p>
                  <div className="mt-4 flex gap-2">
                    {module.signedUrl && (
                      <a
                        href={module.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        Open
                      </a>
                    )}
                    <form action={deleteModuleAsAdmin}>
                      <input type="hidden" name="module_id" value={module.id} />
                      <input type="hidden" name="return_to" value="/admin/modules" />
                      <button
                        type="submit"
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900">All Modules</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              {modulesWithLinks.length} module{modulesWithLinks.length === 1 ? '' : 's'}
            </span>
          </div>

          {modulesWithLinks.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No modules available.</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {modulesWithLinks.map((module) => (
                <article key={module.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    Uploaded by {module.teacher_name || module.teacher_id}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    {module.folder_id ? `Folder: ${folders.find((f) => f.id === module.folder_id)?.name || 'Unknown'}` : 'Ungrouped'}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{module.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{module.file_name} | {formatFileSize(module.file_size)}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-slate-500">
                    {new Date(module.created_at).toLocaleDateString()}
                  </p>
                  <div className="mt-4 flex gap-2">
                    {module.signedUrl && (
                      <a
                        href={module.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        Open
                      </a>
                    )}
                    <form action={deleteModuleAsAdmin}>
                      <input type="hidden" name="module_id" value={module.id} />
                      <input type="hidden" name="return_to" value="/admin/modules" />
                      <button
                        type="submit"
                        className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
