import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { AdapterRegistry } from './registry.js';
import type { AvailabilityQuery, BookingIntent } from './types.js';

const registry = new AdapterRegistry();

const server = new Server(
  { name: 'asp-reference-server', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

// Define all ASP tools
const ASP_TOOLS = [
  {
    name: 'get_capabilities',
    description: 'Return provider capability flags. Call this before any other tool to discover what the provider supports.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        providerId: { type: 'string', description: 'The provider adapter to query' },
      },
      required: ['providerId'],
    },
  },
  {
    name: 'search_availability',
    description: 'Query available time slots from a scheduling provider.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        providerId: { type: 'string' },
        dateRange: {
          type: 'object',
          properties: {
            start: { type: 'string', format: 'date-time' },
            end: { type: 'string', format: 'date-time' },
          },
          required: ['start', 'end'],
        },
        duration: { type: 'string', description: 'ISO 8601 duration (e.g., PT30M)' },
        timezone: { type: 'string', description: 'IANA timezone (e.g., America/New_York)' },
        filters: { type: 'object' },
        cursor: { type: 'string' },
      },
      required: ['providerId', 'dateRange', 'duration', 'timezone'],
    },
  },
  {
    name: 'hold_slot',
    description: 'Temporarily hold a slot before confirming a booking. Requires supports_hold capability.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        providerId: { type: 'string' },
        slotId: { type: 'string' },
        ttlSeconds: { type: 'number', description: 'Hold duration in seconds', default: 300 },
      },
      required: ['providerId', 'slotId'],
    },
  },
  {
    name: 'book_appointment',
    description: 'Confirm a booking for a specific slot. Idempotent — requires clientIntentId.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        providerId: { type: 'string' },
        slotId: { type: 'string' },
        clientIntentId: { type: 'string', description: 'Idempotency key' },
        attendees: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
            },
            required: ['name', 'email'],
          },
          minItems: 1,
        },
        subject: { type: 'string' },
        notes: { type: 'string' },
        metadata: { type: 'object' },
      },
      required: ['providerId', 'slotId', 'clientIntentId', 'attendees', 'subject'],
    },
  },
  {
    name: 'reschedule_appointment',
    description: 'Reschedule an existing booking to a new slot. Idempotent — requires clientIntentId.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        providerId: { type: 'string' },
        bookingId: { type: 'string' },
        newSlotId: { type: 'string' },
        clientIntentId: { type: 'string' },
      },
      required: ['providerId', 'bookingId', 'newSlotId', 'clientIntentId'],
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancel an existing booking. Idempotent — requires clientIntentId.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        providerId: { type: 'string' },
        bookingId: { type: 'string' },
        clientIntentId: { type: 'string' },
      },
      required: ['providerId', 'bookingId', 'clientIntentId'],
    },
  },
  {
    name: 'get_booking',
    description: 'Fetch details of an existing booking by ID.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        providerId: { type: 'string' },
        bookingId: { type: 'string' },
      },
      required: ['providerId', 'bookingId'],
    },
  },
  {
    name: 'export_ics',
    description: 'Export a booking as an iCalendar/ICS file. Requires supports_ics_export capability.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        providerId: { type: 'string' },
        bookingId: { type: 'string' },
      },
      required: ['providerId', 'bookingId'],
    },
  },
  {
    name: 'subscribe_events',
    description: 'Subscribe to booking change events from a provider. Requires supports_webhooks capability.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        providerId: { type: 'string' },
        callbackUrl: { type: 'string', format: 'uri' },
        events: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['booking.created', 'booking.updated', 'booking.cancelled'],
          },
        },
      },
      required: ['providerId'],
    },
  },
];

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: ASP_TOOLS,
}));

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const providerId = (args as Record<string, unknown>)?.providerId as string;

  if (!providerId) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ code: 'E_VALIDATION', message: 'providerId is required', retryable: false }) }],
      isError: true,
    };
  }

  const adapter = registry.get(providerId);
  if (!adapter) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ code: 'E_PROVIDER_UNAVAILABLE', message: `No adapter registered for provider: ${providerId}`, retryable: false }) }],
      isError: true,
    };
  }

  try {
    let result: unknown;

    switch (name) {
      case 'get_capabilities':
        result = await adapter.getCapabilities();
        break;

      case 'search_availability':
        result = await adapter.searchAvailability(args as unknown as AvailabilityQuery);
        break;

      case 'hold_slot': {
        if (!adapter.holdSlot) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ code: 'E_CAPABILITY_UNSUPPORTED', message: 'Provider does not support hold_slot', retryable: false }) }],
            isError: true,
          };
        }
        const { slotId, ttlSeconds = 300 } = args as Record<string, unknown>;
        result = await adapter.holdSlot(slotId as string, ttlSeconds as number);
        break;
      }

      case 'book_appointment':
        result = await adapter.book(args as unknown as BookingIntent);
        break;

      case 'reschedule_appointment': {
        const { bookingId, newSlotId, clientIntentId } = args as Record<string, string>;
        result = await adapter.reschedule(bookingId, newSlotId, clientIntentId);
        break;
      }

      case 'cancel_appointment': {
        const { bookingId, clientIntentId } = args as Record<string, string>;
        result = await adapter.cancel(bookingId, clientIntentId);
        break;
      }

      case 'get_booking': {
        const { bookingId } = args as Record<string, string>;
        result = await adapter.get(bookingId);
        break;
      }

      case 'export_ics': {
        const { bookingId } = args as Record<string, string>;
        const ics = await adapter.exportIcs(bookingId);
        return { content: [{ type: 'text', text: ics }] };
      }

      case 'subscribe_events': {
        return {
          content: [{ type: 'text', text: JSON.stringify({ message: 'Subscription registered (mock)', subscriptionId: 'sub-mock-001' }) }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: JSON.stringify({ code: 'E_VALIDATION', message: `Unknown tool: ${name}`, retryable: false }) }],
          isError: true,
        };
    }

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  } catch (error) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ code: 'E_PROVIDER_UNAVAILABLE', message: String(error), retryable: true }) }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ASP Reference Server running on stdio');
}

main().catch(console.error);
