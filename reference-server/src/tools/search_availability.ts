/**
 * Tool: search_availability
 * Type: Read
 * Required capabilities: none (core tool, always available)
 * Error codes: E_PROVIDER_UNAVAILABLE, E_VALIDATION, E_RATE_LIMITED
 *
 * Queries available time slots from a scheduling provider within a given
 * date range. Supports pagination via cursor for large result sets.
 * Returns slots in UTC; the timezone parameter is used for provider-side
 * business-hour filtering.
 *
 * Implementation: inline in server.ts (reference server).
 * Production servers SHOULD extract each tool handler into its own module.
 */
export const TOOL_NAME = 'search_availability';
