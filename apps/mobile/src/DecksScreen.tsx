import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
import {
  COLOR_HEX,
  COLOR_NAME,
  emberGradient,
  GradientButton,
  palette,
  Pip,
  radius,
  RARITY_HEX,
  SectionLabel,
  shadow,
  Surface
} from "./theme";

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

function bannerArt(deck: Deck): string | undefined {
  const candidates = deck.main
    .map((e) => e.card)
    .filter((c): c is NonNullable<typeof c> => !!c?.artCropUrl && c.rarity !== "land")
    .sort((a, b) => b.manaValue - a.manaValue);
  return (candidates[0] ?? deck.main.find((e) => e.card?.artCropUrl)?.card)?.artCropUrl;
}

function ColorBar({ colors }: { colors: string[] }) {
  if (colors.length === 0) return <View style={[styles.colorBar, { backgroundColor: "#c7ccd8" }]} />;
  return (
    <LinearGradient
      colors={colors.length === 1 ? [COLOR_HEX[colors[0]], COLOR_HEX[colors[0]]] : (colors.map((c) => COLOR_HEX[c] ?? "#888") as [string, string, ...string[]])}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.colorBar}
    />
  );
}

function CardRow({ entry }: { entry: DeckEntry }) {
  const url = entry.card?.imageUrl;
  const rarity = RARITY_HEX[entry.card?.rarity ?? "unknown"] ?? RARITY_HEX.unknown;
  return (
    <View style={styles.cardRow}>
      {url ? (
        <Image source={{ uri: url }} style={[styles.thumb, { borderColor: rarity }]} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder, { borderColor: rarity }]}>
          <Text style={styles.thumbQ}>{entry.card ? "?" : "×"}</Text>
        </View>
      )}
      <Text style={styles.qty}>{entry.quantity}×</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName} numberOfLines={1}>
          {entry.name}
        </Text>
        {entry.card && (
          <View style={styles.cardSubRow}>
            <View style={[styles.rarityDot, { backgroundColor: rarity }]} />
            <Text style={styles.cardSub} numberOfLines={1}>
              MV {entry.card.manaValue} · {entry.card.types.join(" ")} · {entry.card.rarity}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.pips}>
        {(entry.card?.colors ?? []).map((c) => (
          <Pip key={c} color={c} size={15} />
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
            <View style={styles.curveTrack}>
              <LinearGradient colors={emberGradient} style={[styles.curveBar, { height: `${6 + (curve[mv] / max) * 94}%` }]} />
            </View>
            <Text style={styles.curveLabel}>{mv === 6 ? "6+" : mv}</Text>
          </View>
        ))}
    </View>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatsView({ deck, stats }: { deck: Deck; stats: DeckStats }) {
  const colorsWithCount = Object.entries(stats.colorCounts).filter(([, n]) => n > 0);
  return (
    <View>
      <View style={styles.statGrid}>
        <StatTile value={String(stats.totalCards)} label="CARDS" />
        <StatTile value={stats.averageManaValue.toFixed(2)} label="AVG MV" />
        <StatTile value={String(deck.main.length)} label="UNIQUE" />
        <StatTile value={String(deck.sideboard.reduce((n, e) => n + e.quantity, 0))} label="SIDEBOARD" />
      </View>

      <SectionLabel>COLORS</SectionLabel>
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
        {stats.unresolved > 0 && <Text style={styles.warn}>{stats.unresolved} unresolved</Text>}
      </View>

      <SectionLabel>MANA CURVE</SectionLabel>
      <Surface style={styles.curvePanel}>
        <CurveBars curve={stats.manaCurve} />
      </Surface>

      <SectionLabel>TYPES</SectionLabel>
      <View style={styles.typeRow}>
        {Object.entries(stats.typeCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([t, n]) => (
            <View key={t} style={styles.typeChip}>
              <Text style={styles.typeChipText}>
                {t} <Text style={styles.typeChipNum}>{n}</Text>
              </Text>
            </View>
          ))}
      </View>

      <SectionLabel>{`MAINDECK · ${deck.main.length} UNIQUE`}</SectionLabel>
      <Surface style={styles.listPanel}>
        {deck.main.map((e, i) => (
          <CardRow key={`${e.name}-${i}`} entry={e} />
        ))}
      </Surface>
      {deck.sideboard.length > 0 && (
        <>
          <SectionLabel>SIDEBOARD</SectionLabel>
          <Surface style={styles.listPanel}>
            {deck.sideboard.map((e, i) => (
              <CardRow key={`sb-${e.name}-${i}`} entry={e} />
            ))}
          </Surface>
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

  if (selected !== null && decks[selected]) {
    const deck = decks[selected];
    const stats = analyzeDeck(deck);
    const art = bannerArt(deck);
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setSelected(null)} style={styles.backRow}>
          <Text style={styles.back}>‹ All decks</Text>
        </TouchableOpacity>

        {art ? (
          <ImageBackground source={{ uri: art }} style={[styles.banner, shadow.card]} imageStyle={styles.bannerImg}>
            <LinearGradient colors={["rgba(10,12,20,0.15)", "rgba(10,12,20,0.9)"]} style={styles.bannerScrim} />
            <View style={styles.bannerBody}>
              <Text style={styles.bannerTitle}>{deck.name}</Text>
              <View style={styles.bannerMeta}>
                {deckColors(deck).map((c) => (
                  <Pip key={c} color={c} size={18} />
                ))}
                <Text style={styles.bannerCount}>{deckSize(deck)} cards</Text>
                <TouchableOpacity onPress={() => doDelete(selected)}>
                  <Text style={styles.delete}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ImageBackground>
        ) : (
          <Text style={styles.deckTitle}>{deck.name}</Text>
        )}

        <StatsView deck={deck} stats={stats} />
      </ScrollView>
    );
  }

  if (showImport) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setShowImport(false)} style={styles.backRow}>
          <Text style={styles.back}>‹ All decks</Text>
        </TouchableOpacity>
        <Text style={styles.deckTitle}>Import a deck</Text>
        <Surface>
          <Text style={styles.help}>
            In MTG Arena, open a deck → ••• → Export, then paste it here. You can also paste any Arena-format decklist
            from a website or a friend. No computer needed.
          </Text>
          <TextInput
            style={styles.nameInput}
            placeholder="Deck name (optional)"
            placeholderTextColor={palette.faint}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.textArea}
            placeholder={"Deck\n4 Llanowar Elves (DMU) 168\n..."}
            placeholderTextColor={palette.faint}
            value={text}
            onChangeText={setText}
            multiline
          />
          <View style={styles.buttonRow}>
            <GradientButton label="Use example" variant="ghost" onPress={() => setText(EXAMPLE)} style={{ flex: 1 }} />
            <GradientButton
              label={importing ? <ActivityIndicator color="#1a1206" /> : "Import deck"}
              onPress={doImport}
              style={{ flex: 1 }}
            />
          </View>
        </Surface>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.listHead}>
        <Text style={styles.deckTitle}>My decks</Text>
        <GradientButton label="+ Import" onPress={() => setShowImport(true)} style={{ minWidth: 108 }} />
      </View>

      {decks.length === 0 ? (
        <Surface>
          <Text style={styles.muted}>
            No deck profiles yet. Tap “+ Import”, then paste an Arena decklist (or use the example) to build a profile
            with full card data, art, colors, and a mana curve — all stored on your phone.
          </Text>
        </Surface>
      ) : (
        decks.map((deck, i) => (
          <TouchableOpacity key={`${deck.name}-${i}`} activeOpacity={0.85} onPress={() => setSelected(i)} style={[styles.deckCard, shadow.soft]}>
            <ColorBar colors={deckColors(deck)} />
            <View style={styles.deckCardBody}>
              <Text style={styles.deckCardName} numberOfLines={1}>
                {deck.name}
              </Text>
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
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 24 },
  listHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  deckTitle: { color: palette.text, fontSize: 22, fontWeight: "800", marginBottom: 10 },
  backRow: { marginBottom: 10 },
  back: { color: palette.accent, fontSize: 15, fontWeight: "700" },

  deckCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    marginBottom: 12,
    overflow: "hidden"
  },
  colorBar: { width: 6, alignSelf: "stretch" },
  deckCardBody: { flex: 1, paddingVertical: 16, paddingHorizontal: 14 },
  deckCardName: { color: palette.text, fontSize: 16, fontWeight: "800", marginBottom: 3 },
  chevron: { color: palette.faint, fontSize: 24, marginHorizontal: 12 },

  banner: { height: 150, borderRadius: radius.lg, overflow: "hidden", justifyContent: "flex-end", marginBottom: 16 },
  bannerImg: { borderRadius: radius.lg },
  bannerScrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  bannerBody: { padding: 16 },
  bannerTitle: { color: "#fff", fontSize: 26, fontWeight: "900", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 8 },
  bannerMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  bannerCount: { color: "#fff", fontSize: 13, fontWeight: "700", marginLeft: 2 },
  delete: { color: "#ff9b9b", fontSize: 13, fontWeight: "700", marginLeft: "auto" },

  statGrid: { flexDirection: "row", gap: 10 },
  statTile: {
    flex: 1,
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    ...shadow.soft
  },
  statValue: { color: palette.text, fontSize: 20, fontWeight: "900" },
  statLabel: { color: palette.faint, fontSize: 9, fontWeight: "800", letterSpacing: 1, marginTop: 3 },

  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  colorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: palette.line
  },
  colorChipText: { color: palette.text, fontSize: 12, fontWeight: "600" },
  warn: { color: "#e0a06a", fontSize: 12 },

  curvePanel: { paddingVertical: 14 },
  curve: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 120 },
  curveCol: { alignItems: "center", flex: 1 },
  curveCount: { color: palette.muted, fontSize: 11, marginBottom: 4, fontWeight: "700" },
  curveTrack: { width: 22, height: 80, justifyContent: "flex-end", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 5, overflow: "hidden" },
  curveBar: { width: "100%", borderRadius: 5 },
  curveLabel: { color: palette.faint, fontSize: 11, marginTop: 6, fontWeight: "700" },

  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: palette.line },
  typeChipText: { color: palette.text, fontSize: 12, fontWeight: "600" },
  typeChipNum: { color: palette.accent, fontWeight: "900" },

  listPanel: { paddingVertical: 4 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
    borderBottomColor: "rgba(255,255,255,0.05)",
    borderBottomWidth: 1
  },
  thumb: { width: 40, height: 56, borderRadius: 5, backgroundColor: "#222", borderWidth: 1.5 },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  thumbQ: { color: palette.muted, fontWeight: "800" },
  qty: { color: palette.text, fontWeight: "800", width: 28 },
  cardName: { color: palette.text, fontSize: 14, fontWeight: "700" },
  cardSubRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  rarityDot: { width: 7, height: 7, borderRadius: 4 },
  cardSub: { color: palette.muted, fontSize: 11 },
  pips: { flexDirection: "row", gap: 3 },
  muted: { color: palette.muted, fontSize: 13, lineHeight: 20 },
  help: { color: palette.muted, fontSize: 13, marginBottom: 12, lineHeight: 20 },
  nameInput: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radius.md,
    color: palette.text,
    padding: 12,
    marginBottom: 10,
    fontSize: 14
  },
  textArea: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radius.md,
    color: palette.text,
    padding: 12,
    minHeight: 150,
    fontSize: 13,
    textAlignVertical: "top"
  },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 12 }
});
