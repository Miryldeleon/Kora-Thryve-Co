import Link from 'next/link'
import { requireApprovedTeacher } from '@/lib/auth/teacher'
import { TEACHER_MODULES_BUCKET } from '@/lib/modules/config'
import { moveModuleToFolder, updateModuleMetadata, uploadModule } from '../../actions'

type TeacherFolderPageProps = {
  params: Promise<{
    folderId: string
  }>
  searchParams: Promise<{
    success?: string
    error?: string
  }>
}

type ModuleFolder = {
  id: string
  name: string
}

type TeacherModule = {
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

type TeacherModuleWithUrl = TeacherModule & {
  signedUrl: string | null
}

function formatFileSize(bytes: number) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(2)} MB`
}

export default async function TeacherFolderDetailPage({ params, searchParams }: TeacherFolderPageProps) {
  const { supabase, user } = await requireApprovedTeacher()
  const { folderId } = await params
  const { success, error } = await searchParams

  const { data: folderData, error: folderError } = await supabase
    .from('module_folders')
    .select('id, name')
    .eq('id', folderId)
    .maybeSingle()

  if (folderError || !folderData) {
    throw new Error(folderError?.message ?? 'Folder not found')
  }

  const folder = folderData as ModuleFolder

  const { data: allFoldersData, error: allFoldersError } = await supabase
    .from('module_folders')
    .select('id, name')
    .order('created_at', { ascending: true })

  if (allFoldersError) {
    throw new Error(allFoldersError.message)
  }

  const allFolders = (allFoldersData ?? []) as ModuleFolder[]

  const { data: modulesData, error: modulesError } = await supabase
    .from('modules')
    .select('id, teacher_id, teacher_name, folder_id, title, description, file_name, file_size, storage_path, created_at')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false })

  if (modulesError) {
    throw new Error(modulesError.message)
  }

  const modules = (modulesData ?? []) as TeacherModule[]

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

  const returnTo = `/teacher/modules/folders/${folder.id}`

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Kora Thryve</p>
          <h1 className="mt-2 text-3xl font-semibold">Folder: {folder.name}</h1>
          <p className="mt-2 text-sm text-slate-600">Shared modules in this folder.</p>
        </div>
        <Link href="/teacher/modules" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
          Back to Modules
        </Link>
      </div>

      {success && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Upload Into This Folder</h2>
        <form action={uploadModule} className="mt-4 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="folder_id" value={folder.id} />
          <input type="hidden" name="return_to" value={returnTo} />
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

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h2 className="text-lg font-semibold text-slate-900">Modules in {folder.name}</h2>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            {modulesWithLinks.length} module{modulesWithLinks.length === 1 ? '' : 's'}
          </span>
        </div>

        {modulesWithLinks.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            This folder has no modules yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modulesWithLinks.map((module) => (
              <article key={module.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                  <input type="hidden" name="return_to" value={returnTo} />
                  <label className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Move to folder</label>
                  <div className="flex gap-2">
                    <select
                      name="folder_id"
                      defaultValue={module.folder_id ?? ''}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
                    >
                      <option value="">Ungrouped</option>
                      {allFolders.map((folderOption) => (
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

                {module.teacher_id === user.id && (
                  <form action={updateModuleMetadata} className="mt-4 grid gap-2">
                    <input type="hidden" name="module_id" value={module.id} />
                    <input type="hidden" name="return_to" value={returnTo} />
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
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
