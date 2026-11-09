// AI revision bench: one real prompt, server-validated proposal, preview before apply.
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import type { DesignAssistResult, PaddleDesign } from '@workspace/api-client-react';

import { palette } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { MOTIF_LABEL, PaddleArt, sanitizeArtwork, TEXTURE_LABEL } from '@/components/cosmetics/PaddleArt';
import { Notice, PlateButton, SectionLabel } from '@/components/cosmetics/StudioControls';
import { cosmeticErrorMessage } from '@/hooks/useCosmetics';

const HEX = /^#[0-9a-fA-F]{6}$/;
function validProposal(d: PaddleDesign | undefined): d is PaddleDesign {
  if (!d) return false;
  const a = sanitizeArtwork(d);
  return a.motif === d.motif && a.texture === d.texture && a.density === d.density
    && HEX.test(d.base) && HEX.test(d.ink) && HEX.test(d.accent) && typeof d.name === 'string';
}

export function AssistPanel({ draft, assist, onApply, onClose }: {
  draft: PaddleDesign;
  assist: (prompt: string, current: PaddleDesign) => Promise<DesignAssistResult>;
  onApply: (d: PaddleDesign) => void;
  onClose?: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<DesignAssistResult | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const trimmed = prompt.trim();
  const tooShort = trimmed.length < 3;
  const outOfUses = remaining === 0;

  const run = async () => {
    if (tooShort || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await assist(trimmed, draft);
      setRemaining(res.remaining);
      if (!validProposal(res.design)) throw new Error('The suggestion came back in an unsupported format. Nothing was changed.');
      setProposal(res);
    } catch (e) {
      setError(cosmeticErrorMessage(e, 'Design help is unavailable right now.'));
    } finally { setBusy(false); }
  };

  const apply = () => {
    if (!proposal) return;
    const a = sanitizeArtwork(proposal.design);
    // Keep the draft's own id; the server proposal only revises the artwork and name.
    onApply({ ...draft, ...a, name: (proposal.design.name || draft.name).slice(0, 32) });
    setProposal(null);
  };

  return (
    <View style={s.root} testID="assist-panel">
      <View style={s.head}>
        <SectionLabel aside={remaining === null ? '10 per day' : `${remaining} left today`}>Design help</SectionLabel>
        {onClose ? <PlateButton label="Close" onPress={onClose} testID="assist-close" /> : null}
      </View>
      <Text style={s.copy}>Describe a change. The helper revises your current draft using only the studio's motifs, colours, density and texture. You review it before anything changes.</Text>

      <TextInput testID="assist-prompt" value={prompt} onChangeText={setPrompt} multiline maxLength={600}
        placeholder="Darker base, gold accent, tighter chevrons" placeholderTextColor={palette.supporting}
        accessibilityLabel="Describe the change you want" editable={!busy} style={s.input} />
      <Text style={s.count}>{trimmed.length}/600{tooShort && trimmed.length > 0 ? '  At least 3 characters' : ''}</Text>

      <PlateButton tone="gold" label={error ? 'Retry' : 'Revise draft'} onPress={run} busy={busy}
        disabled={tooShort || outOfUses} testID="assist-run" />
      {busy ? (
        <View style={s.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={palette.foreground} />
          <Text style={s.copy}>Revising your draft. This can take up to 90 seconds.</Text>
        </View>
      ) : null}
      {outOfUses ? <Notice tone="info" text="Daily design help is used up. Manual editing is still fully available." /> : null}
      {error ? <Notice tone="error" text={error} action="Retry" onAction={run} /> : null}

      {proposal ? (
        <View style={s.proposal} accessibilityLiveRegion="polite">
          <Text style={s.propTitle}>Proposed revision</Text>
          <View style={s.compare}>
            <View style={s.side}><Text style={s.tag}>Now</Text><PaddleArt design={draft} width={120} height={28} /></View>
            <View style={s.side}><Text style={s.tag}>Proposed</Text><PaddleArt design={proposal.design} width={120} height={28} /></View>
          </View>
          <Text style={s.meta}>{proposal.design.name} · {MOTIF_LABEL[proposal.design.motif]} · density {proposal.design.density} · {TEXTURE_LABEL[proposal.design.texture]}</Text>
          {proposal.explanation ? <Text style={s.copy}>{proposal.explanation}</Text> : null}
          <View style={s.actions}>
            <PlateButton tone="orange" label="Apply to draft" onPress={apply} testID="assist-apply" style={{ flex: 1 }} />
            <PlateButton label="Discard" onPress={() => setProposal(null)} testID="assist-discard" style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  copy: { fontFamily: fonts.body, fontSize: 15, color: palette.supporting, lineHeight: 21 },
  input: { minHeight: 96, textAlignVertical: 'top', borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.background, padding: 12, fontFamily: fonts.body, fontSize: 16, color: palette.foreground, borderRadius: 3 },
  count: { fontFamily: fonts.bodyMedium, fontSize: 12, color: palette.supporting, alignSelf: 'flex-end' },
  loading: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  proposal: { gap: 10, padding: 12, borderWidth: 2, borderBottomWidth: 5, borderColor: palette.edge, backgroundColor: palette.background, borderRadius: 3 },
  propTitle: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 1.2, textTransform: 'uppercase', color: palette.foreground },
  compare: { flexDirection: 'row', gap: 12, justifyContent: 'space-around', backgroundColor: palette.inset, padding: 12 },
  side: { alignItems: 'center', gap: 6 },
  tag: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: palette.foreground, textTransform: 'uppercase' },
  meta: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.foreground },
  actions: { flexDirection: 'row', gap: 8 },
});
