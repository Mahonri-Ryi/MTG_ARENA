/**
 * Shared domain types for the MTG Arena Coach.
 *
 * These types are platform-agnostic (no Node/DOM specifics) so they can be
 * consumed by both the Electron desktop overlay and the Expo mobile companion.
 */

/** A card as we care about it for coaching purposes. */
export interface Card {
  /** MTG Arena internal id (a.k.a. "arena id"), when known. */
  arenaId?: number;
  name: string;
  manaValue: number;
  /** e.g. ["W", "U"] */
  colors: string[];
  rarity: CardRarity;
  types: string[];
  /** Free-form oracle text, used for lightweight heuristics. */
  oracleText?: string;
  /** Full card image (Scryfall "normal"). */
  imageUrl?: string;
  /** Cropped art only (Scryfall "art_crop"), used for banners/hero art. */
  artCropUrl?: string;
}

export type CardRarity = "common" | "uncommon" | "rare" | "mythic" | "land" | "unknown";

/** A single pick decision the drafter is facing. */
export interface DraftPack {
  draftId: string;
  /** 1-indexed pack number (1..3 in a typical set draft). */
  packNumber: number;
  /** 1-indexed pick number within the pack. */
  pickNumber: number;
  /** Arena ids of the cards currently in the pack. */
  cardIds: number[];
}

/** A ranked card within a pack, produced by the draft engine. */
export interface RankedCard {
  card: Card;
  /** 0-100 composite score; higher is a better pick. */
  score: number;
  /** Letter grade derived from the score (S, A, B, C, D, F). */
  grade: string;
  /** Human-readable reasons contributing to the recommendation. */
  reasons: string[];
}

/** A pick recommendation for a whole pack, best-first. */
export interface PickRecommendation {
  pack: DraftPack;
  ranked: RankedCard[];
  /** Convenience pointer to ranked[0], the recommended pick. */
  bestPick: RankedCard | null;
}

/** High level match/game state distilled from the log. */
export interface MatchState {
  matchId: string;
  turn: number;
  onThePlay: boolean;
  /** Cards the opponent has revealed/played so far (names). */
  opponentRevealed: string[];
  /** Cards remaining (names) in the player's library, if deck is known. */
  playerLibrary: string[];
}

/** Discriminated union of everything the parser can emit. */
export type LogEvent =
  | { kind: "draftPack"; pack: DraftPack; raw: string }
  | { kind: "draftPick"; draftId: string; pack: number; pick: number; cardId: number; raw: string }
  | { kind: "matchStart"; matchId: string; onThePlay: boolean; raw: string }
  | { kind: "turnChange"; matchId: string; turn: number; raw: string }
  | { kind: "cardRevealed"; matchId: string; owner: "self" | "opponent"; cardId: number; raw: string };

/** A source of card data (implemented against Scryfall or local fixtures). */
export interface CardSource {
  getByArenaId(arenaId: number): Promise<Card | undefined>;
  getManyByArenaId(arenaIds: number[]): Promise<Card[]>;
  getByName(name: string): Promise<Card | undefined>;
  getManyByName(names: string[]): Promise<Card[]>;
}

/** One line of a decklist: a quantity of a named card. */
export interface DeckEntry {
  name: string;
  quantity: number;
  /** Optional Arena set code, e.g. "DMU". */
  setCode?: string;
  /** Optional collector number within the set. */
  collectorNumber?: string;
  /** Resolved card data (filled in once looked up). */
  card?: Card;
}

/** A saved deck profile, parsed from an MTG Arena decklist export. */
export interface Deck {
  name: string;
  main: DeckEntry[];
  sideboard: DeckEntry[];
  companion?: DeckEntry;
  /** ISO timestamp of when this profile was created/imported. */
  createdAt?: string;
}

/** Aggregate analysis of a deck, used for the profile view. */
export interface DeckStats {
  /** Total number of cards in the maindeck (sum of quantities). */
  totalCards: number;
  /** Count of colored cards by color symbol (W/U/B/R/G) in the maindeck. */
  colorCounts: Record<string, number>;
  /** Maindeck non-land cards bucketed by mana value (6 = 6+). */
  manaCurve: Record<number, number>;
  /** Count by primary card type (Creature/Instant/Land/...). */
  typeCounts: Record<string, number>;
  /** Average mana value of non-land maindeck cards. */
  averageManaValue: number;
  /** Number of maindeck cards we could not resolve to card data. */
  unresolved: number;
}
