import React, { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Button, Chip, Panel, SectionLabel } from '@/components/ui/Primitives';
import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { useEventReminders } from '@/context/EventReminderContext';
import { fmtLocal } from '@/utils/eventPrefs';
import { validLeadMinutes } from '@/utils/eventNotificationRules';

export function EventNotificationPanel() {
  const reminder = useEventReminders();
  const [custom, setCustom] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const eligible = reminder.events.filter(event => event.active && event.eligible);
  const disabled = !reminder.ready || reminder.busy;
  const customValue = /^\d+$/.test(custom.trim()) ? Number(custom) : NaN;

  async function save(patch: Parameters<typeof reminder.save>[0]) {
    setMessage(null);
    if (await reminder.save(patch)) setMessage('Choices saved. Only the upcoming reminders listed below are scheduled.');
  }

  return <View style={{ gap: 8 }} testID="phone-reminder-panel">
    <SectionLabel title="Phone notifications" right={<Chip label={reminder.supported ? 'Optional' : 'Installed app only'} />} />
    <Panel style={s.panel}>
      <View style={s.row}>
        <Feather name="bell" size={22} color={palette.primary} />
        <Text style={s.heading}>Before the event closes</Text>
      </View>
      {!reminder.supported ? <>
        <Text style={s.body}>Phone alerts are available in the installed iPhone or Android app. This browser version does not send background or Home Screen notifications.</Text>
        <Text style={s.fine}>Keep using the in-app reminder buttons below. No phone number is needed. SMS and browser push are not enabled.</Text>
      </> : <>
        <Text style={s.body}>Choose open events and get a device notification before they close. No phone number, SMS or marketing messages.</Text>
        <Text style={s.fine}>Uses the local event calendar shown here. Only the upcoming alerts listed below are scheduled; reopen Events for new windows or timezone changes. Focus, device settings and battery restrictions can delay or hide alerts.</Text>
        <Button
          label={reminder.prefs.enabled ? 'Turn phone reminders off' : 'Allow phone reminders'}
          icon={reminder.prefs.enabled ? 'bell-off' : 'bell'}
          variant={reminder.prefs.enabled ? 'secondary' : 'primary'}
          disabled={disabled}
          onPress={() => { void save({ enabled: !reminder.prefs.enabled }); }}
          testID="toggle-phone-reminders"
          accessibilityHint="Requests notification permission only when you choose to enable reminders"
        />
        {reminder.permission !== 'allowed' && <Text style={s.fine}>Phone notification permission: {reminder.permission === 'denied' ? 'not allowed' : 'not requested or not yet allowed'}. You can change this in device settings.</Text>}
        <Text style={s.label}>Notify me before closing</Text>
        <View style={s.rowWrap}>
          {[{ value: 60, label: '1 hour' }, { value: 180, label: '3 hours' }].map(option =>
            <Pressable key={option.value}
              testID={`phone-lead-${option.value}`} accessibilityRole="radio"
              accessibilityLabel={`${option.label} before closing`}
              accessibilityState={{ checked: reminder.prefs.leadMinutes === option.value, disabled }}
              aria-checked={reminder.prefs.leadMinutes === option.value}
              disabled={disabled} onPress={() => { void save({ leadMinutes: option.value }); }}
              style={[s.option, reminder.prefs.leadMinutes === option.value && s.selected]}>
              <Text style={[s.optionText, reminder.prefs.leadMinutes === option.value && { color: palette.onAccent }]}>{option.label}</Text>
            </Pressable>)}
        </View>
        <Text style={s.fine}>Current lead time: {reminder.prefs.leadMinutes} minutes. Custom range: 5 minutes to 7 days.</Text>
        <View style={s.rowWrap}>
          <TextInput testID="phone-lead-custom" accessibilityLabel="Custom reminder lead time in minutes"
            value={custom} onChangeText={setCustom} keyboardType="number-pad" inputMode="numeric"
            maxLength={5} placeholder="Minutes" placeholderTextColor={palette.muted}
            editable={!disabled} style={s.input} returnKeyType="done" />
          <Button testID="save-phone-lead" size="sm" label="Save minutes" variant="secondary"
            disabled={disabled || !validLeadMinutes(customValue)}
            onPress={() => { void save({ leadMinutes: customValue }); }} />
        </View>
        <Text style={s.label}>Events on this device</Text>
        {!eligible.length && <Text style={s.fine}>No open events are currently eligible. Closed and rank-locked events cannot be scheduled.</Text>}
        {eligible.map(event => {
          const checked = reminder.prefs.events.includes(event.id);
          const pending = reminder.scheduled.find(item => item.eventId === event.id);
          const tooLate = event.closesAt - reminder.prefs.leadMinutes * 60_000 <= Date.now();
          return <View key={event.id} style={s.event}>
            <Pressable accessibilityRole="switch" accessibilityLabel={`${event.name} phone reminder`}
              accessibilityState={{ checked, disabled }} aria-checked={checked}
              testID={`phone-event-${event.id}`} disabled={disabled} style={s.row}
              onPress={() => { void save({ events: checked ? reminder.prefs.events.filter(id => id !== event.id) : [...reminder.prefs.events, event.id] }); }}>
              <Feather name={checked ? 'bell' : 'bell-off'} size={18} color={checked ? palette.primary : palette.supporting} />
              <Text style={[s.body, { flex: 1 }]}>{event.name}</Text>
              <Text style={s.fine}>{checked ? 'Selected' : 'Off'}</Text>
            </Pressable>
            <Text style={s.fine}>Closes {fmtLocal(new Date(event.closesAt))}</Text>
            {checked && <Text style={s.fine}>{
              !reminder.prefs.enabled ? 'Saved selection. Enable phone reminders to schedule.' :
              pending ? `Scheduled ${fmtLocal(new Date(pending.fireAt))}` :
              tooLate ? 'This lead time has already passed; no late alert will be sent.' :
              'Not scheduled. Check permission or retry.'
            }</Text>}
          </View>;
        })}
        <Text style={s.fine}>Upcoming scheduled alerts: {reminder.scheduled.length}. Turning reminders off cancels this feature’s pending alerts. Sign-out cancels them too.</Text>
        <View style={s.rowWrap}>
          <Button label="Phone settings" variant="ghost" size="sm" icon="settings" testID="phone-notification-settings"
            onPress={() => {
              setSettingsError(null);
              if (Platform.OS !== 'web') void Linking.openSettings().catch(() => setSettingsError('Could not open Settings. Open your phone settings and find GoldRush notifications.'));
            }} />
          <Button label="Clear phone reminders" variant="ghost" size="sm" disabled={reminder.busy}
            testID="clear-phone-reminders" onPress={() => { setMessage(null); void reminder.reset(); }} />
        </View>
      </>}
      {reminder.error && <View style={{ gap: 8 }}>
        <Text accessibilityRole="alert" style={s.body}>{reminder.error}</Text>
        <View style={s.rowWrap}>
          <Button label="Retry reminders" size="sm" variant="secondary" disabled={reminder.busy} onPress={reminder.retry} testID="retry-phone-reminders" />
          {!reminder.ready && reminder.supported && <Button label="Reset phone reminders" size="sm" variant="ghost" disabled={reminder.busy} onPress={() => { void reminder.reset(); }} />}
        </View>
      </View>}
      {settingsError && <Text accessibilityRole="alert" style={s.body}>{settingsError}</Text>}
      {message && <Text accessibilityLiveRegion="polite" style={s.fine}>{message}</Text>}
    </Panel>
  </View>;
}

const s = StyleSheet.create({
  panel: { padding: 14, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  heading: { flex: 1, fontFamily: fonts.display, fontSize: 24, color: palette.foreground },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: palette.foreground },
  fine: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.supporting },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.supporting, textTransform: 'uppercase' },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.background },
  selected: { backgroundColor: palette.primary, borderColor: palette.edge },
  optionText: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.foreground },
  input: { minHeight: 46, minWidth: 110, flexGrow: 1, paddingHorizontal: 12, borderWidth: 2, borderColor: palette.border, color: palette.foreground, backgroundColor: palette.background, fontFamily: fonts.body, fontSize: 16 },
  event: { gap: 3, paddingVertical: 8, borderTopWidth: 1, borderColor: palette.border },
});
