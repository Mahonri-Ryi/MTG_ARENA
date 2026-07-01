import type { Card, CardSource } from "../types.js";

/**
 * In-memory card source. Used for tests and for fully-offline demos, and as a
 * fallback/cache layer in front of the Scryfall source.
 */
export class LocalCardSource implements CardSource {
  private readonly byId = new Map<number, Card>();

  constructor(cards: Card[] = []) {
    for (const card of cards) this.add(card);
  }

  add(card: Card): void {
    if (card.arenaId !== undefined) this.byId.set(card.arenaId, card);
  }

  has(arenaId: number): boolean {
    return this.byId.has(arenaId);
  }

  async getByArenaId(arenaId: number): Promise<Card | undefined> {
    return this.byId.get(arenaId);
  }

  async getManyByArenaId(arenaIds: number[]): Promise<Card[]> {
    return arenaIds
      .map((id) => this.byId.get(id))
      .filter((c): c is Card => c !== undefined);
  }
}

/**
 * Wraps a primary source (e.g. Scryfall) with an in-memory cache and an
 * optional offline fallback source. Missing lookups fall back to `fallback`,
 * which is what makes the app usable without network access.
 */
export class CachedCardSource implements CardSource {
  private readonly cache: LocalCardSource;

  constructor(
    private readonly primary: CardSource,
    private readonly fallback?: CardSource,
    seed: Card[] = []
  ) {
    this.cache = new LocalCardSource(seed);
  }

  async getByArenaId(arenaId: number): Promise<Card | undefined> {
    if (this.cache.has(arenaId)) return this.cache.getByArenaId(arenaId);
    let card = await this.primary.getByArenaId(arenaId);
    if (!card && this.fallback) card = await this.fallback.getByArenaId(arenaId);
    if (card) this.cache.add(card);
    return card;
  }

  async getManyByArenaId(arenaIds: number[]): Promise<Card[]> {
    const results = await Promise.all(arenaIds.map((id) => this.getByArenaId(id)));
    return results.filter((c): c is Card => c !== undefined);
  }
}
