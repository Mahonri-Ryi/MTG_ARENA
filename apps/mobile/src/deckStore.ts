import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Deck } from "@mtg-coach/core";

const KEY = "mtg-coach:decks";

/**
 * Deck profiles are persisted locally on the device (AsyncStorage, which is
 * backed by localStorage on web). We store the fully-resolved decks so profiles
 * remain viewable offline after their first import.
 */
export async function loadDecks(): Promise<Deck[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Deck[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDecks(decks: Deck[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(decks));
}

export async function addDeck(deck: Deck): Promise<Deck[]> {
  const decks = await loadDecks();
  const next = [deck, ...decks];
  await saveDecks(next);
  return next;
}

export async function removeDeckAt(index: number): Promise<Deck[]> {
  const decks = await loadDecks();
  decks.splice(index, 1);
  await saveDecks(decks);
  return decks;
}
