import type { CollectionFilters } from "../types";

const RARITY_TOKENS: Record<string, string> = {
  common: "r:common",
  uncommon: "r:uncommon",
  rare: "r:rare",
  mythic: "r:mythic"
};

/** OR-join a list of Scryfall clauses, parenthesizing when there's more than one. */
function orGroup(clauses: string[]): string | null {
  if (clauses.length === 0) return null;
  if (clauses.length === 1) return clauses[0];
  return `(${clauses.join(" or ")})`;
}

/**
 * Build a Scryfall search query from collection filters. Kept pure and separate
 * from the network layer so it can be unit-tested.
 *
 * Example: { setCode: "dmu", colors: ["R","W"], rarities: ["rare"] }
 *   -> "set:dmu (c:r or c:w) r:rare"
 */
export function buildSearchQuery(filters: CollectionFilters): string {
  const parts: string[] = [];

  if (filters.setCode) parts.push(`set:${filters.setCode.toLowerCase()}`);

  const colorClauses = (filters.colors ?? []).map((c) =>
    c.toUpperCase() === "C" ? "c:c" : `c:${c.toLowerCase()}`
  );
  const colorGroup = orGroup(colorClauses);
  if (colorGroup) parts.push(colorGroup);

  const rarityClauses = (filters.rarities ?? [])
    .map((r) => RARITY_TOKENS[r.toLowerCase()])
    .filter((x): x is string => !!x);
  const rarityGroup = orGroup(rarityClauses);
  if (rarityGroup) parts.push(rarityGroup);

  const typeClauses = (filters.types ?? []).map((t) => `t:${t.toLowerCase()}`);
  const typeGroup = orGroup(typeClauses);
  if (typeGroup) parts.push(typeGroup);

  const name = filters.name?.trim();
  if (name) parts.push(name.includes(" ") ? `name:"${name}"` : `name:${name}`);

  return parts.join(" ").trim();
}
