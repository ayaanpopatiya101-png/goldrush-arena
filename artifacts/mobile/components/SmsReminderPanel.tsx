import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  setBaseUrl, useCheckSmsVerification, useGetSmsReminders, useRemoveSmsNumber, useRequestSmsVerification, useSaveSmsReminders,
  type SmsReminderDelivery, type SmsReminderInput, type SmsReminderState,
} from '@workspace/api-client-react';
import { Text } from '@/components/ui/Text';
import { Button, Chip, Panel, SectionLabel } from '@/components/ui/Primitives';
import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { usePlayer } from '@/context/PlayerContext';
import { getArenaSession } from '@/utils/arenaSession';
import { getApiBase } from '@/utils/api';
import { deviceTimeZone, fmtLocal } from '@/utils/eventPrefs';

type Source = 'events' | 'settings';
type Session = { username: string; playerId: string; token: string };

const RESEND_SECONDS = 120;
const STATUS_LABEL: Record<SmsReminderDelivery['status'], string> = {
  pending: 'Waiting for send time', sending: 'Handing to carrier', unknown: 'Status unknown', queued: 'Queued with carrier',
  sent: 'Sent to carrier (not confirmed)', delivered: 'Carrier reported delivered', failed: 'Failed', cancelled: 'Cancelled', skipped: 'Skipped',
};

function errText(error: unknown): string {
  const data = (error as { data?: unknown } | null)?.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    for (const k of ['error', 'message', 'detail']) if (typeof d[k] === 'string' && d[k]) return d[k] as string;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong. Try again.';
}

function fmt(iso: string | null | undefined) { return iso ? fmtLocal(new Date(iso)) : 'No close time'; }

export function SmsReminderPanel({ source }: { source: Source }) {
  const { currentUsername } = usePlayer();
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [sessionTry, setSessionTry] = useState(0);

  useEffect(() => {
    let alive = true;
    setSession(null); setSessionError(null);
    if (!currentUsername) return;
    getArenaSession(currentUsername).then(sess => {
      if (!alive) return;
      setBaseUrl(getApiBase());
      setSession({ username: currentUsername, playerId: sess.playerId, token: sess.token });
    }).catch(e => { if (alive) setSessionError(errText(e)); });
    return () => { alive = false; };
  }, [currentUsername, sessionTry]);

  const queryKey = useMemo(() => ['sms-reminders', session?.username ?? '', session?.playerId ?? ''] as const, [session]);
  useEffect(() => {
    const key = queryKey;
    return () => { if (key[2]) qc.removeQueries({ queryKey: key }); };
  }, [queryKey, qc]);

  const activeSession = session?.username === currentUsername ? session : null;
  const request = activeSession ? { headers: { Authorization: `Bearer ${activeSession.token}` } } : undefined;
  const query = useGetSmsReminders({ query: { queryKey, enabled: !!activeSession, retry: 1, refetchInterval: 30_000 }, request });
  const put = (st: SmsReminderState) => qc.setQueryData(queryKey, st);

  const save = useSaveSmsReminders({ request, mutation: { onSuccess: put } });
  const verify = useRequestSmsVerification({ request, mutation: { onSuccess: put, gcTime: 0 } });
  const check = useCheckSmsVerification({ request, mutation: { onSuccess: put, gcTime: 0 } });
  const remove = useRemoveSmsNumber({ request, mutation: { onSuccess: put } });

  if (!currentUsername) return <Shell><Text style={s.body}>Choose a player profile to manage text reminders.</Text></Shell>;
  if (sessionError) return <Shell>
    <Text accessibilityRole="alert" style={s.body}>Could not connect your online identity: {sessionError}</Text>
    <Button size="sm" variant="secondary" label="Retry" onPress={() => setSessionTry(n => n + 1)} testID="sms-retry-session" />
  </Shell>;
  if (!activeSession || query.isLoading) return <Shell><View accessibilityLabel="Loading text reminders" style={{ gap: 8 }}>
    <View style={[s.skel, { width: '70%' }]} /><View style={[s.skel, { width: '90%' }]} /><View style={[s.skel, { width: '45%', height: 44 }]} />
  </View></Shell>;
  if (query.isError || !query.data) return <Shell>
    <Text accessibilityRole="alert" style={s.body}>Text reminder settings could not load. {query.error ? errText(query.error) : ''}</Text>
    <Button size="sm" variant="secondary" label="Retry" icon="refresh-cw" onPress={() => { void query.refetch(); }} testID="sms-retry" />
  </Shell>;

  return <Body key={`${activeSession.username}:${activeSession.playerId}`} state={query.data} source={source}
    save={save} verify={verify} check={check} remove={remove} refetching={query.isFetching} refetch={() => { void query.refetch(); }} />;
}

function Shell({ children, chip }: { children: React.ReactNode; chip?: string }) {
  return <View style={{ gap: 8 }} testID="sms-reminder-panel">
    <SectionLabel title="Text message reminders" right={<Chip label={chip ?? 'Optional SMS'} />} />
    <Panel style={s.panel}>
      <View style={s.row}>
        <Feather name="message-square" size={22} color={palette.primary} />
        <View style={{ flex: 1 }}>
          <Text style={s.heading}>SMS before events close</Text>
          <Text style={s.fine}>A separate channel from phone notifications. US numbers only. Message and data rates may apply.</Text>
        </View>
      </View>
      {children}
    </Panel>
  </View>;
}

type M<V> = { mutate: (v: V, o?: { onSuccess?: (st: SmsReminderState) => void }) => void; isPending: boolean; error: unknown; reset: () => void };

function Body({ state, source, save, verify, check, remove, refetching, refetch }: {
  state: SmsReminderState; source: Source; refetching: boolean; refetch: () => void;
  save: M<{ data: SmsReminderInput }>; verify: M<{ data: { phone: string; timezone: string; verificationConsent: true; adultConfirmed: true } }>;
  check: M<{ data: { code: string } }>; remove: M<void>;
}) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [editingNumber, setEditingNumber] = useState(false);
  const [vConsent, setVConsent] = useState(false);
  const [vAdult, setVAdult] = useState(false);
  const [rConsent, setRConsent] = useState(false);
  const [rAdult, setRAdult] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [customLead, setCustomLead] = useState('');
  const [tz, setTz] = useState(state.hasNumber ? state.timezone : deviceTimeZone());
  const [draftEvents, setDraftEvents] = useState<string[]>(state.eventIds);
  const [draftLead, setDraftLead] = useState(state.leadMinutes);
  const lastServer = useRef(state);

  useEffect(() => {
    if (lastServer.current === state) return;
    const previous = lastServer.current;
    lastServer.current = state;
    // Polls refresh carrier/STOP state without discarding an unfinished form.
    if (previous.leadMinutes === state.leadMinutes && previous.timezone === state.timezone &&
        JSON.stringify(previous.eventIds) === JSON.stringify(state.eventIds)) return;
    setDraftEvents(state.eventIds); setDraftLead(state.leadMinutes);
    if (state.timezone) setTz(state.timezone);
  }, [state]);
  useEffect(() => () => { setPhone(''); setCode(''); }, []);
  useEffect(() => {
    if (resendAt <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resendAt]);

  const busy = save.isPending || verify.isPending || check.isPending || remove.isPending;
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const showEntry = !state.hasNumber || editingNumber;
  const phoneOk = /^\+?1?[\s\-.()]*\d{3}[\s\-.()]*\d{3}[\s\-.]*\d{4}$/.test(phone.trim());
  const leadCustom = /^\d+$/.test(customLead.trim()) ? Number(customLead) : NaN;
  const leadCustomOk = leadCustom >= 5 && leadCustom <= 10080;
  const dirty = draftLead !== state.leadMinutes || tz.trim() !== state.timezone ||
    draftEvents.length !== state.eventIds.length || draftEvents.some(id => !state.eventIds.includes(id));
  const canEnable = state.remindersAvailable && state.verified && !state.suppressed;
  const say = (m: string) => setMessage(m);
  const clearErrors = () => { save.reset(); verify.reset(); check.reset(); remove.reset(); setMessage(null); };

  function base(enabled: boolean): SmsReminderInput {
    return { enabled, eventIds: draftEvents, leadMinutes: draftLead, timezone: tz.trim(), source, expectedRevision: state.revision };
  }
  function sendCode() {
    if (!vConsent || !vAdult) return;
    clearErrors();
    verify.mutate({ data: { phone: phone.trim(), timezone: tz.trim() || deviceTimeZone(), verificationConsent: true, adultConfirmed: true } }, {
      onSuccess: () => { setResendAt(Date.now() + RESEND_SECONDS * 1000); setNow(Date.now()); setPhone(''); setVConsent(false); setVAdult(false); setCode(''); setEditingNumber(false); verify.reset(); say('Code request accepted. If the number can receive texts, a six-digit code should arrive shortly. This does not turn on reminders.'); },
    });
  }
  function resend() {
    clearErrors();
    // The phone input was cleared after the first request; ask again to keep no stored number on device.
    setEditingNumber(true); setVConsent(false); setVAdult(false);
    say('Enter the number again to request a new code.');
  }
  function submitCode() {
    clearErrors();
    check.mutate({ data: { code } }, { onSuccess: () => { setCode(''); setPhone(''); check.reset(); say('Number confirmed. Reminders are still off until you separately opt in below.'); } });
  }
  function optIn() {
    if (!rConsent || !rAdult) return;
    clearErrors();
    save.mutate({ data: { ...base(true), consent: true, consentVersion: state.consentVersion, adultConfirmed: true } }, {
      onSuccess: () => { setRConsent(false); setRAdult(false); say('Opt-in saved. Scheduled texts appear below; delivery is not guaranteed.'); },
    });
  }
  function saveEdits() {
    clearErrors();
    const keepEnabled = state.enabled && draftEvents.length > 0;
    save.mutate({ data: { ...base(keepEnabled), consentVersion: keepEnabled ? state.consentVersion : undefined, ...(!keepEnabled ? { consent: false } : {}) } }, {
      onSuccess: () => say(state.enabled && !keepEnabled ? 'No events selected. Text reminders turned off and pending texts cancelled.' : keepEnabled ? 'Reminder choices saved.' : 'Choices saved. Texts stay off until you opt in.'),
    });
  }
  function disable() {
    clearErrors();
    save.mutate({ data: { ...base(false), eventIds: state.eventIds, leadMinutes: state.leadMinutes, timezone: state.timezone, consent: false } }, { onSuccess: () => say('Text reminders turned off. Pending texts are cancelled.') });
  }
  function doRemove() {
    clearErrors();
    remove.mutate(undefined, { onSuccess: () => { setConfirmRemove(false); setPhone(''); setCode(''); setEditingNumber(false); setResendAt(0); say('Number removed. No further reminder texts will be scheduled for it.'); } });
  }

  const errs = [verify.error, check.error, save.error, remove.error].filter(Boolean);
  const chip = state.suppressed ? 'Stopped by reply' : state.enabled ? 'On' : state.verified ? 'Verified, off' : 'Optional SMS';
  const gated = !state.verificationAvailable || !state.remindersAvailable;

  return <Shell chip={chip}>
    {gated && <View style={s.gate} accessibilityRole="summary">
      <View style={s.row}><Feather name="lock" size={16} color={palette.onAccent} /><Text style={s.gateHead}>Texting setup pending</Text></View>
      <Text style={s.gateText}>
        {!state.verificationAvailable ? 'Number verification is not available yet. ' : ''}
        {!state.remindersAvailable ? 'Reminder texts cannot be turned on until GoldRush messaging is approved. ' : ''}
        You can still remove a saved number or turn reminders off at any time.
      </Text>
      {state.blockers.map(b => <Text key={b} style={s.gateText}>- {b}</Text>)}
    </View>}

    {/* Number */}
    <Step n="1" title="Your number" done={state.verified}>
      {state.hasNumber && !editingNumber && <View style={s.numberRow}>
        <Text style={s.number}>{state.maskedNumber ?? 'Saved number'}</Text>
        <Chip label={state.suppressed ? 'Replied STOP' : state.verified ? 'Verified' : state.verificationPending ? 'Code sent' : 'Not verified'} tone={state.verified ? 'moss' : 'neutral'} />
      </View>}
      {state.suppressed && <Text style={s.fine}>This number replied STOP. Reply START from that phone to allow texts again; the app cannot override it.</Text>}
      {showEntry && <>
        <TextInput testID="sms-phone" accessibilityLabel="US mobile number" value={phone} onChangeText={setPhone}
          keyboardType="phone-pad" inputMode="tel" autoComplete="tel" textContentType="telephoneNumber" maxLength={20}
          placeholder="(555) 201-4477" placeholderTextColor={palette.muted} editable={!busy && state.verificationAvailable} style={s.input} />
        <Check checked={vConsent} disabled={!state.verificationAvailable} onToggle={() => setVConsent(v => !v)} testID="sms-verify-consent"
          label="Text me a one-time code to confirm I own this number. This does not sign me up for reminders." />
        <Check checked={vAdult} disabled={!state.verificationAvailable} onToggle={() => setVAdult(v => !v)} testID="sms-verify-adult"
          label="I am 18 or older and the account holder for this number." />
        <View style={s.rowWrap}>
          <Button size="sm" label={verify.isPending ? 'Sending' : 'Send code'} icon="send" loading={verify.isPending}
            disabled={busy || !state.verificationAvailable || !phoneOk || !vConsent || !vAdult || cooldown > 0} onPress={sendCode} testID="sms-send-code"
            accessibilityHint="Requests a six-digit ownership code by text" />
          {editingNumber && <Button size="sm" variant="ghost" label="Cancel" onPress={() => { setEditingNumber(false); setPhone(''); }} testID="sms-cancel-change" />}
        </View>
        {!state.verificationAvailable && <Text style={s.fine}>Sending codes is blocked until approval is complete.</Text>}
        {phone.length > 0 && !phoneOk && <Text style={s.fine}>Enter a 10-digit US number.</Text>}
      </>}
      {state.verificationPending && !state.verified && !editingNumber && <>
        <Text style={s.label}>Six-digit code</Text>
        <View style={s.rowWrap}>
          <TextInput testID="sms-code" accessibilityLabel="Six-digit verification code" value={code}
            onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" inputMode="numeric"
            autoComplete="sms-otp" textContentType="oneTimeCode" maxLength={6} placeholder="000000" placeholderTextColor={palette.muted}
            editable={!busy} style={[s.input, s.code]} />
          <Button size="sm" label="Confirm" icon="check" loading={check.isPending} disabled={busy || code.length !== 6} onPress={submitCode} testID="sms-check-code" />
        </View>
        <Button size="sm" variant="ghost" label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'} disabled={busy || cooldown > 0}
          onPress={resend} testID="sms-resend" />
      </>}
      {state.hasNumber && !editingNumber && <View style={s.rowWrap}>
        <Button size="sm" variant="secondary" label="Change number" icon="edit-2" disabled={busy || !state.verificationAvailable}
          onPress={() => { clearErrors(); setEditingNumber(true); setVConsent(false); setVAdult(false); }} testID="sms-change-number" />
        {!confirmRemove
          ? <Button size="sm" variant="ghost" label="Remove number" icon="trash-2" disabled={busy} onPress={() => setConfirmRemove(true)} testID="sms-remove" />
          : <View style={s.confirm}>
              <Text style={s.body}>Remove this number and cancel all pending texts?</Text>
              <View style={s.rowWrap}>
                <Button size="sm" label="Remove" loading={remove.isPending} disabled={busy} onPress={doRemove} testID="sms-remove-confirm" />
                <Button size="sm" variant="ghost" label="Keep" onPress={() => setConfirmRemove(false)} testID="sms-remove-cancel" />
              </View>
            </View>}
      </View>}
    </Step>

    {/* Choices */}
    <Step n="2" title="What to remind" done={draftEvents.length > 0}>
      {!state.events.length && <Text style={s.fine}>No events are offered for texts right now.</Text>}
      {state.events.map(ev => {
        const on = draftEvents.includes(ev.id);
        const dis = busy || !ev.available;
        return <Pressable key={ev.id} testID={`sms-event-${ev.id}`} accessibilityRole="checkbox" accessibilityLabel={`${ev.name} text reminder`}
          accessibilityState={{ checked: on, disabled: dis }} aria-checked={on} disabled={dis && !on}
          onPress={() => setDraftEvents(cur => on ? cur.filter(id => id !== ev.id) : cur.length >= 10 ? cur : [...cur, ev.id])}
          style={({ pressed }) => [s.event, on && s.eventOn, pressed && { opacity: 0.8 }]}>
          <View style={[s.box, on && s.boxOn]}>{on && <Feather name="check" size={14} color={palette.onAccent} />}</View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[s.body, !ev.available && { color: palette.supporting }]}>{ev.name}</Text>
            <Text style={s.fine}>{ev.available ? `Closes ${fmt(ev.closesAt)}` : `Unavailable: ${ev.reason}`}</Text>
          </View>
        </Pressable>;
      })}
      <Text style={s.label}>Text me before closing</Text>
      <Text style={s.fine}>Texts are sent only from 9am to before 8pm in your saved time zone. Featured events close at midnight: 1-hour and 3-hour texts fall in quiet hours and are skipped. Choose a custom lead such as 300 minutes (5 hours) for an evening text. Late or stale reminders are also skipped, not moved.</Text>
      <View style={s.rowWrap}>
        {[60, 180].map(v => <Pressable key={v} testID={`sms-lead-${v}`} accessibilityRole="radio" accessibilityState={{ checked: draftLead === v, disabled: busy }}
          aria-checked={draftLead === v} disabled={busy} onPress={() => setDraftLead(v)} style={[s.option, draftLead === v && s.selected]}>
          <Text style={[s.optionText, draftLead === v && { color: palette.onAccent }]}>{v === 60 ? '1 hour' : '3 hours'}</Text>
        </Pressable>)}
        {draftLead !== 60 && draftLead !== 180 && <Chip label={`Custom: ${draftLead} min`} tone="moss" />}
      </View>
      <View style={s.rowWrap}>
        <TextInput testID="sms-lead-custom" accessibilityLabel="Custom text reminder lead time in minutes, 5 to 10080"
          value={customLead} onChangeText={setCustomLead} keyboardType="number-pad" inputMode="numeric" maxLength={5}
          placeholder="Minutes (5-10080)" placeholderTextColor={palette.muted} editable={!busy} style={[s.input, { flexGrow: 1 }]} />
        <Button size="sm" variant="secondary" label="Use minutes" disabled={busy || !leadCustomOk} onPress={() => { setDraftLead(leadCustom); setCustomLead(''); }} testID="sms-lead-apply" />
      </View>
      <Text style={s.label}>Time zone</Text>
      <TextInput testID="sms-timezone" accessibilityLabel="Time zone, for example America/Chicago" value={tz} onChangeText={setTz}
        autoCapitalize="none" autoCorrect={false} maxLength={80} editable={!busy} style={s.input} />
      <Text style={s.fine}>The server checks this name. Device zone: {deviceTimeZone()}.</Text>
      <Button size="sm" variant="secondary" label="Save choices" icon="save" loading={save.isPending && !rConsent} disabled={busy || !state.hasNumber || !dirty || !tz.trim()}
        onPress={saveEdits} testID="sms-save-choices" accessibilityHint="Saves events, lead time and time zone without changing your opt-in" />
    </Step>

    {/* Opt in */}
    <Step n="3" title="Recurring reminder texts" done={state.enabled}>
      {state.enabled ? <>
        <Text style={s.body}>Text reminders are on{state.consentedAt ? ` since ${fmt(state.consentedAt)}` : ''}. Reply STOP to any text to end them.</Text>
        <Button label="Turn text reminders off" icon="bell-off" variant="secondary" loading={save.isPending} disabled={busy} onPress={disable} testID="sms-disable" />
      </> : <>
        <View style={s.consent}>
          <Text style={s.consentText} testID="sms-consent-text">{state.consentText}</Text>
          <Text style={s.fine}>Terms version {state.consentVersion}</Text>
        </View>
        <Check checked={rConsent} disabled={!canEnable} onToggle={() => setRConsent(v => !v)} testID="sms-recurring-consent"
          label="I agree to receive recurring automated reminder texts as described above." />
        <Check checked={rAdult} disabled={!canEnable} onToggle={() => setRAdult(v => !v)} testID="sms-recurring-adult" label="I am 18 or older." />
        <Button label="Turn on text reminders" icon="message-square" loading={save.isPending && rConsent}
          disabled={busy || !canEnable || !rConsent || !rAdult || !draftEvents.length || !tz.trim()} onPress={optIn} testID="sms-enable" />
        {!canEnable && <Text style={s.fine}>{
          state.suppressed ? 'Blocked: this number replied STOP.' :
          !state.remindersAvailable ? 'Blocked: waiting on messaging approval. Nothing will be sent.' :
          'Verify your number first. Verifying does not opt you in.'}</Text>}
        {canEnable && !draftEvents.length && <Text style={s.fine}>Pick at least one available event above.</Text>}
      </>}
    </Step>

    {/* Deliveries */}
    <View style={{ gap: 6 }}>
      <View style={s.rowWrap}>
        <Text style={[s.label, { flex: 1 }]}>Upcoming texts</Text>
        <Button size="sm" variant="ghost" label={refetching ? 'Refreshing' : 'Refresh'} icon="refresh-cw" disabled={refetching} onPress={refetch} testID="sms-refresh" />
      </View>
      {!state.deliveries.length
        ? <Text style={s.fine}>No texts scheduled. Statuses come from the carrier and may lag.</Text>
        : state.deliveries.map(d => {
          const ev = state.events.find(e => e.id === d.eventId);
          return <View key={d.id} style={s.delivery}>
            <View style={{ flex: 1 }}>
              <Text style={s.body}>{ev?.name ?? d.eventId}</Text>
              <Text style={s.fine}>Send {fmt(d.fireAt)} · Closes {fmt(d.closesAt)}</Text>
            </View>
            <Chip label={STATUS_LABEL[d.status]} tone={d.status === 'failed' ? 'clay' : d.status === 'delivered' ? 'moss' : 'neutral'} />
          </View>;
        })}
    </View>

    {errs.map((e, i) => <Text key={i} accessibilityRole="alert" style={s.error}>{errText(e)}</Text>)}
    {message && <Text accessibilityLiveRegion="polite" style={s.ok}>{message}</Text>}
  </Shell>;
}

function Step({ n, title, done, children }: { n: string; title: string; done: boolean; children: React.ReactNode }) {
  return <View style={s.step}>
    <View style={s.row}>
      <View style={[s.badge, done && s.badgeOn]}>
        {done ? <Feather name="check" size={14} color={palette.onAccent} /> : <Text style={s.badgeText}>{n}</Text>}
      </View>
      <Text style={s.stepTitle}>{title}</Text>
    </View>
    {children}
  </View>;
}

function Check({ checked, label, onToggle, disabled, testID }: { checked: boolean; label: string; onToggle: () => void; disabled?: boolean; testID: string }) {
  return <Pressable testID={testID} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked, disabled }}
    aria-checked={checked} disabled={disabled} onPress={onToggle} style={[s.check, disabled && { opacity: 0.5 }]}>
    <View style={[s.box, checked && s.boxOn]}>{checked && <Feather name="check" size={14} color={palette.onAccent} />}</View>
    <Text style={[s.body, { flex: 1 }]}>{label}</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  panel: { padding: 14, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  heading: { fontFamily: fonts.display, fontSize: 24, color: palette.foreground, textTransform: 'uppercase' },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: palette.foreground },
  fine: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.supporting },
  label: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.supporting, textTransform: 'uppercase', letterSpacing: 0.6 },
  skel: { height: 16, backgroundColor: palette.raised },
  gate: { gap: 4, padding: 12, backgroundColor: palette.gold, borderWidth: 2, borderColor: palette.edge },
  gateHead: { fontFamily: fonts.bodyBold, fontSize: 14, textTransform: 'uppercase', color: palette.onAccent },
  gateText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.onAccent },
  step: { gap: 10, paddingTop: 12, borderTopWidth: 2, borderColor: palette.border },
  stepTitle: { flex: 1, fontFamily: fonts.display, fontSize: 19, color: palette.foreground, textTransform: 'uppercase', letterSpacing: 0.5 },
  badge: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: palette.border, backgroundColor: palette.inset },
  badgeOn: { backgroundColor: palette.primary, borderColor: palette.edge },
  badgeText: { fontFamily: fonts.display, fontSize: 16, color: palette.foreground },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: palette.inset, borderWidth: 2, borderColor: palette.border },
  number: { flex: 1, fontFamily: fonts.display, fontSize: 22, letterSpacing: 1, color: palette.foreground, fontVariant: ['tabular-nums'] },
  input: { minHeight: 48, minWidth: 120, paddingHorizontal: 12, borderWidth: 2, borderColor: palette.border, color: palette.foreground, backgroundColor: palette.inset, fontFamily: fonts.body, fontSize: 16 },
  code: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 6, minWidth: 150 },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 44, paddingVertical: 6 },
  box: { width: 24, height: 24, marginTop: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: palette.border, backgroundColor: palette.inset },
  boxOn: { backgroundColor: palette.primary, borderColor: palette.edge },
  confirm: { width: '100%', gap: 8, padding: 10, borderWidth: 2, borderColor: palette.danger },
  event: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, padding: 10, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.background },
  eventOn: { borderColor: palette.primary },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.background },
  selected: { backgroundColor: palette.primary, borderColor: palette.edge },
  optionText: { fontFamily: fonts.bodyBold, fontSize: 15, color: palette.foreground },
  consent: { gap: 6, padding: 12, backgroundColor: palette.inset, borderLeftWidth: 4, borderLeftColor: palette.primary },
  consentText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: palette.foreground },
  delivery: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderColor: palette.border, flexWrap: 'wrap' },
  error: { fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 20, color: palette.danger },
  ok: { fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 20, color: palette.primary },
});
