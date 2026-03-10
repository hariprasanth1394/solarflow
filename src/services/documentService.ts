import {
  deleteDocumentMetadataById,
  deleteDocumentObject,
  downloadDocumentObject,
  insertDocumentMetadata,
  listDocumentObjects,
  queryDocumentsByCustomerId,
  queryDocuments,
  uploadDocumentObject
} from "../repositories/documentRepository"
import { logError, logInfo, logWarn } from "../utils/logger"
import { withRequestContext } from "../utils/withRequestContext"
import { assertValidUUID } from "../utils/validateUUID"
import { logActivity } from "./activityLogService"
import { evaluateCustomerWorkflow } from "./customerWorkflowService"

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
])

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-")
}

function validateDocument(file: File) {
  if (!file.name?.trim()) {
    throw new Error("Operation failed")
  }

  if (file.size <= 0 || file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error("Operation failed")
  }

  if (!file.type || !ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
    throw new Error("Operation failed")
  }
}

export const uploadDocument = async (file: File, folder = "general", relatedCustomerId?: string | null) => {
  validateDocument(file)

  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const safeFolder = sanitizeSegment(folder || "general")
      const safeFileName = sanitizeSegment(file.name)
      const filePath = `${organizationId}/${safeFolder}/${Date.now()}-${safeFileName}`

      const { data: uploadData, error: uploadError } = await uploadDocumentObject(filePath, file)
      if (uploadError) {
        return { data: null, error: uploadError }
      }

      const metadataPayload = {
        name: safeFileName,
        file_url: filePath,
        file_type: file.type || null,
        file_size: file.size,
        related_customer_id: relatedCustomerId ?? null,
        uploaded_by: userId
      }

      const { data, error } = await insertDocumentMetadata(organizationId, metadataPayload)
      if (!error && data) {
        await logActivity("Document uploaded", "document", data.id, { name: data.name })
        if (relatedCustomerId) {
          try {
            await evaluateCustomerWorkflow(relatedCustomerId, {
              triggerEvent: "document-uploaded",
              metadata: { documentId: data.id, name: data.name, fileType: data.file_type },
              organizationId,
              userId
            })
          } catch (workflowError) {
            logWarn("Workflow evaluation skipped on document upload", {
              service: "documentService",
              organizationId,
              userId,
              customerId: relatedCustomerId,
              documentId: data.id,
              error: workflowError instanceof Error ? workflowError.message : String(workflowError)
            })
          }
        }
        logInfo("Document uploaded", {
          service: "documentService",
          organizationId,
          userId,
          documentId: data.id,
          filePath,
          fileType: file.type,
          fileSize: file.size
        })
      }
      return { data: data ?? uploadData, error }
    } catch (error) {
      logError("Document upload failed", error, {
        service: "documentService",
        organizationId,
        userId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      })
      throw new Error("Operation failed")
    }
  })
}

export const listDocuments = async (search = "", page = 1, pageSize = 20) => {
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error, count } = await queryDocuments(organizationId, search, page, pageSize)
      return { data: data ?? [], error, count: count ?? 0 }
    } catch (error) {
      logError("Document list failed", error, { service: "documentService", organizationId, userId, search, page, pageSize })
      throw new Error("Operation failed")
    }
  })
}

export const listDocumentsByCustomerId = async (customerId: string, limit = 100) => {
  assertValidUUID(customerId, "customerId")

  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { data, error } = await queryDocumentsByCustomerId(organizationId, customerId, limit)
      logInfo("Customer documents listed", {
        service: "documentService",
        organizationId,
        userId,
        customerId,
        count: data?.length ?? 0
      })
      return { data: data ?? [], error }
    } catch (error) {
      logError("Customer document list failed", error, { service: "documentService", organizationId, userId, customerId, limit })
      throw new Error("Operation failed")
    }
  })
}

export const listStorageDocuments = async (folder = "") => {
  const { data, error } = await listDocumentObjects(folder)
  return { data: data ?? [], error }
}

export const downloadDocument = async (filePath: string) => {
  try {
    const { data, error } = await downloadDocumentObject(filePath)
    return { data, error }
  } catch (error) {
    logError("Document download failed", error, { service: "documentService", filePath })
    throw new Error("Operation failed")
  }
}

export const deleteDocument = async (id: string, filePath: string) => {
    assertValidUUID(id, "documentId")
  
  return withRequestContext(async ({ organizationId, userId }) => {
    try {
      const { error: storageError } = await deleteDocumentObject(filePath)
      if (storageError) {
        return { error: storageError }
      }

      const { error } = await deleteDocumentMetadataById(organizationId, id)
      if (!error) {
        await logActivity("Document deleted", "document", id, { filePath })
        logInfo("Document deleted", { service: "documentService", organizationId, userId, documentId: id, filePath })
      }
      return { error }
    } catch (error) {
      logError("Document delete failed", error, { service: "documentService", organizationId, userId, documentId: id, filePath })
      throw new Error("Operation failed")
    }
  })
}
