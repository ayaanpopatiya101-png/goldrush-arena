import { useState, type CSSProperties } from "react";
import {
  ArrowDownToLine, Check, ChevronRight, CircleDollarSign, Flame, Gift, Heart,
  LockKeyhole, Package, Shield, ShoppingBag, Sparkles, Star, Ticket, Zap,
} from "lucide-react";

type ShopTab = "skins" | "themes" | "powerups" | "extras" | "store";

const tabs: { id: ShopTab; label: string }[] = [
  { id: "skins", label: "Paddle skins" },
  { id: "themes", label: "Arena themes" },
  { id: "powerups", label: "Power-ups" },
  { id: "extras", label: "Extras" },
  { id: "store", label: "Coin store" },
];

const skins = [
  { name: "Classic", color: "#c99a2e", price: "FREE", owned: true, equipped: true },
  { name: "Plasma", color: "#b4533a", price: "150" },
  { name: "Frost", color: "#b7bfbe", price: "150" },
  { name: "Toxic", color: "#7f9065", price: "200" },
  { name: "Void", color: "#77746d", price: "250" },
  { name: "Inferno", color: "#c27e49", price: "300" },
  { name: "Chrome", color: "#d4d0c6", price: "350" },
  { name: "Cosmic", color: "#a99572", price: "500" },
];

const coinPacks = [
  { name: "Starter Sack", detail: "1,000 coins", price: "$0.99", mark: "01", featured: false },
  { name: "Gold Pouch", detail: "5,000 coins", price: "$3.99", mark: "05", featured: false },
  { name: "Treasure Chest", detail: "15,000 coins · best deal", price: "$9.99", mark: "15", featured: true },
  { name: "Dragon Vault", detail: "50,000 coins", price: "$24.99", mark: "50", featured: false },
];

function Coin({ size = 14 }: { size?: number }) {
  return <CircleDollarSign size={size} strokeWidth={2.2} aria-hidden="true" />;
}

export function GoldRushItemShop() {
  const [activeTab, setActiveTab] = useState<ShopTab>("skins");
  const [notice, setNotice] = useState("");

  const previewAction = (message: string) => setNotice(message);
  const tabTitle = tabs.find((tab) => tab.id === activeTab)?.label ?? "Paddle skins";

  return (
    <main className="gr-shop">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800;900&family=DM+Mono:wght@400;500&family=Source+Sans+3:wght@400;500;600;700&display=swap');
        .gr-shop {
          --ink: #14231f; --panel: #1b302a; --panel-hi: #213a32; --line: #355047;
          --gold: #d7a83b; --gold-pale: #efcf79; --cream: #eee7d7; --muted: #a5afa1;
          --clay: #ce7863; min-height: 100dvh; color: var(--cream); background:
          radial-gradient(ellipse at 70% -10%, #d7a83b1c 0, transparent 38%),
          radial-gradient(ellipse at 2% 50%, #61806b17 0, transparent 33%), var(--ink);
          font-family: 'Source Sans 3', sans-serif; position: relative; overflow: hidden;
        }
        .gr-shop * { box-sizing: border-box; }
        .gr-shop:before { content:""; position:fixed; inset:0; pointer-events:none; opacity:.11; z-index:0;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.88' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.3'/%3E%3C/svg%3E"); }
        .shop-scroll { width:min(100%, 940px); margin:0 auto; padding:24px 30px 90px; position:relative; z-index:1; }
        .shop-top { display:flex; align-items:center; justify-content:space-between; gap:16px; border-bottom:1px solid #eee7d719; padding-bottom:19px; }
        .shop-brand { display:flex; align-items:center; gap:12px; }
        .shop-mark { width:39px; height:39px; display:grid; place-items:center; color:var(--gold); border:1px solid #d7a83b77; background:linear-gradient(145deg,#d7a83b20,#d7a83b05); transform:rotate(-4deg); box-shadow:inset 0 0 0 4px #d7a83b0c; }
        .shop-mark svg { transform:rotate(4deg); }
        .shop-overline,.eyebrow { color:var(--gold); font:500 10px 'DM Mono',monospace; letter-spacing:.18em; text-transform:uppercase; }
        .shop-wordmark { font:800 20px/.92 'Barlow Condensed',sans-serif; letter-spacing:.03em; }
        .shop-wordmark span { color:var(--gold); }
        .shop-brand small { display:block; margin-top:5px; font:400 8px 'DM Mono',monospace; letter-spacing:.15em; color:#a5afa1; }
        .shop-tools { display:flex; align-items:center; gap:9px; }
        .wallet { display:flex; align-items:center; gap:8px; height:38px; padding:0 13px; border:1px solid #d7a83b55; background:#d7a83b12; color:var(--gold-pale); font:500 12px 'DM Mono',monospace; }
        .redeem { display:flex; gap:7px; align-items:center; height:38px; padding:0 12px; border:1px solid #eee7d728; color:var(--cream); background:#eee7d70b; font:600 10px 'DM Mono',monospace; letter-spacing:.08em; cursor:pointer; transition:transform .18s, background .18s; }
        .redeem:hover,.shop-tab:hover,.shop-action:hover { transform:translateY(-2px); }
        .shop-heading { display:flex; align-items:flex-end; justify-content:space-between; padding:28px 0 19px; gap:20px; }
        .shop-heading h1 { margin:2px 0 0; font:900 clamp(42px,8vw,70px)/.9 'Barlow Condensed',sans-serif; letter-spacing:-.025em; text-transform:uppercase; }
        .shop-heading h1 em { color:var(--gold); font-style:normal; }
        .shop-heading p { color:var(--muted); font-size:13px; margin:9px 0 0; }
        .preview-stamp { color:#d7a83b; border:1px solid #d7a83b55; padding:8px 10px; font:500 9px 'DM Mono',monospace; letter-spacing:.11em; text-align:center; transform:rotate(2deg); }
        .preview-stamp strong { display:block; font-size:11px; margin-top:3px; }
        .shop-tabs { display:flex; overflow:auto; scrollbar-width:none; gap:4px; padding:5px; border:1px solid #eee7d716; background:#0f1b18; }
        .shop-tabs::-webkit-scrollbar { display:none; }
        .shop-tab { cursor:pointer; white-space:nowrap; border:0; color:#9da99e; background:transparent; padding:12px 15px; font:600 12px 'Source Sans 3',sans-serif; transition:all .18s; }
        .shop-tab.active { color:#17231e; background:var(--gold); box-shadow:inset 0 -3px #9a6a1e; }
        .shop-subhead { display:flex; align-items:center; gap:12px; margin:26px 0 13px; }
        .shop-subhead h2 { margin:0; color:var(--gold-pale); font:700 15px 'Barlow Condensed',sans-serif; letter-spacing:.1em; text-transform:uppercase; }
        .sub-rule { height:1px; flex:1; background:linear-gradient(90deg,#d7a83b45,transparent); }
        .shop-subhead small { color:#78877b; font:400 9px 'DM Mono',monospace; letter-spacing:.08em; text-transform:uppercase; }
        .truth-note { display:flex; align-items:flex-start; gap:10px; padding:11px 13px; border:1px solid #d7a83b36; color:#c6c8b6; background:#d7a83b0a; font-size:11px; line-height:1.45; }
        .truth-note svg { flex:0 0 auto; color:var(--gold); margin-top:1px; }
        .skin-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; }
        .skin-card { --skin:#c99a2e; min-width:0; padding:7px; position:relative; border:1px solid #eee7d71c; background:linear-gradient(155deg,#20372f,#192a25 72%); box-shadow:0 5px 0 #0b1512; transition:transform .18s,border-color .18s; }
        .skin-card:hover { transform:translateY(-3px); border-color:color-mix(in srgb,var(--skin) 72%, transparent); }
        .skin-preview { position:relative; height:108px; display:grid; place-items:center; overflow:hidden; background:radial-gradient(ellipse at 50% 43%,color-mix(in srgb,var(--skin) 19%, transparent),transparent 68%), #13221e; border:1px solid color-mix(in srgb,var(--skin) 29%, transparent); }
        .skin-preview:before,.skin-preview:after { content:""; position:absolute; background:color-mix(in srgb,var(--skin) 25%, transparent); }
        .skin-preview:before { width:74%; height:1px; left:13%; top:50%; }
        .skin-preview:after { height:72%; width:1px; top:14%; left:50%; }
        .skin-paddle { width:11px; height:51px; border:1px solid #fff5; border-radius:3px; background:var(--skin); box-shadow:0 0 17px color-mix(in srgb,var(--skin) 48%, transparent),inset 0 0 5px #fff5; transform:rotate(28deg); z-index:1; }
        .skin-ball { position:absolute; width:6px; height:6px; border-radius:50%; background:#f3dfaa; top:26px; right:35px; box-shadow:0 0 8px #f3dfaa99; }
        .owned-tag { position:absolute; top:7px; left:7px; z-index:2; padding:4px 6px; font:500 8px 'DM Mono',monospace; color:#13221e; background:var(--skin); letter-spacing:.07em; }
        .skin-info { display:flex; align-items:center; justify-content:space-between; gap:6px; padding:10px 3px 5px; }
        .skin-info strong { font:700 14px 'Barlow Condensed',sans-serif; letter-spacing:.03em; }
        .skin-price { display:flex; align-items:center; gap:4px; color:var(--gold-pale); font:500 10px 'DM Mono',monospace; }
        .shop-action { min-height:34px; width:100%; margin-top:4px; display:flex; justify-content:center; align-items:center; gap:7px; border:1px solid #d7a83b5c; color:var(--gold-pale); background:#d7a83b0e; font:600 10px 'DM Mono',monospace; cursor:pointer; transition:transform .18s, background .18s; }
        .shop-action:hover { background:#d7a83b21; }
        .shop-action.owned { border-color:#7f906555; color:#a9bd8c; background:#7f906515; }
        .season-lock { margin-top:13px; padding:14px 15px; display:flex; align-items:center; justify-content:space-between; gap:15px; border:1px solid #eee7d71a; background:linear-gradient(100deg,#1b302a,#182923); }
        .season-lock strong { display:block; font:700 14px 'Barlow Condensed',sans-serif; }
        .season-lock p { margin:3px 0 0; color:var(--muted); font-size:11px; }
        .lock-chip { display:flex; align-items:center; gap:6px; border:1px solid #ce786355; padding:7px 9px; color:#df9987; font:500 9px 'DM Mono',monospace; white-space:nowrap; }
        .item-list { display:grid; gap:10px; }
        .item-row { display:flex; align-items:center; gap:14px; padding:13px; min-height:82px; position:relative; background:linear-gradient(105deg,#1b302a,#182822); border:1px solid #eee7d71c; box-shadow:0 3px 0 #0b1512; }
        .item-glyph { width:44px; height:44px; display:grid; place-items:center; flex:0 0 auto; border:1px solid #d7a83b44; color:var(--gold); background:#d7a83b12; }
        .item-copy { flex:1; min-width:0; }
        .item-copy strong { display:block; font:700 16px 'Barlow Condensed',sans-serif; }
        .item-copy small { display:block; margin-top:3px; color:var(--muted); font-size:11px; }
        .item-cost { display:flex; align-items:center; gap:6px; color:var(--gold-pale); font:500 11px 'DM Mono',monospace; white-space:nowrap; }
        .item-row .shop-action { width:auto; min-width:93px; margin:0; padding:0 10px; }
        .item-tag { color:#758479; font:400 8px 'DM Mono',monospace; letter-spacing:.08em; }
        .theme-preview { height:43px; width:74px; flex:0 0 auto; display:grid; place-items:center; border:1px solid #d7a83b44; background:radial-gradient(circle at center,#d7a83b22,transparent 62%),#101e1a; }
        .mini-arena { width:28px; height:28px; position:relative; border:1px solid #d7a83b77; transform:rotate(45deg); }
        .mini-arena:before { content:""; position:absolute; width:4px; height:11px; left:11px; top:-3px; background:#d7a83b; box-shadow:0 22px #d7a83b; }
        .mini-arena:after { content:""; position:absolute; width:4px; height:11px; top:8px; left:-3px; background:#d7a83b; box-shadow:22px 0 #d7a83b; }
        .earn-strip { margin-top:18px; padding:14px 16px; display:flex; gap:12px; align-items:center; border-left:3px solid var(--gold); background:#d7a83b0c; }
        .earn-strip svg { color:var(--gold); flex:0 0 auto; }
        .earn-strip strong { font:700 14px 'Barlow Condensed',sans-serif; }
        .earn-strip small { display:block; margin-top:2px; color:var(--muted); font-size:11px; }
        .pack-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .pack-card { position:relative; min-height:143px; padding:15px; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; border:1px solid #eee7d722; background:linear-gradient(145deg,#20372f,#172821); box-shadow:0 4px 0 #0b1512; }
        .pack-card:after { content:""; position:absolute; width:120px; height:120px; right:-37px; top:-40px; border:1px solid #d7a83b25; transform:rotate(45deg); box-shadow:0 0 0 8px #d7a83b08,0 0 0 18px #d7a83b05; }
        .pack-card.featured { border-color:#d7a83b99; background:linear-gradient(140deg,#3c3927,#1c3029 72%); }
        .pack-top { display:flex; align-items:flex-start; justify-content:space-between; position:relative; z-index:1; }
        .pack-mark { color:#d7a83b66; font:900 34px/.8 'Barlow Condensed',sans-serif; }
        .best-tag { color:#14231f; padding:4px 6px; background:var(--gold); font:500 8px 'DM Mono',monospace; }
        .pack-card h3 { margin:0 0 3px; font:700 18px 'Barlow Condensed',sans-serif; position:relative; z-index:1; }
        .pack-card p { margin:0; color:#a5afa1; font-size:11px; position:relative; z-index:1; }
        .pack-buy { margin-top:12px; width:100%; }
        .small-print { margin:12px 0 0; color:#829084; font:400 9px/1.5 'DM Mono',monospace; }
        .shop-foot { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:21px 2px 0; color:#718176; border-top:1px solid #eee7d714; margin-top:28px; font:400 9px 'DM Mono',monospace; letter-spacing:.04em; }
        .toast { position:fixed; z-index:5; left:50%; bottom:24px; transform:translateX(-50%); max-width:calc(100vw - 30px); display:flex; gap:12px; align-items:center; padding:12px 15px; border:1px solid #d7a83b99; color:#f3ead5; background:#213a32; box-shadow:0 8px 26px #09130f99; font-size:12px; }
        .toast button { border:0; color:var(--gold); background:none; cursor:pointer; font-size:17px; }
        @media(max-width:650px) {
          .shop-scroll { padding:17px 15px 70px; }
          .shop-heading { padding:24px 0 16px; }
          .shop-heading h1 { font-size:53px; }
          .shop-heading p { max-width:250px; font-size:12px; }
          .shop-tabs { margin:0 -15px; padding:5px 10px; }
          .shop-tab { padding:11px 12px; font-size:11px; }
          .skin-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
          .skin-preview { height:100px; }
          .shop-subhead { margin-top:21px; }
          .shop-subhead small { font-size:8px; }
          .item-row { gap:10px; padding:10px; }
          .item-glyph { width:38px; height:38px; }
          .item-row .shop-action { min-width:75px; font-size:9px; }
          .theme-preview { width:48px; }
          .shop-foot { align-items:flex-start; flex-direction:column; }
        }
        @media(max-width:390px) {
          .shop-brand { gap:8px; }
          .shop-mark { width:33px; height:33px; }
          .wallet { padding:0 9px; }
          .redeem { padding:0 8px; font-size:9px; }
          .preview-stamp { display:none; }
          .item-cost { font-size:9px; }
          .pack-card { padding:12px; }
        }
      `}</style>

      <div className="shop-scroll">
        <header className="shop-top">
          <div className="shop-brand">
            <div className="shop-mark"><ShoppingBag size={19} /></div>
            <div>
              <div className="shop-overline">GoldRush Arena</div>
              <div className="shop-wordmark">GOLD<span>RUSH</span></div>
              <small>FOUR SIDES. ONE LEFT.</small>
            </div>
          </div>
          <div className="shop-tools">
            <div className="wallet" aria-label="Sample balance: 2,450 coins"><Coin /> 2,450</div>
            <button className="redeem" onClick={() => previewAction("Prototype only · redemption codes are not validated here.")}>
              <Ticket size={14} /> REDEEM
            </button>
          </div>
        </header>

        <section className="shop-heading">
          <div>
            <div className="eyebrow">Season 07 · The prize counter</div>
            <h1>THE <em>SHOP</em></h1>
            <p>Pick your look. Keep your edge. Every item has a story.</p>
          </div>
          <div className="preview-stamp">IN-GAME SAMPLE<strong>NOT A CHECKOUT</strong></div>
        </section>

        <nav className="shop-tabs" aria-label="Shop categories">
          {tabs.map((tab) => (
            <button key={tab.id} className={`shop-tab${activeTab === tab.id ? " active" : ""}`} aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="shop-subhead">
          <h2>{tabTitle}</h2><span className="sub-rule" />
          <small>{activeTab === "skins" ? "Owned skins equip on tap" : "GoldRush catalog"}</small>
        </div>

        {activeTab === "skins" && (
          <>
            <div className="truth-note"><Sparkles size={15} /><span>Skin catalog from the live shop. This visual prototype does not connect to your profile or spend coins.</span></div>
            <div className="skin-grid" style={{ marginTop: 13 }}>
              {skins.map((skin) => (
                <article className="skin-card" key={skin.name} style={{ "--skin": skin.color } as CSSProperties}>
                  <div className="skin-preview" aria-label={`${skin.name} paddle concept`}>
                    {skin.owned && <span className="owned-tag">EQUIPPED</span>}
                    <i className="skin-paddle" /><i className="skin-ball" />
                  </div>
                  <div className="skin-info">
                    <strong>{skin.name}</strong>
                    <span className="skin-price">{skin.price !== "FREE" && <Coin size={11} />}{skin.price}</span>
                  </div>
                  <button className={`shop-action${skin.owned ? " owned" : ""}`} onClick={() => previewAction(skin.owned ? "Classic is shown equipped in the sample profile. No profile changes are saved." : `Prototype only · ${skin.name} costs ${skin.price} coins in the source shop; no coins were spent.`)}>
                    {skin.owned ? <><Check size={13} /> SAMPLE EQUIPPED</> : <>INSPECT <ChevronRight size={13} /></>}
                  </button>
                </article>
              ))}
            </div>
            <div className="season-lock">
              <div><strong>Season-exclusive paddles</strong><p>Aurora and Phantom are reserved for Premium Battle Pass tiers.</p></div>
              <span className="lock-chip"><LockKeyhole size={12} /> PASS EXCLUSIVE</span>
            </div>
            <div className="shop-subhead"><h2>Ball trails</h2><span className="sub-rule" /><small>Coming soon</small></div>
            <div className="item-list">
              {[["Fire Trail", "Balls leave fire trails", "200"], ["Ice Trail", "Balls leave ice trails", "200"], ["Neon Trail", "Rainbow neon trails", "300"]].map(([name, desc, price]) => (
                <div className="item-row" key={name}>
                  <div className="item-glyph"><Flame size={19} /></div><div className="item-copy"><strong>{name}</strong><small>{desc}</small></div>
                  <span className="item-cost"><Coin size={13} />{price}</span>
                  <span className="item-tag">SOON</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "themes" && (
          <>
            <div className="truth-note"><Shield size={15} /><span>Arena themes are visible in the source shop, but purchasing and equipping are unavailable in this build. No coins are spent.</span></div>
            <div className="item-list" style={{ marginTop: 13 }}>
              {[
                ["Dark Void", "Classic deep-space arena", "FREE"],
                ["Solar Flare", "Scorching red-orange arena", "300"],
                ["Arctic Ice", "Cool blue frost arena", "300"],
                ["Toxic Wasteland", "Neon green hazard zone", "350"],
                ["Cosmic Dream", "Purple nebula atmosphere", "400"],
                ["Gold Rush", "Prestige golden arena", "500"],
              ].map(([name, desc, price], index) => (
                <div className="item-row" key={name}>
                  <div className="theme-preview"><div className="mini-arena" style={{ filter: `hue-rotate(${index * 32}deg)` }} /></div>
                  <div className="item-copy"><strong>{name}</strong><small>{desc}</small></div>
                  <span className="item-cost">{price !== "FREE" && <Coin size={13} />}{price}</span>
                  <button className="shop-action" onClick={() => previewAction("Unavailable in this build · theme ownership is preserved, but no purchase or equip action was made.")}>UNAVAILABLE</button>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "powerups" && (
          <>
            <div className="truth-note"><Zap size={15} /><span>Power-up bundle prices are catalog references only. The current build does not equip bundles or deduct coins.</span></div>
            <div className="item-list" style={{ marginTop: 13 }}>
              {[
                { name: "Shield Pack", desc: "3× Shield Power-ups", price: "80", Icon: Shield },
                { name: "Speed Pack", desc: "3× Speed Boosts", price: "80", Icon: Zap },
                { name: "Mixed Bundle", desc: "5× Random Power-ups", price: "100", Icon: Gift },
              ].map(({ name, desc, price, Icon }) => (
                <div className="item-row" key={name}>
                  <div className="item-glyph"><Icon size={20} /></div>
                  <div className="item-copy"><strong>{name}</strong><small>{desc}</small></div>
                  <span className="item-cost"><Coin size={13} />{price}</span>
                  <button className="shop-action" onClick={() => previewAction(`${name} is unavailable in this build. No coins were spent.`)}>UNAVAILABLE</button>
                </div>
              ))}
            </div>
            <div className="earn-strip"><Star size={19} /><div><strong>Earn coins in the arena</strong><small>Source shop notes: victories pay 60 coins; losses pay 15.</small></div></div>
          </>
        )}

        {activeTab === "extras" && (
          <>
            <div className="truth-note"><Heart size={15} /><span>Extra lives are store products in the real app. Checkout and fulfillment are intentionally not connected in this prototype.</span></div>
            <div className="item-list" style={{ marginTop: 13 }}>
              {[
                ["1 Extra Life", "Start your next match with 1 bonus life", "$1.99"],
                ["3 Extra Lives", "Start your next 3 matches with 1 bonus life", "$2.99"],
              ].map(([name, desc, price]) => (
                <div className="item-row" key={name}>
                  <div className="item-glyph" style={{ color: "var(--clay)", borderColor: "#ce786355", background: "#ce786314" }}><Heart size={19} /></div>
                  <div className="item-copy"><strong>{name}</strong><small>{desc}</small></div>
                  <button className="shop-action" onClick={() => previewAction(`Prototype only · ${name} store checkout was not started.`)}>{price}</button>
                </div>
              ))}
            </div>
            <div className="shop-subhead"><h2>Coin packs</h2><span className="sub-rule" /><button className="item-tag" onClick={() => setActiveTab("store")}>OPEN STORE →</button></div>
            <CoinPacks onSelect={previewAction} />
          </>
        )}

        {activeTab === "store" && (
          <>
            <div className="truth-note"><Package size={15} /><span>Product names and fallback prices reflect the existing shop source. Live availability and localized prices come from the store; this mockup never initiates checkout.</span></div>
            <div className="shop-subhead"><h2>Coin vault</h2><span className="sub-rule" /><small>Four ways to stock up</small></div>
            <CoinPacks onSelect={previewAction} />
            <div className="shop-subhead"><h2>Limited goods</h2><span className="sub-rule" /><small>Single purchases</small></div>
            <div className="item-list">
              {[
                ["Void Striker Pack", "Exclusive Void paddle skin", "$1.99"],
                ["Inferno Pack", "Blazing Inferno paddle skin", "$1.99"],
                ["Elite Bundle", "Chrome + Cosmic skins · 2 for 1", "$4.99"],
                ["GoldRush Season Pass", "Supporter purchase · ownership only", "$4.99"],
                ["GoldRush Battle Pass Premium", "Unlocks this season's premium reward track", "$4.99"],
              ].map(([name, desc, price], index) => (
                <div className="item-row" key={name}>
                  <div className="item-glyph">{index < 3 ? <Sparkles size={19} /> : <Star size={19} />}</div>
                  <div className="item-copy"><strong>{name}</strong><small>{desc}</small></div>
                  <button className="shop-action" onClick={() => previewAction(`Prototype only · ${name} checkout was not started.`)}>{price}</button>
                </div>
              ))}
            </div>
            <p className="small-print">The Season Pass is an ownership record only in the current build; it does not unlock Pass tiers. Battle Pass rewards are earned by reaching each tier.</p>
          </>
        )}

        <footer className="shop-foot"><span>GOLDRUSH · ITEM COUNTER</span><span>CATALOG PREVIEW · NO PURCHASES PROCESSED</span></footer>
      </div>
      {notice && <div className="toast" role="status"><ArrowDownToLine size={15} /><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}>×</button></div>}
    </main>
  );
}

function CoinPacks({ onSelect }: { onSelect: (message: string) => void }) {
  return (
    <div className="pack-grid">
      {coinPacks.map((pack) => (
        <article className={`pack-card${pack.featured ? " featured" : ""}`} key={pack.name}>
          <div className="pack-top"><span className="pack-mark">{pack.mark}</span>{pack.featured && <span className="best-tag">BEST VALUE</span>}</div>
          <div><h3>{pack.name}</h3><p>{pack.detail}</p>
            <button className="shop-action pack-buy" onClick={() => onSelect(`Prototype only · ${pack.name} checkout was not started; no coins were granted.`)}>
              <Coin size={13} /> {pack.price} <ChevronRight size={13} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
