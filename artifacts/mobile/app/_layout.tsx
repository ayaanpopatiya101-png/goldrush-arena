import { useFonts, BarlowCondensed_600SemiBold, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { SourceSans3_400Regular, SourceSans3_500Medium, SourceSans3_600SemiBold, SourceSans3_700Bold } from '@expo-google-fonts/source-sans-3';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { StartupState } from '@/components/StartupState';
import { withTimeout } from '@/utils/withTimeout';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PlayerProvider, getSavedAccounts, getLoggedInUser, usePlayer } from '@/context/PlayerContext';
import { PartyProvider } from '@/context/PartyContext';
import OnboardingScreen from '@/app/onboarding';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { initializeRevenueCat, RevenueCatProvider } from '@/lib/revenuecat';
import { clearCompletedMatch } from '@/store/completedMatch';
import { OverlayQueueProvider } from '@/context/OverlayQueue';

SplashScreen.preventAutoHideAsync().catch(() => {});
initializeRevenueCat();

const queryClient = new QueryClient();

function AppLoadingScreen() {
  return <StartupState />;
}

function PlayerEntry() {
  const { profile, isLoaded } = usePlayer();
  if (!isLoaded) return <AppLoadingScreen />;
  if (!profile.tutorialComplete) return <TutorialOverlay onComplete={() => {}} />;
  return <RootLayoutNav />;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
      <Stack.Screen name="lobby"     options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="game"      options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="postgame"  options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="gauntlet"  options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="arcade"         options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="settings"       options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="legal"          options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="onboarding-flow" options={{ headerShown: false, animation: 'fade', presentation: 'fullScreenModal' }} />
      <Stack.Screen name="challenge"       options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="warmup"          options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="paddle-studio" options={{headerShown:false,animation:'slide_from_right'}} />
    </Stack>
  );
}

interface AuthUser { username: string; emoji: string; color: string }

export default function RootLayout() {
  const reducedMotion = useReducedMotion();
  const [fontsLoaded, fontError] = useFonts({
    SourceSans3_400Regular, SourceSans3_500Medium, SourceSans3_600SemiBold, SourceSans3_700Bold,
    BarlowCondensed_600SemiBold, BarlowCondensed_700Bold,
  });
  const [fontTimedOut, setFontTimedOut] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [authState, setAuthState] = useState<'loading' | 'in' | 'out'>('loading');
  const [authUser,  setAuthUser]  = useState<AuthUser | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setFontTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!fontsLoaded && !fontError && !fontTimedOut) return;
    let active = true;
    setStartupError(null);
    SplashScreen.hideAsync().catch(() => {});
    withTimeout((async () => {
      const username = await getLoggedInUser();
      if (username) {
        const accounts = await getSavedAccounts();
        if (!active) return;
        const acct     = accounts.find(a => a.username === username);
        setAuthUser({ username, emoji: acct?.avatarEmoji ?? '🎮', color: acct?.avatarColor ?? '#D0AF66' });
        setAuthState('in');
      } else {
        if (active) setAuthState('out');
      }
    })()).catch(() => {
      if (active) setStartupError('Could not read saved accounts. Check device storage and retry. No saved data has been deleted.');
    });
    return () => { active = false; };
  }, [fontsLoaded, fontError, fontTimedOut, attempt]);

  function handleLogin(username: string, emoji: string, color: string, isNew = false) {
    setAuthUser({ username, emoji, color });
    setAuthState('in');
    clearCompletedMatch();
  }

  function handleLogout() {
    clearCompletedMatch();
    setAuthUser(null);
    setAuthState('out');
  }

  if (startupError) return <StartupState error={startupError} onRetry={() => setAttempt(n => n + 1)} />;
  if (!fontsLoaded && !fontError && !fontTimedOut) return <AppLoadingScreen />;
  if (authState === 'loading')    return <AppLoadingScreen />;

  if (authState === 'out') {
    return (
      <SafeAreaProvider>
        <ErrorBoundary>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <OnboardingScreen onSuccess={handleLogin} />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </ErrorBoundary>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ReducedMotionConfig mode={ReduceMotion.System} />
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <RevenueCatProvider>
            <PlayerProvider key={authUser!.username} username={authUser!.username} onLogout={handleLogout}>
              <PartyProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <OverlayQueueProvider><PlayerEntry /></OverlayQueueProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
              </PartyProvider>
            </PlayerProvider>
          </RevenueCatProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
