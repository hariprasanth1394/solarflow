import { supabase } from "../lib/supabaseClient"
import { Database } from "../types/database.types"
import { handleRepositoryError } from "./repositoryUtils"
import { assertValidUUID } from "../utils/validateUUID"

const DOCUMENT_BUCKET = "documents"

type DocumentInsert = Database["public"]["Tables"]["documents"]["Insert"]

const DOCUMENT_RETURN_COLUMNS = "id,name,file_url,file_type,file_size,related_customer_id,uploaded_by,created_at"

export const uploadDocumentObject = async (filePath: string, file: File) => {
  const response = await supabase.storage.from(DOCUMENT_BUCKET).upload(filePath, file)
  if (response.error) {
    handleRepositoryError("documentRepository", "uploadDocumentObject", response.error)
  }
  return response
}

export const listDocumentObjects = async (folder = "") => {
  const response = await supabase.storage.from(DOCUMENT_BUCKET).list(folder, {
    sortBy: { column: "created_at", order: "desc" }
  })

  if (response.error) {
    handleRepositoryError("documentRepository", "listDocumentObjects", response.error)
  }

  return response
}

export const downloadDocumentObject = async (filePath: string) => {
  const response = await supabase.storage.from(DOCUMENT_BUCKET).download(filePath)
  if (response.error) {
    handleRepositoryError("documentRepository", "downloadDocumentObject", response.error)
  }
  return response
}

export const deleteDocumentObject = async (filePath: string) => {
  const response = await supabase.storage.from(DOCUMENT_BUCKET).remove([filePath])
  if (response.error) {
    handleRepositoryError("documentRepository", "deleteDocumentObject", response.error)
  }
  return response
}

export const insertDocumentMetadata = async (
  organizationId: string,
  payload: Omit<DocumentInsert, "organization_id">
) => {
  const response = await supabase
    .from("documents")
    .insert({ ...payload, organization_id: organizationId } as DocumentInsert)
    .select(DOCUMENT_RETURN_COLUMNS)
    .single()

  if (response.error) {
    handleRepositoryError("documentRepository", "insertDocumentMetadata", response.error)
  }

  return response
}

export const queryDocuments = async (organizationId: string, search = "", page = 1, pageSize = 20) => {
  const safePage = Math.max(1, page)
  const safePageSize = Math.min(100, Math.max(1, pageSize))
  const from = (safePage - 1) * safePageSize
  const to = from + safePageSize - 1

  let query = supabase
    .from("documents")
    .select("id,name,file_url,file_type,file_size,related_customer_id,created_at", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })

  if (search) {
    query = query.or(`name.ilike.%${search}%,file_type.ilike.%${search}%`)
  }

  const response = await query.range(from, to)
  if (response.error) {
    handleRepositoryError("documentRepository", "queryDocuments", response.error)
  }
  return response
}

export const deleteDocumentMetadataById = async (organizationId: string, id: string) => {
  assertValidUUID(organizationId, "organizationId")
  assertValidUUID(id, "documentId")
  
  const response = await supabase.from("documents").delete().eq("id", id).eq("organization_id", organizationId)
  if (response.error) {
    handleRepositoryError("documentRepository", "deleteDocumentMetadataById", response.error)
  }
  return response
}

export const queryDocumentsByCustomerId = async (organizationId: string, customerId: string, limit = 100) => {
  assertValidUUID(organizationId, "organizationId")
  assertValidUUID(customerId, "customerId")
  
  const safeLimit = Math.min(200, Math.max(1, limit))
  const response = await supabase
    .from("documents")
    .select("id,name,file_url,file_type,file_size,related_customer_id,created_at")
    .eq("organization_id", organizationId)
    .eq("related_customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(safeLimit)

  if (response.error) {
    handleRepositoryError("documentRepository", "queryDocumentsByCustomerId", response.error)
  }

  return response
}
