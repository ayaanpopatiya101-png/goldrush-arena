/** Owner-approved mappings only. Prices and product availability always come from providers.
 * No campaigns are approved yet. Never turn an example price into a live offer.
 */
export interface StoreCampaign {
  id: string;
  title: string;
  approvedByOwner: boolean;
  startsAt: string;
  endsAt: string;
  // A campaign has one purchase per guest identity, across both providers.
  reward: { rewardType: 'skins'; rewardSkins: string[]; label: string };
  stripePriceId: string;
  native: Partial<Record<'ios' | 'android', {
    offeringId: string; packageId: string; productId: string; appId: string;
  }>>;
}

export const storeCampaigns: readonly StoreCampaign[] = [];

export function campaignState(c: StoreCampaign, now: number): 'available' | 'upcoming' | 'expired' | 'unavailable' {
  const start = Date.parse(c.startsAt), end = Date.parse(c.endsAt);
  if (!c.approvedByOwner || !c.startsAt.endsWith('Z') || !c.endsAt.endsWith('Z')
    || !Number.isFinite(start) || !Number.isFinite(end) || end <= start
    || c.reward.rewardType !== 'skins' || !c.reward.rewardSkins.length
    || c.reward.rewardSkins.some(s => !['void', 'inferno', 'chrome', 'cosmic'].includes(s))) return 'unavailable';
  return now < start ? 'upcoming' : now >= end ? 'expired' : 'available';
}

export function assertCampaign(c: StoreCampaign | undefined, now: number): asserts c is StoreCampaign {
  if (!c || campaignState(c, now) !== 'available') throw new Error('This offer is not active. No purchase was started.');
}

export function sameSkins(actual: string[], expected: string[]) {
  return [...actual].sort().join(',') === [...expected].sort().join(',');
}
