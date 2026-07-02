import { StyleSheet, Text, View } from "react-native";

export const COLOR_HEX: Record<string, string> = {
  W: "#f8f4d8",
  U: "#3b7dd8",
  B: "#4b3b52",
  R: "#e0533a",
  G: "#3a9b5c"
};

export const GRADE_HEX: Record<string, string> = {
  S: "#ffd447",
  A: "#7bd88f",
  B: "#8fd0ff",
  C: "#d9d98f",
  D: "#e0a06a",
  F: "#e06a6a"
};

export const COLOR_NAME: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green"
};

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
          backgroundColor: isColorless ? "#b8b8b8" : COLOR_HEX[color]
        }
      ]}
    >
      <Text style={[styles.pipText, { color: color === "W" || isColorless ? "#222" : "#fff" }]}>{color}</Text>
    </View>
  );
}

export const palette = {
  bg: "#10121b",
  panel: "rgba(28,31,44,0.85)",
  border: "rgba(255,255,255,0.08)",
  text: "#e8eaf2",
  muted: "#9aa0b4",
  accent: "#ffd447",
  brand: "#e0533a"
};

const styles = StyleSheet.create({
  pip: { alignItems: "center", justifyContent: "center" },
  pipText: { fontSize: 9, fontWeight: "800" }
});
