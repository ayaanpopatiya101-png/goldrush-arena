import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useRevenueCat } from '@/lib/revenuecat';
import { apiUrl } from '@/utils/api';
import { withTimeout } from '@/utils/withTimeout';

/** Read-only pricing. This hook never starts checkout or grants access. */
export function usePlusOffer() {
  const store = useRevenueCat();
  const [web, setWeb] = useState<{ price?: string; loading: boolean }>({ loading: true });
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let active = true;
    withTimeout(fetch(apiUrl('/store/products')))
      .then(async response => {
        if (!response.ok) throw new Error('Catalog unavailable');
        const data = await response.json();
        const products = Array.isArray(data) ? data : data.data;
        const product = products?.find((p: { name: string }) => p.name === 'GoldRush Battle Pass Premium');
        const price = product?.prices?.[0];
        if (!price?.id || typeof price.unit_amount !== 'number' || !price.currency) throw new Error('Plus unavailable');
        const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: price.currency });
        const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
        const formatted = formatter.format(price.unit_amount / 10 ** digits);
        if (active) setWeb({ price: formatted, loading: false });
      })
      .catch(() => { if (active) setWeb({ loading: false }); });
    return () => { active = false; };
  }, []);
  if (Platform.OS === 'web') return {
    price: web.price,
    message: web.loading ? 'Checking Stripe store availability…'
      : web.price ? `Store price: ${web.price}. Web checkout uses Stripe in the Shop.`
      : 'Plus purchase unavailable: the web store has not returned an available price. No checkout starts here.',
  };
  const price = store.getPackage('battle_pass_premium_s1')?.product.priceString;
  return {
    price,
    message: !store.available ? 'Plus purchase unavailable: RevenueCat is not configured for this device.'
      : store.isLoading ? 'Checking app-store availability…'
      : store.error || !price ? 'Plus purchase unavailable: no app-store offer could be loaded.'
      : `Store price: ${price}. Native purchases use your app store through RevenueCat in the Shop.`,
  };
}
