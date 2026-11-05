import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import LegalScreen from "./legal";
import { Text } from "@/components/ui/Text";
import {
  getSavedAccounts,
  loginAccount,
  type SavedAccountMeta,
} from "@/context/PlayerContext";

interface Props {
  onSuccess: (
    name: string,
    avatar: string,
    color: string,
    isNew?: boolean,
  ) => void;
}
export default function Onboarding({ onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [accounts, setAccounts] = useState<SavedAccountMeta[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [legalOpen, setLegalOpen] = useState(false);
  useEffect(() => {
    getSavedAccounts()
      .then(setAccounts)
      .catch(() =>
        setError("Saved players could not be loaded. Try reopening the app."),
      );
  }, []);
  async function enter(account?: SavedAccountMeta) {
    if (busy) return;
    const value = (account?.username ?? name).trim();
    if (!/^[a-zA-Z0-9_]{2,16}$/.test(value)) {
      setError("Use 2 to 16 letters, numbers, or underscores");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const existing =
        account ??
        accounts.find((a) => a.username.toLowerCase() === value.toLowerCase());
      const username = existing?.username ?? value;
      const avatar = existing?.avatarEmoji ?? "GR";
      const color = existing?.avatarColor ?? "#D0AF66";
      await loginAccount(username, avatar, color);
      onSuccess(username, avatar, color, !existing);
    } catch {
      setError("Your player could not be saved. Please try again.");
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.masthead}>
          <Feather name="target" size={22} color="#D0AF66" />
          <Text style={s.brand}>GoldRush Arena</Text>
          <Text style={s.edition}>01</Text>
        </View>
        <Text style={s.title}>Four sides.{"\n"}One survivor.</Text>
        <Text style={s.intro}>
          Defend your goal. Read the rebound. Stay in the arena when everyone
          else is out.
        </Text>
        <View style={s.court} accessibilityLabel="Four-sided air hockey court">
          <View style={[s.paddle, { top: 16 }]} />
          <View
            style={[s.paddle, { bottom: 16, backgroundColor: "#D0AF66" }]}
          />
          <View style={[s.sidePaddle, { left: 16 }]} />
          <View style={[s.sidePaddle, { right: 16 }]} />
          <View style={s.centerCircle} />
          <View style={s.ball} />
          <Text style={s.courtLabel}>Your side</Text>
        </View>
        <Text style={s.label}>Your player name</Text>
        <TextInput
          accessibilityLabel="Player name"
          value={name}
          onChangeText={setName}
          onSubmitEditing={() => enter()}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={16}
          placeholder="Choose a name"
          placeholderTextColor="#949A89"
          style={s.input}
          returnKeyType="go"
          editable={!busy}
        />
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => enter()}
          style={[s.primary, busy && { opacity: 0.6 }]}
        >
          <Text style={s.primaryText}>
            {busy ? "Saving player…" : "Enter the arena"}
          </Text>
          <Feather name="play" size={18} color="#191B19" />
        </Pressable>
        <Text style={s.note}>
          Progress stays on this device. No email or password needed.
        </Text>
        {accounts.length > 0 && (
          <View style={s.saved}>
            <Text style={s.label}>Continue a saved player</Text>
            {accounts.map((a) => (
              <Pressable
                key={a.username}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => enter(a)}
                style={s.savedRow}
              >
                <Text style={s.savedName}>{a.username}</Text>
                <Text style={s.note}>{a.rank}</Text>
                <Feather name="log-in" size={18} color="#B9BDAF" />
              </Pressable>
            ))}
          </View>
        )}
        <View style={s.legal}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setLegalOpen(true)}
          >
            <Text style={s.link}>Privacy policy & terms of service</Text>
          </Pressable>
        </View>
      </ScrollView>
      <Modal
        visible={legalOpen}
        onRequestClose={() => setLegalOpen(false)}
        animationType="slide"
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#191B19",
            paddingTop: insets.top,
          }}
        >
          <Pressable
            accessibilityLabel="Close legal information"
            onPress={() => setLegalOpen(false)}
            style={{ padding: 16 }}
          >
            <Text>Close</Text>
          </Pressable>
          <LegalScreen />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#191B19" },
  content: {
    paddingHorizontal: 24,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
  masthead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderColor: "#34382F",
  },
  brand: { flex: 1, fontSize: 18 },
  edition: { fontSize: 14, color: "#949A89", fontVariant: ["tabular-nums"] },
  title: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 56,
    lineHeight: 54,
    marginTop: 32,
  },
  intro: {
    color: "#B9BDAF",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
    maxWidth: 360,
  },
  court: {
    height: 192,
    borderWidth: 1,
    borderColor: "#666B5E",
    marginVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#222520",
  },
  paddle: {
    position: "absolute",
    width: 64,
    height: 6,
    backgroundColor: "#A6AEA7",
  },
  sidePaddle: {
    position: "absolute",
    height: 48,
    width: 6,
    backgroundColor: "#A6AEA7",
  },
  centerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "#51564B",
  },
  ball: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EEE7D8",
    transform: [{ translateX: 40 }, { translateY: -20 }],
  },
  courtLabel: {
    position: "absolute",
    bottom: 28,
    fontSize: 11,
    color: "#D0AF66",
  },
  label: { fontSize: 14, color: "#B9BDAF", marginBottom: 8 },
  input: {
    borderColor: "#666B5E",
    borderWidth: 1,
    borderRadius: 2,
    minHeight: 52,
    paddingHorizontal: 16,
    fontSize: 17,
    color: "#EEE7D8",
    backgroundColor: "#222520",
  },
  primary: {
    marginTop: 12,
    minHeight: 52,
    backgroundColor: "#D0AF66",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderRadius: 2,
  },
  primaryText: { color: "#191B19", fontSize: 16, fontWeight: "600" },
  note: { fontSize: 12, color: "#B9BDAF", lineHeight: 18, marginTop: 12 },
  error: { color: "#D79A85", marginTop: 8 },
  saved: { marginTop: 28 },
  savedRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderBottomWidth: 1,
    borderColor: "#34382F",
  },
  savedName: { flex: 1, fontSize: 16 },
  legal: { flexDirection: "row", gap: 24, marginTop: 32 },
  link: { color: "#B9BDAF", fontSize: 12, textDecorationLine: "underline" },
});
