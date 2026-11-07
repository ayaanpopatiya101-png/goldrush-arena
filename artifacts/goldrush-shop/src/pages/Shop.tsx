import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Check, ChevronRight, CircleDollarSign, Download, Flame, Gift, HardDrive, Heart, Info,
  LockKeyhole, Package, Search, ShoppingBag, Star, Upload, X, AlertTriangle, RotateCcw,
} from 'lucide-react';
import { CATALOG, type CatalogItem } from '@workspace/goldrush-catalog';
import {
  loadProfile, createProfile, transact, importProfile, exportProfile, subscribeProfile, type ShopProfile,
} from '@/lib/profile';

type Tab = CatalogItem['category'];
const TABS: { id: Tab; label: string; note: string }[] = [
  { id: 'skins', label: 'Paddle skins', note: 'Inspect, compare, equip' },
  { id: 'themes', label: 'Arena themes', note: 'Catalog reference' },
  { id: 'powerups', label: 'Power-ups', note: 'Catalog reference' },
  { id: 'extras', label: 'Extras', note: 'Store products' },
  { id: 'store', label: 'Coin store', note: 'Store products' },
];
const keyOf = (i: CatalogItem) => `${i.kind}-${i.id}`;
const fmt = (n: number) => n.toLocaleString('en-US');

function Coin({ size = 14 }: { size?: number }) {
  return <CircleDollarSign size={size} strokeWidth={2.2} aria-hidden="true" />;
}

function itemState(item: CatalogItem, p: ShopProfile) {
  const owned = item.kind === 'skin' ? p.ownedSkins.includes(item.id) : item.kind === 'theme' ? p.ownedThemes.includes(item.id) : false;
  const equipped = item.kind === 'skin' ? p.currentSkin === item.id : item.kind === 'theme' ? p.currentArenaTheme === item.id : false;
  const cosmetic = item.kind === 'skin' || item.kind === 'theme';
  let blocked: string | null = null;
  if (!item.available && !(item.kind === 'skin' && owned)) blocked = item.restriction ?? 'Unavailable in this build.';
  else if (!cosmetic) blocked = 'This item cannot be bought or equipped in the browser shop.';
  const canEquip = !blocked && owned && !equipped;
  let buyBlock: string | null = blocked;
  if (!buyBlock && !owned) {
    if (item.price === null) buyBlock = 'No coin price is listed for this item.';
    else if (p.coins < item.price) buyBlock = `Needs ${fmt(item.price - p.coins)} more coins.`;
  }
  const canBuy = !owned && !buyBlock;
  return { owned, equipped, blocked, buyBlock, canBuy, canEquip };
}

function Preview({ item, big, label }: { item: CatalogItem; big?: boolean; label?: ReactNode }) {
  const Icon = item.kind === 'trail' ? Flame : item.kind === 'bundle' ? Gift : item.category === 'extras' ? Heart : item.id.includes('pass') ? Star : Package;
  return (
    <div className={`gr-prev${big ? ' big' : ''}`} style={{ '--c': item.color } as CSSProperties} role="img" aria-label={`${item.name} preview`}>
      {label}
      {item.kind === 'skin' && <><i className="gr-paddle" /><i className="gr-ball" /></>}
      {item.kind === 'theme' && <div className="gr-arena"><i /><i /><i /><i /></div>}
      {item.kind !== 'skin' && item.kind !== 'theme' && <div className="gr-glyph"><Icon size={big ? 40 : 26} /></div>}
    </div>
  );
}

function Modal({ open, onOpenChange, title, narrow, children, testId }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; narrow?: boolean; children: ReactNode; testId: string }) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="gr-overlay" />
          <Dialog.Content className={`gr-dialog${narrow ? ' narrow' : ''}`} data-testid={testId} aria-describedby={undefined}
            onOpenAutoFocus={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
            onCloseAutoFocus={(e) => { e.preventDefault(); returnFocus.current?.focus(); }}>
          <Dialog.Title asChild><h2>{title}</h2></Dialog.Title>
          <Dialog.Close className="gr-x" aria-label="Close" data-testid={`button-close-${testId}`}><X size={16} /></Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div className="gr-mark"><ShoppingBag size={19} aria-hidden="true" /></div>
      <div>
        <div className="gr-over">GoldRush Arena</div>
        <div className="gr-word">GOLD<span>RUSH</span></div>
      </div>
    </div>
  );
}

function Onboarding({ onDone }: { onDone: (p: ShopProfile) => void }) {
  const [name, setName] = useState('');
  const [raw, setRaw] = useState('');
  const [err, setErr] = useState('');
  const [ierr, setIerr] = useState('');
  const [busy, setBusy] = useState<'' | 'create' | 'import'>('');

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2 || n.length > 24) { setErr('Use 2 to 24 characters.'); return; }
    setErr(''); setBusy('create');
    try { onDone(await createProfile(n)); } catch (x) { setErr(x instanceof Error ? x.message : 'Could not create profile.'); } finally { setBusy(''); }
  };
  const doImport = async (e: FormEvent) => {
    e.preventDefault();
    if (!raw.trim()) { setIerr('Paste save JSON or choose a file first.'); return; }
    setIerr(''); setBusy('import');
    try { onDone(await importProfile(raw)); } catch (x) { setIerr(x instanceof Error ? x.message : 'That save could not be read.'); } finally { setBusy(''); }
  };

  return (
    <div className="gr-wrap">
      <header className="gr-top"><Brand /></header>
      <section className="gr-heading">
        <div>
          <div className="gr-over">The prize counter</div>
          <h1>Open a <em>tab</em></h1>
          <p>Inspect every paddle before you spend. Start a fresh counter profile, or bring a copy of an existing save.</p>
        </div>
      </section>
      <div className="gr-onb">
        <form className="gr-panel" onSubmit={create} noValidate>
          <h2>New profile</h2>
          <p className="gr-hint" style={{ marginTop: 6 }}>Starts with 0 coins and the Classic paddle equipped. Coins are never created here.</p>
          <div className="gr-field">
            <label htmlFor="pname">Player name</label>
            <input id="pname" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoComplete="nickname"
              aria-invalid={!!err} aria-describedby={err ? 'pname-err' : undefined} data-testid="input-profile-name" />
            {err && <span id="pname-err" className="gr-err" role="alert">{err}</span>}
          </div>
          <div className="gr-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="gr-btn solid" type="submit" disabled={!!busy} data-testid="button-create-profile">
              {busy === 'create' ? 'Opening' : 'Open counter'} <ChevronRight size={14} />
            </button>
          </div>
          <ul className="gr-list" style={{ marginTop: 22 }}>
            <li><HardDrive size={15} /><span>Stored only in this browser. Clearing site data erases it.</span></li>
            <li><Info size={15} /><span>Nothing here syncs back to the game app or reads native saves.</span></li>
          </ul>
        </form>
        <form className="gr-panel" onSubmit={doImport} noValidate>
          <h2>Import a save copy</h2>
          <p className="gr-hint" style={{ marginTop: 6 }}>Optional. Paste save JSON or a shop backup to carry over real balance and ownership. Import is only possible before a profile exists here, so balances can never be replaced.</p>
          <div className="gr-field">
            <label htmlFor="raw">Save JSON</label>
            <textarea id="raw" value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false}
              aria-invalid={!!ierr} aria-describedby={ierr ? 'raw-err' : 'raw-hint'} data-testid="input-import-json" />
            <span id="raw-hint" className="gr-hint">Changes made here stay in this copy and cannot flow back to the game.</span>
            <input type="file" accept="application/json,.json,.txt" aria-label="Choose a save file" data-testid="input-import-file"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  if (f.size > 2_000_000) throw new Error('Save is too large. Maximum size is 2 MB.');
                  setRaw(await f.text()); setIerr('');
                } catch (error) { setIerr(error instanceof Error ? error.message : 'Could not read the selected file. Try pasting JSON instead.'); }
              }} style={{ fontSize: 13 }} />
            {ierr && <span id="raw-err" className="gr-err" role="alert">{ierr}</span>}
          </div>
          <div className="gr-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="gr-btn" type="submit" disabled={!!busy} data-testid="button-import-profile">
              <Upload size={14} /> {busy === 'import' ? 'Importing' : 'Import copy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Shop() {
  const [profile, setProfile] = useState<ShopProfile | null | undefined>(undefined);
  const [loadErr, setLoadErr] = useState('');
  const [tab, setTab] = useState<Tab>('skins');
  const [query, setQuery] = useState('');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [detail, setDetail] = useState<CatalogItem | null>(null);
  const [confirm, setConfirm] = useState<CatalogItem | null>(null);
  const [backup, setBackup] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; err?: boolean } | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);

  const say = useCallback((text: string, err = false) => {
    setNotice({ text, err });
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 5200);
  }, []);

  const refresh = useCallback(async () => {
    try { setProfile(await loadProfile()); setLoadErr(''); }
    catch (x) { setLoadErr(x instanceof Error ? x.message : 'Local storage is unavailable.'); }
  }, []);

  useEffect(() => { void refresh(); return subscribeProfile(() => { void refresh(); }); }, [refresh]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((i) => i.category === tab)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
      .filter((i) => !ownedOnly || !profile || itemState(i, profile).owned);
  }, [tab, query, ownedOnly, profile]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of CATALOG) c[i.category] = (c[i.category] ?? 0) + 1;
    return c;
  }, []);

  const run = async (action: 'purchase' | 'equip', item: CatalogItem) => {
    setBusy(true);
    try {
      const state = itemState(item, profile!);
      if (action === 'purchase' ? !state.canBuy : !state.canEquip) throw new Error(state.blocked ?? state.buyBlock ?? 'This action is unavailable.');
      const next = await transact({ kind: action, itemId: item.id, itemKind: item.kind });
      setProfile(next);
      say(action === 'purchase' ? `${item.name} bought for ${fmt(item.price ?? 0)} coins and equipped.` : `${item.name} equipped.`);
      setConfirm(null); setDetail(null);
    } catch (x) { say(x instanceof Error ? x.message : 'That action failed. Nothing changed.', true); }
    finally { setBusy(false); }
  };

  const openBackup = async () => {
    try { setBackup(await exportProfile()); } catch (x) { say(x instanceof Error ? x.message : 'Export failed.', true); }
  };

  if (loadErr) return (
    <main className="gr"><div className="gr-wrap"><header className="gr-top"><Brand /></header>
      <div className="gr-empty" role="alert" style={{ marginTop: 40 }}>
        <AlertTriangle size={28} color="var(--clay)" />
        <h3>Counter storage unavailable</h3><p>{loadErr}</p>
        <button className="gr-btn" onClick={() => void refresh()} data-testid="button-retry"><RotateCcw size={14} /> Try again</button>
      </div></div></main>
  );

  if (profile === undefined) return (
    <main className="gr" aria-busy="true"><div className="gr-wrap"><header className="gr-top"><Brand /></header>
      <div style={{ height: 120 }} /><div className="gr-grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="gr-skel" />)}</div></div></main>
  );

  if (profile === null) return <main className="gr"><Onboarding onDone={(p) => { setProfile(p); say(`Welcome to the counter, ${p.name}.`); }} /></main>;

  const equippedSkin = CATALOG.find((i) => i.kind === 'skin' && i.id === profile.currentSkin);
  const meta = TABS.find((t) => t.id === tab)!;

  return (
    <main className="gr">
      <div className="gr-wrap">
        <header className="gr-top">
          <Brand />
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="gr-hint" data-testid="text-profile-name">{profile.name}</span>
            <div className="gr-wallet" aria-label={`Wallet: ${fmt(profile.coins)} coins`} data-testid="text-wallet"><Coin /> {fmt(profile.coins)}</div>
            <button className="gr-btn quiet" onClick={() => void openBackup()} data-testid="button-backup"><Download size={14} /> Backup</button>
          </div>
        </header>

        <section className="gr-heading">
          <div>
            <div className="gr-over">The prize counter</div>
            <h1>The <em>shop</em></h1>
            <p>Pick up every paddle, turn it in the light, then decide. Equipped now: <strong style={{ color: 'var(--gold-pale)' }} data-testid="text-equipped-skin">{equippedSkin?.name ?? `Unknown skin (${profile.currentSkin})`}</strong>.</p>
          </div>
          <div className="gr-stamp">Browser local<strong>Coins only</strong></div>
        </section>

        <div className="gr-tabs" role="tablist" aria-label="Shop categories">
          {TABS.map((t, index) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1} className="gr-tab" onClick={() => setTab(t.id)} data-testid={`tab-${t.id}`}
              onKeyDown={(e) => {
                const next = e.key === 'ArrowRight' ? (index + 1) % TABS.length : e.key === 'ArrowLeft' ? (index + TABS.length - 1) % TABS.length : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
                if (next < 0) return;
                e.preventDefault(); setTab(TABS[next].id);
                (e.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();
              }}>
              {t.label} <span className="ct">{counts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="gr-filters">
          <label className="gr-search"><Search size={15} aria-hidden="true" />
            <span className="sr-only">Search this category</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${meta.label.toLowerCase()}`} data-testid="input-search" />
          </label>
          <label className="gr-check"><input type="checkbox" checked={ownedOnly} onChange={(e) => setOwnedOnly(e.target.checked)} data-testid="checkbox-owned-only" /> My collection only</label>
        </div>

        <div className="gr-sub"><h2>{meta.label}</h2><span className="gr-rule" /><small>{meta.note}</small></div>

        {(tab === 'extras' || tab === 'store') && (
          <div className="gr-note warn"><LockKeyhole size={15} /><span>Real-money products are listed for reference only. This counter has no verified link to your game player and no safe way to deliver them, so prices and checkout are not offered. Use the in-game store.</span></div>
        )}
        {(tab === 'themes' || tab === 'powerups') && (
          <div className="gr-note"><Info size={15} /><span>Coin prices shown are the real catalog prices. Buying and equipping these is not available in this build; saved ownership is kept.</span></div>
        )}

        {items.length === 0 ? (
          <div className="gr-empty" data-testid="status-empty">
            <Search size={26} color="var(--gold)" />
            <h3>{ownedOnly ? 'Nothing on your shelf here' : 'No match on the counter'}</h3>
            <p>{query ? `Nothing in ${meta.label.toLowerCase()} matches "${query}".` : 'You do not own anything in this category yet.'}</p>
            <div className="gr-actions" style={{ justifyContent: 'center' }}>
              {query && <button className="gr-btn quiet" onClick={() => setQuery('')} data-testid="button-clear-search">Clear search</button>}
              {ownedOnly && <button className="gr-btn quiet" onClick={() => setOwnedOnly(false)} data-testid="button-show-all">Show everything</button>}
            </div>
          </div>
        ) : (
          <div className="gr-grid">
            {items.map((item) => {
              const s = itemState(item, profile);
              const k = keyOf(item);
              return (
                <article key={k} className={`gr-card${s.equipped ? ' is-equipped' : ''}`} style={{ '--c': item.color } as CSSProperties} data-testid={`card-item-${k}`}>
                  <Preview item={item} label={<>
                    {s.equipped ? <span className="gr-tag">{item.kind === 'theme' ? 'Saved choice' : 'Equipped'}</span> : s.owned ? <span className="gr-tag">Owned</span> : null}
                    {s.blocked && <span className="gr-tag lock"><LockKeyhole size={10} style={{ display: 'inline', marginRight: 3 }} />Locked</span>}
                  </>} />
                  <div className="gr-info">
                    <strong>{item.name}</strong>
                    {item.kind === 'money' ? <span className="gr-price na">No price</span>
                      : item.price === 0 ? <span className="gr-price">Free</span>
                      : item.price === null ? <span className="gr-price na">No price</span>
                      : <span className="gr-price" data-testid={`text-price-${k}`}><Coin size={12} />{fmt(item.price)}</span>}
                  </div>
                  <div className={`gr-reason${s.buyBlock && !s.owned && !s.blocked ? ' bad' : ''}`}>
                    {s.equipped ? (item.kind === 'theme' ? 'Preview only, unavailable' : 'In use') : s.owned ? (s.blocked ? 'Owned, unavailable' : 'On your shelf') : s.blocked ? 'Unavailable' : s.buyBlock ?? 'Ready to buy'}
                  </div>
                  <button className={`gr-btn${s.owned ? ' owned' : ''}`} onClick={() => setDetail(item)} data-testid={`button-inspect-${k}`}>
                    {s.equipped && item.kind === 'skin' ? <><Check size={13} /> Equipped</> : <>Inspect <ChevronRight size={13} /></>}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        <footer className="gr-foot">
          <span>GoldRush item counter</span>
          <span>Saved in this browser only. Clearing site data loses it. Back up often.</span>
        </footer>
      </div>

      <Modal open={!!detail} onOpenChange={(o) => !o && setDetail(null)} title={detail?.name ?? ''} testId="dialog-detail">
        {detail && (() => {
          const s = itemState(detail, profile);
          return <>
            <p style={{ marginTop: 6 }}>{detail.description}</p>
            {detail.kind === 'skin' && !s.equipped ? (
              <div className="gr-compare">
                <div><span className="lbl">This paddle</span><Preview item={detail} /></div>
                <div><span className="lbl">Equipped now</span>
                  {equippedSkin ? <Preview item={equippedSkin} /> : <div className="gr-prev" style={{ color: 'var(--muted)', fontSize: 13, padding: 12 }}>Unknown skin {profile.currentSkin}</div>}
                  <span className="gr-hint">{equippedSkin?.name ?? profile.currentSkin}</span>
                </div>
              </div>
            ) : <div style={{ marginTop: 14 }}><Preview item={detail} big /></div>}
            <div className="gr-ledger">
              <div><span>Price</span><b>{detail.kind === 'money' || detail.price === null ? 'Not offered here' : detail.price === 0 ? 'Free' : `${fmt(detail.price)} coins`}</b></div>
              <div><span>Your wallet</span><b>{fmt(profile.coins)} coins</b></div>
              <div><span>Status</span><b>{s.equipped ? (detail.kind === 'theme' ? 'Saved choice, preview only' : 'Equipped') : s.owned ? 'Owned' : s.blocked ? 'Locked' : s.canBuy ? 'Available' : 'Short on coins'}</b></div>
            </div>
            {(s.blocked || (!s.owned && s.buyBlock)) && <div className={`gr-note${s.blocked ? ' warn' : ''}`} data-testid="text-block-reason"><LockKeyhole size={15} /><span>{s.blocked ?? s.buyBlock}{!s.blocked && ' Coins are earned in arena matches.'}</span></div>}
            <div className="gr-actions">
              <Dialog.Close className="gr-btn quiet" data-testid="button-detail-cancel">Back to counter</Dialog.Close>
              {s.canEquip && <button className="gr-btn solid" disabled={busy} onClick={() => void run('equip', detail)} data-testid="button-equip">Equip</button>}
              {!s.owned && <button className="gr-btn solid" disabled={!s.canBuy || busy} onClick={() => setConfirm(detail)} data-testid="button-buy">
                <Coin size={13} /> Buy{detail.price ? ` for ${fmt(detail.price)}` : ''}</button>}
            </div>
          </>;
        })()}
      </Modal>

      <Modal open={!!confirm} onOpenChange={(o) => !o && !busy && setConfirm(null)} title="Confirm purchase" narrow testId="dialog-confirm">
        {confirm && (() => {
          const s = itemState(confirm, profile);
          const cost = confirm.price ?? 0;
          return <>
            <p style={{ marginTop: 6 }}>Spend coins on <strong style={{ color: 'var(--cream)' }}>{confirm.name}</strong>. It will be equipped right away.</p>
            <div className="gr-ledger">
              <div><span>Wallet</span><b>{fmt(profile.coins)}</b></div>
              <div><span>Cost</span><b>-{fmt(cost)}</b></div>
              <div><span>After purchase</span><b data-testid="text-after-balance">{fmt(profile.coins - cost)}</b></div>
            </div>
            {!s.canBuy && <p className="gr-err" role="alert">{s.buyBlock ?? 'Already owned.'}</p>}
            <div className="gr-actions">
              <Dialog.Close className="gr-btn quiet" disabled={busy} data-testid="button-confirm-cancel">Cancel</Dialog.Close>
              <button className="gr-btn solid" disabled={!s.canBuy || busy} onClick={() => void run('purchase', confirm)} data-testid="button-confirm-buy">
                {busy ? 'Processing' : `Spend ${fmt(cost)} coins`}</button>
            </div>
          </>;
        })()}
      </Modal>

      <Modal open={backup !== null} onOpenChange={(o) => !o && setBackup(null)} title="Profile backup" testId="dialog-backup">
        <p style={{ marginTop: 6 }}>A copy of this browser profile. Keep it somewhere safe; clearing site data erases the original.</p>
        <div className="gr-note"><Info size={15} /><span>To recover, open the counter in a browser with no profile yet and paste this into "Import a save copy". Import is blocked once a profile exists, so it can never overwrite a balance. It does not sync to the game app.</span></div>
        <div className="gr-field"><label htmlFor="bk">Backup JSON</label><textarea id="bk" readOnly value={backup ?? ''} data-testid="text-backup" onFocus={(e) => e.currentTarget.select()} /></div>
        <div className="gr-actions">
          <button className="gr-btn quiet" data-testid="button-copy-backup" onClick={async () => {
            try { await navigator.clipboard.writeText(backup ?? ''); say('Backup copied.'); } catch { say('Copy blocked. Select the text and copy it manually.', true); }
          }}>Copy</button>
          <button className="gr-btn solid" data-testid="button-save-backup" onClick={() => {
            const url = URL.createObjectURL(new Blob([backup ?? ''], { type: 'application/json' }));
            const a = document.createElement('a'); a.href = url; a.download = `goldrush-shop-${profile.name}.json`; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}><Download size={14} /> Save file</button>
        </div>
      </Modal>

      <div aria-live="polite" role="status">
        {notice && <div className={`gr-status${notice.err ? ' err' : ''}`} data-testid="status-notice">
          <span>{notice.text}</span><button aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={15} /></button></div>}
      </div>
    </main>
  );
}
