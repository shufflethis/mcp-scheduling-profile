# Provider Capability Matrix

This matrix documents which ASP capabilities each scheduling provider supports. Values marked `TODO(verify)` need confirmation against official API documentation.

## Matrix

| Capability | Google Calendar | Calendly | CalDAV |
|---|---|---|---|
| `supports_hold` | partial (tentative events) | no | partial (TENTATIVE status) |
| `supports_reschedule` | yes | yes | yes |
| `supports_group_booking` | yes | TODO(verify) | yes (iTIP) |
| `supports_meeting_link` | yes (Google Meet) | yes (Zoom/Google Meet) | no |
| `supports_deposit` | no | TODO(verify) | no |
| `supports_webhooks` | yes (push notifications) | yes | partial (WebDAV Sync) |
| `supports_round_robin` | no | yes | no |
| `supports_resource_booking` | yes (resource calendars) | no | TODO(verify) |
| `supports_free_busy` | yes | yes | TODO(verify: server-dependent) |
| `supports_ics_export` | yes | TODO(verify) | yes (native) |
| `supports_idempotent_writes` | TODO(verify) | TODO(verify) | TODO(verify) |

## Notes

### Google Calendar

- **Holds**: Google Calendar does not have a native "hold" concept, but tentative events (status: `tentative`) can serve the same purpose. The adapter creates a tentative event on hold and confirms it (status: `confirmed`) on booking.
- **Webhooks**: Google Calendar supports push notifications via the Google Calendar API's watch mechanism. Notifications are sent to a registered callback URL when calendar events change.
- **Resource booking**: Google Workspace supports resource calendars for meeting rooms and equipment. This requires Workspace admin configuration.
- **ICS export**: Events can be exported via the API in iCalendar format.

### Calendly

- **Holds**: Calendly does not support tentative reservations. Once a time is booked, it is confirmed immediately.
- **Round robin**: Calendly natively supports round-robin assignment across team members, which is a differentiating feature.
- **Meeting links**: Calendly integrates with Zoom, Google Meet, Microsoft Teams, and other video conferencing providers.
- **Group booking**: Calendly supports "group events" where multiple people book the same slot. TODO(verify) whether this maps to ASP's group booking concept (multiple attendees on one booking) or is a different model (multiple independent bookings for the same time).

### CalDAV

- **Server variance**: CalDAV capability varies significantly by server implementation. Nextcloud Calendar, Radicale, Apple Calendar Server, Zimbra, and others support different subsets of CalDAV extensions.
- **Holds**: The iCalendar TENTATIVE status can represent a hold, but not all CalDAV servers implement scheduling (RFC 6638) which would handle the state transitions.
- **Webhooks**: CalDAV does not define a native webhook mechanism. WebDAV Sync (RFC 6578) enables polling-based synchronization. Some servers (e.g., Nextcloud) offer proprietary push notification extensions.
- **Free/busy**: CalDAV scheduling extensions (RFC 6638) define free/busy queries, but not all servers implement them. The capability depends on the specific server deployment.
- **ICS export**: CalDAV stores events in iCalendar format natively, so ICS export is trivial — it is the native format.

## Verification Status

| Provider | Last verified | Verified by | API version |
|---|---|---|---|
| Google Calendar | not yet | — | — |
| Calendly | not yet | — | — |
| CalDAV (generic) | not yet | — | — |

Verification should be performed against the latest API documentation for each provider before marking capabilities as confirmed.
