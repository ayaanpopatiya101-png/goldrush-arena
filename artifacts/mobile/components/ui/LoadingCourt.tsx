import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Text";

/** Static placeholders preserve layout without decorative shimmer or fake values. */
export function LoadingRows({ label = "Loading…" }: { label?: string }) {
  return (
    <View
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={s.rows}
    >
      <Text style={s.label}>{label}</Text>
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={s.row}
          importantForAccessibility="no-hide-descendants"
        >
          <View style={[s.line, { width: "56%" }]} />
          <View style={[s.line, { width: "22%" }]} />
        </View>
      ))}
    </View>
  );
}
export function LoadingCourt() {
  return (
    <View style={s.page}>
      <View style={s.masthead} />
      <View style={s.court} />
      <LoadingRows label="Loading your player…" />
    </View>
  );
}
const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#191B19",
    padding: 24,
    paddingTop: 64,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  masthead: {
    height: 24,
    width: "48%",
    backgroundColor: "#34382F",
    marginBottom: 40,
  },
  court: {
    height: 204,
    backgroundColor: "#222520",
    borderWidth: 1,
    borderColor: "#34382F",
  },
  rows: { paddingVertical: 24, width: "100%" },
  label: { fontSize: 14, color: "#B9BDAF", marginBottom: 12 },
  row: {
    flexDirection: "row",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#34382F",
  },
  line: { height: 12, backgroundColor: "#34382F" },
});
