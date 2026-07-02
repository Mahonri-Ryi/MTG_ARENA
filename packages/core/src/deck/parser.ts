import type { Deck, DeckEntry } from "../types";

/**
 * Parse an MTG Arena decklist export into a structured deck.
 *
 * Handles the standard Arena "Export" format, e.g.:
 *
 *   Deck
 *   4 Llanowar Elves (DMU) 168
 *   2 Shivan Dragon (M21) 154
 *
 *   Sideboard
 *   2 Cancel (M21) 51
 *
 * It also tolerates the headerless "copy deck" format (maindeck and sideboard
 * separated by a blank line) and lines without a set/collector suffix
 * (e.g. "4 Llanowar Elves"). A `Companion` section is captured separately.
 */

const SECTION_HEADERS: Record<string, "main" | "sideboard" | "companion" | "commander"> = {
  deck: "main",
  maindeck: "main",
  sideboard: "sideboard",
  companion: "companion",
  commander: "commander"
};

// "<qty> <name>" with an optional "(SET) <collector>" suffix.
const LINE_RE = /^(\d+)\s+(.+?)(?:\s+\(([A-Za-z0-9]{2,6})\)\s+([A-Za-z0-9-]+))?$/;

export function parseDeckList(text: string, name = "Imported Deck"): Deck {
  const deck: Deck = { name, main: [], sideboard: [], createdAt: new Date().toISOString() };

  let section: "main" | "sideboard" | "companion" | "commander" = "main";
  let sawExplicitSection = false;
  let blankSeen = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") {
      blankSeen = true;
      continue;
    }

    const headerKey = line.toLowerCase();
    if (SECTION_HEADERS[headerKey]) {
      section = SECTION_HEADERS[headerKey];
      sawExplicitSection = true;
      blankSeen = false;
      continue;
    }

    const match = LINE_RE.exec(line);
    if (!match) {
      blankSeen = false;
      continue;
    }

    // Headerless format: a blank line between two card blocks separates the
    // maindeck from the sideboard.
    if (!sawExplicitSection && blankSeen && section === "main") {
      section = "sideboard";
    }
    blankSeen = false;

    const entry: DeckEntry = {
      quantity: parseInt(match[1], 10),
      name: match[2].trim(),
      setCode: match[3],
      collectorNumber: match[4]
    };

    if (section === "companion") {
      deck.companion = entry;
    } else if (section === "sideboard") {
      deck.sideboard.push(entry);
    } else {
      // Treat commander as part of the maindeck for stats purposes.
      deck.main.push(entry);
    }
  }

  return deck;
}

/** Unique card names across the maindeck, sideboard, and companion. */
export function deckCardNames(deck: Deck): string[] {
  const names = new Set<string>();
  for (const entry of [...deck.main, ...deck.sideboard, ...(deck.companion ? [deck.companion] : [])]) {
    names.add(entry.name);
  }
  return [...names];
}
