/**
 * Tool: book_appointment
 * Type: Write
 * Required capabilities: none (core tool, always available)
 * Error codes: E_PROVIDER_UNAVAILABLE, E_VALIDATION, E_SLOT_GONE, E_CONFLICT
 *
 * Confirms a booking for a specific slot. The clientIntentId parameter
 * serves as an idempotency key -- repeated calls with the same
 * clientIntentId return the original confirmation without creating
 * duplicate bookings.
 *
 * Requires at least one attendee with name and email.
 *
 * Implementation: inline in server.ts (reference server).
 * Production servers SHOULD extract each tool handler into its own module.
 */
export const TOOL_NAME = 'book_appointment';
