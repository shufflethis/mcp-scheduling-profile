# ASP Roadmap

Phase-based roadmap for the Agentic Scheduling Profile project.

---

## Phase 1 (current)

**Focus:** Specification, schemas, reference skeleton, whitepaper.

- [x] RFC-0001 through RFC-0006 (draft)
- [x] JSON Schema definitions for all core objects (Slot, BookingIntent, BookingConfirmation, etc.)
- [x] Reference MCP server skeleton with MockAdapter (TypeScript, @modelcontextprotocol/sdk)
- [x] Adapter contract interface and provider stubs
- [x] OpenAPI 3.1 compatibility wrapper for GPT Actions
- [x] Design principles documentation
- [x] Provider capability matrix (draft, unverified)
- [x] ACP vs. ASP comparison
- [x] Whitepaper draft
- [x] Example request/response pairs (availability, booking)
- [ ] JSON Schema validation tests
- [ ] Community review of RFCs
- [ ] Resolve all TODO(verify) markers
- [ ] Peer review of specification

---

## Phase 2

**Focus:** Google Calendar adapter, end-to-end tests, ChatGPT App prototype.

- [ ] Google Calendar adapter implementation
  - OAuth 2.0 + PKCE flow for Google Calendar API v3
  - Availability search via freeBusy.query
  - Booking via events.insert
  - Reschedule via events.patch
  - Cancel via events.delete
  - Hold via tentative event creation
  - ICS export via events.get (iCalendar format)
- [ ] End-to-end integration tests (search -> hold -> book -> reschedule -> cancel)
- [ ] Schema validation test suite (ajv-based)
- [ ] ChatGPT App configuration for the current Apps SDK submission flow
- [ ] ChatGPT App prototype tested through Developer Mode
- [ ] Whitepaper figures (architecture diagram, sequence diagram, etc.)
- [ ] Latency benchmarking (target: <100ms overhead per operation)

---

## Phase 3

**Focus:** Calendly adapter, CalDAV adapter, multi-provider demo.

- [ ] Calendly adapter implementation
  - Evaluate: direct API vs. consuming Calendly's MCP server
  - OAuth 2.0 flow for Calendly API
  - Availability search via available times endpoint
  - Booking via scheduled events endpoint
  - Reschedule and cancel via event management endpoints
  - Webhook subscription for event notifications
- [ ] CalDAV adapter implementation (targeting Nextcloud Calendar)
  - HTTP Basic / OAuth authentication
  - Availability via VFREEBUSY queries (RFC 6638)
  - Booking via PUT of VEVENT objects
  - Reschedule via event modification
  - Cancel via DELETE
  - ICS export (native format)
- [ ] Multi-provider demo: book via Google, view via CalDAV
- [ ] Provider feature discovery end-to-end tests
- [ ] Error handling test suite
- [ ] Provider capability matrix verification against live APIs
- [ ] Documentation: adapter development guide

---

## Phase 4

**Focus:** Group booking, resource booking, Cal.com adapter.

- [ ] Group booking support
  - Extended search_availability accepting multiple calendars
  - Mutual availability intersection algorithm
  - Multi-attendee booking flow
- [ ] Resource booking extension
  - Resource discovery (rooms, equipment)
  - Resource availability search
  - Combined time + resource booking
- [ ] Cal.com adapter implementation
  - Cal.com API integration
  - Self-hosted deployment testing
- [ ] Recurring appointment support
- [ ] Timezone-aware availability aggregation
- [ ] Scheduling policy primitives (preference expressions, not full AI policy)

---

## Phase 5

**Focus:** ACP handoff, scheduling policy agent, IETF standardization.

- [ ] ACP handoff protocol for paid bookings
  - Define ASP-ACP session handoff mechanism
  - Implement hold -> pay -> book flow
  - Test with ACP-compliant commerce server
- [ ] Scheduling policy agent
  - Higher-order agent using ASP tools as primitives
  - Policy rules: timezone preferences, focus time, meeting type preferences
  - Multi-calendar optimization ("find the best time for N people")
- [ ] Multi-provider aggregation
  - Meta-provider that merges availability across backends
  - Unified free/busy view
- [ ] IETF Internet-Draft submission
  - Formalize ASP specification for IETF review
  - Align with CalConnect and IETF CALEXT working group
- [ ] Claude Desktop / Claude Code MCP integration testing
- [ ] Published npm package for adapter SDK
- [ ] Additional adapters: Microsoft Bookings, Acuity Scheduling, Doodle

---

## Timeline Estimates

| Phase | Estimated Duration | Dependencies |
|---|---|---|
| Phase 1 | Complete | -- |
| Phase 2 | 6-8 weeks | Google Calendar API access, current Apps SDK submission requirements |
| Phase 3 | 8-12 weeks | Phase 2 complete, Calendly API access |
| Phase 4 | 8-12 weeks | Phase 3 complete |
| Phase 5 | Ongoing | Phase 4 complete, community adoption |

Timeline estimates are approximate and depend on contributor availability and external dependencies (API access, OpenAI platform changes, IETF process).

---

## Non-Goals (intentionally excluded from roadmap)

- Building a calendar UI
- Replacing existing calendar standards (iCalendar, CalDAV)
- Identity management beyond OAuth delegation
- Real-time collaboration features
- Payment processing (delegated to ACP)
