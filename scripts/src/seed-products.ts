import { getUncachableStripeClient } from './stripeClient.js';

async function upsertProduct(stripe: any, name: string, description: string, meta: Record<string, string>) {
  const existing = await stripe.products.search({ query: `name:'${name}' AND active:'true'` });
  if (existing.data.length > 0) {
    console.log(`  ✓ already exists: ${name} (${existing.data[0].id})`);
    return existing.data[0];
  }
  const product = await stripe.products.create({ name, description, metadata: meta });
  console.log(`  + created: ${name} (${product.id})`);
  return product;
}

async function upsertPrice(stripe: any, productId: string, unitAmount: number, label: string) {
  const existing = await stripe.prices.list({ product: productId, active: true });
  const match = existing.data.find((p: any) => p.unit_amount === unitAmount);
  if (match) {
    console.log(`    ✓ price already exists: $${(unitAmount / 100).toFixed(2)} (${match.id})`);
    return match;
  }
  const price = await stripe.prices.create({ product: productId, unit_amount: unitAmount, currency: 'usd' });
  console.log(`    + created price $${(unitAmount / 100).toFixed(2)}: ${price.id}  [${label}]`);
  return price;
}

async function seedProducts() {
  console.log('🏆 Seeding GoldRush Arena store products...\n');
  const stripe = await getUncachableStripeClient();

  // ── Coin Packs ──────────────────────────────────────────────────────────────
  console.log('Coin Packs:');

  const starterSack = await upsertProduct(stripe, 'Starter Sack', '1,000 GoldRush coins', {
    reward_type: 'coins', reward_amount: '1000', reward_label: '1,000 Coins',
    category: 'coins', emoji: '🪙',
  });
  await upsertPrice(stripe, starterSack.id, 99, 'Starter Sack');

  const goldPouch = await upsertProduct(stripe, 'Gold Pouch', '5,000 GoldRush coins — great value!', {
    reward_type: 'coins', reward_amount: '5000', reward_label: '5,000 Coins',
    category: 'coins', emoji: '💰',
  });
  await upsertPrice(stripe, goldPouch.id, 399, 'Gold Pouch');

  const treasureChest = await upsertProduct(stripe, 'Treasure Chest', '15,000 GoldRush coins', {
    reward_type: 'coins', reward_amount: '15000', reward_label: '15,000 Coins',
    category: 'coins', emoji: '🎁',
  });
  await upsertPrice(stripe, treasureChest.id, 999, 'Treasure Chest');

  const dragonVault = await upsertProduct(stripe, 'Dragon Vault', '50,000 GoldRush coins — best value!', {
    reward_type: 'coins', reward_amount: '50000', reward_label: '50,000 Coins',
    category: 'coins', emoji: '🐉',
  });
  await upsertPrice(stripe, dragonVault.id, 2499, 'Dragon Vault');

  // ── Season Pass ─────────────────────────────────────────────────────────────
  console.log('\nSeason Pass:');

  const seasonPass = await upsertProduct(stripe, 'GoldRush Season Pass',
    'Unlock all Season Pass tiers instantly — skins, coins, and more', {
    reward_type: 'season_pass', reward_label: 'Season Pass unlocked',
    category: 'pass', emoji: '🌟',
  });
  await upsertPrice(stripe, seasonPass.id, 499, 'Season Pass');

  // ── Skin Packs ──────────────────────────────────────────────────────────────
  console.log('\nSkin Packs:');

  const voidPack = await upsertProduct(stripe, 'Void Striker Pack',
    'Unlock the exclusive Void paddle skin', {
    reward_type: 'skins', reward_skins: 'void', reward_label: 'Void Striker skin',
    category: 'skins', emoji: '🌑',
  });
  await upsertPrice(stripe, voidPack.id, 199, 'Void Striker Pack');

  const infernoPack = await upsertProduct(stripe, 'Inferno Pack',
    'Unlock the blazing Inferno paddle skin', {
    reward_type: 'skins', reward_skins: 'inferno', reward_label: 'Inferno skin',
    category: 'skins', emoji: '🔥',
  });
  await upsertPrice(stripe, infernoPack.id, 199, 'Inferno Pack');

  const eliteBundle = await upsertProduct(stripe, 'Elite Bundle',
    'Chrome + Cosmic skins — two prestige skins at a discount', {
    reward_type: 'skins', reward_skins: 'chrome,cosmic', reward_label: 'Chrome + Cosmic skins',
    category: 'skins', emoji: '💎',
  });
  await upsertPrice(stripe, eliteBundle.id, 499, 'Elite Bundle');

  console.log('\n✅ All products seeded! Run the API server to sync them via webhooks.');
}

seedProducts().catch((err) => { console.error(err); process.exit(1); });
