import { describe, expect, it } from "vitest";

import { buildSearchQuery } from "../src/index";

describe("buildSearchQuery", () => {
  it("builds a set-only query", () => {
    expect(buildSearchQuery({ setCode: "DMU" })).toBe("set:dmu");
  });

  it("OR-groups multiple colors and rarities", () => {
    expect(buildSearchQuery({ setCode: "dmu", colors: ["R", "W"], rarities: ["rare", "mythic"] })).toBe(
      "set:dmu (c:r or c:w) (r:rare or r:mythic)"
    );
  });

  it("does not parenthesize a single clause", () => {
    expect(buildSearchQuery({ colors: ["U"] })).toBe("c:u");
  });

  it("maps colorless to c:c and adds type + name", () => {
    expect(buildSearchQuery({ colors: ["C"], types: ["artifact"], name: "sol" })).toBe("c:c t:artifact name:sol");
  });

  it("quotes multi-word names", () => {
    expect(buildSearchQuery({ name: "serra angel" })).toBe('name:"serra angel"');
  });

  it("returns an empty string when no filters are set", () => {
    expect(buildSearchQuery({})).toBe("");
  });
});
