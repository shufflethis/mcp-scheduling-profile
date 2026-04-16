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
 * CalDAV adapter stub.
 * TODO: Implement against CalDAV (RFC 4791) and iTIP (RFC 5546).
 * NOTE: CalDAV server capabilities vary widely — this adapter needs
 *       robust capability detection via PROPFIND before operations.
 */
export class CalDavAdapter implements SchedulingAdapter {
  readonly id = 'caldav';
  readonly name = 'CalDAV';

  async getCapabilities(): Promise<Capabilities> {
    // TODO: Implement — combine static declaration with runtime
    // capability detection via OPTIONS/PROPFIND on the CalDAV endpoint
    throw new Error('Not implemented');
  }

  async searchAvailability(_query: AvailabilityQuery): Promise<AvailabilityResponse> {
    // TODO: Implement via VFREEBUSY request (RFC 6638)
    // Note: not all CalDAV servers support freebusy queries
    throw new Error('Not implemented');
  }

  async holdSlot?(_slotId: string, _ttlSeconds: number): Promise<HoldReceipt> {
    // TODO: Implement via VEVENT with STATUS:TENTATIVE
    // iTIP supports tentative natively, but server behavior varies
    throw new Error('Not implemented');
  }

  async book(_intent: BookingIntent): Promise<BookingConfirmation> {
    // TODO: Implement via PUT VEVENT + iTIP REQUEST
    throw new Error('Not implemented');
  }

  async reschedule(_bookingId: string, _newSlotId: string, _clientIntentId: string): Promise<BookingConfirmation> {
    // TODO: Implement via PUT updated VEVENT + iTIP REQUEST
    // Must update DTSTART/DTEND and increment SEQUENCE
    throw new Error('Not implemented');
  }

  async cancel(_bookingId: string, _clientIntentId: string): Promise<BookingConfirmation> {
    // TODO: Implement via iTIP CANCEL method
    // Send METHOD:CANCEL to attendees
    throw new Error('Not implemented');
  }

  async get(_bookingId: string): Promise<Booking> {
    // TODO: Implement via GET on event URL
    throw new Error('Not implemented');
  }

  async exportIcs(_bookingId: string): Promise<string> {
    // TODO: Implement via GET with Accept: text/calendar
    // CalDAV stores events natively as iCalendar — this is the simplest export
    throw new Error('Not implemented');
  }

  async subscribe?(_handler: (event: ProviderEvent) => void): Promise<Subscription> {
    // TODO: Implement via WebDAV Sync (RFC 6578) or polling fallback
    // Check sync-token support via PROPFIND before choosing strategy
    throw new Error('Not implemented');
  }
}
