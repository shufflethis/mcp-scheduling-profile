/**
 * Tool: reschedule_appointment
 * Type: Write
 * Required capabilities: supports_reschedule
 * Error codes: E_PROVIDER_UNAVAILABLE, E_VALIDATION, E_SLOT_GONE, E_BOOKING_NOT_FOUND, E_CAPABILITY_UNSUPPORTED
 *
 * Moves an existing booking to a new time slot in a single atomic
 * operation. The clientIntentId parameter provides idempotency.
 * If the provider does not support reschedule, the client must
 * cancel + rebook manually.
 *
 * Implementation: inline in server.ts (reference server).
 * Production servers SHOULD extract each tool handler into its own module.
 */
export const TOOL_NAME = 'reschedule_appointment';
