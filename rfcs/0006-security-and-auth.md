# ASP-0006: Security and Authorization

| Field    | Value            |
|----------|------------------|
| Status   | Draft            |
| Author   | ASP Working Group |
| Created  | 2026-04-16       |

## Abstract

This document specifies the security and authorization requirements
for the Agentic Scheduling Profile (ASP).  It defines the
authentication baseline (OAuth 2.1 with PKCE and Dynamic Client
Registration), maps least-privilege scopes to ASP tools, mandates
user confirmation for write operations, requires audit logging,
and sets rules for PII handling, transport security, and token
storage.

## Motivation

Scheduling operations are inherently sensitive.  They involve
personal calendars, attendee PII, appointment details, and the
ability to create, modify, or delete commitments on a user's
behalf.  An LLM agent with scheduling access can book, cancel,
or reschedule appointments — actions with real-world consequences.

Without explicit security requirements, ASP implementations would
make ad-hoc security decisions.  Some might store tokens in tool
responses.  Others might allow silent booking without user
confirmation.  Others might log attendee email addresses in
plaintext.

This specification establishes the minimum security bar.  All
ASP servers MUST meet these requirements.  ASP clients SHOULD
enforce them where applicable.

## Specification

### Authentication Baseline

#### OAuth 2.1 with PKCE

ASP servers MUST support OAuth 2.1 as the authentication
mechanism for provider access.  OAuth 2.1 is the current best
practice for authorization, incorporating lessons learned from
OAuth 2.0.

Key requirements:

1. **Authorization Code flow with PKCE is REQUIRED.**  ASP
   servers MUST use the Authorization Code grant with Proof Key
   for Code Exchange (PKCE, RFC 7636).  The implicit grant MUST
   NOT be used.  The resource owner password credentials grant
   MUST NOT be used.

2. **S256 challenge method is REQUIRED.**  The `plain` challenge
   method MUST NOT be used.  Only `S256` is acceptable.

3. **Refresh tokens MUST be rotated.**  Each use of a refresh
   token MUST return a new refresh token.  The previous refresh
   token MUST be invalidated.  This limits the window of
   compromise if a refresh token is leaked.

4. **Access tokens MUST be short-lived.**  Access token lifetime
   SHOULD NOT exceed 1 hour.  Servers SHOULD use refresh tokens
   to obtain new access tokens.

5. **Token endpoint MUST use POST.**  GET requests to the token
   endpoint MUST be rejected.

#### Dynamic Client Registration

ASP servers SHOULD support OAuth 2.0 Dynamic Client Registration
(RFC 7591).  This allows MCP hosts to register as OAuth clients
without manual configuration.

When Dynamic Client Registration is supported:

1. The registration endpoint MUST require TLS.
2. The server SHOULD rate-limit registration requests.
3. The server MAY require an initial access token for registration
   (RFC 7592) to prevent abuse.
4. Registered clients MUST be assigned a unique `client_id`.
5. The server MUST NOT return a `client_secret` for public
   clients (native apps, SPAs, MCP hosts).

When Dynamic Client Registration is not supported, the ASP server
MUST document its client registration process.

#### Provider-Specific Authentication

ASP servers act as intermediaries between MCP hosts and upstream
scheduling providers.  Each provider has its own OAuth
configuration (authorization endpoint, token endpoint, scopes).

The ASP server is responsible for:

1. Mapping ASP scopes (defined below) to provider-specific scopes.
2. Initiating the OAuth flow with the upstream provider on behalf
   of the user.
3. Storing and refreshing provider tokens securely.
4. Never exposing provider tokens to the MCP host or to tool
   responses.

### Least-Privilege Scopes

ASP defines four scopes.  Each scope grants access to a specific
set of tools.  Servers MUST enforce scope checks on every tool
invocation.

#### Scope Definitions

| Scope                  | Grants Access To | Description |
|------------------------|------------------|-------------|
| `scheduling:read`      | `get_capabilities`, `search_availability`, `get_booking` | Read-only access to scheduling data. No side effects. |
| `scheduling:write`     | `book_appointment`, `reschedule_appointment`, `cancel_appointment`, `hold_slot` | Create, modify, and cancel bookings. |
| `scheduling:subscribe` | `subscribe_events` | Subscribe to event notifications. |
| `scheduling:export`    | `export_ics` | Export bookings as ICS files. |

#### Scope Rules

1. **Least privilege.**  Clients MUST request only the scopes
   they need.  An LLM agent that only searches availability
   MUST request only `scheduling:read`.

2. **Scope inheritance.**  `scheduling:write` does NOT imply
   `scheduling:read`.  Scopes are independent.  A client that
   needs to search and book MUST request both `scheduling:read`
   and `scheduling:write`.

3. **Scope enforcement.**  If a tool is invoked without the
   required scope, the server MUST return E_AUTH_SCOPE_INSUFFICIENT
   (ASP-0005).  The error details MUST include the required scope
   and the current scopes.

4. **Scope display.**  The authorization UI SHOULD clearly explain
   what each scope allows in terms a non-technical user can
   understand.  Example: "`scheduling:write` allows the app to
   book, reschedule, and cancel appointments on your behalf."

#### Tool-to-Scope Mapping

| Tool                     | Required Scope         |
|--------------------------|------------------------|
| `get_capabilities`       | `scheduling:read`      |
| `search_availability`    | `scheduling:read`      |
| `get_booking`            | `scheduling:read`      |
| `hold_slot`              | `scheduling:write`     |
| `book_appointment`       | `scheduling:write`     |
| `reschedule_appointment` | `scheduling:write`     |
| `cancel_appointment`     | `scheduling:write`     |
| `export_ics`             | `scheduling:export`    |
| `subscribe_events`       | `scheduling:subscribe` |

### Confirmation-Required Operations

Every write operation MUST be confirmed by the user before
execution.  This is a non-negotiable safety requirement.

#### Rules

1. **MCP host responsibility.**  The MCP host (e.g., ChatGPT,
   Claude) is responsible for obtaining user confirmation before
   invoking write tools.  The ASP server cannot enforce this
   directly, but the specification mandates it.

2. **Confirmation granularity.**  Each write tool invocation
   requires a separate confirmation.  A blanket "confirm all"
   is NOT acceptable.  The user MUST see and approve each
   booking, reschedule, cancellation, and hold individually.

3. **Confirmation content.**  The confirmation prompt MUST
   display at minimum:
   - The operation type (book, reschedule, cancel, hold).
   - The appointment date and time (in the user's timezone).
   - The provider name.
   - The attendees (for booking).
   - The subject (for booking).

4. **No silent writes.**  An LLM agent MUST NOT invoke a write
   tool based solely on inferred intent.  Explicit user
   confirmation is REQUIRED.

5. **Tool descriptions encode this requirement.**  The MCP tool
   descriptions for write tools (ASP-0003) include the phrase
   "The user MUST confirm before this tool is called."  MCP
   hosts SHOULD use this as a signal to require confirmation.

#### Implementation Guidance

MCP hosts that support confirmation flows (e.g., tool approval
prompts) SHOULD gate write tools behind their native confirmation
mechanism.  MCP hosts that do not support confirmation flows
MUST implement an explicit confirmation step in the conversation
flow before calling write tools.

### Audit Log Requirement

ASP servers SHOULD maintain an audit trail of all write operations.

#### Rules

1. **What to log.**  Each audit log entry SHOULD include:
   - Timestamp (UTC ISO 8601).
   - Tool name.
   - `client_intent_id`.
   - `providerId`.
   - Operation result (success, error code).
   - Authenticated user identifier (opaque id, NOT email).

2. **What NOT to log.**  Audit logs MUST NOT contain:
   - Attendee email addresses (use opaque identifiers).
   - Appointment notes or subject lines.
   - OAuth access tokens or refresh tokens.
   - Full request/response bodies (use summaries).

3. **Retention.**  Audit logs SHOULD be retained for at least
   90 days.  Longer retention MAY be required by applicable law.

4. **Access.**  Audit logs MUST be accessible only to server
   administrators.  They MUST NOT be exposed through ASP tools.

5. **Integrity.**  Audit logs SHOULD be append-only.  Servers
   SHOULD protect logs against tampering (e.g., write-once
   storage, cryptographic chaining).

### PII Handling

Scheduling data inherently contains PII: names, email addresses,
appointment details, and possibly medical or legal information
in appointment notes.

#### Rules

1. **Minimize in tool outputs.**  Tool responses MUST include
   only the PII necessary for the client to function.  For
   example, `search_availability` responses MUST NOT include
   other users' attendee information.

2. **Never expose in tool names or descriptions.**  MCP tool
   names and descriptions are often logged, cached, and
   displayed in developer tools.  They MUST NOT contain PII.

3. **Redact in logs.**  All server-side logs MUST redact PII.
   Email addresses MUST be replaced with opaque identifiers or
   hashed values.  Names MUST be omitted or truncated.

4. **Encrypt at rest.**  Booking data stored by the ASP server
   (caches, databases) MUST be encrypted at rest using AES-256
   or equivalent.

5. **Encrypt in transit.**  See Transport Security below.

6. **Data retention.**  ASP servers SHOULD define and publish a
   data retention policy.  Cached booking data SHOULD be purged
   when no longer needed for the active session.

7. **Right to deletion.**  ASP servers that store booking data
   SHOULD support data deletion requests in compliance with
   applicable privacy regulations (GDPR, CCPA).

### Transport Security

1. **TLS 1.2+ is REQUIRED.**  All communication between MCP
   hosts and ASP servers MUST use TLS 1.2 or later.  TLS 1.0
   and 1.1 MUST NOT be used.

2. **TLS 1.3 is RECOMMENDED.**  Servers SHOULD prefer TLS 1.3
   for its improved security and performance.

3. **Certificate validation is REQUIRED.**  MCP hosts MUST
   validate the ASP server's TLS certificate.  Self-signed
   certificates MUST NOT be accepted in production.

4. **HSTS is RECOMMENDED.**  ASP servers exposed over HTTPS
   SHOULD send the `Strict-Transport-Security` header with a
   minimum `max-age` of 31536000 (one year).

5. **Upstream provider connections.**  ASP servers MUST use TLS
   when communicating with upstream scheduling providers.  The
   same TLS requirements apply.

### Token Storage

1. **MUST NOT persist tokens in tool responses.**  ASP tool
   responses MUST NOT contain OAuth access tokens, refresh
   tokens, or any other credential material.  Tokens are
   server-side state.  They MUST NOT leak to the MCP host or
   to the LLM.

2. **Server-side storage.**  ASP servers that store tokens
   (for upstream provider access) MUST encrypt them at rest.
   Encryption MUST use a key management system; hardcoded
   encryption keys are NOT acceptable.

3. **Memory-only where possible.**  For short-lived sessions,
   servers SHOULD store tokens in memory only.  Persistent
   token storage is acceptable for long-lived integrations
   but increases the attack surface.

4. **Token revocation.**  ASP servers MUST support token
   revocation.  When a user disconnects a provider, the server
   MUST revoke the upstream provider's tokens and delete its
   local copies.

5. **No token forwarding.**  ASP servers MUST NOT forward
   upstream provider tokens to the MCP host.  The MCP host
   authenticates to the ASP server; the ASP server authenticates
   to the provider.  These are separate trust boundaries.

### Additional Security Requirements

#### Input Validation

All tool inputs MUST be validated by the ASP server before
processing.  Servers MUST NOT pass unvalidated input to upstream
providers.  Specific requirements:

1. String length limits MUST be enforced.  A reasonable default
   is 1000 characters for free-text fields (`subject`, `notes`,
   `reason`) and 255 characters for identifiers.

2. Email addresses MUST be validated for format (RFC 5322).

3. Timestamps MUST be validated as proper ISO 8601 UTC strings.

4. The `metadata` object MUST be size-limited.  A reasonable
   default is 4 KB of serialized JSON.

#### Rate Limiting

ASP servers MUST implement rate limiting to prevent abuse.

1. Rate limits SHOULD be per-authenticated-user.
2. Rate limits SHOULD be communicated via E_RATE_LIMITED errors
   with a `retryAfter` value in the details (ASP-0005).
3. Write operations SHOULD have stricter rate limits than read
   operations.  A reasonable default is 10 writes per minute
   and 60 reads per minute per user.

#### Webhook Security

For providers that support webhooks (`subscribe_events`):

1. Callback URLs MUST use HTTPS.
2. Servers SHOULD implement callback verification (e.g., HMAC
   signature on webhook payloads).
3. Servers SHOULD include a shared secret in webhook
   registrations and validate it on delivery.
4. Webhook payloads MUST minimize PII.  They SHOULD contain
   only the event type and the affected booking id, with full
   details available via `get_booking`.

## Rationale

### Why OAuth 2.1 and Not OAuth 2.0?

OAuth 2.1 consolidates best practices from OAuth 2.0 and its
extensions.  It mandates PKCE, deprecates the implicit grant,
and requires refresh token rotation.  These are security
improvements that OAuth 2.0 left optional.  By mandating OAuth
2.1, ASP ensures a consistent security baseline.

### Why PKCE Even for Confidential Clients?

PKCE prevents authorization code interception attacks regardless
of client type.  The overhead is minimal (one additional hash
computation).  Mandating PKCE universally simplifies the
specification and eliminates a class of attacks.

### Why Independent Scopes?

Making `scheduling:write` not imply `scheduling:read` follows
the principle of least privilege.  A server-side automation that
only needs to cancel bookings should not automatically gain read
access to all scheduling data.  Independent scopes allow
fine-grained access control.

### Why Mandatory User Confirmation?

LLM agents can hallucinate or misinterpret user intent.  A
misinterpreted "maybe next Thursday" could become a confirmed
booking.  Mandatory confirmation prevents accidental bookings.
This is especially important because scheduling actions have
real-world consequences (no-show fees, blocked time, attendee
notifications).

### Why No Token Forwarding?

Token forwarding (passing the upstream provider's token to the
MCP host) would violate the principle of separation of concerns.
The MCP host should not know or care which upstream provider is
being used or hold credentials for it.  This also prevents token
leakage through MCP host logs, prompt caches, or conversation
history.

### Why Audit Logging?

Scheduling operations create commitments for real people.
Disputes ("I didn't book this") require an audit trail.
Compliance requirements (healthcare, legal) often mandate
logging of appointment-related actions.  Making audit logging
a SHOULD (not a MUST) allows lightweight implementations while
strongly encouraging the practice.

## Security Considerations

This entire document constitutes security considerations.  The
key threats addressed are:

1. **Unauthorized access.**  Mitigated by OAuth 2.1 with PKCE
   and least-privilege scopes.

2. **Accidental or malicious booking.**  Mitigated by mandatory
   user confirmation for all write operations.

3. **Token leakage.**  Mitigated by prohibiting tokens in tool
   responses, encrypting at rest, and not forwarding upstream
   tokens.

4. **PII exposure.**  Mitigated by data minimization in tool
   outputs, redaction in logs, and encryption at rest and in
   transit.

5. **Replay attacks.**  Mitigated by idempotency keys
   (`client_intent_id`) and refresh token rotation.

6. **Man-in-the-middle attacks.**  Mitigated by mandatory TLS
   1.2+ with certificate validation.

7. **Webhook abuse.**  Mitigated by HTTPS-only callbacks, HMAC
   verification, and PII minimization in payloads.

8. **Denial of service.**  Mitigated by rate limiting with
   per-user quotas and structured E_RATE_LIMITED errors.

Implementors MUST review these requirements carefully.  Security
is not optional.  An ASP server that does not meet these
requirements MUST NOT claim ASP compliance.

## References

- [RFC 2119] Bradner, S., "Key words for use in RFCs to Indicate
  Requirement Levels", BCP 14, RFC 2119, March 1997.
- [RFC 5322] Resnick, P., "Internet Message Format", RFC 5322,
  October 2008.
- [RFC 6749] Hardt, D., "The OAuth 2.0 Authorization Framework",
  RFC 6749, October 2012.
- [RFC 7591] Richer, J., et al., "OAuth 2.0 Dynamic Client
  Registration Protocol", RFC 7591, July 2015.
- [RFC 7592] Richer, J., et al., "OAuth 2.0 Dynamic Client
  Registration Management Protocol", RFC 7592, July 2015.
- [RFC 7636] Sakimura, N., Bradley, J., and N. Agarwal, "Proof
  Key for Code Exchange by OAuth Public Clients", RFC 7636,
  September 2015.
- [OAuth 2.1] Hardt, D., Parecki, A., and T. Lodderstedt,
  "The OAuth 2.1 Authorization Framework", draft-ietf-oauth-v2-1.
- [ASP-0003] ASP Working Group, "MCP Tool Profile", ASP-0003, 2026.
- [ASP-0005] ASP Working Group, "Error Model", ASP-0005, 2026.
- [MCP] Anthropic, "Model Context Protocol Specification", 2024.
