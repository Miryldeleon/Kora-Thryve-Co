import Link from 'next/link'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { createModuleSignedUrls } from '@/lib/data/module-queries'
import ModuleUploadForm from '@/components/modules/module-upload-form'
import { TeacherModuleCard } from '@/components/modules/module-library-cards'
import { MAX_MODULE_UPLOAD_SIZE_MB } from '@/lib/modules/config'
import { createModuleFolder, createUploadedModuleRecord, moveModuleToFolder, updateModuleMetadata } from './actions'

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

export default async function TeacherModulesPage({ searchParams }: TeacherModulesPageProps) {
  const { supabase, user } = await requireApprovedTeacher()
  const { success, error, q } = await searchParams

  const { data, error: modulesError } = await supabase
    .from('modules')
    .select(
      'id, teacher_id, teacher_name, folder_id, title, description, file_name, storage_path, created_at'
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

  const modulesWithLinks = (await createModuleSignedUrls(supabase, modules)) as TeacherModuleWithUrl[]

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

  modulesWithLinks.forEach((module) => {
    if (module.folder_id && folderIdSet.has(module.folder_id)) {
      folderModuleCount.set(module.folder_id, (folderModuleCount.get(module.folder_id) ?? 0) + 1)
    }
  })

  visibleModules.forEach((module) => {
    if (!module.folder_id || !folderIdSet.has(module.folder_id)) {
      ungroupedModules.push(module)
      return
    }
  })

  const visibleFolders = folders

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
        <p className="mt-1 text-sm text-slate-600">PDF file must be {MAX_MODULE_UPLOAD_SIZE_MB}MB or smaller.</p>
        <ModuleUploadForm action={createUploadedModuleRecord} className="mt-4 grid gap-4 md:grid-cols-2">
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
        </ModuleUploadForm>
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
                    {moduleCount === 0 && (
                      <p className="mt-2 text-sm text-slate-500">No materials in this folder yet.</p>
                    )}
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
              <TeacherModuleCard
                key={module.id}
                module={module}
                folders={folders}
                currentTeacherId={user.id}
                moveAction={moveModuleToFolder}
                updateAction={updateModuleMetadata}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
