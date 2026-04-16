/**
 * Tool: cancel_appointment
 * Type: Write
 * Required capabilities: none (core tool, always available)
 * Error codes: E_PROVIDER_UNAVAILABLE, E_VALIDATION, E_BOOKING_NOT_FOUND
 *
 * Cancels an existing booking. The clientIntentId parameter provides
 * idempotency -- repeated calls with the same clientIntentId are safe
 * and return the same cancellation confirmation.
 *
 * The freed slot is returned to status 'available' in the response.
 *
 * Implementation: inline in server.ts (reference server).
 * Production servers SHOULD extract each tool handler into its own module.
 */
export const TOOL_NAME = 'cancel_appointment';
