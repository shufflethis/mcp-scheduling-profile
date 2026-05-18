# ASP-0002: Object Model

| Field    | Value            |
|----------|------------------|
| Status   | Draft            |
| Author   | ASP Working Group |
| Created  | 2026-04-16       |

## Abstract

This document defines the canonical object model for the Agentic
Scheduling Profile (ASP).  The object model is JSCalendar-oriented
(RFC 8984) and JSON-native.  iCalendar/ICS (RFC 5545) serves as
the boundary format for import and export only.  All ASP tools
consume and produce objects defined in this specification.

## Motivation

A shared object model is a prerequisite for interoperability.
Without one, each ASP server would invent its own shapes for
slots, bookings, and errors.  Clients would need per-server
parsing logic, defeating the purpose of a vendor-neutral profile.

JSCalendar (RFC 8984) provides a mature, JSON-native data model
for calendar objects.  ASP adopts JSCalendar's design principles
— extensibility, clean typing, UTC timestamps — while defining
scheduling-specific objects that JSCalendar does not cover (slots,
availability queries, booking intents).

## Specification

### General Rules

1. All timestamps MUST be in UTC, formatted as ISO 8601 strings
   (e.g., `"2026-05-01T14:00:00Z"`).

2. All durations MUST use ISO 8601 duration format (e.g.,
   `"PT30M"` for 30 minutes, `"PT1H"` for one hour).

3. All object identifiers (`id`, `bookingId`, `providerId`,
   `slotId`) MUST be non-empty strings.  Servers SHOULD use
   UUIDs or similarly collision-resistant identifiers.

4. All objects MUST be serializable as JSON.  Servers MUST NOT
   include non-JSON-serializable values.

5. Fields marked REQUIRED MUST be present.  Fields marked
   OPTIONAL MAY be omitted.  Clients MUST tolerate the absence
   of OPTIONAL fields.

6. Unknown fields MUST be preserved by intermediaries and
   SHOULD be ignored by consumers that do not understand them.
   This ensures forward compatibility.

### Slot

A Slot represents a bookable unit of time offered by a provider.

#### JSCalendar Mapping

A Slot corresponds to a constrained JSCalendar Event (RFC 8984,
Section 4.1) with `@type` = `"Event"`, `start`, `duration`, and
custom `asp:` extension properties for `status` and `providerId`.

In iCalendar terms, a Slot maps to a VEVENT with X-ASP-STATUS
and X-ASP-PROVIDER-ID properties.

#### Fields

| Field       | Type     | Required | Description |
|-------------|----------|----------|-------------|
| id          | string   | REQUIRED | Unique slot identifier assigned by the server. |
| start       | string   | REQUIRED | Start time in UTC ISO 8601 format. |
| end         | string   | REQUIRED | End time in UTC ISO 8601 format. |
| providerId  | string   | REQUIRED | Identifier of the scheduling provider. |
| duration    | string   | REQUIRED | Slot duration in ISO 8601 duration format. MUST equal `end - start`. |
| status      | string   | REQUIRED | One of: `"available"`, `"held"`, `"booked"`. |
| metadata    | object   | OPTIONAL | Arbitrary key-value pairs for provider-specific data. |

#### Invariants

- `end` MUST be strictly after `start`.
- `duration` MUST equal the difference between `start` and `end`.
- `status` MUST be one of the three defined values.  Servers
  MUST NOT return other status values for Slot objects.

#### Example

```json
{
  "id": "slot-2026-05-01-1400-drcarter",
  "start": "2026-05-01T14:00:00Z",
  "end": "2026-05-01T14:30:00Z",
  "providerId": "provider-drcarter-dental",
  "duration": "PT30M",
  "status": "available",
  "metadata": {
    "location": "Suite 200, 123 Main St",
    "appointmentType": "cleaning"
  }
}
```

### AvailabilityQuery

An AvailabilityQuery is the input to the `search_availability`
tool.  It describes what the client is looking for.

#### Fields

| Field       | Type     | Required | Description |
|-------------|----------|----------|-------------|
| providerId  | string   | REQUIRED | Which provider to query. |
| dateRange   | object   | REQUIRED | Object with `start` (string, UTC ISO 8601) and `end` (string, UTC ISO 8601). |
| duration    | string   | REQUIRED | Desired appointment duration in ISO 8601 duration format. |
| timezone    | string   | REQUIRED | IANA timezone identifier (e.g., `"America/New_York"`). Used for display and day-boundary calculations. |
| filters     | object   | OPTIONAL | Provider-specific filters (e.g., appointment type, practitioner, location). |

#### Invariants

- `dateRange.end` MUST be strictly after `dateRange.start`.
- `dateRange` SHOULD NOT span more than 90 days.  Servers MAY
  reject queries spanning more than 90 days with E_VALIDATION.
- `timezone` MUST be a valid IANA timezone identifier.

#### Example

```json
{
  "providerId": "provider-drcarter-dental",
  "dateRange": {
    "start": "2026-05-01T00:00:00Z",
    "end": "2026-05-07T23:59:59Z"
  },
  "duration": "PT30M",
  "timezone": "America/New_York",
  "filters": {
    "appointmentType": "cleaning",
    "practitioner": "Dr. Carter"
  }
}
```

### AvailabilityResponse

An AvailabilityResponse is returned by the `search_availability`
tool.

#### Fields

| Field       | Type     | Required | Description |
|-------------|----------|----------|-------------|
| providerId  | string   | REQUIRED | The provider that was queried. |
| slots       | array    | REQUIRED | Array of Slot objects with status `"available"`. MAY be empty. |
| truncated   | boolean  | REQUIRED | `true` if results were truncated due to pagination limits. |
| nextCursor  | string   | OPTIONAL | Opaque pagination cursor.  Present if and only if `truncated` is `true`. |

#### Invariants

- If `truncated` is `true`, `nextCursor` MUST be present and
  non-empty.
- If `truncated` is `false`, `nextCursor` MUST NOT be present.
- All Slot objects in `slots` MUST have `status` = `"available"`.

#### Example

```json
{
  "providerId": "provider-drcarter-dental",
  "slots": [
    {
      "id": "slot-2026-05-01-1400-drcarter",
      "start": "2026-05-01T14:00:00Z",
      "end": "2026-05-01T14:30:00Z",
      "providerId": "provider-drcarter-dental",
      "duration": "PT30M",
      "status": "available",
      "metadata": { "appointmentType": "cleaning" }
    },
    {
      "id": "slot-2026-05-01-1500-drcarter",
      "start": "2026-05-01T15:00:00Z",
      "end": "2026-05-01T15:30:00Z",
      "providerId": "provider-drcarter-dental",
      "duration": "PT30M",
      "status": "available",
      "metadata": { "appointmentType": "cleaning" }
    }
  ],
  "truncated": false
}
```

### BookingIntent

A BookingIntent is the input to the `book_appointment` tool.
It represents the client's intention to book a specific slot.

#### Fields

| Field          | Type     | Required | Description |
|----------------|----------|----------|-------------|
| slotId         | string   | REQUIRED | The Slot id to book. |
| clientIntentId | string   | REQUIRED | Idempotency key.  Clients MUST generate a unique value per logical booking attempt.  UUIDv4 is RECOMMENDED. |
| attendees      | array    | REQUIRED | Array of attendee objects.  Each attendee MUST have `name` (string) and `email` (string).  Additional fields are OPTIONAL. |
| subject        | string   | REQUIRED | Human-readable subject line for the appointment. |
| notes          | string   | OPTIONAL | Free-text notes visible to the provider. |
| metadata       | object   | OPTIONAL | Arbitrary key-value pairs for provider-specific data. |

#### JSCalendar Mapping

A BookingIntent maps to the creation of a JSCalendar Event with:
- `title` = `subject`
- `participants` = `attendees` mapped to JSCalendar Participant
  objects (RFC 8984, Section 4.4.5)
- `description` = `notes`

#### Idempotency

If a server receives a BookingIntent with a `clientIntentId` that
it has already processed:
- If the parameters are identical, the server MUST return the
  original BookingConfirmation.  It MUST NOT create a duplicate
  booking.
- If the parameters differ, the server MUST return error
  E_IDEMPOTENCY_CONFLICT.

#### Example

```json
{
  "slotId": "slot-2026-05-01-1400-drcarter",
  "clientIntentId": "intent-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "attendees": [
    {
      "name": "Alice Johnson",
      "email": "alice@example.com"
    }
  ],
  "subject": "Dental Cleaning",
  "notes": "First visit. Please prepare new patient forms.",
  "metadata": {
    "source": "chatgpt-assistant",
    "conversationId": "conv-xyz-123"
  }
}
```

### BookingConfirmation

A BookingConfirmation is returned by all write tools
(`book_appointment`, `reschedule_appointment`,
`cancel_appointment`, `hold_slot`).  It represents the current
state of a booking after the write operation.

#### Fields

| Field          | Type     | Required | Description |
|----------------|----------|----------|-------------|
| bookingId      | string   | REQUIRED | Unique booking identifier assigned by the server. |
| clientIntentId | string   | REQUIRED | The idempotency key from the original request. |
| status         | string   | REQUIRED | One of: `"confirmed"`, `"cancelled"`, `"rescheduled"`, `"held"`. |
| slot           | object   | REQUIRED | The Slot object associated with this booking. |
| provider       | object   | REQUIRED | Provider summary object with at minimum `id` (string) and `name` (string). |
| createdAt      | string   | REQUIRED | Timestamp of original booking creation in UTC ISO 8601. |
| updatedAt      | string   | REQUIRED | Timestamp of last modification in UTC ISO 8601. |
| attendees      | array    | OPTIONAL | Array of attendee objects as submitted. |
| meetingLink    | string   | OPTIONAL | URL for virtual meeting, if provider generated one. |
| icsDownloadUrl | string   | OPTIONAL | URL to download ICS file for this booking. |

#### JSCalendar Mapping

A BookingConfirmation corresponds to a JSCalendar Event with
additional `asp:` extension properties for `bookingId`,
`clientIntentId`, and `status`.

In iCalendar terms, it maps to a VEVENT with UID = `bookingId`,
STATUS mapped from ASP status (confirmed -> CONFIRMED,
cancelled -> CANCELLED, held -> TENTATIVE), and X-ASP-*
properties for ASP-specific fields.

#### Invariants

- `status` MUST be one of the four defined values.
- `slot.status` SHOULD reflect the booking status (e.g., if
  `status` is `"confirmed"`, `slot.status` SHOULD be `"booked"`).
- `updatedAt` MUST be greater than or equal to `createdAt`.

#### Example

```json
{
  "bookingId": "booking-98765-drcarter",
  "clientIntentId": "intent-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "confirmed",
  "slot": {
    "id": "slot-2026-05-01-1400-drcarter",
    "start": "2026-05-01T14:00:00Z",
    "end": "2026-05-01T14:30:00Z",
    "providerId": "provider-drcarter-dental",
    "duration": "PT30M",
    "status": "booked"
  },
  "provider": {
    "id": "provider-drcarter-dental",
    "name": "Dr. Carter's Dental Office"
  },
  "createdAt": "2026-04-28T10:15:30Z",
  "updatedAt": "2026-04-28T10:15:30Z",
  "attendees": [
    {
      "name": "Alice Johnson",
      "email": "alice@example.com"
    }
  ],
  "meetingLink": null,
  "icsDownloadUrl": "https://api.example.com/bookings/booking-98765-drcarter/export.ics"
}
```

### ProviderCapabilities

A ProviderCapabilities object describes what a provider supports.
See ASP-0004 for the full specification of provider feature discovery.

#### Fields

| Field                        | Type    | Required | Description |
|------------------------------|---------|----------|-------------|
| supports_hold                | boolean | REQUIRED | Provider supports soft-reserving a slot before confirmation. |
| supports_reschedule          | boolean | REQUIRED | Provider supports changing the time of an existing booking. |
| supports_group_booking       | boolean | REQUIRED | Provider supports multiple attendees per slot. |
| supports_meeting_link        | boolean | REQUIRED | Provider can generate virtual meeting links. |
| supports_deposit             | boolean | REQUIRED | Provider accepts deposits at booking time. |
| supports_webhooks            | boolean | REQUIRED | Provider can push event changes via webhooks. |
| supports_round_robin         | boolean | REQUIRED | Provider supports round-robin assignment across practitioners. |
| supports_resource_booking    | boolean | REQUIRED | Provider supports booking physical resources (rooms, equipment). |
| supports_free_busy           | boolean | REQUIRED | Provider can return free/busy data. |
| supports_ics_export          | boolean | REQUIRED | Provider can export bookings as ICS files. |
| supports_idempotent_writes   | boolean | REQUIRED | Provider guarantees idempotent write operations. |

All feature flags are REQUIRED.  Servers MUST declare every flag
explicitly.  Omission is a profile violation.

#### Example

```json
{
  "supports_hold": true,
  "supports_reschedule": true,
  "supports_group_booking": false,
  "supports_meeting_link": true,
  "supports_deposit": false,
  "supports_webhooks": true,
  "supports_round_robin": false,
  "supports_resource_booking": false,
  "supports_free_busy": true,
  "supports_ics_export": true,
  "supports_idempotent_writes": true
}
```

### Error

An Error object is returned whenever a tool invocation fails.
See ASP-0005 for the full error model specification.

#### Fields

| Field     | Type    | Required | Description |
|-----------|---------|----------|-------------|
| code      | string  | REQUIRED | Machine-readable error code (e.g., `"E_SLOT_UNAVAILABLE"`). |
| message   | string  | REQUIRED | Human-readable error description. |
| retryable | boolean | REQUIRED | `true` if the client MAY retry the same request (possibly after a delay). |
| details   | object  | OPTIONAL | Additional structured information about the error. |

#### Example

```json
{
  "code": "E_SLOT_UNAVAILABLE",
  "message": "The requested slot is no longer available. Another party booked it.",
  "retryable": true,
  "details": {
    "slotId": "slot-2026-05-01-1400-drcarter",
    "suggestion": "Call search_availability to find alternative slots."
  }
}
```

## Rationale

### Why JSCalendar-Oriented, Not Pure JSCalendar?

Pure JSCalendar objects (RFC 8984) do not cover scheduling-specific
concepts like slot status, booking intent, or idempotency keys.
ASP extends JSCalendar's design philosophy (JSON-native, clean
typing, UTC timestamps) with scheduling-specific objects.  Where
a direct JSCalendar mapping exists (events, participants, durations),
ASP uses it.  Where no mapping exists (slot status, booking
confirmation), ASP defines new objects following JSCalendar
conventions.

### Why Separate Slot and BookingConfirmation?

A Slot represents potential time.  A BookingConfirmation represents
committed time.  Conflating them would force clients to inspect
status fields to determine whether they are looking at an offer
or a commitment.  Separate types make the distinction explicit
at the type level.

### Why clientIntentId on BookingIntent?

Network failures between LLM hosts and MCP servers are common.
Without idempotency keys, a retried booking attempt could create
a duplicate appointment.  The `clientIntentId` field ensures that
retries are safe.  This pattern is borrowed from payment processing
(Stripe's idempotency keys) where it has proven effective.

### Why attendees as an Array?

Even for single-attendee appointments, using an array provides
forward compatibility with group bookings.  Servers that do not
support group booking (see `supports_group_booking` capability)
SHOULD validate that the array contains exactly one element and
return E_VALIDATION otherwise.

## Security Considerations

The object model defines data structures, not transport mechanisms.
Security considerations for transport and access control are
addressed in ASP-0006.

Objects in this model contain PII (attendee names, email addresses,
appointment subjects, notes).  Implementations:

- MUST minimize PII in logs (see ASP-0006).
- MUST NOT include PII in tool names or descriptions.
- SHOULD redact attendee email addresses in debug output.
- MUST encrypt objects at rest if persisted.

The `metadata` field on Slot, BookingIntent, and BookingConfirmation
is intentionally open-ended.  Servers MUST validate metadata
values and MUST NOT execute code embedded in metadata fields.

## References

- [RFC 2119] Bradner, S., "Key words for use in RFCs to Indicate
  Requirement Levels", BCP 14, RFC 2119, March 1997.
- [RFC 5545] Desruisseaux, B., "Internet Calendaring and
  Scheduling Core Object Specification (iCalendar)", RFC 5545,
  September 2009.
- [RFC 8984] Jenkins, N., and R. Stepanek, "JSCalendar: A JSON
  Representation of Calendar Data", RFC 8984, July 2021.
- [ASP-0001] ASP Working Group, "Problem Statement — Agentic
  Scheduling in the MCP Era", ASP-0001, 2026.
- [ASP-0004] ASP Working Group, "Provider Feature Discovery",
  ASP-0004, 2026.
- [ASP-0005] ASP Working Group, "Error Model", ASP-0005, 2026.
- [ASP-0006] ASP Working Group, "Security and Authorization",
  ASP-0006, 2026.
