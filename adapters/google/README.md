# Google Calendar Adapter

Maps ASP tools to the [Google Calendar API v3](https://developers.google.com/calendar/api/v3/reference).

## Tool Mapping

| ASP Tool | Google Calendar API | Notes |
|---|---|---|
| `get_capabilities` | Static declaration | Google supports most features natively |
| `search_availability` | `freebusy.query` | Maps to FreeBusy API; TODO(verify: does freebusy.query return slot-level granularity or just busy periods?) |
| `hold_slot` | Not directly supported | Could emulate via tentative event creation; TODO(verify: tentative event behavior) |
| `book_appointment` | `events.insert` | Maps cleanly to event creation |
| `reschedule_appointment` | `events.patch` | Update start/end times |
| `cancel_appointment` | `events.delete` or `events.patch` with status=cancelled | TODO(verify: preferred cancellation method for preserving audit trail) |
| `get_booking` | `events.get` | Direct mapping |
| `export_ics` | `events.get` with `Accept: text/calendar` | TODO(verify: does Google Calendar API support ICS export via content negotiation?) |
| `subscribe_events` | `events.watch` (push notifications) | Uses Google Push Notifications channel; TODO(verify: webhook setup requirements) |

## OAuth Scopes Required

- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`
