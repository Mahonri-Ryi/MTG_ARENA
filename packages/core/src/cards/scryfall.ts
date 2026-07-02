import type { Card, CardRarity, CardSearchPage, CardSource, CollectionFilters, MtgSet } from "../types";
import { buildSearchQuery } from "../collection/query";

const SCRYFALL_BASE = "https://api.scryfall.com";

/** Set types worth showing in a "collection" browser (skip tokens, memorabilia, etc.). */
const BROWSABLE_SET_TYPES = new Set([
  "core",
  "expansion",
  "masters",
  "draft_innovation",
  "alchemy",
  "commander"
]);

/**
 * Minimal fetch signature we depend on. Declared locally (rather than reusing
 * `typeof fetch`) because the DOM and React Native lib typings disagree on the
 * first argument (`RequestInfo | URL` vs `RequestInfo`); we only ever pass a
 * string URL, so this keeps the package portable across both environments.
 */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface ScryfallCard {
  name: string;
  cmc?: number;
  colors?: string[];
  color_identity?: string[];
  rarity?: string;
  type_line?: string;
  oracle_text?: string;
  image_uris?: { normal?: string; small?: string; art_crop?: string };
  arena_id?: number;
}

function mapRarity(rarity: string | undefined, typeLine: string | undefined): CardRarity {
  if (typeLine && /\bLand\b/i.test(typeLine) && !rarity) return "land";
  switch (rarity) {
    case "common":
    case "uncommon":
    case "rare":
    case "mythic":
      return rarity;
    default:
      return "unknown";
  }
}

function toCard(sc: ScryfallCard, arenaId?: number): Card {
  const types = (sc.type_line ?? "")
    .split("//")[0]
    .replace(/—.*/, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return {
    arenaId: sc.arena_id ?? arenaId,
    name: sc.name,
    manaValue: sc.cmc ?? 0,
    colors: sc.colors ?? sc.color_identity ?? [],
    rarity: mapRarity(sc.rarity, sc.type_line),
    types,
    oracleText: sc.oracle_text,
    imageUrl: sc.image_uris?.normal ?? sc.image_uris?.small,
    artCropUrl: sc.image_uris?.art_crop
  };
}

/**
 * Card source backed by the public Scryfall API. Looks cards up by their MTG
 * Arena id via the `/cards/arena/:id` endpoint. Scryfall asks callers to be
 * gentle, so requests are made sequentially with a small delay.
 */
export class ScryfallCardSource implements CardSource {
  private readonly fetchImpl: FetchLike;

  constructor(fetchImpl?: FetchLike, private readonly delayMs = 60) {
    // Wrap the global fetch so it keeps its binding to the realm's global
    // object. Storing/calling `this.fetchImpl(...)` with a bare `fetch`
    // reference throws "Illegal invocation" in browsers (incl. React Native
    // Web), which would otherwise silently return empty results.
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
  }

  async getByArenaId(arenaId: number): Promise<Card | undefined> {
    try {
      const res = await this.fetchImpl(`${SCRYFALL_BASE}/cards/arena/${arenaId}`);
      if (!res.ok) return undefined;
      const json = (await res.json()) as ScryfallCard;
      return toCard(json, arenaId);
    } catch {
      return undefined;
    }
  }

  async getManyByArenaId(arenaIds: number[]): Promise<Card[]> {
    const out: Card[] = [];
    for (const id of arenaIds) {
      const card = await this.getByArenaId(id);
      if (card) out.push(card);
      if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    }
    return out;
  }

  async getByName(name: string): Promise<Card | undefined> {
    try {
      const res = await this.fetchImpl(`${SCRYFALL_BASE}/cards/named?exact=${encodeURIComponent(name)}`);
      if (!res.ok) return undefined;
      const json = (await res.json()) as ScryfallCard;
      return toCard(json);
    } catch {
      return undefined;
    }
  }

  /** List browsable MTG sets (newest first), for the collection UI. */
  async listSets(): Promise<MtgSet[]> {
    try {
      const res = await this.fetchImpl(`${SCRYFALL_BASE}/sets`);
      if (!res.ok) return [];
      const json = (await res.json()) as {
        data?: { code: string; name: string; card_count: number; released_at?: string; set_type: string }[];
      };
      return (json.data ?? [])
        .filter((s) => BROWSABLE_SET_TYPES.has(s.set_type) && s.card_count > 0)
        .map((s) => ({
          code: s.code,
          name: s.name,
          cardCount: s.card_count,
          releasedAt: s.released_at,
          setType: s.set_type
        }))
        .sort((a, b) => (b.releasedAt ?? "").localeCompare(a.releasedAt ?? ""));
    } catch {
      return [];
    }
  }

  /** Search the card catalog with collection filters; paginated (175/page). */
  async searchCards(filters: CollectionFilters, page = 1): Promise<CardSearchPage> {
    const query = buildSearchQuery(filters);
    if (!query) return { cards: [], totalCards: 0, hasMore: false };
    try {
      const url = `${SCRYFALL_BASE}/cards/search?q=${encodeURIComponent(query)}&order=set&unique=cards&page=${page}`;
      const res = await this.fetchImpl(url);
      if (!res.ok) return { cards: [], totalCards: 0, hasMore: false };
      const json = (await res.json()) as { data?: ScryfallCard[]; total_cards?: number; has_more?: boolean };
      return {
        cards: (json.data ?? []).map((sc) => toCard(sc)),
        totalCards: json.total_cards ?? 0,
        hasMore: Boolean(json.has_more)
      };
    } catch {
      return { cards: [], totalCards: 0, hasMore: false };
    }
  }

  /** Batch name lookup via Scryfall's `/cards/collection` endpoint (max 75/req). */
  async getManyByName(names: string[]): Promise<Card[]> {
    const out: Card[] = [];
    for (let i = 0; i < names.length; i += 75) {
      const chunk = names.slice(i, i + 75);
      try {
        const res = await this.fetchImpl(`${SCRYFALL_BASE}/cards/collection`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifiers: chunk.map((name) => ({ name })) })
        });
        if (res.ok) {
          const json = (await res.json()) as { data?: ScryfallCard[] };
          for (const sc of json.data ?? []) out.push(toCard(sc));
        }
      } catch {
        /* skip this chunk on failure */
      }
      if (this.delayMs > 0) await new Promise((r) => setTimeout(r, this.delayMs));
    }
    return out;
  }
}
