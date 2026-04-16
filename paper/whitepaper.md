# Agentic Scheduling Protocol: A Vendor-Neutral MCP Profile for Appointment Booking in LLM Hosts

## Abstract

Appointment scheduling remains fragmented across providers: Google Calendar, Calendly, CalDAV servers, and proprietary platforms each expose incompatible APIs. Large language model (LLM) hosts such as ChatGPT and Claude Desktop increasingly serve as agentic interfaces through which users coordinate real-world actions, yet no unified protocol exists for agentic appointment booking. We propose the Agentic Scheduling Protocol (ASP), a Model Context Protocol (MCP) profile that provides a canonical tool surface for scheduling operations. ASP builds on JSCalendar (RFC 8984) for its object model and MCP for transport. We define nine tools spanning capability discovery, availability search, slot holds, booking lifecycle management, calendar export, and event subscriptions. We introduce a capability negotiation mechanism that allows a single client to interoperate with heterogeneous providers, and a structured error model designed for LLM consumption. This paper presents the protocol design, discusses a reference implementation, and evaluates the approach against interoperability, latency, and policy compliance criteria.

## 1. Introduction

The emergence of LLM-powered agents has created a new class of human-computer interaction in which users delegate multi-step real-world tasks to conversational AI systems. Scheduling appointments is among the most frequent and highest-value such tasks: it requires querying availability across calendars, negotiating times, creating events, and managing the lifecycle of bookings. Despite the maturity of calendar standards (iCalendar has existed since 1998), no protocol bridges the gap between these standards and the tool-call interfaces that LLM hosts use to interact with external services.

This gap is particularly visible in the ChatGPT ecosystem. OpenAI introduced the Agentic Commerce Protocol (ACP) in collaboration with Shopify to enable product discovery, cart management, and checkout within ChatGPT Apps [7]. ACP demonstrates that domain-specific MCP profiles can successfully mediate between LLM hosts and external services. However, no equivalent exists for scheduling. A user who asks ChatGPT to "find a 30-minute slot with my accountant next week and book it" has no standardized mechanism to fulfill that request across providers.

The asymmetry is striking: commerce has a protocol; scheduling does not. This is not because scheduling is less important or less complex — in many ways, scheduling is more constrained, involving temporal logic, timezone arithmetic, multi-party coordination, and provider-specific feature sets. The gap is not in calendar standards themselves, which are comprehensive, but in LLM-native orchestration: the ability for an LLM host to discover what a scheduling provider can do, search for availability, and execute booking operations through structured tool calls.

ASP addresses this gap. It is an MCP profile — a set of tool definitions, an object model, and a capability negotiation mechanism — that any MCP-compliant host can use to interact with any ASP-compliant scheduling server. The protocol is provider-agnostic: the same nine tools work whether the backend is Google Calendar, Calendly, a CalDAV server, or a proprietary scheduling system. Provider-specific features are surfaced through a capability manifest that the client queries before performing operations.

This paper describes the protocol design, situates it relative to existing calendar standards and agentic protocols, presents a reference implementation approach, and discusses evaluation criteria and limitations.

## 2. Background

### 2.1 Calendar Standards

**iCalendar (RFC 5545)** [1] defines the data format for calendar events, to-dos, journal entries, and free/busy information. It is the universal interchange format: virtually every calendar application can import and export `.ics` files. However, iCalendar is a serialization format, not an API protocol. It defines what a calendar event looks like, not how to search for availability or create a booking programmatically.

**iTIP (RFC 5546)** [2] extends iCalendar with scheduling semantics: REQUEST, REPLY, CANCEL, and other method types that enable invitation workflows. iTIP models scheduling as message exchange between organizers and attendees. While this is appropriate for email-based scheduling (via iMIP, RFC 6047), it assumes a store-and-forward communication model that does not map naturally to synchronous tool calls from an LLM host.

**CalDAV (RFC 4791)** [3] provides a WebDAV-based protocol for accessing calendar data on a server. It supports CRUD operations on calendar objects, free/busy queries, and synchronization. CalDAV is the closest existing standard to what ASP aims to provide, but it has significant limitations in the agentic context: it requires WebDAV literacy from the client, it lacks a discovery mechanism suitable for LLM tool surfaces, and its feature set varies substantially across server implementations.

**RFC 7953 (Calendar Availability)** [4] defines VAVAILABILITY components that express when a calendar user is available for scheduling. This is conceptually aligned with ASP's availability search, but RFC 7953 operates within the iCalendar/CalDAV ecosystem and is not exposed as a tool-call-friendly interface.

**JSCalendar (RFC 8984)** [5] is the modern JSON-based alternative to iCalendar. It defines a cleaner, more structured object model for calendar events using JSON rather than the line-oriented iCalendar format. ASP adopts JSCalendar as its object model foundation because JSON is the native data format of MCP tool calls, eliminating the need for format conversion at the protocol boundary.

### 2.2 Agentic Protocols

**Model Context Protocol (MCP)** [6] is an open protocol, originally developed by Anthropic, for connecting LLM hosts to external tools and data sources. MCP defines a transport layer (stdio, SSE, HTTP) and a tool-call interface through which hosts can invoke server-side operations. MCP is tool-agnostic: it provides the plumbing but not the semantics. A "scheduling MCP server" could expose any tool surface; without a profile standard, every implementation invents its own.

**Agentic Commerce Protocol (ACP)** [7], developed by Shopify, is an MCP profile for commerce. ACP defines tools for product search, cart management, checkout, and order tracking. It demonstrates the viability of domain-specific MCP profiles and establishes a pattern that ASP follows: a fixed set of tools with well-defined input/output schemas, capability negotiation, and structured errors.

TODO(expand): discuss OpenAI's ChatGPT Apps platform and how MCP integration works in that context.

### 2.3 Existing Scheduling Integrations

Several point solutions exist for LLM-calendar integration. Calendly has published an MCP server [8] that exposes Calendly-specific operations. Google Calendar has a comprehensive REST API [9] that could be wrapped in MCP. Cal.com offers an open-source scheduling platform with its own API. However, each of these is a single-provider solution. An LLM host that integrates with Calendly's MCP server cannot use the same tools to interact with Google Calendar. ASP aims to provide the unifying layer.

## 3. Problem Statement

The core problem is the **agentic orchestration gap**: the absence of a standardized tool surface that enables LLM hosts to perform scheduling operations across heterogeneous providers.

An LLM host performing scheduling on behalf of a user needs to:

1. **Discover** what a scheduling provider can do. Can it hold slots? Does it support rescheduling? Can it generate meeting links? Without a capability discovery mechanism, the LLM must either assume a lowest-common-denominator feature set or hard-code provider-specific knowledge.

2. **Search availability** across a date range for slots matching a desired duration. This is the fundamental query that initiates any booking flow. The host needs structured slot objects that it can present to the user, not raw free/busy data that requires interpretation.

3. **Book** an appointment by selecting a slot and providing attendee information. The booking must be idempotent: if the LLM retries a failed tool call (a common pattern in agentic systems), the result should be the same booking, not a duplicate.

4. **Manage the lifecycle** of existing bookings: reschedule to a different slot, cancel, retrieve details, export as ICS for the user's local calendar.

5. **Interoperate across providers** using a single tool surface. The user should be able to say "book with Dr. Mueller on Calendly" and "add a team meeting on Google Calendar" in the same conversation, using the same tools.

None of the existing standards provide all five capabilities in a tool-call-native format. iCalendar provides the data model but not the API. CalDAV provides an API but not in a tool-call-friendly form. iTIP provides scheduling semantics but assumes email transport. JSCalendar provides a JSON object model but no protocol. MCP provides the transport but no scheduling semantics. ACP demonstrates the profile pattern but addresses commerce, not scheduling.

ASP fills this gap by combining JSCalendar's object model, MCP's transport, and a purpose-built tool surface designed for LLM-driven scheduling workflows.

## 4. Design

### 4.1 Design Principles

ASP follows ten design principles, documented in full in the project's design-principles specification. The key principles that shape the protocol architecture are:

**One job per tool.** Each of the nine tools performs exactly one operation. `search_availability` searches; `book_appointment` books. There are no compound operations. This aligns with how LLM hosts reason about tool use: each tool call is a discrete step in a plan.

**Reads and writes strictly separated.** Read operations (`get_capabilities`, `search_availability`, `get_booking`, `export_ics`) never modify state. Write operations (`hold_slot`, `book_appointment`, `reschedule_appointment`, `cancel_appointment`, `subscribe_events`) always modify state. This separation enables the MCP host to implement user confirmation prompts before writes without needing to analyze tool semantics.

**Idempotent writes via client_intent_id.** Every write operation accepts a `client_intent_id` — a client-generated idempotency key. If the same key is submitted twice, the server returns the existing result rather than creating a duplicate. This is essential in agentic systems where tool calls may be retried due to network errors, LLM re-planning, or user interaction loops.

**Capability-gated operations.** Before using provider-specific features (holds, reschedule, webhooks), the client must call `get_capabilities` to discover what the provider supports. The server returns a structured capability manifest. Operations that require unsupported capabilities return a `CAPABILITY_NOT_SUPPORTED` error.

**Structured errors, never silent degradation.** Every error is returned as a structured object with a machine-readable code, a human-readable message, and optional details. The LLM can use the error code to decide on recovery strategies (e.g., retry, fall back to a different provider, ask the user for input).

### 4.2 Object Model

ASP's object model is rooted in JSCalendar (RFC 8984) with protocol-specific extensions:

- **Slot**: A bookable time interval. Contains `id`, `start`, `end`, `providerId`, `duration` (ISO 8601), and `status` (available | held | booked). Slots are the atomic unit of availability.
- **BookingIntent**: A request to create a booking. Contains `slotId`, `clientIntentId`, `attendees`, `subject`, and optional `notes`. This is the input to `book_appointment`.
- **BookingConfirmation**: The result of a successful booking. Contains `bookingId`, the resolved slot, provider reference, attendees, timestamps, and status. This is the output of `book_appointment` and `get_booking`.
- **ProviderCapabilities**: A manifest describing what a provider can do. Contains boolean flags for each supported feature.

All temporal values use ISO 8601 format. Durations use the ISO 8601 duration format (e.g., `PT30M` for 30 minutes, `PT1H` for one hour). Timezones use IANA identifiers.

### 4.3 Tool Surface

ASP defines nine tools:

| # | Tool | Type | Description |
|---|------|------|-------------|
| 1 | `get_capabilities` | Read | Discover provider features |
| 2 | `search_availability` | Read | Find available slots |
| 3 | `hold_slot` | Write | Temporarily reserve a slot |
| 4 | `book_appointment` | Write | Create a confirmed booking |
| 5 | `reschedule_appointment` | Write | Move a booking to a new slot |
| 6 | `cancel_appointment` | Write | Cancel a booking |
| 7 | `get_booking` | Read | Retrieve booking details |
| 8 | `export_ics` | Read | Export as iCalendar file |
| 9 | `subscribe_events` | Write | Subscribe to lifecycle webhooks |

The typical booking flow is: `get_capabilities` -> `search_availability` -> (optionally) `hold_slot` -> `book_appointment`. The LLM host presents availability to the user, obtains confirmation, and then books. Rescheduling and cancellation are independent operations on existing bookings.

### 4.4 Capability Negotiation

Capability negotiation is the mechanism by which a client discovers what a specific provider supports. The `get_capabilities` tool returns a `ProviderCapabilities` object with boolean flags:

```json
{
  "providerId": "calendly",
  "name": "Calendly",
  "capabilities": {
    "supports_hold": false,
    "supports_reschedule": true,
    "supports_group_booking": false,
    "supports_meeting_link": true,
    "supports_webhooks": true,
    "supports_ics_export": true
  }
}
```

The LLM host should call `get_capabilities` at the start of any scheduling interaction and use the result to guide its tool-use planning. For example, if `supports_hold` is false, the host should skip the hold step and proceed directly to booking.

### 4.5 Error Model

ASP uses a structured error format:

```json
{
  "error": {
    "code": "SLOT_UNAVAILABLE",
    "message": "The requested slot has been booked by another party.",
    "details": {
      "slotId": "slot-goog-001",
      "suggestRetry": true
    }
  }
}
```

Error codes are enumerated and documented. The LLM can pattern-match on the code to determine recovery strategies. The `message` field is suitable for display to the user. The `details` field provides additional context that the LLM can use for automated recovery (e.g., `suggestRetry: true` indicates the operation may succeed with a different slot).

### 4.6 Idempotency

Every write operation accepts a `clientIntentId` parameter. The server maintains a mapping from `clientIntentId` to the result of the operation. If a write with an already-seen `clientIntentId` is received, the server returns the stored result with no side effects. This guarantees at-most-once semantics for booking operations, which is critical in an agentic context where:

- The LLM may retry a tool call after a timeout
- The user may re-confirm an action that was already executed
- Network interruptions may cause the client to miss a successful response

The `clientIntentId` is generated by the MCP client (the LLM host) and must be unique per intended operation. A common pattern is to use a UUID or a deterministic hash of the operation parameters.

## 5. Reference Implementation

The reference implementation consists of an MCP server built with the `@modelcontextprotocol/sdk` TypeScript package. The server implements the nine ASP tools and dispatches operations to provider adapters through an adapter registry.

### 5.1 Architecture

The server follows a layered architecture:

1. **MCP Transport Layer**: Handles MCP protocol negotiation, tool registration, and message serialization. Uses `@modelcontextprotocol/sdk` for stdio and SSE transports.
2. **Tool Handlers**: One handler per tool. Each handler validates input against JSON Schema, calls the appropriate adapter method, and formats the response.
3. **Adapter Registry**: Maps `providerId` strings to adapter instances. The registry is populated at server startup based on configuration.
4. **Provider Adapters**: Implement a common `SchedulingAdapter` interface. Each adapter translates ASP operations into provider-specific API calls.

### 5.2 Mock Adapter

The reference implementation includes a mock adapter that simulates a scheduling provider with configurable availability. The mock adapter is used for testing and demonstration purposes. It generates deterministic slot data based on the query parameters and maintains an in-memory booking store.

### 5.3 GPT Actions Wrapper

For environments that require an OpenAPI interface rather than MCP (e.g., GPT Actions in ChatGPT), the project includes an OpenAPI 3.1 specification that maps the nine tools to REST endpoints. This wrapper is a compatibility layer; the canonical protocol surface remains MCP. A single GPT can use either Apps (MCP) or Actions (OpenAPI), not both — the wrapper exists for deployments where MCP is not available.

TODO(expand): describe the adapter interface in more detail, including error handling and timeout behavior.

## 6. Evaluation Criteria

We propose four criteria for evaluating the success of ASP:

### 6.1 Interoperability

Can the same MCP client, using the same nine tools, successfully perform scheduling operations across Google Calendar, Calendly, and a CalDAV server? Interoperability is the primary design goal. It is measured by:

- **Feature coverage parity**: the percentage of provider-specific features that are accessible through the ASP tool surface. Perfect parity is not expected (ASP is a common denominator), but core operations (search, book, cancel) must work universally.
- **Behavioral consistency**: given the same `search_availability` query, do different providers return structurally identical responses? Schema validation ensures structural consistency; behavioral consistency requires adapter testing.

### 6.2 Latency Overhead

The ASP server adds a processing layer between the LLM host and the provider API. The acceptable latency overhead target is **less than 100ms** added by the ASP layer for any operation. This excludes provider API latency, which is outside ASP's control. The overhead includes JSON Schema validation, adapter dispatch, and response formatting.

### 6.3 Capability Coverage

What percentage of each provider's scheduling features are exposed through the ASP capability model? The capability matrix (documented separately) tracks coverage across providers. The initial target is complete coverage of core scheduling operations (search, book, reschedule, cancel) with partial coverage of advanced features (holds, webhooks, resource booking).

### 6.4 Review Readiness

For the ChatGPT App deployment path, the ASP implementation must comply with OpenAI's App review policies. The key constraint is the commerce restriction: ChatGPT Apps must not facilitate commerce for digital services. ASP is designed to be compliant because it handles scheduling, not payment. However, review readiness also includes proper error handling, rate limiting, and user consent flows — all of which must be validated.

## 7. Related Work

### 7.1 Agentic Commerce Protocol (ACP)

ACP [7], developed by Shopify, is the most direct precedent for ASP. Both are MCP profiles that define domain-specific tool surfaces. ACP addresses commerce (product search, cart management, checkout); ASP addresses scheduling. The protocols are complementary: a booking that requires payment (e.g., a paid consultation) could use ASP for the scheduling step and hand off to ACP for the payment step. ASP's design draws heavily on ACP's architectural patterns, particularly capability negotiation and structured error handling.

### 7.2 Calendly MCP Server

Calendly has published an MCP server that exposes Calendly-specific operations [8]. This is a single-provider integration: the tools are named and parameterized for Calendly's API. It cannot be used to interact with Google Calendar or CalDAV. ASP aims to be the provider-agnostic layer that Calendly's server (and similar provider-specific servers) can implement behind.

### 7.3 Google Calendar API

The Google Calendar API [9] is a comprehensive REST API for managing Google Calendar events, free/busy queries, and ACLs. It is well-documented and widely used. However, it is Google-specific: the API surface, authentication model, and data formats are designed for Google's ecosystem. An ASP adapter for Google Calendar would translate ASP operations into Google Calendar API calls, abstracting away Google-specific details.

### 7.4 Cal.com

Cal.com is an open-source scheduling platform that offers both a hosted service and self-hosted deployment. Its API supports booking, rescheduling, and cancellation. Cal.com is a natural adapter target for ASP: its open-source nature facilitates integration, and its feature set aligns well with ASP's tool surface. A Cal.com adapter is planned for Phase 4 of the project roadmap.

TODO(expand): discuss other scheduling platforms (Acuity, Doodle, Microsoft Bookings) and their potential as adapter targets.

## 8. Limitations

### 8.1 Payment Out of Scope

ASP explicitly excludes payment processing. Many scheduling scenarios involve payment (paid consultations, deposit-required bookings, cancellation fees). ASP handles the scheduling mechanics but does not model or execute financial transactions. This is a deliberate design choice driven by both scope management and ChatGPT App policy compliance. For paid bookings, the intended approach is to hand off to ACP or a payment-specific protocol after the scheduling step completes.

### 8.2 Identity and Authorization

ASP delegates identity management to OAuth. The ASP server authenticates with providers using OAuth tokens obtained through standard OAuth flows. However, ASP does not define its own identity model: it does not specify how users are identified across providers, how permissions are delegated from the user to the LLM host, or how consent is managed. These are handled by the MCP host and the OAuth layer, but the lack of a protocol-level identity specification may create friction in multi-provider scenarios.

### 8.3 CalDAV Variance

CalDAV implementations vary significantly across servers. Nextcloud Calendar, Radicale, Apple Calendar Server, and other CalDAV servers support different subsets of the CalDAV specification and its extensions. The ASP CalDAV adapter must handle this variance, which increases implementation complexity and may result in inconsistent capability reporting across CalDAV servers.

### 8.4 No Scheduling Policy

ASP does not include a scheduling policy engine. It cannot answer questions like "find the best time for five people across three timezones" or "schedule this meeting in a way that minimizes context-switching." These are higher-order scheduling problems that require reasoning over multiple calendars simultaneously. ASP provides the primitive operations (search availability, book) that a policy engine would use, but the policy logic itself is out of scope.

### 8.5 Single-Calendar Focus

The current design assumes one-to-one interactions between the client and a single provider per operation. Multi-calendar aggregation (e.g., "show me my combined availability across Google Calendar and Outlook") requires the client to query multiple providers and merge results. ASP does not define a merge semantics or a multi-provider query interface.

## 9. Future Work

### 9.1 Group Booking

Multi-attendee scheduling where availability must be intersected across participants. This requires extending `search_availability` to accept multiple calendars and return only mutually available slots. Group booking is a Phase 4 goal.

### 9.2 Resource Booking

Booking physical resources (meeting rooms, equipment) alongside time slots. Google Calendar supports resource calendars; CalDAV supports resource scheduling via iTIP. ASP's capability model already includes `supports_resource_booking`; the implementation requires extending the booking intent to reference resources.

### 9.3 Payment Handoff via ACP

For providers that require payment at booking time, ASP could integrate with ACP to create a seamless flow: search -> hold -> pay (via ACP) -> book. This requires defining a handoff protocol between ASP and ACP, potentially involving shared session state.

### 9.4 Scheduling Policy Agent

A higher-order agent that uses ASP tools as primitives to implement scheduling policies: "find the optimal meeting time," "respect focus time blocks," "prefer mornings for external meetings." This agent would sit above the ASP layer and use `search_availability` across providers, apply policy rules, and present a curated set of options to the user.

### 9.5 Cal.com Adapter

Cal.com's open-source API is well-suited for an ASP adapter. Building this adapter would validate ASP's provider-agnostic design against a real-world scheduling platform and provide a self-hostable deployment option.

### 9.6 Multi-Provider Aggregation

Extending ASP with a meta-provider that aggregates availability across multiple backends. This would enable queries like "show me all my free slots across Google Calendar and Calendly" without requiring the client to perform manual merging.

### 9.7 IETF Standardization

If ASP achieves adoption, submitting it as an IETF Internet-Draft could formalize the protocol and align it with the broader calendar standards ecosystem. This is a long-term goal (Phase 5) contingent on community adoption and implementation experience.

## 10. References

[1] B. Desruisseaux, Ed., "Internet Calendaring and Scheduling Core Object Specification (iCalendar)," RFC 5545, September 2009.

[2] C. Daboo, Ed., "iCalendar Transport-Independent Interoperability Protocol (iTIP)," RFC 5546, December 2009.

[3] C. Daboo, B. Desruisseaux, L. Dusseault, "Calendaring Extensions to WebDAV (CalDAV)," RFC 4791, March 2007.

[4] M. Douglass, "Calendar Availability," RFC 7953, August 2016.

[5] R. Stepanek, M. Douglass, "JSCalendar: A JSON Representation of Calendar Data," RFC 8984, July 2021.

[6] Anthropic, "Model Context Protocol Specification," 2024. Available: https://modelcontextprotocol.io/ TODO(verify URL)

[7] Shopify, "Agentic Commerce Protocol," 2025. Available: TODO(verify URL)

[8] Calendly, "Calendly API and MCP Server Documentation." Available: TODO(verify URL)

[9] Google, "Google Calendar API Documentation." Available: https://developers.google.com/calendar/api TODO(verify URL)
