import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/* ------------------------------------------------------------------ *
 * Design tokens
 * ------------------------------------------------------------------ */

export const palette = {
  bg0: "#0a0c14",
  bg1: "#12141f",
  surface: "#171a29",
  surfaceAlt: "#1e2234",
  line: "rgba(255,255,255,0.07)",
  lineStrong: "rgba(255,255,255,0.14)",
  text: "#eef0f7",
  muted: "#9aa2bd",
  faint: "#69708c",
  accent: "#ffcf5a",
  brand: "#e0533a"
};

export const emberGradient = ["#ff7a3d", "#ffbe4a"] as const;
export const bgGradient = ["#0b0d16", "#12162a", "#0b0d16"] as const;
export const brandGradient = ["#e0533a", "#8b2fb0"] as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22 };

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  },
  soft: {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3
  }
} as const;

export const COLOR_HEX: Record<string, string> = {
  W: "#f7f0d8",
  U: "#4a90e2",
  B: "#7a6b86",
  R: "#e0533a",
  G: "#43a35f"
};

export const COLOR_NAME: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green"
};

export const GRADE_HEX: Record<string, string> = {
  S: "#ffd447",
  A: "#6fe08f",
  B: "#66c6ff",
  C: "#d9d98f",
  D: "#e0a06a",
  F: "#e0687a"
};

export const RARITY_HEX: Record<string, string> = {
  mythic: "#f2662d",
  rare: "#e6c04d",
  uncommon: "#8fb9cf",
  common: "#c2c9d6",
  land: "#a9986f",
  unknown: "#8b93ac"
};

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

export function ScreenGradient({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <LinearGradient colors={bgGradient} style={[{ flex: 1 }, style]}>
      {children}
    </LinearGradient>
  );
}

/** A rounded, bordered surface with soft elevation — the base "card". */
export function Surface({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

/** A colored mana symbol pip. */
export function Pip({ color, size = 18 }: { color: string; size?: number }) {
  const isColorless = !COLOR_HEX[color];
  return (
    <View
      style={[
        styles.pip,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isColorless ? "#c7ccd8" : COLOR_HEX[color]
        }
      ]}
    >
      <Text style={[styles.pipText, { fontSize: size * 0.52, color: color === "W" || isColorless ? "#2a2a2a" : "#fff" }]}>
        {color}
      </Text>
    </View>
  );
}

export function GradeChip({ grade, size = 26 }: { grade: string; size?: number }) {
  return (
    <View style={[styles.grade, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: GRADE_HEX[grade] ?? "#888" }]}>
      <Text style={[styles.gradeText, { fontSize: size * 0.5 }]}>{grade}</Text>
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionText}>{children}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

export function GradientButton({
  label,
  onPress,
  variant = "primary",
  loading,
  style
}: {
  label: ReactNode;
  onPress?: () => void;
  variant?: "primary" | "ghost";
  loading?: boolean;
  style?: ViewStyle;
}) {
  if (variant === "ghost") {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.ghostBtn, style]}>
        {typeof label === "string" ? <Text style={styles.btnText}>{label}</Text> : label}
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[{ flex: style?.flex ?? undefined }, style]}>
      <LinearGradient colors={emberGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryBtn}>
        {loading ? (
          <Text style={styles.btnTextDark}>…</Text>
        ) : typeof label === "string" ? (
          <Text style={styles.btnTextDark}>{label}</Text>
        ) : (
          label
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  surface: {
    backgroundColor: palette.surface,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
    ...shadow.soft
  },
  pip: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.35)"
  },
  pipText: { fontWeight: "900" },
  grade: { alignItems: "center", justifyContent: "center", ...shadow.soft },
  gradeText: { fontWeight: "900", color: "#161616" },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18, marginBottom: 10 },
  sectionText: { color: palette.muted, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  sectionLine: { flex: 1, height: 1, backgroundColor: palette.line },
  primaryBtn: { borderRadius: radius.md, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  ghostBtn: {
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: palette.lineStrong
  },
  btnText: { color: palette.text, fontWeight: "800", fontSize: 13 },
  btnTextDark: { color: "#1a1206", fontWeight: "900", fontSize: 13, letterSpacing: 0.3 },
  btn: {}
});
