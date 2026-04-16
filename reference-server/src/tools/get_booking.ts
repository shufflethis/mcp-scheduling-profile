/**
 * Tool: get_booking
 * Type: Read
 * Required capabilities: none (core tool, always available)
 * Error codes: E_PROVIDER_UNAVAILABLE, E_VALIDATION, E_BOOKING_NOT_FOUND
 *
 * Fetches the full details of an existing booking by its bookingId,
 * including slot information, attendees, subject, notes, and metadata.
 *
 * Implementation: inline in server.ts (reference server).
 * Production servers SHOULD extract each tool handler into its own module.
 */
export const TOOL_NAME = 'get_booking';
