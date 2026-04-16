/**
 * Capability flags that a provider adapter can declare.
 * See RFC-0004 for full specification.
 */
export enum CapabilityFlag {
  HOLD = 'supports_hold',
  RESCHEDULE = 'supports_reschedule',
  GROUP_BOOKING = 'supports_group_booking',
  MEETING_LINK = 'supports_meeting_link',
  DEPOSIT = 'supports_deposit',
  WEBHOOKS = 'supports_webhooks',
  ROUND_ROBIN = 'supports_round_robin',
  RESOURCE_BOOKING = 'supports_resource_booking',
  FREE_BUSY = 'supports_free_busy',
  ICS_EXPORT = 'supports_ics_export',
  IDEMPOTENT_WRITES = 'supports_idempotent_writes',
}

/**
 * Maps each capability to the adapter methods it unlocks.
 */
export const CAPABILITY_METHOD_MAP: Record<CapabilityFlag, string[]> = {
  [CapabilityFlag.HOLD]: ['holdSlot'],
  [CapabilityFlag.RESCHEDULE]: ['reschedule'],
  [CapabilityFlag.GROUP_BOOKING]: [],
  [CapabilityFlag.MEETING_LINK]: [],
  [CapabilityFlag.DEPOSIT]: [],
  [CapabilityFlag.WEBHOOKS]: ['subscribe'],
  [CapabilityFlag.ROUND_ROBIN]: [],
  [CapabilityFlag.RESOURCE_BOOKING]: [],
  [CapabilityFlag.FREE_BUSY]: ['searchAvailability'],
  [CapabilityFlag.ICS_EXPORT]: ['exportIcs'],
  [CapabilityFlag.IDEMPOTENT_WRITES]: [],
};
