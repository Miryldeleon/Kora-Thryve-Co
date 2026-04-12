import Link from 'next/link'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { TEACHER_MODULES_BUCKET } from '@/lib/modules/config'
import { createModuleFolder, moveModuleToFolder, updateModuleMetadata, uploadModule } from './actions'

type TeacherModulesPageProps = {
  searchParams: Promise<{
    success?: string
    error?: string
    q?: string
  }>
}

type TeacherModule = {
  id: string
  teacher_id: string
  teacher_name: string | null
  folder_id: string | null
  title: string
  description: string | null
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  created_at: string
}

type TeacherModuleWithUrl = TeacherModule & {
  signedUrl: string | null
}

type ModuleFolder = {
  id: string
  name: string
  created_by: string
  parent_folder_id: string | null
  created_at: string
}

function formatFileSize(bytes: number) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

function TeacherUngroupedModuleCard({
  module,
  folders,
  currentTeacherId,
}: {
  module: TeacherModuleWithUrl
  folders: ModuleFolder[]
  currentTeacherId: string
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {module.teacher_name && (
        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Uploaded by {module.teacher_name}</p>
      )}
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
        </div>
      </div>

      <h3 className="mt-4 text-lg font-semibold text-slate-900">{module.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{module.file_name} | {formatFileSize(module.file_size)}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">
        {new Date(module.created_at).toLocaleDateString()}
      </p>

      <form action={moveModuleToFolder} className="mt-4 grid gap-2">
        <input type="hidden" name="module_id" value={module.id} />
        <label className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Move to folder</label>
        <div className="flex gap-2">
          <select
            name="folder_id"
            defaultValue={module.folder_id ?? ''}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
          >
            <option value="">Ungrouped</option>
            {folders.map((folderOption) => (
              <option key={folderOption.id} value={folderOption.id}>
                {folderOption.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            Move
          </button>
        </div>
      </form>

      {module.teacher_id === currentTeacherId && (
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
      )}
    </article>
  )
}

export default async function TeacherModulesPage({ searchParams }: TeacherModulesPageProps) {
  const { supabase, user } = await requireApprovedTeacher()
  const { success, error, q } = await searchParams

  const { data, error: modulesError } = await supabase
    .from('modules')
    .select(
      'id, teacher_id, teacher_name, folder_id, title, description, file_name, file_type, file_size, storage_path, created_at'
    )
    .order('created_at', { ascending: false })

  if (modulesError) throw new Error(modulesError.message)

  const { data: folderData, error: foldersError } = await supabase
    .from('module_folders')
    .select('id, name, created_by, parent_folder_id, created_at')
    .order('created_at', { ascending: true })

  if (foldersError) throw new Error(foldersError.message)

  const modules = (data ?? []) as TeacherModule[]
  const folders = (folderData ?? []) as ModuleFolder[]
  const folderIdSet = new Set(folders.map((folder) => folder.id))

  const modulesWithLinks: TeacherModuleWithUrl[] = await Promise.all(
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

  const folderModuleCount = new Map<string, number>()
  const ungroupedModules: TeacherModuleWithUrl[] = []

  visibleModules.forEach((module) => {
    if (!module.folder_id || !folderIdSet.has(module.folder_id)) {
      ungroupedModules.push(module)
      return
    }
    folderModuleCount.set(module.folder_id, (folderModuleCount.get(module.folder_id) ?? 0) + 1)
  })

  const visibleFolders = folders.filter((folder) => {
    const moduleCount = folderModuleCount.get(folder.id) ?? 0
    if (!query) return true
    return folder.name.toLowerCase().includes(query) || moduleCount > 0
  })

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Kora Thryve</p>
        <h1 className="mt-2 text-3xl font-semibold">Shared Teacher Library</h1>
        <p className="mt-2 text-sm text-slate-600">
          Browse all approved-teacher modules and upload your own PDF learning materials.
        </p>
      </div>

      {success && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
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
          <label className="md:col-span-2 flex flex-col gap-2 text-xs uppercase tracking-[0.12em] text-slate-500">
            Folder
            <select
              name="folder_id"
              defaultValue=""
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm normal-case text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">No folder (Ungrouped)</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </label>
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

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Create Folder</h2>
        <p className="mt-1 text-sm text-slate-600">Create a folder to organize shared modules.</p>
        <form action={createModuleFolder} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex min-w-[260px] flex-1 flex-col gap-2 text-xs uppercase tracking-[0.12em] text-slate-500">
            Folder name
            <input
              name="name"
              type="text"
              placeholder="e.g. Algebra Foundations"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm normal-case outline-none transition focus:border-slate-400"
              required
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Create Folder
          </button>
        </form>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Folders</h2>
          <span className="text-xs uppercase tracking-[0.12em] text-slate-500">{visibleFolders.length} folders</span>
        </div>
        {visibleFolders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No folders found.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleFolders.map((folder) => {
              const moduleCount = folderModuleCount.get(folder.id) ?? 0
              return (
                <Link
                  key={folder.id}
                  href={`/teacher/modules/folders/${folder.id}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="h-24 bg-gradient-to-br from-[#f5e8d3] via-[#ead7bb] to-[#d8c1a2]" />
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Folder</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{folder.name}</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {moduleCount} module{moduleCount === 1 ? '' : 's'}
                    </p>
                    <p className="mt-3 text-sm font-medium text-[#8b7758] group-hover:underline">Open folder</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Section</p>
            <h2 className="text-lg font-semibold text-slate-900">Ungrouped</h2>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            {ungroupedModules.length} module{ungroupedModules.length === 1 ? '' : 's'}
          </span>
        </div>

        {ungroupedModules.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No ungrouped modules.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ungroupedModules.map((module) => (
              <TeacherUngroupedModuleCard
                key={module.id}
                module={module}
                folders={folders}
                currentTeacherId={user.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
