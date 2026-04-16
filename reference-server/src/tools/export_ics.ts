/**
 * Tool: export_ics
 * Type: Read
 * Required capabilities: supports_ics_export
 * Error codes: E_PROVIDER_UNAVAILABLE, E_VALIDATION, E_BOOKING_NOT_FOUND, E_CAPABILITY_UNSUPPORTED
 *
 * Exports a booking as an iCalendar (RFC 5545) .ics file.
 * The returned text is a valid VCALENDAR object that can be
 * saved to a file or attached to an email.
 *
 * Clients MUST check supports_ics_export via get_capabilities before calling.
 *
 * Implementation: inline in server.ts (reference server).
 * Production servers SHOULD extract each tool handler into its own module.
 */
export const TOOL_NAME = 'export_ics';
