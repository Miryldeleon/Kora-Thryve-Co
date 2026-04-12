import Link from 'next/link'
import { requireApprovedStudent } from '@/lib/auth/student'
import { TEACHER_MODULES_BUCKET } from '@/lib/modules/config'

type StudentFolderPageProps = {
  params: Promise<{
    folderId: string
  }>
}

type ModuleFolder = {
  id: string
  name: string
}

type StudentModule = {
  id: string
  title: string
  description: string | null
  teacher_name: string | null
  created_at: string
  storage_path: string
}

type StudentModuleWithUrl = StudentModule & {
  signedUrl: string | null
}

function StudentFolderModuleCard({ module, index }: { module: StudentModuleWithUrl; index: number }) {
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

export default async function StudentFolderDetailPage({ params }: StudentFolderPageProps) {
  const { supabase } = await requireApprovedStudent()
  const { folderId } = await params

  const { data: folderData, error: folderError } = await supabase
    .from('module_folders')
    .select('id, name')
    .eq('id', folderId)
    .maybeSingle()

  if (folderError || !folderData) {
    throw new Error(folderError?.message ?? 'Folder not found')
  }

  const folder = folderData as ModuleFolder

  const { data: modulesData, error: modulesError } = await supabase
    .from('modules')
    .select('id, title, description, teacher_name, created_at, storage_path')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false })

  if (modulesError) {
    throw new Error(modulesError.message)
  }

  const modules = (modulesData ?? []) as StudentModule[]

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

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Kora Thryve</p>
          <h1 className="mt-2 text-3xl font-semibold">Folder: {folder.name}</h1>
          <p className="mt-2 text-sm text-slate-600">Modules inside this folder.</p>
        </div>
        <Link href="/student/modules" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">
          Back to Modules
        </Link>
      </div>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h2 className="text-lg font-semibold text-slate-900">Modules in {folder.name}</h2>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            {modulesWithSignedUrls.length} module{modulesWithSignedUrls.length === 1 ? '' : 's'}
          </span>
        </div>

        {modulesWithSignedUrls.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No modules in this folder yet.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {modulesWithSignedUrls.map((module, index) => (
              <StudentFolderModuleCard key={module.id} module={module} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
