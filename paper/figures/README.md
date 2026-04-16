# Figures

Diagrams needed for the whitepaper. No images created yet — to be produced in Phase 2.

## Planned Diagrams

### 1. Architecture Overview
High-level system architecture showing the data flow:
```
LLM Host -> MCP Transport -> ASP MCP Server -> Adapter Registry -> Provider Adapters -> Provider APIs
```
Should show multiple LLM hosts (ChatGPT, Claude Desktop) on the left and multiple providers (Google Calendar, Calendly, CalDAV) on the right, with the ASP server as the mediating layer.

### 2. Tool Call Sequence Diagram
UML sequence diagram showing the typical booking flow:
```
User -> LLM Host -> ASP Server -> Provider
  |        |           |            |
  |  "book me a slot"  |            |
  |        |--get_capabilities----->|
  |        |<--capabilities---------|
  |        |--search_availability-->|
  |        |<--slots----------------|
  |  "pick slot 2"     |            |
  |        |--hold_slot------------>|
  |        |<--hold confirmation----|
  |  "confirm booking" |            |
  |        |--book_appointment----->|
  |        |<--booking confirmation-|
  |  "here's your booking"          |
```

### 3. Capability Negotiation Flow
Flowchart showing the decision tree:
- Call get_capabilities
- Check supports_hold -> if yes, offer hold step
- Check supports_reschedule -> if yes, enable reschedule in UI
- Check supports_webhooks -> if yes, offer subscription
- Fallback behavior for unsupported capabilities

### 4. Object Model Relationships
Entity-relationship diagram showing:
- Slot (1) -- (0..1) Hold
- Slot (1) -- (0..1) BookingConfirmation
- BookingIntent (1) -- (1) BookingConfirmation
- Provider (1) -- (*) Slot
- ProviderCapabilities (1) -- (1) Provider

### 5. Provider Comparison Matrix (Visual)
Heatmap-style visual showing feature support across providers:
- Rows: capabilities (hold, reschedule, group booking, etc.)
- Columns: providers (Google, Calendly, CalDAV)
- Cells: green (supported), yellow (partial), red (not supported), gray (unknown)

## Format

Target format: SVG for web, PDF for paper. Source files in draw.io or Mermaid where possible for maintainability.
