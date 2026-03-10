"use client"

import { useCallback, useEffect, useState } from "react"
import DataTable from "../../components/tables/DataTable"
import SearchFilterBar from "../../components/forms/SearchFilterBar"
import UploadDocumentModal from "./UploadDocumentModal"
import { deleteDocument, downloadDocument, listDocuments, uploadDocument } from "../../services/documentService"
import { getCustomers } from "../../services/customerService"
import { formatDateTimeUTC } from "../../utils/dateFormat"
import LoadingButton from "../../components/ui/LoadingButton"

type DocumentRow = {
  id: string
  name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  related_customer_id: string | null
  created_at: string
}

type Customer = {
  id: string
  name: string
}

export default function DocumentsPage() {
  const pageSize = 10
  const [rows, setRows] = useState<DocumentRow[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [message, setMessage] = useState("")

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    try {
      const { data, count } = await listDocuments(search, page, pageSize)
      setRows((data ?? []) as DocumentRow[])
      setTotalCount(count ?? 0)
      setMessage("")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operation failed")
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search])

  const fetchCustomers = useCallback(async () => {
    const { data } = await getCustomers({ page: 1, pageSize: 100 })
    const customerRows = (data ?? []) as unknown as Array<{ id: string; name: string }>
    setCustomers(customerRows.map((customer) => ({ id: customer.id, name: customer.name })))
  }, [])

  useEffect(() => {
    let active = true

    void (async () => {
      await fetchDocuments()
      if (!active) {
        return
      }
    })()

    return () => {
      active = false
    }
  }, [fetchDocuments])

  useEffect(() => {
    let active = true

    void (async () => {
      await fetchCustomers()
      if (!active) {
        return
      }
    })()

    return () => {
      active = false
    }
  }, [fetchCustomers])

  const columns = [
    { key: "name", header: "Name" },
    { key: "file_type", header: "Type" },
    {
      key: "file_size",
      header: "Size",
      render: (row: DocumentRow) => `${Math.round((row.file_size ?? 0) / 1024)} KB`
    },
    {
      key: "created_at",
      header: "Uploaded",
      render: (row: DocumentRow) => formatDateTimeUTC(row.created_at)
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: DocumentRow) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              setDownloadingId(row.id)
              try {
                const { data } = await downloadDocument(row.file_url)
                if (!data) return
                const url = URL.createObjectURL(data)
                const anchor = document.createElement("a")
                anchor.href = url
                anchor.download = row.name
                anchor.click()
                URL.revokeObjectURL(url)
              } finally {
                setDownloadingId(null)
              }
            }}
            disabled={downloadingId === row.id || deletingId === row.id}
            className="rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:opacity-60"
          >
            {downloadingId === row.id ? "Downloading..." : "Download"}
          </button>
          <LoadingButton
            type="button"
            loading={deletingId === row.id}
            loadingLabel="Deleting..."
            disabled={deletingId === row.id || downloadingId === row.id}
            onClick={async () => {
              setDeletingId(row.id)
              try {
                await deleteDocument(row.id, row.file_url)
                setMessage("Document deleted successfully")
                await fetchDocuments()
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Operation failed")
              } finally {
                setDeletingId(null)
              }
            }}
            className="border border-red-200 px-2 py-1 text-xs text-red-600"
          >
            Delete
          </LoadingButton>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-semibold text-gray-900">Documents</h2>
        <p className="mt-1 text-sm text-gray-600">Upload and manage customer-linked documents securely.</p>
      </section>

      <SearchFilterBar
        search={search}
        onSearchChange={(value: string) => {
          setSearch(value)
          setPage(1)
        }}
        placeholder="Search by document name or type"
        filters={<></>}
        actions={
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white"
          >
            Upload Document
          </button>
        }
      />

      {message ? <p className="text-sm text-gray-600">{message}</p> : null}

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        emptyLabel="No documents found"
      />

      <UploadDocumentModal
        open={modalOpen}
        customers={customers}
        loading={uploading}
        onClose={() => {
          if (!uploading) {
            setModalOpen(false)
          }
        }}
        onSubmit={async ({ file, relatedCustomerId }) => {
          setUploading(true)
          try {
            const { error } = await uploadDocument(file, "uploads", relatedCustomerId)
            if (!error) {
              setMessage("Document uploaded successfully")
              setModalOpen(false)
              await fetchDocuments()
            }
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Operation failed")
          } finally {
            setUploading(false)
          }
        }}
      />
    </div>
  )
}
