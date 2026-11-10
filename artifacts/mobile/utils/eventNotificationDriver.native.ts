import { Platform } from 'react-native';
import type { NotificationDriver } from './eventNotificationRules';

const CHANNEL = 'goldrush-event-reminders';
let apiPromise: Promise<typeof import('expo-notifications')> | undefined;
function api() {
  if (!apiPromise) apiPromise = import('expo-notifications').then(async notifications => {
    notifications.setNotificationHandler({
      handleNotification: async notification => ({
        shouldShowBanner: notification.request.identifier.startsWith('goldrush.event-close.v1.'),
        shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
      }),
    });
    return notifications;
  }).catch(error => { apiPromise = undefined; throw error; });
  return apiPromise;
}

export const notificationDriver: NotificationDriver = {
  supported: true,
  permission: async request => {
    const n = await api();
    if (request && Platform.OS === 'android') {
      await n.setNotificationChannelAsync(CHANNEL, {
        name: 'Event closing reminders', importance: n.AndroidImportance.HIGH,
        description: 'Optional reminders before your selected GoldRush events close.',
        sound: null,
      });
    }
    let permission = await n.getPermissionsAsync();
    if (request && !permission.granted && permission.canAskAgain) {
      permission = await n.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: false, allowBadge: false } });
    }
    const allowed = permission.granted || permission.ios?.status === n.IosAuthorizationStatus.PROVISIONAL;
    return allowed ? 'allowed' : permission.canAskAgain ? 'prompt' : 'denied';
  },
  pending: async () => (await api()).getAllScheduledNotificationsAsync(),
  cancel: async identifier => { await (await api()).cancelScheduledNotificationAsync(identifier); },
  schedule: async reminder => {
    const n = await api();
    if (Platform.OS === 'android') await n.setNotificationChannelAsync(CHANNEL, {
      name: 'Event closing reminders', importance: n.AndroidImportance.HIGH, sound: null,
    });
    await n.scheduleNotificationAsync({
      identifier: reminder.identifier,
      content: {
        title: reminder.title, body: reminder.body, sound: false,
        data: { feature: 'event-close', eventId: reminder.eventId, closesAt: reminder.closesAt },
      },
      trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(reminder.fireAt), channelId: CHANNEL },
    });
  },
};
