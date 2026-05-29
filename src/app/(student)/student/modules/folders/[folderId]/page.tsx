import Link from 'next/link'
import { requireApprovedStudent } from '@/lib/auth/student'
import { createModuleSignedUrls } from '@/lib/data/module-queries'
import { StudentModuleCard } from '@/components/modules/module-library-cards'

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
  teacher_name: string | null
  file_name: string | null
  created_at: string
  storage_path: string
}

type StudentModuleWithUrl = StudentModule & {
  signedUrl: string | null
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
    .select('id, title, teacher_name, file_name, created_at, storage_path')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false })

  if (modulesError) {
    throw new Error(modulesError.message)
  }

  const modules = (modulesData ?? []) as StudentModule[]

  const modulesWithSignedUrls = (await createModuleSignedUrls(
    supabase,
    modules
  )) as StudentModuleWithUrl[]

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
            No materials in this folder yet.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modulesWithSignedUrls.map((module) => (
              <StudentModuleCard key={module.id} module={module} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
