import { getOrganizationContext } from "../lib/orgContext"

export async function withOrganizationContext<T>(handler: (organizationId: string) => Promise<T>): Promise<T> {
  const organizationId = await getOrganizationContext()
  return handler(organizationId)
}
