/**
 * ASP Adapter Contract
 *
 * Every scheduling provider adapter MUST implement this interface.
 * Optional methods (marked with ?) correspond to capability flags —
 * if a provider declares a capability, the corresponding method MUST be implemented.
 */

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

export interface SchedulingAdapter {
  /** Unique adapter identifier (e.g., "google", "calendly", "caldav") */
  readonly id: string;

  /** Human-readable adapter name */
  readonly name: string;

  /** Return the provider's capability flags */
  getCapabilities(): Promise<Capabilities>;

  /** Search for available time slots */
  searchAvailability(query: AvailabilityQuery): Promise<AvailabilityResponse>;

  /** Optionally hold a slot before booking (requires supports_hold) */
  holdSlot?(slotId: string, ttlSeconds: number): Promise<HoldReceipt>;

  /** Confirm a booking */
  book(intent: BookingIntent): Promise<BookingConfirmation>;

  /** Reschedule an existing booking (requires supports_reschedule) */
  reschedule(
    bookingId: string,
    newSlotId: string,
    clientIntentId: string
  ): Promise<BookingConfirmation>;

  /** Cancel an existing booking */
  cancel(bookingId: string, clientIntentId: string): Promise<BookingConfirmation>;

  /** Fetch a booking by ID */
  get(bookingId: string): Promise<Booking>;

  /** Export a booking as iCalendar/ICS string (requires supports_ics_export) */
  exportIcs(bookingId: string): Promise<string>;

  /** Subscribe to provider change events (requires supports_webhooks) */
  subscribe?(handler: (event: ProviderEvent) => void): Promise<Subscription>;
}
