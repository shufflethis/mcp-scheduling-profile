# ACP vs. ASP: Side-by-Side Comparison

This document compares the Agentic Commerce Protocol (ACP) and the Agentic Scheduling Profile (ASP). The two efforts are complementary: ACP addresses commerce and checkout, while ASP defines a vendor-neutral MCP tool profile for appointment scheduling.

## Comparison Table

| Axis | ACP (Agentic Commerce Protocol) | ASP (Agentic Scheduling Profile) |
|---|---|---|
| **Domain** | Commerce (products, cart, checkout) | Scheduling (availability, booking, lifecycle) |
| **Stewardship** | OpenAI + Stripe, with ecosystem participation | Community draft (this project) |
| **Object model** | Product, Cart, Order | Slot, BookingIntent, BookingConfirmation |
| **Integration surface** | Product feed, checkout, delegated payment, order lifecycle | MCP tools, JSON Schemas, provider adapters |
| **State-changing operations** | Checkout, payment credential delegation, order updates | Hold slot, book, reschedule, cancel |
| **Payment** | Core concern | Explicitly out of scope |
| **ChatGPT relationship** | Commerce infrastructure for merchant/product flows in ChatGPT | MCP profile usable by ChatGPT Apps and other MCP clients |
| **Maturity** | Published (2025) | Draft (2026) |
| **Relationship** | Complementary; paid bookings can combine ACP for payment with ASP for scheduling | |

## Detailed Comparison

### Domain and Scope

ACP models commerce as a funnel: product discovery -> cart/checkout -> payment credential delegation -> order lifecycle. Each step maps to commerce objects and merchant/payment infrastructure.

ASP models scheduling as a lifecycle: provider feature discovery -> availability search -> optional hold -> booking -> lifecycle management (reschedule, cancel, export). Each step maps to MCP tools that manipulate scheduling objects (slots, booking intents, booking confirmations).

The two domains are distinct but adjacent. Many real-world scenarios involve both: booking a paid consultation requires scheduling (ASP) and payment (ACP). The protocols are designed to be composable for these scenarios.

### Object Models

| ACP Object | Purpose | ASP Equivalent | Purpose |
|---|---|---|---|
| Product | Purchasable item | Slot | Bookable time interval |
| Cart | Collection of items for purchase | BookingIntent | Request to create a booking |
| Order | Confirmed purchase | BookingConfirmation | Confirmed booking |
| — | — | ProviderCapabilities | Feature discovery manifest |
| — | — | Hold | Temporary slot reservation |

ASP has no equivalent of ACP's Cart (there is no "shopping cart" for appointments — you book one slot at a time). ACP and ASP both need discovery, but ASP's ProviderCapabilities are specifically about provider feature variance such as holds, round-robin assignment, meeting links, and CalDAV server differences.

### Discovery

Both efforts use discovery, but at different layers:

- **ACP**: Discovery focuses on merchant/product/checkout/payment capabilities.
- **ASP**: `get_capabilities` focuses on scheduling-provider features (holds, reschedule, webhooks, meeting links, resource booking). This is provider feature discovery, not a replacement for MCP protocol capability negotiation.

### Error Handling

Both protocols use structured errors with machine-readable codes. ASP's error model is directly inspired by ACP's approach. The error codes differ by domain:

- **ACP**: `OUT_OF_STOCK`, `PAYMENT_FAILED`, `CART_EXPIRED`
- **ASP**: `E_SLOT_UNAVAILABLE`, `E_HOLD_EXPIRED`, `E_CAPABILITY_UNSUPPORTED`

### Policy Implications

ACP must navigate ChatGPT App commerce restrictions carefully. Digital services commerce has specific policy constraints.

ASP avoids payment and checkout semantics by excluding payment from its scope. Scheduling is a coordination action; when a booking is paid, ASP should coordinate the slot lifecycle and hand payment to ACP or another compliant checkout flow.

### Interoperation Pattern

For a paid booking scenario (e.g., booking a $100 consultation):

1. **ASP**: `get_capabilities` -> `search_availability` -> `hold_slot` (reserve the time)
2. **ACP**: Create cart -> checkout -> payment (handle the financial transaction)
3. **ASP**: `book_appointment` (confirm the booking after payment succeeds)

If payment fails, the hold expires and the slot becomes available again. This two-phase approach keeps scheduling and payment concerns cleanly separated.
