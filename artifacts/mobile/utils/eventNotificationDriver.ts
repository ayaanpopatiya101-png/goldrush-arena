// Browser build: no native module import, push-token registration or fake
// permission prompt. Existing in-app reminders remain independent.
import type { NotificationDriver } from './eventNotificationRules';

export const notificationDriver: NotificationDriver = {
  supported: false,
  permission: async () => 'denied',
  pending: async () => [],
  schedule: async () => { throw new Error('Phone notifications require the installed iPhone or Android app.'); },
  cancel: async () => {},
};
