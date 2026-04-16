/**
 * Tool: hold_slot
 * Type: Write
 * Required capabilities: supports_hold
 * Error codes: E_PROVIDER_UNAVAILABLE, E_VALIDATION, E_SLOT_GONE, E_CAPABILITY_UNSUPPORTED
 *
 * Temporarily reserves a slot for a configurable TTL (default 300 s)
 * before the client confirms the booking. The hold automatically expires
 * if not converted into a booking within the TTL window.
 *
 * Clients MUST check supports_hold via get_capabilities before calling.
 *
 * Implementation: inline in server.ts (reference server).
 * Production servers SHOULD extract each tool handler into its own module.
 */
export const TOOL_NAME = 'hold_slot';
