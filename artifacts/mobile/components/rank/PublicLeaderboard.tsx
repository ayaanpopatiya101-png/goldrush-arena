// Global public ladder (VALORANT-style board) in GoldRush raised slate: green actions, gold reward marks.
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip, Panel, SectionLabel } from '@/components/ui/Primitives';
import { palette } from '@/constants/colors';
import { fonts, textScale } from '@/constants/typography';
import { LEADERBOARD_DIVISIONS, NICKNAME_RE, useArenaLeaderboard, useSaveLeaderboardProfile } from '@/hooks/useArenaLeaderboard';
import { formatUtcEnd, seasonLabel } from '@/hooks/useCompetition';
import type { ArenaLeaderboard, GetArenaLeaderboardDivision, LeaderboardEntry } from '@workspace/api-client-react';

type Division = (typeof LEADERBOARD_DIVISIONS)[number];

function SelectPill({ label, selected, onPress, disabled }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: !!disabled }}
      aria-selected={selected}
      aria-pressed={selected}
      aria-disabled={!!disabled}
      style={({ pressed }) => [s.pill, selected && s.pillOn, pressed && !selected && { backgroundColor: palette.raised }, disabled && { opacity: 0.5 }]}
    >
      <Text style={[s.pillText, selected && { color: palette.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

function Row({ e }: { e: LeaderboardEntry }) {
  const podium = e.position <= 3;
  const wr = e.games ? Math.round((e.wins / e.games) * 1000) / 10 : 0;
  return (
    <View
      style={[s.row, e.isYou && s.rowYou]}
      accessible
      accessibilityLabel={`Position ${e.position}, ${e.name}${e.isYou ? ', you' : ''}, rating ${e.rating}, ${e.division}, ${e.wins} wins in ${e.games} games`}
    >
      <View style={[s.pos, podium && s.posGold]}>
        <Text style={[s.posText, podium && { color: palette.onAccent }]}>{e.position}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={s.name} numberOfLines={1}>{e.name}</Text>
          {e.isYou ? <Chip label="You" tone="moss" /> : null}
        </View>
        <Text style={s.meta} numberOfLines={1}>{e.division} · {e.wins}W / {e.games} · {wr}% · peak {e.peak}</Text>
      </View>
      <Text style={[s.rating, podium && { color: palette.gold }]}>{e.rating}</Text>
    </View>
  );
}

const WHY: Record<ArenaLeaderboard['eligibility'], string> = {
  eligible: 'You are on the ladder.',
  placements: 'Finish 5 verified four-human ranked games this season to appear.',
  inactive: 'Play one verified four-human ranked game in the last 7 days to return to the current ladder.',
  no_games: 'No verified four-human ranked games this season yet.',
};

function ProfileForm({ username, profile }: { username: string; profile: ArenaLeaderboard['profile'] }) {
  const save = useSaveLeaderboardProfile(username);
  const [anon, setAnon] = useState(profile.anonymous);
  const [nick, setNick] = useState(profile.nickname);
  const dirty = useRef(false);
  const initFor = useRef<string | null>(null);
  // Init once per user; polling never overwrites unsaved edits.
  useEffect(() => {
    if (initFor.current !== username || !dirty.current) {
      initFor.current = username;
      setAnon(profile.anonymous);
      setNick(profile.nickname);
    }
  }, [username, profile.anonymous, profile.nickname]);
  const trimmed = nick.trim();
  const valid = anon || NICKNAME_RE.test(trimmed);
  const changed = anon !== profile.anonymous || (!anon && trimmed !== profile.nickname);
  const edit = (fn: () => void) => { dirty.current = true; save.reset(); fn(); };

  return (
    <Panel style={s.pad}>
      <Text style={s.h}>Your public name</Text>
      <Text style={s.muted}>Anonymous shows a Player-XXXXXXXX tag. Your local username is never published automatically. No photos or IDs are shown.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
        <SelectPill label="Anonymous" selected={anon} disabled={save.isPending} onPress={() => edit(() => setAnon(true))} />
        <SelectPill label="Nickname" selected={!anon} disabled={save.isPending} onPress={() => edit(() => setAnon(false))} />
      </View>
      {!anon ? (
        <View style={{ gap: 4 }}>
          <TextInput
            value={nick}
            onChangeText={t => edit(() => setNick(t))}
            maxLength={24}
            editable={!save.isPending}
            aria-disabled={save.isPending}
            placeholder="2 to 24 letters, numbers, space . - _"
            placeholderTextColor={palette.muted}
            accessibilityLabel="Public nickname"
            autoCapitalize="none"
            autoCorrect={false}
            style={s.input}
          />
          {!valid && trimmed.length > 0 ? <Text style={s.err}>Use 2 to 24 letters (any language), numbers, spaces, dots, hyphens or underscores.</Text> : null}
        </View>
      ) : null}
      {save.isError ? <Text style={s.err} accessibilityLiveRegion="polite">Not saved: {save.error.message}</Text> : null}
      {save.isSuccess && !changed ? <Text style={[s.muted, { color: palette.primary }]}>Saved. The ladder is refreshing.</Text> : null}
      <Button
        label="Save"
        icon="check"
        size="sm"
        disabled={!changed || !valid}
        loading={save.isPending}
        onPress={() => save.mutate({ data: { anonymous: anon, nickname: anon ? profile.nickname : trimmed } }, { onSuccess: () => { dirty.current = false; } })}
        testID="leaderboard-profile-save"
      />
    </Panel>
  );
}

export function PublicLeaderboard({ username, onShowFormula }: { username: string; onShowFormula?: () => void }) {
  const [season, setSeason] = useState<string | undefined>(undefined);
  const [division, setDivision] = useState<Division>('All');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [seasons, setSeasons] = useState<string[]>([]);

  // Reset filters when the local player changes, so no prior user state lingers.
  useEffect(() => { setSeason(undefined); setDivision('All'); setDraft(''); setSearch(''); setPage(1); setSeasons([]); }, [username]);

  const q = useArenaLeaderboard(username, {
    season,
    division: division as GetArenaLeaderboardDivision,
    search: search || undefined,
    page,
  });
  const d = q.data;
  useEffect(() => {
    if (d && d.page === page && page > Math.max(1, d.pages)) setPage(Math.max(1, d.pages));
  }, [d, page]);
  const seasonsKey = d?.seasons.join(',') ?? '';
  useEffect(() => { if (seasonsKey) setSeasons(seasonsKey.split(',')); }, [seasonsKey]);
  const active = season ?? d?.season;
  const isCurrent = !d || !d.seasons.length || d.season === [...d.seasons].sort().at(-1);

  const submit = () => { setSearch(draft.trim().slice(0, 24)); setPage(1); };

  return (
    <View style={{ gap: 12 }}>
      <SectionLabel
        title="Global ladder · Top 500"
        right={
          <Pressable onPress={() => void q.refetch()} disabled={q.isFetching} accessibilityRole="button" accessibilityLabel="Refresh leaderboard" accessibilityState={{ disabled: q.isFetching, busy: q.isFetching }} aria-disabled={q.isFetching} aria-busy={q.isFetching} style={s.refresh}>
            {q.isFetching ? <ActivityIndicator size="small" color={palette.supporting} /> : <Feather name="rotate-cw" size={16} color={palette.foreground} />}
          </Pressable>
        }
      />

      {/* Your standing: independent of filters */}
      <View style={s.hero}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.kicker}>YOUR POSITION · {active ? seasonLabel(active).toUpperCase() : 'SEASON'}</Text>
          {d ? (
            <>
              <Text style={s.big}>{d.yourPosition != null ? `#${d.yourPosition}` : 'Unranked'}</Text>
              <Text style={s.muted}>
                {d.yourPosition != null ? `of ${d.eligiblePlayers.toLocaleString()} eligible players, whole ladder` : WHY[d.eligibility]}
              </Text>
            </>
          ) : <Text style={s.big}>--</Text>}
        </View>
        {d ? <View style={{ maxWidth: '45%', flexShrink: 1 }}><Chip label={d.profile.anonymous ? 'Anonymous' : d.profile.nickname} tone={d.profile.anonymous ? 'neutral' : 'ochre'} style={{ maxWidth: '100%' }} /></View> : null}
      </View>

      {seasons.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityLabel="Season">
          {seasons.map(se => (
            <SelectPill key={se} label={seasonLabel(se)} selected={se === active} onPress={() => { setSeason(se); setPage(1); }} />
          ))}
        </ScrollView>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityLabel="Division">
        {LEADERBOARD_DIVISIONS.map(dv => <SelectPill key={dv} label={dv} selected={dv === division} onPress={() => { setDivision(dv); setPage(1); }} />)}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          maxLength={24}
          returnKeyType="search"
          placeholder="Search a public name"
          placeholderTextColor={palette.muted}
          accessibilityLabel="Search leaderboard by name"
          autoCapitalize="none"
          autoCorrect={false}
          style={[s.input, { flex: 1 }]}
        />
        <Button label="Search" icon="search" size="sm" onPress={submit} />
      </View>
      {search ? (
        <Pressable onPress={() => { setDraft(''); setSearch(''); setPage(1); }} accessibilityRole="button" accessibilityLabel={`Clear search ${search}`}>
          <Text style={[s.meta, { color: palette.primary }]}>Showing "{search}". Clear search</Text>
        </Pressable>
      ) : null}

      {q.isLoading || (!d && q.isFetching) ? (
        <View style={s.board} accessibilityLabel="Loading leaderboard">
          {[0, 1, 2, 3, 4].map(i => <View key={i} style={[s.row, { opacity: 0.5 - i * 0.07 }]}><View style={s.pos} /><View style={s.skel} /></View>)}
        </View>
      ) : q.isError && !d ? (
        <Panel style={[s.pad, { borderColor: palette.danger }]}>
          <Text style={s.h}>Ladder unavailable</Text>
          <Text style={s.muted}>The arena server did not return the leaderboard. {q.error.message}</Text>
          <Button label="Retry" icon="rotate-cw" onPress={() => void q.refetch()} />
        </Panel>
      ) : d ? (
        <>
          <View style={s.board}>
            {d.entries.length === 0 ? (
              <View style={{ padding: 18, gap: 6 }}>
                <Text style={s.h}>No players here</Text>
                <Text style={s.muted}>
                  {search || division !== 'All' ? 'No eligible players match these filters. Try another division or clear the search.' : 'Nobody has qualified for this season yet. Play 5 verified four-human ranked games to be first.'}
                </Text>
              </View>
            ) : d.entries.map((e, i) => <Row key={`${d.page}-${i}-${e.position}-${e.name}`} e={e} />)}
          </View>
          {q.isError ? <Text style={s.err}>Last refresh failed. Showing earlier results.</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Button label="Prev" icon="chevron-left" size="sm" variant="secondary" disabled={page <= 1 || q.isFetching} onPress={() => setPage(p => Math.max(1, p - 1))} />
            <Text style={[s.meta, { flex: 1, textAlign: 'center' }]}>Page {d.page} of {Math.max(1, d.pages)} · {d.total} shown</Text>
            <Button label="Next" icon="chevron-right" size="sm" variant="secondary" disabled={page >= d.pages || q.isFetching} onPress={() => setPage(p => Math.min(20, p + 1))} />
          </View>
          <Text style={s.fine}>Updated {formatUtcEnd(d.updatedAt)}{isCurrent ? ` · season ends ${formatUtcEnd(d.endsAt)}` : ' · season ended'}. Global scope only.</Text>
          <ProfileForm username={username} profile={d.profile} />
        </>
      ) : null}

      <Panel style={s.pad}>
        <Text style={s.h}>Ladder rules</Text>
        <Text style={s.muted}>Top 500 is capped at 500 rows. Complete 5 verified ranked games against three other humans to qualify. Stay active with one such game every 7 days; inactivity hides your position, not your saved rating. Past seasons do not require recent activity. Order is rating, then wins, then fewer games. Players tied on all three share a position; the next position is skipped. Rankings are global until regional matchmaking exists.</Text>
        {onShowFormula ? (
          <Pressable onPress={onShowFormula} accessibilityRole="link" accessibilityLabel="See how rating works">
            <Text style={[s.meta, { color: palette.primary, fontFamily: fonts.bodyBold }]}>See how rating works</Text>
          </Pressable>
        ) : null}
      </Panel>
    </View>
  );
}

const s = StyleSheet.create({
  pad: { padding: 14, gap: 10 },
  h: { fontFamily: fonts.display, fontSize: 20, color: palette.foreground, textTransform: 'uppercase' },
  muted: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: palette.supporting },
  meta: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: palette.supporting },
  err: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: palette.danger },
  fine: { fontFamily: fonts.body, fontSize: 12, color: palette.muted },
  kicker: { fontFamily: fonts.bodyBold, fontSize: textScale.caption, letterSpacing: 1.2, color: palette.gold },
  big: { fontFamily: fonts.display, fontSize: 40, color: palette.foreground, fontVariant: ['tabular-nums'] },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 18, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.gold, borderBottomColor: palette.goldEdge, backgroundColor: palette.inset },
  refresh: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, borderBottomColor: palette.edge, backgroundColor: palette.raised },
  pill: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, borderWidth: 2, borderBottomWidth: 4, borderColor: palette.border, borderBottomColor: palette.edge, backgroundColor: palette.surface },
  pillOn: { backgroundColor: palette.primary, borderColor: palette.primary, borderBottomColor: palette.primaryEdge },
  pillText: { fontFamily: fonts.bodyBold, fontSize: textScale.control, color: palette.foreground, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { minHeight: 44, borderRadius: 12, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.inset, paddingHorizontal: 12, color: palette.foreground, fontFamily: fonts.body, fontSize: textScale.body },
  board: { borderRadius: 18, borderWidth: 1.5, borderBottomWidth: 4, borderColor: palette.border, borderBottomColor: palette.edge, backgroundColor: palette.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  rowYou: { backgroundColor: palette.raised, borderLeftWidth: 4, borderLeftColor: palette.primary },
  pos: { minWidth: 38, height: 32, paddingHorizontal: 6, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.inset, borderWidth: 1.5, borderColor: palette.border },
  posGold: { backgroundColor: palette.gold, borderColor: palette.goldEdge },
  posText: { fontFamily: fonts.display, fontSize: 16, color: palette.foreground, fontVariant: ['tabular-nums'] },
  name: { fontFamily: fonts.bodyBold, fontSize: 16, color: palette.foreground, flexShrink: 1 },
  rating: { fontFamily: fonts.display, fontSize: 22, color: palette.foreground, fontVariant: ['tabular-nums'] },
  skel: { flex: 1, height: 14, borderRadius: 7, backgroundColor: palette.raised },
});
