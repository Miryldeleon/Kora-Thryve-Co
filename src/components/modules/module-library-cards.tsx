'use client'

import { useState } from 'react'

type ModuleFolderOption = {
  id: string
  name: string
}

type TeacherModuleCardData = {
  id: string
  teacher_id: string
  teacher_name: string | null
  folder_id: string | null
  title: string | null
  description: string | null
  file_name: string | null
  created_at: string | null
  signedUrl: string | null
}

type StudentModuleCardData = {
  teacher_name: string | null
  title: string | null
  file_name: string | null
  created_at: string | null
  signedUrl: string | null
}

type ModulePanel = 'edit' | 'move' | null

function getModuleTitle(module: { title: string | null; file_name: string | null }) {
  return module.title?.trim() || module.file_name?.trim() || 'Untitled module'
}

function formatUploadDate(value: string | null) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function ModuleMetadataLine({
  teacherName,
  createdAt,
}: {
  teacherName: string | null
  createdAt: string | null
}) {
  const uploadedBy = teacherName?.trim() || 'Teacher'
  const uploadDate = formatUploadDate(createdAt)

  return (
    <p className="text-xs text-slate-500">
      Uploaded by {uploadedBy}
      {uploadDate ? <span> &bull; {uploadDate}</span> : null}
    </p>
  )
}

function ActionButton({
  children,
  onClick,
  disabled = false,
}: {
  children: string
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[#cfb083] hover:text-[#8b7758] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-slate-200 disabled:hover:text-slate-700"
    >
      {children}
    </button>
  )
}

export function TeacherModuleCard({
  module,
  folders,
  currentTeacherId,
  returnTo,
  moveAction,
  updateAction,
}: {
  module: TeacherModuleCardData
  folders: ModuleFolderOption[]
  currentTeacherId: string
  returnTo?: string
  moveAction: (formData: FormData) => void | Promise<void>
  updateAction: (formData: FormData) => void | Promise<void>
}) {
  const [openPanel, setOpenPanel] = useState<ModulePanel>(null)
  const canEdit = module.teacher_id === currentTeacherId
  const title = getModuleTitle(module)

  return (
    <article className="flex min-h-44 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <ModuleMetadataLine teacherName={module.teacher_name} createdAt={module.created_at} />

      <h3 className="mt-3 flex-1 break-words text-lg font-semibold leading-snug text-slate-900">
        {title}
      </h3>

      <div className="mt-5 flex flex-wrap gap-2">
        {module.signedUrl && (
          <a
            className="rounded-lg bg-[#cfb083] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#c2a372]"
            href={module.signedUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open
          </a>
        )}
        <ActionButton
          disabled={!canEdit}
          onClick={() => setOpenPanel((current) => (current === 'edit' ? null : 'edit'))}
        >
          Edit
        </ActionButton>
        <ActionButton onClick={() => setOpenPanel((current) => (current === 'move' ? null : 'move'))}>
          Move
        </ActionButton>
      </div>

      {openPanel === 'edit' && canEdit && (
        <form action={updateAction} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input type="hidden" name="module_id" value={module.id} />
          {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
          <div className="grid gap-2">
            <input
              name="title"
              defaultValue={title}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
              required
            />
            <textarea
              name="description"
              defaultValue={module.description ?? ''}
              placeholder="Description"
              className="min-h-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg bg-[#9cae82] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#8fa173]"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setOpenPanel(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {openPanel === 'move' && (
        <form action={moveAction} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input type="hidden" name="module_id" value={module.id} />
          {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
          <div className="grid gap-2">
            <select
              name="folder_id"
              defaultValue={module.folder_id ?? ''}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-400"
            >
              <option value="">Ungrouped</option>
              {folders.map((folderOption) => (
                <option key={folderOption.id} value={folderOption.id}>
                  {folderOption.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Move
              </button>
              <button
                type="button"
                onClick={() => setOpenPanel(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </article>
  )
}

export function StudentModuleCard({ module }: { module: StudentModuleCardData }) {
  const title = getModuleTitle(module)

  return (
    <article className="flex min-h-36 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <ModuleMetadataLine teacherName={module.teacher_name} createdAt={module.created_at} />

      <h3 className="mt-3 flex-1 break-words text-lg font-semibold leading-snug text-slate-900">
        {title}
      </h3>

      {module.signedUrl && (
        <div className="mt-5">
          <a
            href={module.signedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-lg bg-[#cfb083] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#c2a372]"
          >
            Open
          </a>
        </div>
      )}
    </article>
  )
}
