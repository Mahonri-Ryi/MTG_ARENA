import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
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

const COLOR_HEX: Record<string, string> = {
  W: "#f8f4d8",
  U: "#3b7dd8",
  B: "#4b3b52",
  R: "#e0533a",
  G: "#3a9b5c"
};

const GRADE_HEX: Record<string, string> = {
  S: "#ffd447",
  A: "#7bd88f",
  B: "#8fd0ff",
  C: "#d9d98f",
  D: "#e0a06a",
  F: "#e06a6a"
};

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

function Pip({ color }: { color: string }) {
  return (
    <View style={[styles.pip, { backgroundColor: COLOR_HEX[color] ?? "#888" }]}>
      <Text style={[styles.pipText, { color: color === "W" ? "#222" : "#fff" }]}>{color}</Text>
    </View>
  );
}

function CardRow({ ranked, best }: { ranked: RankedCard; best: boolean }) {
  return (
    <View style={[styles.cardRow, best && styles.cardRowBest]}>
      <View style={[styles.grade, { backgroundColor: GRADE_HEX[ranked.grade] ?? "#888" }]}>
        <Text style={styles.gradeText}>{ranked.grade}</Text>
      </View>
      <View style={styles.cardMain}>
        <Text style={styles.cardName} numberOfLines={1}>
          {best ? "★ " : ""}
          {ranked.card.name}
        </Text>
        <Text style={styles.cardReasons} numberOfLines={1}>
          {ranked.reasons.join(" · ")}
        </Text>
      </View>
      <View style={styles.pips}>
        {ranked.card.colors.length === 0 ? (
          <View style={[styles.pip, { backgroundColor: "#b8b8b8" }]}>
            <Text style={[styles.pipText, { color: "#222" }]}>C</Text>
          </View>
        ) : (
          ranked.card.colors.map((c) => <Pip key={c} color={c} />)
        )}
      </View>
      <Text style={styles.score}>{ranked.score.toFixed(0)}</Text>
    </View>
  );
}

export default function App() {
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
    () => (rec ? `P${rec.pack.packNumber} · P${rec.pack.pickNumber}` : ""),
    [rec]
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logo}>MTG</Text>
        <Text style={styles.title}>Arena Coach</Text>
        <Text style={styles.subtitle}>Companion</Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>DRAFT ASSISTANT</Text>
          {!!packLabel && <Text style={styles.packMeta}>{packLabel}</Text>}
        </View>

        {colors.length > 0 && (
          <View style={styles.commit}>
            <Text style={styles.commitLabel}>Committed colors: </Text>
            <View style={styles.pips}>
              {colors.map((c) => (
                <Pip key={c} color={c} />
              ))}
            </View>
          </View>
        )}

        {rec ? (
          rec.ranked.map((r, i) => (
            <CardRow key={r.card.arenaId ?? r.card.name} ranked={r} best={i === 0} />
          ))
        ) : (
          <Text style={styles.empty}>No pack analyzed yet.</Text>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>MATCH TRACKER</Text>
        {match ? (
          <View>
            <View style={styles.matchLine}>
              <Text style={styles.matchText}>Turn {match.turn}</Text>
              <Text style={styles.matchText}>{match.onThePlay ? "On the play" : "On the draw"}</Text>
            </View>
            <Text style={styles.commitLabel}>Opponent revealed:</Text>
            <View style={styles.tags}>
              {match.opponentRevealed.length ? (
                match.opponentRevealed.map((name, i) => (
                  <Text key={`${name}-${i}`} style={styles.tag}>
                    {name}
                  </Text>
                ))
              ) : (
                <Text style={styles.empty}>nothing yet</Text>
              )}
            </View>
          </View>
        ) : (
          <Text style={styles.empty}>No active match.</Text>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>ANALYZE A PACK</Text>
        <Text style={styles.help}>
          Paste a Player.log draft line, or a comma-separated list of card ids (try
          90003,90007,90013).
        </Text>
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
            <Text style={styles.buttonText}>Load sample draft</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#10121b" },
  content: { padding: 14, paddingTop: 48 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  logo: {
    backgroundColor: "#e0533a",
    color: "#1a1a1a",
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: "hidden",
    fontSize: 14
  },
  title: { color: "#e8eaf2", fontSize: 18, fontWeight: "700", marginLeft: 8 },
  subtitle: { color: "#9aa0b4", fontSize: 12, marginLeft: 8, marginTop: 4 },
  panel: {
    backgroundColor: "rgba(28,31,44,0.85)",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12
  },
  panelHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  panelTitle: { color: "#9aa0b4", fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  packMeta: { color: "#ffd447", fontWeight: "700" },
  commit: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  commitLabel: { color: "#9aa0b4", fontSize: 12 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: "rgba(255,255,255,0.03)"
  },
  cardRowBest: {
    backgroundColor: "rgba(255,212,71,0.14)",
    borderColor: "rgba(255,212,71,0.4)",
    borderWidth: 1
  },
  grade: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8
  },
  gradeText: { fontWeight: "800", color: "#1a1a1a", fontSize: 12 },
  cardMain: { flex: 1, minWidth: 0 },
  cardName: { color: "#e8eaf2", fontSize: 14, fontWeight: "600" },
  cardReasons: { color: "#9aa0b4", fontSize: 10 },
  pips: { flexDirection: "row", gap: 3 },
  pip: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  pipText: { fontSize: 9, fontWeight: "800" },
  score: { color: "#e8eaf2", fontWeight: "700", fontSize: 14, width: 30, textAlign: "right", marginLeft: 6 },
  matchLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  matchText: { color: "#e8eaf2", fontSize: 14 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tag: {
    backgroundColor: "rgba(224,83,58,0.2)",
    borderColor: "rgba(224,83,58,0.5)",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    color: "#e8eaf2",
    fontSize: 12
  },
  empty: { color: "#9aa0b4", fontSize: 13 },
  help: { color: "#9aa0b4", fontSize: 12, marginBottom: 8 },
  input: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderRadius: 8,
    color: "#e8eaf2",
    padding: 10,
    minHeight: 44,
    fontSize: 13
  },
  buttonRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  button: { backgroundColor: "#e0533a", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, flex: 1, alignItems: "center" },
  buttonAlt: { backgroundColor: "#3a3f5c" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 13 }
});
