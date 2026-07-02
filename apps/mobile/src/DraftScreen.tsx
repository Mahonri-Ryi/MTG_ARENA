import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
import {
  GradeChip,
  GradientButton,
  palette,
  Pip,
  radius,
  RARITY_HEX,
  SectionLabel,
  shadow,
  Surface
} from "./theme";

function buildCoach(): Coach {
  return new Coach(new LocalCardSource(sampleCards), { ratings: sampleRatings, colorCommitmentWeight: 8 });
}

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

function HeroPick({ ranked }: { ranked: RankedCard }) {
  const { card } = ranked;
  return (
    <View style={[styles.hero, shadow.card]}>
      {card.artCropUrl && <Image source={{ uri: card.artCropUrl }} style={styles.heroArt} resizeMode="cover" />}
      <LinearGradient
        colors={["rgba(10,12,20,0.35)", "rgba(10,12,20,0.92)"]}
        style={styles.heroScrim}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.heroRow}>
        {card.imageUrl ? (
          <Image source={{ uri: card.imageUrl }} style={styles.heroCard} resizeMode="contain" />
        ) : (
          <View style={[styles.heroCard, styles.placeholder]} />
        )}
        <View style={styles.heroInfo}>
          <LinearGradient colors={["#ffcf5a", "#ff9a3d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topPickTag}>
            <Text style={styles.topPickText}>★ TOP PICK</Text>
          </LinearGradient>
          <Text style={styles.heroName} numberOfLines={2}>
            {card.name}
          </Text>
          <View style={styles.heroScoreRow}>
            <GradeChip grade={ranked.grade} size={34} />
            <Text style={styles.heroScore}>{ranked.score.toFixed(0)}</Text>
            <Text style={styles.heroScoreLabel}>/100</Text>
            <View style={styles.pipRow}>
              {card.colors.length ? card.colors.map((c) => <Pip key={c} color={c} size={17} />) : <Pip color="C" size={17} />}
            </View>
          </View>
          <View style={styles.reasonWrap}>
            {ranked.reasons.slice(0, 3).map((r, i) => (
              <Text key={i} style={styles.reasonChip} numberOfLines={1}>
                {r}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function CardTile({ ranked, rank }: { ranked: RankedCard; rank: number }) {
  const { card } = ranked;
  const rarity = RARITY_HEX[card.rarity] ?? RARITY_HEX.unknown;
  return (
    <View style={styles.tile}>
      <View style={[styles.tileImageWrap, { borderColor: rarity }, shadow.soft]}>
        {card.imageUrl ? (
          <Image source={{ uri: card.imageUrl }} style={styles.tileImage} resizeMode="cover" />
        ) : (
          <View style={[styles.tileImage, styles.placeholder]}>
            <Text style={styles.tileFallback}>{card.name}</Text>
          </View>
        )}
        <View style={styles.tileGrade}>
          <GradeChip grade={ranked.grade} size={22} />
        </View>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{rank}</Text>
        </View>
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={styles.tileFooter}>
          <Text style={styles.tileScore}>{ranked.score.toFixed(0)}</Text>
          <View style={styles.tilePips}>
            {card.colors.slice(0, 2).map((c) => (
              <Pip key={c} color={c} size={13} />
            ))}
          </View>
        </LinearGradient>
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

  const packLabel = useMemo(() => (rec ? `Pack ${rec.pack.packNumber} · Pick ${rec.pack.pickNumber}` : ""), [rec]);
  const rest = rec ? rec.ranked.slice(1) : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headRow}>
        <View>
          <Text style={styles.h1}>Draft Assistant</Text>
          {!!packLabel && <Text style={styles.packMeta}>{packLabel}</Text>}
        </View>
        {colors.length > 0 && (
          <View style={styles.colorsCard}>
            <Text style={styles.colorsLabel}>YOUR COLORS</Text>
            <View style={styles.pipRow}>
              {colors.map((c) => (
                <Pip key={c} color={c} size={20} />
              ))}
            </View>
          </View>
        )}
      </View>

      {rec?.bestPick ? <HeroPick ranked={rec.bestPick} /> : <Text style={styles.empty}>Waiting for a pack…</Text>}

      {rest.length > 0 && (
        <>
          <SectionLabel>REST OF PACK</SectionLabel>
          <View style={styles.grid}>
            {rest.map((r, i) => (
              <CardTile key={r.card.arenaId ?? r.card.name} ranked={r} rank={i + 2} />
            ))}
          </View>
        </>
      )}

      {match && (
        <>
          <SectionLabel>MATCH TRACKER</SectionLabel>
          <Surface>
            <View style={styles.matchLine}>
              <View style={styles.matchStat}>
                <Text style={styles.matchStatBig}>{match.turn}</Text>
                <Text style={styles.matchStatLabel}>TURN</Text>
              </View>
              <View style={styles.matchStat}>
                <Text style={styles.matchStatBig}>{match.onThePlay ? "PLAY" : "DRAW"}</Text>
                <Text style={styles.matchStatLabel}>ON THE</Text>
              </View>
            </View>
            <Text style={styles.miniLabel}>Opponent revealed</Text>
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
          </Surface>
        </>
      )}

      <SectionLabel>ANALYZE A PACK</SectionLabel>
      <Surface>
        <Text style={styles.help}>Paste a Player.log draft line, or card ids (e.g. 90003,90007,90013).</Text>
        <TextInput
          style={styles.input}
          placeholder="90003,90004,90007,90013"
          placeholderTextColor={palette.faint}
          value={input}
          onChangeText={setInput}
          multiline
        />
        <View style={styles.buttonRow}>
          <GradientButton label="Analyze" onPress={() => analyze(toLogText(input))} style={{ flex: 1 }} />
          <GradientButton
            label="Sample draft"
            variant="ghost"
            onPress={() => {
              setInput("");
              void analyze(sampleLogText);
            }}
            style={{ flex: 1 }}
          />
        </View>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 14, paddingBottom: 24 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  h1: { color: palette.text, fontSize: 22, fontWeight: "800" },
  packMeta: { color: palette.accent, fontWeight: "700", fontSize: 12, marginTop: 2 },
  colorsCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: palette.line
  },
  colorsLabel: { color: palette.faint, fontSize: 9, fontWeight: "800", letterSpacing: 1, marginBottom: 4 },

  hero: { borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,207,90,0.4)", backgroundColor: "#12141f" },
  heroArt: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%", opacity: 0.5 },
  heroScrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroRow: { flexDirection: "row", padding: 14, gap: 14 },
  heroCard: { width: 104, height: 145, borderRadius: 8, backgroundColor: "#000" },
  heroInfo: { flex: 1, justifyContent: "center" },
  topPickTag: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  topPickText: { color: "#1a1206", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  heroName: { color: "#fff", fontSize: 19, fontWeight: "800", marginVertical: 7 },
  heroScoreRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  heroScore: { color: "#fff", fontSize: 28, fontWeight: "900", marginLeft: 3 },
  heroScoreLabel: { color: palette.muted, fontSize: 12, marginRight: 4 },
  pipRow: { flexDirection: "row", gap: 4 },
  reasonWrap: { gap: 4 },
  reasonChip: {
    color: palette.text,
    fontSize: 11,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    overflow: "hidden"
  },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "31.5%", marginBottom: 14 },
  tileImageWrap: { position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: 0.716, backgroundColor: "#000", borderWidth: 2 },
  tileImage: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  tileFallback: { color: palette.muted, fontSize: 11, textAlign: "center", paddingHorizontal: 4 },
  placeholder: { backgroundColor: "#22263a", alignItems: "center", justifyContent: "center" },
  tileGrade: { position: "absolute", top: 5, left: 5 },
  rankBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1
  },
  rankText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  tileFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 6,
    paddingBottom: 5,
    paddingTop: 18
  },
  tileScore: { color: "#fff", fontWeight: "900", fontSize: 15 },
  tilePips: { flexDirection: "row", gap: 2 },
  tileName: { color: palette.muted, fontSize: 10, marginTop: 5, fontWeight: "600" },

  matchLine: { flexDirection: "row", gap: 24, marginBottom: 12 },
  matchStat: { alignItems: "flex-start" },
  matchStatBig: { color: palette.text, fontSize: 22, fontWeight: "900" },
  matchStatLabel: { color: palette.faint, fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  miniLabel: { color: palette.muted, fontSize: 11, fontWeight: "700", marginBottom: 6 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    backgroundColor: "rgba(224,83,58,0.18)",
    borderColor: "rgba(224,83,58,0.5)",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    color: palette.text,
    fontSize: 12
  },
  muted: { color: palette.muted, fontSize: 12 },
  empty: { color: palette.muted, fontSize: 13, marginVertical: 24, textAlign: "center" },
  help: { color: palette.muted, fontSize: 12, marginBottom: 10 },
  input: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radius.md,
    color: palette.text,
    padding: 12,
    minHeight: 46,
    fontSize: 13,
    textAlignVertical: "top"
  },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 12 }
});
