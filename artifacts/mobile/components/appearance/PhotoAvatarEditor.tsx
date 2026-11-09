// Photo avatar editor: pick, square crop (drag, zoom, or buttons), stage, save, share, remove.
import React, { useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/ui/Primitives';
import { palette, tactile } from '@/constants/colors';
import { fonts } from '@/constants/typography';
import { useAvatar } from '@/hooks/useAvatar';
import { clamp, openAppSettings, pickAvatarPhoto, renderSquareCrop, type PickedPhoto } from '@/utils/avatarImage';

const VIEW = 240;
const MAX_ZOOM = 4;

interface Props { username: string; frameColor: string; testID?: string }

export function PhotoAvatarEditor({ username, frameColor, testID = 'photo-avatar' }: Props) {
  const avatar = useAvatar(username);
  const [source, setSource] = useState<PickedPhoto | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [staged, setStaged] = useState<string | null>(null);
  const [shareDraft, setShareDraft] = useState(false);
  const [busy, setBusy] = useState<null | 'pick' | 'crop' | 'save' | 'share' | 'remove'>(null);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState<null | { canAskAgain: boolean }>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const geo = useMemo(() => {
    if (!source) return null;
    const side = Math.min(source.width, source.height) / zoom;
    const rangeX = (source.width - side) / 2;
    const rangeY = (source.height - side) / 2;
    const originX = rangeX * (1 + pan.x);
    const originY = rangeY * (1 + pan.y);
    const s = VIEW / side;
    return { side, rangeX, rangeY, originX, originY, s };
  }, [source, zoom, pan]);

  const geoRef = useRef(geo); geoRef.current = geo;
  const startPan = useRef({ x: 0, y: 0 });
  const panRef = useRef(pan); panRef.current = pan;
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { startPan.current = panRef.current; },
    onPanResponderMove: (_e, g) => {
      const q = geoRef.current; if (!q) return;
      const nx = q.rangeX > 0 ? startPan.current.x - g.dx / (q.rangeX * q.s) : 0;
      const ny = q.rangeY > 0 ? startPan.current.y - g.dy / (q.rangeY * q.s) : 0;
      setPan({ x: clamp(nx, -1, 1), y: clamp(ny, -1, 1) });
    },
  }), []);

  async function onPick() {
    setError(null); setNotice(null); setDenied(null); setBusy('pick');
    try {
      const out = await pickAvatarPhoto();
      if (out.kind === 'picked') { setSource(out.photo); setZoom(1); setPan({ x: 0, y: 0 }); setStaged(null); }
      else if (out.kind === 'denied') setDenied({ canAskAgain: out.canAskAgain });
      else if (out.kind === 'invalid') setError(out.message);
    } catch {
      setError('The photo picker could not open. Try again.');
    } finally { setBusy(null); }
  }

  async function onApplyCrop() {
    if (!source || !geo) return;
    setBusy('crop'); setError(null);
    try {
      const uri = await renderSquareCrop(source.uri, { originX: geo.originX, originY: geo.originY, width: geo.side, height: geo.side });
      setStaged(uri);
    } catch { setError('That photo could not be cropped. Try another photo.'); }
    finally { setBusy(null); }
  }

  function cancelDraft() {
    setSource(null); setStaged(null); setZoom(1); setPan({ x: 0, y: 0 }); setError(null); setShareDraft(false);
    setNotice('Draft discarded. Your saved look is unchanged.');
  }

  async function onSave() {
    if (!staged) return;
    setBusy('save'); setError(null);
    try {
      await avatar.save(staged, shareDraft);
      setSource(null); setStaged(null);
      setNotice(shareDraft ? 'Photo saved and published to opponents.' : 'Photo saved. It stays private to you.');
    } catch {
      setError('Photo saving could not be confirmed. A failed upload keeps your old photo. Reload to check whether the server finished saving, or retry.');
    } finally { setBusy(null); }
  }

  async function onToggleShared() {
    const next = !avatar.info?.shared;
    setBusy('share'); setError(null);
    try {
      await avatar.setShared(next);
      setNotice(next ? 'Published. Opponents now see your photo.' : 'Now private. Opponents see your default player marker.');
    } catch { setError('Sharing could not be changed. Your current setting is kept.'); }
    finally { setBusy(null); }
  }

  async function onRemove() {
    setBusy('remove'); setError(null); setConfirmRemove(false);
    try { await avatar.remove(); setNotice('Photo removed. Your emblem is back.'); }
    catch { setError('The photo could not be removed. It is still saved.'); }
    finally { setBusy(null); }
  }

  const step = (dx: number, dy: number) => setPan(p => ({ x: clamp(p.x + dx, -1, 1), y: clamp(p.y + dy, -1, 1) }));
  const zoomBy = (d: number) => setZoom(z => clamp(Math.round((z + d) * 100) / 100, 1, MAX_ZOOM));
  const saved = !!avatar.info?.id;
  const shared = !!avatar.info?.shared;

  return (
    <View testID={testID} style={st.root}>
      <View style={st.headRow}>
        <View style={[st.thumb, { borderColor: frameColor }]}>
          {avatar.loading && !avatar.uri ? <View style={st.skeleton} /> :
            avatar.uri ? <Image source={{ uri: avatar.uri }} style={st.fill} accessibilityLabel="Your saved photo" /> :
            <Feather name="camera" size={22} color={palette.supporting} />}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={st.title}>Photo avatar</Text>
          <Text style={st.meta}>
            {avatar.loading && !avatar.loaded ? 'Checking for a saved photo...' :
              saved ? (shared ? 'Saved · Published to opponents' : 'Saved · Private') : 'Optional. No photo saved.'}
          </Text>
        </View>
      </View>

      <Text style={st.help}>
        Opponents only see your photo if you publish it. Otherwise it stays private and they see your emblem. Sharing is off by default.
      </Text>

      {avatar.error && !source ? (
        <View style={st.row}>
          <Text style={[st.help, { flex: 1 }]} accessibilityRole="alert">{avatar.error}</Text>
          <Button testID={`${testID}-reload`} label="Retry" icon="refresh-cw" size="sm" variant="ghost" onPress={() => void avatar.reload()} />
        </View>
      ) : null}

      {!source ? (
        <View style={st.wrapRow}>
          <Button testID={`${testID}-pick`} label={saved ? 'Choose a new photo' : 'Choose a photo'} icon="image" size="sm"
            variant="secondary" loading={busy === 'pick'} disabled={!!busy && busy !== 'pick'} onPress={onPick} />
          {saved ? (
            <Button testID={`${testID}-share`} label={shared ? 'Make private' : 'Publish to opponents'} icon={shared ? 'eye-off' : 'eye'}
              size="sm" variant="ghost" loading={busy === 'share'} disabled={!!busy && busy !== 'share'} onPress={onToggleShared} />
          ) : null}
          {saved && !confirmRemove ? (
            <Button testID={`${testID}-remove`} label="Remove saved photo" icon="trash-2" size="sm" variant="danger"
              loading={busy === 'remove'} disabled={!!busy && busy !== 'remove'} onPress={() => setConfirmRemove(true)} />
          ) : null}
        </View>
      ) : null}

      {confirmRemove ? (
        <View style={st.confirm}>
          <Text style={st.help}>Remove your saved photo? Opponents will see your emblem.</Text>
          <View style={st.row}>
            <Button testID={`${testID}-remove-confirm`} label="Remove" icon="trash-2" size="sm" variant="danger" onPress={onRemove} />
            <Button testID={`${testID}-remove-cancel`} label="Keep photo" size="sm" variant="ghost" onPress={() => setConfirmRemove(false)} />
          </View>
        </View>
      ) : null}

      {denied ? (
        <View style={st.confirm} accessibilityRole="alert">
          <Text style={st.help}>
            {denied.canAskAgain ? 'Photo access was not allowed. You can ask again whenever you like.'
              : 'Photo access is turned off for GoldRush Arena. Turn it on in Settings to choose a photo.'}
          </Text>
          <View style={st.row}>
            {denied.canAskAgain || Platform.OS === 'web'
              ? <Button testID={`${testID}-ask-again`} label="Ask again" size="sm" variant="secondary" onPress={onPick} />
              : <Button testID={`${testID}-settings`} label="Open Settings" icon="settings" size="sm" variant="secondary" onPress={() => void openAppSettings()} />}
            <Button testID={`${testID}-denied-dismiss`} label="Not now" size="sm" variant="ghost" onPress={() => setDenied(null)} />
          </View>
        </View>
      ) : null}

      {source && geo && !staged ? (
        <View style={{ gap: 10, alignItems: 'center' }}>
          <Text style={st.label}>Frame your photo</Text>
          <View style={[st.viewport, { borderColor: frameColor }]} {...responder.panHandlers}
            accessibilityLabel="Crop area. Drag to move, or use the buttons below.">
            <Image source={{ uri: source.uri }} style={{
              position: 'absolute', width: source.width * geo.s, height: source.height * geo.s,
              left: -geo.originX * geo.s, top: -geo.originY * geo.s,
            }} />
          </View>
          <View style={st.controls}>
            <CtlBtn icon="zoom-out" label="Zoom out" onPress={() => zoomBy(-0.25)} disabled={zoom <= 1} />
            <Text style={st.readout} accessibilityLiveRegion="polite">{zoom.toFixed(2)}x</Text>
            <CtlBtn icon="zoom-in" label="Zoom in" onPress={() => zoomBy(0.25)} disabled={zoom >= MAX_ZOOM} />
          </View>
          <View style={st.controls}>
            <CtlBtn icon="arrow-left" label="Move crop left" onPress={() => step(-0.1, 0)} disabled={geo.rangeX <= 0 || pan.x <= -1} />
            <CtlBtn icon="arrow-up" label="Move crop up" onPress={() => step(0, -0.1)} disabled={geo.rangeY <= 0 || pan.y <= -1} />
            <CtlBtn icon="crosshair" label="Center crop" onPress={() => setPan({ x: 0, y: 0 })} />
            <CtlBtn icon="arrow-down" label="Move crop down" onPress={() => step(0, 0.1)} disabled={geo.rangeY <= 0 || pan.y >= 1} />
            <CtlBtn icon="arrow-right" label="Move crop right" onPress={() => step(0.1, 0)} disabled={geo.rangeX <= 0 || pan.x >= 1} />
          </View>
          <Text style={st.meta}>Crop {Math.round(geo.side)} px square at {Math.round(geo.originX)}, {Math.round(geo.originY)}</Text>
          <View style={st.row}>
            <Button testID={`${testID}-crop`} label="Use this crop" icon="crop" size="sm" loading={busy === 'crop'} onPress={onApplyCrop} />
            <Button testID={`${testID}-cancel`} label="Cancel draft" icon="x" size="sm" variant="ghost" disabled={!!busy} onPress={cancelDraft} />
          </View>
        </View>
      ) : null}

      {staged ? (
        <View style={{ gap: 10 }}>
          <View style={st.headRow}>
            <Image source={{ uri: staged }} style={[st.staged, { borderColor: frameColor }]} accessibilityLabel="Cropped photo preview" />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={st.label}>Ready to save</Text>
              <Text style={st.help}>512 x 512 JPEG. Location and camera data are removed.</Text>
            </View>
          </View>
          <Pressable testID={`${testID}-share-draft`} onPress={() => setShareDraft(v => !v)} accessibilityRole="switch"
            accessibilityState={{ checked: shareDraft }} aria-checked={shareDraft}
            accessibilityLabel="Publish photo to opponents" style={st.switchRow}>
            <View style={[st.switchTrack, shareDraft && { backgroundColor: palette.primary }]}>
              <View style={[st.switchKnob, shareDraft && { alignSelf: 'flex-end' }]} />
            </View>
            <Text style={[st.help, { flex: 1 }]}>{shareDraft ? 'Published: opponents will see this photo.' : 'Private: only you see this photo.'}</Text>
          </Pressable>
          <View style={st.wrapRow}>
            <Button testID={`${testID}-save`} label={error ? 'Retry save' : 'Save photo'} icon="check" size="sm" loading={busy === 'save'} onPress={onSave} />
            <Button testID={`${testID}-recrop`} label="Adjust crop" icon="crop" size="sm" variant="ghost" disabled={!!busy} onPress={() => setStaged(null)} />
            <Button testID={`${testID}-cancel-staged`} label="Cancel draft" icon="x" size="sm" variant="ghost" disabled={!!busy} onPress={cancelDraft} />
          </View>
        </View>
      ) : null}

      {error ? <Text style={st.error} accessibilityRole="alert">{error}</Text> : null}
      {notice && !error ? <Text style={st.help} accessibilityLiveRegion="polite">{notice}</Text> : null}
    </View>
  );
}

function CtlBtn({ icon, label, onPress, disabled }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [st.ctl, pressed && { backgroundColor: palette.background }, disabled && { opacity: 0.4 }]}>
      <Feather name={icon} size={18} color={palette.foreground} />
    </Pressable>
  );
}

/** Small read-only photo for previews; falls back to children when no photo. */
export function AvatarPhoto({ username, size, children }: { username: string; size: number; children?: React.ReactNode }) {
  const { uri } = useAvatar(username);
  if (!uri) return <>{children}</>;
  return <Image source={{ uri }} style={{ width: size, height: size }} accessibilityLabel="Your photo avatar" />;
}

const st = StyleSheet.create({
  root: { gap: 10, padding: 14, backgroundColor: palette.surface, borderWidth: 2, borderColor: tactile.brass },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 56, height: 56, borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: palette.background },
  fill: { width: '100%', height: '100%' },
  skeleton: { width: '100%', height: '100%', backgroundColor: palette.surface },
  title: { fontFamily: fonts.display, fontSize: 22, color: palette.foreground, textTransform: 'uppercase' },
  label: { fontFamily: fonts.bodyBold, fontSize: 14, color: palette.foreground, letterSpacing: 1, textTransform: 'uppercase' },
  meta: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: palette.supporting },
  help: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: palette.foreground },
  error: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 21, color: palette.foreground, borderLeftWidth: 4, borderLeftColor: palette.primary, paddingLeft: 10 },
  confirm: { gap: 8, padding: 10, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.background },
  viewport: { width: VIEW, height: VIEW, overflow: 'hidden', borderWidth: 3, backgroundColor: palette.inset },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctl: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.surface },
  readout: { fontFamily: fonts.display, fontSize: 20, color: palette.foreground, minWidth: 56, textAlign: 'center' },
  staged: { width: 96, height: 96, borderWidth: 3 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  switchTrack: { width: 52, height: 30, borderWidth: 2, borderColor: palette.edge, backgroundColor: palette.background, padding: 2, justifyContent: 'center' },
  switchKnob: { width: 22, height: 22, backgroundColor: palette.deepest },
});
