import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import type { Card, CollectionFilters, MtgSet } from "@mtg-coach/core";
import { getScryfall } from "./cards";
import { COLOR_HEX, palette, Pip, radius, RARITY_HEX, SectionLabel, shadow, Surface } from "./theme";

const COLORS = ["W", "U", "B", "R", "G", "C"];
const RARITIES = ["common", "uncommon", "rare", "mythic"];
const TYPES = ["Creature", "Instant", "Sorcery", "Artifact", "Enchantment", "Planeswalker", "Land"];

function FilterChip({
  label,
  active,
  color,
  onPress
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive, active && color ? { borderColor: color } : null]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function CollectionScreen() {
  const [sets, setSets] = useState<MtgSet[]>([]);
  const [setQuery, setSetQuery] = useState("");
  const [loadingSets, setLoadingSets] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSet, setActiveSet] = useState<MtgSet | null>(null);

  const [filters, setFilters] = useState<{ colors: string[]; rarities: string[]; types: string[]; name: string }>({
    colors: [],
    rarities: [],
    types: [],
    name: ""
  });
  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  // Always pull the set catalog live from Scryfall so new sets appear the day
  // they publish. Runs on open and on pull-to-refresh.
  const loadSets = useCallback(async () => {
    const s = await getScryfall().listSets();
    setSets(s);
    setLoadingSets(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadSets();
  }, [loadSets]);

  const runSearch = useCallback(
    async (set: MtgSet, f: typeof filters, nextPage: number, append: boolean) => {
      setLoadingCards(true);
      try {
        const query: CollectionFilters = {
          setCode: set.code,
          colors: f.colors,
          rarities: f.rarities,
          types: f.types,
          name: f.name
        };
        const res = await getScryfall().searchCards(query, nextPage);
        setTotal(res.totalCards);
        setHasMore(res.hasMore);
        setPage(nextPage);
        setCards((prev) => (append ? [...prev, ...res.cards] : res.cards));
      } finally {
        setLoadingCards(false);
      }
    },
    []
  );

  const openSet = useCallback(
    (set: MtgSet) => {
      const fresh = { colors: [], rarities: [], types: [], name: "" };
      setActiveSet(set);
      setFilters(fresh);
      setCards([]);
      void runSearch(set, fresh, 1, false);
    },
    [runSearch]
  );

  const applyFilters = useCallback(
    (next: typeof filters) => {
      setFilters(next);
      if (activeSet) void runSearch(activeSet, next, 1, false);
    },
    [activeSet, runSearch]
  );

  // ---- Set list view ----
  if (!activeSet) {
    const filtered = sets.filter(
      (s) =>
        s.name.toLowerCase().includes(setQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(setQuery.toLowerCase())
    );
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadSets();
            }}
            tintColor={palette.accent}
            colors={[palette.accent]}
          />
        }
      >
        <Text style={styles.h1}>Card Sets</Text>
        <Text style={styles.caption}>Live from Scryfall · pull to refresh for new sets</Text>
        <TextInput
          style={styles.search}
          placeholder="Search sets…"
          placeholderTextColor={palette.faint}
          value={setQuery}
          onChangeText={setSetQuery}
        />
        {loadingSets ? (
          <ActivityIndicator color={palette.accent} style={{ marginTop: 30 }} />
        ) : (
          filtered.slice(0, 80).map((s) => (
            <TouchableOpacity key={s.code} activeOpacity={0.85} onPress={() => openSet(s)} style={[styles.setRow, shadow.soft]}>
              <View style={styles.setCode}>
                <Text style={styles.setCodeText}>{s.code.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.setName} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.muted}>
                  {s.cardCount} cards{s.releasedAt ? ` · ${s.releasedAt.slice(0, 4)}` : ""}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    );
  }

  // ---- Cards-in-set view ----
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => setActiveSet(null)} style={styles.backRow}>
        <Text style={styles.back}>‹ All sets</Text>
      </TouchableOpacity>
      <Text style={styles.h1}>{activeSet.name}</Text>
      <Text style={styles.muted}>
        {total} cards match{filters.name || filters.colors.length || filters.rarities.length || filters.types.length ? " your filters" : ""}
      </Text>

      <TextInput
        style={styles.search}
        placeholder="Search card name…"
        placeholderTextColor={palette.faint}
        value={filters.name}
        onChangeText={(t) => applyFilters({ ...filters, name: t })}
      />

      <SectionLabel>COLOR</SectionLabel>
      <View style={styles.chipRow}>
        {COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            activeOpacity={0.8}
            onPress={() => applyFilters({ ...filters, colors: toggle(filters.colors, c) })}
            style={[styles.colorToggle, filters.colors.includes(c) && { borderColor: COLOR_HEX[c] ?? "#c7ccd8", backgroundColor: "rgba(255,255,255,0.08)" }]}
          >
            <Pip color={c} size={18} />
          </TouchableOpacity>
        ))}
      </View>

      <SectionLabel>RARITY</SectionLabel>
      <View style={styles.chipRow}>
        {RARITIES.map((r) => (
          <FilterChip
            key={r}
            label={r}
            active={filters.rarities.includes(r)}
            color={RARITY_HEX[r]}
            onPress={() => applyFilters({ ...filters, rarities: toggle(filters.rarities, r) })}
          />
        ))}
      </View>

      <SectionLabel>TYPE</SectionLabel>
      <View style={styles.chipRow}>
        {TYPES.map((t) => (
          <FilterChip
            key={t}
            label={t}
            active={filters.types.includes(t)}
            onPress={() => applyFilters({ ...filters, types: toggle(filters.types, t) })}
          />
        ))}
      </View>

      <SectionLabel>CARDS</SectionLabel>
      {loadingCards && cards.length === 0 ? (
        <ActivityIndicator color={palette.accent} style={{ marginTop: 20 }} />
      ) : cards.length === 0 ? (
        <Surface>
          <Text style={styles.muted}>No cards match these filters.</Text>
        </Surface>
      ) : (
        <>
          <View style={styles.grid}>
            {cards.map((card, i) => (
              <View key={`${card.name}-${i}`} style={styles.tile}>
                {card.imageUrl ? (
                  <Image
                    source={{ uri: card.imageUrl }}
                    style={[styles.tileImage, { borderColor: RARITY_HEX[card.rarity] ?? RARITY_HEX.unknown }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.tileImage, styles.placeholder]}>
                    <Text style={styles.tileFallback}>{card.name}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
          {hasMore && (
            <TouchableOpacity
              style={styles.loadMore}
              activeOpacity={0.85}
              onPress={() => activeSet && runSearch(activeSet, filters, page + 1, true)}
            >
              {loadingCards ? <ActivityIndicator color={palette.text} /> : <Text style={styles.loadMoreText}>Load more</Text>}
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 24 },
  h1: { color: palette.text, fontSize: 22, fontWeight: "800", marginBottom: 6 },
  caption: { color: palette.faint, fontSize: 11, marginBottom: 2 },
  backRow: { marginBottom: 10 },
  back: { color: palette.accent, fontSize: 15, fontWeight: "700" },
  search: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radius.md,
    color: palette.text,
    padding: 12,
    fontSize: 14,
    marginTop: 10,
    marginBottom: 4
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 10
  },
  setCode: {
    width: 52,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: palette.lineStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  setCodeText: { color: palette.accent, fontWeight: "900", fontSize: 12 },
  setName: { color: palette.text, fontSize: 15, fontWeight: "700" },
  chevron: { color: palette.faint, fontSize: 22 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: palette.line
  },
  chipActive: { backgroundColor: "rgba(255,207,90,0.14)", borderColor: palette.accent },
  chipText: { color: palette.muted, fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  chipTextActive: { color: palette.text },
  colorToggle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.line
  },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "31.5%", marginBottom: 12 },
  tileImage: {
    width: "100%",
    aspectRatio: 0.716,
    borderRadius: 8,
    backgroundColor: "#000",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  placeholder: { backgroundColor: "#22263a" },
  tileFallback: { color: palette.muted, fontSize: 10, textAlign: "center", paddingHorizontal: 4 },

  loadMore: {
    marginTop: 6,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: palette.lineStrong
  },
  loadMoreText: { color: palette.text, fontWeight: "800", fontSize: 13 },
  muted: { color: palette.muted, fontSize: 13, lineHeight: 19 }
});
