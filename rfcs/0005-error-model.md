# ASP-0005: Error Model

| Field    | Value            |
|----------|------------------|
| Status   | Draft            |
| Author   | ASP Working Group |
| Created  | 2026-04-16       |

## Abstract

This document defines the error model for the Agentic Scheduling
Profile (ASP).  All ASP tools use a single, structured error
format.  Each error carries a machine-readable code, a
human-readable message, a retryability flag, and an optional
details object.  This specification enumerates every error code,
defines when each is raised, and provides client guidance.

## Motivation

LLM agents handle errors differently from traditional software
clients.  A traditional client can parse an HTTP status code and
branch on it.  An LLM agent needs structured context to decide
its next action: Should it retry?  Should it ask the user for
input?  Should it try a different tool?

Unstructured error messages (e.g., "Something went wrong") force
the LLM to guess.  Structured error codes with explicit
retryability flags and client guidance eliminate guesswork.

ASP defines a fixed error taxonomy.  Every error code has a
defined meaning, a defined retryability, and defined client
guidance.  Servers MUST use these codes.  Servers MUST NOT invent
ad-hoc error codes outside this taxonomy (extensions are permitted
via the `details` object).

## Specification

### Error Object Schema

Every failed tool invocation MUST return an Error object.  The
Error object is defined in ASP-0002.  This section restates the
schema for completeness.

```json
{
  "type": "object",
  "properties": {
    "code": {
      "type": "string",
      "description": "Machine-readable error code from the ASP error taxonomy."
    },
    "message": {
      "type": "string",
      "description": "Human-readable error description. May be shown to end users."
    },
    "retryable": {
      "type": "boolean",
      "description": "true if the client MAY retry the same request."
    },
    "details": {
      "type": "object",
      "description": "Additional structured context. Schema varies by error code.",
      "additionalProperties": true
    }
  },
  "required": ["code", "message", "retryable"]
}
```

### General Rules

1. **One error per response.**  A failed tool invocation returns
   exactly one Error object.  Servers MUST NOT return arrays of
   errors.

2. **Code is the primary discriminator.**  Clients MUST branch
   on `code`, not on `message`.  The `message` field is for
   human consumption and MAY change between server versions.

3. **Retryable means safe to retry.**  When `retryable` is `true`,
   the client MAY retry the identical request.  The server MUST
   handle retries correctly (idempotently for booking lifecycle
   writes and by deduplicating subscription writes).
   When `retryable` is `false`, retrying the identical request
   will produce the same error.

4. **Details are structured.**  The `details` object provides
   machine-readable context specific to the error code.  Clients
   SHOULD use `details` to provide better guidance to the user.
   Clients MUST tolerate unknown fields in `details`.

5. **Servers MUST NOT invent top-level error codes.**  All error
   codes are defined in this specification.  Servers that need
   to communicate additional context MUST use the `details`
   object.

### Error Code Taxonomy

#### E_CAPABILITY_UNSUPPORTED

| Property         | Value |
|------------------|-------|
| Code             | `E_CAPABILITY_UNSUPPORTED` |
| Retryable        | No |
| When to raise    | A tool is invoked that requires a capability the provider does not support. |

**Client Guidance:**

The client MUST NOT retry this request.  The client SHOULD
suggest an alternative approach to the user.  For example, if
`hold_slot` fails because `supports_hold` is `false`, the client
SHOULD suggest proceeding directly to `book_appointment`.

**Details Schema:**

```json
{
  "capability": "supports_hold",
  "tool": "hold_slot",
  "suggestion": "This provider does not support holds. Proceed directly to book_appointment."
}
```

**Example:**

```json
{
  "code": "E_CAPABILITY_UNSUPPORTED",
  "message": "The provider does not support slot holds.",
  "retryable": false,
  "details": {
    "capability": "supports_hold",
    "tool": "hold_slot",
    "suggestion": "Proceed directly to book_appointment."
  }
}
```

---

#### E_SLOT_UNAVAILABLE

| Property         | Value |
|------------------|-------|
| Code             | `E_SLOT_UNAVAILABLE` |
| Retryable        | Yes (with re-search) |
| When to raise    | The requested slot is no longer available. Another party booked it, or the provider removed it. |

**Client Guidance:**

The client SHOULD call `search_availability` to find alternative
slots.  The client SHOULD inform the user that the originally
selected slot is no longer available and present alternatives.

**Details Schema:**

```json
{
  "slotId": "slot-2026-05-01-1400-drcarter",
  "reason": "booked_by_another",
  "suggestion": "Call search_availability to find alternative slots."
}
```

**Example:**

```json
{
  "code": "E_SLOT_UNAVAILABLE",
  "message": "The requested slot is no longer available.",
  "retryable": true,
  "details": {
    "slotId": "slot-2026-05-01-1400-drcarter",
    "reason": "booked_by_another",
    "suggestion": "Call search_availability to refresh available slots."
  }
}
```

---

#### E_HOLD_EXPIRED

| Property         | Value |
|------------------|-------|
| Code             | `E_HOLD_EXPIRED` |
| Retryable        | Yes |
| When to raise    | A `book_appointment` call references a slot that was held, but the hold TTL has elapsed. The slot may or may not still be available. |

**Client Guidance:**

The client SHOULD attempt to re-hold the slot (if
`supports_hold` is `true`) or re-search for availability.  The
client SHOULD inform the user that the hold expired and prompt
for confirmation before proceeding.

**Details Schema:**

```json
{
  "slotId": "slot-2026-05-01-1400-drcarter",
  "holdExpiredAt": "2026-05-01T13:55:00Z",
  "suggestion": "Re-hold the slot or search for new availability."
}
```

**Example:**

```json
{
  "code": "E_HOLD_EXPIRED",
  "message": "The hold on the requested slot has expired.",
  "retryable": true,
  "details": {
    "slotId": "slot-2026-05-01-1400-drcarter",
    "holdExpiredAt": "2026-05-01T13:55:00Z",
    "suggestion": "Re-hold the slot or call search_availability."
  }
}
```

---

#### E_IDEMPOTENCY_CONFLICT

| Property         | Value |
|------------------|-------|
| Code             | `E_IDEMPOTENCY_CONFLICT` |
| Retryable        | No |
| When to raise    | The `clientIntentId` was already used with different parameters. |

**Client Guidance:**

This is a client error.  The client MUST generate a new
`clientIntentId` for the new request.  The client MUST NOT
reuse intent ids across logically different operations.

**Details Schema:**

```json
{
  "clientIntentId": "intent-a1b2c3d4",
  "originalTool": "book_appointment",
  "suggestion": "Generate a new clientIntentId for this request."
}
```

**Example:**

```json
{
  "code": "E_IDEMPOTENCY_CONFLICT",
  "message": "This clientIntentId was already used with different parameters.",
  "retryable": false,
  "details": {
    "clientIntentId": "intent-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "originalTool": "book_appointment",
    "suggestion": "Generate a new clientIntentId for this request."
  }
}
```

---

#### E_PROVIDER_UNAVAILABLE

| Property         | Value |
|------------------|-------|
| Code             | `E_PROVIDER_UNAVAILABLE` |
| Retryable        | Yes (with backoff) |
| When to raise    | The upstream scheduling provider is unreachable, timed out, or returned an internal error. |

**Client Guidance:**

The client SHOULD retry with exponential backoff.  A reasonable
starting interval is 2 seconds, with a maximum of 5 retries.
The client SHOULD inform the user that the provider is temporarily
unavailable if retries are exhausted.

**Details Schema:**

```json
{
  "providerId": "provider-drcarter-dental",
  "upstreamStatus": 503,
  "retryAfter": 5,
  "suggestion": "Retry after the indicated delay."
}
```

**Example:**

```json
{
  "code": "E_PROVIDER_UNAVAILABLE",
  "message": "The scheduling provider is temporarily unavailable.",
  "retryable": true,
  "details": {
    "providerId": "provider-drcarter-dental",
    "upstreamStatus": 503,
    "retryAfter": 5,
    "suggestion": "Retry after 5 seconds with exponential backoff."
  }
}
```

---

#### E_AUTH_REQUIRED

| Property         | Value |
|------------------|-------|
| Code             | `E_AUTH_REQUIRED` |
| Retryable        | No (without auth flow) |
| When to raise    | No valid credentials exist for the target provider. The client has not authenticated or the token has expired and cannot be refreshed. |

**Client Guidance:**

The client MUST initiate an authentication flow.  The client
SHOULD inform the user that sign-in is required and provide
instructions or a link.  Retrying without authentication will
produce the same error.

**Details Schema:**

```json
{
  "providerId": "provider-drcarter-dental",
  "authUrl": "https://accounts.example.com/oauth/authorize?...",
  "suggestion": "Sign in to the scheduling provider to continue."
}
```

**Example:**

```json
{
  "code": "E_AUTH_REQUIRED",
  "message": "Authentication is required to access this provider.",
  "retryable": false,
  "details": {
    "providerId": "provider-drcarter-dental",
    "authUrl": "https://accounts.example.com/oauth/authorize",
    "suggestion": "The user must sign in to the scheduling provider."
  }
}
```

---

#### E_AUTH_SCOPE_INSUFFICIENT

| Property         | Value |
|------------------|-------|
| Code             | `E_AUTH_SCOPE_INSUFFICIENT` |
| Retryable        | No (without re-auth) |
| When to raise    | Valid credentials exist, but the token lacks the required scope for the requested operation. |

**Client Guidance:**

The client MUST initiate a re-authentication flow requesting
additional scopes.  The client SHOULD inform the user which
permission is missing and why it is needed.

**Details Schema:**

```json
{
  "requiredScope": "scheduling:write",
  "currentScopes": ["scheduling:read"],
  "suggestion": "Re-authenticate with the scheduling:write scope."
}
```

**Example:**

```json
{
  "code": "E_AUTH_SCOPE_INSUFFICIENT",
  "message": "The current token does not have write permission.",
  "retryable": false,
  "details": {
    "requiredScope": "scheduling:write",
    "currentScopes": ["scheduling:read"],
    "suggestion": "Re-authenticate and request the scheduling:write scope."
  }
}
```

---

#### E_VALIDATION

| Property         | Value |
|------------------|-------|
| Code             | `E_VALIDATION` |
| Retryable        | No |
| When to raise    | The request is malformed.  Required fields are missing, fields have invalid types, or values violate constraints (e.g., end before start, invalid timezone, invalid email format). |

**Client Guidance:**

The client MUST fix the request before retrying.  The `details`
object enumerates the specific validation failures.  The LLM
SHOULD use these details to correct the tool call parameters.

**Details Schema:**

```json
{
  "fields": [
    {
      "field": "dateRange.end",
      "issue": "must be after dateRange.start",
      "value": "2026-04-30T00:00:00Z"
    }
  ],
  "suggestion": "Fix the indicated fields and resubmit."
}
```

**Example:**

```json
{
  "code": "E_VALIDATION",
  "message": "The request contains invalid parameters.",
  "retryable": false,
  "details": {
    "fields": [
      {
        "field": "attendees[0].email",
        "issue": "Invalid email format.",
        "value": "not-an-email"
      },
      {
        "field": "subject",
        "issue": "Required field is missing.",
        "value": null
      }
    ],
    "suggestion": "Correct the listed fields and resubmit the request."
  }
}
```

---

#### E_RATE_LIMITED

| Property         | Value |
|------------------|-------|
| Code             | `E_RATE_LIMITED` |
| Retryable        | Yes (after Retry-After) |
| When to raise    | The client has exceeded the server's or the upstream provider's rate limit. |

**Client Guidance:**

The client MUST wait for the duration specified in `retryAfter`
before retrying.  The client SHOULD NOT retry immediately.  The
client MAY inform the user that the request was rate-limited.

**Details Schema:**

```json
{
  "retryAfter": 30,
  "limit": "60 requests per minute",
  "suggestion": "Wait 30 seconds before retrying."
}
```

**Example:**

```json
{
  "code": "E_RATE_LIMITED",
  "message": "Too many requests. Please wait before retrying.",
  "retryable": true,
  "details": {
    "retryAfter": 30,
    "limit": "60 requests per minute",
    "suggestion": "Wait 30 seconds before retrying."
  }
}
```

### Error Code Summary Table

| Code                       | Retryable | Typical Cause | Primary Guidance |
|----------------------------|-----------|---------------|------------------|
| `E_CAPABILITY_UNSUPPORTED` | No        | Wrong tool for provider | Suggest alternative |
| `E_SLOT_UNAVAILABLE`       | Yes       | Race condition | Re-search |
| `E_HOLD_EXPIRED`           | Yes       | User took too long | Re-hold or re-search |
| `E_IDEMPOTENCY_CONFLICT`   | No        | Client reused intent id | New intent id |
| `E_PROVIDER_UNAVAILABLE`   | Yes       | Upstream failure | Backoff and retry |
| `E_AUTH_REQUIRED`          | No        | No credentials | Auth flow |
| `E_AUTH_SCOPE_INSUFFICIENT`| No        | Missing scope | Re-auth with scope |
| `E_VALIDATION`             | No        | Bad input | Fix request |
| `E_RATE_LIMITED`           | Yes       | Too many requests | Wait Retry-After |

### Error Handling in MCP Context

MCP tool responses use a `content` array with `type: "text"`.
ASP errors MUST be returned as a JSON-serialized Error object
in the tool response content.  The MCP `isError` flag MUST be
set to `true`.

Example MCP error response:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"code\":\"E_SLOT_UNAVAILABLE\",\"message\":\"The requested slot is no longer available.\",\"retryable\":true,\"details\":{\"slotId\":\"slot-2026-05-01-1400-drcarter\",\"suggestion\":\"Call search_availability to refresh.\"}}"
    }
  ],
  "isError": true
}
```

Servers SHOULD also set the `text` to be valid JSON so that LLM
hosts can parse it programmatically.

## Rationale

### Why a Fixed Taxonomy?

A fixed taxonomy ensures that all ASP clients handle errors
consistently.  Without it, server A might use "SLOT_TAKEN" and
server B might use "NO_AVAILABILITY" for the same condition.
The LLM would need per-server error handling logic.

### Why Retryable as a Boolean?

A simple boolean is sufficient for the LLM's decision: "Should I
try again or give up?"  More nuanced retry policies (backoff
intervals, retry counts) belong in the `details` object where
they can vary by error type.

### Why Not HTTP Status Codes?

ASP operates over MCP, not HTTP.  MCP tool responses do not have
HTTP status codes.  Even when an OpenAPI wrapper is used (see
ASP-0003), the ASP error codes provide more specific semantics
than HTTP status codes.  E_SLOT_UNAVAILABLE and E_HOLD_EXPIRED
would both map to HTTP 409, but they have different client
guidance.

### Why One Error Per Response?

Compound errors (multiple things wrong at once) complicate client
logic.  In practice, validation errors are the only case where
multiple issues can occur simultaneously, and these are handled
by the `fields` array in the E_VALIDATION `details` object.

## Security Considerations

Error messages MUST NOT contain PII.  Specifically:

- Error messages MUST NOT include attendee names or email addresses.
- Error messages MUST NOT include calendar event details.
- Error messages MUST NOT include OAuth tokens or credentials.

The `details` object MAY include identifiers (slot ids, booking
ids, provider ids) that are necessary for the client to take
corrective action.  These identifiers are opaque strings and
SHOULD NOT encode PII.

Error messages SHOULD be generic enough that they do not reveal
implementation details of the server or the upstream provider.
For example, `E_PROVIDER_UNAVAILABLE` SHOULD NOT include the
upstream provider's raw error message, which might contain
internal URLs or stack traces.

Servers MUST log all errors for operational monitoring.  Error
logs MAY contain additional context not exposed to the client,
but MUST redact PII per ASP-0006.

## References

- [RFC 2119] Bradner, S., "Key words for use in RFCs to Indicate
  Requirement Levels", BCP 14, RFC 2119, March 1997.
- [ASP-0002] ASP Working Group, "Object Model", ASP-0002, 2026.
- [ASP-0003] ASP Working Group, "MCP Tool Profile", ASP-0003, 2026.
- [ASP-0006] ASP Working Group, "Security and Authorization",
  ASP-0006, 2026.
- [MCP] Anthropic, "Model Context Protocol Specification", 2024.
