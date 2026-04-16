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
 * Google Calendar adapter stub.
 * TODO: Implement against Google Calendar API v3.
 */
export class GoogleCalendarAdapter implements SchedulingAdapter {
  readonly id = 'google';
  readonly name = 'Google Calendar';

  async getCapabilities(): Promise<Capabilities> {
    // TODO: Implement — return static capability declaration
    throw new Error('Not implemented');
  }

  async searchAvailability(_query: AvailabilityQuery): Promise<AvailabilityResponse> {
    // TODO: Implement via freebusy.query
    throw new Error('Not implemented');
  }

  async holdSlot?(_slotId: string, _ttlSeconds: number): Promise<HoldReceipt> {
    // TODO: Implement via tentative event creation (if feasible)
    throw new Error('Not implemented');
  }

  async book(_intent: BookingIntent): Promise<BookingConfirmation> {
    // TODO: Implement via events.insert
    throw new Error('Not implemented');
  }

  async reschedule(_bookingId: string, _newSlotId: string, _clientIntentId: string): Promise<BookingConfirmation> {
    // TODO: Implement via events.patch
    throw new Error('Not implemented');
  }

  async cancel(_bookingId: string, _clientIntentId: string): Promise<BookingConfirmation> {
    // TODO: Implement via events.delete or events.patch
    throw new Error('Not implemented');
  }

  async get(_bookingId: string): Promise<Booking> {
    // TODO: Implement via events.get
    throw new Error('Not implemented');
  }

  async exportIcs(_bookingId: string): Promise<string> {
    // TODO: Implement via events.get with text/calendar
    throw new Error('Not implemented');
  }

  async subscribe?(_handler: (event: ProviderEvent) => void): Promise<Subscription> {
    // TODO: Implement via events.watch
    throw new Error('Not implemented');
  }
}
