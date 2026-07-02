import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  Coach,
  LocalCardSource,
  sampleCards,
  sampleLogText,
  sampleRatings,
  type MatchState,
  type PickRecommendation,
  type RankedCard
} from "@mtg-coach/core";
import { GRADE_HEX, palette, Pip } from "./theme";

function buildCoach(): Coach {
  return new Coach(new LocalCardSource(sampleCards), {
    ratings: sampleRatings,
    colorCommitmentWeight: 8
  });
}

/** Accept either a raw log blob or a bare comma-separated list of arena ids. */
function toLogText(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return sampleLogText;
  if (/draft/i.test(trimmed)) return trimmed;
  if (/^[\d,\s]+$/.test(trimmed)) {
    const ids = trimmed.replace(/\s+/g, "");
    return `[UnityCrossThreadLogger]Draft.Notify {"draftId":"manual","SelfPack":1,"SelfPick":1,"PackCards":"${ids}"}`;
  }
  return trimmed;
}

function GradeBadge({ grade, size = 26 }: { grade: string; size?: number }) {
  return (
    <View style={[styles.gradeBadge, { width: size, height: size, backgroundColor: GRADE_HEX[grade] ?? "#888" }]}>
      <Text style={[styles.gradeText, { fontSize: size * 0.5 }]}>{grade}</Text>
    </View>
  );
}

/** The recommended pick, shown Untapped-style as a large hero card. */
function HeroPick({ ranked }: { ranked: RankedCard }) {
  const { card } = ranked;
  return (
    <View style={styles.hero}>
      {card.artCropUrl && (
        <Image source={{ uri: card.artCropUrl }} style={styles.heroArt} resizeMode="cover" blurRadius={1} />
      )}
      <View style={styles.heroOverlay} />
      <View style={styles.heroRow}>
        {card.imageUrl ? (
          <Image source={{ uri: card.imageUrl }} style={styles.heroCard} resizeMode="contain" />
        ) : (
          <View style={[styles.heroCard, styles.cardPlaceholder]} />
        )}
        <View style={styles.heroInfo}>
          <Text style={styles.heroTag}>TOP PICK</Text>
          <Text style={styles.heroName} numberOfLines={2}>
            {card.name}
          </Text>
          <View style={styles.heroScoreRow}>
            <GradeBadge grade={ranked.grade} size={30} />
            <Text style={styles.heroScore}>{ranked.score.toFixed(0)}</Text>
            <Text style={styles.heroScoreLabel}>/100</Text>
            <View style={styles.heroPips}>
              {card.colors.length ? card.colors.map((c) => <Pip key={c} color={c} size={16} />) : <Pip color="C" size={16} />}
            </View>
          </View>
          {ranked.reasons.slice(0, 3).map((r, i) => (
            <Text key={i} style={styles.heroReason} numberOfLines={1}>
              • {r}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

/** A card in the pack grid: full art with grade + score overlays. */
function CardTile({ ranked }: { ranked: RankedCard }) {
  const { card } = ranked;
  return (
    <View style={styles.tile}>
      <View style={styles.tileImageWrap}>
        {card.imageUrl ? (
          <Image source={{ uri: card.imageUrl }} style={styles.tileImage} resizeMode="cover" />
        ) : (
          <View style={[styles.tileImage, styles.cardPlaceholder]}>
            <Text style={styles.muted}>{card.name}</Text>
          </View>
        )}
        <View style={styles.tileGrade}>
          <GradeBadge grade={ranked.grade} size={24} />
        </View>
        <View style={styles.tileScore}>
          <Text style={styles.tileScoreText}>{ranked.score.toFixed(0)}</Text>
        </View>
      </View>
      <Text style={styles.tileName} numberOfLines={1}>
        {card.name}
      </Text>
    </View>
  );
}

export function DraftScreen() {
  const [rec, setRec] = useState<PickRecommendation | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const analyze = useCallback(async (logText: string) => {
    const coach = buildCoach();
    const recommendation = await coach.ingestLog(logText);
    setRec(recommendation);
    setMatch(coach.matchState);
    setColors(coach.committedColors);
  }, []);

  useEffect(() => {
    void analyze(sampleLogText);
  }, [analyze]);

  const packLabel = useMemo(
    () => (rec ? `Pack ${rec.pack.packNumber}, Pick ${rec.pack.pickNumber}` : ""),
    [rec]
  );

  const rest = rec ? rec.ranked.slice(1) : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headRow}>
        <Text style={styles.h1}>Draft Assistant</Text>
        {!!packLabel && <Text style={styles.packMeta}>{packLabel}</Text>}
      </View>

      {colors.length > 0 && (
        <View style={styles.commit}>
          <Text style={styles.commitLabel}>Your colors</Text>
          <View style={styles.pips}>
            {colors.map((c) => (
              <Pip key={c} color={c} size={20} />
            ))}
          </View>
        </View>
      )}

      {rec?.bestPick ? <HeroPick ranked={rec.bestPick} /> : <Text style={styles.empty}>Waiting for a pack…</Text>}

      {rest.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>REST OF PACK</Text>
          <View style={styles.grid}>
            {rest.map((r) => (
              <CardTile key={r.card.arenaId ?? r.card.name} ranked={r} />
            ))}
          </View>
        </>
      )}

      {match && (
        <View style={styles.panel}>
          <Text style={styles.sectionLabel}>MATCH TRACKER</Text>
          <View style={styles.matchLine}>
            <Text style={styles.matchText}>Turn {match.turn}</Text>
            <Text style={styles.matchText}>{match.onThePlay ? "On the play" : "On the draw"}</Text>
          </View>
          <Text style={styles.commitLabel}>Opponent revealed</Text>
          <View style={styles.tags}>
            {match.opponentRevealed.length ? (
              match.opponentRevealed.map((name, i) => (
                <Text key={`${name}-${i}`} style={styles.tag}>
                  {name}
                </Text>
              ))
            ) : (
              <Text style={styles.muted}>nothing yet</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.panel}>
        <Text style={styles.sectionLabel}>ANALYZE A PACK</Text>
        <Text style={styles.help}>Paste a Player.log draft line, or card ids (e.g. 90003,90007,90013).</Text>
        <TextInput
          style={styles.input}
          placeholder="90003,90004,90007,90013"
          placeholderTextColor="#6c7293"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={() => analyze(toLogText(input))}>
            <Text style={styles.buttonText}>Analyze</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonAlt]}
            onPress={() => {
              setInput("");
              void analyze(sampleLogText);
            }}
          >
            <Text style={styles.buttonText}>Sample draft</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  content: { padding: 14 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  h1: { color: palette.text, fontSize: 20, fontWeight: "800" },
  packMeta: { color: palette.accent, fontWeight: "700", fontSize: 13 },
  commit: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  commitLabel: { color: palette.muted, fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  pips: { flexDirection: "row", gap: 4 },
  sectionLabel: { color: palette.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1, marginTop: 16, marginBottom: 8 },

  hero: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,212,71,0.5)",
    backgroundColor: "#181a26"
  },
  heroArt: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", opacity: 0.35 },
  heroOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(16,18,27,0.55)" },
  heroRow: { flexDirection: "row", padding: 12, gap: 12 },
  heroCard: { width: 96, height: 134, borderRadius: 6, backgroundColor: "#000" },
  heroInfo: { flex: 1, justifyContent: "center" },
  heroTag: {
    color: "#1a1a1a",
    backgroundColor: palette.accent,
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden"
  },
  heroName: { color: palette.text, fontSize: 18, fontWeight: "800", marginVertical: 6 },
  heroScoreRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  heroScore: { color: palette.text, fontSize: 26, fontWeight: "800", marginLeft: 4 },
  heroScoreLabel: { color: palette.muted, fontSize: 12, marginRight: 6 },
  heroPips: { flexDirection: "row", gap: 3, marginLeft: "auto" },
  heroReason: { color: palette.muted, fontSize: 11, lineHeight: 16 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "31.5%", marginBottom: 12 },
  tileImageWrap: { position: "relative", borderRadius: 6, overflow: "hidden", aspectRatio: 0.716, backgroundColor: "#000" },
  tileImage: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  cardPlaceholder: { backgroundColor: "#2a2d3d", alignItems: "center", justifyContent: "center" },
  tileGrade: { position: "absolute", top: 4, left: 4 },
  tileScore: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1
  },
  tileScoreText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  tileName: { color: palette.muted, fontSize: 10, marginTop: 3 },

  gradeBadge: { borderRadius: 6, alignItems: "center", justifyContent: "center" },
  gradeText: { fontWeight: "800", color: "#1a1a1a" },

  panel: {
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12
  },
  matchLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  matchText: { color: palette.text, fontSize: 14 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tag: {
    backgroundColor: "rgba(224,83,58,0.2)",
    borderColor: "rgba(224,83,58,0.5)",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: palette.text,
    fontSize: 12
  },
  muted: { color: palette.muted, fontSize: 12, textAlign: "center", paddingHorizontal: 4 },
  empty: { color: palette.muted, fontSize: 13, marginVertical: 20, textAlign: "center" },
  help: { color: palette.muted, fontSize: 12, marginBottom: 8 },
  input: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderRadius: 8,
    color: palette.text,
    padding: 10,
    minHeight: 44,
    fontSize: 13,
    textAlignVertical: "top"
  },
  buttonRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  button: { backgroundColor: palette.brand, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, flex: 1, alignItems: "center" },
  buttonAlt: { backgroundColor: "#3a3f5c" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 13 }
});
