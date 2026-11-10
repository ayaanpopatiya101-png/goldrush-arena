# GoldRush Arena browser release

This package publishes the **real existing game** to ordinary browsers. It shares
the Expo/React Native Web screens, simulation, storage keys and API hooks from
`../mobile`; it is not a simplified replacement game or an iframe over a dev URL.
Web export is a deliberate compatibility choice to avoid forking the game rules
and dropping working functionality during a rewrite.

`pnpm --filter @workspace/goldrush-web build` creates an optimized browser-only
release in `dist/public`. No iOS/Android or native production build is replaced.
The web package owns `/`; the mobile artifact keeps `router = "expo-domain"` and
the `/mobile/` browser launch path. API and websocket traffic retain `/api`.
The standalone collectible shop keeps `/goldrush-shop/`.

The managed dev command exports the shared source, then serves that release;
restart it after shared mobile-source changes to rebuild the browser release.
Native Metro preview retains hot reload. The Vite scaffold recovery UI is not the
normal entry; `dist/public/index.html` is the actual playable export.

Browser requests derive their API origin at runtime. Never compile a development
host into production requests. Device-local progress stays in that browser and
does not automatically transfer from native storage or another hostname.
Stripe/web and RevenueCat/native purchase boundaries remain unchanged.

Publishing is user initiated. Until the owner republishes, the custom domain
continues serving the previous native-launch build. Publish applies the browser
route at `/`; it does not require buying or reconnecting the existing domain.
