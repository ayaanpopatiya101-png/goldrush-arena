export const NOTIFICATION_PREFIX = 'goldrush.event-close.v1.';
export const REMINDER_DEFAULTS: PhoneReminderPrefs = { version: 1, enabled: false, leadMinutes: 60, events: [] };

export interface PhoneReminderPrefs {
  version: 1;
  enabled: boolean;
  leadMinutes: number;
  events: string[];
}
export interface ReminderEvent {
  id: string;
  name: string;
  closesAt: number;
  eligible: boolean;
  active: boolean;
}
export interface PlannedReminder {
  identifier: string;
  eventId: string;
  title: string;
  body: string;
  fireAt: number;
  closesAt: number;
}
export interface PendingReminder {
  identifier: string;
}
export interface NotificationDriver {
  supported: boolean;
  permission: (request?: boolean) => Promise<'allowed' | 'denied' | 'prompt'>;
  pending: () => Promise<PendingReminder[]>;
  schedule: (reminder: PlannedReminder) => Promise<void>;
  cancel: (id: string) => Promise<void>;
}

export function validLeadMinutes(value: number) {
  return Number.isInteger(value) && value >= 5 && value <= 7 * 24 * 60;
}

export function parseReminderPrefs(raw: string | null): PhoneReminderPrefs {
  if (!raw) return { ...REMINDER_DEFAULTS, events: [] };
  const p = JSON.parse(raw);
  if (!p || p.version !== 1 || typeof p.enabled !== 'boolean' || !validLeadMinutes(p.leadMinutes) ||
      !Array.isArray(p.events) || p.events.some((id: unknown) => typeof id !== 'string' || id.length > 160)) {
    throw new Error('Saved phone reminders could not be read. Retry or reset them.');
  }
  return { version: 1, enabled: p.enabled, leadMinutes: p.leadMinutes, events: [...new Set<string>(p.events)] };
}

export function planEventReminders(
  owner: string, prefs: PhoneReminderPrefs, events: ReminderEvent[], now: number,
): PlannedReminder[] {
  if (!owner || !prefs.enabled || !validLeadMinutes(prefs.leadMinutes)) return [];
  const planned = new Map<string, PlannedReminder>();
  for (const event of events) {
    const fireAt = event.closesAt - prefs.leadMinutes * 60_000;
    if (!event.eligible || !event.active || !prefs.events.includes(event.id) ||
        !Number.isFinite(event.closesAt) || event.closesAt <= now || fireAt <= now) continue;
    // No username, rank or phone number appears in OS-visible notification IDs.
    const identifier = `${NOTIFICATION_PREFIX}${encodeURIComponent(owner)}.${encodeURIComponent(event.id)}.${event.closesAt}.${prefs.leadMinutes}`;
    planned.set(identifier, {
      identifier, eventId: event.id, title: 'GoldRush event closing soon',
      body: `${event.name} closes in ${prefs.leadMinutes === 60 ? '1 hour' : prefs.leadMinutes % 60 === 0 ? `${prefs.leadMinutes / 60} hours` : `${prefs.leadMinutes} minutes`}. Open Events to check the latest details.`,
      fireAt, closesAt: event.closesAt,
    });
  }
  return [...planned.values()].slice(0, 20);
}

// Serialize all schedule/cancel operations, including an outgoing profile's
// cleanup and an incoming profile's initial reconciliation.
export function createReminderScheduler(driver: NotificationDriver) {
  let tail: Promise<unknown> = Promise.resolve();
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const next = tail.then(work, work);
    tail = next.catch(() => {});
    return next;
  }
  return {
    reconcile: (plan: PlannedReminder[], stillCurrent: () => boolean = () => true) => serial(async () => {
      if (!driver.supported) return [];
      if (!stillCurrent()) return [];
      const allowed = await driver.permission();
      const desired = allowed === 'allowed' ? plan : [];
      const ids = new Set(desired.map(p => p.identifier));
      const pending = await driver.pending();
      for (const item of pending) {
        if (item.identifier.startsWith(NOTIFICATION_PREFIX) && !ids.has(item.identifier)) {
          await driver.cancel(item.identifier);
        }
      }
      if (!stillCurrent()) return [];
      const existing = new Set(pending.map(p => p.identifier));
      const actual: PlannedReminder[] = [];
      try {
        for (const item of desired) {
          if (!stillCurrent()) break;
          if (!existing.has(item.identifier)) await driver.schedule(item);
          actual.push(item);
        }
      } catch (error) {
        // Never claim the requested set was saved if scheduling only partly
        // succeeded. Keep reconciliation retryable; deterministic IDs dedupe it.
        throw error;
      }
      if (!stillCurrent()) {
        for (const item of actual) await driver.cancel(item.identifier);
        return [];
      }
      return actual;
    }),
    cancelAll: () => serial(async () => {
      if (!driver.supported) return;
      const pending = await driver.pending();
      for (const item of pending) {
        if (item.identifier.startsWith(NOTIFICATION_PREFIX)) await driver.cancel(item.identifier);
      }
    }),
  };
}
