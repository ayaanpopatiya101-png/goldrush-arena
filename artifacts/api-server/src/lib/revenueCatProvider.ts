import { ReplitConnectors } from '@replit/connectors-sdk';
import { createHmac } from 'node:crypto';
import type { StoreCampaign } from './storeCampaigns.js';

const connectors = new ReplitConnectors();
export function nativeCustomerId(playerId: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('Purchase identity is unavailable.');
  return `arena_${createHmac('sha256', secret).update(`purchases:${playerId}`).digest('hex')}`;
}
export async function revenueCatGet(path: string): Promise<any> {
  const response = await connectors.proxy('revenuecat', path, { method: 'GET', signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('App-store verification is unavailable. Keep your receipt and retry.');
  return response.json();
}
export function revenueCatProject() {
  const id = process.env.REVENUECAT_PROJECT_ID;
  if (!id) throw new Error('App-store verification is not configured. No reward has been claimed.');
  return `/v2/projects/${encodeURIComponent(id)}`;
}
export async function nativeCampaignProduct(mapping: NonNullable<StoreCampaign['native']['ios']>, campaign: StoreCampaign) {
  const base = revenueCatProject();
  const offering = await revenueCatGet(`${base}/offerings/${encodeURIComponent(mapping.offeringId)}`);
  if (!offering.is_current || offering.state === 'inactive') throw new Error('This native offering is unavailable.');
  if (offering.metadata?.campaign_id !== campaign.id || offering.metadata?.starts_at !== campaign.startsAt
    || offering.metadata?.ends_at !== campaign.endsAt) throw new Error('The store offering and campaign dates do not agree.');
  const packages = await revenueCatGet(`${base}/offerings/${encodeURIComponent(mapping.offeringId)}/packages?expand=items.product&limit=100`);
  const pkg = packages.items?.find((p: any) => p.lookup_key === mapping.packageId);
  if (!pkg) throw new Error('This native package is unavailable.');
  const products = await revenueCatGet(`${base}/offerings/${encodeURIComponent(mapping.offeringId)}/packages/${encodeURIComponent(pkg.id)}/products`);
  const product = products.items?.map((p: any) => p.product ?? p).find((p: any) => p.store_identifier === mapping.productId && p.app_id === mapping.appId && p.state === 'active');
  if (!product || !(product.type === 'non_consumable' || (product.type === 'one_time' && product.one_time?.is_consumable === false)))
    throw new Error('This native product is unavailable.');
  return product;
}

export async function verifiedNativeTransaction(playerId: string, productIdentifier: string, transactionIdentifier: string) {
  const base = revenueCatProject();
  // The server-derived, unguessable customer identity is never a display name or client-supplied customer id.
  let path: string | null = `${base}/customers/${encodeURIComponent(nativeCustomerId(playerId))}/purchases?limit=100`;
  for (let page = 0; path && page < 20; page++) {
    const purchases = await revenueCatGet(path);
    const purchase = purchases.items?.find((p: any) => p.store_purchase_identifier === transactionIdentifier);
    if (purchase) {
      const product = await revenueCatGet(`${base}/products/${encodeURIComponent(purchase.product_id)}`);
      const supportedStore = purchase.store === 'app_store' || purchase.store === 'play_store'
        || (process.env.NODE_ENV !== 'production' && purchase.store === 'test_store');
      if (product.store_identifier !== productIdentifier || purchase.status !== 'owned' || !supportedStore
        || purchase.quantity !== 1 || purchase.ownership !== 'purchased'
        || (process.env.NODE_ENV === 'production' && (purchase.environment !== 'production' || purchase.store === 'test_store')))
        throw new Error('This receipt is not a completed, owned purchase for this product.');
      return { purchase, product };
    }
    path = purchases.next_page ?? null;
    if (path && !path.startsWith(`${base}/customers/`)) throw new Error('Invalid verification response.');
  }
  throw new Error('Purchase is pending verification. No reward added. Retry with the same receipt.');
}
