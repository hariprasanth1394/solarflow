'use client'

import { FileSpreadsheet, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'

type FileUploadDropzoneProps = {
  uploading: boolean
  fileName: string
  onFileSelect: (file: File | null) => void
  compact?: boolean
  premium?: boolean
}

export default function FileUploadDropzone({ uploading, fileName, onFileSelect, compact = false, premium = false }: FileUploadDropzoneProps) {
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
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
      role="button"
      tabIndex={0}
      className={`inv-dropzone ${compact ? 'inv-dropzone--compact' : ''} ${premium ? 'inv-dropzone--premium' : ''} ${dragging ? 'inv-dropzone--dragging' : ''} ${fileName ? 'inv-dropzone--has-file' : ''}`}
    >
      {premium ? (
        <span className="inv-dropzone-icon-wrap" aria-hidden="true">
          <UploadCloud className="inv-dropzone-icon" aria-hidden="true" />
        </span>
      ) : (
        <UploadCloud className="inv-dropzone-icon" aria-hidden="true" />
      )}
      <p className="inv-dropzone-title">{fileName ? 'Replace file or drop a new one' : 'Drop file or click to browse'}</p>
      <p className="inv-dropzone-meta">CSV, XLSX up to 25 MB</p>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        // Off-screen (not display:none) + value reset on open so iOS Safari
        // reliably fires onChange, including when re-picking the same file.
        className="sr-only"
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation()
          ;(event.currentTarget as HTMLInputElement).value = ""
        }}
        onChange={(event) => {
          const file = event.target.files?.[0] || null
          onFileSelect(file)
        }}
      />

      {fileName ? (
        <div className="inv-dropzone-file">
          <FileSpreadsheet className="inv-dropzone-file-icon" aria-hidden="true" />
          <span className="truncate">{fileName}</span>
        </div>
      ) : null}

      {uploading ? <p className="inv-dropzone-meta">Validating file...</p> : null}
    </div>
  )
}
