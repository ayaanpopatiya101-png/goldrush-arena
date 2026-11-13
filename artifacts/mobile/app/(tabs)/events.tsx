import { Text } from '@/components/ui/Text';
import { Feather } from '@expo/vector-icons';
import { Button, Chip, Panel, ScreenTitle, SectionLabel, Shell } from '@/components/ui/Primitives';
import { palette } from '@/constants/colors';
import { fonts, textScale } from '@/constants/typography';
import * as Haptics from '@/utils/haptics';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EVENT_MIN_RANK_INDEX, getCurrentEvents, getEventQualifierState, getRankIndex, RANKS, SKINS, usePlayer,
  type EventDefinition, type QualifierRoundDef,
} from '@/context/PlayerContext';
import { useParty } from '@/context/PartyContext';
import {
  setActiveEvent, setGameConfig, setQualifierContext,
  type ActiveEventBonus, type GameVariant,
} from '@/store/gameSession';
import { FEATURED_MODES, useFeaturedModeCountdown, type FeaturedMode } from '@/utils/featuredModes';
import { deviceTimeZone, fmtLocal, fmtSpan, localChallengeWindow, scheduleWindow, useEventPrefs } from '@/utils/eventPrefs';
import { EventNotificationPanel } from '@/components/EventNotificationPanel';
import { SmsReminderPanel } from '@/components/SmsReminderPanel';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

const MIN_RANK = RANKS[EVENT_MIN_RANK_INDEX];
const MIN_RANK_NAME = MIN_RANK?.name ?? 'Master 1';
const MODE_NAME: Record<string, string> = {
  classic: 'Classic', chaos: 'Chaos', blitz: 'Blitz', six_player: '6-Player', survival: 'Survival', turbo: 'Turbo',
};
const PLACES = ['1st', '2nd', '3rd', '4th'];

function haptic() { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, currentUsername, spendEventPlay, spendQualifierPlay } = usePlayer();
  const { isInParty, leaveParty } = useParty();
  const { prefs, status, reload, toggle } = useEventPrefs(currentUsername);
  const { mode: liveMode, timeLeft } = useFeaturedModeCountdown();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 60_000); return () => clearInterval(id); }, []);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(null), 3500); return () => clearTimeout(id); }, [notice]);

  const events = getCurrentEvents();
  const hasRank = getRankIndex(profile.rank) >= EVENT_MIN_RANK_INDEX;
  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const tz = deviceTimeZone();

  function say(msg: string) { setNotice(msg); AccessibilityInfo.announceForAccessibility?.(msg); }

  function baseConfig() {
    const skin = SKINS.find(sk => sk.id === profile.currentSkin) ?? SKINS[0];
    return { playerName: profile.name, playerSkinId: skin.id, playerColor: skin.color, playerGlowColor: skin.glowColor, playerRelicId: 'none' };
  }

  function playFeatured(mode: FeaturedMode) {
    if (isInParty) return;
    setGameConfig({
      ...baseConfig(), matchType: 'casual', variant: 'classic',
      featuredModeId: mode.id,
      featuredCoinMult: mode.overrides.coinMultiplier,
      featuredXpMult: mode.overrides.xpMultiplier,
      featuredBallSpeedFactor: mode.overrides.ballSpeedFactor,
    });
    haptic();
    router.push('/lobby');
  }

  function playRally() {
    if (isInParty) return;
    setGameConfig({ ...baseConfig(), matchType: 'casual', variant: 'rally_race' });
    haptic();
    router.push('/lobby');
  }

  async function playQualifier(ev: EventDefinition, roundIdx: number, roundDef: QualifierRoundDef) {
    if (!hasRank || ev.isLocked || isInParty) return;
    setBusy(ev.id);
    const ok = await spendQualifierPlay(ev.periodKey, roundIdx);
    setBusy(null);
    if (!ok) { say('Could not start: no qualifier plays left for this round.'); return; }
    setQualifierContext({
      periodKey: ev.periodKey, roundIdx, roundName: roundDef.name, totalRounds: ev.rounds!.length,
      threshold: roundDef.threshold, qpPerPlace: roundDef.qpPerPlace,
      eventName: ev.name, eventEmoji: ev.emoji, eventColor: ev.color,
    });
    setGameConfig({ ...baseConfig(), matchType: 'ranked', variant: ev.mode as GameVariant });
    haptic();
    router.push('/game');
  }

  async function playMainDraw(ev: EventDefinition) {
    if (!hasRank || ev.isLocked || isInParty) return;
    setBusy(ev.id);
    const ok = await spendEventPlay(ev.periodKey);
    setBusy(null);
    if (!ok) { say('Could not start: no plays left this period.'); return; }
    const bonus: ActiveEventBonus = {
      eventId: ev.id, eventName: ev.name, eventEmoji: ev.emoji, eventColor: ev.color,
      winXP: ev.winRewards.xp, winCoins: ev.winRewards.coins, loseXP: ev.loseRewards.xp, loseCoins: ev.loseRewards.coins,
      winCredits: ev.creditsOnWin, loseCredits: ev.creditsOnLose,
    };
    setActiveEvent(bonus);
    setGameConfig({ ...baseConfig(), matchType: 'ranked', variant: ev.mode as GameVariant });
    haptic();
    router.push('/game');
  }

  async function onToggle(field: 'follows' | 'reminders', id: string, label: string) {
    const was = prefs[field].includes(id);
    const ok = await toggle(field, id);
    if (Platform.OS !== 'web') Haptics.selectionAsync?.();
    if (!ok) say('Could not save that preference on this device. Try again.');
    else if (field === 'follows') say(was ? `Unfollowed ${label}` : `Following ${label}`);
    else say(was ? `In-app reminder off for ${label}` : `In-app reminder on for ${label}. Shown here when it opens; no push notifications.`);
  }

  const liveReminders = FEATURED_MODES.filter(m => m.id === liveMode?.id && prefs.reminders.includes(m.id));
  const liveLocalReminders = [events.weekly, events.monthly, events.annual].filter(ev => !ev.isLocked && prefs.reminders.includes(ev.id));
  const timeStr = timeLeft.d > 0 ? `${timeLeft.d}d ${timeLeft.h}h` : timeLeft.h > 0 ? `${timeLeft.h}h ${timeLeft.m}m` : `${timeLeft.m}m ${timeLeft.s}s`;
  const localEvents = [events.weekly, events.monthly, events.annual];

  return (
    <View style={[s.root, { backgroundColor: palette.background }]}>
      <View style={[s.header, { paddingTop: topPad + 6 }]}>
        <ScreenTitle kicker="GoldRush Arena" title="Events" />
        <Text style={s.sub}>All times shown in your device time ({tz}).</Text>
      </View>

      {notice && (
        <View style={s.toast} accessibilityLiveRegion="polite">
          <Feather name="check-square" size={16} color={palette.foreground} />
          <Text style={s.toastText}>{notice}</Text>
        </View>
      )}

      <KeyboardAwareScrollViewCompat bottomOffset={100} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 144 }} showsVerticalScrollIndicator={false}>
        <Shell style={{ gap: 18 }}>
          <EventNotificationPanel />
          <SmsReminderPanel source="events" />
          {isInParty && (
            <Panel style={[s.pad, s.partyBar]}>
              <Feather name="users" size={20} color={palette.foreground} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={s.h3}>You are in a party</Text>
                <Text style={s.body}>Events on this screen are solo. Leave the party to play them, or launch modes for everyone from Play.</Text>
              </View>
              <Button size="sm" variant="secondary" label="Leave party" onPress={() => { leaveParty(); say('Left party. Solo events are now available.'); }} testID="leave-party" />
            </Panel>
          )}

          {status === 'error' && (
            <Panel style={[s.pad, s.partyBar]}>
              <Feather name="alert-triangle" size={18} color={palette.foreground} />
              <Text style={[s.body, { flex: 1 }]}>Saved follows and reminders could not be read from this device.</Text>
              <Button size="sm" variant="ghost" label="Retry" onPress={reload} />
            </Panel>
          )}

          {liveReminders.map(m => (
            <Panel key={m.id} tone="brass" style={[s.pad, s.partyBar]}>
              <Feather name="bell" size={18} color={palette.onAccent} />
              <Text style={[s.body, { flex: 1, color: palette.onAccent }]}>Reminder: {m.name} is open now. Closes in {timeStr}.</Text>
            </Panel>
          ))}

          {liveLocalReminders.map(ev => (
            <Panel key={ev.id} tone="brass" style={[s.pad, s.partyBar]}>
              <Feather name="bell" size={18} color={palette.onAccent} />
              <Text style={[s.body, { flex: 1, color: palette.onAccent }]}>Reminder: local challenge {ev.name} is open. Closes {fmtLocal(localChallengeWindow(ev.type, ev.endsIn).closes)}.</Text>
            </Panel>
          ))}

          {/* Featured */}
          {liveMode ? (
            <View style={{ gap: 8 }}>
              <SectionLabel title="Featured now" right={<Chip label={`Closes in ${timeStr}`} tone="ochre" />} />
              <Panel style={s.featured}>
                <View style={s.band}>
                  <Feather name="clock" size={14} color={palette.gold} />
                  <Text style={s.bandText}>Featured mode · closes in {timeStr}</Text>
                </View>
                <View style={[s.pad, { gap: 12 }]}>
                  <View style={s.rowWrap}>
                    <Chip label="Casual" />
                    <Chip label="Local bots" />
                    <Chip label="Open to all ranks" />
                  </View>
                  <Text style={s.hero}>{liveMode.name}</Text>
                  <Text style={s.body}>{liveMode.descriptor}</Text>
                  <ModifierRow mode={liveMode} />
                  <Text style={s.fine}>
                    Played against local bots. Competitive level is unchanged. Modifiers apply to this mode only.
                    Window: {fmtLocal(scheduleWindow(liveMode.startDay, liveMode.endDay).start)} to {fmtLocal(scheduleWindow(liveMode.startDay, liveMode.endDay).end)}.
                  </Text>
                  <Button
                    size="lg"
                    label={isInParty ? 'Leave party to play' : `Play ${liveMode.name}`}
                    icon="play"
                    disabled={isInParty}
                    onPress={() => playFeatured(liveMode)}
                    testID="play-featured"
                    accessibilityHint="Opens the lobby with this featured mode's modifiers, versus local bots"
                  />
                </View>
              </Panel>
            </View>
          ) : (
            <Panel style={s.pad}><Text style={s.body}>No featured mode is scheduled right now.</Text></Panel>
          )}

          {/* Rally Race */}
          <View style={{ gap: 8 }}>
            <SectionLabel title="Always on" right={<Chip label="Casual online" />} />
            <Panel tone="raised" style={[s.pad, { gap: 10, borderRadius: 10, borderWidth: 3, borderColor: palette.edge }]}>
              <Text style={s.h2}>Rally Race</Text>
              <Text style={s.body}>Sixty seconds. Keep the ball alive and stack points.</Text>
              <View style={s.ruleGrid}>
                <Rule k="+1" v="per deflection" />
                <Rule k="−2" v="per missed ball" />
                <Rule k="60s" v="match length" />
              </View>
              <Text style={s.fine}>Goals do not eliminate anyone. Highest score wins. Tied top scores void the result: no awards for that match. Unranked; no rank change.</Text>
              <Button
                label={isInParty ? 'Leave party to play' : 'Find Rally Race'}
                icon="zap"
                disabled={isInParty}
                onPress={playRally}
                testID="play-rally"
              />
            </Panel>
          </View>

          {/* Playlist schedule */}
          <View style={{ gap: 8 }}>
            <SectionLabel title="Rotating playlist" />
            <Text style={s.fine}>Each mode opens at local midnight on its first day and closes at local midnight after its last day, on this device's clock.</Text>
            {FEATURED_MODES.map(m => {
              const w = scheduleWindow(m.startDay, m.endDay);
              const live = m.id === liveMode?.id;
              return (
                <Panel key={m.id} style={[s.pad, { gap: 8 }, live && { borderColor: palette.primary, borderRadius: 10, borderWidth: 3 }]}>
                  <View style={s.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.h3}>{m.name}</Text>
                      <Text style={s.meta}>{w.days} · {live ? 'Open now' : `Opens ${fmtLocal(w.start)}`}</Text>
                      <Text style={s.meta}>Closes {fmtLocal(w.end)}</Text>
                    </View>
                    {live && <Chip label="Live" tone="ochre" />}
                  </View>
                  <ModifierRow mode={m} />
                  <View style={s.rowWrap}>
                    <Toggle on={prefs.follows.includes(m.id)} icon="star" onLabel="Following" offLabel="Follow" disabled={status !== 'ready'} onPress={() => onToggle('follows', m.id, m.name)} />
                    <Toggle on={prefs.reminders.includes(m.id)} icon="bell" onLabel="In-app reminder on" offLabel="In-app reminder" disabled={status !== 'ready'} onPress={() => onToggle('reminders', m.id, m.name)} />
                  </View>
                </Panel>
              );
            })}
            <Text style={s.fine}>Reminders appear at the top of this screen when the mode is open. GoldRush does not send push notifications for events.</Text>
          </View>

          {/* Local challenges */}
          <View style={{ gap: 8 }}>
            <SectionLabel title="Local challenges" right={<Chip label={hasRank ? 'Unlocked' : `Needs ${MIN_RANK_NAME}`} />} />
            <Text style={s.fine}>
              Solo challenges played against bots on this device. Not esports and not against other players. Your earned plays, QP and rewards are kept. In-app reminders show at the top of this screen while a challenge is open; no push notifications.
            </Text>
            {!hasRank && (
              <Panel tone="paper" style={s.pad}>
                <Text style={s.body}>
                  Entry opens at {MIN_RANK_NAME} ({(MIN_RANK?.minXP ?? 0).toLocaleString()} XP). You are {profile.rank} with {profile.xp.toLocaleString()} XP. Rules are readable now.
                </Text>
              </Panel>
            )}
            {localEvents.map(ev => (
              <LocalChallenge
                key={ev.id}
                ev={ev}
                hasRank={hasRank}
                inParty={isInParty}
                busy={busy === ev.id}
                playsLeft={Math.max(0, ev.maxPlays - ((profile.eventPlaysUsed ?? {})[ev.periodKey] ?? 0))}
                qs={ev.rounds ? getEventQualifierState(profile, ev) : null}
                followed={prefs.follows.includes(ev.id)}
                reminded={prefs.reminders.includes(ev.id)}
                onRemind={() => onToggle('reminders', ev.id, ev.name)}
                prefsReady={status === 'ready'}
                onFollow={() => onToggle('follows', ev.id, ev.name)}
                onQualifier={(i, r) => playQualifier(ev, i, r)}
                onMainDraw={() => playMainDraw(ev)}
              />
            ))}
          </View>

          {/* Pro */}
          <View style={{ gap: 8 }}>
            <SectionLabel title="Pro & competitive" />
            <Panel style={[s.pad, { gap: 10 }]}>
              <Text style={s.h3}>No tournaments announced</Text>
              <Text style={s.body}>There are no official GoldRush tournaments, teams or prize pools at this time. Anything announced will appear here with dates and rules.</Text>
              <Text style={s.body}>For competitive play today, use Ranked: skill rating is shown separately from XP level.</Text>
              <View style={s.rowWrap}>
                <Button size="sm" label="Ranked on Home" icon="home" variant="secondary" onPress={() => router.push('/')} />
                <Button size="sm" label="Leaderboard" icon="bar-chart-2" variant="secondary" onPress={() => router.push('/leaderboard' as never)} />
              </View>
            </Panel>
          </View>
        </Shell>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function ModifierRow({ mode }: { mode: FeaturedMode }) {
  const o = mode.overrides;
  const items = [
    o.coinMultiplier != null && `${o.coinMultiplier}× coins`,
    o.xpMultiplier != null && `${o.xpMultiplier}× XP`,
    o.ballSpeedFactor != null && `${o.ballSpeedFactor}× ball speed`,
  ].filter(Boolean) as string[];
  return <View style={s.rowWrap}>{items.map(t => <View key={t} style={s.mod}><Text style={s.modText}>{t}</Text></View>)}</View>;
}

function Rule({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.rule}>
      <Text style={s.ruleK}>{k}</Text>
      <Text style={s.meta}>{v}</Text>
    </View>
  );
}

function Toggle({ on, icon, onLabel, offLabel, onPress, disabled }: {
  on: boolean; icon: React.ComponentProps<typeof Feather>['name']; onLabel: string; offLabel: string; onPress: () => void; disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled }}
      accessibilityLabel={offLabel}
      style={({ pressed }) => [s.toggle, on && { backgroundColor: palette.primary, borderColor: palette.edge }, pressed && { borderBottomWidth: 2, transform: [{ translateY: 2 }] }, disabled && { opacity: 0.5 }]}
    >
      <Feather name={on ? 'check' : icon} size={14} color={on ? palette.onAccent : palette.foreground} />
      <Text style={[s.toggleText, { color: on ? palette.onAccent : palette.foreground }]}>{on ? onLabel : offLabel}</Text>
    </Pressable>
  );
}

type QS = ReturnType<typeof getEventQualifierState>;

function LocalChallenge({ ev, hasRank, inParty, busy, playsLeft, qs, followed, reminded, onRemind, prefsReady, onFollow, onQualifier, onMainDraw }: {
  ev: EventDefinition; hasRank: boolean; inParty: boolean; busy: boolean; playsLeft: number; qs: QS | null;
  followed: boolean; reminded: boolean; onRemind: () => void; prefsReady: boolean; onFollow: () => void;
  onQualifier: (i: number, r: QualifierRoundDef) => void; onMainDraw: () => void;
}) {
  const [open, setOpen] = useState(false);
  const win = localChallengeWindow(ev.type, ev.endsIn);
  const kind = ev.type === 'weekly' ? 'Weekly challenge' : ev.type === 'monthly' ? 'Monthly cup' : 'Annual grand prix';

  let label = '';
  let action: (() => void) | undefined;
  let state = '';
  if (ev.isLocked) { label = `Opens ${ev.opensOnLabel}`; state = 'Not open yet'; }
  else if (qs?.isEliminated) { label = 'Eliminated this period'; state = `${qs.qp}/${qs.roundDef.threshold} QP, round ended`; }
  else if (!qs || qs.roundDef.isMainDraw) {
    const name = !qs ? 'Play challenge' : ev.rounds && ev.rounds.length > 2 ? 'Play grand final' : 'Play main draw';
    state = qs ? 'Qualified' : 'Direct entry';
    label = playsLeft === 0 ? 'No plays left' : name; if (playsLeft > 0) action = onMainDraw;
  } else {
    state = `${qs.roundDef.name} · ${qs.qp}/${qs.roundDef.threshold} QP`;
    label = qs.playsLeft === 0 ? 'No plays left' : `Play ${qs.roundDef.name}`;
    if (qs.playsLeft > 0) action = () => onQualifier(qs.roundIdx, qs.roundDef);
  }
  if (!ev.isLocked && !hasRank) { label = `Requires ${MIN_RANK_NAME}`; action = undefined; }
  if (action && inParty) { label = 'Leave party to play'; action = undefined; }

  const qpFrac = qs && !qs.roundDef.isMainDraw && qs.roundDef.threshold > 0 ? Math.min(1, qs.qp / qs.roundDef.threshold) : null;

  return (
    <Panel style={{ overflow: 'hidden' }}>
      <View style={[s.band, ev.isLocked && { backgroundColor: palette.raised }]}>
        <Text style={[s.bandText, { flex: 1 }]}>{kind} · vs bots</Text>
      </View>
      <View style={[s.pad, { gap: 10 }]}>
        <View style={s.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={s.h2}>{ev.name}</Text>
            <Text style={s.meta}>{MODE_NAME[ev.mode] ?? ev.mode} · {state}</Text>
          </View>
          <Text style={s.meta}>{ev.isLocked ? `in ${fmtSpan(Math.max(0, (win.opens?.getTime() ?? Date.now()) - Date.now()))}` : `${fmtSpan(Math.max(0, win.closes.getTime() - Date.now()))} left`}</Text>
        </View>
        {qpFrac != null && (
          <View style={s.track} accessibilityLabel={`Qualifier points ${qs!.qp} of ${qs!.roundDef.threshold}`}>
            <View style={[s.fill, { width: `${qpFrac * 100}%` as never }]} />
          </View>
        )}
        <View style={s.rowWrap}>
          <Button size="sm" label={busy ? 'Starting' : label} loading={busy} disabled={!action} onPress={action} style={{ flexGrow: 1 }} />
          <Button size="sm" variant="ghost" label={open ? 'Hide details' : 'Details'} icon={open ? 'chevron-up' : 'chevron-down'} onPress={() => setOpen(o => !o)} />
          <Toggle on={followed} icon="star" onLabel="Following" offLabel="Follow" disabled={!prefsReady} onPress={onFollow} />
          <Toggle on={reminded} icon="bell" onLabel="In-app reminder on" offLabel="In-app reminder" disabled={!prefsReady} onPress={onRemind} />
        </View>
      </View>
      {open && (
        <View style={s.detail}>
          <Detail h="Rules">
            {ev.description} Mode: {MODE_NAME[ev.mode] ?? ev.mode}. Opponents are local bots.
            {ev.rounds ? ` ${ev.rounds.length} stages: ${ev.rounds.map(r => r.name).join(', ')}.` : ` Up to ${ev.maxPlays} plays this period.`}
          </Detail>
          {qs && !qs.roundDef.isMainDraw && (
            <Detail h={`QP this round (need ${qs.roundDef.threshold})`}>
              {qs.roundDef.qpPerPlace.map((q, i) => `${PLACES[i]} +${q}`).join(' · ')}. Plays left: {qs.playsLeft}/{qs.roundDef.maxPlays}.
            </Detail>
          )}
          <Detail h="Eligibility">
            {MIN_RANK_NAME} or higher. Solo only; not available while in a party.
          </Detail>
          <Detail h="Rewards">
            Win: +{ev.winRewards.xp} XP, +{ev.winRewards.coins} coins, +{ev.creditsOnWin} credits. Loss: +{ev.loseRewards.xp} XP, +{ev.loseRewards.coins} coins, +{ev.creditsOnLose} credits. Main draw plays left: {playsLeft}/{ev.maxPlays}.
          </Detail>
          <Detail h="Times (device local)">
            {win.opens ? `Opens ${fmtLocal(win.opens)}. ` : 'Open now. '}Closes and resets {fmtLocal(win.closes)}.
          </Detail>
        </View>
      )}
    </Panel>
  );
}

function Detail({ h, children }: { h: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 2 }}>
      <Text style={s.kicker}>{h}</Text>
      <Text style={s.body}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 18, paddingBottom: 10, gap: 4 },
  sub: { fontFamily: fonts.body, fontSize: textScale.caption, color: palette.supporting },
  pad: { padding: 14 },
  partyBar: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  featured: { borderRadius: 10, borderWidth: 3, borderBottomWidth: 6, borderColor: palette.edge, overflow: 'hidden' },
  band: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: palette.inset },
  bandText: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: palette.foreground },
  hero: { fontFamily: fonts.display, fontSize: 34, color: palette.foreground, textTransform: 'uppercase', letterSpacing: -0.5 },
  h2: { fontFamily: fonts.display, fontSize: 24, color: palette.foreground, textTransform: 'uppercase' },
  h3: { fontFamily: fonts.display, fontSize: 19, color: palette.foreground, textTransform: 'uppercase', letterSpacing: 0.5 },
  kicker: { fontFamily: fonts.bodyBold, fontSize: textScale.caption, color: palette.supporting, textTransform: 'uppercase', letterSpacing: 1 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: palette.foreground },
  meta: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: palette.supporting },
  fine: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: palette.supporting },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  mod: { borderRadius: 10, borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.gold, paddingHorizontal: 8, paddingVertical: 3 },
  modText: { fontFamily: fonts.bodyBold, fontSize: 13, color: palette.onAccent },
  ruleGrid: { flexDirection: 'row', borderRadius: 10, borderWidth: 2, borderColor: palette.edge },
  rule: { flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: palette.border, backgroundColor: palette.background },
  ruleK: { fontFamily: fonts.display, fontSize: 26, color: palette.foreground, fontVariant: ['tabular-nums'] },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, backgroundColor: palette.background },
  toggleText: { fontFamily: fonts.bodyBold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.6 },
  toast: { position: 'absolute', zIndex: 10, left: 18, right: 18, bottom: 110, flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, backgroundColor: palette.gold, borderRadius: 10, borderWidth: 2, borderColor: palette.edge },
  toastText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, color: palette.onAccent },
  track: { height: 16, padding: 2, backgroundColor: palette.background, borderRadius: 10, borderWidth: 2, borderColor: palette.edge },
  fill: { height: '100%', backgroundColor: palette.gold },
  detail: { borderTopWidth: 2, borderTopColor: palette.border, backgroundColor: palette.background, padding: 14, gap: 10 },
});
