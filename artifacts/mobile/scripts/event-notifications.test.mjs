import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import {
  NOTIFICATION_PREFIX, REMINDER_DEFAULTS, parseReminderPrefs, planEventReminders,
  validLeadMinutes, createReminderScheduler,
} from '../utils/eventNotificationRules.ts';
import { scheduleWindow, localChallengeWindow } from '../utils/eventWindows.ts';

const now = Date.UTC(2026, 10, 10, 12);
const owner = 'random-device-profile-id';
const event = { id: 'weekly', name: 'Weekly Challenge', closesAt: now + 4 * 3600_000, active: true, eligible: true };
const settings = { ...REMINDER_DEFAULTS, enabled: true, events: [event.id] };
const plan = (prefs = settings, events = [event], time = now) => planEventReminders(owner, prefs, events, time);

function harness(permission = 'allowed') {
  const queued = new Map();
  const calls = [];
  let allow = permission;
  let failSchedule = false;
  let failCancel = false;
  const driver = {
    supported: true,
    permission: async () => allow,
    pending: async () => [...queued.keys()].map(identifier => ({ identifier })),
    schedule: async reminder => {
      calls.push(['schedule', reminder.identifier]);
      if (failSchedule) throw new Error('OS schedule rejected');
      queued.set(reminder.identifier, reminder);
    },
    cancel: async id => {
      calls.push(['cancel', id]);
      if (failCancel) throw new Error('OS cancellation rejected');
      queued.delete(id);
    },
  };
  return {
    scheduler: createReminderScheduler(driver), queued, calls, driver,
    deny: () => { allow = 'denied'; },
    failSchedule: () => { failSchedule = true; },
    failCancel: () => { failCancel = true; },
  };
}

test('default is opt-out, with no phone number, remote token or selected event', () => {
  assert.deepEqual(parseReminderPrefs(null), { version: 1, enabled: false, leadMinutes: 60, events: [] });
  assert.equal(plan(REMINDER_DEFAULTS).length, 0);
});

test('preferences validate bounds, deduplicate and reject malformed storage explicitly', () => {
  assert.equal(validLeadMinutes(5), true);
  assert.equal(validLeadMinutes(10080), true);
  for (const value of [0, -1, 4, 10081, 1.5, '60', NaN, Infinity]) assert.equal(validLeadMinutes(value), false);
  assert.deepEqual(parseReminderPrefs(JSON.stringify({ ...settings, events: ['weekly', 'weekly'] })).events, ['weekly']);
  for (const value of ['{', '{}', 'null', JSON.stringify({ ...settings, events: [22] }), JSON.stringify({ ...settings, enabled: 'yes' })]) {
    assert.throws(() => parseReminderPrefs(value));
  }
});

test('one-hour, three-hour and custom lead times use exact absolute instants', () => {
  assert.equal(plan()[0].fireAt, event.closesAt - 3600_000);
  assert.equal(plan({ ...settings, leadMinutes: 180 })[0].fireAt, event.closesAt - 3 * 3600_000);
  assert.equal(plan({ ...settings, leadMinutes: 25 })[0].fireAt, event.closesAt - 25 * 60_000);
});

test('closed, locked/ineligible, unknown, cancelled and missing-time events never schedule', () => {
  for (const altered of [
    { active: false }, { eligible: false }, { closesAt: now }, { closesAt: now - 1 },
    { closesAt: NaN }, { closesAt: Infinity }, { id: 'not-selected' },
  ]) assert.deepEqual(plan(settings, [{ ...event, ...altered }]), []);
  assert.deepEqual(plan(settings, []), []);
  assert.deepEqual(plan({ ...settings, leadMinutes: 300 }), []);
  assert.deepEqual(plan(settings, [event], event.closesAt - 3600_000), []);
});

test('identical event occurrences have stable IDs; owner, time or duration changes replace them', () => {
  assert.equal(plan(settings, [event, event]).length, 1);
  const original = plan()[0].identifier;
  assert.equal(plan()[0].identifier, original);
  assert.notEqual(plan({ ...settings, leadMinutes: 180 })[0].identifier, original);
  assert.notEqual(plan(settings, [{ ...event, closesAt: event.closesAt + 86400_000 }])[0].identifier, original);
  assert.notEqual(planEventReminders('other-owner', settings, [event], now)[0].identifier, original);
});

test('reconciliation deduplicates repeated and simultaneous requests', async () => {
  const h = harness();
  await Promise.all([h.scheduler.reconcile(plan()), h.scheduler.reconcile(plan()), h.scheduler.reconcile(plan())]);
  assert.equal(h.queued.size, 1);
  assert.equal(h.calls.filter(x => x[0] === 'schedule').length, 1);
});

test('edits and deselection cancel obsolete alerts without touching another feature', async () => {
  const h = harness();
  h.queued.set('unrelated-alarm', {});
  await h.scheduler.reconcile(plan());
  await h.scheduler.reconcile(plan({ ...settings, leadMinutes: 180 }));
  assert.equal(h.queued.size, 2);
  assert.equal(h.calls.filter(x => x[0] === 'cancel').length, 1);
  await h.scheduler.reconcile(plan({ ...settings, events: [] }));
  assert.deepEqual([...h.queued.keys()], ['unrelated-alarm']);
});

test('disable, system permission revocation and cancelled events clear pending feature alerts', async () => {
  for (const action of ['disable', 'permission', 'event']) {
    const h = harness();
    await h.scheduler.reconcile(plan());
    if (action === 'permission') h.deny();
    const next = action === 'disable' ? plan({ ...settings, enabled: false }) :
      action === 'event' ? plan(settings, [{ ...event, active: false }]) : plan();
    assert.deepEqual(await h.scheduler.reconcile(next), []);
    assert.equal(h.queued.size, 0);
  }
});

test('denied permission cannot schedule and browser driver never invokes OS methods', async () => {
  const h = harness('denied');
  assert.deepEqual(await h.scheduler.reconcile(plan()), []);
  assert.equal(h.calls.length, 0);
  const browser = createReminderScheduler({
    supported: false,
    permission: async () => { throw new Error('must not run'); },
    pending: async () => { throw new Error('must not run'); },
    schedule: async () => { throw new Error('must not run'); },
    cancel: async () => { throw new Error('must not run'); },
  });
  assert.deepEqual(await browser.reconcile(plan()), []);
  await browser.cancelAll();
});

test('outgoing-profile cleanup and incoming-profile schedule are serialized', async () => {
  const h = harness();
  await h.scheduler.reconcile(plan());
  const incoming = planEventReminders('new-owner', settings, [event], now);
  await Promise.all([h.scheduler.cancelAll(), h.scheduler.reconcile(incoming)]);
  assert.deepEqual([...h.queued.keys()], [incoming[0].identifier]);
  await h.scheduler.cancelAll();
  assert.equal(h.queued.size, 0);
});

test('unmount during scheduling removes newly queued alerts before returning', async () => {
  const h = harness();
  let active = true;
  const original = h.driver.schedule;
  h.driver.schedule = async reminder => { await original(reminder); active = false; };
  const scheduler = createReminderScheduler(h.driver);
  assert.deepEqual(await scheduler.reconcile(plan(), () => active), []);
  assert.equal(h.queued.size, 0);
});

test('OS errors are surfaced and the serialization queue remains retryable', async () => {
  const h = harness();
  h.failSchedule();
  await assert.rejects(h.scheduler.reconcile(plan()), /schedule rejected/);
  await h.scheduler.reconcile([]);
  const c = harness();
  await c.scheduler.reconcile(plan());
  c.failCancel();
  await assert.rejects(c.scheduler.cancelAll(), /cancellation rejected/);
});

test('local windows are stable calendar instants across DST and month/year boundaries', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const beforeDST = new Date(2026, 9, 31, 12);
    const window = scheduleWindow(5, 0, beforeDST);
    assert.equal(window.active, true);
    assert.equal(window.end.getDay(), 1);
    assert.equal(window.end.getHours(), 0);
    assert.equal(window.end.getTime() - window.start.getTime(), 73 * 3600_000);
    const weekA = localChallengeWindow('weekly', 1234, new Date(2026, 10, 9, 10, 0, 0, 2));
    const weekB = localChallengeWindow('weekly', 5678, new Date(2026, 10, 9, 10, 0, 1, 9));
    assert.equal(weekA.closes.getTime(), weekB.closes.getTime());
    assert.equal(localChallengeWindow('monthly', 0, new Date(2026, 11, 29)).closes.getFullYear(), 2027);
    assert.equal(localChallengeWindow('annual', 0, new Date(2026, 10, 9)).closes.getTime(), new Date(2027, 0, 1).getTime());
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test('native adapter schedules one-shot local notifications without remote push registration', async () => {
  const ts = createRequire(import.meta.url)('typescript');
  const source = await readFile(new URL('../utils/eventNotificationDriver.native.ts', import.meta.url), 'utf8');
  const calls = [];
  let granted = false;
  const notifications = {
    setNotificationHandler: handler => calls.push(['handler', handler]),
    setNotificationChannelAsync: async id => calls.push(['channel', id]),
    getPermissionsAsync: async () => ({ granted, canAskAgain: true }),
    requestPermissionsAsync: async () => { granted = true; calls.push(['request']); return { granted, canAskAgain: true }; },
    scheduleNotificationAsync: async item => { calls.push(['scheduled', item]); return item.identifier; },
    cancelScheduledNotificationAsync: async id => calls.push(['cancel', id]),
    getAllScheduledNotificationsAsync: async () => [],
    IosAuthorizationStatus: { PROVISIONAL: 3 },
    AndroidImportance: { HIGH: 4 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
  };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Date, require: id => {
    if (id === 'react-native') return { Platform: { OS: 'android' } };
    if (id === 'expo-notifications') return notifications;
    throw new Error(`Unexpected native dependency ${id}`);
  } });
  const driver = exports.notificationDriver;
  assert.equal(await driver.permission(), 'prompt');
  assert.equal(calls.filter(c => c[0] === 'request').length, 0);
  assert.equal(await driver.permission(true), 'allowed');
  await driver.schedule(plan()[0]);
  const scheduled = calls.find(c => c[0] === 'scheduled')[1];
  assert.equal(scheduled.trigger.type, 'date');
  assert.equal(scheduled.trigger.date.getTime(), plan()[0].fireAt);
  assert.equal(scheduled.identifier, plan()[0].identifier);
  assert.equal(scheduled.content.sound, false);
  assert.doesNotMatch(source, /getExpoPushTokenAsync|getDevicePushTokenAsync/);
});

test('native config, lifecycle and visible browser limitations remain wired', async () => {
  const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  const config = JSON.parse(await read('app.json'));
  const plugin = config.expo.plugins.find(p => Array.isArray(p) && p[0] === 'expo-notifications');
  assert.equal(plugin[1].enableBackgroundRemoteNotifications, false);
  assert.match(await read('app/_layout.tsx'), /EventReminderProvider/);
  assert.match(await read('app/(tabs)/events.tsx'), /EventNotificationPanel/);
  assert.match(await read('components/EventNotificationPanel.tsx'), /does not send background or Home Screen notifications/);
  const context = await read('context/PlayerContext.tsx');
  assert.match(context, /logoutAccount[\s\S]*?await eventNotificationScheduler\.cancelAll\(\)/);
  assert.match(await read('utils/eventNotificationDriver.ts'), /supported: false/);
  assert.ok(NOTIFICATION_PREFIX.startsWith('goldrush.'));
});
