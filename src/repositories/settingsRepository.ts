import { supabase } from "../lib/supabaseClient"
import { Database } from "../types/database.types"
import { assertValidUUID, assertOptionalUUID } from "../utils/validateUUID"

const SETTINGS_TABLE = "organization_settings"

type OrganizationSettingsInsert = Database["public"]["Tables"]["organization_settings"]["Insert"]
type OrganizationSettingsUpdate = Database["public"]["Tables"]["organization_settings"]["Update"]

const SETTINGS_RETURN_COLUMNS = "id,company_name,logo_url,timezone,currency,language"

export const queryOrganizationSettings = async (organizationId: string) => {
  return supabase
    .from(SETTINGS_TABLE)
    .select(SETTINGS_RETURN_COLUMNS)
    .eq("organization_id", organizationId)
    .maybeSingle()
}

export const upsertOrganizationSettings = async (
  organizationId: string,
  payload: OrganizationSettingsUpdate,
  id?: string | null
) => {
  assertValidUUID(organizationId, "organizationId")
  assertOptionalUUID(id, "settingsId")
  
  const query = id
    ? supabase.from(SETTINGS_TABLE).update(payload).eq("id", id).eq("organization_id", organizationId)
    : supabase
        .from(SETTINGS_TABLE)
        .insert([{ ...(payload as OrganizationSettingsInsert), organization_id: organizationId }])

  return query.select(SETTINGS_RETURN_COLUMNS).single()
}
