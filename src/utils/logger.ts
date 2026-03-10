type LogLevel = "INFO" | "WARN" | "ERROR"

type LogContext = Record<string, unknown> | undefined

function formatLog(level: LogLevel, message: string, context?: LogContext) {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {})
  }
}

export function logInfo(message: string, context?: LogContext) {
  console.info(formatLog("INFO", message, context))
}

export function logWarn(message: string, context?: LogContext) {
  console.warn(formatLog("WARN", message, context))
}

export function logError(message: string, error?: unknown, context?: LogContext) {
  const errorContext = {
    ...(context ?? {}),
    ...(error
      ? {
          error:
            error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : { message: String(error) }
        }
      : {})
  }

  console.error(formatLog("ERROR", message, errorContext))
}

export function startTimer() {
  return performance.now()
}

export function elapsedMs(startedAt: number) {
  return Number((performance.now() - startedAt).toFixed(2))
}
