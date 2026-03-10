export type ServiceResult<T> = {
  data?: T
  error?: unknown
}

export type PagedResult<T> = {
  data: T[]
  error?: unknown
  count: number
}
