import { logError, logWarn } from "../utils/logger"

type RepositorySourceError = {
  message: string
  code?: string
  details?: string
  hint?: string
} | null

export class RepositoryError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = "RepositoryError"
    this.code = code
  }
}

export function handleRepositoryError(service: string, operation: string, error: RepositorySourceError): never {
  if (!error) {
    throw new RepositoryError("Unknown database error")
  }

  if (error.code === "23505") {
    logWarn("Duplicate insert prevented", { service, operation, code: error.code, detail: error.details })
    throw new RepositoryError("Duplicate record detected", error.code)
  }

  logError("Repository operation failed", error, {
    service,
    operation,
    code: error.code,
    hint: error.hint,
    detail: error.details
  })
  throw new RepositoryError(error.message, error.code)
}
