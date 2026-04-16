import type { SchedulingAdapter } from '../_contract/adapter.interface.js';
import type {
  Capabilities,
  AvailabilityQuery,
  AvailabilityResponse,
  HoldReceipt,
  BookingIntent,
  BookingConfirmation,
  Booking,
  ProviderEvent,
  Subscription,
} from '../../reference-server/src/types.js';

/**
 * Calendly adapter stub.
 * TODO: Implement against Calendly Scheduling API v2.
 * NOTE: Consider consuming Calendly's own MCP server where possible
 *       and falling back to the REST API for gaps.
 */
export class CalendlyAdapter implements SchedulingAdapter {
  readonly id = 'calendly';
  readonly name = 'Calendly';

  async getCapabilities(): Promise<Capabilities> {
    // TODO: Implement — return static capability declaration
    // Calendly has constraints: event-type-based, not free-form calendar
    throw new Error('Not implemented');
  }

  async searchAvailability(_query: AvailabilityQuery): Promise<AvailabilityResponse> {
    // TODO: Implement via GET /event_type_available_times
    throw new Error('Not implemented');
  }

  async holdSlot?(_slotId: string, _ttlSeconds: number): Promise<HoldReceipt> {
    // TODO: Calendly does not natively support hold semantics
    // Evaluate if emulation is possible or if this should remain unsupported
    throw new Error('Not implemented');
  }

  async book(_intent: BookingIntent): Promise<BookingConfirmation> {
    // TODO: Implement via scheduling links or POST /scheduled_events
    // Verify: can events be created via API or only via scheduling links?
    throw new Error('Not implemented');
  }

  async reschedule(_bookingId: string, _newSlotId: string, _clientIntentId: string): Promise<BookingConfirmation> {
    // TODO: Implement via POST /scheduled_events/{uuid}/reschedule
    throw new Error('Not implemented');
  }

  async cancel(_bookingId: string, _clientIntentId: string): Promise<BookingConfirmation> {
    // TODO: Implement via POST /scheduled_events/{uuid}/cancellation
    throw new Error('Not implemented');
  }

  async get(_bookingId: string): Promise<Booking> {
    // TODO: Implement via GET /scheduled_events/{uuid}
    throw new Error('Not implemented');
  }

  async exportIcs(_bookingId: string): Promise<string> {
    // TODO: Calendly does not expose ICS export directly
    // Would need to construct ICS from event data fields
    throw new Error('Not implemented');
  }

  async subscribe?(_handler: (event: ProviderEvent) => void): Promise<Subscription> {
    // TODO: Implement via POST /webhook_subscriptions
    // Calendly supports webhooks natively
    throw new Error('Not implemented');
  }
}
