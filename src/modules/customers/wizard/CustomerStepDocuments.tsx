import { Upload } from "lucide-react"
import { useMemo, useRef } from "react"
import type { DocumentFileMap } from "./types"

type CustomerStepDocumentsProps = {
  value: DocumentFileMap
  errors: Partial<Record<keyof DocumentFileMap, string>>
  onFileChange: (field: keyof DocumentFileMap, file: File | null, error?: string) => void
}

const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"]
const maxBytes = 5 * 1024 * 1024

const documentFields: Array<{ key: keyof DocumentFileMap; label: string; optional?: boolean }> = [
  { key: "idProof", label: "ID Proof" },
  { key: "addressProof", label: "Address Proof" },
  { key: "electricityBill", label: "Electricity Bill" },
  { key: "customerAgreement", label: "Customer Agreement", optional: true }
]

function formatFileSize(size: number) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

export default function CustomerStepDocuments({ value, errors, onFileChange }: CustomerStepDocumentsProps) {
  const inputRefs = useRef<Partial<Record<keyof DocumentFileMap, HTMLInputElement | null>>>({})

  const helperText = useMemo(() => "Drag & drop or click to upload (PDF, JPG, PNG, max 5MB)", [])

  const validateFile = (file: File) => {
    if (!allowedMimeTypes.includes(file.type)) {
      return "Only PDF, JPG, and PNG files are allowed"
    }
    if (file.size > maxBytes) {
      return "File size must be 5MB or less"
    }
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {documentFields.map((field) => {
        const currentFile = value[field.key]
        return (
          <div key={field.key} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">
              {field.label}
              {field.optional ? <span className="ml-1 text-xs text-gray-500">(optional)</span> : null}
            </span>
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRefs.current[field.key]?.click()}
              onDrop={(event) => {
                event.preventDefault()
                const file = event.dataTransfer.files?.[0]
                if (!file) return
                const validationError = validateFile(file)
                if (validationError) {
                  onFileChange(field.key, null, validationError)
                  return
                }
                onFileChange(field.key, file)
              }}
              onDragOver={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  inputRefs.current[field.key]?.click()
                }
              }}
              className={`rounded-lg border border-dashed p-4 text-center transition ${
                errors[field.key] ? "border-rose-400 bg-rose-50" : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Upload className="mx-auto h-5 w-5 text-gray-500" />
              <p className="mt-2 text-sm text-gray-700">{currentFile ? currentFile.name : helperText}</p>
              {currentFile ? <p className="mt-1 text-xs text-gray-500">{formatFileSize(currentFile.size)}</p> : null}
            </div>
            <input
              ref={(node) => {
                inputRefs.current[field.key] = node
              }}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null
                if (!file) {
                  onFileChange(field.key, null)
                  return
                }
                const validationError = validateFile(file)
                if (validationError) {
                  onFileChange(field.key, null, validationError)
                  return
                }
                onFileChange(field.key, file)
              }}
            />
            {errors[field.key] ? <span className="text-xs text-rose-600">{errors[field.key]}</span> : null}
          </div>
        )
      })}
    </div>
  )
}
