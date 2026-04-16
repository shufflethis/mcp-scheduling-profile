# ChatGPT App — ASP Reference Implementation

## Purpose

This directory contains materials for a reference ChatGPT App that demonstrates the Agentic Scheduling Protocol (ASP) tools in a ChatGPT App context. The app would allow ChatGPT users to search availability, book appointments, reschedule, cancel, and manage bookings across multiple scheduling providers through a unified conversational interface.

## Status

**Not implemented yet — Phase 2.**

The current phase (Phase 1) focuses on the protocol specification, JSON Schemas, and reference MCP server skeleton. The ChatGPT App will be built once the MCP server is functional with at least one real provider adapter (Google Calendar).

## Architecture

```
┌──────────────────────┐
│     ChatGPT Host     │
│  (LLM + App Runtime) │
└──────────┬───────────┘
           │ MCP (tool calls)
           ▼
┌──────────────────────┐
│   ChatGPT App Layer  │
│   (MCP Client)       │
└──────────┬───────────┘
           │ MCP transport (stdio or SSE)
           ▼
┌──────────────────────┐
│   ASP MCP Server     │
│   (MCP Server)       │
├──────────────────────┤
│  Adapter Registry    │
├────┬────┬────┬───────┤
│Goog│Caly│CalD│ ...   │
│ le │ndly│ AV │       │
└────┴────┴────┴───────┘
```

- **ChatGPT App** acts as the MCP client. It receives tool-call requests from the ChatGPT host and forwards them to the ASP MCP server.
- **ASP MCP Server** acts as the MCP server. It implements the 9 ASP tools, dispatches calls to the appropriate provider adapter, and returns structured results.
- **Provider Adapters** translate ASP operations into provider-specific API calls (Google Calendar API, Calendly API, CalDAV protocol, etc.).

The ChatGPT host itself orchestrates the conversation, decides when to call tools, and presents results to the user. The ASP server has no direct interaction with the user.

## Policy Compliance

ChatGPT App policy currently restricts commerce for digital services. ASP is designed to be compliant with this policy:

- **Scheduling only, no payment.** ASP explicitly excludes payment processing from its scope. The protocol handles availability search, booking, rescheduling, cancellation, and event export — none of which involve financial transactions.
- **No digital goods commerce.** Booking a time slot is not a purchase of a digital good. It is a coordination action between people.
- **Future payment handoff.** If a provider requires payment (e.g., paid consultation booking), ASP would hand off to ACP (Agentic Commerce Protocol) for the payment step. This separation keeps ASP itself commerce-free.

## Files

| File | Description |
|------|-------------|
| `README.md` | This file |
| `manifest.todo.json` | Placeholder for the ChatGPT App manifest (schema TBD by OpenAI) |

## Prerequisites for Phase 2

Before implementing the ChatGPT App:

1. OpenAI must publish the final ChatGPT App manifest schema (currently evolving).
2. OpenAI must finalize MCP support in ChatGPT Apps (currently in preview).
3. The ASP MCP server must be functional with at least one provider adapter.
4. OAuth flows for provider authentication must be implemented in the server.

## References

- [MCP Specification](https://modelcontextprotocol.io/)
- [ChatGPT Apps Documentation](https://platform.openai.com/docs/chatgpt-apps) (TODO: verify URL when published)
- [ASP RFC-0003: MCP Tool Surface](../rfcs/) — defines the 9 ASP tools
