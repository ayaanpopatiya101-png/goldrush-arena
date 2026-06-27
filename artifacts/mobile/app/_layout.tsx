import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PlayerProvider, getSavedAccounts, getLoggedInUser } from '@/context/PlayerContext';
import OnboardingScreen from '@/app/onboarding';
import { CinematicSplash, cinemaHasShown } from '@/components/CinematicSplash';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
      <Stack.Screen name="lobby"     options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="game"      options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="postgame"  options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="settings"  options={{ headerShown: false, animation: 'slide_from_right' }} />
    </Stack>
  );
}

interface AuthUser { username: string; emoji: string; color: string }

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });
  const [authState, setAuthState] = useState<'loading' | 'in' | 'out'>('loading');
  const [authUser,  setAuthUser]  = useState<AuthUser | null>(null);
  const [showCinematic, setShowCinematic] = useState(!cinemaHasShown());

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    SplashScreen.hideAsync();
    getLoggedInUser().then(async username => {
      if (username) {
        const accounts = await getSavedAccounts();
        const acct     = accounts.find(a => a.username === username);
        setAuthUser({ username, emoji: acct?.avatarEmoji ?? '🎮', color: acct?.avatarColor ?? '#FFD700' });
        setAuthState('in');
      } else {
        setAuthState('out');
      }
    });
  }, [fontsLoaded, fontError]);

  function handleLogin(username: string, emoji: string, color: string) {
    setAuthUser({ username, emoji, color });
    setAuthState('in');
  }

  function handleLogout() {
    setAuthUser(null);
    setAuthState('out');
  }

  if (!fontsLoaded && !fontError) return null;
  if (authState === 'loading')    return null;

  if (authState === 'out') {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onSuccess={handleLogin} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <PlayerProvider username={authUser!.username} onLogout={handleLogout}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
                {showCinematic && (
                  <CinematicSplash onDone={() => setShowCinematic(false)} />
                )}
              </KeyboardProvider>
            </GestureHandlerRootView>
          </PlayerProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
