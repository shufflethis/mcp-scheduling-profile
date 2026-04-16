/**
 * Tool: get_capabilities
 * Type: Read
 * Required capabilities: none
 * Error codes: E_PROVIDER_UNAVAILABLE, E_VALIDATION
 *
 * Returns the capability flags for a given provider adapter.
 * Clients MUST call this before invoking any other tool.
 *
 * Implementation: inline in server.ts (reference server).
 * Production servers SHOULD extract each tool handler into its own module.
 */
export const TOOL_NAME = 'get_capabilities';
