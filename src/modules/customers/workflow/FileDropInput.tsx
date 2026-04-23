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
      <label className="text-sm font-medium text-slate-700">{label}</label>
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
        className={`flex min-h-28 cursor-pointer items-center justify-center rounded-lg border border-dashed px-4 py-4 text-center transition-all ${
          error
            ? "border-rose-300 bg-rose-50"
            : dragActive
            ? "border-blue-400 bg-blue-50"
            : "border-slate-300 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/40"
        }`}
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
            <FileText className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-slate-800">{file.name}</p>
              <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <UploadCloud className="h-4 w-4" />
            </div>
            <p className="text-sm font-medium text-slate-700">Drag and drop file here</p>
            <p className="text-xs text-slate-500">{helperText}</p>
          </div>
        )}
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  )
}
