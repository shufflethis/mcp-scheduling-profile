# CalDAV Adapter

Maps ASP tools to [CalDAV](https://tools.ietf.org/html/rfc4791) and [iTIP](https://tools.ietf.org/html/rfc5546) operations.

## Tool Mapping

| ASP Tool | CalDAV/iTIP | Notes |
|---|---|---|
| `get_capabilities` | Static declaration + `OPTIONS`/`PROPFIND` | CalDAV capabilities vary wildly by server |
| `search_availability` | `VFREEBUSY` request (RFC 6638) | TODO(verify: which CalDAV servers support freebusy queries?) |
| `hold_slot` | `VEVENT` with `STATUS:TENTATIVE` | iTIP supports tentative; TODO(verify: server behavior varies) |
| `book_appointment` | `PUT VEVENT` + iTIP `REQUEST` | Standard CalDAV event creation |
| `reschedule_appointment` | `PUT` updated `VEVENT` + iTIP `REQUEST` | Update `DTSTART`/`DTEND`, increment `SEQUENCE` |
| `cancel_appointment` | iTIP `CANCEL` method | Send `METHOD:CANCEL` to attendees |
| `get_booking` | `GET` on event URL | Standard CalDAV retrieval |
| `export_ics` | `GET` with `Accept: text/calendar` | Native format -- CalDAV IS iCalendar |
| `subscribe_events` | WebDAV Sync (RFC 6578) or polling | TODO(verify: sync-token support across servers) |

## Long Tail: CalDAV Server Fragmentation

The CalDAV server landscape is highly fragmented. Known implementations include:

- **Radicale** -- lightweight, Python-based
- **Baikal** -- PHP, popular self-hosted option
- **Nextcloud** -- full collaboration suite with CalDAV support
- **Apple Calendar Server** -- macOS/iCloud backend
- **Google Calendar** -- CalDAV interface available but limited

### Key Challenges

- **Capability detection is critical** -- use `PROPFIND` on the well-known endpoint (`/.well-known/caldav`) to discover supported features before making assumptions.
- **Authentication varies** -- Basic, Digest, OAuth, and proprietary schemes are all in use across different servers.
- **VFREEBUSY support is inconsistent** -- not all servers implement RFC 6638 scheduling extensions.
- **WebDAV Sync support varies** -- some servers support `sync-token` (RFC 6578), others require polling via `REPORT`.

This adapter will likely need the most capability-checking logic of all ASP adapters.
