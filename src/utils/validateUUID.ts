/**
 * UUID Validation Utility
 * Prevents undefined, null, or invalid UUID values from reaching Supabase queries
 */

/**
 * Regular expression for valid UUID v4 format
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a value is a valid UUID
 * Returns true only for valid UUID format, false for undefined, null, "undefined", or invalid UUIDs
 *
 * @param id - The value to validate
 * @returns true if valid UUID, false otherwise
 *
 * @example
 * validateUUID("550e8400-e29b-41d4-a716-446655440000") // true
 * validateUUID(undefined) // false
 * validateUUID(null) // false
 * validateUUID("undefined") // false
 * validateUUID("invalid-id") // false
 */
export function validateUUID(id: unknown): id is string {
  // Reject null, undefined, empty strings, non-strings
  if (id === null || id === undefined || id === "" || typeof id !== "string") {
    return false;
  }

  // Reject literal "undefined" or "null" strings
  if (id === "undefined" || id === "null") {
    return false;
  }

  // Validate UUID format (v4)
  return UUID_REGEX.test(id);
}

/**
 * Asserts that an ID is valid, throws with descriptive error if not
 * Use in services/repositories to catch invalid IDs early
 *
 * @param id - The ID to validate
 * @param context - Optional context string for error message (e.g., "customerId", "taskId")
 * @throws Error if ID is invalid
 *
 * @example
 * assertValidUUID(customerId, "customerId");
 */
export function assertValidUUID(id: unknown, context: string = "id"): asserts id is string {
  if (!validateUUID(id)) {
    throw new Error(`Invalid ${context}: expected valid UUID, got ${JSON.stringify(id)}`);
  }
}

/**
 * Type guard for optional UUID (allows undefined)
 * Useful for optional parameters
 *
 * @param id - The value to validate
 * @returns true if undefined or valid UUID, false otherwise
 *
 * @example
 * if (isOptionalUUID(filterId)) {
 *   // filterId is either undefined or a valid UUID
 * }
 */
export function isOptionalUUID(id: unknown): id is string | undefined {
  return id === undefined || validateUUID(id);
}

/**
 * Asserts that an ID is either undefined or a valid UUID
 * Use for optional ID parameters
 *
 * @param id - The ID to validate
 * @param context - Optional context string for error message
 * @throws Error if ID is provided but invalid
 */
export function assertOptionalUUID(id: unknown, context: string = "id"): asserts id is string | undefined {
  if (!isOptionalUUID(id)) {
    throw new Error(`Invalid ${context}: expected valid UUID or undefined, got ${JSON.stringify(id)}`);
  }
}
