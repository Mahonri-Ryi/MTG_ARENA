import { describe, expect, it } from "vitest";

import {
  analyzeDeck,
  deckCardNames,
  LocalCardSource,
  parseDeckList,
  resolveDeck,
  sampleCards
} from "../src/index";

const arenaExport = `Deck
4 Shivan Dragon (M21) 154
4 Lightning Strike (M21) 159
2 Serra Angel (M21) 34
8 Plains (ANB) 112

Sideboard
2 Cancel (M21) 51`;

const headerless = `4 Llanowar Elves
2 Grizzly Bears

3 Doom Blade`;

describe("parseDeckList", () => {
  it("parses the Arena export format with set/collector suffixes", () => {
    const deck = parseDeckList(arenaExport, "Mono Red Test");
    expect(deck.name).toBe("Mono Red Test");
    expect(deck.main).toHaveLength(4);
    expect(deck.main[0]).toMatchObject({
      quantity: 4,
      name: "Shivan Dragon",
      setCode: "M21",
      collectorNumber: "154"
    });
    expect(deck.sideboard).toEqual([
      expect.objectContaining({ quantity: 2, name: "Cancel" })
    ]);
  });

  it("splits maindeck/sideboard on a blank line when there are no headers", () => {
    const deck = parseDeckList(headerless);
    expect(deck.main.map((e) => e.name)).toEqual(["Llanowar Elves", "Grizzly Bears"]);
    expect(deck.sideboard.map((e) => e.name)).toEqual(["Doom Blade"]);
  });

  it("captures a Companion section separately", () => {
    const deck = parseDeckList("Companion\n1 Jegantha, the Wellspring (IKO) 222\n\nDeck\n4 Opt");
    expect(deck.companion).toMatchObject({ name: "Jegantha, the Wellspring", quantity: 1 });
    expect(deck.main.map((e) => e.name)).toEqual(["Opt"]);
  });

  it("lists unique card names across all sections", () => {
    expect(deckCardNames(parseDeckList(arenaExport)).sort()).toEqual(
      ["Cancel", "Lightning Strike", "Plains", "Serra Angel", "Shivan Dragon"].sort()
    );
  });
});

describe("resolveDeck + analyzeDeck", () => {
  it("resolves cards and computes maindeck stats", async () => {
    const deck = await resolveDeck(parseDeckList(arenaExport), new LocalCardSource(sampleCards));
    const stats = analyzeDeck(deck);

    expect(stats.totalCards).toBe(18);
    expect(stats.unresolved).toBe(0);
    expect(stats.colorCounts.R).toBe(8); // Shivan x4 + Lightning x4
    expect(stats.colorCounts.W).toBe(2); // Serra x2
    expect(stats.typeCounts.Creature).toBe(6); // Shivan x4 + Serra x2
    expect(stats.typeCounts.Land).toBe(8); // Plains x8
    expect(stats.averageManaValue).toBeCloseTo(4.2, 5);
    // 8 Plains are lands, excluded from the curve; 10 non-lands remain.
    const curveTotal = Object.values(stats.manaCurve).reduce((a, b) => a + b, 0);
    expect(curveTotal).toBe(10);
  });

  it("counts unresolved cards when data is missing", async () => {
    const deck = await resolveDeck(parseDeckList("2 Totally Fake Card"), new LocalCardSource(sampleCards));
    const stats = analyzeDeck(deck);
    expect(stats.unresolved).toBe(2);
  });
});
