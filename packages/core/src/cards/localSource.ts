import type { Card, CardSource } from "../types";

/**
 * In-memory card source. Used for tests and for fully-offline demos, and as a
 * fallback/cache layer in front of the Scryfall source.
 */
export class LocalCardSource implements CardSource {
  private readonly byId = new Map<number, Card>();
  private readonly byName = new Map<string, Card>();

  constructor(cards: Card[] = []) {
    for (const card of cards) this.add(card);
  }

  add(card: Card): void {
    if (card.arenaId !== undefined) this.byId.set(card.arenaId, card);
    this.byName.set(card.name.toLowerCase(), card);
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

  async getByName(name: string): Promise<Card | undefined> {
    return this.byName.get(name.toLowerCase());
  }

  async getManyByName(names: string[]): Promise<Card[]> {
    return names
      .map((n) => this.byName.get(n.toLowerCase()))
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

  async getByName(name: string): Promise<Card | undefined> {
    const cached = await this.cache.getByName(name);
    if (cached) return cached;
    let card = await this.primary.getByName(name);
    if (!card && this.fallback) card = await this.fallback.getByName(name);
    if (card) this.cache.add(card);
    return card;
  }

  async getManyByName(names: string[]): Promise<Card[]> {
    // Serve what we can from cache, batch-fetch the rest from the primary, and
    // fall back to the offline source for anything still missing.
    const missing: string[] = [];
    const found: Card[] = [];
    for (const name of names) {
      const cached = await this.cache.getByName(name);
      if (cached) found.push(cached);
      else missing.push(name);
    }

    if (missing.length > 0) {
      const fetched = await this.primary.getManyByName(missing);
      for (const card of fetched) this.cache.add(card);
      found.push(...fetched);

      const resolvedNames = new Set(fetched.map((c) => c.name.toLowerCase()));
      const stillMissing = missing.filter((n) => !resolvedNames.has(n.toLowerCase()));
      if (stillMissing.length > 0 && this.fallback) {
        const fromFallback = await this.fallback.getManyByName(stillMissing);
        for (const card of fromFallback) this.cache.add(card);
        found.push(...fromFallback);
      }
    }
    return found;
  }
}
