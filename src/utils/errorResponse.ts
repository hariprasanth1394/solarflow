/**
 * Standardized Error Response Structure
 * Consistent error handling across all import APIs
 */

// ============================================================
// ERROR RESPONSE TYPES
// ============================================================

export type ErrorSeverity = 'error' | 'warning' | 'info'

export type ApiErrorResponse = {
  success: false
  error: {
    code: string
    message: string
    severity: ErrorSeverity
    httpStatus: number
    timestamp: string
    requestId: string
    details?: Record<string, any>
    context?: {
      fileName?: string
      rowNumber?: number
      field?: string
      value?: any
    }
  }
  retryable: boolean
  suggestedAction?: string
}

export type ApiSuccessResponse<T = any> = {
  success: true
  data: T
  metadata?: {
    processingTimeMs: number
    organizationId?: string
    batchId?: string
  }
}

export type ValidationErrorResponse = {
  success: false
  error: {
    code: string
    message: string
    severity: ErrorSeverity
    httpStatus: number
    timestamp: string
    requestId: string
  }
  validationErrors: Array<{
    rowNumber: number
    field: string
    code: string
    message: string
    severity: ErrorSeverity
    value?: any
    details?: Record<string, any>
  }>
  validationWarnings: Array<{
    rowNumber: number
    field: string
    code: string
    message: string
    severity: ErrorSeverity
    value?: any
    details?: Record<string, any>
  }>
  duplicates?: Array<{
    itemCode: string
    systemCode: string
    rows: number[]
  }>
  summary: {
    totalErrors: number
    totalWarnings: number
    totalDuplicates: number
    blockingErrors: boolean
  }
  retryable: boolean
  suggestedAction?: string
}

// ============================================================
// ERROR CLASSIFICATION & CODES
// ============================================================

export const ERROR_CLASSIFICATIONS = {
  // INPUT ERRORS (4xx) - Client responsibility, not retryable
  INPUT_VALIDATION: {
    category: 'INPUT_ERROR',
    httpStatus: 400,
    retryable: false,
    description: 'Input data is invalid'
  },
  FILE_FORMAT: {
    category: 'INPUT_ERROR',
    httpStatus: 400,
    retryable: false,
    description: 'File format is not supported'
  },
  MISSING_REQUIRED: {
    category: 'INPUT_ERROR',
    httpStatus: 400,
    retryable: false,
    description: 'Required field/data is missing'
  },
  DUPLICATE_DATA: {
    category: 'INPUT_ERROR',
    httpStatus: 400,
    retryable: false,
    description: 'Duplicate data detected'
  },

  // RESOURCE ERRORS (404) - Resource not found
  RESOURCE_NOT_FOUND: {
    category: 'RESOURCE_ERROR',
    httpStatus: 404,
    retryable: false,
    description: 'Referenced resource not found'
  },
  ORGANIZATION_NOT_FOUND: {
    category: 'RESOURCE_ERROR',
    httpStatus: 404,
    retryable: false,
    description: 'Organization not found'
  },

  // AUTHORIZATION ERRORS (401/403)
  UNAUTHORIZED: {
    category: 'AUTH_ERROR',
    httpStatus: 401,
    retryable: false,
    description: 'User not authenticated'
  },
  FORBIDDEN: {
    category: 'AUTH_ERROR',
    httpStatus: 403,
    retryable: false,
    description: 'User does not have permission'
  },

  // SERVER ERRORS (5xx) - Server responsibility, retryable
  DATABASE_ERROR: {
    category: 'SERVER_ERROR',
    httpStatus: 500,
    retryable: true,
    description: 'Database operation failed'
  },
  TRANSACTION_FAILED: {
    category: 'SERVER_ERROR',
    httpStatus: 500,
    retryable: true,
    description: 'Transaction failed and was rolled back'
  },
  INTERNAL_ERROR: {
    category: 'SERVER_ERROR',
    httpStatus: 500,
    retryable: true,
    description: 'Internal server error'
  },
  SERVICE_UNAVAILABLE: {
    category: 'SERVER_ERROR',
    httpStatus: 503,
    retryable: true,
    description: 'Service temporarily unavailable'
  }
} as const

// ============================================================
// ERROR FACTORY FUNCTIONS
// ============================================================

export function createErrorResponse(
  code: string,
  message: string,
  classification: keyof typeof ERROR_CLASSIFICATIONS,
  details?: Record<string, any>,
  context?: Record<string, any>,
  requestId?: string
): ApiErrorResponse {
  const classif = ERROR_CLASSIFICATIONS[classification]

  return {
    success: false,
    error: {
      code,
      message,
      severity: classif.httpStatus >= 500 ? 'error' : 'error',
      httpStatus: classif.httpStatus,
      timestamp: new Date().toISOString(),
      requestId: requestId || generateRequestId(),
      details,
      context
    },
    retryable: classif.retryable,
    suggestedAction: getSuggestedAction(code, classif.httpStatus)
  }
}

export function createValidationErrorResponse(
  validationErrors: Array<{
    rowNumber: number
    field: string
    code: string
    message: string
    severity: ErrorSeverity
    value?: any
    details?: Record<string, any>
  }>,
  validationWarnings: Array<{
    rowNumber: number
    field: string
    code: string
    message: string
    severity: ErrorSeverity
    value?: any
    details?: Record<string, any>
  }> = [],
  duplicates: Array<{
    itemCode: string
    systemCode: string
    rows: number[]
  }> = [],
  requestId?: string
): ValidationErrorResponse {
  const totalErrors = validationErrors.length
  const totalWarnings = validationWarnings.length
  const totalDuplicates = duplicates.reduce((sum, d) => sum + d.rows.length, 0)
  const blockingErrors = totalErrors > 0

  return {
    success: false,
    error: {
      code: blockingErrors ? 'VALIDATION_FAILED' : 'VALIDATION_WITH_WARNINGS',
      message: blockingErrors
        ? `Validation failed: ${totalErrors} error(s), ${totalWarnings} warning(s)`
        : `Validation passed with ${totalWarnings} warning(s)`,
      severity: blockingErrors ? 'error' : 'warning',
      httpStatus: blockingErrors ? 400 : 200,
      timestamp: new Date().toISOString(),
      requestId: requestId || generateRequestId()
    },
    validationErrors,
    validationWarnings,
    duplicates: duplicates.length > 0 ? duplicates : undefined,
    summary: {
      totalErrors,
      totalWarnings,
      totalDuplicates,
      blockingErrors
    },
    retryable: false,
    suggestedAction: blockingErrors ? 'Fix errors and resubmit' : 'Review warnings and confirm import'
  }
}

export function createSuccessResponse<T>(
  data: T,
  processingTimeMs?: number,
  organizationId?: string,
  batchId?: string
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      processingTimeMs: processingTimeMs || 0,
      organizationId,
      batchId
    }
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function getSuggestedAction(code: string, httpStatus: number): string {
  if (httpStatus === 401) return 'Please log in again'
  if (httpStatus === 403) return 'Contact your administrator for permission'
  if (httpStatus === 404) return 'Verify the resource exists in your organization'
  if (httpStatus === 400) return 'Review the error details and fix the data'
  if (httpStatus >= 500) return 'Please try again in a moment'
  return 'Contact support if the issue persists'
}

// ============================================================
// HTTP STATUS MAPPING
// ============================================================

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const
