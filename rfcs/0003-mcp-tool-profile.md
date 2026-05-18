# ASP-0003: MCP Tool Profile

| Field    | Value            |
|----------|------------------|
| Status   | Draft            |
| Author   | ASP Working Group |
| Created  | 2026-04-16       |

## Abstract

This document defines the nine MCP tools that constitute the
Agentic Scheduling Profile (ASP).  For each tool it specifies the
name, purpose, input schema, output schema, error codes, idempotency
behavior, and required capabilities.  Together these tools form the
complete interface surface that ASP servers expose to LLM hosts.

## Motivation

MCP (Model Context Protocol) defines how LLM hosts discover and
invoke tools.  ASP defines which tools exist for scheduling and
how they behave.  ASP is therefore a profile on top of MCP, not a
replacement protocol.  Without a fixed tool profile, every scheduling
MCP server would invent its own tool names, schemas, and semantics.
LLM hosts would need per-server prompt engineering.

A fixed profile means: one set of tool names, one set of schemas,
predictable behavior.  LLM hosts can be trained or prompted once
for ASP, and that knowledge applies to every compliant server.

## Specification

### Design Rules

The following rules apply to ALL ASP tools.  Servers MUST enforce
them.  Clients SHOULD rely on them.

1. **One job per tool.**  Each tool performs exactly one operation.
   Compound operations (e.g., "search and book") require multiple
   tool calls.  This keeps tool descriptions short and unambiguous
   for LLM function calling.

2. **Reads and state-changing tools are strictly separated.**  Read
   tools (R) have no side effects and are safe to retry without
   limit.  State-changing tools (W) modify provider or subscription
   state and require host-side user confirmation.

3. **Booking lifecycle writes are idempotent.**  Booking lifecycle
   write tools accept a `clientIntentId` parameter.  Replaying the
   same `clientIntentId` with identical parameters MUST return the
   same result without creating duplicate state.  Subscription writes
   MUST deduplicate identical subscription requests.

4. **Booking lifecycle writes return BookingConfirmation.**  Booking
   lifecycle write tools MUST return a BookingConfirmation object
   (ASP-0002) as the top-level response, even for cancellations.
   Subscription tools return subscription objects.

5. **Every tool declares required provider features.**  The tool
   definition includes which provider capability flags (ASP-0004)
   the provider MUST support.  If the provider lacks a required
   feature, the server MUST reject the call with
   E_CAPABILITY_UNSUPPORTED.

6. **Errors are structured.**  Every error response MUST conform
   to the Error object (ASP-0002/ASP-0005).

### Tool Definitions

#### 1. get_capabilities

| Property             | Value |
|----------------------|-------|
| Name                 | `get_capabilities` |
| Purpose              | Return the provider's capability flags. |
| Read/Write           | R |
| Required Capabilities | None (always available). |
| Idempotency          | N/A (read-only). |

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "providerId": {
      "type": "string",
      "description": "Identifier of the scheduling provider."
    }
  },
  "required": ["providerId"]
}
```

**Output Schema:**

Returns a Capabilities object (ASP-0002, ASP-0004).

**Error Codes:**

| Code                    | When |
|-------------------------|------|
| E_PROVIDER_UNAVAILABLE  | Provider cannot be reached. |
| E_AUTH_REQUIRED         | No valid credentials for this provider. |

**MCP Tool Definition:**

```json
{
  "name": "get_capabilities",
  "description": "Return the scheduling capability flags for a provider. Call this before invoking any other ASP tool to discover what the provider supports.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "providerId": {
        "type": "string",
        "description": "Identifier of the scheduling provider."
      }
    },
    "required": ["providerId"]
  }
}
```

---

#### 2. search_availability

| Property             | Value |
|----------------------|-------|
| Name                 | `search_availability` |
| Purpose              | Query free slots for a given provider, date range, and duration. |
| Read/Write           | R |
| Required Capabilities | `supports_free_busy` |
| Idempotency          | N/A (read-only). |

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "providerId": {
      "type": "string",
      "description": "Identifier of the scheduling provider."
    },
    "dateRange": {
      "type": "object",
      "properties": {
        "start": {
          "type": "string",
          "format": "date-time",
          "description": "Start of the date range (UTC ISO 8601)."
        },
        "end": {
          "type": "string",
          "format": "date-time",
          "description": "End of the date range (UTC ISO 8601)."
        }
      },
      "required": ["start", "end"]
    },
    "duration": {
      "type": "string",
      "description": "Desired appointment duration (ISO 8601 duration, e.g. PT30M)."
    },
    "timezone": {
      "type": "string",
      "description": "IANA timezone identifier (e.g. America/New_York)."
    },
    "filters": {
      "type": "object",
      "description": "Optional provider-specific filters.",
      "additionalProperties": true
    },
    "cursor": {
      "type": "string",
      "description": "Pagination cursor from a previous truncated response."
    }
  },
  "required": ["providerId", "dateRange", "duration", "timezone"]
}
```

**Output Schema:**

Returns an AvailabilityResponse object (ASP-0002).

**Error Codes:**

| Code                      | When |
|---------------------------|------|
| E_CAPABILITY_UNSUPPORTED  | Provider does not support free/busy queries. |
| E_VALIDATION              | Invalid date range, duration, or timezone. |
| E_PROVIDER_UNAVAILABLE    | Provider cannot be reached. |
| E_AUTH_REQUIRED           | No valid credentials. |
| E_AUTH_SCOPE_INSUFFICIENT | Token lacks `scheduling:read` scope. |
| E_RATE_LIMITED            | Too many requests. |

**MCP Tool Definition:**

```json
{
  "name": "search_availability",
  "description": "Search for available appointment slots from a scheduling provider within a date range. Returns a list of bookable time slots.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "providerId": { "type": "string", "description": "Identifier of the scheduling provider." },
      "dateRange": {
        "type": "object",
        "properties": {
          "start": { "type": "string", "format": "date-time", "description": "Range start (UTC ISO 8601)." },
          "end": { "type": "string", "format": "date-time", "description": "Range end (UTC ISO 8601)." }
        },
        "required": ["start", "end"]
      },
      "duration": { "type": "string", "description": "Desired duration (ISO 8601, e.g. PT30M)." },
      "timezone": { "type": "string", "description": "IANA timezone (e.g. America/New_York)." },
      "filters": { "type": "object", "description": "Optional provider-specific filters.", "additionalProperties": true },
      "cursor": { "type": "string", "description": "Pagination cursor from a previous response." }
    },
    "required": ["providerId", "dateRange", "duration", "timezone"]
  }
}
```

---

#### 3. hold_slot

| Property             | Value |
|----------------------|-------|
| Name                 | `hold_slot` |
| Purpose              | Soft-reserve a slot before the user confirms. |
| Read/Write           | W |
| Required Capabilities | `supports_hold` |
| Idempotency          | Yes.  Same `clientIntentId` + same `slotId` = same hold. |

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "slotId": {
      "type": "string",
      "description": "The slot to hold."
    },
    "clientIntentId": {
      "type": "string",
      "description": "Idempotency key.  UUIDv4 recommended."
    },
    "holdDuration": {
      "type": "string",
      "description": "How long to hold (ISO 8601 duration). Server MAY cap this. Default: PT5M."
    }
  },
  "required": ["slotId", "clientIntentId"]
}
```

**Output Schema:**

Returns a BookingConfirmation with `status` = `"held"`.

The server SHOULD include a `holdExpiresAt` field in the
BookingConfirmation metadata indicating when the hold expires.

**Error Codes:**

| Code                      | When |
|---------------------------|------|
| E_CAPABILITY_UNSUPPORTED  | Provider does not support holds. |
| E_SLOT_UNAVAILABLE        | Slot already booked or held by another party. |
| E_IDEMPOTENCY_CONFLICT    | Same intent id, different parameters. |
| E_PROVIDER_UNAVAILABLE    | Provider cannot be reached. |
| E_AUTH_REQUIRED           | No valid credentials. |
| E_AUTH_SCOPE_INSUFFICIENT | Token lacks `scheduling:write` scope. |
| E_VALIDATION              | Invalid input. |

**MCP Tool Definition:**

```json
{
  "name": "hold_slot",
  "description": "Temporarily reserve (hold) a time slot before the user confirms booking. The hold expires after a provider-defined TTL. Requires supports_hold capability.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "slotId": { "type": "string", "description": "Slot to hold." },
      "clientIntentId": { "type": "string", "description": "Idempotency key (UUIDv4 recommended)." },
      "holdDuration": { "type": "string", "description": "Requested hold duration (ISO 8601). Server may cap." }
    },
    "required": ["slotId", "clientIntentId"]
  }
}
```

---

#### 4. book_appointment

| Property             | Value |
|----------------------|-------|
| Name                 | `book_appointment` |
| Purpose              | Confirm a booking for a specific slot. |
| Read/Write           | W |
| Required Capabilities | None (core tool, always available). |
| Idempotency          | Yes.  Same `clientIntentId` + same parameters = same booking. |

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "slotId": {
      "type": "string",
      "description": "The slot to book."
    },
    "clientIntentId": {
      "type": "string",
      "description": "Idempotency key.  UUIDv4 recommended."
    },
    "attendees": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "email": { "type": "string", "format": "email" }
        },
        "required": ["name", "email"]
      },
      "minItems": 1,
      "description": "Attendee list.  At least one attendee required."
    },
    "subject": {
      "type": "string",
      "description": "Subject line for the appointment."
    },
    "notes": {
      "type": "string",
      "description": "Optional notes for the provider."
    },
    "metadata": {
      "type": "object",
      "description": "Optional provider-specific data.",
      "additionalProperties": true
    }
  },
  "required": ["slotId", "clientIntentId", "attendees", "subject"]
}
```

**Output Schema:**

Returns a BookingConfirmation with `status` = `"confirmed"`.

**Error Codes:**

| Code                      | When |
|---------------------------|------|
| E_SLOT_UNAVAILABLE        | Slot no longer available. |
| E_IDEMPOTENCY_CONFLICT    | Same intent id, different parameters. |
| E_HOLD_EXPIRED            | Slot was held but hold expired before confirmation. |
| E_PROVIDER_UNAVAILABLE    | Provider cannot be reached. |
| E_AUTH_REQUIRED           | No valid credentials. |
| E_AUTH_SCOPE_INSUFFICIENT | Token lacks `scheduling:write` scope. |
| E_VALIDATION              | Invalid input (e.g., missing attendee, invalid email). |

**MCP Tool Definition:**

```json
{
  "name": "book_appointment",
  "description": "Confirm a booking for a specific time slot. This is a write operation that creates a committed appointment. The user MUST confirm before this tool is called.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "slotId": { "type": "string", "description": "Slot to book." },
      "clientIntentId": { "type": "string", "description": "Idempotency key (UUIDv4 recommended)." },
      "attendees": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": { "name": { "type": "string" }, "email": { "type": "string", "format": "email" } },
          "required": ["name", "email"]
        },
        "minItems": 1,
        "description": "Attendees for the appointment."
      },
      "subject": { "type": "string", "description": "Appointment subject." },
      "notes": { "type": "string", "description": "Optional notes." },
      "metadata": { "type": "object", "description": "Optional metadata.", "additionalProperties": true }
    },
    "required": ["slotId", "clientIntentId", "attendees", "subject"]
  }
}
```

---

#### 5. reschedule_appointment

| Property             | Value |
|----------------------|-------|
| Name                 | `reschedule_appointment` |
| Purpose              | Change the time of an existing booking. |
| Read/Write           | W |
| Required Capabilities | `supports_reschedule` |
| Idempotency          | Yes.  Same `clientIntentId` + same parameters = same reschedule. |

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "bookingId": {
      "type": "string",
      "description": "The existing booking to reschedule."
    },
    "newSlotId": {
      "type": "string",
      "description": "The new slot to move the booking to."
    },
    "clientIntentId": {
      "type": "string",
      "description": "Idempotency key.  UUIDv4 recommended."
    },
    "reason": {
      "type": "string",
      "description": "Optional reason for rescheduling."
    }
  },
  "required": ["bookingId", "newSlotId", "clientIntentId"]
}
```

**Output Schema:**

Returns a BookingConfirmation with `status` = `"rescheduled"`.
The `slot` field reflects the new slot.

**Error Codes:**

| Code                      | When |
|---------------------------|------|
| E_CAPABILITY_UNSUPPORTED  | Provider does not support rescheduling. |
| E_SLOT_UNAVAILABLE        | New slot no longer available. |
| E_IDEMPOTENCY_CONFLICT    | Same intent id, different parameters. |
| E_PROVIDER_UNAVAILABLE    | Provider cannot be reached. |
| E_AUTH_REQUIRED           | No valid credentials. |
| E_AUTH_SCOPE_INSUFFICIENT | Token lacks `scheduling:write` scope. |
| E_VALIDATION              | Invalid booking id or slot id. |

**MCP Tool Definition:**

```json
{
  "name": "reschedule_appointment",
  "description": "Move an existing booking to a different time slot. The user MUST confirm before this tool is called. Requires supports_reschedule capability.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "bookingId": { "type": "string", "description": "Existing booking to reschedule." },
      "newSlotId": { "type": "string", "description": "New slot to move the booking to." },
      "clientIntentId": { "type": "string", "description": "Idempotency key (UUIDv4 recommended)." },
      "reason": { "type": "string", "description": "Optional reason for rescheduling." }
    },
    "required": ["bookingId", "newSlotId", "clientIntentId"]
  }
}
```

---

#### 6. cancel_appointment

| Property             | Value |
|----------------------|-------|
| Name                 | `cancel_appointment` |
| Purpose              | Cancel an existing booking. |
| Read/Write           | W |
| Required Capabilities | None (core tool, always available). |
| Idempotency          | Yes.  Same `clientIntentId` + same `bookingId` = same cancellation. |

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "bookingId": {
      "type": "string",
      "description": "The booking to cancel."
    },
    "clientIntentId": {
      "type": "string",
      "description": "Idempotency key.  UUIDv4 recommended."
    },
    "reason": {
      "type": "string",
      "description": "Optional reason for cancellation."
    }
  },
  "required": ["bookingId", "clientIntentId"]
}
```

**Output Schema:**

Returns a BookingConfirmation with `status` = `"cancelled"`.

**Error Codes:**

| Code                      | When |
|---------------------------|------|
| E_IDEMPOTENCY_CONFLICT    | Same intent id, different parameters. |
| E_PROVIDER_UNAVAILABLE    | Provider cannot be reached. |
| E_AUTH_REQUIRED           | No valid credentials. |
| E_AUTH_SCOPE_INSUFFICIENT | Token lacks `scheduling:write` scope. |
| E_VALIDATION              | Invalid booking id. |

**MCP Tool Definition:**

```json
{
  "name": "cancel_appointment",
  "description": "Cancel an existing booking. The user MUST confirm before this tool is called. Returns the updated booking with cancelled status.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "bookingId": { "type": "string", "description": "Booking to cancel." },
      "clientIntentId": { "type": "string", "description": "Idempotency key (UUIDv4 recommended)." },
      "reason": { "type": "string", "description": "Optional cancellation reason." }
    },
    "required": ["bookingId", "clientIntentId"]
  }
}
```

---

#### 7. get_booking

| Property             | Value |
|----------------------|-------|
| Name                 | `get_booking` |
| Purpose              | Retrieve a booking by its id. |
| Read/Write           | R |
| Required Capabilities | None (core tool, always available). |
| Idempotency          | N/A (read-only). |

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "bookingId": {
      "type": "string",
      "description": "The booking to retrieve."
    }
  },
  "required": ["bookingId"]
}
```

**Output Schema:**

Returns a BookingConfirmation object reflecting the current state.

**Error Codes:**

| Code                      | When |
|---------------------------|------|
| E_VALIDATION              | Booking id not found. |
| E_PROVIDER_UNAVAILABLE    | Provider cannot be reached. |
| E_AUTH_REQUIRED           | No valid credentials. |
| E_AUTH_SCOPE_INSUFFICIENT | Token lacks `scheduling:read` scope. |

**MCP Tool Definition:**

```json
{
  "name": "get_booking",
  "description": "Retrieve the current state of a booking by its identifier. Returns the full booking confirmation object.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "bookingId": { "type": "string", "description": "Booking identifier to look up." }
    },
    "required": ["bookingId"]
  }
}
```

---

#### 8. export_ics

| Property             | Value |
|----------------------|-------|
| Name                 | `export_ics` |
| Purpose              | Export a booking as an iCalendar/ICS file. |
| Read/Write           | R |
| Required Capabilities | `supports_ics_export` |
| Idempotency          | N/A (read-only). |

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "bookingId": {
      "type": "string",
      "description": "The booking to export."
    }
  },
  "required": ["bookingId"]
}
```

**Output Schema:**

Returns an object with:

| Field       | Type   | Description |
|-------------|--------|-------------|
| bookingId   | string | The exported booking id. |
| icsData     | string | The iCalendar data as a string (VCALENDAR containing one VEVENT). |
| contentType | string | Always `"text/calendar; charset=utf-8"`. |

The `icsData` field MUST contain a valid iCalendar object
conforming to RFC 5545.  The VEVENT UID SHOULD correspond to
the `bookingId`.

**Error Codes:**

| Code                      | When |
|---------------------------|------|
| E_CAPABILITY_UNSUPPORTED  | Provider does not support ICS export. |
| E_VALIDATION              | Booking id not found. |
| E_PROVIDER_UNAVAILABLE    | Provider cannot be reached. |
| E_AUTH_REQUIRED           | No valid credentials. |
| E_AUTH_SCOPE_INSUFFICIENT | Token lacks `scheduling:export` scope. |

**MCP Tool Definition:**

```json
{
  "name": "export_ics",
  "description": "Export a booking as an iCalendar/ICS file for import into calendar applications. Requires supports_ics_export capability.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "bookingId": { "type": "string", "description": "Booking to export as ICS." }
    },
    "required": ["bookingId"]
  }
}
```

---

#### 9. subscribe_events

| Property             | Value |
|----------------------|-------|
| Name                 | `subscribe_events` |
| Purpose              | Subscribe to changes in a provider's bookings. |
| Read/Write           | W |
| Required Capabilities | `supports_webhooks` |
| Idempotency          | Duplicate subscriptions SHOULD be deduplicated by server. |

**Input Schema:**

```json
{
  "type": "object",
  "properties": {
    "providerId": {
      "type": "string",
      "description": "Provider to subscribe to."
    },
    "events": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["booking.created", "booking.updated", "booking.cancelled", "slot.released"]
      },
      "description": "Event types to subscribe to."
    },
    "callbackUrl": {
      "type": "string",
      "format": "uri",
      "description": "URL to receive webhook notifications."
    }
  },
  "required": ["providerId", "events", "callbackUrl"]
}
```

**Output Schema:**

Returns an object with:

| Field          | Type   | Description |
|----------------|--------|-------------|
| subscriptionId | string | Unique subscription identifier. |
| providerId     | string | The provider subscribed to. |
| events         | array  | Confirmed event types. |
| callbackUrl    | string | Confirmed callback URL. |
| createdAt      | string | Subscription creation time (UTC ISO 8601). |

**Error Codes:**

| Code                      | When |
|---------------------------|------|
| E_CAPABILITY_UNSUPPORTED  | Provider does not support webhooks. |
| E_VALIDATION              | Invalid callback URL or unknown event types. |
| E_PROVIDER_UNAVAILABLE    | Provider cannot be reached. |
| E_AUTH_REQUIRED           | No valid credentials. |
| E_AUTH_SCOPE_INSUFFICIENT | Token lacks `scheduling:subscribe` scope. |

**MCP Tool Definition:**

```json
{
  "name": "subscribe_events",
  "description": "Subscribe to webhook notifications for booking changes from a provider. Requires supports_webhooks capability.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "providerId": { "type": "string", "description": "Provider to subscribe to." },
      "events": {
        "type": "array",
        "items": { "type": "string", "enum": ["booking.created", "booking.updated", "booking.cancelled", "slot.released"] },
        "description": "Event types to subscribe to."
      },
      "callbackUrl": { "type": "string", "format": "uri", "description": "Webhook callback URL." }
    },
    "required": ["providerId", "events", "callbackUrl"]
  }
}
```

### Tool Summary Table

| # | Tool                     | R/W | Required Capabilities       | Idempotent |
|---|--------------------------|-----|-----------------------------|------------|
| 1 | `get_capabilities`       | R   | None                        | N/A        |
| 2 | `search_availability`    | R   | `supports_free_busy`        | N/A        |
| 3 | `hold_slot`              | W   | `supports_hold`             | Yes        |
| 4 | `book_appointment`       | W   | None                        | Yes        |
| 5 | `reschedule_appointment` | W   | `supports_reschedule`       | Yes        |
| 6 | `cancel_appointment`     | W   | None                        | Yes        |
| 7 | `get_booking`            | R   | None                        | N/A        |
| 8 | `export_ics`             | R   | `supports_ics_export`       | N/A        |
| 9 | `subscribe_events`       | W   | `supports_webhooks`         | Deduped    |

### Note on GPT Actions Compatibility

ASP is designed as an MCP profile.  However, the tool definitions
above map naturally to an OpenAPI specification.  Each tool becomes
a POST endpoint.  Input schemas become request bodies.  Output
schemas become response bodies.

An ASP server MAY expose an OpenAPI wrapper alongside its MCP
interface to support GPT Actions and other OpenAPI-based agent
frameworks.  The OpenAPI wrapper MUST preserve identical semantics:
same input schemas, same output schemas, same error codes, same
idempotency behavior.

The recommended URL structure for an OpenAPI wrapper is:

```
POST /asp/v1/capabilities
POST /asp/v1/availability/search
POST /asp/v1/slots/hold
POST /asp/v1/appointments/book
POST /asp/v1/appointments/{bookingId}/reschedule
POST /asp/v1/appointments/{bookingId}/cancel
GET  /asp/v1/appointments/{bookingId}
GET  /asp/v1/appointments/{bookingId}/export.ics
POST /asp/v1/subscriptions
```

## Rationale

### Why Nine Tools?

Nine tools cover the complete appointment lifecycle: discover
capabilities, search availability, optionally hold, book,
reschedule, cancel, retrieve, export, and subscribe.  Fewer
tools would require overloading.  More tools would fragment
simple operations.

### Why Is hold_slot Optional?

Not all providers support holds.  Many simple scheduling systems
go directly from "available" to "booked."  Making hold_slot
optional (gated by `supports_hold`) ensures ASP works with simple
providers while offering the feature to those that support it.

### Why clientIntentId on Every Write?

See ASP-0002, BookingIntent rationale.  Network failures are
common in agentic workflows where multiple tool calls happen in
sequence.  Idempotency keys prevent duplicate bookings, duplicate
cancellations, and duplicate reschedules.

### Why Separate book and reschedule?

Rescheduling involves atomic swap of two slots (releasing the old
one, claiming the new one).  This is semantically different from
a new booking.  Keeping them separate makes the operation explicit
and allows servers to enforce provider-specific reschedule policies
(e.g., minimum notice periods).

## Security Considerations

Tool inputs contain PII (attendee names, email addresses).
Servers MUST handle this data according to ASP-0006.

Write tools MUST require user confirmation before execution.
The MCP host is responsible for obtaining this confirmation.
Servers SHOULD log all write operations for audit purposes.

The `callbackUrl` in `subscribe_events` is a potential attack
vector.  Servers MUST validate that the callback URL is reachable,
uses HTTPS, and belongs to the authenticated client.  Servers
SHOULD implement callback verification (e.g., challenge-response)
before delivering events.

## References

- [RFC 2119] Bradner, S., "Key words for use in RFCs to Indicate
  Requirement Levels", BCP 14, RFC 2119, March 1997.
- [RFC 5545] Desruisseaux, B., "Internet Calendaring and
  Scheduling Core Object Specification (iCalendar)", RFC 5545,
  September 2009.
- [ASP-0002] ASP Working Group, "Object Model", ASP-0002, 2026.
- [ASP-0004] ASP Working Group, "Provider Feature Discovery",
  ASP-0004, 2026.
- [ASP-0005] ASP Working Group, "Error Model", ASP-0005, 2026.
- [ASP-0006] ASP Working Group, "Security and Authorization",
  ASP-0006, 2026.
- [MCP] Anthropic, "Model Context Protocol Specification", 2024.
