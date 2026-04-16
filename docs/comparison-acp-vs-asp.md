# ACP vs. ASP: Side-by-Side Comparison

This document compares the Agentic Commerce Protocol (ACP) and the Agentic Scheduling Protocol (ASP). The two protocols are complementary — they address different domains but share architectural patterns and can interoperate for scenarios like paid appointment booking.

## Comparison Table

| Axis | ACP (Agentic Commerce Protocol) | ASP (Agentic Scheduling Protocol) |
|---|---|---|
| **Domain** | Commerce (products, cart, checkout) | Scheduling (availability, booking, lifecycle) |
| **Sponsor** | Shopify | Community (this project) |
| **Object model** | Product, Cart, Order | Slot, BookingIntent, BookingConfirmation |
| **Transport** | MCP | MCP |
| **Write operations** | Add to cart, checkout, payment | Hold slot, book, reschedule, cancel |
| **Payment** | Core concern | Explicitly out of scope |
| **Policy** | ChatGPT App commerce restrictions apply | Scheduling-friendly (no commerce policy conflict) |
| **Maturity** | Published (2025) | Draft (2026) |
| **Relationship** | Complementary — ASP could hand off to ACP for paid bookings | |

## Detailed Comparison

### Domain and Scope

ACP models commerce as a funnel: product discovery -> cart management -> checkout -> order tracking. Each step maps to tools that manipulate commerce objects (products, carts, orders).

ASP models scheduling as a lifecycle: capability discovery -> availability search -> (optional hold) -> booking -> lifecycle management (reschedule, cancel, export). Each step maps to tools that manipulate scheduling objects (slots, booking intents, booking confirmations).

The two domains are distinct but adjacent. Many real-world scenarios involve both: booking a paid consultation requires scheduling (ASP) and payment (ACP). The protocols are designed to be composable for these scenarios.

### Object Models

| ACP Object | Purpose | ASP Equivalent | Purpose |
|---|---|---|---|
| Product | Purchasable item | Slot | Bookable time interval |
| Cart | Collection of items for purchase | BookingIntent | Request to create a booking |
| Order | Confirmed purchase | BookingConfirmation | Confirmed booking |
| — | — | ProviderCapabilities | Feature discovery manifest |
| — | — | Hold | Temporary slot reservation |

ASP has no equivalent of ACP's Cart (there is no "shopping cart" for appointments — you book one slot at a time). ACP has no equivalent of ASP's ProviderCapabilities (commerce capabilities are less variable across providers than scheduling capabilities).

### Capability Negotiation

Both protocols use capability negotiation, but with different granularity:

- **ACP**: Capability discovery focuses on what the merchant supports (payment methods, shipping options, digital vs. physical goods).
- **ASP**: Capability discovery focuses on what the scheduling provider supports (holds, reschedule, webhooks, meeting links, resource booking). ASP's capability model is more granular because scheduling providers vary more in feature sets than commerce providers.

### Error Handling

Both protocols use structured errors with machine-readable codes. ASP's error model is directly inspired by ACP's approach. The error codes differ by domain:

- **ACP**: `OUT_OF_STOCK`, `PAYMENT_FAILED`, `CART_EXPIRED`
- **ASP**: `SLOT_UNAVAILABLE`, `HOLD_EXPIRED`, `CAPABILITY_NOT_SUPPORTED`

### Policy Implications

ACP must navigate ChatGPT App commerce restrictions carefully. Digital services commerce has specific policy constraints.

ASP avoids commerce policy issues entirely by excluding payment from its scope. Scheduling is a coordination action, not a commercial transaction. This makes ASP inherently easier to pass through ChatGPT App review.

### Interoperation Pattern

For a paid booking scenario (e.g., booking a $100 consultation):

1. **ASP**: `get_capabilities` -> `search_availability` -> `hold_slot` (reserve the time)
2. **ACP**: Create cart -> checkout -> payment (handle the financial transaction)
3. **ASP**: `book_appointment` (confirm the booking after payment succeeds)

If payment fails, the hold expires and the slot becomes available again. This two-phase approach keeps scheduling and payment concerns cleanly separated.
