import { useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { DraftScreen } from "./src/DraftScreen";
import { DecksScreen } from "./src/DecksScreen";
import { CollectionScreen } from "./src/CollectionScreen";
import { bgGradient, emberGradient, palette } from "./src/theme";

type Tab = "decks" | "cards" | "draft";

const TABS: { key: Tab; label: string; glyph: string }[] = [
  { key: "decks", label: "Decks", glyph: "▤" },
  { key: "cards", label: "Cards", glyph: "◧" },
  { key: "draft", label: "Draft", glyph: "◈" }
];

export default function App() {
  const [tab, setTab] = useState<Tab>("decks");

  return (
    <LinearGradient colors={bgGradient} style={styles.root}>
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" />

        <View style={styles.header}>
          <LinearGradient colors={emberGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoMark}>
            <Text style={styles.logoGlyph}>✦</Text>
          </LinearGradient>
          <View>
            <Text style={styles.title}>Arena Coach</Text>
            <Text style={styles.subtitle}>Draft & deck intelligence</Text>
          </View>
        </View>

        <View style={styles.body}>
          {tab === "draft" ? <DraftScreen /> : tab === "cards" ? <CollectionScreen /> : <DecksScreen />}
        </View>

        <View style={styles.tabBar}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity key={t.key} style={styles.tab} activeOpacity={0.8} onPress={() => setTab(t.key)}>
                <View style={[styles.tabInner, active && styles.tabInnerActive]}>
                  <Text style={[styles.tabGlyph, active && styles.tabTextActive]}>{t.glyph}</Text>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 40, paddingBottom: 12 },
  logoMark: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  logoGlyph: { color: "#1a1206", fontSize: 18, fontWeight: "900" },
  title: { color: palette.text, fontSize: 18, fontWeight: "800", letterSpacing: 0.2 },
  subtitle: { color: palette.faint, fontSize: 11, marginTop: 1 },
  body: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopColor: palette.line,
    borderTopWidth: 1,
    backgroundColor: "rgba(8,10,16,0.6)",
    gap: 8
  },
  tab: { flex: 1 },
  tabInner: { alignItems: "center", paddingVertical: 8, borderRadius: 12, flexDirection: "row", justifyContent: "center", gap: 6 },
  tabInnerActive: { backgroundColor: "rgba(255,207,90,0.12)", borderWidth: 1, borderColor: "rgba(255,207,90,0.35)" },
  tabGlyph: { color: palette.faint, fontSize: 14 },
  tabText: { color: palette.faint, fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: palette.accent }
});
