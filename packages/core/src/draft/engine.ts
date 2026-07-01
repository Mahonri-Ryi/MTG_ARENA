import type { Card, DraftPack, PickRecommendation, RankedCard } from "../types.js";

/** Card power ratings keyed by exact card name (0-100 scale, ~win-rate proxy). */
export type RatingsMap = Record<string, number>;

export interface DraftEngineOptions {
  /** External ratings (e.g. distilled from 17lands GIH win rates). */
  ratings?: RatingsMap;
  /**
   * How strongly to bias toward colors we're already committed to.
   * 0 disables color signal; the default gives a modest, human-like lean.
   */
  colorCommitmentWeight?: number;
}

const REMOVAL_HINTS = [
  "destroy target",
  "exile target",
  "deals damage to target",
  "damage to any target",
  "-x/-x",
  "fight",
  "return target creature"
];

const EVASION_HINTS = ["flying", "menace", "trample", "can't be blocked", "unblockable"];
const CARD_ADVANTAGE_HINTS = ["draw a card", "draw two", "draw cards", "create a token"];

function rarityBase(rarity: Card["rarity"]): number {
  switch (rarity) {
    case "mythic":
      return 70;
    case "rare":
      return 66;
    case "uncommon":
      return 58;
    case "common":
      return 52;
    case "land":
      return 55;
    default:
      return 50;
  }
}

function letterGrade(score: number): string {
  if (score >= 85) return "S";
  if (score >= 75) return "A";
  if (score >= 66) return "B";
  if (score >= 58) return "C";
  if (score >= 50) return "D";
  return "F";
}

/**
 * Stateful helper for drafting: as you make picks it tracks your color
 * commitment and factors it into subsequent recommendations, mirroring how a
 * human drafter settles into a two-color pair.
 */
export class DraftEngine {
  private readonly ratings: RatingsMap;
  private readonly colorWeight: number;
  /** Running count of colored pips among cards we've picked. */
  private readonly colorCounts: Record<string, number> = {};

  constructor(options: DraftEngineOptions = {}) {
    this.ratings = options.ratings ?? {};
    this.colorWeight = options.colorCommitmentWeight ?? 6;
  }

  /** Record a pick so future recommendations understand our color lean. */
  registerPick(card: Card): void {
    for (const color of card.colors) {
      this.colorCounts[color] = (this.colorCounts[color] ?? 0) + 1;
    }
  }

  /** The (up to two) colors we're most committed to so far. */
  committedColors(): string[] {
    return Object.entries(this.colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .filter(([, count]) => count > 0)
      .map(([color]) => color);
  }

  private baseScore(card: Card): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    const rated = this.ratings[card.name];
    let score: number;
    if (rated !== undefined) {
      score = rated;
      reasons.push(`Rated ${rated.toFixed(0)}/100 from win-rate data`);
    } else {
      score = rarityBase(card.rarity);
      reasons.push(`${card.rarity} baseline (${score.toFixed(0)})`);
    }

    const text = (card.oracleText ?? "").toLowerCase();
    if (REMOVAL_HINTS.some((h) => text.includes(h))) {
      score += 6;
      reasons.push("Removal / interaction (+6)");
    }
    if (EVASION_HINTS.some((h) => text.includes(h))) {
      score += 3;
      reasons.push("Evasion (+3)");
    }
    if (CARD_ADVANTAGE_HINTS.some((h) => text.includes(h))) {
      score += 3;
      reasons.push("Card advantage (+3)");
    }
    return { score, reasons };
  }

  private colorBonus(card: Card): { delta: number; reason?: string } {
    const committed = this.committedColors();
    if (committed.length === 0 || this.colorWeight === 0 || card.colors.length === 0) {
      return { delta: 0 };
    }
    const onColor = card.colors.every((c) => committed.includes(c));
    const offColor = card.colors.every((c) => !committed.includes(c));
    if (onColor) return { delta: this.colorWeight, reason: `On-color for ${committed.join("")} (+${this.colorWeight})` };
    if (offColor) return { delta: -this.colorWeight, reason: `Off-color splash (-${this.colorWeight})` };
    return { delta: 0 };
  }

  rankCard(card: Card): RankedCard {
    const { score, reasons } = this.baseScore(card);
    const { delta, reason } = this.colorBonus(card);
    if (reason) reasons.push(reason);
    const finalScore = Math.max(0, Math.min(100, score + delta));
    return { card, score: finalScore, grade: letterGrade(finalScore), reasons };
  }

  recommend(pack: DraftPack, cards: Card[]): PickRecommendation {
    const ranked = cards
      .map((card) => this.rankCard(card))
      .sort((a, b) => b.score - a.score);
    return { pack, ranked, bestPick: ranked[0] ?? null };
  }
}
