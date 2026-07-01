import { describe, expect, it } from "vitest";

import { parseLogText, sampleLogText } from "../src/index";

describe("parseLogText", () => {
  it("parses a premier draft pack (Draft.Notify, comma string)", () => {
    const events = parseLogText(
      '[UnityCrossThreadLogger]Draft.Notify {"draftId":"d1","SelfPack":1,"SelfPick":2,"PackCards":"1,2,3"}'
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "draftPack",
      pack: { draftId: "d1", packNumber: 1, pickNumber: 2, cardIds: [1, 2, 3] }
    });
  });

  it("parses a quick/bot draft pack (BotDraft_DraftPack, array)", () => {
    const events = parseLogText(
      '[UnityCrossThreadLogger]BotDraft_DraftPack {"DraftId":"d2","PackNumber":2,"PickNumber":5,"DraftPack":["10","20","30"]}'
    );
    expect(events[0]).toMatchObject({
      kind: "draftPack",
      pack: { draftId: "d2", packNumber: 2, pickNumber: 5, cardIds: [10, 20, 30] }
    });
  });

  it("parses a pick with a nested stringified request payload", () => {
    const events = parseLogText(
      '[UnityCrossThreadLogger]==> Draft.MakePick {"id":5,"request":"{\\"DraftId\\":\\"d1\\",\\"GrpId\\":42,\\"Pack\\":1,\\"Pick\\":1}"}'
    );
    expect(events[0]).toMatchObject({ kind: "draftPick", cardId: 42, pack: 1, pick: 1 });
  });

  it("parses the bundled sample log into the expected event sequence", () => {
    const events = parseLogText(sampleLogText);
    const kinds = events.map((e) => e.kind);
    expect(kinds).toEqual([
      "draftPack",
      "draftPick",
      "draftPack",
      "draftPick",
      "draftPack",
      "draftPick",
      "draftPack",
      "matchStart",
      "turnChange",
      "cardRevealed"
    ]);
  });

  it("ignores unknown / malformed markers gracefully", () => {
    expect(parseLogText("nothing to see here")).toEqual([]);
    expect(parseLogText("[UnityCrossThreadLogger]Draft.Notify {not json")).toEqual([]);
  });
});
