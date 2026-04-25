'use client'

import { FileSpreadsheet, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'

type FileUploadDropzoneProps = {
  uploading: boolean
  fileName: string
  onFileSelect: (file: File | null) => void
}

export default function FileUploadDropzone({ uploading, fileName, onFileSelect }: FileUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        const file = event.dataTransfer.files?.[0] || null
        onFileSelect(file)
      }}
      className={`card border-2 border-dashed p-8 text-center transition ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300'}`}
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
        <UploadCloud className="h-6 w-6 text-blue-600" />
      </div>

      <p className="text-sm font-medium text-slate-900">Drag & drop your Excel file here</p>
      <p className="mt-1 text-xs text-slate-600">Supported format: .xlsx</p>

      <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-primary mt-4">
        Browse file
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(event) => onFileSelect(event.target.files?.[0] || null)}
      />

      {fileName && (
        <div className="card mx-auto mt-4 flex max-w-md items-center justify-center gap-2 px-3 py-2 text-sm text-slate-700">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <span className="truncate">{fileName}</span>
        </div>
      )}

      {uploading && <p className="mt-3 text-xs text-slate-500">Validating file...</p>}
    </div>
  )
}
