"use client"

import { useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  inventoryPagerButtonActiveClass,
  inventoryPagerButtonClass,
} from "./inventoryTableStyles"

export const INVENTORY_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

type InventoryTablePagerProps = {
  page: number
  pageSize: number
  totalCount: number
  pageSizeOptions?: readonly number[]
  itemLabel?: string
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, -1, totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [1, -1, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, -1, currentPage - 1, currentPage, currentPage + 1, -1, totalPages]
}

export default function InventoryTablePager({
  page,
  pageSize,
  totalCount,
  pageSizeOptions = INVENTORY_PAGE_SIZE_OPTIONS,
  itemLabel = "results",
  onPageChange,
  onPageSizeChange,
}: InventoryTablePagerProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const canGoPrevious = totalCount > 0 && currentPage > 1
  const canGoNext = totalCount > 0 && currentPage < totalPages
  const showingFrom = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const showingTo = totalCount === 0 ? 0 : Math.min(currentPage * pageSize, totalCount)

  const visiblePages = useMemo(
    () => (totalCount === 0 ? [] : getVisiblePages(currentPage, totalPages)),
    [currentPage, totalCount, totalPages]
  )

  return (
    <div className="inv-table-pager">
      <label className="inv-table-pager-rows">
        <span className="inv-table-pager-rows-label inv-table-pager-rows-label--full">Rows per page</span>
        <span className="inv-table-pager-rows-label inv-table-pager-rows-label--short">Rows</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="dropdown inv-table-pager-rows-select"
          aria-label="Rows per page"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <span className="inv-table-pager-meta" aria-live="polite">
        {totalCount === 0
          ? `No ${itemLabel}`
          : `Showing ${showingFrom}–${showingTo} of ${totalCount}`}
      </span>

      <div className="inv-table-pager-controls">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className={`${inventoryPagerButtonClass} inv-table-pager-nav-btn`}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="inv-table-pager-nav-label">Prev</span>
        </button>

        <div className="inv-table-pager-pages" aria-label="Pagination">
          {visiblePages.map((pageNumber, index) =>
            pageNumber === -1 ? (
              <span key={`ellipsis-${index}`} className="inv-table-pager-ellipsis" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={pageNumber}
                type="button"
                onClick={() => onPageChange(pageNumber)}
                className={
                  pageNumber === currentPage ? inventoryPagerButtonActiveClass : inventoryPagerButtonClass
                }
                aria-current={pageNumber === currentPage ? "page" : undefined}
              >
                {pageNumber}
              </button>
            )
          )}
        </div>

        <span className="inv-table-pager-status" aria-live="polite">
          {totalCount === 0 ? "—" : `${currentPage} / ${totalPages}`}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className={`${inventoryPagerButtonClass} inv-table-pager-nav-btn`}
          aria-label="Next page"
        >
          <span className="inv-table-pager-nav-label">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
