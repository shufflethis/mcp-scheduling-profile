# ASP Adapters

## What is an Adapter?

An adapter is a **bridge** between the ASP (Appointment Scheduling Profile) tool surface and a specific scheduling provider's API. Each adapter translates ASP's standardized MCP tool calls into the native API calls of a particular provider (e.g., Google Calendar, Calendly, CalDAV).

## Contract

All adapters **must** implement the `SchedulingAdapter` interface defined in `_contract/adapter.interface.ts`. This ensures every provider exposes a uniform surface to the ASP reference server, regardless of how different the underlying APIs are.

## Capability Flags

Not every provider supports every feature. Adapters declare **capability flags** (see `_contract/adapter.capabilities.ts`) that indicate which optional methods they support:

- If a provider declares a capability (e.g., `supports_hold`), the corresponding method (`holdSlot`) **must** be implemented.
- If a capability is not declared, the optional method may be omitted or left as a stub.
- The reference server uses these flags to determine which tools to expose to MCP clients.

## Current Status

All adapter implementations are currently **stubs** — they define the correct shape but throw `Not implemented` errors. Phase 2 of the project will provide real implementations against each provider's API.

## How to Add a New Adapter

1. Create a new directory under `adapters/` named after your provider (e.g., `adapters/outlook/`).
2. Implement the `SchedulingAdapter` interface from `_contract/adapter.interface.ts`.
3. Declare the appropriate capability flags via `getCapabilities()`.
4. Add a `README.md` documenting the mapping between ASP tools and the provider's native API.
5. Register the adapter in the adapter registry (see reference server).

## Directory Structure

```
adapters/
  _contract/
    adapter.interface.ts      # SchedulingAdapter interface
    adapter.capabilities.ts   # CapabilityFlag enum + method map
  google/
    README.md                 # Google Calendar API mapping
    stubs.ts                  # Stub implementation
  calendly/
    README.md                 # Calendly API mapping
    stubs.ts                  # Stub implementation
  caldav/
    README.md                 # CalDAV/iTIP mapping
    stubs.ts                  # Stub implementation
```
