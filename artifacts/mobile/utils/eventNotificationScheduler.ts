import { notificationDriver } from './eventNotificationDriver';
import { createReminderScheduler } from './eventNotificationRules';

// One queue is shared by UI changes, foreground reconciliation and sign-out.
export const eventNotificationScheduler = createReminderScheduler(notificationDriver);
export const phoneReminderStorageKey = (profile: string) =>
  `goldrush.phone-reminders.v1.${encodeURIComponent(profile)}`;
