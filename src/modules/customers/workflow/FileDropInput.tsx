import { FileText, UploadCloud } from "lucide-react"
import { useRef, useState, type DragEvent } from "react"

type FileDropInputProps = {
  label: string
  helperText: string
  file: File | null
  onFileChange: (file: File | null) => void
  error?: string
  accept?: string
}

export default function FileDropInput({
  label,
  helperText,
  file,
  onFileChange,
  error,
  accept,
}: FileDropInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    const dropped = event.dataTransfer.files?.[0] ?? null
    onFileChange(dropped)
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[var(--sf-text)]">{label}</label>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        className={`file-dropzone ${error ? "has-error" : dragActive ? "drag-active" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />

        {file ? (
          <div className="flex items-center gap-2 text-left">
            <FileText className="h-4 w-4 text-[var(--sf-primary-start)]" />
            <div>
              <p className="text-sm font-medium text-[var(--sf-text)]">{file.name}</p>
              <p className="text-xs text-[var(--sf-muted-text)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--sf-primary-start)_14%,var(--sf-card-bg))] text-[var(--sf-primary-start)]">
              <UploadCloud className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-[var(--sf-text)]">Drag and drop file here</p>
            <p className="text-xs text-[var(--sf-muted-text)]">{helperText}</p>
          </div>
        )}
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  )
}
