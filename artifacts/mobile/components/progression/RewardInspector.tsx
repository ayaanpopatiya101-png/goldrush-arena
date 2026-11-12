// Inspect any reward, including locked and claimed ones. Only shows a claim
// control when the caller says the reward is claimable and passes onClaim.
import React from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { palette } from '@/constants/colors';
import { RewardArt, StateChip, type RewardState, type RewardView } from './rewards';
import { useBlockingOverlay } from '@/context/OverlayQueue';

export type InspectTarget = {
  key: string;
  view: RewardView;
  state: RewardState;
  owned?: boolean;
  context: string;       // e.g. "Tier 25, Plus track"
  requirement: string;   // honest requirement / status sentence
};

export function RewardInspector({ target, busy, error, onClaim, onClose, secondary }: {
  target: InspectTarget | null;
  busy: boolean;
  error: string;
  onClaim?: () => void;
  onClose: () => void;
  secondary?: { label: string; onPress: () => void };
}) {
  const visible = useBlockingOverlay(!!target);
  const canClaim = !!target && target.state === 'claimable' && !!onClaim;
  // Unmount closed dialogs rather than retaining a fading scrim while waiting
  // for a browser animation-end event (which reduced-motion styles can suppress).
  if (!visible || !target) return null;
  return (
    <Modal visible transparent animationType={Platform.OS === 'web' ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={st.scrim}>
        <View style={st.sheet} accessibilityViewIsModal>
          {target && (
            <ScrollView contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
              <View style={st.topRow}>
                <Text style={st.context}>{target.context.toUpperCase()}</Text>
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close reward details" aria-label="Close reward details" hitSlop={6} style={st.close}>
                  <MaterialCommunityIcons name="close" size={22} color={palette.foreground} />
                </Pressable>
              </View>
              <View style={st.artWell}>
                <RewardArt view={target.view} size={target.view.skinId ? 168 : 120} dim={target.state === 'locked' || target.state === 'needsPlus'} />
              </View>
              <View style={{ gap: 6 }}>
                <Text style={st.kind}>{target.view.kindLabel.toUpperCase()}</Text>
                <Text style={st.title} accessibilityRole="header">{target.view.title}</Text>
                <StateChip state={target.state} owned={target.owned} />
              </View>
              <Text style={st.body}>{target.view.detail}</Text>
              <View style={st.req}>
                <MaterialCommunityIcons name={target.state === 'claimed' ? 'check' : target.state === 'claimable' ? 'gift-open-outline' : 'lock-outline'} size={16} color={palette.supporting} />
                <Text style={[st.body, { flex: 1 }]}>{target.requirement}</Text>
              </View>
              {target.owned && target.state !== 'claimed' && (
                <Text style={st.body}>You already own this skin. Claiming records the reward; it does not add a duplicate.</Text>
              )}
              {error ? <Text accessibilityRole="alert" style={st.error}>{error}</Text> : null}
              {canClaim && (
                <Pressable
                  onPress={onClaim}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Claim ${target.view.title}`}
                  aria-label={`Claim ${target.view.title}`}
                  accessibilityState={{ disabled: busy, busy }}
                  style={({ pressed }) => [st.primary, { opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}
                >
                  <Text style={st.primaryTxt}>{busy ? 'CLAIMING' : 'CLAIM REWARD'}</Text>
                </Pressable>
              )}
              {secondary && (
                <Pressable onPress={secondary.onPress} accessibilityRole="button" aria-label={secondary.label} style={st.secondary}>
                  <Text style={st.secondaryTxt}>{secondary.label}</Text>
                </Pressable>
              )}
              <Pressable onPress={onClose} accessibilityRole="button" aria-label="Done" style={st.secondary}>
                <Text style={st.secondaryTxt}>DONE</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(9,13,10,0.86)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: palette.surface, borderTopWidth: 4, borderColor: palette.gold, padding: 18, paddingBottom: 30, width: '100%', maxWidth: 560, alignSelf: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  context: { flex: 1, fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.5, color: palette.supporting },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.inset },
  artWell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 18, backgroundColor: palette.inset, borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.edge },
  kind: { fontFamily: 'SourceSans3_700Bold', fontSize: 12, letterSpacing: 1.5, color: palette.gold },
  title: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 30, lineHeight: 32, color: palette.foreground, textTransform: 'uppercase' },
  body: { fontFamily: 'SourceSans3_400Regular', fontSize: 15, lineHeight: 21, color: palette.supporting },
  req: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 10, borderRadius: 10, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.background },
  error: { fontFamily: 'SourceSans3_700Bold', fontSize: 14, color: palette.danger },
  primary: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primary, borderRadius: 10, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.edge },
  primaryTxt: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 20, letterSpacing: 1, color: palette.onAccent },
  secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 2, borderColor: palette.border, backgroundColor: palette.raised, paddingHorizontal: 12 },
  secondaryTxt: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 18, letterSpacing: 1, color: palette.foreground, textAlign: 'center' },
});
