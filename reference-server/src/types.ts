/** Core types for the Agentic Scheduling Profile */

export interface Slot {
  id: string;
  start: string; // ISO 8601 date-time, UTC
  end: string;
  providerId: string;
  duration: string; // ISO 8601 duration
  status: 'available' | 'held' | 'booked';
  metadata?: Record<string, unknown>;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface AvailabilityQuery {
  providerId: string;
  dateRange: DateRange;
  duration: string;
  timezone: string;
  filters?: Record<string, unknown>;
  cursor?: string;
}

export interface AvailabilityResponse {
  providerId: string;
  slots: Slot[];
  truncated: boolean;
  nextCursor?: string;
  queriedAt: string;
}

export interface Attendee {
  name: string;
  email: string;
}

export interface BookingIntent {
  slotId: string;
  clientIntentId: string;
  attendees: Attendee[];
  subject: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface BookingConfirmation {
  bookingId: string;
  clientIntentId: string;
  status: 'confirmed' | 'cancelled' | 'rescheduled' | 'held';
  slot: Slot;
  provider: { id: string; name: string };
  attendees: Attendee[];
  subject: string;
  createdAt: string;
  updatedAt: string;
  providerRef?: string;
}

export interface Booking extends BookingConfirmation {
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface HoldReceipt {
  holdId: string;
  slotId: string;
  expiresAt: string;
}

export interface Capabilities {
  providerId: string;
  providerName: string;
  supports_hold: boolean;
  supports_reschedule: boolean;
  supports_group_booking: boolean;
  supports_meeting_link: boolean;
  supports_deposit: boolean;
  supports_webhooks: boolean;
  supports_round_robin: boolean;
  supports_resource_booking: boolean;
  supports_free_busy: boolean;
  supports_ics_export: boolean;
  supports_idempotent_writes: boolean;
}

export interface ASPError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
  retryAfterSeconds?: number;
}

export interface ProviderEvent {
  type: 'booking.created' | 'booking.updated' | 'booking.cancelled';
  bookingId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface Subscription {
  subscriptionId: string;
  unsubscribe(): Promise<void>;
}
