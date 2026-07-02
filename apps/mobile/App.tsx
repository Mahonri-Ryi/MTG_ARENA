import { useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DraftScreen } from "./src/DraftScreen";
import { DecksScreen } from "./src/DecksScreen";
import { palette } from "./src/theme";

type Tab = "draft" | "decks";

export default function App() {
  const [tab, setTab] = useState<Tab>("decks");

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.logo}>MTG</Text>
        <Text style={styles.title}>Arena Coach</Text>
      </View>

      <View style={styles.body}>{tab === "draft" ? <DraftScreen /> : <DecksScreen />}</View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tab} onPress={() => setTab("decks")}>
          <Text style={[styles.tabText, tab === "decks" && styles.tabActive]}>Decks</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setTab("draft")}>
          <Text style={[styles.tabText, tab === "draft" && styles.tabActive]}>Draft</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 40, paddingBottom: 10 },
  logo: {
    backgroundColor: palette.brand,
    color: "#1a1a1a",
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: "hidden",
    fontSize: 14
  },
  title: { color: palette.text, fontSize: 18, fontWeight: "700", marginLeft: 8 },
  body: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderTopColor: palette.border,
    borderTopWidth: 1,
    backgroundColor: "rgba(0,0,0,0.3)"
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 14 },
  tabText: { color: palette.muted, fontSize: 14, fontWeight: "700" },
  tabActive: { color: palette.accent }
});
