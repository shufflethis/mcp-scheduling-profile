import type { SchedulingAdapter } from '../../adapters/_contract/adapter.interface.js';
import type {
  Capabilities,
  AvailabilityQuery,
  AvailabilityResponse,
  BookingIntent,
  BookingConfirmation,
  Booking,
  HoldReceipt,
} from './types.js';

/**
 * Mock adapter returning deterministic example responses for demos.
 */
class MockAdapter implements SchedulingAdapter {
  readonly id = 'mock';
  readonly name = 'Mock Provider';

  async getCapabilities(): Promise<Capabilities> {
    return {
      providerId: 'mock',
      providerName: 'Mock Provider',
      supports_hold: true,
      supports_reschedule: true,
      supports_group_booking: false,
      supports_meeting_link: true,
      supports_deposit: false,
      supports_webhooks: false,
      supports_round_robin: false,
      supports_resource_booking: false,
      supports_free_busy: true,
      supports_ics_export: true,
      supports_idempotent_writes: true,
    };
  }

  async searchAvailability(query: AvailabilityQuery): Promise<AvailabilityResponse> {
    return {
      providerId: query.providerId,
      slots: [
        {
          id: 'slot-001',
          start: '2026-05-01T10:00:00Z',
          end: '2026-05-01T10:30:00Z',
          providerId: query.providerId,
          duration: 'PT30M',
          status: 'available',
        },
        {
          id: 'slot-002',
          start: '2026-05-01T14:00:00Z',
          end: '2026-05-01T14:30:00Z',
          providerId: query.providerId,
          duration: 'PT30M',
          status: 'available',
        },
      ],
      truncated: false,
      queriedAt: new Date().toISOString(),
    };
  }

  async holdSlot(slotId: string, ttlSeconds: number): Promise<HoldReceipt> {
    return {
      holdId: `hold-${slotId}`,
      slotId,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    };
  }

  async book(intent: BookingIntent): Promise<BookingConfirmation> {
    const now = new Date().toISOString();
    return {
      bookingId: `booking-${intent.clientIntentId}`,
      clientIntentId: intent.clientIntentId,
      status: 'confirmed',
      slot: {
        id: intent.slotId,
        start: '2026-05-01T10:00:00Z',
        end: '2026-05-01T10:30:00Z',
        providerId: 'mock',
        duration: 'PT30M',
        status: 'booked',
      },
      provider: { id: 'mock', name: 'Mock Provider' },
      attendees: intent.attendees,
      subject: intent.subject,
      createdAt: now,
      updatedAt: now,
    };
  }

  async reschedule(bookingId: string, _newSlotId: string, clientIntentId: string): Promise<BookingConfirmation> {
    const now = new Date().toISOString();
    return {
      bookingId,
      clientIntentId,
      status: 'rescheduled',
      slot: {
        id: _newSlotId,
        start: '2026-05-02T10:00:00Z',
        end: '2026-05-02T10:30:00Z',
        providerId: 'mock',
        duration: 'PT30M',
        status: 'booked',
      },
      provider: { id: 'mock', name: 'Mock Provider' },
      attendees: [{ name: 'Jane Doe', email: 'jane@example.com' }],
      subject: 'Rescheduled Appointment',
      createdAt: now,
      updatedAt: now,
    };
  }

  async cancel(bookingId: string, clientIntentId: string): Promise<BookingConfirmation> {
    const now = new Date().toISOString();
    return {
      bookingId,
      clientIntentId,
      status: 'cancelled',
      slot: {
        id: 'slot-001',
        start: '2026-05-01T10:00:00Z',
        end: '2026-05-01T10:30:00Z',
        providerId: 'mock',
        duration: 'PT30M',
        status: 'available',
      },
      provider: { id: 'mock', name: 'Mock Provider' },
      attendees: [{ name: 'Jane Doe', email: 'jane@example.com' }],
      subject: 'Cancelled Appointment',
      createdAt: now,
      updatedAt: now,
    };
  }

  async get(bookingId: string): Promise<Booking> {
    return {
      bookingId,
      clientIntentId: 'intent-001',
      status: 'confirmed',
      slot: {
        id: 'slot-001',
        start: '2026-05-01T10:00:00Z',
        end: '2026-05-01T10:30:00Z',
        providerId: 'mock',
        duration: 'PT30M',
        status: 'booked',
      },
      provider: { id: 'mock', name: 'Mock Provider' },
      attendees: [{ name: 'Jane Doe', email: 'jane@example.com' }],
      subject: 'Demo Appointment',
      createdAt: '2026-04-16T12:00:00Z',
      updatedAt: '2026-04-16T12:00:00Z',
      notes: 'This is a mock booking for demonstration purposes.',
    };
  }

  async exportIcs(bookingId: string): Promise<string> {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ASP//Reference Server//EN',
      'BEGIN:VEVENT',
      `UID:${bookingId}@asp.example`,
      'DTSTART:20260501T100000Z',
      'DTEND:20260501T103000Z',
      'SUMMARY:Demo Appointment',
      'ATTENDEE;CN=Jane Doe:mailto:jane@example.com',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }
}

/**
 * In-memory adapter registry.
 */
export class AdapterRegistry {
  private adapters = new Map<string, SchedulingAdapter>();

  constructor() {
    // Register mock adapter by default
    const mock = new MockAdapter();
    this.adapters.set(mock.id, mock);
  }

  get(providerId: string): SchedulingAdapter | undefined {
    return this.adapters.get(providerId);
  }

  register(adapter: SchedulingAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  list(): string[] {
    return Array.from(this.adapters.keys());
  }
}
