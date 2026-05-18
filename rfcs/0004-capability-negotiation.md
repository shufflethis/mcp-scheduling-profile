# ASP-0004: Provider Feature Discovery

| Field    | Value            |
|----------|------------------|
| Status   | Draft            |
| Author   | ASP Working Group |
| Created  | 2026-04-16       |

## Abstract

This document specifies provider feature discovery for the Agentic
Scheduling Profile (ASP).  ASP uses `get_capabilities` to let
clients discover what a scheduling provider supports before invoking
tools that depend on provider-specific features.  This mechanism is
separate from MCP protocol capability negotiation, which determines
server/client support for MCP features such as tools, resources,
prompts, and UI extensions.

## Motivation

Scheduling providers differ substantially in their capabilities.

Google Calendar supports meeting links and free-busy queries but
does not support deposits or native hold-before-book flows.
Calendly supports round-robin assignment and rescheduling but
does not expose raw free-busy data.  A CalDAV server supports
free-busy and ICS export but typically does not generate meeting
links or support webhooks natively.

Without provider feature discovery, an LLM agent would attempt
tool calls blindly and encounter failures at runtime.  This produces
a poor user experience: the agent tries to hold a slot on a provider
that does not support holds, gets an error, and must recover.

Provider feature discovery solves this.  The client calls
`get_capabilities` once per provider and receives a complete map
of supported features.  The client then invokes only those tools
that the provider supports.  The LLM host can include capability
information in its prompt context to guide tool selection.

## Specification

### ProviderCapabilities Object

The ProviderCapabilities object is defined in ASP-0002.  This section
provides the normative specification of each flag.

A ProviderCapabilities object is a JSON object with provider identity
fields plus the boolean feature flags below.  All feature flags are
REQUIRED.  Servers MUST NOT omit any feature flag.  Servers MUST NOT
add non-boolean feature fields at the top level.  Extension
capabilities SHOULD be placed in a `metadata` object if needed.

### Provider Feature Flag Definitions

#### supports_hold

| Property    | Value |
|-------------|-------|
| Type        | boolean |
| Default     | false |

When `true`, the provider supports the `hold_slot` tool.  The
provider can temporarily reserve a time slot before the client
confirms the booking.  Hold duration is provider-defined.  Servers
SHOULD communicate the hold TTL in the BookingConfirmation metadata.

When `false`, clients MUST NOT call `hold_slot`.  Clients SHOULD
proceed directly from `search_availability` to `book_appointment`.

#### supports_reschedule

| Property    | Value |
|-------------|-------|
| Type        | boolean |
| Default     | false |

When `true`, the provider supports the `reschedule_appointment`
tool.  The provider can atomically move a booking from one slot
to another.

When `false`, clients MUST NOT call `reschedule_appointment`.
Clients MAY achieve a reschedule by cancelling the existing
booking and creating a new one, but this is not atomic and
risks the new slot being taken between cancel and book.

#### supports_group_booking

| Property    | Value |
|-------------|-------|
| Type        | boolean |
| Default     | false |

When `true`, the provider accepts multiple attendees in a single
`book_appointment` call.  The provider manages group scheduling
(invitations, RSVPs, capacity limits).

When `false`, the `attendees` array in BookingIntent MUST contain
exactly one element.  Servers MUST reject requests with multiple
attendees by returning E_VALIDATION.

#### supports_meeting_link

| Property    | Value |
|-------------|-------|
| Type        | boolean |
| Default     | false |

When `true`, the provider can generate a virtual meeting link
(e.g., Google Meet, Zoom, Microsoft Teams) as part of the booking
process.  The link appears in the BookingConfirmation `meetingLink`
field.

When `false`, the `meetingLink` field will always be `null` or
absent.  Clients SHOULD NOT promise users a meeting link.

#### supports_deposit

| Property    | Value |
|-------------|-------|
| Type        | boolean |
| Default     | false |

When `true`, the provider can collect a deposit at booking time.
This capability is declared for forward compatibility.  ASP v1
does NOT define deposit-related tools or fields.  This flag
signals that a future ASP version MAY add deposit support for
this provider.

When `false`, no deposit functionality is available.

#### supports_webhooks

| Property    | Value |
|-------------|-------|
| Type        | boolean |
| Default     | false |

When `true`, the provider supports the `subscribe_events` tool.
The provider can push notifications to a callback URL when
bookings are created, updated, or cancelled.

When `false`, clients MUST NOT call `subscribe_events`.  Clients
MUST poll `get_booking` to detect changes.

#### supports_round_robin

| Property    | Value |
|-------------|-------|
| Type        | boolean |
| Default     | false |

When `true`, the provider supports round-robin assignment of
appointments across multiple practitioners or resources.  The
specific practitioner is assigned automatically by the provider.

When `false`, the provider assigns appointments to a fixed
practitioner or requires the client to specify one.

#### supports_resource_booking

| Property    | Value |
|-------------|-------|
| Type        | boolean |
| Default     | false |

When `true`, the provider supports booking physical resources
such as meeting rooms, equipment, or facilities in addition to
time slots.

When `false`, only time-based scheduling is available.

#### supports_free_busy

| Property    | Value |
|-------------|-------|
| Type        | boolean |
| Default     | false |

When `true`, the provider supports the `search_availability`
tool.  The provider can return free/busy data and available
slots for a given date range.

When `false`, clients MUST NOT call `search_availability`.
The client must obtain slot information through other means
(e.g., a known booking link or provider-specific flow).

#### supports_ics_export

| Property    | Value |
|-------------|-------|
| Type        | boolean |
| Default     | false |

When `true`, the provider supports the `export_ics` tool.
Bookings can be exported as iCalendar/ICS files conforming
to RFC 5545.

When `false`, clients MUST NOT call `export_ics`.

#### supports_idempotent_writes

| Property    | Value |
|-------------|-------|
| Type        | boolean |
| Default     | false |

When `true`, the provider guarantees that write operations
(`book_appointment`, `reschedule_appointment`,
`cancel_appointment`, `hold_slot`) are idempotent with respect
to `clientIntentId`.  Replaying the same intent with the same
parameters produces the same result.

When `false`, the provider does not guarantee idempotency.
Clients SHOULD still send `clientIntentId` (it is REQUIRED
by the tool schemas), but the server MAY ignore it.  Clients
MUST implement their own duplicate detection logic when this
flag is `false`.

### Protocol Rules

1. **Client MUST call `get_capabilities` first.**  Before invoking
   any tool other than `get_capabilities` itself, the client MUST
   call `get_capabilities` for the target provider.  Clients
   SHOULD cache the result for the duration of the session.

2. **Server MUST declare honestly.**  A server MUST NOT claim a
   provider feature it does not fully support.  Partial support MUST
   be declared as `false`.  A provider that supports holds only
   for certain appointment types MUST declare `supports_hold`
   as `false` and handle holds through provider-specific metadata.

3. **Missing provider feature yields structured error.**  If a client
   calls a tool that requires a feature the provider does not
   support, the server MUST return error code
   E_CAPABILITY_UNSUPPORTED (see ASP-0005).  The error MUST
   include the name of the missing provider feature in the `details`
   object.

4. **Never silent degradation.**  A server MUST NOT silently
   skip a requested operation because of a missing provider feature.
   It MUST return E_CAPABILITY_UNSUPPORTED.  The client (or the
   LLM host) can then decide how to proceed.

5. **Provider capabilities are per-provider.**  A single ASP server MAY
   host multiple providers with different provider capabilities.  Each
   call to `get_capabilities` returns the capabilities for a
   specific `providerId`.

6. **Provider capabilities MAY change.**  Providers MAY gain or lose
   capabilities over time (e.g., a provider enables webhooks).
   Clients SHOULD re-fetch capabilities periodically in
   long-running sessions.  Servers SHOULD include a
   `Cache-Control` hint in the response metadata.

### Example: Google Calendar Provider

```json
{
  "supports_hold": false,
  "supports_reschedule": true,
  "supports_group_booking": true,
  "supports_meeting_link": true,
  "supports_deposit": false,
  "supports_webhooks": true,
  "supports_round_robin": false,
  "supports_resource_booking": true,
  "supports_free_busy": true,
  "supports_ics_export": true,
  "supports_idempotent_writes": true
}
```

Notes:
- `supports_hold`: false.  Google Calendar does not have a native
  hold-before-book mechanism.  TODO(verify): Google Appointment
  Scheduling may support a form of hold.
- `supports_meeting_link`: true.  Google Meet links can be
  generated automatically.
- `supports_resource_booking`: true.  Google Workspace supports
  room resources.
- `supports_round_robin`: false.  TODO(verify): Google Appointment
  Scheduling may support round-robin.

### Example: Calendly Provider

```json
{
  "supports_hold": false,
  "supports_reschedule": true,
  "supports_group_booking": true,
  "supports_meeting_link": true,
  "supports_deposit": false,
  "supports_webhooks": true,
  "supports_round_robin": true,
  "supports_resource_booking": false,
  "supports_free_busy": true,
  "supports_ics_export": true,
  "supports_idempotent_writes": true
}
```

Notes:
- `supports_hold`: false.  TODO(verify): Calendly may support
  a hold-like feature through their API.
- `supports_round_robin`: true.  Calendly natively supports
  round-robin event types.
- `supports_resource_booking`: false.  Calendly is person-centric,
  not resource-centric.
- `supports_free_busy`: true.  Available via Calendly's scheduling
  API.  TODO(verify): exact API surface for external free-busy
  queries.

### Example: CalDAV Provider

```json
{
  "supports_hold": false,
  "supports_reschedule": true,
  "supports_group_booking": true,
  "supports_meeting_link": false,
  "supports_deposit": false,
  "supports_webhooks": false,
  "supports_round_robin": false,
  "supports_resource_booking": false,
  "supports_free_busy": true,
  "supports_ics_export": true,
  "supports_idempotent_writes": false
}
```

Notes:
- `supports_meeting_link`: false.  CalDAV is a calendar access
  protocol; it does not generate video conferencing links.
- `supports_webhooks`: false.  Standard CalDAV does not support
  push notifications.  TODO(verify): CalDAV with RFC 6578
  (WebDAV Sync) could enable polling-based change detection,
  but this is not the same as webhooks.
- `supports_idempotent_writes`: false.  CalDAV does not natively
  support idempotency keys.  The ASP server wrapping CalDAV MAY
  implement idempotency at the adapter level, in which case this
  flag SHOULD be set to `true`.
- `supports_free_busy`: true.  CalDAV supports free-busy queries
  via the CALDAV:free-busy-query REPORT.

### Provider-Feature-to-Tool Mapping

For reference, this table shows which provider features gate which
tools.

| Provider Feature            | Gated Tool(s)              |
|-----------------------------|----------------------------|
| `supports_hold`             | `hold_slot`                |
| `supports_reschedule`       | `reschedule_appointment`   |
| `supports_free_busy`        | `search_availability`      |
| `supports_ics_export`       | `export_ics`               |
| `supports_webhooks`         | `subscribe_events`         |
| `supports_group_booking`    | (validation on `book_appointment` attendees array) |
| `supports_meeting_link`     | (presence of `meetingLink` in BookingConfirmation) |
| `supports_deposit`          | (reserved for future use)  |
| `supports_round_robin`      | (informational; affects provider assignment behavior) |
| `supports_resource_booking` | (informational; affects slot metadata) |
| `supports_idempotent_writes`| (client retry safety)      |

## Rationale

### Why Booleans and Not Feature Versions?

Boolean flags are the simplest possible discovery mechanism.
They answer "can you do this?" with yes or no.  Versioned
capabilities (e.g., `hold: 2`) add complexity without clear
benefit at this stage.  If a provider feature needs versioning in the
future, it can be expressed as a new flag (e.g.,
`supports_hold_v2`).

### Why All Fields Required?

Requiring all fields prevents ambiguity.  If a field were optional,
clients could not distinguish between "the server forgot to
include this" and "the provider does not support this."  Explicit
declaration of every flag eliminates this class of bugs.

### Why Per-Provider, Not Per-Server?

A single ASP server might front multiple providers (e.g., a
multi-calendar aggregator).  Google Calendar and a CalDAV server
have different capabilities.  Per-provider feature flags allow
accurate representation in this scenario.

### Why Not Auto-Detect from Tool Calls?

Auto-detection (try it and see if it fails) wastes tokens, creates
a poor user experience, and introduces race conditions.  Explicit
provider feature discovery is cheaper and more reliable.

## Security Considerations

Capability responses do not contain PII.  However, the set of
supported capabilities reveals information about the provider's
technology stack (e.g., CalDAV vs. cloud API).  This information
is generally not sensitive, but servers MAY omit or generalize
certain metadata if the provider considers stack details
confidential.

Servers MUST NOT require elevated permissions to call
`get_capabilities`.  A `scheduling:read` scope (or even
unauthenticated access) SHOULD suffice.  This ensures clients can
discover capabilities before requesting write permissions.

The `get_capabilities` response SHOULD be cacheable.  Servers
SHOULD include appropriate cache headers or metadata.  Clients
MUST NOT cache capabilities indefinitely; a reasonable default
is one hour.

## References

- [RFC 2119] Bradner, S., "Key words for use in RFCs to Indicate
  Requirement Levels", BCP 14, RFC 2119, March 1997.
- [RFC 4791] Daboo, C., Desruisseaux, B., and L. Dusseault,
  "Calendaring Extensions to WebDAV (CalDAV)", RFC 4791,
  March 2007.
- [RFC 6578] Daboo, C., and A. Quillaud, "Collection
  Synchronization for WebDAV", RFC 6578, March 2012.
- [ASP-0002] ASP Working Group, "Object Model", ASP-0002, 2026.
- [ASP-0003] ASP Working Group, "MCP Tool Profile", ASP-0003, 2026.
- [ASP-0005] ASP Working Group, "Error Model", ASP-0005, 2026.
