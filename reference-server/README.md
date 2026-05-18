# ASP Reference MCP Server

A minimal reference MCP server implementing the **Agentic Scheduling Profile (ASP)** tool surface.

## Overview

- Built with `@modelcontextprotocol/sdk`
- Backed by an in-memory **MockAdapter** that returns deterministic example responses
- **Not production-ready** -- intended for demos, testing, and as a starting point for real adapter implementations
- All 9 ASP tools are registered and callable over stdio transport
- Input is validated against JSON Schemas via `ajv`

## Tools

| Tool | Type | Description |
|------|------|-------------|
| `get_capabilities` | Read | Return provider capability flags |
| `search_availability` | Read | Query available time slots |
| `hold_slot` | Write | Temporarily hold a slot |
| `book_appointment` | Write | Confirm a booking |
| `reschedule_appointment` | Write | Reschedule an existing booking |
| `cancel_appointment` | Write | Cancel a booking |
| `get_booking` | Read | Fetch booking details |
| `export_ics` | Read | Export booking as ICS |
| `subscribe_events` | Write | Subscribe to booking events |

## Running

```bash
npm install
npm run start:server
```

The server communicates over stdio using the MCP protocol.

## Project Structure

```
reference-server/
  src/
    server.ts       # Main MCP server with all tool handlers
    types.ts        # TypeScript types mirroring ASP JSON schemas
    registry.ts     # Adapter registry + MockAdapter
    tools/          # Per-tool documentation stubs
  package.json
```
