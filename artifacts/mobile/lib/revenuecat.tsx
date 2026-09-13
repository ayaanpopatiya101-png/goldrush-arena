import React, { createContext, useContext } from 'react';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

let configured = false;

export function initializeRevenueCat(): boolean {
  if (Platform.OS === 'web') return false;
  if (configured) return true;

  const apiKey = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

  if (!apiKey) {
    console.warn('[RevenueCat] Public API key is unavailable for this platform.');
    return false;
  }

  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  Purchases.configure({ apiKey });
  configured = true;
  return true;
}

function useRevenueCatState() {
  const queryClient = useQueryClient();
  const enabled = Platform.OS !== 'web' && configured;

  const offeringsQuery = useQuery({
    queryKey: ['revenuecat', 'offerings'],
    queryFn: () => Purchases.getOfferings(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => Purchases.purchasePackage(pkg),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['revenuecat'] }),
  });

  const restoreMutation = useMutation({
    mutationFn: () => Purchases.restorePurchases(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['revenuecat'] }),
  });

  const packages = offeringsQuery.data?.current?.availablePackages ?? [];

  return {
    available: enabled,
    packages,
    isLoading: offeringsQuery.isLoading,
    error: offeringsQuery.error,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    getPackage: (identifier: string) => packages.find(pkg => pkg.identifier === identifier),
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
  };
}

type RevenueCatContextValue = ReturnType<typeof useRevenueCatState>;
const RevenueCatContext = createContext<RevenueCatContextValue | null>(null);

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const value = useRevenueCatState();
  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
}

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (!context) throw new Error('useRevenueCat must be used within RevenueCatProvider');
  return context;
}