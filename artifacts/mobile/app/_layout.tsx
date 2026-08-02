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
import { ActivityIndicator, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PlayerProvider, getSavedAccounts, getLoggedInUser } from '@/context/PlayerContext';
import { PartyProvider } from '@/context/PartyContext';
import OnboardingScreen from '@/app/onboarding';
import { CinematicSplash, cinemaHasShown } from '@/components/CinematicSplash';
import { TutorialOverlay } from '@/components/TutorialOverlay';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AppLoadingScreen() {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#080812', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text style={{ fontSize: 48 }}>👑</Text>
        <Text style={{ color: '#C8820A', fontSize: 12, letterSpacing: 3, fontFamily: 'Inter_700Bold' }}>
          GOLDRUSH ARENA
        </Text>
        <ActivityIndicator color="#C8820A55" size="small" style={{ marginTop: 8 }} />
      </View>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
      <Stack.Screen name="lobby"     options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="game"      options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="postgame"  options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="gauntlet"  options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="settings"  options={{ headerShown: false, animation: 'slide_from_right' }} />
      <Stack.Screen name="legal"     options={{ headerShown: false, animation: 'slide_from_right' }} />
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
  const [showTutorial, setShowTutorial] = useState(false);

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

  function handleLogin(username: string, emoji: string, color: string, isNew = false) {
    setAuthUser({ username, emoji, color });
    setAuthState('in');
    if (isNew) setShowTutorial(true);
  }

  function handleLogout() {
    setAuthUser(null);
    setAuthState('out');
  }

  if (!fontsLoaded && !fontError) return <AppLoadingScreen />;
  if (authState === 'loading')    return <AppLoadingScreen />;

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
            <PartyProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
                {showCinematic && (
                  <CinematicSplash onDone={() => setShowCinematic(false)} />
                )}
                {showTutorial && (
                  <TutorialOverlay onComplete={() => setShowTutorial(false)} />
                )}
              </KeyboardProvider>
            </GestureHandlerRootView>
            </PartyProvider>
          </PlayerProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
