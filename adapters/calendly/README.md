# Calendly Adapter

Maps ASP tools to the [Calendly Scheduling API v2](https://developer.calendly.com/api-docs).

## Tool Mapping

| ASP Tool | Calendly API | Notes |
|---|---|---|
| `get_capabilities` | Static declaration | Calendly has specific constraints (event types, not free-form) |
| `search_availability` | `GET /event_type_available_times` | TODO(verify: exact endpoint name and params) |
| `hold_slot` | Not natively supported | Calendly doesn't expose hold semantics; TODO(verify) |
| `book_appointment` | Scheduling links / `POST /scheduled_events` | TODO(verify: can you create events via API or only via scheduling links?) |
| `reschedule_appointment` | `POST /scheduled_events/{uuid}/reschedule` | TODO(verify: exact endpoint) |
| `cancel_appointment` | `POST /scheduled_events/{uuid}/cancellation` | TODO(verify: exact endpoint) |
| `get_booking` | `GET /scheduled_events/{uuid}` | Direct mapping |
| `export_ics` | Not directly available | Would need to construct ICS from event data |
| `subscribe_events` | Webhook subscriptions via `POST /webhook_subscriptions` | Calendly supports webhooks natively |

## Calendly's Own MCP Server

Calendly operates its own MCP server for ChatGPT integration. This creates two architectural options for the ASP Calendly adapter:

### Option A: Consume Calendly's MCP Directly

- **Pros:** Simpler integration, maintained by Calendly, stays up-to-date with their API changes automatically.
- **Cons:** ASP has no control over the tool schema; Calendly's MCP may not cover all ASP capabilities.

### Option B: Re-wrap Calendly Scheduling API via ASP Adapter

- **Pros:** Unified interface consistent with other ASP adapters, full control over behavior.
- **Cons:** Duplicates work that Calendly already maintains, requires tracking Calendly API changes independently.

### Recommendation

Consume the existing Calendly MCP server where it covers the required capability, and fall back to the direct Calendly REST API only for gaps. This means the Calendly adapter may act as a **thin translation layer** between ASP's tool schema and Calendly's MCP tool schema, rather than hitting the REST API directly.
