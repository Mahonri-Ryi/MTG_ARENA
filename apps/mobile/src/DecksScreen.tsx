import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {
  analyzeDeck,
  parseDeckList,
  resolveDeck,
  type Deck,
  type DeckEntry,
  type DeckStats
} from "@mtg-coach/core";
import { getCardSource } from "./cards";
import { addDeck, loadDecks, removeDeckAt } from "./deckStore";
import { COLOR_NAME, palette, Pip } from "./theme";

const EXAMPLE = `Deck
2 Shivan Dragon
4 Llanowar Elves
4 Lightning Strike
2 Serra Angel
2 Divination
3 Cancel
8 Mountain

Sideboard
2 Pacifism`;

function deckColors(deck: Deck): string[] {
  const set = new Set<string>();
  for (const e of deck.main) for (const c of e.card?.colors ?? []) set.add(c);
  return ["W", "U", "B", "R", "G"].filter((c) => set.has(c));
}

function deckSize(deck: Deck): number {
  return deck.main.reduce((n, e) => n + e.quantity, 0);
}

function CardThumb({ entry }: { entry: DeckEntry }) {
  const url = entry.card?.imageUrl;
  return (
    <View style={styles.cardListRow}>
      {url ? (
        <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbQ}>{entry.card ? "?" : "×"}</Text>
        </View>
      )}
      <Text style={styles.qty}>{entry.quantity}×</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName} numberOfLines={1}>
          {entry.name}
        </Text>
        {entry.card && (
          <Text style={styles.cardSub} numberOfLines={1}>
            MV {entry.card.manaValue} · {entry.card.types.join(" ")} · {entry.card.rarity}
          </Text>
        )}
      </View>
      <View style={styles.pips}>
        {(entry.card?.colors ?? []).map((c) => (
          <Pip key={c} color={c} size={16} />
        ))}
      </View>
    </View>
  );
}

function CurveBars({ curve }: { curve: Record<number, number> }) {
  const max = Math.max(1, ...Object.values(curve));
  return (
    <View style={styles.curve}>
      {Object.keys(curve)
        .map(Number)
        .sort((a, b) => a - b)
        .map((mv) => (
          <View key={mv} style={styles.curveCol}>
            <Text style={styles.curveCount}>{curve[mv]}</Text>
            <View style={[styles.curveBar, { height: 6 + (curve[mv] / max) * 70 }]} />
            <Text style={styles.curveLabel}>{mv === 6 ? "6+" : mv}</Text>
          </View>
        ))}
    </View>
  );
}

function StatsView({ deck, stats }: { deck: Deck; stats: DeckStats }) {
  const colorsWithCount = Object.entries(stats.colorCounts).filter(([, n]) => n > 0);
  return (
    <View>
      <View style={styles.statRow}>
        <Text style={styles.statBig}>{stats.totalCards}</Text>
        <Text style={styles.statLabel}>cards</Text>
        <Text style={styles.statBig}>{stats.averageManaValue.toFixed(2)}</Text>
        <Text style={styles.statLabel}>avg MV</Text>
        {stats.unresolved > 0 && <Text style={styles.warn}>{stats.unresolved} unresolved</Text>}
      </View>

      <Text style={styles.subhead}>Colors</Text>
      <View style={styles.colorRow}>
        {colorsWithCount.length ? (
          colorsWithCount.map(([c, n]) => (
            <View key={c} style={styles.colorChip}>
              <Pip color={c} size={16} />
              <Text style={styles.colorChipText}>
                {COLOR_NAME[c]} {n}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>Colorless / unresolved</Text>
        )}
      </View>

      <Text style={styles.subhead}>Mana curve</Text>
      <CurveBars curve={stats.manaCurve} />

      <Text style={styles.subhead}>Types</Text>
      <Text style={styles.types}>
        {Object.entries(stats.typeCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([t, n]) => `${t} ${n}`)
          .join("  ·  ")}
      </Text>

      <Text style={styles.subhead}>Maindeck ({deck.main.length} unique)</Text>
      {deck.main.map((e, i) => (
        <CardThumb key={`${e.name}-${i}`} entry={e} />
      ))}
      {deck.sideboard.length > 0 && (
        <>
          <Text style={styles.subhead}>Sideboard</Text>
          {deck.sideboard.map((e, i) => (
            <CardThumb key={`sb-${e.name}-${i}`} entry={e} />
          ))}
        </>
      )}
    </View>
  );
}

export function DecksScreen() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");

  useEffect(() => {
    void loadDecks().then(setDecks);
  }, []);

  const doImport = useCallback(async () => {
    if (!text.trim()) return;
    setImporting(true);
    try {
      const deck = parseDeckList(text, name.trim() || "Imported Deck");
      await resolveDeck(deck, getCardSource());
      const next = await addDeck(deck);
      setDecks(next);
      setShowImport(false);
      setName("");
      setText("");
      setSelected(0);
    } finally {
      setImporting(false);
    }
  }, [name, text]);

  const doDelete = useCallback(async (index: number) => {
    const next = await removeDeckAt(index);
    setDecks(next);
    setSelected(null);
  }, []);

  // Deck detail view.
  if (selected !== null && decks[selected]) {
    const deck = decks[selected];
    const stats = analyzeDeck(deck);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.detailHead}>
          <TouchableOpacity onPress={() => setSelected(null)}>
            <Text style={styles.back}>‹ Decks</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => doDelete(selected)}>
            <Text style={styles.delete}>Delete</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.deckTitle}>{deck.name}</Text>
        <View style={styles.panel}>
          <StatsView deck={deck} stats={stats} />
        </View>
      </ScrollView>
    );
  }

  // Import form.
  if (showImport) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.detailHead}>
          <TouchableOpacity onPress={() => setShowImport(false)}>
            <Text style={styles.back}>‹ Decks</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.deckTitle}>Import a deck</Text>
        <View style={styles.panel}>
          <Text style={styles.help}>
            In MTG Arena, open a deck → ••• → Export, then paste it here. You can also paste any Arena-format
            decklist (from a website or a friend). No computer needed.
          </Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Deck name (optional)"
            placeholderTextColor="#6c7293"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.textArea}
            placeholder={"Deck\n4 Llanowar Elves (DMU) 168\n..."}
            placeholderTextColor="#6c7293"
            value={text}
            onChangeText={setText}
            multiline
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.buttonAlt]} onPress={() => setText(EXAMPLE)}>
              <Text style={styles.buttonText}>Use example</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={doImport} disabled={importing}>
              {importing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Import deck</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Deck list.
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.listHead}>
        <Text style={styles.deckTitle}>My decks</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowImport(true)}>
          <Text style={styles.buttonText}>+ Import</Text>
        </TouchableOpacity>
      </View>

      {decks.length === 0 ? (
        <View style={styles.panel}>
          <Text style={styles.muted}>
            No deck profiles yet. Tap “+ Import”, then paste an Arena decklist (or use the example) to build a
            profile with full card data, images, colors, and a mana curve — all stored on your phone.
          </Text>
        </View>
      ) : (
        decks.map((deck, i) => (
          <TouchableOpacity key={`${deck.name}-${i}`} style={styles.deckCard} onPress={() => setSelected(i)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.deckCardName}>{deck.name}</Text>
              <Text style={styles.muted}>
                {deckSize(deck)} cards
                {deck.sideboard.length ? ` · ${deck.sideboard.reduce((n, e) => n + e.quantity, 0)} SB` : ""}
              </Text>
            </View>
            <View style={styles.pips}>
              {deckColors(deck).map((c) => (
                <Pip key={c} color={c} size={18} />
              ))}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  content: { padding: 14 },
  listHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  deckTitle: { color: palette.text, fontSize: 20, fontWeight: "800", marginBottom: 8 },
  addBtn: { backgroundColor: palette.brand, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  deckCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10
  },
  deckCardName: { color: palette.text, fontSize: 16, fontWeight: "700", marginBottom: 2 },
  chevron: { color: palette.muted, fontSize: 22, marginLeft: 10 },
  panel: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  detailHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  back: { color: palette.accent, fontSize: 15, fontWeight: "700" },
  delete: { color: "#e06a6a", fontSize: 14, fontWeight: "700" },
  statRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 6, flexWrap: "wrap" },
  statBig: { color: palette.text, fontSize: 22, fontWeight: "800", marginLeft: 8 },
  statLabel: { color: palette.muted, fontSize: 12 },
  warn: { color: "#e0a06a", fontSize: 12, marginLeft: 8 },
  subhead: { color: palette.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1, marginTop: 14, marginBottom: 6 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  colorChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  colorChipText: { color: palette.text, fontSize: 12 },
  types: { color: palette.text, fontSize: 13 },
  curve: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 110, paddingTop: 8 },
  curveCol: { alignItems: "center", flex: 1 },
  curveCount: { color: palette.muted, fontSize: 11, marginBottom: 2 },
  curveBar: { width: 20, backgroundColor: palette.brand, borderRadius: 4 },
  curveLabel: { color: palette.muted, fontSize: 11, marginTop: 4 },
  cardListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
    borderBottomColor: "rgba(255,255,255,0.05)",
    borderBottomWidth: 1
  },
  thumb: { width: 34, height: 48, borderRadius: 4, backgroundColor: "#222" },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  thumbQ: { color: palette.muted, fontWeight: "800" },
  qty: { color: palette.text, fontWeight: "700", width: 26 },
  cardName: { color: palette.text, fontSize: 14, fontWeight: "600" },
  cardSub: { color: palette.muted, fontSize: 11 },
  pips: { flexDirection: "row", gap: 3 },
  muted: { color: palette.muted, fontSize: 13, lineHeight: 19 },
  help: { color: palette.muted, fontSize: 13, marginBottom: 10, lineHeight: 19 },
  nameInput: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderRadius: 8,
    color: palette.text,
    padding: 10,
    marginBottom: 8,
    fontSize: 14
  },
  textArea: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderRadius: 8,
    color: palette.text,
    padding: 10,
    minHeight: 140,
    fontSize: 13,
    textAlignVertical: "top"
  },
  buttonRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  button: { backgroundColor: palette.brand, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, flex: 1, alignItems: "center" },
  buttonAlt: { backgroundColor: "#3a3f5c" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 13 }
});
