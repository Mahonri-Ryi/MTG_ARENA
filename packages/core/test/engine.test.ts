import { describe, expect, it } from "vitest";

import {
  Coach,
  DraftEngine,
  LocalCardSource,
  sampleCards,
  sampleLogText,
  sampleRatings,
  type Card
} from "../src/index.js";

const bear: Card = {
  arenaId: 1,
  name: "Test Bear",
  manaValue: 2,
  colors: ["G"],
  rarity: "common",
  types: ["Creature"]
};

const bolt: Card = {
  arenaId: 2,
  name: "Test Bolt",
  manaValue: 1,
  colors: ["R"],
  rarity: "common",
  types: ["Instant"],
  oracleText: "Test Bolt deals 3 damage to any target."
};

describe("DraftEngine", () => {
  it("ranks removal above a vanilla creature", () => {
    const engine = new DraftEngine();
    const rec = engine.recommend(
      { draftId: "x", packNumber: 1, pickNumber: 1, cardIds: [1, 2] },
      [bear, bolt]
    );
    expect(rec.bestPick?.card.name).toBe("Test Bolt");
    expect(rec.ranked[0].score).toBeGreaterThan(rec.ranked[1].score);
  });

  it("applies external win-rate ratings when present", () => {
    const engine = new DraftEngine({ ratings: { "Test Bear": 95 } });
    const ranked = engine.rankCard(bear);
    expect(ranked.score).toBeGreaterThanOrEqual(95);
    expect(ranked.grade).toBe("S");
  });

  it("biases toward committed colors after picks", () => {
    const engine = new DraftEngine({ colorCommitmentWeight: 10 });
    // Commit hard to red.
    engine.registerPick(bolt);
    engine.registerPick({ ...bolt, arenaId: 3, name: "Red 2" });
    const onColor = engine.rankCard({ ...bear, colors: ["R"], name: "Red Guy" });
    const offColor = engine.rankCard({ ...bear, colors: ["G"], name: "Green Guy" });
    expect(onColor.score).toBeGreaterThan(offColor.score);
  });
});

describe("Coach (end-to-end over sample log)", () => {
  it("produces an on-color recommendation from the sample draft", async () => {
    const coach = new Coach(new LocalCardSource(sampleCards), {
      ratings: sampleRatings,
      colorCommitmentWeight: 8
    });
    const rec = await coach.ingestLog(sampleLogText);

    expect(rec).not.toBeNull();
    // By pick 4 the drafter has taken Shivan Dragon (R), Lightning Strike (R)
    // and Serra Angel (W), so red/white should be the committed colors.
    expect(coach.committedColors.sort()).toEqual(["R", "W"]);
    // The recommended pick should be an on-color card.
    const best = rec!.bestPick!;
    expect(best.card.colors.every((c) => ["R", "W"].includes(c))).toBe(true);
    // Match state should reflect the revealed opponent card.
    expect(coach.matchState?.opponentRevealed).toContain("Sengir Vampire");
  });
});
