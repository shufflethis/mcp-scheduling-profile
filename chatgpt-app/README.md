# ChatGPT App — ASP Reference Implementation

## Purpose

This directory contains materials for a reference ChatGPT App that demonstrates the Agentic Scheduling Profile (ASP) tools in a ChatGPT App context. The app would allow ChatGPT users to search availability, book appointments, reschedule, cancel, and manage bookings across multiple scheduling providers through a unified conversational interface.

## Status

**Not implemented yet — Phase 2.**

The current phase (Phase 1) focuses on the profile specification, JSON Schemas, and reference MCP server skeleton. The ChatGPT App will be built once the MCP server is functional with at least one real provider adapter (Google Calendar).

Current ChatGPT Apps use an MCP server as the required integration point. A web UI is optional and can be rendered through the MCP Apps UI extension in a sandboxed iframe. ASP should therefore expose a remote MCP server first, then add UI resources only where they improve scheduling flows.

## Architecture

```
┌──────────────────────┐
│     ChatGPT Host     │
│  (LLM + App Runtime) │
└──────────┬───────────┘
           │ MCP tool calls + optional MCP Apps UI
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

- **ChatGPT Host** acts as the MCP client. It discovers ASP tools, invokes them, and can render optional MCP Apps UI resources returned by the server.
- **ASP MCP Server** implements the 9 ASP tools, dispatches calls to the appropriate provider adapter, and returns structured results.
- **Provider Adapters** translate ASP operations into provider-specific API calls (Google Calendar API, Calendly API, CalDAV protocol, etc.).

The ChatGPT host itself orchestrates the conversation, decides when to call tools, and presents results to the user. The ASP server has no direct interaction with the user.

## Policy Compliance

ASP keeps scheduling separate from commerce and payment:

- **Scheduling only, no payment.** ASP explicitly excludes payment processing from its scope. The profile handles availability search, booking, rescheduling, cancellation, and event export.
- **Coordination, not checkout.** Booking a time slot is a coordination action between people or systems.
- **Payment handoff.** If a provider requires payment (e.g., paid consultation booking), ASP should hand off to ACP (Agentic Commerce Protocol) or another compliant checkout flow for the payment step. This separation keeps ASP itself commerce-free.

## Files

| File | Description |
|------|-------------|
| `README.md` | This file |
| `manifest.todo.json` | Placeholder for target ChatGPT app configuration; verify against current Apps SDK submission docs before implementation |

## Prerequisites for Phase 2

Before implementing the ChatGPT App:

1. The ASP MCP server must be functional with at least one provider adapter.
2. OAuth flows for provider authentication must be implemented in the server.
3. Tool results should expose structured content, not only serialized JSON text.
4. Optional UI resources should use MCP Apps metadata and provide text-only fallback behavior.
5. The app should be tested in ChatGPT Developer Mode before submission.

## References

- [MCP Specification](https://modelcontextprotocol.io/)
- [MCP Apps](https://modelcontextprotocol.io/docs/extensions/apps)
- [OpenAI Apps SDK](https://developers.openai.com/apps-sdk)
- [ASP RFC-0003: MCP Tool Surface](../rfcs/) — defines the 9 ASP tools
