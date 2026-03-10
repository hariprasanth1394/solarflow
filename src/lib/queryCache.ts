type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const queryCache = new Map<string, CacheEntry<unknown>>()

export async function getOrSetQueryCache<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const cached = queryCache.get(key)

  if (cached && cached.expiresAt > now) {
    return cached.value as T
  }

  const value = await loader()
  queryCache.set(key, { value, expiresAt: now + ttlMs })
  return value
}

export function invalidateQueryCacheByPrefix(prefix: string) {
  for (const key of queryCache.keys()) {
    if (key.startsWith(prefix)) {
      queryCache.delete(key)
    }
  }
}
