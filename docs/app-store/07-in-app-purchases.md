# In-App Purchase Setup

Create these products in App Store Connect, then mirror the identifiers in RevenueCat. The RevenueCat package identifier is the value the app looks up; the App Store product ID may use your preferred reverse-domain prefix.

| RevenueCat package | Product | Suggested type | Display price |
|---|---|---|---|
| `starter_sack` | Starter Sack — 1,000 Coins | Consumable | $0.99 |
| `gold_pouch` | Gold Pouch — 5,000 Coins | Consumable | $3.99 |
| `treasure_chest` | Treasure Chest — 15,000 Coins | Consumable | $9.99 |
| `dragon_vault` | Dragon Vault — 50,000 Coins | Consumable | $24.99 |
| `extra_life_1` | 1 Extra Life | Consumable | $1.99 |
| `extra_lives_3` | 3 Extra Lives | Consumable | $2.99 |
| `season_pass` | GoldRush Season Pass | Non-consumable | $4.99 |
| `inferno_pack` | Inferno Pack | Non-consumable | $1.99 |
| `void_striker_pack` | Void Striker Pack | Non-consumable | $1.99 |
| `elite_bundle` | Elite Bundle | Non-consumable | $4.99 |
| `battle_pass_premium_s1` | Battle Pass Premium — Season 1 | Non-consumable | $4.99 |

## RevenueCat checklist

1. Add the iOS app with bundle ID `com.goldrush.arena`.
2. Connect the App Store Connect API key.
3. Import the App Store products.
4. Create a `current` offering.
5. Attach every product using the package identifiers in the table.
6. Add the public iOS SDK key to the release environment as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`.
7. Test purchases and restoration with an Apple sandbox account.
8. Submit the in-app purchase products with the first app version.

Do not add redeemable codes or a web checkout link to the iOS purchase flow. The shipped iOS interface must use Apple In-App Purchase for digital goods.
