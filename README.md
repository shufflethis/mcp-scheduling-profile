# Agentic Scheduling Profile (ASP)

**A vendor-neutral MCP profile for agentic appointment booking.**

> **Status: Draft — RFC stage, not production.**
> This repository contains specifications, JSON Schemas, and a reference server skeleton. No production integrations exist yet.

---

## Why This Exists

Existing calendar standards (iCalendar, iTIP, CalDAV, JSCalendar) solve event **representation** and parts of **scheduling**, but none define a shared **agent-facing tool profile** for LLM hosts like ChatGPT, Claude, Copilot, or other MCP clients. Meanwhile, commerce has the [Agentic Commerce Protocol (ACP)](https://developers.openai.com/commerce) from OpenAI and Stripe — scheduling has no equivalent MCP profile.

ASP closes this gap by defining:

1. **MCP as the integration surface** — ASP standardizes MCP tool names, schemas, results, and safety rules. It is a profile on top of MCP, not a new transport protocol.
2. **JSCalendar as the object model** — JSON-native, machine-readable. iCalendar/ICS remains the import/export boundary only.
3. **Vendor-neutral tool surface** — One profile that works across Google Calendar, Calendly, CalDAV, and future providers.
4. **Scheduling, not commerce** — The first shippable surface is Booking + Reschedule + Cancel + Sync. Payment is explicitly out of scope.
5. **Provider feature discovery** — Providers differ. ASP handles this gracefully via structured provider capability flags, separate from MCP protocol capabilities.
6. **Safe agentic writes** — Booking, rescheduling, cancellation, and holds require idempotency keys and explicit user confirmation.

## MCP Tool Surface

| Tool | Purpose | Type |
|------|---------|------|
| `get_capabilities` | Return provider capability flags | Read |
| `search_availability` | Query free slots from a provider | Read |
| `hold_slot` | Optional soft-reservation before confirm | Write |
| `book_appointment` | Confirm a booking | Write |
| `reschedule_appointment` | Change time of existing booking | Write |
| `cancel_appointment` | Cancel existing booking | Write |
| `get_booking` | Fetch a booking by ID | Read |
| `export_ics` | Export booking as iCalendar/ICS | Read |
| `subscribe_events` | Subscribe to provider changes | Write |

## Provider Capability Matrix

| Capability | Google Calendar | Calendly | CalDAV |
|---|---|---|---|
| Hold (soft-reservation) | Partial | No | Partial |
| Reschedule | Yes | Yes | Yes |
| Group booking | Yes | TODO(verify) | Yes |
| Meeting link | Yes | Yes | No |
| Webhooks | Yes | Yes | Partial |
| Round-robin | No | Yes | No |
| Free/busy | Yes | Yes | TODO(verify) |
| ICS export | Yes | TODO(verify) | Yes (native) |

See [docs/provider-capability-matrix.md](docs/provider-capability-matrix.md) for the full matrix.

## Specifications

| RFC | Title |
|-----|-------|
| [0001](rfcs/0001-problem-statement.md) | Problem Statement |
| [0002](rfcs/0002-object-model.md) | Object Model |
| [0003](rfcs/0003-mcp-tool-profile.md) | MCP Tool Profile |
| [0004](rfcs/0004-capability-negotiation.md) | Provider Feature Discovery |
| [0005](rfcs/0005-error-model.md) | Error Model |
| [0006](rfcs/0006-security-and-auth.md) | Security and Authorization |

See also: [Whitepaper](paper/whitepaper.md)

## Quickstart (Reference Server)

```bash
# Clone and install
git clone https://github.com/shufflethis/mcp-scheduling-profile.git
cd mcp-scheduling-profile
npm install

# Run the reference server (uses MockAdapter)
npm run start:server
```

The reference server uses a `MockAdapter` that returns deterministic example responses. It implements all 9 tools and validates input against JSON Schemas. See [reference-server/README.md](reference-server/README.md).

## Non-Goals

- **No payment processing.** ASP is scheduling infrastructure. Paid bookings should hand off to ACP or an external checkout/payment flow instead of embedding payment semantics in ASP.
- **No single-provider lock-in.** Calendly-only is already solved (Calendly runs its own MCP server). The value is unification.
- **No identity provider.** ASP delegates authentication to OAuth 2.1 + PKCE. It does not manage user identity.
- **No scheduling policy AI.** ASP does not decide "the best time for 5 people." It provides the tools; the LLM host provides the intelligence.

## Project Structure

```
rfcs/               RFC specifications (0001-0006)
schemas/            JSON Schema definitions (draft 2020-12)
adapters/           Provider adapter contract + stubs
reference-server/   Minimal MCP server skeleton
chatgpt-app/        ChatGPT App placeholder
examples/           OpenAPI wrapper, sample requests/responses
paper/              Academic whitepaper
docs/               Design docs, comparisons, roadmap
```

## Related Work

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io) — The open protocol ASP profiles
- [MCP Apps](https://modelcontextprotocol.io/docs/extensions/apps) — Optional interactive UI extension for MCP tools
- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk) — ChatGPT app framework built on MCP
- [Agentic Commerce Protocol (ACP)](https://developers.openai.com/commerce) — Commerce and checkout standard from OpenAI and Stripe; complementary to ASP for paid bookings
- [Calendly MCP Server](https://developer.calendly.com/calendly-mcp-server) — Single-provider MCP server; ASP aims to unify across providers

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Spec changes go through the RFC process.

## License

[Apache-2.0](LICENSE)
