import type { Card, CardRarity, CardSource } from "../types";

const SCRYFALL_BASE = "https://api.scryfall.com";

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
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly delayMs = 60
  ) {}

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
