# ASP Design Principles

The Agentic Scheduling Profile is built on ten design principles. Each principle has consequences for how the profile is specified, implemented, and consumed by LLM hosts.

---

## 1. One Job Per Tool

**Principle:** Each tool performs exactly one operation. No tool combines multiple side effects.

**Rationale:** LLM hosts plan tool use as a sequence of discrete steps. A tool that both searches availability and creates a hold combines a read and a write, making it impossible for the host to insert a user confirmation step between them. Single-responsibility tools give the host maximum control over the flow.

**Consequences:**
- The tool count (9) is higher than a "convenience-first" API might have.
- The host must orchestrate multi-step flows (search -> hold -> book) explicitly.
- Each tool's behavior is predictable and testable in isolation.
- Error recovery is simpler because the host knows exactly which operation failed.

---

## 2. Reads and Writes Strictly Separated

**Principle:** Read operations never modify state. Write operations always modify state. There are no mixed-effect tools.

**Rationale:** MCP hosts need to distinguish between safe (read) and unsafe (write) operations. Read operations can be called freely for exploration; write operations require user confirmation. If a tool could sometimes read and sometimes write depending on parameters, the host cannot make this distinction statically.

**Consequences:**
- Read tools: `get_capabilities`, `search_availability`, `get_booking`, `export_ics`.
- Write tools: `hold_slot`, `book_appointment`, `reschedule_appointment`, `cancel_appointment`, `subscribe_events`.
- The MCP host can implement a blanket "confirm before write" policy without per-tool analysis.
- Caching is straightforward for read operations.

---

## 3. Idempotent Booking Writes (clientIntentId)

**Principle:** Every booking lifecycle write operation accepts a `clientIntentId`. Resubmitting the same ID returns the existing result without side effects. Subscription writes are deduplicated by provider, event set, and callback URL.

**Rationale:** Agentic systems are inherently retry-prone. The LLM may re-execute a tool call after a timeout, the user may re-confirm an action, or the host may replay a conversation turn. Without idempotency, these retries create duplicate bookings — a severe user-facing failure.

**Consequences:**
- The server must maintain a durable mapping from `clientIntentId` to booking lifecycle operation results.
- The client (LLM host) is responsible for generating unique IDs — typically UUIDs.
- Idempotency windows must be defined (how long does the server remember an ID?).
- The 409 Conflict response for duplicate IDs includes the original result, not an error.

---

## 4. Capability-Gated Operations

**Principle:** Provider-specific features are discovered through `get_capabilities` before use. Operations that require unsupported provider features return a structured error.

**Rationale:** Scheduling providers differ significantly in feature sets. Calendly does not support holds. CalDAV servers vary in webhook support. Google Calendar supports resource booking; Calendly does not. A profile that assumes uniform provider capabilities will fail at runtime. Provider feature discovery lets the LLM host adapt its plan to the provider.

**Consequences:**
- The LLM host should call `get_capabilities` at the start of any scheduling session.
- The host can skip unsupported steps (e.g., no hold step if `supports_hold` is false).
- The server returns `E_CAPABILITY_UNSUPPORTED` errors for gated operations, enabling graceful degradation.
- New capabilities can be added to the manifest without breaking existing tools.

---

## 5. Structured Errors, Never Silent Degradation

**Principle:** Every error is returned as a structured object with a machine-readable code, a human-readable message, and optional details. Operations never silently degrade or return partial results without indication.

**Rationale:** LLMs are capable of error recovery if they receive structured error information. A machine-readable code enables pattern matching ("if E_SLOT_UNAVAILABLE, search for alternative slots"). A human-readable message enables the LLM to communicate the issue to the user. Silent degradation — where an operation partially succeeds without indicating the partial nature — is the worst outcome because the LLM cannot reason about it.

**Consequences:**
- All error codes are enumerated in the specification.
- The `details` field can carry recovery hints (e.g., `suggestRetry: true`).
- Adapters must translate provider-specific errors into ASP error codes.
- The `truncated` field on availability responses is an example of non-silent degradation: the client knows the result is incomplete.

---

## 6. JSCalendar-Native, ICS at the Boundary

**Principle:** The profile's internal object model is based on JSCalendar (RFC 8984). iCalendar (RFC 5545) is used only at the export boundary (`export_ics` tool).

**Rationale:** MCP tool calls exchange JSON. JSCalendar is a JSON format. iCalendar is a line-oriented text format that requires parsing. Using JSCalendar internally eliminates format conversion within the profile, reduces parsing errors, and aligns with the JSON-native nature of LLM tool interfaces. ICS export is provided for interoperability with traditional calendar applications.

**Consequences:**
- Slot, BookingIntent, and BookingConfirmation objects use JSCalendar-aligned field names and types.
- The `export_ics` tool performs JSCalendar-to-iCalendar conversion at the server.
- CalDAV adapters must convert between iCalendar (CalDAV native) and JSCalendar (ASP native).
- Temporal values use ISO 8601 format throughout (already the JSCalendar convention).

---

## 7. Provider-Agnostic Tool Surface

**Principle:** The nine tools work identically regardless of which scheduling provider is being used. Provider-specific behavior is encapsulated in adapters behind the tool surface.

**Rationale:** The value of ASP is that an LLM host can learn nine tools and use them with any provider. If tools had provider-specific parameters or behavior, the host would need per-provider knowledge, defeating the purpose of the protocol.

**Consequences:**
- Tool inputs and outputs have fixed schemas that do not vary by provider.
- Provider-specific features are accessed through the capability model, not through tool variations.
- Adapters bear the translation burden: they map ASP operations to provider APIs.
- Some provider features may not be expressible through the common tool surface (this is acceptable — ASP is a useful common denominator, not a complete abstraction).

---

## 8. Least-Privilege Authorization

**Principle:** The ASP server requests only the OAuth scopes necessary for the operations the user actually performs. Broad calendar access is never assumed.

**Rationale:** Scheduling involves access to sensitive personal data (calendar events, attendee information, availability patterns). An ASP server that requests full calendar read/write access when the user only wants to check availability violates the principle of least privilege and may cause users to deny authorization.

**Consequences:**
- OAuth scopes are mapped to ASP operations (e.g., free/busy scope for `search_availability`, event write scope for `book_appointment`).
- The server may need to request additional scopes incrementally as the user performs more operations.
- Capability reporting may be constrained by the granted scopes (e.g., `supports_reschedule` may be false if the user hasn't granted write access).

---

## 9. User Confirmation Before Writes (MCP Host Responsibility)

**Principle:** The MCP host (not the ASP server) is responsible for obtaining user confirmation before executing write operations. The ASP server executes writes immediately upon receiving tool calls.

**Rationale:** User confirmation is a UX concern that belongs in the host, not the protocol. Different hosts implement confirmation differently (ChatGPT shows a tool-use card; Claude Desktop may show a dialog). The ASP server cannot and should not control the host's UX. By executing writes immediately, the server keeps its contract simple and predictable.

**Consequences:**
- The read/write separation (Principle 2) enables the host to implement confirmation correctly.
- The ASP server trusts that the host has obtained confirmation before calling write tools.
- If the host fails to confirm, the user may experience unwanted bookings — this is a host bug, not a protocol bug.
- The `hold_slot` tool provides a mitigation: the host can hold a slot (low risk), confirm with the user, and then book (high risk).

---

## 10. No Payment — Scheduling Only

**Principle:** ASP handles scheduling operations only. Payment processing is explicitly out of scope.

**Rationale:** This constraint keeps the profile focused: scheduling and payment are different domains with different failure modes, regulatory requirements, and trust models. By excluding payment, ASP avoids the policy and security complications that would arise from handling financial transactions.

**Consequences:**
- The `supports_deposit` capability flag exists for discovery but ASP does not define payment operations.
- Paid booking scenarios require a handoff to ACP or another compliant checkout/payment flow.
- The profile is simpler and easier to review because it does not execute payments.
- Providers that require payment at booking time need a two-phase flow: ASP for scheduling, ACP for payment.
