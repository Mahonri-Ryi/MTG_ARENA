import { describe, expect, it } from "vitest";

import { ScryfallCardSource } from "../src/index";

/** Build a fake `fetch` that records the URL and returns a canned JSON body. */
function mockFetch(body: unknown) {
  const calls: string[] = [];
  const impl = (async (url: string) => {
    calls.push(String(url));
    return { ok: true, json: async () => body } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe("ScryfallCardSource.listSets (catalog freshness contract)", () => {
  it("fetches sets from the live Scryfall endpoint (never a hardcoded list)", async () => {
    const { impl, calls } = mockFetch({ data: [] });
    await new ScryfallCardSource(impl).listSets();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe("https://api.scryfall.com/sets");
  });

  it("includes brand-new sets automatically (type-based, not a code allowlist)", async () => {
    // Simulate Scryfall having a set that does not exist yet today.
    const { impl } = mockFetch({
      data: [
        { code: "fut1", name: "Future Set 3000", card_count: 300, released_at: "3000-01-01", set_type: "expansion" },
        { code: "dmu", name: "Dominaria United", card_count: 281, released_at: "2022-09-09", set_type: "expansion" },
        { code: "tdmu", name: "Dominaria United Tokens", card_count: 20, released_at: "2022-09-09", set_type: "token" },
        { code: "empty", name: "Empty Set", card_count: 0, released_at: "2024-01-01", set_type: "expansion" }
      ]
    });

    const sets = await new ScryfallCardSource(impl).listSets();
    const codes = sets.map((s) => s.code);

    // A future/unknown expansion is included purely because of its type.
    expect(codes).toContain("fut1");
    expect(codes).toContain("dmu");
    // Non-browsable types (tokens) and empty sets are excluded.
    expect(codes).not.toContain("tdmu");
    expect(codes).not.toContain("empty");
    // Newest-first ordering, so the latest release surfaces at the top.
    expect(codes[0]).toBe("fut1");
  });

  it("degrades gracefully when the network fails", async () => {
    const failing = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    await expect(new ScryfallCardSource(failing).listSets()).resolves.toEqual([]);
  });

  it("searchCards hits the live search endpoint with the set filter", async () => {
    const { impl, calls } = mockFetch({ data: [], total_cards: 0, has_more: false });
    await new ScryfallCardSource(impl).searchCards({ setCode: "dmu", rarities: ["rare"] });
    expect(calls[0]).toContain("https://api.scryfall.com/cards/search");
    expect(decodeURIComponent(calls[0])).toContain("set:dmu");
    expect(decodeURIComponent(calls[0])).toContain("r:rare");
  });
});
