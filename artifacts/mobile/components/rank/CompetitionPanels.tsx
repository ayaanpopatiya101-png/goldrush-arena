// Stamped brass-and-navy plates for the personal competitive season.
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette } from '@/constants/colors';
import { fonts, textScale } from '@/constants/typography';
import {
  PARTICIPATION_GOAL, PLACEMENT_GAMES, SEASON_START_RATING,
  daysLeft, formatUtcEnd, seasonBadges, seasonLabel, type CompetitiveSeasonData,
} from '@/hooks/useCompetition';

function signed(n: number) { return n > 0 ? `+${n}` : String(n); }

/** Navy scoreboard plate showing the live season rating. */
export function SeasonScoreboard({ s }: { s: CompetitiveSeasonData }) {
  const left = daysLeft(s.endsAt);
  const losses = Math.max(0, s.games - s.wins);
  return (
    <View style={c.board} accessibilityLabel={`Season ${seasonLabel(s.season)}, ${s.placed ? `rating ${s.rating}, ${s.division}` : 'placement in progress'}`}>
      <View style={c.boardTop}>
        <Text style={c.boardKicker}>LIVE SEASON · {seasonLabel(s.season).toUpperCase()}</Text>
        <View style={c.endTag}><Text style={c.endTagText}>{left === null ? 'END UNKNOWN' : left === 0 ? 'ENDS TODAY' : `${left}D LEFT`}</Text></View>
      </View>
      <View style={c.boardMain}>
        <View style={{ flex: 1 }}>
          <Text style={c.rating}>{s.placed ? s.rating : '----'}</Text>
          <Text style={c.ratingLabel}>{s.placed ? 'SEASON RATING' : 'RATING HIDDEN UNTIL PLACED'}</Text>
        </View>
        <View style={c.divisionPlate}>
          <Text style={c.divisionKicker}>DIVISION</Text>
          <Text style={c.division} numberOfLines={2}>{s.placed ? s.division : 'Unplaced'}</Text>
        </View>
      </View>
      <View style={c.boardStats}>
        {[
          { l: 'GAMES', v: String(s.games) },
          { l: 'W-L', v: `${s.wins}-${losses}` },
          { l: 'PEAK', v: s.placed ? String(s.peak) : '--' },
          { l: 'LAST', v: s.games > 0 ? signed(s.lastDelta) : '--' },
        ].map((x, i) => (
          <View key={x.l} style={[c.boardStat, i > 0 && c.boardStatRule]}>
            <Text style={[c.boardStatV, x.l === 'LAST' && s.lastDelta > 0 && s.games > 0 && { color: palette.gold }, x.l === 'LAST' && s.lastDelta < 0 && { color: palette.primary }]}>{x.v}</Text>
            <Text style={c.boardStatL}>{x.l}</Text>
          </View>
        ))}
      </View>
      <Text style={c.endsLine}>Season closes {formatUtcEnd(s.endsAt)}</Text>
    </View>
  );
}

/** Five stamped placement slots. Filled slots mark completed ranked games. */
export function PlacementTrack({ games, placed }: { games: number; placed: boolean }) {
  const done = Math.min(games, PLACEMENT_GAMES);
  return (
    <View style={c.panel}>
      <View style={c.rowBetween}>
        <Text style={c.panelTitle}>PLACEMENT</Text>
        <Text style={c.panelMeta}>{placed ? 'COMPLETE' : `${done} / ${PLACEMENT_GAMES}`}</Text>
      </View>
      <View style={c.slots}>
        {Array.from({ length: PLACEMENT_GAMES }).map((_, i) => (
          <View key={i} style={[c.slot, i < done && c.slotDone]}>
            <Text style={[c.slotText, i < done && { color: palette.foreground }]}>{i + 1}</Text>
          </View>
        ))}
      </View>
      <Text style={c.body}>
        {placed
          ? 'Placed. Your division is shown above and updates after every ranked human match.'
          : `Play ${PLACEMENT_GAMES - done} more ranked match${PLACEMENT_GAMES - done === 1 ? '' : 'es'} against real players to reveal your rating and division. Placement games move your score faster.`}
      </Text>
    </View>
  );
}

function Badge({ title, earned, detail, icon }: { title: string; earned: boolean; detail: string; icon: React.ComponentProps<typeof Feather>['name'] }) {
  return (
    <View style={[c.badge, earned && c.badgeEarned]} accessibilityLabel={`${title}, ${earned ? 'earned' : 'not earned yet'}. ${detail}`}>
      <View style={[c.badgeIcon, earned && { backgroundColor: palette.deepest }]}>
        <Feather name={icon} size={18} color={earned ? palette.gold : palette.slate} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={c.badgeTitle}>{title}</Text>
        <Text style={c.badgeDetail}>{detail}</Text>
      </View>
      <Text style={[c.badgeState, earned && { color: palette.foreground }]}>{earned ? 'EARNED' : 'OPEN'}</Text>
    </View>
  );
}

/** Season goals derived only from the server record. No reward claims. */
export function SeasonBadges({ s }: { s: CompetitiveSeasonData }) {
  const b = seasonBadges(s);
  return (
    <View style={{ gap: 8 }}>
      <Badge icon="flag" title="Season Regular" earned={b.participation}
        detail={b.participation ? `${s.games} ranked games this season.` : `${s.games} of ${PARTICIPATION_GOAL} ranked games played.`} />
      <Badge icon="trending-up" title="Climber" earned={b.improvement}
        detail={b.improvement ? `Peak ${s.peak}, above the ${SEASON_START_RATING} start.` : `Reach a peak above ${SEASON_START_RATING}.`} />
      <Text style={c.fine}>Badges are a record of this season. They do not grant coins or items.</Text>
    </View>
  );
}

export function HistoryRow({ s }: { s: CompetitiveSeasonData }) {
  const b = seasonBadges(s);
  return (
    <View style={c.histRow}>
      <View style={c.histSeason}>
        <Text style={c.histMonth}>{seasonLabel(s.season).split(' ')[0].slice(0, 3).toUpperCase()}</Text>
        <Text style={c.histYear}>{s.season.slice(0, 4)}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={c.histDivision}>{s.placed ? s.division : 'Not placed'}</Text>
        <Text style={c.histMeta}>{s.games} games · {s.wins} wins{s.placed ? ` · peak ${s.peak}` : ''}</Text>
        {(b.participation || b.improvement) ? (
          <Text style={c.histBadges}>{[b.participation && 'SEASON REGULAR', b.improvement && 'CLIMBER'].filter(Boolean).join('  /  ')}</Text>
        ) : null}
      </View>
      <Text style={c.histRating}>{s.placed ? s.rating : '--'}</Text>
    </View>
  );
}

export function NumberedNote({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <View style={c.note}>
      <Text style={c.noteN}>{String(n).padStart(2, '0')}</Text>
      <Text style={[c.body, { flex: 1 }]}>{children}</Text>
    </View>
  );
}

const c = StyleSheet.create({
  board: { backgroundColor: palette.inset, borderWidth: 3, borderColor: palette.edge, padding: 16, gap: 14 },
  boardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  boardKicker: { fontFamily: fonts.bodyBold, fontSize: textScale.caption, letterSpacing: 1.4, color: palette.foreground, flex: 1 },
  endTag: { backgroundColor: palette.gold, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 2, borderColor: palette.edge },
  endTagText: { fontFamily: fonts.bodyBold, fontSize: textScale.caption, color: palette.onAccent, letterSpacing: 1 },
  boardMain: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  rating: { fontFamily: fonts.display, fontSize: 72, lineHeight: 74, color: palette.foreground, fontVariant: ['tabular-nums'], letterSpacing: -1 },
  ratingLabel: { fontFamily: fonts.bodySemiBold, fontSize: textScale.caption, color: palette.foreground, letterSpacing: 1, opacity: 0.8 },
  divisionPlate: { backgroundColor: palette.primary, borderWidth: 2, borderColor: palette.edge, paddingHorizontal: 12, paddingVertical: 8, minWidth: 110, maxWidth: 150, transform: [{ rotate: '-2deg' }] },
  divisionKicker: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, color: palette.foreground },
  division: { fontFamily: fonts.display, fontSize: 24, color: palette.foreground, textTransform: 'uppercase' },
  boardStats: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.border },
  boardStat: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  boardStatRule: { borderLeftWidth: 1, borderLeftColor: palette.border },
  boardStatV: { fontFamily: fonts.display, fontSize: 24, color: palette.foreground, fontVariant: ['tabular-nums'] },
  boardStatL: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, color: palette.foreground, opacity: 0.8 },
  endsLine: { fontFamily: fonts.body, fontSize: 14, color: palette.foreground },
  panel: { backgroundColor: palette.surface, borderWidth: 2, borderColor: palette.edge, padding: 14, gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, color: palette.foreground },
  panelMeta: { fontFamily: fonts.bodyBold, fontSize: textScale.caption, letterSpacing: 1.2, color: palette.supporting },
  slots: { flexDirection: 'row', gap: 6 },
  slot: { flex: 1, height: 44, borderWidth: 2, borderColor: palette.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: palette.background },
  slotDone: { backgroundColor: palette.gold, borderColor: palette.edge, borderStyle: 'solid' },
  slotText: { fontFamily: fonts.display, fontSize: 20, color: palette.supporting },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: palette.foreground },
  fine: { fontFamily: fonts.body, fontSize: 13, color: palette.supporting },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.background },
  badgeEarned: { backgroundColor: palette.gold, borderColor: palette.edge },
  badgeIcon: { width: 40, height: 40, borderWidth: 2, borderColor: palette.edge, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] },
  badgeTitle: { fontFamily: fonts.display, fontSize: 19, color: palette.foreground, textTransform: 'uppercase' },
  badgeDetail: { fontFamily: fonts.body, fontSize: 14, color: palette.foreground },
  badgeState: { fontFamily: fonts.bodyBold, fontSize: textScale.caption, letterSpacing: 1.2, color: palette.supporting },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.border },
  histSeason: { width: 54, paddingVertical: 4, backgroundColor: palette.inset, alignItems: 'center' },
  histMonth: { fontFamily: fonts.display, fontSize: 18, color: palette.foreground },
  histYear: { fontFamily: fonts.bodySemiBold, fontSize: 11, color: palette.foreground },
  histDivision: { fontFamily: fonts.display, fontSize: 18, color: palette.foreground, textTransform: 'uppercase' },
  histMeta: { fontFamily: fonts.body, fontSize: 14, color: palette.supporting },
  histBadges: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, color: palette.primary },
  histRating: { fontFamily: fonts.display, fontSize: 28, color: palette.foreground, fontVariant: ['tabular-nums'] },
  note: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  noteN: { fontFamily: fonts.display, fontSize: 18, color: palette.primary, width: 24 },
});
