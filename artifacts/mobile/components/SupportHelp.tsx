import React, { useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { Button, SectionLabel } from '@/components/ui/Primitives';
import { palette } from '@/constants/colors';
import { fonts, textScale } from '@/constants/typography';
import { SUPPORT_CONTACT, supportContactUrl } from '@/constants/support';

export function SupportHelp({ onOpenShop }: { onOpenShop: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const contactUrl = supportContactUrl(SUPPORT_CONTACT);

  async function contactSupport() {
    if (!contactUrl) return;
    setError(null);
    try {
      await Linking.openURL(contactUrl);
    } catch {
      setError(`Could not open your email app or browser. Contact ${SUPPORT_CONTACT} directly.`);
    }
  }

  return (
    <View testID="support-help" style={s.root}>
      <SectionLabel title="Purchase help" />
      <Text style={s.body}>Charged but missing an item? Do not buy it again while checking the receipt.</Text>
      <Text style={s.body}>{Platform.OS === 'web'
        ? 'For a web checkout, find your payment receipt and its redemption code. In Shop, choose Redeem and enter the code on the player who should receive it. Keep the receipt if redemption fails.'
        : 'Use the same Apple or Google account that made the purchase. In Shop, open Store and choose Restore purchases for eligible permanent items. Coins and other consumable items are not restored by this action.'}</Text>
      <Text style={s.body}>For a pending or failed payment, check its status in the original store or payment receipt before retrying. Keep the product name, purchase date and transaction reference for support. Never share passwords or full card details.</Text>
      <Button testID="support-open-shop" label="Open Shop" variant="secondary" icon="shopping-bag" onPress={onOpenShop} />
      <SectionLabel title="Save and player help" />
      <Text style={s.body}>Players and progress are saved on this device or browser, not in a cloud account. On the entry screen, use Saved players to select your existing player instead of creating a new one.</Text>
      <Text style={s.body}>Changing devices or browsers will not transfer your progress. Do not uninstall the app or clear app/browser data while troubleshooting: deleted local saves cannot currently be recovered.</Text>
      <SectionLabel title="Contact support" />
      {contactUrl ? (
        <>
          <Text selectable style={s.body}>{SUPPORT_CONTACT}</Text>
          <Button testID="contact-support" label="Contact support" icon="external-link" onPress={() => void contactSupport()} />
        </>
      ) : (
        <Text style={s.body}>A public support contact has not been provided for this pre-release build. Recovery instructions are available here, but contacting the developer will remain unavailable until a real address is configured.</Text>
      )}
      {error ? <Text accessibilityRole="alert" style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { padding: 16, gap: 14, backgroundColor: palette.background },
  body: { fontFamily: fonts.body, fontSize: textScale.body, lineHeight: 23, color: palette.supporting },
  error: { fontFamily: fonts.bodySemiBold, fontSize: textScale.control, lineHeight: 21, color: palette.supporting },
});
