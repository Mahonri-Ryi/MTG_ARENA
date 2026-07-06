import type { Card, CardSource, Deck, DeckStats } from "../types";
import { deckCardNames } from "./parser";

const COLORS = ["W", "U", "B", "R", "G"];

function isLand(card: Card): boolean {
  return card.rarity === "land" || card.types.some((t) => /land/i.test(t));
}

function primaryType(card: Card): string {
  const order = ["Creature", "Planeswalker", "Instant", "Sorcery", "Artifact", "Enchantment", "Battle", "Land"];
  for (const t of order) {
    if (card.types.some((ct) => ct.toLowerCase() === t.toLowerCase())) return t;
  }
  return card.types[0] ?? "Other";
}

/**
 * Resolve every card in the deck to card data using the given source, filling
 * in `entry.card`. Returns the same deck instance for convenience.
 */
export async function resolveDeck(deck: Deck, cards: CardSource): Promise<Deck> {
  const names = deckCardNames(deck);
  const resolved = await cards.getManyByName(names);
  const byName = new Map(resolved.map((c) => [c.name.toLowerCase(), c]));

  const fill = (entry: { name: string; card?: Card }) => {
    entry.card = byName.get(entry.name.toLowerCase());
  };
  deck.main.forEach(fill);
  deck.sideboard.forEach(fill);
  if (deck.companion) fill(deck.companion);
  return deck;
}

/** Compute maindeck statistics for the profile view. */
export function analyzeDeck(deck: Deck): DeckStats {
  const colorCounts: Record<string, number> = {};
  const manaCurve: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const typeCounts: Record<string, number> = {};
  for (const c of COLORS) colorCounts[c] = 0;

  let totalCards = 0;
  let unresolved = 0;
  let nonLandCount = 0;
  let manaValueSum = 0;

  for (const entry of deck.main) {
    totalCards += entry.quantity;
    const card = entry.card;
    if (!card) {
      unresolved += entry.quantity;
      continue;
    }

    for (const color of card.colors) {
      if (colorCounts[color] !== undefined) colorCounts[color] += entry.quantity;
    }

    const type = primaryType(card);
    typeCounts[type] = (typeCounts[type] ?? 0) + entry.quantity;

    if (!isLand(card)) {
      nonLandCount += entry.quantity;
      manaValueSum += card.manaValue * entry.quantity;
      const bucket = Math.min(6, Math.max(0, Math.round(card.manaValue)));
      manaCurve[bucket] += entry.quantity;
    }
  }

  return {
    totalCards,
    colorCounts,
    manaCurve,
    typeCounts,
    averageManaValue: nonLandCount > 0 ? manaValueSum / nonLandCount : 0,
    unresolved
  };
}
