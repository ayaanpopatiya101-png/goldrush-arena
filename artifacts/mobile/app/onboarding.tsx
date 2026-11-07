// Entry flow: welcome -> how it works -> name -> look -> create local player.
// Saved players are reachable straight from welcome. Rendered outside the router
// stack, so legal docs open inline while all draft state stays mounted here.
import React, { useCallback, useEffect, useState } from 'react';

import { LegalDocument, type LegalDoc } from '@/app/legal';
import { SavedStep } from '@/components/onboarding/SavedStep';
import { IntroStep, NameStep, StyleStep, WelcomeStep } from '@/components/onboarding/Steps';
import { findSavedPlayer, playerCreationError, validatePlayerName } from '@/utils/onboarding';
import { AVATAR_COLORS, AVATAR_EMOJIS, SavedAccountMeta, deleteAccount, getSavedAccounts, loginAccount } from '@/context/PlayerContext';

type Step = 'welcome' | 'intro' | 'name' | 'style' | 'saved';
interface Props { onSuccess: (username: string, emoji: string, color: string, isNew?: boolean) => void }

export default function OnboardingScreen({ onSuccess }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [savedFrom, setSavedFrom] = useState<Step>('welcome');
  const [username, setUsername] = useState('');
  const [touched, setTouched] = useState(false);
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]!);
  const [emoji, setEmoji] = useState<string>(AVATAR_EMOJIS[0]!);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [accounts, setAccounts] = useState<SavedAccountMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [openError, setOpenError] = useState('');
  const [legal, setLegal] = useState<LegalDoc | null>(null);

  const load = useCallback(() => {
    setLoaded(false); setLoadError(false);
    getSavedAccounts()
      .then(a => setAccounts(a))
      .catch(() => setLoadError(true))
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => { load(); }, [load]);

  const trimmed = username.trim();
  const nameError = validatePlayerName(username);
  const duplicate = !nameError && !!findSavedPlayer(username, accounts);

  function goSaved(from: Step) { setSavedFrom(from); setOpenError(''); setStep('saved'); }

  async function create() {
    if (nameError || duplicate) { setStep('name'); setTouched(true); return; }
    setCreating(true); setCreateError('');
    try {
      // Re-check right before writing so a duplicate is never merged into an existing save.
      const fresh = await getSavedAccounts();
      if (playerCreationError(username, fresh)) {
        setAccounts(fresh); setTouched(true); setStep('name'); return;
      }
      await loginAccount(trimmed, emoji, color);
      onSuccess(trimmed, emoji, color, true);
    } catch {
      setCreateError('The player could not be saved completely on this device. Try again.');
    } finally { setCreating(false); }
  }

  async function open(a: SavedAccountMeta) {
    if (opening) return;
    setOpening(a.username); setOpenError('');
    try {
      await loginAccount(a.username, a.avatarEmoji, a.avatarColor);
      onSuccess(a.username, a.avatarEmoji, a.avatarColor);
    } catch { setOpenError(`${a.username} could not be opened. Try again.`); }
    finally { setOpening(null); }
  }

  async function remove(name: string) {
    await deleteAccount(name);
    setAccounts(prev => prev.filter(a => a.username !== name));
  }

  if (legal) {
    return <LegalDocument doc={legal} onDocChange={setLegal} onBack={() => setLegal(null)} backLabel="Back to entry" />;
  }

  switch (step) {
    case 'intro':
      return <IntroStep onBack={() => setStep('welcome')} onNext={() => setStep('name')} />;
    case 'name':
      return (
        <NameStep
          value={username}
          onChange={v => { setUsername(v); setCreateError(''); if (v.trim().length >= 2) setTouched(true); }}
          error={nameError} touched={touched} onBlur={() => setTouched(true)}
          duplicate={duplicate}
          onOpenSaved={() => goSaved('name')}
          onBack={() => setStep('intro')}
          onNext={() => { setTouched(true); if (!nameError && !duplicate) setStep('style'); }}
        />
      );
    case 'style':
      return (
        <StyleStep name={trimmed} emoji={emoji} color={color} onEmoji={setEmoji} onColor={setColor}
          onBack={() => setStep('name')} onCreate={() => void create()} loading={creating} error={createError} onLegal={setLegal} />
      );
    case 'saved':
      return (
        <SavedStep accounts={accounts} loaded={loaded} loadError={loadError} onRetryLoad={load}
          onBack={() => setStep(savedFrom)} onOpen={a => void open(a)} onDelete={remove}
          onNew={() => setStep(trimmed ? 'name' : 'intro')} busyName={opening} error={openError} onLegal={setLegal} />
      );
    default:
      return <WelcomeStep onNew={() => setStep('intro')} onSaved={() => goSaved('welcome')} savedCount={loaded ? accounts.length : 0} onLegal={setLegal} />;
  }
}
