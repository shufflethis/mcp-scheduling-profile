# ASP-0001: Problem Statement — Agentic Scheduling in the MCP Era

| Field    | Value            |
|----------|------------------|
| Status   | Draft            |
| Author   | ASP Working Group |
| Created  | 2026-04-16       |

## Abstract

This document frames the problem space for agentic scheduling
inside LLM hosts.  It surveys existing calendar and scheduling
standards, identifies what they solve and what they leave unsolved,
and proposes that a vendor-neutral MCP scheduling profile (ASP) is
the correct response.  ASP is not a new calendar standard.  It is
an orchestration profile that sits above existing standards and
exposes scheduling capabilities as MCP tools.

## Motivation

### The Agentic Commerce Precedent

Shopify's Agentic Commerce Protocol (ACP) demonstrates that
domain-specific profiles on top of general agent protocols are
both feasible and necessary.  ACP gives LLM agents a structured
way to browse products, add to cart, and check out.  No equivalent
exists for scheduling.

Scheduling is at least as universal as commerce.  Every business
with appointments, every professional with a calendar, every
service with bookable time slots needs scheduling.  Yet today,
connecting an LLM agent to a user's calendar requires bespoke
integration with each provider: Google Calendar, Microsoft
Outlook, Calendly, Cal.com, Acuity, CalDAV servers, and dozens
more.

### The Standards Landscape

Several mature standards exist in the calendaring space.  Each
solves a real problem.  None solves the agentic orchestration
problem.

#### iCalendar (RFC 5545)

RFC 5545 defines the iCalendar data format.  It specifies how to
represent events, to-dos, journal entries, free-busy information,
and time zones in a text-based format.

What it solves: event representation, interoperability at the data
layer, import/export between calendar applications.

What it does NOT solve: orchestration.  iCalendar has no concept
of "search for available slots," "hold a slot," or "confirm a
booking."  It is a data format, not a protocol for agentic
interaction.

#### iTIP (RFC 5546)

RFC 5546 defines the iCalendar Transport-Independent Interoperability
Protocol.  It specifies how to use iCalendar objects for scheduling
messages: REQUEST, REPLY, CANCEL, COUNTER, DECLINECOUNTER, ADD,
REFRESH, PUBLISH.

What it solves: scheduling message semantics between calendar
user agents.

What it does NOT solve: agentic flow.  iTIP assumes human-driven
calendar applications exchanging messages.  It has no concept of
tool invocation, capability negotiation, idempotency keys, or
structured error responses.  An LLM host cannot natively speak
iTIP.

#### CalDAV (RFC 4791)

RFC 4791 defines Calendaring Extensions to WebDAV.  It provides
HTTP-based access to calendar data on a server.

What it solves: server access, calendar CRUD operations, calendar
discovery.

What it does NOT solve: LLM-native interaction.  CalDAV uses
XML (PROPFIND, REPORT), requires WebDAV knowledge, and exposes
a file-system metaphor.  It is not designed for tool-calling
agents.  Wrapping CalDAV behind MCP tools is precisely what ASP
proposes to do.

#### RFC 7953 — Calendar Availability

RFC 7953 defines VAVAILABILITY components for expressing calendar
availability in iCalendar format.

What it solves: declaring when a user is generally available
(e.g., "Mondays 9:00-17:00").

What it does NOT solve: booking.  Availability is not the same
as a bookable slot.  RFC 7953 cannot hold a slot, confirm an
appointment, or handle conflicts.

#### JSCalendar (RFC 8984)

RFC 8984 defines a JSON representation for calendar data.  It is
the modern successor to iCalendar's data model, designed for
JSON-native environments.

What it solves: modern, JSON-native event representation.  Clean
data model.  Extensibility.

What it does NOT solve: orchestration.  Like iCalendar, JSCalendar
is a data format.  It defines how to represent an event, not how
to search, hold, book, reschedule, or cancel one through tool
calls.

### The Gap

The gap is clear.  Representation standards exist (iCalendar,
JSCalendar).  Access protocols exist (CalDAV).  Scheduling message
semantics exist (iTIP).  Availability declaration exists (RFC 7953).

What does NOT exist is an agentic orchestration layer: a profile
that exposes scheduling as a set of well-defined tools with
structured inputs, structured outputs, capability negotiation,
idempotency, and error handling — designed for LLM hosts.

## Specification

### Theses

This specification is grounded in five theses.  Implementors
MUST understand these theses as the foundational assumptions of
the entire ASP effort.

1. Existing calendar standards solve representation and parts of scheduling, but NOT agentic orchestration inside LLM hosts.

2. MCP is the correct transport layer for agentic scheduling in ChatGPT, because OpenAI has positioned MCP as the standard for ChatGPT Apps.

3. JSCalendar should be the canonical internal object model. iCalendar/ICS remains the import/export boundary.

4. A vendor-neutral scheduling profile is strictly more valuable than any single-provider connector.

5. The first shippable product surface is Booking + Reschedule + Cancel + Sync — NOT payment.

### What ASP Is

ASP (Agentic Scheduling Profile) is an MCP profile for scheduling.
Concretely:

- ASP defines a set of MCP tools (see ASP-0003) that LLM hosts
  invoke to perform scheduling operations.
- ASP defines an object model (see ASP-0002) based on JSCalendar
  that all tools consume and produce.
- ASP defines a capability negotiation mechanism (see ASP-0004)
  that lets clients discover what a given provider supports.
- ASP defines an error model (see ASP-0005) with structured,
  machine-readable error codes.
- ASP defines security and authorization requirements (see
  ASP-0006) based on OAuth 2.1.

An ASP server is an MCP server that implements some or all of the
ASP tools.  An ASP client is an MCP host (such as ChatGPT, Claude,
or any MCP-compatible agent) that invokes ASP tools.

### What ASP Is NOT

ASP is NOT a new calendar standard.  It does not replace iCalendar,
JSCalendar, CalDAV, or iTIP.  It sits above them.

ASP is NOT a payment system.  Booking confirmation does not imply
payment.  Payment integration is explicitly out of scope for v1
(see Thesis 5).  Future RFCs MAY address payment as a separate
concern.

ASP is NOT an identity provider.  ASP delegates authentication
to OAuth 2.1.  It does not define user accounts, profiles, or
identity federation beyond what OAuth provides.

### Scope of v1

The first version of ASP MUST support:

- Capability discovery
- Availability search
- Slot hold (where supported by provider)
- Booking confirmation
- Rescheduling
- Cancellation
- Booking retrieval
- ICS export
- Event subscription

The first version of ASP MUST NOT attempt to address:

- Payment processing or deposit collection
- Identity management beyond OAuth delegation
- Scheduling policy AI (e.g., automatic conflict resolution,
  priority ranking of attendees)
- Multi-provider orchestration in a single tool call (clients
  MAY orchestrate across providers by calling tools sequentially)
- Calendar rendering or UI concerns

### Design Principles

1. **One job per tool.**  Each MCP tool does exactly one thing.
   This keeps tool descriptions short and unambiguous for LLM
   function calling.

2. **Reads and writes are separate.**  Read tools have no side
   effects.  Write tools always return a confirmation object.

3. **Idempotency by default.**  Every write tool accepts a
   client_intent_id.  Replaying the same intent_id with the same
   parameters MUST produce the same result.

4. **Capability-first.**  Clients MUST discover capabilities
   before invoking tools.  Servers MUST reject tool calls that
   require unsupported capabilities.

5. **Structured errors.**  Every error is machine-readable with
   a code, message, retryable flag, and details object.

6. **JSON-native.**  All tool inputs and outputs are JSON.
   JSCalendar is the internal object model.  ICS is the boundary
   format for import/export only.

7. **Vendor-neutral.**  ASP MUST NOT assume any specific calendar
   provider.  Google, Microsoft, Calendly, Cal.com, CalDAV, and
   proprietary systems MUST all be expressible through ASP.

## Rationale

### Why MCP and Not a REST API?

MCP is purpose-built for LLM tool calling.  It provides tool
discovery, schema declaration, and transport abstraction.  A REST
API would require each LLM host to implement a custom HTTP client,
parse OpenAPI specs, and handle authentication differently.  MCP
standardizes all of this.

OpenAI has adopted MCP as the standard for ChatGPT Apps.
Anthropic created MCP.  Building on MCP means ASP tools are
immediately usable in both ecosystems without adaptation.

### Why JSCalendar Over iCalendar Internally?

iCalendar (RFC 5545) uses a line-oriented text format with
folding rules, property parameters, and value types that are
cumbersome in JSON-native environments.  JSCalendar (RFC 8984)
was designed from the ground up for JSON.  Since MCP tool inputs
and outputs are JSON, JSCalendar is the natural fit.

iCalendar remains important for interoperability with existing
calendar applications.  ASP therefore provides an export_ics
tool for boundary conversion.

### Why Not Extend CalDAV?

CalDAV is an access protocol, not an orchestration profile.
Extending CalDAV would require all providers to implement WebDAV
extensions, which is unrealistic for SaaS scheduling providers
like Calendly or Cal.com.  ASP abstracts over the provider's
native API.

### Why Capability Negotiation?

Calendar providers differ wildly in what they support.  Google
Calendar supports meeting links but not deposits.  Calendly
supports round-robin but not free-busy queries against a raw
calendar.  CalDAV supports free-busy but not meeting links.

Without capability negotiation, clients would have to guess what
works and handle failures ad hoc.  With capability negotiation,
clients discover supported features up front and degrade
gracefully.

## Security Considerations

This RFC does not define protocol mechanisms.  Security
considerations for the ASP profile are addressed in ASP-0006.

The key security concern at the problem-statement level is that
scheduling operations involve PII (names, email addresses,
appointment details) and access to personal calendars.  Any
solution in this space MUST address authentication, authorization,
data minimization, and audit logging.  ASP-0006 provides the
normative requirements.

## References

- [RFC 2119] Bradner, S., "Key words for use in RFCs to Indicate
  Requirement Levels", BCP 14, RFC 2119, March 1997.
- [RFC 4791] Daboo, C., Desruisseaux, B., and L. Dusseault,
  "Calendaring Extensions to WebDAV (CalDAV)", RFC 4791,
  March 2007.
- [RFC 5545] Desruisseaux, B., "Internet Calendaring and
  Scheduling Core Object Specification (iCalendar)", RFC 5545,
  September 2009.
- [RFC 5546] Daboo, C., "iCalendar Transport-Independent
  Interoperability Protocol (iTIP)", RFC 5546, December 2009.
- [RFC 7953] Daboo, C., and M. Douglass, "Calendar Availability",
  RFC 7953, August 2016.
- [RFC 8984] Jenkins, N., and R. Stepanek, "JSCalendar: A JSON
  Representation of Calendar Data", RFC 8984, July 2021.
- [ACP] Shopify, "Agentic Commerce Protocol", 2025.
- [MCP] Anthropic, "Model Context Protocol Specification", 2024.
