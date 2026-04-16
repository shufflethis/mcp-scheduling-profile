/**
 * Tool: subscribe_events
 * Type: Write
 * Required capabilities: supports_webhooks
 * Error codes: E_PROVIDER_UNAVAILABLE, E_VALIDATION, E_CAPABILITY_UNSUPPORTED
 *
 * Registers a webhook subscription to receive booking change events
 * (booking.created, booking.updated, booking.cancelled) from the provider.
 * Returns a subscriptionId that can be used to manage the subscription.
 *
 * Clients MUST check supports_webhooks via get_capabilities before calling.
 * The callbackUrl must be a publicly reachable HTTPS endpoint.
 *
 * Implementation: inline in server.ts (reference server).
 * Production servers SHOULD extract each tool handler into its own module.
 */
export const TOOL_NAME = 'subscribe_events';
