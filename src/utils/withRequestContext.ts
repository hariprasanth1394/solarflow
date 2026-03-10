import { getRequestContext } from "../lib/orgContext"

export async function withRequestContext<T>(handler: (context: { organizationId: string; userId: string }) => Promise<T>): Promise<T> {
  const context = await getRequestContext()
  return handler(context)
}
